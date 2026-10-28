-- Versus: Fünf in einer Reihe (gomoku) und Kalaha (kalaha) online spielbar machen.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.matches drop constraint if exists matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha'));

create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
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
