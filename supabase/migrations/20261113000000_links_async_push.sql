-- Versus: Spiel-Links (Partie per Link, ohne Freundschaft), Partien über Tage (asynchron) und Push-Benachrichtigungen.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen früheren Migrationen auf.
-- Für Push zusätzlich (siehe README): Edge Function "push" anlegen, Secrets setzen, zwei Vault-Einträge.

begin;

-- ---------- Spalten ----------
-- private: Herausforderung per Link, taucht nicht in offenen Listen und beim schnellen Spiel auf
-- async:   Partie über Tage, ohne Offline-Abbruch; zählt nicht als "laufende Partie" für andere Partien
alter table public.matches add column if not exists private boolean not null default false;
alter table public.matches add column if not exists async boolean not null default false;
alter table public.matches add column if not exists last_move_at timestamptz;

-- läuft gerade eine normale (nicht asynchrone) Partie?
create or replace function public.busy(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches where status = 'live' and not async and (a = u or b = u));
$$;
revoke all on function public.busy(uuid) from public, anon, authenticated;

-- Spiele, die über Tage gehen: die mit festem Wechsel (wer dran ist, folgt aus der Zahl der Züge)
create or replace function public.async_game(gm text)
returns boolean language sql immutable set search_path = '' as $$
  select gm in ('c4', 'ttt', 'uttt', 'gomoku', 'chess', 'checkers', 'mill', 'go', 'backgammon');
$$;

-- ---------- Aufräumen ----------
create or replace function public.match_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and not async and (a_seen < now() - interval '30 seconds' or created_at < now() - interval '10 minutes');
  -- Einladungen über Tage: drei Tage Zeit zum Annehmen
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and async and created_at < now() - interval '3 days';
  -- eine Ergebnismeldung, die andere Seite meldet sich nicht mehr: die eine gilt
  for r in select id, coalesce(a_claim, b_claim) as c from public.matches
      where status = 'live' and (a_claim is null) <> (b_claim is null)
        and ((coalesce(a_claim, b_claim) ->> 't')::timestamptz < now() - interval '20 seconds') loop
    perform public.match_close(r.id, (r.c ->> 'w')::integer, case when (r.c ->> 'w')::integer = 0 then 'draw' else 'win' end);
  end loop;
  -- wer 75 Sekunden weg ist: Partie abgebrochen, niemand gewinnt (nicht bei Partien über Tage)
  update public.matches set status = 'void', finished_at = now(), winner = null, result = 'offline'
    where status = 'live' and not async and least(a_seen, coalesce(b_seen, a_seen)) < now() - interval '75 seconds';
  -- Partie über Tage: sieben Tage kein Zug, dann endet sie ohne Sieger
  update public.matches set status = 'void', finished_at = now(), winner = null, result = 'offline'
    where status = 'live' and async and coalesce(last_move_at, started_at, created_at) < now() - interval '7 days';
end;
$$;
revoke all on function public.match_sweep() from public, anon, authenticated;

-- ---------- Stand einer Partie: dazu async/private ----------
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
    'a_idle', floor(extract(epoch from (now() - m.a_seen))),
    'b_idle', floor(extract(epoch from (now() - coalesce(m.b_seen, now())))),
    'watchers', (select count(*) from public.match_watchers w where w.match_id = m.id and w.seen > now() - interval '15 seconds'),
    'total', jsonb_array_length(m.moves),
    'moves', (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(m.moves) with ordinality t(e, i) where i > greatest(coalesce(since, 0), 0)),
    'fleets_ready', m.a_fleet is not null and m.b_fleet is not null,
    'my_fleet', case when viewer = m.a then m.a_fleet when viewer = m.b then m.b_fleet end,
    'fleets', case when m.a_side is not null and viewer <> m.a and viewer is distinct from m.b and public.role_of(viewer) is not null
      then jsonb_build_object(m.a_side::text, m.a_fleet, (3 - m.a_side)::text, m.b_fleet) end,
    'async', m.async, 'private', m.private,
    'started_at', m.started_at, 'finished_at', m.finished_at);
$$;
revoke all on function public.match_view(public.matches, integer, uuid) from public, anon, authenticated;

-- ---------- Einladen: auf Wunsch über Tage ----------
drop function if exists public.match_invite(text, text, jsonb);
create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb, asy boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := null; mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
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
revoke all on function public.match_invite(text, text, jsonb, boolean) from public, anon;
grant execute on function public.match_invite(text, text, jsonb, boolean) to authenticated;

-- ---------- Spiel-Link: private Herausforderung, beitreten per match_join ----------
create or replace function public.match_link(gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); mid uuid;
begin
  perform public.match_sweep();
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if public.is_guest(u) and gm not in ('c4', 'ttt', 'ships', 'dots') then raise exception 'Dieses Spiel braucht ein Konto.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if public.busy(u) then raise exception 'Beende erst deine laufende Partie.'; end if;
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
  insert into public.matches (game, opts, a, b, private) values (gm, op, u, null, true) returning id into mid;
  return mid;
