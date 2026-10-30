-- Versus: neue Spiele. Als Duell (auch über Tage): Hex (hex), 3D Tic Tac Toe (ttt3).
-- An Tischen: Zahlencode knacken (code, immer genau 2 Plätze) und Domino (domino, 2-4).
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.matches drop constraint if exists matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon', 'hex', 'ttt3'));

alter table public.party_tables drop constraint if exists party_tables_game_check;
alter table public.party_tables add constraint party_tables_game_check
  check (game in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess', 'code', 'domino'));

create or replace function public.async_game(gm text)
returns boolean language sql immutable set search_path = '' as $$
  select gm in ('c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon', 'hex', 'ttt3');
$$;

create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb, asy boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon', 'hex', 'ttt3') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if coalesce(asy, false) then
    if not public.async_game(gm) then raise exception 'Dieses Spiel geht nicht über mehrere Tage.'; end if;
    if coalesce(trim(opp), '') = '' then raise exception 'Partien über Tage gehen nur mit Freunden.'; end if;
    op := op - 'clock';
  end if;
  if coalesce(trim(opp), '') <> '' then
    o := public.uid_of(opp);
    if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
    if o = u then raise exception 'Du kannst dich nicht selbst einladen.'; end if;
    if not public.are_friends(u, o) then raise exception 'Du kannst nur Freunde direkt einladen.'; end if;
    if not coalesce(asy, false) and public.busy(o) then
      raise exception 'Dein Freund spielt gerade eine andere Partie.';
    end if;
  end if;
  if coalesce(asy, false) then
    if (select count(*) from public.matches where async and status in ('invited', 'live') and (a = u or b = u)) >= 10 then
      raise exception 'Du hast schon 10 Partien über Tage. Beende erst eine.';
    end if;
    if exists (select 1 from public.matches where async and status in ('invited', 'live') and ((a = u and b = o) or (a = o and b = u)) and game = gm) then
      raise exception 'Mit diesem Freund läuft schon so eine Partie über Tage.';
    end if;
  elsif exists (select 1 from public.matches where status in ('invited', 'live') and not async and (a = u or b = u)) then
    raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
  end if;
  insert into public.matches (game, opts, a, b, async) values (gm, op, u, o, coalesce(asy, false)) returning id into mid;
  return mid;
end;
$$;

create or replace function public.match_link(gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon', 'hex', 'ttt3') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if public.is_guest(u) and gm not in ('c4', 'ttt', 'ships', 'dots') then raise exception 'Dieses Spiel braucht ein Konto.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if public.busy(u) then raise exception 'Beende erst deine laufende Partie.'; end if;
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
  insert into public.matches (game, opts, a, b, private) values (gm, op, u, null, true) returning id into mid;
  return mid;
end;
$$;

create or replace function public.quick_match(gm text default null, fb text default null, op jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.me(); g text := nullif(trim(coalesce(gm, '')), ''); own public.matches; mid uuid; found_id uuid;
  ok text[] := array['ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon', 'hex', 'ttt3'];
  guest_ok text[] := array['c4', 'ttt', 'ships', 'dots'];
  me_guest boolean := public.is_guest(u);
begin
  perform pg_advisory_xact_lock(hashtext('versus_quick_match'));
  perform public.match_sweep();
  if random() < 0.05 then perform public.guest_sweep(); end if;
  if g is not null and not (g = any (ok)) then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if me_guest and g is not null and not (g = any (guest_ok)) then raise exception 'Dieses Spiel braucht ein Konto.'; end if;
  if public.busy(u) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  -- schon eine eigene offene Herausforderung: weiter darauf warten
  select * into own from public.matches where a = u and b is null and status = 'invited' and not private and not async order by created_at desc limit 1;
  if own.id is not null and (g is null or own.game = g) then
    return jsonb_build_object('status', 'waiting', 'id', own.id, 'game', own.game);
  end if;
  select m.id into found_id from public.matches m join public.profiles p on p.id = m.a
    where m.status = 'invited' and m.b is null and m.a <> u and not m.private and not m.async
      and (g is null or m.game = g)
      and (not me_guest or m.game = any (guest_ok))
      and (not p.hidden or p.guest)
      and m.a_seen > now() - interval '20 seconds'
      and not public.blocked_between(m.a, u)
    order by m.created_at limit 1;
  if found_id is not null then return public.match_join(found_id); end if;
  -- niemand wartet: eigene Herausforderung
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
  g := coalesce(g, nullif(trim(coalesce(fb, '')), ''), 'c4');
  if not (g = any (ok)) or (me_guest and not (g = any (guest_ok))) then g := 'c4'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  insert into public.matches (game, opts, a, b) values (g, op, u, null) returning id into mid;
  return jsonb_build_object('status', 'waiting', 'id', mid, 'game', g);
end;
$$;

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
  if m.game in ('c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon', 'hex', 'ttt3') and s <> 1 + n % 2 then
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

create or replace function public.party_create(gm text, op jsonb default '{}'::jsonb, n integer default 4, lvl integer default 1, pub boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; t public.party_tables;
begin
  perform public.party_sweep();
  if gm not in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf', 'schnapsen', 'guess', 'code', 'domino') then raise exception 'Dieses Spiel gibt es an Tischen noch nicht.'; end if;
  if gm in ('schnapsen', 'code') then n := 2; end if;
  if n not between 2 and 4 then raise exception 'Zwei bis vier Spieler.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  perform public.party_free_me(u);
  loop
    c := '';
    for i in 1..5 loop c := c || substr(abc, 1 + floor(random() * length(abc))::integer, 1); end loop;
    exit when not exists (select 1 from public.party_tables where code = c);
  end loop;
  insert into public.party_tables (code, game, opts, n, lvl, open, seats, seen)
    values (c, gm, op, n, least(greatest(coalesce(lvl, 1), 0), 3), coalesce(pub, false),
      array[u, null, null, null]::uuid[], array[now(), null, null, null]::timestamptz[])
    returning * into t;
  return public.party_view(t, 0, u);
end;
$$;
