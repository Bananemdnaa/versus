-- Versus: Dev-Konten verhalten sich normal (Suche, Freunde, offene Herausforderungen), aber Partien mit einem
-- Dev-Konto zählen für beide Spieler nicht in der Rangliste. Dazu eine ausführlichere Rangliste.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

-- Dev-Konten wurden bisher automatisch ausgeblendet; das ist nicht mehr nötig
update public.profiles set hidden = false where dev and hidden;

create or replace function public.admin_set_dev(name text, make boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_owner();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  update public.profiles set dev = make where id = o;
  perform public.admin_note(case when make then 'dev_on' else 'dev_off' end, lower(trim(name)), null);
end;
$$;

-- Freundschaftsanfragen auch an Dev-Konten
create or replace function public.friend_request(name text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); st text; n integer;
begin
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  update public.friendships set status = 'accepted' where requester = o and addressee = u and status = 'pending';
  if found then return 'accepted'; end if;
  select f.status into st from public.friendships f where (f.requester = u and f.addressee = o) or (f.requester = o and f.addressee = u) limit 1;
  if st = 'accepted' then return 'friends'; end if;
  if st = 'pending' then return 'pending'; end if;
  select count(*) into n from public.friendships where requester = u or addressee = u;
  if n >= 150 then raise exception 'Du hast schon 150 Freunde und Anfragen.'; end if;
  select count(*) into n from public.friendships where requester = u and status = 'pending';
  if n >= 30 then raise exception 'Du hast schon 30 offene Anfragen. Warte, bis jemand antwortet.'; end if;
  insert into public.friendships (requester, addressee) values (u, o);
  return 'sent';
end;
$$;

-- Spielersuche mit Dev-Konten (nur ausgeblendete und gesperrte Spieler fehlen)
create or replace function public.player_search(q text)
returns table (username text, state text)
language sql stable security definer set search_path = '' as $$
  select p.username,
    (select case when fr.status = 'accepted' then 'friend' when fr.requester = auth.uid() then 'outgoing' else 'incoming' end
      from public.friendships fr
      where (fr.requester = auth.uid() and fr.addressee = p.id) or (fr.requester = p.id and fr.addressee = auth.uid()) limit 1)
  from public.profiles p
  where char_length(trim(q)) >= 2
    and left(p.username, char_length(trim(q))) = lower(trim(q))
    and p.id <> auth.uid() and not p.hidden
  order by p.username
  limit 8;
$$;

-- Offene Herausforderungen auch von Dev-Konten anzeigen
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'open', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a
      where m.b is null and m.status = 'invited' and m.a <> u and not p.hidden),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and (m.a = u or m.b = u) limit 1),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'));
end;
$$;

-- Zählt eine Partie für die Rangliste? Nicht, wenn ein Dev-Konto beteiligt ist.
create or replace function public.match_ranked(m public.matches)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.is_dev(m.a) and not public.is_dev(m.b);
$$;
revoke all on function public.match_ranked(public.matches) from public, anon, authenticated;

-- Rangliste: Siege, Niederlagen, Remis, Partien und Siegquote; Partien mit Dev-Konten zählen nicht
create or replace function public.leaderboard(gm text default null, lim integer default 50)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (
    select x.u, x.w, x.d from public.matches m
    cross join lateral (values (m.a, coalesce((m.winner = m.a)::int, 0), (m.winner is null)::int), (m.b, coalesce((m.winner = m.b)::int, 0), (m.winner is null)::int)) as x(u, w, d)
    where m.status = 'done' and (gm is null or gm = '' or m.game = gm) and public.match_ranked(m)
  ), t as (
    select p.username, sum(r.w)::int as wins, count(*)::int as played, sum(r.d)::int as draws,
      (count(*) - sum(r.w) - sum(r.d))::int as losses, p.id = auth.uid() as me
    from r join public.profiles p on p.id = r.u
    where not p.hidden and not p.dev
    group by p.username, p.id
  ), ranked as (
    select t.*, rank() over (order by wins desc, played asc) as pos from t
  )
  select jsonb_build_object(
    'players', (select count(*) from ranked),
    'top', (select coalesce(jsonb_agg(to_jsonb(x) - 'me' order by x.pos, x.username), '[]'::jsonb)
      from (select * from ranked order by pos, username limit least(greatest(lim, 1), 100)) x),
    'me', (select to_jsonb(x) - 'me' from ranked x where x.me limit 1));
$$;
grant execute on function public.leaderboard(text, integer) to anon, authenticated;

-- Spieler sehen im Spiel, ob die Partie für die Rangliste zählt
create or replace function public.match_state(mid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if u = m.a and m.status in ('invited', 'live') then update public.matches set a_seen = now() where id = mid;
  elsif u = m.b and m.status = 'live' then update public.matches set b_seen = now() where id = mid;
  elsif u <> m.a and u is distinct from m.b and public.role_of(u) is null then raise exception 'Partie nicht gefunden.';
  end if;
  return public.match_view(m, since, u) || jsonb_build_object('ranked', public.match_ranked(m));
end;
$$;
