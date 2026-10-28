-- Versus: Spielerprofile, Partieverlauf, Reaktionen im Spiel, schnelle Revanche und Schachuhr.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.matches add column if not exists rematch_of uuid references public.matches (id) on delete set null;
create index if not exists matches_rematch_idx on public.matches (rematch_of);

-- ---------- Reaktionen (Emotes) während und kurz nach einer Partie ----------
create table if not exists public.match_reactions (
  id bigserial primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  uid uuid not null references auth.users (id) on delete cascade,
  e text not null,
  at timestamptz not null default now()
);
create index if not exists match_reactions_idx on public.match_reactions (match_id, id);
alter table public.match_reactions enable row level security;   -- nur über die Funktionen unten

create or replace function public.match_react(mid uuid, e text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; rid bigint;
begin
  select * into m from public.matches where id = mid;
  if m.id is null or (u <> m.a and u is distinct from m.b) then raise exception 'Partie nicht gefunden.'; end if;
  if e not in ('gg', 'wow', 'haha', 'oops', 'think', 'fire', 'clap', 'sweat') then raise exception 'Unbekannte Reaktion.'; end if;
  if not (m.status = 'live' or (m.status in ('done', 'void') and m.finished_at > now() - interval '3 minutes')) then return null; end if;
  -- nicht spammen: höchstens eine pro Sekunde und 80 pro Partie
  if exists (select 1 from public.match_reactions r where r.match_id = mid and r.uid = u and r.at > now() - interval '1 second') then return null; end if;
  if (select count(*) from public.match_reactions r where r.match_id = mid and r.uid = u) >= 80 then return null; end if;
  insert into public.match_reactions (match_id, uid, e) values (mid, u, e) returning id into rid;
  return rid;
end;
$$;
revoke all on function public.match_react(uuid, text) from public, anon;
grant execute on function public.match_react(uuid, text) to authenticated;

-- ---------- Schachuhr ----------
-- opts.clock = Minuten pro Spieler (3, 5 oder 10), dazu 2 Sekunden pro Zug. Gilt nur für Schach, dort wird
-- streng abwechselnd gezogen. Jeder Zug bekommt eine Server-Zeit; daraus rechnen Server und beide Spieler gleich.
create or replace function public.match_clock(m public.matches)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare base numeric; inc numeric := 2000; l1 numeric; l2 numeric; prev timestamptz; e jsonb; t timestamptz; s integer; turn integer := 1;
begin
  if m.game <> 'chess' or coalesce(m.opts ->> 'clock', '') !~ '^(3|5|10)$' or m.started_at is null then return null; end if;
  base := (m.opts ->> 'clock')::numeric * 60000; l1 := base; l2 := base; prev := m.started_at;
  for e in select x from jsonb_array_elements(m.moves) x loop
    s := (e ->> 's')::integer;
    t := case when e ? 't' then to_timestamp((e ->> 't')::numeric / 1000) else prev end;
    if s = 1 then l1 := l1 - extract(epoch from (t - prev)) * 1000 + inc; else l2 := l2 - extract(epoch from (t - prev)) * 1000 + inc; end if;
    prev := t; turn := 3 - s;
  end loop;
  if m.status = 'live' then
    if turn = 1 then l1 := l1 - extract(epoch from (now() - prev)) * 1000; else l2 := l2 - extract(epoch from (now() - prev)) * 1000; end if;
  end if;
  return jsonb_build_object('1', round(l1), '2', round(l2), 'turn', turn, 'live', m.status = 'live');
end;
$$;
revoke all on function public.match_clock(public.matches) from public, anon, authenticated;

-- Züge bekommen eine Server-Zeit; mit Schachuhr ist nach Ablauf der Zeit kein Zug mehr möglich
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

-- Zeit abgelaufen? Jeder der beiden darf das melden, der Server prüft selbst nach.
create or replace function public.match_flag(mid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; c jsonb; t integer;
begin
  select * into m from public.matches where id = mid for update;
  if m.id is null or (u <> m.a and u is distinct from m.b) or m.status <> 'live' then return; end if;
  c := public.match_clock(m);
  if c is null then return; end if;
  t := (c ->> 'turn')::integer;
  if (c ->> t::text)::numeric <= 0 then perform public.match_close(mid, 3 - t, 'time'); end if;
end;
$$;
revoke all on function public.match_flag(uuid) from public, anon;
grant execute on function public.match_flag(uuid) to authenticated;

-- ---------- Revanche ----------
-- Beide drücken „Revanche“: wer zuerst drückt, lädt ein, der andere nimmt damit an. Die Farben werden getauscht.
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
    if exists (select 1 from public.matches where status = 'live' and (a = u or b = u)) then raise exception 'Beende erst deine laufende Partie.'; end if;
    update public.matches set status = 'live', started_at = now(), b_seen = now() where id = r.id returning * into r;
    update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited';
    update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and id <> r.id;
    return public.match_view(r, 0, u);
  end if;
  -- ich habe schon gefragt
  select * into r from public.matches where rematch_of = mid and a = u and status = 'invited' order by created_at desc limit 1;
  if r.id is not null then return public.match_view(r, 0, u); end if;
  if exists (select 1 from public.matches where status in ('invited', 'live') and (a = u or b = u)) then
    raise exception 'Du bist schon in einer Partie oder wartest auf eine Antwort.';
  end if;
  if exists (select 1 from public.matches where status = 'live' and (a = o or b = o)) then
    raise exception 'Dein Gegner spielt schon eine andere Partie.';
  end if;
  my_side := case when u = m.a then m.a_side else 3 - m.a_side end;
  insert into public.matches (game, opts, a, b, a_side, rematch_of)
    values (m.game, m.opts, u, o, case when my_side in (1, 2) then 3 - my_side else (case when random() < 0.5 then 1 else 2 end) end, mid)
    returning * into r;
  return public.match_view(r, 0, u);
end;
$$;
revoke all on function public.match_rematch(uuid) from public, anon;
grant execute on function public.match_rematch(uuid) to authenticated;

-- Annehmen einer Einladung: eine Revanche behält ihre getauschten Farben
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
    a_side = coalesce(a_side, case when random() < 0.5 then 1 else 2 end)
    where id = mid and b = u and status = 'invited'
    returning * into m;
  if m.id is null then raise exception 'Diese Einladung gilt nicht mehr.'; end if;
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;

-- Spielstand: dazu Ranglisten-Info, Reaktionen der letzten Sekunden, Schachuhr und Revanche-Stand
create or replace function public.match_state(mid uuid, since integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches; rm jsonb;
begin
  perform public.match_sweep();
  select * into m from public.matches where id = mid;
  if m.id is null then raise exception 'Partie nicht gefunden.'; end if;
  if u = m.a and m.status in ('invited', 'live') then update public.matches set a_seen = now() where id = mid;
  elsif u = m.b and m.status = 'live' then update public.matches set b_seen = now() where id = mid;
  elsif u <> m.a and u is distinct from m.b and public.role_of(u) is null then raise exception 'Partie nicht gefunden.';
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
    'reacts', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'side', case when r.uid = m.a then m.a_side else 3 - m.a_side end, 'e', r.e) order by r.id), '[]'::jsonb)
      from public.match_reactions r where r.match_id = mid and r.at > now() - interval '12 seconds'));
