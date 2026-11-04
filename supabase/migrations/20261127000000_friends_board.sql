-- Versus: Rangliste unter Freunden
-- Wie leaderboard (gleiche Antwort: period, since, until, players, top, me, last), aber nur du und deine Freunde,
-- mit eigenen Plätzen nur unter euch. period: 'week' (laufende Woche, Standard) oder 'all' (seit Beginn).
-- Baut auf 20261103000000_weekly_rankings.sql auf (week_start, board_rows). Nur für Konten.

create or replace function public.friends_board(gm text default null, period text default 'week')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
  ws timestamptz := public.week_start();
  t0 timestamptz := case when period = 'all' then null else ws end;
begin
  if u is null then raise exception 'Dafür brauchst du ein Konto.'; end if;
  return (
    with f as (
      select u as id
      union select case when x.requester = u then x.addressee else x.requester end
        from public.friendships x where x.status = 'accepted' and (x.requester = u or x.addressee = u)
    ), cur as (
      select b.uid, b.username, b.wins, b.played, b.draws, b.losses,
        rank() over (order by b.wins desc, b.played asc) as pos
      from public.board_rows(gm, t0, null) b where b.uid in (select id from f)
    ), prev as (
      select b.username, b.wins, rank() over (order by b.wins desc, b.played asc) as pos
      from public.board_rows(gm, ws - interval '7 days', ws) b where b.uid in (select id from f)
    )
    select jsonb_build_object(
      'period', case when period = 'all' then 'all' else 'week' end,
      'friends', true,
      'since', t0,
      'until', case when period = 'all' then null else ws + interval '7 days' end,
      'players', (select count(*) from cur),
      'circle', (select count(*) from f),
      'top', (select coalesce(jsonb_agg(to_jsonb(c) - 'uid' order by c.pos, c.username), '[]'::jsonb)
        from (select * from cur order by pos, username limit 100) c),
      'me', (select to_jsonb(c) - 'uid' from cur c where c.uid = u limit 1),
      'last', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'wins', p.wins, 'pos', p.pos) order by p.pos, p.username), '[]'::jsonb)
        from (select * from prev where pos <= 3 order by pos, username limit 3) p)));
end;
$$;
revoke all on function public.friends_board(text, text) from public, anon;
grant execute on function public.friends_board(text, text) to authenticated;
