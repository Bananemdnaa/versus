-- Gäste: sichtbar als Gast, Freundschaftswünsche statt Fehlermeldung, feste Gast-Spiele auch an Tischen.
-- Im SQL-Editor ausführen. Ohne die Migration zeigt die App kein Gast-Abzeichen, und "Als Freund hinzufügen"
-- bei einem Gast meldet weiter "Gäste können noch keine Freunde haben".

-- ---------- 1. Wer ist Gast? (für das Abzeichen in Rangliste, Profil und Listen; wie flags_of) ----------
create or replace function public.guests_of(names text[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(p.username), '[]'::jsonb)
  from public.profiles p
  where p.username = any (select lower(trim(n)) from unnest(names[1:100]) n)
    and public.is_guest(p.id);
$$;
revoke all on function public.guests_of(text[]) from public;
grant execute on function public.guests_of(text[]) to anon, authenticated;

-- ---------- 2. Freundschaftswunsch an einen Gast ----------
-- Wer einen Gast als Freund hinzufügen will, hinterlässt einen Wunsch. Der Gast sieht beim nächsten Öffnen,
-- dass jemand mit ihm befreundet sein will (mit dem Rat, ein Konto zu machen). Hat er ein Konto, werden aus den
-- Wünschen normale Freundschaftsanfragen.
create table if not exists public.guest_wishes (
  guest uuid not null references auth.users (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (guest, from_user),
  check (guest <> from_user)
);
alter table public.guest_wishes enable row level security;
revoke all on public.guest_wishes from public, anon, authenticated;

create or replace function public.friend_wish(name text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); n integer;
begin
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  if public.is_guest(u) then raise exception 'Für Freunde brauchst du ein Konto.'; end if;
  if public.blocked_between(u, o) then raise exception 'Das geht mit diesem Spieler nicht.'; end if;
  -- inzwischen ein Konto: ganz normal anfragen
  if not public.is_guest(o) then return public.friend_request(name); end if;
  select count(*) into n from public.guest_wishes where from_user = u and at > now() - interval '1 day';
  if n >= 30 then raise exception 'Du hast heute schon 30 Gäste gefragt.'; end if;
  insert into public.guest_wishes (guest, from_user) values (o, u) on conflict do nothing;
  return 'wished';
end;
$$;
revoke all on function public.friend_wish(text) from public, anon;
grant execute on function public.friend_wish(text) to authenticated;

-- Beim Öffnen: ein Gast bekommt die Namen der Wünsche (bleiben bestehen, bis er ein Konto hat);
-- ein Konto mit Wünschen von früher bekommt daraus Freundschaftsanfragen, die Wünsche sind dann weg.
create or replace function public.my_wishes()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); names jsonb; r record; made text[] := array[]::text[];
begin
  if u is null then return null; end if;
  if public.is_guest(u) then
    select coalesce(jsonb_agg(p.username order by w.at desc), '[]'::jsonb) into names
      from public.guest_wishes w join public.profiles p on p.id = w.from_user
      where w.guest = u and not public.blocked_between(u, w.from_user);
    return jsonb_build_object('guest', true, 'names', names);
  end if;
  for r in select w.from_user, p.username from public.guest_wishes w join public.profiles p on p.id = w.from_user where w.guest = u loop
    if not public.blocked_between(u, r.from_user) and not exists (select 1 from public.friendships f
        where (f.requester = r.from_user and f.addressee = u) or (f.requester = u and f.addressee = r.from_user)) then
      insert into public.friendships (requester, addressee) values (r.from_user, u) on conflict do nothing;
      made := made || r.username;
    end if;
  end loop;
  delete from public.guest_wishes where guest = u;
  return jsonb_build_object('guest', false, 'made', to_jsonb(made));
end;
$$;
revoke all on function public.my_wishes() from public, anon;
grant execute on function public.my_wishes() to authenticated;

-- ---------- 3. Gäste an Tischen: nur die Gast-Spiele (bisher waren in der Discord-Aktivität alle offen) ----------
-- Die 7 Gast-Spiele: 4 Gewinnt, Tic Tac Toe, Schiffe versenken, Käsekästchen, Pong, Reaktionsduell (Duelle
-- bzw. nur am Gerät) und Galgenmännchen (Tisch). An Tischen anderer Spiele darf kein Gast Platz nehmen.
create or replace function public.party_guest_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare i integer;
begin
  if new.game = 'hangman' then return new; end if;
  for i in 1 .. coalesce(array_length(new.seats, 1), 0) loop
    if new.seats[i] is not null and (tg_op = 'INSERT' or old.seats[i] is distinct from new.seats[i])
        and public.is_guest(new.seats[i]) then
      raise exception 'Dieses Spiel braucht ein Konto. Ohne Konto geht am Tisch Galgenmännchen.';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.party_guest_guard() from public, anon, authenticated;
drop trigger if exists party_tables_guest_guard on public.party_tables;
create trigger party_tables_guest_guard before insert or update of seats on public.party_tables
  for each row execute function public.party_guest_guard();
