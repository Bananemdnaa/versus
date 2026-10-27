-- Versus: Freunde, Online-Partien gegen Freunde, Ranglisten und Partie-Protokoll für Admins
-- Einmal im Supabase SQL-Editor ausführen. Baut auf 20261028000000_accounts_admin.sql auf.

-- =====================================================================
-- Freunde
-- =====================================================================
create table if not exists public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee);
alter table public.friendships enable row level security;   -- nur über die Funktionen unten

create or replace function public.are_friends(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and ((f.requester = x and f.addressee = y) or (f.requester = y and f.addressee = x)));
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- 'sent', 'accepted' (die andere Person hatte schon angefragt), 'friends' (seid ihr schon), 'pending' (schon angefragt)
create or replace function public.friend_request(name text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); st text; n integer;
begin
  if o is null or public.is_dev(o) then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  update public.friendships set status = 'accepted' where requester = o and addressee = u and status = 'pending';
  if found then return 'accepted'; end if;
  select f.status into st from public.friendships f where (f.requester = u and f.addressee = o) or (f.requester = o and f.addressee = u) limit 1;
  if st = 'accepted' then return 'friends'; end if;
  if st = 'pending' then return 'pending'; end if;
  select count(*) into n from public.friendships where requester = u or addressee = u;
  if n >= 150 then raise exception 'Du hast schon 150 Freunde und Anfragen.'; end if;
  select count(*) into n from public.friendships where requester = u and status = 'pending';
  if n >= 30 then raise exception 'Du hast schon 30 offene Anfragen. Warte, bis jemand antwortet.'; end if;
  insert into public.friendships (requester, addressee) values (u, o);
  return 'sent';
end;
$$;

create or replace function public.friend_respond(name text, ok boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name);
begin
  if ok then update public.friendships set status = 'accepted' where requester = o and addressee = u and status = 'pending';
  else delete from public.friendships where requester = o and addressee = u and status = 'pending';
  end if;
  return found;
end;
$$;

-- Freundschaft beenden oder eigene Anfrage zurückziehen
create or replace function public.friend_remove(name text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name);
begin
  delete from public.friendships where (requester = u and addressee = o) or (requester = o and addressee = u);
end;
$$;

-- Freunde mit Online-Status, offene Anfragen an mich und von mir
create or replace function public.friends()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  return jsonb_build_object(
    'friends', (select coalesce(jsonb_agg(jsonb_build_object(
        'username', p.username, 'online', p.last_seen > now() - interval '2 minutes', 'seen', p.last_seen, 'game', p.current_game,
        'busy', exists (select 1 from public.matches m where m.status = 'live' and (m.a = p.id or m.b = p.id)))
        order by (p.last_seen > now() - interval '2 minutes') desc, p.username), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)),
    'incoming', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.requester where f.addressee = u and f.status = 'pending'),
    'outgoing', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.addressee where f.requester = u and f.status = 'pending'));
end;
$$;

-- Spieler nach Namensanfang suchen, mit Beziehung zu mir
create or replace function public.player_search(q text)
returns table (username text, state text)
language sql stable security definer set search_path = '' as $$
  select p.username,
    (select case when fr.status = 'accepted' then 'friend' when fr.requester = auth.uid() then 'outgoing' else 'incoming' end
      from public.friendships fr
      where (fr.requester = auth.uid() and fr.addressee = p.id) or (fr.requester = p.id and fr.addressee = auth.uid()) limit 1)
  from public.profiles p
  where char_length(trim(q)) >= 2
    and left(p.username, char_length(trim(q))) = lower(trim(q))
    and p.id <> auth.uid() and not p.dev
  order by p.username
  limit 8;
$$;

-- =====================================================================
-- Online-Partien
-- =====================================================================
-- Ablauf: a lädt einen Freund ein ('invited', a wartet und meldet sich alle paar Sekunden), b nimmt an ('live',
-- die Seiten werden ausgelost). Beide holen laufend neue Züge ab und schicken ihre eigenen. Die Spielregeln prüfen
-- beide Browser; der Server achtet auf die Reihenfolge der Züge. Am Ende melden beide das Ergebnis; stimmen die
-- Meldungen nicht überein, wird die Partie annulliert. Wer 75 Sekunden nichts von sich hören lässt, verliert.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots')),
  opts jsonb not null default '{}'::jsonb,
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  a_side smallint check (a_side in (1, 2)),
  status text not null default 'invited' check (status in ('invited', 'live', 'done', 'declined', 'expired', 'canceled', 'void')),
  moves jsonb not null default '[]'::jsonb,
  winner uuid references auth.users (id) on delete set null,
  result text,
  a_claim jsonb,
  b_claim jsonb,
  a_seen timestamptz not null default now(),
  b_seen timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_a_idx on public.matches (a);
