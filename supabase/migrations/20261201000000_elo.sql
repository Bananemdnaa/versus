-- Versus: Elo für Online-Duelle
-- Jede gewertete Online-Partie (matches mit status 'done' und match_ranked) ändert die Elo beider Spieler in diesem
-- Spiel. Start 1000, K = 40 in den ersten 20 Partien eines Spiels, danach 24, Untergrenze 100. Aufgeben zählt als
-- Niederlage, annullierte Partien ('void') zählen nicht. Online-Tische (party_tables) bekommen keine Elo.
-- Die Änderung steht an der Partie (a_delta, b_delta), das Ergebnis-Fenster holt sie mit match_elo.
-- Rangliste: "Alle Zeit" in einem einzelnen Spiel sortiert nach Elo (leaderboard, friends_board), die Woche und
-- "Alle Spiele" bleiben nach Siegen. Bisherige Partien werden beim ersten Lauf der Reihe nach nachgerechnet.
-- Baut auf 20261103000000_weekly_rankings.sql, 20261110000000_open_play.sql (match_ranked) und
-- 20261127000000_friends_board.sql auf.

create table if not exists public.ratings (
  uid uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  elo integer not null default 1000,
  peak integer not null default 1000,
  games integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (uid, game)
);
create index if not exists ratings_game_elo_idx on public.ratings (game, elo desc);
alter table public.ratings enable row level security;
revoke all on public.ratings from anon, authenticated;

alter table public.matches add column if not exists a_delta smallint;
alter table public.matches add column if not exists b_delta smallint;

-- rechnet eine Partie ein und gibt {Änderung a, Änderung b} zurück
create or replace function public.elo_apply(m public.matches)
returns integer[] language plpgsql security definer set search_path = '' as $$
declare
  ra integer; rb integer; na integer; nb integer;
  ea double precision; sa double precision; da integer; db integer;
begin
  insert into public.ratings (uid, game) values (m.a, m.game), (m.b, m.game) on conflict do nothing;
  -- beide Zeilen sperren, immer in derselben Reihenfolge (zwei Partien zur selben Zeit)
  perform 1 from public.ratings r where r.game = m.game and r.uid in (m.a, m.b) order by r.uid for update;
  select r.elo, r.games into ra, na from public.ratings r where r.uid = m.a and r.game = m.game;
  select r.elo, r.games into rb, nb from public.ratings r where r.uid = m.b and r.game = m.game;
  ea := 1.0 / (1.0 + power(10.0::double precision, ((rb - ra) / 400.0)::double precision));
  sa := (case when m.winner is null then 0.5 when m.winner = m.a then 1.0 else 0.0 end);
  da := round((case when na < 20 then 40 else 24 end) * (sa - ea))::integer;
  db := round((case when nb < 20 then 40 else 24 end) * (ea - sa))::integer;
  update public.ratings r set elo = greatest(100, r.elo + da), peak = greatest(r.peak, greatest(100, r.elo + da)),
    games = r.games + 1, updated_at = now() where r.uid = m.a and r.game = m.game;
  update public.ratings r set elo = greatest(100, r.elo + db), peak = greatest(r.peak, greatest(100, r.elo + db)),
    games = r.games + 1, updated_at = now() where r.uid = m.b and r.game = m.game;
  return array[da, db];
end;
$$;
revoke all on function public.elo_apply(public.matches) from public, anon, authenticated;

-- jede Partie, die gewertet zu Ende geht (egal über welchen Weg), genau einmal
create or replace function public.matches_elo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d integer[];
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.a_delta is null
    and new.a is not null and new.b is not null and public.match_ranked(new) then
    d := public.elo_apply(new);
    new.a_delta := d[1];
    new.b_delta := d[2];
  end if;
  return new;
end;
$$;
revoke all on function public.matches_elo() from public, anon, authenticated;
drop trigger if exists matches_elo on public.matches;
create trigger matches_elo before update on public.matches for each row execute function public.matches_elo();

-- die bisherigen gewerteten Partien der Reihe nach (nur beim ersten Lauf, solange es noch keine Elo gibt)
do $$
declare m public.matches; d integer[];
begin
  if not exists (select 1 from public.ratings) then
    for m in select * from public.matches x
      where x.status = 'done' and x.a_delta is null and x.a is not null and x.b is not null and public.match_ranked(x)
      order by x.finished_at nulls first, x.created_at, x.id
    loop
      d := public.elo_apply(m);
      update public.matches set a_delta = d[1], b_delta = d[2] where id = m.id;
    end loop;
  end if;
end;
$$;

