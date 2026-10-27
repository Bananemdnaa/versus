-- Versus: Schiffe versenken online. Die Flotten liegen nur auf dem Server, jeder Schuss wird dort ausgewertet,
-- deshalb kann niemand die gegnerischen Schiffe sehen. Einmal im Supabase SQL-Editor ausführen.
-- Baut auf 20261029000000_friends_matches.sql und 20261030000000_open_matches.sql auf.

alter table public.matches add column if not exists a_fleet jsonb;
alter table public.matches add column if not exists b_fleet jsonb;
alter table public.matches drop constraint if exists matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships'));

-- Flotte prüfen: 5 Schiffe (5, 4, 3, 3, 2 Felder), jedes gerade und lückenlos, keine Überlappung, keine Berührung (auch nicht über Eck)
create or replace function public.fleet_ok(f jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare s jsonb; ship integer[]; lens integer[] := '{}'; owner integer[] := array_fill(-1, array[100]);
  n integer := 0; k integer; i integer; j integer; rr integer; cc integer;
begin
  if f is null or jsonb_typeof(f) <> 'array' or jsonb_array_length(f) <> 5 then return false; end if;
  for s in select value from jsonb_array_elements(f) loop
    if jsonb_typeof(s) <> 'array' or jsonb_array_length(s) < 2 or jsonb_array_length(s) > 5 then return false; end if;
    if exists (select 1 from jsonb_array_elements(s) x where jsonb_typeof(x) <> 'number') then return false; end if;
    ship := array(select (x #>> '{}')::numeric::integer from jsonb_array_elements(s) x order by 1);
    lens := lens || array_length(ship, 1);
    foreach i in array ship loop
      if i < 0 or i > 99 then return false; end if;
      if owner[i + 1] <> -1 then return false; end if;
      owner[i + 1] := n;
    end loop;
    if (select count(distinct v / 10) from unnest(ship) v) = 1 then
      for k in 2..array_length(ship, 1) loop if ship[k] <> ship[k - 1] + 1 then return false; end if; end loop;
    elsif (select count(distinct v % 10) from unnest(ship) v) = 1 then
      for k in 2..array_length(ship, 1) loop if ship[k] <> ship[k - 1] + 10 then return false; end if; end loop;
    else
      return false;
    end if;
    n := n + 1;
  end loop;
  if (select array_agg(x order by x) from unnest(lens) x) <> array[2, 3, 3, 4, 5] then return false; end if;
  for i in 0..99 loop
    if owner[i + 1] >= 0 then
      for rr in greatest(i / 10 - 1, 0)..least(i / 10 + 1, 9) loop
        for cc in greatest(i % 10 - 1, 0)..least(i % 10 + 1, 9) loop
          j := rr * 10 + cc;
          if owner[j + 1] >= 0 and owner[j + 1] <> owner[i + 1] then return false; end if;
        end loop;
      end loop;
    end if;
  end loop;
  return true;
end;
$$;

-- Stand einer Partie: zusätzlich eigene Flotte, ob beide Flotten stehen, und für Admins beide Flotten
create or replace function public.match_view(m public.matches, since integer, viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id, 'game', m.game, 'opts', m.opts, 'status', m.status, 'result', m.result,
    'role', case when viewer = m.a then 'a' when viewer = m.b then 'b' else 'watch' end,
    'a_side', m.a_side,
    'a_name', (select username from public.profiles where id = m.a),
    'b_name', (select username from public.profiles where id = m.b),
    'winner', (select username from public.profiles where id = m.winner),
    'winner_side', case when m.winner is null then null when m.winner = m.a then m.a_side else 3 - m.a_side end,
    'a_online', m.a_seen > now() - interval '15 seconds',
    'b_online', coalesce(m.b_seen > now() - interval '15 seconds', false),
    'total', jsonb_array_length(m.moves),
    'moves', (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(m.moves) with ordinality t(e, i) where i > greatest(coalesce(since, 0), 0)),
    'fleets_ready', m.a_fleet is not null and m.b_fleet is not null,
    'my_fleet', case when viewer = m.a then m.a_fleet when viewer = m.b then m.b_fleet end,
    'fleets', case when m.a_side is not null and viewer <> m.a and viewer is distinct from m.b and public.role_of(viewer) is not null
      then jsonb_build_object(m.a_side::text, m.a_fleet, (3 - m.a_side)::text, m.b_fleet) end,
    'started_at', m.started_at, 'finished_at', m.finished_at);
$$;

-- Einladen: Schiffe versenken ist jetzt dabei
create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if coalesce(trim(opp), '') <> '' then
    o := public.uid_of(opp);
    if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
    if o = u then raise exception 'Du kannst dich nicht selbst einladen.'; end if;
    if not public.are_friends(u, o) then raise exception 'Du kannst nur Freunde direkt einladen.'; end if;
    if exists (select 1 from public.matches where status = 'live' and (a = o or b = o)) then
      raise exception 'Dein Freund spielt gerade eine andere Partie.';
    end if;
  end if;
  if exists (select 1 from public.matches where status in ('invited', 'live') and (a = u or b = u)) then
    raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
  end if;
  insert into public.matches (game, opts, a, b) values (gm, op, u, o) returning id into mid;
  return mid;
end;
$$;

-- Normale Züge: bei Schiffe versenken nicht erlaubt (dort nur match_shot)
create or replace function public.match_move(mid uuid, ply integer, mv jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; s integer; n integer;
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
  update public.matches set moves = moves || jsonb_build_array(jsonb_build_object('s', s, 'm', mv)),
    a_seen = case when u = m.a then now() else a_seen end,
    b_seen = case when u = m.b then now() else b_seen end
    where id = mid;
  return n + 1;
end;
$$;

-- Eigene Flotte abgeben (einmal, vor dem ersten Schuss)
create or replace function public.match_fleet(mid uuid, f jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u is distinct from m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if m.game <> 'ships' or m.status <> 'live' then raise exception 'Die Partie läuft nicht.'; end if;
  if not public.fleet_ok(f) then raise exception 'Diese Flotte ist nicht regelkonform.'; end if;
  if u = m.a then
    if m.a_fleet is not null then raise exception 'Deine Flotte steht schon.'; end if;
    update public.matches set a_fleet = f, a_seen = now() where id = mid;
  else
    if m.b_fleet is not null then raise exception 'Deine Flotte steht schon.'; end if;
    update public.matches set b_fleet = f, b_seen = now() where id = mid;
  end if;
  select * into m from public.matches where id = mid;
  return public.match_view(m, 0, u);
end;
$$;

-- Schuss: der Server prüft, wer dran ist, wertet aus (Wasser, Treffer, versenkt) und beendet die Partie,
-- wenn das letzte Schiff sinkt. Treffer heißt nochmal schießen.
create or replace function public.match_shot(mid uuid, ply integer, cell integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; s integer; n integer; last jsonb; turn integer;
  tf jsonb; hit_ship jsonb; hits integer; res jsonb; sunk integer;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u is distinct from m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if m.game <> 'ships' then raise exception 'Falsches Spiel.'; end if;
  if m.status <> 'live' then raise exception 'Die Partie ist schon vorbei.'; end if;
  if m.a_fleet is null or m.b_fleet is null then raise exception 'Die Flotten sind noch nicht fertig.'; end if;
  n := jsonb_array_length(m.moves);
  if ply <> n then raise exception 'desync'; end if;
  s := case when u = m.a then m.a_side else 3 - m.a_side end;
  last := case when n > 0 then m.moves -> (n - 1) else null end;
  turn := case when last is null then 1 when last -> 'm' ->> 'r' = 'miss' then 3 - (last ->> 's')::integer else (last ->> 's')::integer end;
  if s <> turn then raise exception 'Du bist nicht dran.'; end if;
  if cell is null or cell < 0 or cell > 99 then raise exception 'Ungültiges Feld.'; end if;
  if exists (select 1 from jsonb_array_elements(m.moves) e where (e ->> 's')::integer = s and (e -> 'm' ->> 'i')::integer = cell) then
    raise exception 'Da hast du schon hingeschossen.';
  end if;
  tf := case when 3 - s = m.a_side then m.a_fleet else m.b_fleet end;
  select x into hit_ship from jsonb_array_elements(tf) x where x @> to_jsonb(cell) limit 1;
  if hit_ship is null then
    res := jsonb_build_object('i', cell, 'r', 'miss');
  else
    select count(*) + 1 into hits from jsonb_array_elements(m.moves) e where (e ->> 's')::integer = s and hit_ship @> (e -> 'm' -> 'i');
    if hits >= jsonb_array_length(hit_ship) then res := jsonb_build_object('i', cell, 'r', 'sunk', 'cells', hit_ship);
    else res := jsonb_build_object('i', cell, 'r', 'hit');
    end if;
  end if;
  update public.matches set moves = moves || jsonb_build_array(jsonb_build_object('s', s, 'm', res)),
    a_seen = case when u = m.a then now() else a_seen end,
    b_seen = case when u = m.b then now() else b_seen end
    where id = mid;
  if res ->> 'r' = 'sunk' then
    select count(*) + 1 into sunk from jsonb_array_elements(m.moves) e where (e ->> 's')::integer = s and e -> 'm' ->> 'r' = 'sunk';
    if sunk >= 5 then perform public.match_close(mid, s, 'win'); end if;
  end if;
  return res || jsonb_build_object('n', n + 1);
end;
$$;

revoke all on function public.match_fleet(uuid, jsonb) from public, anon;
grant execute on function public.match_fleet(uuid, jsonb) to authenticated;
revoke all on function public.match_shot(uuid, integer, integer) from public, anon;
grant execute on function public.match_shot(uuid, integer, integer) to authenticated;
