-- Discord Activity: everybody who started Versus in the same voice channel (a Discord "instance") sees the table or
-- game link one of them opened there and joins with one tap (js/online.js, discordRoom). The instance id comes from
-- the address Discord opens (instance_id); a row only lives while its table or link is open, old ones are swept.

create table if not exists public.discord_rooms (
  instance text primary key check (length(instance) between 1 and 80),
  kind text not null check (kind in ('table', 'match')),
  ref uuid not null,
  owner uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
alter table public.discord_rooms enable row level security;
-- no policies: only the two functions below read and write it

-- the host of a table in the lobby (or the player waiting on a game link) shows it to the voice channel
create or replace function public.discord_room_set(inst text, kind text, ref uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if inst is null or length(inst) not between 1 and 80 then raise exception 'Unbekannter Sprachkanal.'; end if;
  if kind = 'table' then
    if not exists (select 1 from public.party_tables t where t.id = ref and t.status = 'lobby' and t.seats[t.host] = u) then
      raise exception 'Nur der Gastgeber kann den Tisch zeigen.';
    end if;
  elsif kind = 'match' then
    if not exists (select 1 from public.matches m where m.id = ref and m.status = 'invited' and m.a = u and m.b is null) then
      raise exception 'Dieser Spiel-Link gilt nicht mehr.';
    end if;
  else
    raise exception 'Unbekannte Art.';
  end if;
  delete from public.discord_rooms where at < now() - interval '1 day';
  insert into public.discord_rooms (instance, kind, ref, owner, at) values (inst, kind, ref, u, now())
    on conflict (instance) do update set kind = excluded.kind, ref = excluded.ref, owner = excluded.owner, at = now();
end;
$$;
revoke all on function public.discord_room_set(text, text, uuid) from public, anon;
grant execute on function public.discord_room_set(text, text, uuid) to authenticated;

-- what is open in this voice channel right now (also before somebody has signed in, so the bar can show up)
create or replace function public.discord_room_peek(inst text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.discord_rooms; t public.party_tables; m public.matches; nm text; u uuid := auth.uid();
begin
  select * into r from public.discord_rooms where instance = inst;
  if r.instance is null or r.at < now() - interval '1 day' then return null; end if;
  select username into nm from public.profiles where id = r.owner;
  if r.kind = 'table' then
    select * into t from public.party_tables where id = r.ref;
    if t.id is null or t.status <> 'lobby' then return null; end if;
    return jsonb_build_object('kind', 'table', 'code', t.code, 'game', t.game, 'from', nm, 'n', t.n,
      'players', (select count(*) from unnest(t.seats[1:t.n]) s where s is not null),
      'mine', u is not null and u = any (t.seats));
  end if;
  select * into m from public.matches where id = r.ref;
  if m.id is null or m.status <> 'invited' or m.b is not null then return null; end if;
  return jsonb_build_object('kind', 'match', 'id', m.id, 'game', m.game, 'from', nm, 'mine', u is not null and u = m.a);
end;
$$;
revoke all on function public.discord_room_peek(text) from public;
grant execute on function public.discord_room_peek(text) to anon, authenticated;
