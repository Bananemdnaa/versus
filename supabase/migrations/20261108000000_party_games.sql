-- Versus: neue Spiele. An Tischen (2-4): Würfelblock (yacht), Mau-Mau (maumau), Memory (memory), Poker (poker),
-- Galgenmännchen (hangman), Stadt Land Fluss (slf). Als Duell: Go (go), Backgammon (backgammon).
-- Dazu: party_move mit ply = -1 hängt den Zug einfach hinten an (für Spiele, in denen alle gleichzeitig spielen),
-- und Züge dürfen etwas größer sein (Antworten bei Stadt Land Fluss).
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.party_tables drop constraint if exists party_tables_game_check;
alter table public.party_tables add constraint party_tables_game_check
  check (game in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf'));

alter table public.matches drop constraint if exists matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon'));

create or replace function public.party_create(gm text, op jsonb default '{}'::jsonb, n integer default 4, lvl integer default 1, pub boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; t public.party_tables;
begin
  perform public.party_sweep();
  if gm not in ('ludo', 'ladder', 'yacht', 'maumau', 'memory', 'poker', 'hangman', 'slf') then raise exception 'Dieses Spiel gibt es an Tischen noch nicht.'; end if;
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
revoke all on function public.party_create(text, jsonb, integer, integer, boolean) from public, anon;
grant execute on function public.party_create(text, jsonb, integer, integer, boolean) to authenticated;

create or replace function public.party_move(tid uuid, ply integer, s integer, mv jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; me integer; n integer;
begin
  select * into t from public.party_tables where id = tid for update;
  if t.id is null then raise exception 'Diesen Tisch gibt es nicht.'; end if;
  me := public.party_seat(t, u);
  if me = 0 then raise exception 'Du sitzt nicht an diesem Tisch.'; end if;
  if t.status <> 'live' then raise exception 'Das Spiel ist schon vorbei.'; end if;
  if mv is null or octet_length(mv::text) > 1200 then raise exception 'Ungültiger Zug.'; end if;
  if s not between 1 and t.n then raise exception 'Ungültiger Platz.'; end if;
  if s::smallint = any(t.bots) then
    if me <> t.host then raise exception 'desync'; end if;
  elsif s <> me or me::smallint = any(t.bots) then raise exception 'desync';
  end if;
  n := jsonb_array_length(t.moves);
  if ply <> -1 and ply <> n then raise exception 'desync'; end if;
  if n >= 3000 then raise exception 'Zu viele Züge.'; end if;
  update public.party_tables set moves = moves || jsonb_build_array(jsonb_build_object('s', s, 'm', mv)), seen[me] = now()
    where id = tid;
  return n + 1;
end;
$$;
revoke all on function public.party_move(uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.party_move(uuid, integer, integer, jsonb) to authenticated;

create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
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
