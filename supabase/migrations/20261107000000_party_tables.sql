-- Versus: Spieltische für 2 bis 4 Spieler (Ludo, Leiterspiel). Getrennt von den Duellen in public.matches.
-- Ablauf: Einer eröffnet einen Tisch (Platz 1, Gastgeber), lädt Freunde ein, teilt den Tischcode oder stellt ihn
-- für alle sichtbar. Wer beitritt, bekommt den nächsten freien Platz. Der Gastgeber startet; leere Plätze spielt
-- die KI, gerechnet im Browser des Gastgebers. Würfel: alle Browser rechnen sie aus demselben Startwert (seed),
-- deshalb sehen alle dieselben Augen. Wer 45 Sekunden weg ist, wird von der KI ersetzt, das Spiel läuft weiter.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

create table if not exists public.party_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game text not null check (game in ('ludo', 'ladder')),
  opts jsonb not null default '{}'::jsonb,
  n smallint not null check (n between 2 and 4),
  lvl smallint not null default 1 check (lvl between 0 and 3),
  host smallint not null default 1,
  seats uuid[] not null default array[null, null, null, null]::uuid[],
  seen timestamptz[] not null default array[null, null, null, null]::timestamptz[],
  bots smallint[] not null default '{}'::smallint[],
  open boolean not null default false,
  invited uuid[] not null default '{}'::uuid[],
  status text not null default 'lobby' check (status in ('lobby', 'live', 'done', 'canceled', 'void')),
  seed integer not null default floor(random() * 2147483647)::integer,
  moves jsonb not null default '[]'::jsonb,
  winner smallint,
  result text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists party_tables_status_idx on public.party_tables (status);
alter table public.party_tables enable row level security;   -- nur über die Funktionen unten

-- Platz eines Spielers (0 = sitzt nicht am Tisch)
create or replace function public.party_seat(t public.party_tables, u uuid)
returns integer language sql stable set search_path = '' as $$
  select coalesce((select i from generate_series(1, 4) i where t.seats[i] = u limit 1), 0);
$$;
revoke all on function public.party_seat(public.party_tables, uuid) from public, anon, authenticated;

-- Menschen, die noch selbst spielen (nicht von der KI ersetzt)
create or replace function public.party_humans(t public.party_tables)
returns integer[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(i order by i), '{}'::integer[]) from generate_series(1, t.n) i
    where t.seats[i] is not null and not (i::smallint = any(t.bots));
$$;
revoke all on function public.party_humans(public.party_tables) from public, anon, authenticated;

-- Aufräumen: verwaiste Tische schließen, abwesende Spieler durch die KI ersetzen, neuen Gastgeber bestimmen
create or replace function public.party_sweep()
returns void language plpgsql security definer set search_path = '' as $$
declare t public.party_tables; i integer; h integer[];
begin
  update public.party_tables set status = 'canceled', finished_at = now()
    where status = 'lobby' and (seen[host] < now() - interval '30 seconds' or created_at < now() - interval '30 minutes');
  update public.party_tables set status = 'void', result = 'stale', finished_at = now()
    where status = 'live' and started_at < now() - interval '4 hours';
  for i in 1..4 loop
    -- Lobby: wer sich nicht mehr meldet, gibt seinen Platz frei (der Gastgeber schließt den Tisch, siehe oben)
    update public.party_tables set seats[i] = null, seen[i] = null
      where status = 'lobby' and i <> host and seats[i] is not null and seen[i] < now() - interval '30 seconds';
    -- im Spiel: die KI übernimmt
    update public.party_tables set bots = bots || i::smallint
      where status = 'live' and i <= n and seats[i] is not null and not (i::smallint = any(bots)) and seen[i] < now() - interval '45 seconds';
  end loop;
  for t in select p.* from public.party_tables p where p.status = 'live' and not (p.host = any(public.party_humans(p))) for update loop
    h := public.party_humans(t);
    if cardinality(h) = 0 then
      update public.party_tables set status = 'void', result = 'abandon', finished_at = now() where id = t.id;
    else
      update public.party_tables set host = h[1] where id = t.id;
    end if;
  end loop;