create index if not exists matches_b_idx on public.matches (b);
create index if not exists matches_done_idx on public.matches (finished_at desc);
alter table public.matches enable row level security;   -- nur über die Funktionen unten

create or replace function public.side_user(m public.matches, s integer)
returns uuid language sql immutable set search_path = '' as $$
  select case when s = m.a_side then m.a else m.b end;
$$;

-- Ergebnis festschreiben: w = Seite des Siegers, 0 = remis
create or replace function public.match_close(mid uuid, w integer, why text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches;
begin
  select * into m from public.matches where id = mid;
  if m.id is null or m.status <> 'live' then return; end if;
  update public.matches set status = 'done', finished_at = now(), result = why,
    winner = case when w in (1, 2) then public.side_user(m, w) else null end
    where id = mid;
end;
$$;
revoke all on function public.match_close(uuid, integer, text) from public, anon, authenticated;

create or replace function public.match_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  update public.matches set status = 'expired', finished_at = now()
    where status = 'invited' and (a_seen < now() - interval '30 seconds' or created_at < now() - interval '10 minutes');
  -- eine Ergebnismeldung, die andere Seite meldet sich nicht mehr: die eine gilt
  for r in select id, coalesce(a_claim, b_claim) as c from public.matches
      where status = 'live' and (a_claim is null) <> (b_claim is null)
        and ((coalesce(a_claim, b_claim) ->> 't')::timestamptz < now() - interval '20 seconds') loop
    perform public.match_close(r.id, (r.c ->> 'w')::integer, case when (r.c ->> 'w')::integer = 0 then 'draw' else 'win' end);
  end loop;
  -- wer 75 Sekunden weg ist, verliert
  for r in select id, a_side, a_seen, b_seen from public.matches
      where status = 'live' and least(a_seen, coalesce(b_seen, a_seen)) < now() - interval '75 seconds' loop
    perform public.match_close(r.id, case when r.a_seen < coalesce(r.b_seen, r.a_seen) then 3 - r.a_side else r.a_side end, 'abandon');
  end loop;
end;
$$;
revoke all on function public.match_sweep() from public, anon, authenticated;

-- Stand einer Partie für Spieler und Admins (role 'watch'). since = Zahl der Züge, die der Browser schon hat.
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
    'started_at', m.started_at, 'finished_at', m.finished_at);
$$;
revoke all on function public.match_view(public.matches, integer, uuid) from public, anon, authenticated;

