-- Versus: wer offline geht, verliert nicht mehr; Freunde können laufenden Partien zuschauen und Reaktionen schicken.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen früheren Migrationen auf.

-- ---------- Offline: Partie endet ohne Sieger ----------
-- Ist ein Spieler 75 Sekunden weg (kein Abruf mehr), wird die Partie abgebrochen: status 'void', result 'offline'.
-- Sie zählt für niemanden. Wer bewusst geht, gibt weiterhin auf (match_resign) und verliert.
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
  -- wer 75 Sekunden weg ist: Partie abgebrochen, niemand gewinnt
  update public.matches set status = 'void', finished_at = now(), winner = null, result = 'offline'
    where status = 'live' and least(a_seen, coalesce(b_seen, a_seen)) < now() - interval '75 seconds';
end;
$$;
revoke all on function public.match_sweep() from public, anon, authenticated;

-- ---------- Zuschauer ----------
create table if not exists public.match_watchers (
  match_id uuid not null references public.matches (id) on delete cascade,
  uid uuid not null references auth.users (id) on delete cascade,
  seen timestamptz not null default now(),
  primary key (match_id, uid)
);
alter table public.match_watchers enable row level security;   -- nur über die Funktionen unten

-- Darf u dieser Partie zuschauen? Admins immer; sonst Freunde eines Spielers, der seinen Online-Status nicht verbirgt.
-- Schiffe versenken nicht, weil Zuschauer die Flotten sehen und verraten könnten.
create or replace function public.can_watch(m public.matches, u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select u is not null and u <> m.a and u is distinct from m.b and (
    public.role_of(u) is not null
    or (m.game <> 'ships' and exists (
      select 1 from public.friendships f join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)
        and p.id in (m.a, m.b) and not p.stealth and not public.blocked_between(u, case when p.id = m.a then m.b else m.a end))));
$$;
revoke all on function public.can_watch(public.matches, uuid) from public, anon, authenticated;

-- Stand einer Partie: dazu Sekunden seit dem letzten Abruf beider Spieler (für den Offline-Countdown)
-- und wie viele Freunde gerade zuschauen
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
    'started_at', m.started_at, 'finished_at', m.finished_at);
$$;
revoke all on function public.match_view(public.matches, integer, uuid) from public, anon, authenticated;

-- Abruf durch Spieler, Admins und zuschauende Freunde. Freunde werden als Zuschauer gezählt (Admins nicht).
-- Reaktionen: side 0 = Zuschauer, dazu sein Name.
create or replace function public.match_state(mid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; rm jsonb;
begin
  perform public.match_sweep();
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if u = m.a and m.status in ('invited', 'live') then update public.matches set a_seen = now() where id = mid;
  elsif u = m.b and m.status = 'live' then update public.matches set b_seen = now() where id = mid;
  elsif u <> m.a and u is distinct from m.b then
    if not public.can_watch(m, u) then raise exception 'Partie nicht gefunden.'; end if;
    if m.status = 'live' and public.role_of(u) is null then
      insert into public.match_watchers (match_id, uid, seen) values (mid, u, now())
        on conflict (match_id, uid) do update set seen = now();
    end if;
  end if;
  -- wer nach der Partie auf eine Revanche wartet, hält seine Einladung am Leben
  update public.matches set a_seen = now() where rematch_of = mid and a = u and status = 'invited';
  select jsonb_build_object('id', r.id, 'from', p.username, 'status', r.status) into rm
    from public.matches r join public.profiles p on p.id = r.a
    where r.rematch_of = mid order by r.created_at desc limit 1;
  return public.match_view(m, since, u) || jsonb_build_object(
    'ranked', public.match_ranked(m),
    'clock', public.match_clock(m),
    'rematch', rm,
    'reacts', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id,
        'side', case when r.uid = m.a then m.a_side when r.uid = m.b then 3 - m.a_side else 0 end,
        'name', case when r.uid in (m.a, m.b) then null else (select username from public.profiles where id = r.uid) end,
        'e', r.e) order by r.id), '[]'::jsonb)
      from public.match_reactions r where r.match_id = mid and r.at > now() - interval '12 seconds'));
end;
$$;
revoke all on function public.match_state(uuid, integer) from public, anon;
grant execute on function public.match_state(uuid, integer) to authenticated;

-- Reaktionen: Spieler wie bisher, zuschauende Freunde während der Partie (höchstens eine alle 2 Sekunden, 30 pro Partie)
create or replace function public.match_react(mid uuid, e text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; rid bigint; player boolean;
begin
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  player := u = m.a or u = m.b;
  if not player and not public.can_watch(m, u) then raise exception 'Partie nicht gefunden.'; end if;
  if e not in ('gg', 'wow', 'haha', 'oops', 'think', 'fire', 'clap', 'sweat') then raise exception 'Unbekannte Reaktion.'; end if;
  if player and not (m.status = 'live' or (m.status in ('done', 'void') and m.finished_at > now() - interval '3 minutes')) then return null; end if;
  if not player and not (m.status = 'live' or (m.status in ('done', 'void') and m.finished_at > now() - interval '1 minute')) then return null; end if;
  if exists (select 1 from public.match_reactions r where r.match_id = mid and r.uid = u
      and r.at > now() - case when player then interval '1 second' else interval '2 seconds' end) then return null; end if;
  if (select count(*) from public.match_reactions r where r.match_id = mid and r.uid = u) >= case when player then 80 else 30 end then return null; end if;
  insert into public.match_reactions (match_id, uid, e) values (mid, u, e) returning id into rid;
  return rid;
end;
$$;
revoke all on function public.match_react(uuid, text) from public, anon;
grant execute on function public.match_react(uuid, text) to authenticated;

-- Freundesliste: bei einer laufenden Partie auch welche, gegen wen und ob man zuschauen kann
create or replace function public.friends()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  return jsonb_build_object(
    'friends', (select coalesce(jsonb_agg(x.j order by x.o desc, x.n), '[]'::jsonb) from (
      select p.username as n, (not p.stealth and p.last_seen > now() - interval '2 minutes') as o,
        jsonb_build_object(
          'username', p.username,
          'online', not p.stealth and p.last_seen > now() - interval '2 minutes',
          'seen', case when p.stealth then null else p.last_seen end,
          'game', case when p.stealth then null else p.current_game end,
          'busy', not p.stealth and lm.id is not null,
          'match', case when p.stealth then null else lm.id end,
          'match_game', case when p.stealth then null else lm.game end,
          'match_opp', case when p.stealth or lm.id is null then null
            else (select username from public.profiles where id = case when lm.a = p.id then lm.b else lm.a end) end,
          'watchable', not p.stealth and lm.id is not null and lm.game <> 'ships' and lm.a_side is not null) as j
      from public.friendships f
      join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      left join lateral (select m.* from public.matches m where m.status = 'live' and (m.a = p.id or m.b = p.id) limit 1) lm on true
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)) x),
    'incoming', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.requester where f.addressee = u and f.status = 'pending'),
    'outgoing', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.addressee where f.requester = u and f.status = 'pending'));
end;
$$;
revoke all on function public.friends() from public, anon;
grant execute on function public.friends() to authenticated;