end;
$$;

-- ---------- Spielerprofil mit Verlauf ----------
create or replace function public.player_profile(name text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me(); p public.profiles; mine boolean; streak integer := 0; r record;
begin
  select * into p from public.profiles where username = lower(trim(name));
  if p.id is null or ((p.hidden or p.dev) and p.id <> u and public.role_of(u) is null) then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  mine := p.id = u;
  -- aktuelle Siegesserie (gewertete Partien, neueste zuerst)
  for r in select m.winner from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m) order by m.finished_at desc limit 100 loop
    exit when r.winner is distinct from p.id;
    streak := streak + 1;
  end loop;
  return jsonb_build_object(
    'username', p.username, 'me', mine, 'since', p.created_at, 'dev', p.dev,
    'online', not p.stealth and p.last_seen > now() - interval '2 minutes',
    'seen', case when p.stealth and not mine then null else p.last_seen end,
    'friend', (select case when f.status = 'accepted' then 'friend' when f.requester = u then 'outgoing' else 'incoming' end
      from public.friendships f where (f.requester = u and f.addressee = p.id) or (f.requester = p.id and f.addressee = u) limit 1),
    'streak', streak,
    'total', (select jsonb_build_object('played', count(*), 'wins', count(*) filter (where m.winner = p.id),
        'draws', count(*) filter (where m.winner is null), 'losses', count(*) filter (where m.winner is not null and m.winner <> p.id))
      from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m)),
    'games', (select coalesce(jsonb_agg(x order by x.played desc, x.game), '[]'::jsonb) from (
        select m.game, count(*)::int as played, count(*) filter (where m.winner = p.id)::int as wins,
          count(*) filter (where m.winner is not null and m.winner <> p.id)::int as losses
        from public.matches m where m.status = 'done' and (m.a = p.id or m.b = p.id) and public.match_ranked(m)
        group by m.game) x),
    'week', (select jsonb_build_object('pos', b.pos, 'wins', b.wins, 'played', b.played) from public.board_rows(null, public.week_start(), null) b where b.uid = p.id),
    'vs', case when mine then null else (select jsonb_build_object('played', count(*), 'wins', count(*) filter (where m.winner = u),
        'losses', count(*) filter (where m.winner = p.id), 'draws', count(*) filter (where m.winner is null))
      from public.matches m where m.status = 'done' and ((m.a = u and m.b = p.id) or (m.a = p.id and m.b = u))) end,
    'recent', (select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb) from (
        select m.id, m.game, m.finished_at as at, m.status, m.result, public.match_ranked(m) as ranked,
          (select username from public.profiles where id = case when m.a = p.id then m.b else m.a end) as opp,
          case when m.status = 'void' then 'void' when m.winner is null then 'draw' when m.winner = p.id then 'win' else 'loss' end as res
        from public.matches m where m.status in ('done', 'void') and (m.a = p.id or m.b = p.id) and m.started_at is not null
        order by m.finished_at desc limit 15) x));
end;
$$;
revoke all on function public.player_profile(text) from public, anon;
grant execute on function public.player_profile(text) to authenticated;