end;
$$;
revoke all on function public.party_sweep() from public, anon, authenticated;

create or replace function public.party_view(t public.party_tables, since integer, viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'code', t.code, 'game', t.game, 'opts', t.opts, 'n', t.n, 'lvl', t.lvl, 'host', t.host,
    'status', t.status, 'open', t.open, 'seed', t.seed, 'seat', public.party_seat(t, viewer),
    'names', (select jsonb_agg((select username from public.profiles where id = t.seats[i]) order by i) from generate_series(1, 4) i),
    'online', (select jsonb_agg(coalesce(t.seen[i] > now() - interval '15 seconds', false) order by i) from generate_series(1, 4) i),
    'bots', to_jsonb(t.bots),
    'winner', t.winner, 'result', t.result,
    'total', jsonb_array_length(t.moves),
    'moves', (select coalesce(jsonb_agg(e order by k), '[]'::jsonb) from jsonb_array_elements(t.moves) with ordinality x(e, k) where k > greatest(coalesce(since, 0), 0)));
$$;
revoke all on function public.party_view(public.party_tables, integer, uuid) from public, anon, authenticated;

-- Wer schon an einem offenen Tisch sitzt, verlässt ihn (Lobby) bzw. darf keinen zweiten anfangen (laufend)
create or replace function public.party_free_me(u uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.party_tables; s integer;
begin
  for t in select * from public.party_tables where status in ('lobby', 'live') and u = any(seats) for update loop
    s := public.party_seat(t, u);
    if t.status = 'live' and not (s::smallint = any(t.bots)) then raise exception 'Du spielst gerade an einem anderen Tisch.'; end if;
    if t.status = 'lobby' then
      if s = t.host then update public.party_tables set status = 'canceled', finished_at = now() where id = t.id;
      else update public.party_tables set seats[s] = null, seen[s] = null where id = t.id;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.party_free_me(uuid) from public, anon, authenticated;

create or replace function public.party_create(gm text, op jsonb default '{}'::jsonb, n integer default 4, lvl integer default 1, pub boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer; t public.party_tables;
begin
  perform public.party_sweep();
  if gm not in ('ludo', 'ladder') then raise exception 'Dieses Spiel gibt es an Tischen noch nicht.'; end if;
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

-- Beitreten über die Einladung, als Freund des Gastgebers, bei offenen Tischen oder mit dem Tischcode
create or replace function public.party_join(tid uuid default null, cd text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; s integer; i integer;
begin
  perform public.party_sweep();
  if tid is not null then select * into t from public.party_tables where id = tid for update;
  else select * into t from public.party_tables where code = upper(regexp_replace(coalesce(cd, ''), '[^A-Za-z0-9]', '', 'g')) for update;
  end if;
  if t.id is null then raise exception 'Diesen Tisch gibt es nicht.'; end if;
  s := public.party_seat(t, u);
  if s > 0 then
    update public.party_tables set seen[s] = now() where id = t.id returning * into t;
    return public.party_view(t, 0, u);
  end if;
  if t.status <> 'lobby' then raise exception 'Das Spiel an diesem Tisch läuft schon oder ist vorbei.'; end if;
  if tid is not null and not (t.open or u = any(t.invited) or public.are_friends(u, t.seats[t.host])) then
    raise exception 'Für diesen Tisch brauchst du eine Einladung oder den Tischcode.';
  end if;
  s := 0;
  for i in 1..t.n loop if t.seats[i] is null then s := i; exit; end if; end loop;
  if s = 0 then raise exception 'Der Tisch ist schon voll.'; end if;
  perform public.party_free_me(u);
  update public.party_tables set seats[s] = u, seen[s] = now(), invited = array_remove(invited, u)
    where id = t.id returning * into t;
  return public.party_view(t, 0, u);
end;
$$;
revoke all on function public.party_join(uuid, text) from public, anon;
grant execute on function public.party_join(uuid, text) to authenticated;

create or replace function public.party_invite(tid uuid, name text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); t public.party_tables;
begin
  select * into t from public.party_tables where id = tid for update;
  if t.id is null or t.status <> 'lobby' or t.seats[t.host] <> u then raise exception 'Nur der Gastgeber kann einladen.'; end if;
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if not public.are_friends(u, o) then raise exception 'Du kannst nur Freunde einladen.'; end if;
  if o = any(t.seats) then return; end if;
  update public.party_tables set invited = array_append(array_remove(invited, o), o) where id = tid;
end;
$$;
revoke all on function public.party_invite(uuid, text) from public, anon;
grant execute on function public.party_invite(uuid, text) to authenticated;

create or replace function public.party_decline(tid uuid)
returns void language sql security definer set search_path = '' as $$
  update public.party_tables set invited = array_remove(invited, public.me()) where id = tid;
$$;
revoke all on function public.party_decline(uuid) from public, anon;
grant execute on function public.party_decline(uuid) to authenticated;

-- Gastgeber: Tisch für alle sichtbar machen oder nicht
create or replace function public.party_open(tid uuid, pub boolean)
returns void language sql security definer set search_path = '' as $$
  update public.party_tables set open = coalesce(pub, false)
    where id = tid and status = 'lobby' and seats[host] = public.me();
$$;
revoke all on function public.party_open(uuid, boolean) from public, anon;
grant execute on function public.party_open(uuid, boolean) to authenticated;

-- Tisch verlassen: in der Lobby wird der Platz frei (Gastgeber: Tisch schließt), im Spiel übernimmt die KI
create or replace function public.party_leave(tid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; s integer; h integer[];
begin
  select * into t from public.party_tables where id = tid for update;
  s := case when t.id is null then 0 else public.party_seat(t, u) end;
  if s = 0 then return; end if;
  if t.status = 'lobby' then
    if s = t.host then update public.party_tables set status = 'canceled', finished_at = now() where id = tid;
    else update public.party_tables set seats[s] = null, seen[s] = null where id = tid;
    end if;
  elsif t.status = 'live' and not (s::smallint = any(t.bots)) then
    t.bots := t.bots || s::smallint;
    h := public.party_humans(t);
    if cardinality(h) = 0 then
      update public.party_tables set bots = t.bots, status = 'void', result = 'abandon', finished_at = now() where id = tid;
    else
      update public.party_tables set bots = t.bots, host = case when host = s then h[1] else host end where id = tid;
    end if;
  end if;
end;
$$;
revoke all on function public.party_leave(uuid) from public, anon;
grant execute on function public.party_leave(uuid) to authenticated;

create or replace function public.party_start(tid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; b smallint[] := '{}'::smallint[]; i integer;
begin
  perform public.party_sweep();
  select * into t from public.party_tables where id = tid for update;
  if t.id is null or t.status <> 'lobby' or t.seats[t.host] <> u then raise exception 'Nur der Gastgeber kann starten.'; end if;
  if cardinality(public.party_humans(t)) < 2 then raise exception 'Es fehlt noch ein Mitspieler.'; end if;
  for i in 1..t.n loop if t.seats[i] is null then b := b || i::smallint; end if; end loop;
  update public.party_tables set status = 'live', started_at = now(), bots = b, invited = '{}'::uuid[]
    where id = tid returning * into t;
  return public.party_view(t, 0, u);
end;
$$;
revoke all on function public.party_start(uuid) from public, anon;
grant execute on function public.party_start(uuid) to authenticated;

create or replace function public.party_state(tid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; s integer;
begin
  select * into t from public.party_tables where id = tid;
  if t.id is null then raise exception 'Diesen Tisch gibt es nicht.'; end if;
  s := public.party_seat(t, u);
  if s = 0 and public.role_of(u) is null then raise exception 'Du sitzt nicht an diesem Tisch.'; end if;
  if s > 0 and t.status in ('lobby', 'live') and not (s::smallint = any(t.bots)) then
    update public.party_tables set seen[s] = now() where id = tid;
  end if;
  perform public.party_sweep();
  select * into t from public.party_tables where id = tid;
  return public.party_view(t, since, u);
end;
$$;
revoke all on function public.party_state(uuid, integer) from public, anon;
grant execute on function public.party_state(uuid, integer) to authenticated;

-- Zug anhängen: eigener Platz, oder ein KI-Platz, wenn man Gastgeber ist. ply = Zahl der bekannten Züge.
create or replace function public.party_move(tid uuid, ply integer, s integer, mv jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables; me integer; n integer;
begin
  select * into t from public.party_tables where id = tid for update;
  if t.id is null then raise exception 'Diesen Tisch gibt es nicht.'; end if;
  me := public.party_seat(t, u);
  if me = 0 then raise exception 'Du sitzt nicht an diesem Tisch.'; end if;
  if t.status <> 'live' then raise exception 'Das Spiel ist schon vorbei.'; end if;
  if mv is null or octet_length(mv::text) > 300 then raise exception 'Ungültiger Zug.'; end if;
  if s not between 1 and t.n then raise exception 'Ungültiger Platz.'; end if;
  if s::smallint = any(t.bots) then
    if me <> t.host then raise exception 'desync'; end if;
  elsif s <> me or me::smallint = any(t.bots) then raise exception 'desync';
  end if;
  n := jsonb_array_length(t.moves);
  if ply <> n then raise exception 'desync'; end if;
  if n >= 3000 then raise exception 'Zu viele Züge.'; end if;
  update public.party_tables set moves = moves || jsonb_build_array(jsonb_build_object('s', s, 'm', mv)), seen[me] = now()
    where id = tid;
  return n + 1;
end;
$$;
revoke all on function public.party_move(uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.party_move(uuid, integer, integer, jsonb) to authenticated;

-- Ergebnis: alle Browser rechnen es aus denselben Zügen; die erste Meldung zum aktuellen Stand zählt
create or replace function public.party_finish(tid uuid, ply integer, w integer)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); t public.party_tables;
begin
  select * into t from public.party_tables where id = tid for update;
  if t.id is null or public.party_seat(t, u) = 0 or t.status <> 'live' then return; end if;
  if ply <> jsonb_array_length(t.moves) or w not between 0 and t.n then raise exception 'desync'; end if;
  update public.party_tables set status = 'done', winner = nullif(w, 0), result = case when w = 0 then 'draw' else 'win' end, finished_at = now()
    where id = tid;
end;
$$;
revoke all on function public.party_finish(uuid, integer, integer) from public, anon;
grant execute on function public.party_finish(uuid, integer, integer) to authenticated;

-- Für das Menü: Einladungen an mich, offene Tische, mein eigener Tisch
create or replace function public.party_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.party_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'game', t.game, 'n', t.n,
        'from', (select username from public.profiles where id = t.seats[t.host]),
        'players', (select count(*) from generate_series(1, t.n) i where t.seats[i] is not null)) order by t.created_at desc), '[]'::jsonb)
      from public.party_tables t where t.status = 'lobby' and u = any(t.invited) and not (u = any(t.seats))),
    'open', (select coalesce(jsonb_agg(x.j), '[]'::jsonb) from (
        select jsonb_build_object('id', t.id, 'game', t.game, 'n', t.n,
          'from', (select username from public.profiles where id = t.seats[t.host]),
          'players', (select count(*) from generate_series(1, t.n) i where t.seats[i] is not null)) as j
        from public.party_tables t
        where t.status = 'lobby' and t.open and not (u = any(t.seats))
          and (select count(*) from generate_series(1, t.n) i where t.seats[i] is not null) < t.n
        order by t.created_at desc limit 8) x),
    'mine', (select jsonb_build_object('id', t.id, 'game', t.game, 'status', t.status)
      from public.party_tables t
      where t.status in ('lobby', 'live') and u = any(t.seats) and not (public.party_seat(t, u)::smallint = any(t.bots))
      order by t.created_at desc limit 1));
end;
$$;
revoke all on function public.party_pending() from public, anon;
grant execute on function public.party_pending() to authenticated;
