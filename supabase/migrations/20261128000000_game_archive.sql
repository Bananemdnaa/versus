-- Versus: Letzte Partien auf jedem Gerät, und Partien zum Teilen
-- game_archive: die beendeten Partien eines Kontos gegen die KI und am Gerät (Online-Partien stehen schon in matches).
--   cid ist die Kennung aus dem Browser (gegen doppeltes Hochladen), data das, was das Spiel zum Nachspielen braucht
--   (Züge, Namen, Ergebnis, Optionen). Höchstens 100 Partien pro Konto, ältere fallen weg; höchstens 30 KB pro Partie.
-- share: ein kurzer Code für den Teilen-Link (?replay=CODE). Wer den Link hat, kann die Partie ansehen, auch ohne Konto.
-- my_matches: die eigenen beendeten Online-Partien mit ihren Zügen.

create table if not exists public.game_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cid text not null,
  game text not null,
  data jsonb not null,
  share text unique,
  created_at timestamptz not null default now(),
  unique (user_id, cid)
);
create index if not exists game_archive_user_idx on public.game_archive (user_id, created_at desc);
alter table public.game_archive enable row level security;   -- nur über die Funktionen unten

create or replace function public.archive_save(p_cid text, d jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); g text := d ->> 'g';
begin
  if u is null or exists (select 1 from public.profiles where id = u and guest) then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if p_cid is null or p_cid !~ '^[a-z0-9]{4,24}$' then raise exception 'Ungültige Partie.'; end if;
  if g is null or g !~ '^[a-z0-9]{1,12}$' then raise exception 'Ungültiges Spiel.'; end if;
  if jsonb_typeof(d) <> 'object' or octet_length(d::text) > 30000 then raise exception 'Die Partie ist zu groß.'; end if;
  insert into public.game_archive (user_id, cid, game, data) values (u, p_cid, g, d) on conflict (user_id, cid) do nothing;
  -- keep the newest 100
  delete from public.game_archive where user_id = u and id in (
    select x.id from public.game_archive x where x.user_id = u order by x.created_at desc offset 100);
end;
$$;
revoke all on function public.archive_save(text, jsonb) from public, anon;
grant execute on function public.archive_save(text, jsonb) to authenticated;

create or replace function public.archive_list()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('cid', x.cid, 'data', x.data, 'share', x.share, 'at', x.created_at) order by x.created_at desc), '[]'::jsonb)
  from (select * from public.game_archive where user_id = auth.uid() order by created_at desc limit 100) x;
$$;
revoke all on function public.archive_list() from public, anon;
grant execute on function public.archive_list() to authenticated;

create or replace function public.archive_clear()
returns void language sql security definer set search_path = '' as $$
  delete from public.game_archive where user_id = auth.uid();
$$;
revoke all on function public.archive_clear() from public, anon;
grant execute on function public.archive_clear() to authenticated;

-- the share code of one of your own games (created on the first call)
create or replace function public.archive_share(p_cid text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); code text; tries integer := 0;
begin
  if u is null then raise exception 'Dafür brauchst du ein Konto.'; end if;
  select x.share into code from public.game_archive x where x.user_id = u and x.cid = p_cid;
  if not found then raise exception 'Diese Partie gibt es nicht.'; end if;
  while code is null and tries < 5 loop
    tries := tries + 1;
    code := substr(md5(random()::text || clock_timestamp()::text || u::text), 1, 10);
    begin
      update public.game_archive x set share = code where x.user_id = u and x.cid = p_cid;
    exception when unique_violation then code := null;
    end;
  end loop;
  return code;
end;
$$;
revoke all on function public.archive_share(text) from public, anon;
grant execute on function public.archive_share(text) to authenticated;

-- a shared game, for everyone with the link (also without an account)
create or replace function public.archive_shared(code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('data', x.data, 'at', x.created_at, 'by', p.username)
  from public.game_archive x join public.profiles p on p.id = x.user_id
  where x.share = code and code is not null and length(code) between 6 and 16
  limit 1;
$$;
revoke all on function public.archive_shared(text) from public;
grant execute on function public.archive_shared(text) to anon, authenticated;

-- your own finished online duels with their moves (the newest first)
create or replace function public.my_matches(lim integer default 40)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'game', m.game, 'opts', m.opts, 'moves', m.moves, 'result', m.result, 'at', m.finished_at,
      'me', case when m.a = auth.uid() then m.a_side else 3 - m.a_side end,
      'winner', case when m.winner is null then 0 when m.winner = m.a then m.a_side else 3 - m.a_side end,
      'opp', (select p.username from public.profiles p where p.id = case when m.a = auth.uid() then m.b else m.a end)
    ) order by m.finished_at desc), '[]'::jsonb)
  from (select * from public.matches where (a = auth.uid() or b = auth.uid()) and status = 'done' and a_side is not null
        order by finished_at desc nulls last limit least(greatest(lim, 1), 100)) m;
$$;
revoke all on function public.my_matches(integer) from public, anon;
grant execute on function public.my_matches(integer) to authenticated;
