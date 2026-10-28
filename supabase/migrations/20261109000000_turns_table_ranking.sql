-- Versus: Zugreihenfolge auf dem Server und Rangliste für Online-Tische.
-- 1. match_move prüft bei Spielen, in denen immer abwechselnd gezogen wird, wer dran ist (Spieler 1 beginnt).
--    Reversi (Passen ohne Zug), Kalaha und Käsekästchen (Extrazüge) prüft weiter der Browser des Gegners.
-- 2. Online-Tische (Ludo, Mau-Mau, Poker, …) zählen für die Rangliste: Sieg für den Gewinner, eine Partie für alle
--    Menschen am Tisch (wer gegangen ist, hat verloren). Damit niemand sich einen Sieg einträgt, zählt ein Tisch nur,
--    wenn mindestens zwei Menschen dabei waren und mindestens zwei Browser dasselbe Ergebnis gemeldet haben.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

-- ---------- 1. Zugreihenfolge ----------
create or replace function public.match_move(mid uuid, ply integer, mv jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; s integer; n integer; c jsonb;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u is distinct from m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if m.status <> 'live' then raise exception 'Die Partie ist schon vorbei.'; end if;
  if m.game = 'ships' then raise exception 'Bei Schiffe versenken wird über match_shot geschossen.'; end if;
  if mv is null or octet_length(mv::text) > 1000 then raise exception 'Ungültiger Zug.'; end if;
  n := jsonb_array_length(m.moves);
  if ply <> n then raise exception 'desync'; end if;
  if n >= 1500 then raise exception 'Zu viele Züge.'; end if;
  s := case when u = m.a then m.a_side else 3 - m.a_side end;
  -- streng abwechselnd: Zug 0, 2, 4 … macht Seite 1, Zug 1, 3, 5 … Seite 2
  if m.game in ('c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon') and s <> 1 + n % 2 then
    raise exception 'Du bist nicht am Zug.';
  end if;
  c := public.match_clock(m);
  if c is not null and (c ->> 'turn')::integer = s and (c ->> s::text)::numeric <= 0 then
    perform public.match_close(mid, 3 - s, 'time');
    return n;
  end if;
  update public.matches set moves = moves || jsonb_build_array(jsonb_build_object('s', s, 'm', mv, 't', round(extract(epoch from clock_timestamp()) * 1000))),
    a_seen = case when u = m.a then now() else a_seen end,
    b_seen = case when u = m.b then now() else b_seen end
    where id = mid;
  return n + 1;
end;
$$;
revoke all on function public.match_move(uuid, integer, jsonb) from public, anon;
grant execute on function public.match_move(uuid, integer, jsonb) to authenticated;

-- ---------- 2. Tische in der Rangliste ----------
alter table public.party_tables add column if not exists claims jsonb not null default '{}'::jsonb;
create index if not exists party_tables_done_idx on public.party_tables (status, finished_at);

-- Ergebnis melden: die erste Meldung beendet das Spiel wie bisher; jeder weitere Browser bestätigt (oder widerspricht).
create or replace function public.party_finish(tid uuid, ply integer, w integer)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; s integer;
begin
  select * into t from public.party_tables where id = tid for update;
  if t.id is null or t.status not in ('live', 'done') then return; end if;
  s := public.party_seat(t, u);
  if s = 0 then return; end if;
  if ply <> jsonb_array_length(t.moves) or w not between 0 and t.n then
    if t.status = 'live' then raise exception 'desync'; end if;
    return;
  end if;
  update public.party_tables set claims = claims || jsonb_build_object(s::text, w) where id = tid;
  if t.status = 'live' then
    update public.party_tables set status = 'done', winner = nullif(w, 0), result = case when w = 0 then 'draw' else 'win' end, finished_at = now()
      where id = tid;
  end if;
end;
$$;
revoke all on function public.party_finish(uuid, integer, integer) from public, anon;
grant execute on function public.party_finish(uuid, integer, integer) to authenticated;

-- zählt ein Tisch für die Rangliste?
create or replace function public.party_ranked(t public.party_tables)
returns boolean language sql stable security definer set search_path = '' as $$
  select t.status = 'done'
    and (select count(*) from generate_series(1, t.n) i where t.seats[i] is not null) >= 2
    and (select count(*) from jsonb_each_text(t.claims)) >= 2
    and (select count(distinct x.value) from jsonb_each_text(t.claims) x) = 1
    and (select min(x.value)::integer from jsonb_each_text(t.claims) x) = coalesce(t.winner, 0)
    and not exists (select 1 from generate_series(1, t.n) i where t.seats[i] is not null and public.is_dev(t.seats[i]));
$$;
revoke all on function public.party_ranked(public.party_tables) from public, anon, authenticated;

-- Rangliste für einen Zeitraum: Duelle plus Tische
create or replace function public.board_rows(gm text, t0 timestamptz, t1 timestamptz)
returns table (uid uuid, username text, wins integer, played integer, draws integer, losses integer, pos bigint)
language sql stable security definer set search_path = '' as $$
  with r as (
    select x.u, x.w, x.d from public.matches m
    cross join lateral (values (m.a, coalesce((m.winner = m.a)::int, 0), (m.winner is null)::int), (m.b, coalesce((m.winner = m.b)::int, 0), (m.winner is null)::int)) as x(u, w, d)
    where m.status = 'done' and (gm is null or gm = '' or m.game = gm) and public.match_ranked(m)
      and (t0 is null or m.finished_at >= t0) and (t1 is null or m.finished_at < t1)
    union all
    select t.seats[i], coalesce((t.winner = i)::int, 0), (t.winner is null)::int
    from public.party_tables t cross join lateral generate_series(1, t.n) i
    where t.status = 'done' and t.seats[i] is not null and (gm is null or gm = '' or t.game = gm)
      and (t0 is null or t.finished_at >= t0) and (t1 is null or t.finished_at < t1)
      and public.party_ranked(t)
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