-- die Elo-Liste eines Spiels: Elo, Partien, Bilanz (nur gewertete Duelle), Platz
create or replace function public.elo_rows(gm text)
returns table (uid uuid, username text, elo integer, peak integer, played integer, wins integer, draws integer, losses integer, pos bigint)
language sql stable security definer set search_path = '' as $$
  select r.uid, p.username, r.elo, r.peak, r.games, s.w, s.d, s.l,
    rank() over (order by r.elo desc, r.games desc) as pos
  from public.ratings r
  join public.profiles p on p.id = r.uid
  cross join lateral (
    select count(*) filter (where m.winner = r.uid)::int as w,
      count(*) filter (where m.winner is null)::int as d,
      count(*) filter (where m.winner is not null and m.winner <> r.uid)::int as l
    from public.matches m
    where m.game = r.game and m.status = 'done' and m.a_delta is not null and (m.a = r.uid or m.b = r.uid)
  ) s
  where r.game = gm and r.games > 0 and not p.hidden and not p.dev;
$$;
revoke all on function public.elo_rows(text) from public, anon, authenticated;

-- wie bisher, nur "Alle Zeit" in einem Spiel mit Elo: dann kommt 'elo': true und jede Zeile hat elo und peak
create or replace function public.leaderboard(gm text default null, lim integer default 50, period text default 'week')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  ws timestamptz := public.week_start();
  t0 timestamptz := case when period = 'all' then null else ws end;
begin
  if period = 'all' and coalesce(gm, '') <> '' and exists (select 1 from public.ratings r where r.game = gm and r.games > 0) then
    return jsonb_build_object(
      'period', 'all', 'elo', true, 'since', null, 'until', null,
      'players', (select count(*) from public.elo_rows(gm)),
      'top', (select coalesce(jsonb_agg(to_jsonb(x) - 'uid' order by x.pos, x.username), '[]'::jsonb)
        from (select * from public.elo_rows(gm) order by pos, username limit least(greatest(lim, 1), 100)) x),
      'me', (select to_jsonb(x) - 'uid' from public.elo_rows(gm) x where x.uid = auth.uid() limit 1),
      'last', '[]'::jsonb);
  end if;
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

-- dasselbe unter Freunden (Plätze nur unter euch)
create or replace function public.friends_board(gm text default null, period text default 'week')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
  ws timestamptz := public.week_start();
  t0 timestamptz := case when period = 'all' then null else ws end;
begin
  if u is null then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if period = 'all' and coalesce(gm, '') <> '' and exists (select 1 from public.ratings r where r.game = gm and r.games > 0) then
    return (
      with f as (
        select u as id
        union select case when x.requester = u then x.addressee else x.requester end
          from public.friendships x where x.status = 'accepted' and (x.requester = u or x.addressee = u)
      ), cur as (
        select e.uid, e.username, e.elo, e.peak, e.played, e.wins, e.draws, e.losses,
          rank() over (order by e.elo desc, e.played desc) as pos
        from public.elo_rows(gm) e where e.uid in (select id from f)
      )
      select jsonb_build_object(
        'period', 'all', 'elo', true, 'friends', true, 'since', null, 'until', null,
        'players', (select count(*) from cur),
        'circle', (select count(*) from f),
        'top', (select coalesce(jsonb_agg(to_jsonb(c) - 'uid' order by c.pos, c.username), '[]'::jsonb)
          from (select * from cur order by pos, username limit 100) c),
        'me', (select to_jsonb(c) - 'uid' from cur c where c.uid = u limit 1),
        'last', '[]'::jsonb));
  end if;
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

-- die Elo eines Spielers in jedem Spiel (Profil)
create or replace function public.player_elo(pname text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('game', r.game, 'elo', r.elo, 'peak', r.peak, 'games', r.games) order by r.elo desc, r.game), '[]'::jsonb)
  from public.ratings r join public.profiles p on p.id = r.uid
  where p.username = lower(trim(pname)) and r.games > 0 and (not (p.hidden or p.dev) or p.id = auth.uid());
$$;
revoke all on function public.player_elo(text) from public, anon;
grant execute on function public.player_elo(text) to authenticated;

-- die eigene Elo-Änderung durch eine Partie (Ergebnis-Fenster); null, solange sie nicht gewertet ist
create or replace function public.match_elo(mid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when m.a_delta is null then null else jsonb_build_object(
      'delta', case when m.a = auth.uid() then m.a_delta else m.b_delta end,
      'elo', r.elo, 'games', r.games) end
  from public.matches m
  left join public.ratings r on r.uid = auth.uid() and r.game = m.game
  where m.id = mid and auth.uid() in (m.a, m.b);
$$;
revoke all on function public.match_elo(uuid) from public, anon;
grant execute on function public.match_elo(uuid) to authenticated;