end;
$$;
revoke all on function public.match_link(text, jsonb) from public, anon;
grant execute on function public.match_link(text, jsonb) to authenticated;

-- wer einen Link öffnet, sieht vor dem Anmelden, welches Spiel und von wem
create or replace function public.match_peek(mid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('game', m.game, 'from', p.username, 'status', m.status, 'open', m.b is null and m.status = 'invited')
    from public.matches m join public.profiles p on p.id = m.a where m.id = mid and m.private;
$$;
revoke all on function public.match_peek(uuid) from public;
grant execute on function public.match_peek(uuid) to anon, authenticated;

create or replace function public.match_join(mid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if public.busy(u) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  if exists (select 1 from public.matches x where x.id = mid and public.blocked_between(x.a, u)) then
    raise exception 'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.';
  end if;
  update public.matches set b = u, status = 'live', started_at = now(), b_seen = now(),
    a_side = case when random() < 0.5 then 1 else 2 end
    where id = mid and b is null and status = 'invited' and a <> u
    returning * into m;
  if m.id is null then raise exception 'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.'; end if;
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and not async and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;
revoke all on function public.match_join(uuid) from public, anon;
grant execute on function public.match_join(uuid) to authenticated;

-- ---------- Annehmen und Revanche: Partien über Tage blockieren nichts ----------
create or replace function public.match_respond(mid uuid, ok boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if not ok then
    update public.matches set status = 'declined', finished_at = now() where id = mid and b = u and status = 'invited';
    return null;
  end if;
  select * into m from public.matches where id = mid and b = u and status = 'invited';
  if m.id is null then raise exception 'Diese Einladung gilt nicht mehr.'; end if;
  if not m.async and public.busy(u) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  update public.matches set status = 'live', started_at = now(), b_seen = now(), last_move_at = now(),
    a_side = coalesce(a_side, case when random() < 0.5 then 1 else 2 end)
    where id = mid and b = u and status = 'invited'
    returning * into m;
  if m.id is null then raise exception 'Diese Einladung gilt nicht mehr.'; end if;
  if not m.async then
    update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and not async and id <> mid;
  end if;
  return public.match_view(m, 0, u);
end;
$$;

create or replace function public.match_rematch(mid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; o uuid; r public.matches; my_side integer;
begin
  perform public.match_sweep();
  select * into m from public.matches where id = mid;
  if m.id is null or (u <> m.a and u is distinct from m.b) or m.b is null then raise exception 'Partie nicht gefunden.'; end if;
  if m.status not in ('done', 'void') then raise exception 'Die Partie läuft noch.'; end if;
  o := case when u = m.a then m.b else m.a end;
  -- der andere hat schon gefragt: annehmen
  select * into r from public.matches where rematch_of = mid and a = o and b = u and status = 'invited' order by created_at desc limit 1;
  if r.id is not null then
    if not r.async and public.busy(u) then raise exception 'Beende erst deine laufende Partie.'; end if;
    update public.matches set status = 'live', started_at = now(), b_seen = now(), last_move_at = now() where id = r.id returning * into r;
    if not r.async then
      update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited' and not async;
      update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and not async and id <> r.id;
    end if;
    return public.match_view(r, 0, u);
  end if;
  -- ich habe schon gefragt
  select * into r from public.matches where rematch_of = mid and a = u and status = 'invited' order by created_at desc limit 1;
  if r.id is not null then return public.match_view(r, 0, u); end if;
  if not m.async then
    if exists (select 1 from public.matches where status in ('invited', 'live') and not async and (a = u or b = u)) then
      raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
    end if;
    if public.busy(o) then
      raise exception 'Dein Gegner spielt schon eine andere Partie.';
    end if;
  end if;
  my_side := case when u = m.a then m.a_side else 3 - m.a_side end;
  insert into public.matches (game, opts, a, b, a_side, rematch_of, async)
    values (m.game, m.opts, u, o, case when my_side in (1, 2) then 3 - my_side else (case when random() < 0.5 then 1 else 2 end) end, mid, m.async)
    returning * into r;
  return public.match_view(r, 0, u);
end;
$$;
revoke all on function public.match_rematch(uuid) from public, anon;
grant execute on function public.match_rematch(uuid) to authenticated;

-- ---------- Menü: Partien über Tage, keine privaten Links in offenen Listen ----------
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at, 'async', m.async) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'open', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at, 'guest', p.guest) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a
      where m.b is null and m.status = 'invited' and m.a <> u and not m.private and not m.async and (not p.hidden or p.guest)
        and not public.blocked_between(m.a, u)
        and (not public.is_guest(u) or m.game in ('c4', 'ttt', 'ships', 'dots'))),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and not m.async and (m.a = u or m.b = u) limit 1),
    -- Partien über Tage: wer dran ist, folgt aus der Zahl der Züge (Seite 1 beginnt)
    'async', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'game', m.game,
        'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end),
        'my_turn', (case when m.a = u then m.a_side else 3 - m.a_side end) = 1 + jsonb_array_length(m.moves) % 2,
        'moves', jsonb_array_length(m.moves), 'at', coalesce(m.last_move_at, m.started_at)) order by coalesce(m.last_move_at, m.started_at) desc), '[]'::jsonb)
      from public.matches m where m.status = 'live' and m.async and (m.a = u or m.b = u)),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'),
    'req_from', (select p.username from public.friendships f join public.profiles p on p.id = f.requester
      where f.addressee = u and f.status = 'pending' order by f.created_at desc limit 1),
    'friend_n', (select count(*) from public.friendships where (requester = u or addressee = u) and status = 'accepted'));
