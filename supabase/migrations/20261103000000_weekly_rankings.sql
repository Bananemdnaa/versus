-- Versus: Wochen-Rangliste. Jeden Montag um 0:00 Uhr (deutsche Zeit) startet sie neu; die ewige Rangliste bleibt.
-- Dazu die besten drei der letzten Woche.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

create index if not exists matches_done_game_idx on public.matches (status, finished_at, game);

-- Beginn der laufenden Woche (Montag 0:00 Europe/Berlin)
create or replace function public.week_start(ts timestamptz default now())
returns timestamptz language sql stable set search_path = '' as $$
  select date_trunc('week', ts at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
$$;

-- Rangliste für einen Zeitraum (intern)
create or replace function public.board_rows(gm text, t0 timestamptz, t1 timestamptz)
returns table (uid uuid, username text, wins integer, played integer, draws integer, losses integer, pos bigint)
language sql stable security definer set search_path = '' as $$
  with r as (
    select x.u, x.w, x.d from public.matches m
    cross join lateral (values (m.a, coalesce((m.winner = m.a)::int, 0), (m.winner is null)::int), (m.b, coalesce((m.winner = m.b)::int, 0), (m.winner is null)::int)) as x(u, w, d)
    where m.status = 'done' and (gm is null or gm = '' or m.game = gm) and public.match_ranked(m)
      and (t0 is null or m.finished_at >= t0) and (t1 is null or m.finished_at < t1)
  ), t as (
    select p.id as uid, p.username, sum(r.w)::int as wins, count(*)::int as played, sum(r.d)::int as draws,
      (count(*) - sum(r.w) - sum(r.d))::int as losses
    from r join public.profiles p on p.id = r.u
    where not p.hidden and not p.dev
    group by p.username, p.id
  )
  select t.*, rank() over (order by t.wins desc, t.played asc) as pos from t;
$$;
revoke all on function public.board_rows(text, timestamptz, timestamptz) from public, anon, authenticated;

-- period: 'week' (laufende Woche, Standard) oder 'all' (seit Beginn)
drop function if exists public.leaderboard(text, integer);
create or replace function public.leaderboard(gm text default null, lim integer default 50, period text default 'week')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  ws timestamptz := public.week_start();
  t0 timestamptz := case when period = 'all' then null else ws end;
begin
  return jsonb_build_object(
    'period', case when period = 'all' then 'all' else 'week' end,
    'since', t0,
    'until', case when period = 'all' then null else ws + interval '7 days' end,
    'players', (select count(*) from public.board_rows(gm, t0, null)),
    'top', (select coalesce(jsonb_agg(to_jsonb(x) - 'uid' order by x.pos, x.username), '[]'::jsonb)
      from (select * from public.board_rows(gm, t0, null) order by pos, username limit least(greatest(lim, 1), 100)) x),
    'me', (select to_jsonb(x) - 'uid' from public.board_rows(gm, t0, null) x where x.uid = auth.uid() limit 1),
    -- die besten drei der letzten Woche
    'last', (select coalesce(jsonb_agg(jsonb_build_object('username', x.username, 'wins', x.wins, 'pos', x.pos) order by x.pos, x.username), '[]'::jsonb)
      from (select * from public.board_rows(gm, ws - interval '7 days', ws) where pos <= 3 order by pos, username limit 3) x));
end;
$$;
grant execute on function public.leaderboard(text, integer, text) to anon, authenticated;