create or replace function public.match_invite(opp text, gm text, op jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(opp); mid uuid;
begin
  perform public.match_sweep();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Du kannst dich nicht selbst einladen.'; end if;
  if not public.are_friends(u, o) then raise exception 'Du kannst nur Freunde einladen.'; end if;
  if gm not in ('ttt', 'c4', 'uttt', 'chess', 'checkers', 'reversi', 'mill', 'dots') then raise exception 'Dieses Spiel gibt es online noch nicht.'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  if exists (select 1 from public.matches where status in ('invited', 'live') and (a = u or b = u)) then
    raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
  end if;
  if exists (select 1 from public.matches where status = 'live' and (a = o or b = o)) then
    raise exception 'Dein Freund spielt gerade eine andere Partie.';
  end if;
  insert into public.matches (game, opts, a, b) values (gm, op, u, o) returning id into mid;
  return mid;
end;
$$;

create or replace function public.match_cancel(mid uuid)
returns void language sql security definer set search_path = '' as $$
  update public.matches set status = 'canceled', finished_at = now() where id = mid and a = public.me() and status = 'invited';
$$;

create or replace function public.match_respond(mid uuid, ok boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if not ok then
    update public.matches set status = 'declined', finished_at = now() where id = mid and b = u and status = 'invited';
    return null;
  end if;
  if exists (select 1 from public.matches where status = 'live' and (a = u or b = u)) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  update public.matches set status = 'live', started_at = now(), b_seen = now(),
    a_side = case when random() < 0.5 then 1 else 2 end
    where id = mid and b = u and status = 'invited'
    returning * into m;
  if m.id is null then raise exception 'Diese Einladung gilt nicht mehr.'; end if;
  -- andere offene Einladungen an mich sind damit erledigt
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;

create or replace function public.match_state(mid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if u = m.a and m.status in ('invited', 'live') then update public.matches set a_seen = now() where id = mid;
  elsif u = m.b and m.status = 'live' then update public.matches set b_seen = now() where id = mid;
  elsif u <> m.a and u <> m.b and public.role_of(u) is null then raise exception 'Partie nicht gefunden.';
  end if;
  return public.match_view(m, since, u);
end;
$$;

-- Zug anhängen. ply = Zahl der Züge, die der Browser vorher kannte (schützt vor doppelten oder verlorenen Zügen).
create or replace function public.match_move(mid uuid, ply integer, mv jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; s integer; n integer;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u <> m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if m.status <> 'live' then raise exception 'Die Partie ist schon vorbei.'; end if;
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

-- Ergebnis melden: w = Seite des Siegers aus Sicht der Spielregeln, 0 = remis
create or replace function public.match_finish(mid uuid, ply integer, w integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; c jsonb;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u <> m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if m.status = 'live' then
    if w not in (0, 1, 2) or ply <> jsonb_array_length(m.moves) then raise exception 'desync'; end if;
    c := jsonb_build_object('w', w, 'ply', ply, 't', now());
    if u = m.a then update public.matches set a_claim = c where id = mid returning * into m;
    else update public.matches set b_claim = c where id = mid returning * into m;
    end if;
    if m.a_claim is not null and m.b_claim is not null then
      if (m.a_claim ->> 'w') = (m.b_claim ->> 'w') and (m.a_claim ->> 'ply') = (m.b_claim ->> 'ply') then
        perform public.match_close(mid, w, case when w = 0 then 'draw' else 'win' end);
      else
        update public.matches set status = 'void', result = 'mismatch', finished_at = now() where id = mid;
      end if;
    end if;
  end if;
  select * into m from public.matches where id = mid;
  return public.match_view(m, jsonb_array_length(m.moves), u);
end;
$$;

create or replace function public.match_resign(mid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  select * into m from public.matches where id = mid;
  if m.id is null or (u <> m.a and u <> m.b) or m.status <> 'live' then return; end if;
  perform public.match_close(mid, case when u = m.a then 3 - m.a_side else m.a_side end, 'resign');
end;
$$;

-- Ein Gegner meldet einen regelwidrigen Zug: Partie wird annulliert (zählt für niemanden)
create or replace function public.match_report(mid uuid, why text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  update public.matches set status = 'void', result = left('illegal: ' || coalesce(why, ''), 120), finished_at = now()
    where id = mid and status = 'live' and (a = u or b = u);
end;
$$;

-- Für das Menü: Einladungen an mich, eigene laufende Partie, Zahl der Freundschaftsanfragen
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and (m.a = u or m.b = u) limit 1),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'));
end;
$$;

-- =====================================================================
-- Ranglisten: gewonnene Online-Partien gegen andere Spieler (gesamt oder pro Spiel)
-- =====================================================================
create or replace function public.leaderboard(gm text default null, lim integer default 50)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (
    select x.u, x.w, x.d from public.matches m
    cross join lateral (values (m.a, coalesce((m.winner = m.a)::int, 0), (m.winner is null)::int), (m.b, coalesce((m.winner = m.b)::int, 0), (m.winner is null)::int)) as x(u, w, d)
    where m.status = 'done' and (gm is null or gm = '' or m.game = gm)
  ), t as (
    select p.username, sum(r.w)::int as wins, count(*)::int as played, sum(r.d)::int as draws, p.id = auth.uid() as me
    from r join public.profiles p on p.id = r.u
    where not p.hidden and not p.dev
    group by p.username, p.id
  ), ranked as (
    select t.*, rank() over (order by wins desc, played asc) as pos from t
  )
  select jsonb_build_object(
    'top', (select coalesce(jsonb_agg(to_jsonb(x) - 'me' order by x.pos, x.username), '[]'::jsonb)
      from (select * from ranked order by pos, username limit least(greatest(lim, 1), 100)) x),
    'me', (select to_jsonb(x) - 'me' from ranked x where x.me limit 1));
$$;

-- =====================================================================
-- Admin: Partie-Protokoll
-- =====================================================================
create or replace function public.admin_matches(st text default 'all', q text default '', lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb; o uuid := case when coalesce(trim(q), '') = '' then null else public.uid_of(q) end;
begin
  perform public.require_admin();
  if coalesce(trim(q), '') <> '' and o is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) into res from (
    select coalesce(m.finished_at, m.started_at, m.created_at) as t, jsonb_build_object(
      'id', m.id, 'game', m.game, 'status', m.status, 'result', m.result,
      'a', pa.username, 'b', pb.username, 'a_side', m.a_side, 'winner', pw.username,
      'moves', jsonb_array_length(m.moves), 'created_at', m.created_at, 'started_at', m.started_at, 'finished_at', m.finished_at,
      'a_online', m.a_seen > now() - interval '15 seconds', 'b_online', coalesce(m.b_seen > now() - interval '15 seconds', false)) as j
    from public.matches m
    left join public.profiles pa on pa.id = m.a
    left join public.profiles pb on pb.id = m.b
    left join public.profiles pw on pw.id = m.winner
    where (st = 'all' or (st = 'live' and m.status in ('invited', 'live')) or (st = 'done' and m.status in ('done', 'void')))
      and (o is null or m.a = o or m.b = o)
    order by coalesce(m.finished_at, m.started_at, m.created_at) desc
    limit least(greatest(lim, 1), 200)) x;
  return res;
end;
$$;

create or replace function public.admin_void_match(mid uuid, why text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches;
begin
  perform public.require_admin();
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  update public.matches set status = 'void', result = left('admin: ' || coalesce(nullif(trim(why), ''), 'annulliert'), 120), finished_at = coalesce(finished_at, now()) where id = mid;
  perform public.admin_note('void_match', (select username from public.profiles where id = m.a) || ' vs ' || (select username from public.profiles where id = m.b), m.game || coalesce(': ' || nullif(trim(why), ''), ''));
end;
$$;

-- Übersicht um Online-Partien ergänzen
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare games jsonb; tot integer;
begin
  perform public.require_admin();
  select coalesce(jsonb_object_agg(k, n), '{}'::jsonb), coalesce(sum(n), 0) into games, tot from (
    select e.key as k, sum(public.jint(e.value))::integer as n
    from public.user_data d
    cross join lateral jsonb_each(public.stats_sum(d.data -> 'stats') -> 'per') e
    where not public.is_dev(d.user_id)
    group by e.key) g;
  return jsonb_build_object(
    'players', (select count(*) from public.profiles where not dev),
    'new7', (select count(*) from public.profiles where created_at > now() - interval '7 days' and not dev),
    'online', (select count(*) from public.profiles where last_seen > now() - interval '2 minutes' and not dev),
    'active1', (select count(*) from public.profiles where last_seen > now() - interval '1 day' and not dev),
    'active7', (select count(*) from public.profiles where last_seen > now() - interval '7 days' and not dev),
    'matches', tot,
    'games', games,
    'live_matches', (select count(*) from public.matches where status = 'live'),
    'online_matches', (select count(*) from public.matches where status = 'done'),
    'online_matches1', (select count(*) from public.matches where status = 'done' and finished_at > now() - interval '1 day'),
    'friendships', (select count(*) from public.friendships where status = 'accepted'),
    'hidden', (select count(*) from public.profiles where hidden and not dev),
    'banned', (select count(*) from auth.users where banned_until > now()),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'role', a.role, 'since', a.created_at)
        order by a.role = 'owner' desc, p.username), '[]'::jsonb)
      from public.admins a join public.profiles p on p.id = a.user_id),
    'recent', (select coalesce(jsonb_agg(r.j order by r.t desc), '[]'::jsonb) from (
        select p.created_at as t, jsonb_build_object('username', p.username, 'joined', p.created_at) as j
        from public.profiles p where not p.dev order by p.created_at desc limit 8) r)
  );
end;
$$;

-- ---------- Rechte ----------
do $$
declare f text;
begin
  foreach f in array array[
    'friend_request(text)', 'friend_respond(text, boolean)', 'friend_remove(text)', 'friends()', 'player_search(text)',
    'match_invite(text, text, jsonb)', 'match_cancel(uuid)', 'match_respond(uuid, boolean)', 'match_state(uuid, integer)',
    'match_move(uuid, integer, jsonb)', 'match_finish(uuid, integer, integer)', 'match_resign(uuid)', 'match_report(uuid, text)',
    'my_pending()', 'leaderboard(text, integer)', 'admin_matches(text, text, integer)', 'admin_void_match(uuid, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
-- Ranglisten sieht man auch ohne Konto
grant execute on function public.leaderboard(text, integer) to anon;