end;
$$;

-- ---------- Schnelles Spiel: ohne private Links und Partien über Tage ----------
create or replace function public.quick_match(gm text default null, fb text default null, op jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.me(); g text := nullif(trim(coalesce(gm, '')), ''); own public.matches; mid uuid; found_id uuid;
  ok text[] := array['ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots', 'ships', 'gomoku', 'kalaha', 'go', 'backgammon'];
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
revoke all on function public.quick_match(text, text, jsonb) from public, anon;
grant execute on function public.quick_match(text, text, jsonb) to authenticated;

-- ---------- Push-Benachrichtigungen ----------
create table if not exists public.push_subs (
  endpoint text primary key,
  uid uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_uid_idx on public.push_subs (uid);
alter table public.push_subs enable row level security;   -- nur über die Funktionen unten

create or replace function public.push_save(ep text, key text, au text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if u is null or public.is_guest(u) then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if length(ep) > 1000 or ep !~ '^https://' then raise exception 'Ungültiges Abo.'; end if;
  insert into public.push_subs (endpoint, uid, p256dh, auth) values (ep, u, key, au)
    on conflict (endpoint) do update set uid = u, p256dh = excluded.p256dh, auth = excluded.auth;
  -- höchstens 5 Geräte pro Konto
  delete from public.push_subs where uid = u and endpoint not in (select endpoint from public.push_subs where uid = u order by created_at desc limit 5);
end;
$$;
revoke all on function public.push_save(text, text, text) from public, anon;
grant execute on function public.push_save(text, text, text) to authenticated;

create or replace function public.push_remove(ep text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subs where endpoint = ep and uid = public.me();
$$;
revoke all on function public.push_remove(text) from public, anon;
grant execute on function public.push_remove(text) to authenticated;

create extension if not exists pg_net with schema extensions;

-- schickt eine Nachricht an die Edge Function "push" (Adresse und Geheimnis im Vault: push_url, push_secret)
create or replace function public.push_notify(u uuid, kind text, who text, gm text, mid uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare fn text; sec text;
begin
  if u is null or not exists (select 1 from public.push_subs where uid = u) then return; end if;
  select decrypted_secret into fn from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into sec from vault.decrypted_secrets where name = 'push_secret';
  if fn is null or sec is null then return; end if;
  perform net.http_post(url := fn,
    body := jsonb_build_object('uid', u, 'kind', kind, 'from', who, 'game', gm, 'match', mid),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', sec));
exception when others then null;   -- eine Benachrichtigung darf nie einen Zug oder eine Einladung verhindern
end;
$$;
revoke all on function public.push_notify(uuid, text, text, text, uuid) from public, anon, authenticated;

-- Einladung von einem Freund, Zug in einer Partie über Tage
create or replace function public.matches_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare mover integer; to_side integer; who uuid; target uuid;
begin
  if tg_op = 'INSERT' then
    if new.b is not null and new.status = 'invited' then
      perform public.push_notify(new.b, case when new.async then 'invite_async' else 'invite' end,
        (select username from public.profiles where id = new.a), new.game, new.id);
    end if;
    return new;
  end if;
  if new.async and new.status = 'live' and jsonb_array_length(new.moves) > jsonb_array_length(old.moves) then
    mover := (new.moves -> -1 ->> 's')::integer;
    to_side := 3 - coalesce(mover, 1);
    target := case when new.a_side = to_side then new.a else new.b end;
    who := case when target = new.a then new.b else new.a end;
    perform public.push_notify(target, 'turn', (select username from public.profiles where id = who), new.game, new.id);
  elsif new.async and old.status = 'invited' and new.status = 'live' then
    perform public.push_notify(new.a, 'accepted', (select username from public.profiles where id = new.b), new.game, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists matches_push on public.matches;
create trigger matches_push after insert or update on public.matches for each row execute function public.matches_push();

-- jede Zugänderung merkt sich die Zeit (Partien über Tage enden nach sieben Tagen ohne Zug)
create or replace function public.matches_moved()
returns trigger language plpgsql set search_path = '' as $$
begin
  if jsonb_array_length(new.moves) <> jsonb_array_length(old.moves) then new.last_move_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists matches_moved on public.matches;
create trigger matches_moved before update on public.matches for each row execute function public.matches_moved();

-- Freundschaftsanfrage
create or replace function public.friend_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform public.push_notify(new.addressee, 'friend', (select username from public.profiles where id = new.requester), null, null);
  end if;
  return new;
end;
$$;
drop trigger if exists friend_push on public.friendships;
create trigger friend_push after insert or update on public.friendships for each row execute function public.friend_push();

commit;
