-- Versus: Einblick ins Backend für Dev-Konten (js/devtools.js) und Dev-Konten sehen sich gegenseitig.
-- Im SQL-Editor ausführen. Ohne die Migration zeigt das Dev-Panel KI, Server-Aufrufe und Fehler trotzdem,
-- nur die Tabs „Devs“ und „Server laden“ sagen, dass das Server-Update fehlt.

-- 1) Profile von Dev-Konten: bisher nur für das Team sichtbar, jetzt auch für andere Dev-Konten
create or replace function public.player_profile(name text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me(); p public.profiles; mine boolean; streak integer := 0; r record;
begin
  select * into p from public.profiles where username = lower(trim(name));
  if p.id is null or ((p.hidden or p.dev) and p.id <> u and public.role_of(u) is null
      and not (p.dev and public.is_dev(u))) then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  mine := p.id = u;
  -- aktuelle Siegesserie (gewertete Partien, neueste zuerst)
  for r in select m.winner from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m) order by m.finished_at desc limit 100 loop
    exit when r.winner is distinct from p.id;
    streak := streak + 1;
  end loop;
  return jsonb_build_object(
    'username', p.username, 'me', mine, 'since', p.created_at, 'dev', p.dev,
    'online', not p.stealth and p.last_seen > now() - interval '2 minutes',
    'seen', case when p.stealth and not mine then null else p.last_seen end,
    'friend', (select case when f.status = 'accepted' then 'friend' when f.requester = u then 'outgoing' else 'incoming' end
      from public.friendships f where (f.requester = u and f.addressee = p.id) or (f.requester = p.id and f.addressee = u) limit 1),
    'streak', streak,
    'total', (select jsonb_build_object('played', count(*), 'wins', count(*) filter (where m.winner = p.id),
        'draws', count(*) filter (where m.winner is null), 'losses', count(*) filter (where m.winner is not null and m.winner <> p.id))
      from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m)),
    'games', (select coalesce(jsonb_agg(x order by x.played desc, x.game), '[]'::jsonb) from (
        select m.game, count(*)::int as played, count(*) filter (where m.winner = p.id)::int as wins,
          count(*) filter (where m.winner is not null and m.winner <> p.id)::int as losses
        from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m)
        group by m.game) x),
    'week', (select jsonb_build_object('pos', b.pos, 'wins', b.wins, 'played', b.played) from public.board_rows(null, public.week_start(), null) b where b.uid = p.id),
    'vs', case when mine then null else (select jsonb_build_object('played', count(*), 'wins', count(*) filter (where m.winner = u),
        'losses', count(*) filter (where m.winner = p.id), 'draws', count(*) filter (where m.winner is null))
      from public.matches m where m.status = 'done' and ((m.a = u and m.b = p.id) or (m.a = p.id and m.b = u))) end,
    'recent', (select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb) from (
        select m.id, m.game, m.finished_at as at, m.status, m.result, public.match_ranked(m) as ranked,
          (select username from public.profiles where id = case when m.a = p.id then m.b else m.a end) as opp,
          case when m.status = 'void' then 'void' when m.winner is null then 'draw' when m.winner = p.id then 'win' else 'loss' end as res
        from public.matches m where m.status in ('done', 'void') and (m.a = p.id or m.b = p.id) and m.started_at is not null
        order by m.finished_at desc limit 15) x));
end;
$$;
revoke all on function public.player_profile(text) from public, anon;
grant execute on function public.player_profile(text) to authenticated;

-- 2) Elo im Profil: Dev-Konten sehen auch die Elo anderer Dev-Konten
create or replace function public.player_elo(pname text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('game', r.game, 'elo', r.elo, 'peak', r.peak, 'games', r.games) order by r.elo desc, r.game), '[]'::jsonb)
  from public.ratings r join public.profiles p on p.id = r.uid
  where p.username = lower(trim(pname)) and r.games > 0
    and (not (p.hidden or p.dev) or p.id = auth.uid() or (p.dev and public.is_dev(auth.uid())));
$$;
revoke all on function public.player_elo(text) from public, anon;
grant execute on function public.player_elo(text) to authenticated;

-- 3) Liste aller Dev-Konten (nur für Dev-Konten): echter Online-Status (auch bei „unsichtbar“), aktuelles Spiel
create or replace function public.dev_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if not public.is_dev(u) then raise exception 'Nur für Dev-Konten.'; end if;
  return (select coalesce(jsonb_agg(x order by x.online desc, x.seen desc nulls last), '[]'::jsonb) from (
    select p.username, p.id = u as me, p.last_seen > now() - interval '2 minutes' as online, p.last_seen as seen,
      p.current_game as game, p.stealth, p.hidden, p.guest, public.role_of(p.id) as role, p.created_at as since,
      (select count(*) from public.matches m where m.status = 'live' and (m.a = p.id or m.b = p.id))::int as live,
      (select count(*) from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id))::int as played
    from public.profiles p where p.dev) x);
end;
$$;
revoke all on function public.dev_list() from public, anon;
grant execute on function public.dev_list() to authenticated;

-- 4) Was der Server über das eigene Konto weiß (nur für Dev-Konten): Profil-Zeile, Rolle, Elo,
--    laufende und letzte Partien (mit Zahl der Züge, letztem Zug und den Ergebnis-Meldungen beider Seiten), Tische
create or replace function public.dev_peek()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me(); p public.profiles;
begin
  if not public.is_dev(u) then raise exception 'Nur für Dev-Konten.'; end if;
  select * into p from public.profiles where id = u;
  return jsonb_build_object(
    'server_time', now(),
    'profile', to_jsonb(p) - 'id',
    'role', public.role_of(u),
    'ratings', (select coalesce(jsonb_agg(jsonb_build_object('game', r.game, 'elo', r.elo, 'peak', r.peak, 'games', r.games) order by r.game), '[]'::jsonb)
      from public.ratings r where r.uid = u),
    'matches', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select m.id, m.game, m.status, m.opts, m.result, m.created_at, m.started_at, m.finished_at,
          case when m.a = u then 'a' else 'b' end as me, m.a_side,
          (select username from public.profiles where id = case when m.a = u then m.b else m.a end) as opp,
          case when m.winner is null then null when m.winner = u then 'ich' else 'gegner' end as winner,
          jsonb_array_length(m.moves) as moves, m.moves -> -1 as last_move,
          m.a_claim, m.b_claim, m.a_seen, m.b_seen, public.match_ranked(m) as ranked
        from public.matches m where m.a = u or m.b = u order by m.created_at desc limit 12) x),
    'tables', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select t.code, t.game, t.status, t.n, t.lvl, t.host, t.bots, t.open, t.opts, t.result, t.winner, t.created_at, t.started_at,
          jsonb_array_length(t.moves) as moves, t.moves -> -1 as last_move,
          (select jsonb_agg(coalesce((select username from public.profiles where id = t.seats[i]), null) order by i) from generate_series(1, t.n) i) as seats,
          array_position(t.seats, u) as my_seat
        from public.party_tables t where u = any (t.seats) order by t.created_at desc limit 6) x));
end;
$$;
revoke all on function public.dev_peek() from public, anon;
grant execute on function public.dev_peek() to authenticated;
