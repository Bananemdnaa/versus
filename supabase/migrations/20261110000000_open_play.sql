-- Versus: spielen mit Fremden. Schnelles Spiel (automatische Gegnersuche), Gast-Zugang ohne Konto,
-- Blockieren und Melden, Wiederherstellungscode statt Passwort-Mail, strengerer Namensfilter, Ping für den Keep-alive.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen früheren Migrationen auf.
--
-- Im Supabase-Dashboard zusätzlich:
--   Authentication → Sign In / Providers → "Allow anonymous sign-ins" an (für den Gast-Zugang)
--   optional Authentication → Attack Protection → Captcha (Cloudflare Turnstile), siehe README

-- ---------- Namensfilter ----------
-- mehr Wörter, dazu Namen, die nach Team aussehen (admin…, support…)
create or replace function public.bad_name(n text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  s text; w text; raw text;
  words text[] := array[
    'nigger', 'nigga', 'neger', 'kanake', 'kanacke', 'zigeuner', 'schwuchtel', 'faggot', 'fagot', 'tranny', 'chink', 'wetback',
    'dyke', 'retard', 'spast', 'missgeburt', 'behindert',
    'judensau', 'hitler', 'siegheil', 'heilhitler', 'nazi', 'holocaust', 'auschwitz', 'kukluxklan',
    'hurensohn', 'hure', 'whore', 'nutte', 'fotze', 'cunt', 'wichser', 'wixer', 'arschloch', 'schlampe', 'bitch', 'slut',
    'fuck', 'fick', 'motherf', 'porno', 'porn', 'penis', 'vagina', 'pussy', 'titten', 'boobs', 'vergewalt', 'rapist',
    'paedo', 'pedophil', 'killyourself', 'suicide'];
begin
  raw := lower(coalesce(n, ''));
  if raw ~ '^(admin|moderator|support|owner|official|versus|system)' then return true; end if;
  s := replace(raw, 'ß', 'ss');
  s := translate(s, 'äöü0134578@$!|', 'aouoieastbasii');
  s := regexp_replace(s, '[^a-z]', '', 'g');
  foreach w in array words loop
    if s ~ regexp_replace(translate(w, 'äöü', 'aou'), '(.)', '\1+', 'g') then return true; end if;
  end loop;
  return false;
end;
$$;
grant execute on function public.bad_name(text) to anon, authenticated;

-- ---------- Gäste ----------
-- Ein Gast ist ein anonymes Supabase-Konto mit einem Namen wie gast_48213. Gäste sind aus Ranglisten und Suche
-- ausgeblendet, ihre Partien zählen nicht, und sie können ihr Konto später mit Name und Passwort behalten.
alter table public.profiles add column if not exists guest boolean not null default false;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare nm text; i integer := 0;
begin
  if coalesce(new.is_anonymous, false) then
    loop
      nm := 'gast_' || lpad(floor(random() * 100000)::integer::text, 5, '0');
      exit when not exists (select 1 from public.profiles where username = nm);
      i := i + 1;
      if i > 30 then nm := 'gast_' || substr(replace(new.id::text, '-', ''), 1, 8); exit; end if;
    end loop;
    insert into public.profiles (id, username, last_seen, guest, hidden) values (new.id, nm, now(), true, true);
  else
    insert into public.profiles (id, username, last_seen)
    values (new.id, lower(new.raw_user_meta_data ->> 'username'), now());
  end if;
  return new;
end;
$$;

create or replace function public.is_guest(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select guest from public.profiles where id = u), false);
$$;
revoke all on function public.is_guest(uuid) from public, anon, authenticated;

-- Partien mit Dev-Konten oder Gästen zählen nicht für die Rangliste
create or replace function public.match_ranked(m public.matches)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.is_dev(m.a) and not public.is_dev(m.b) and not public.is_guest(m.a) and not public.is_guest(m.b);
$$;
revoke all on function public.match_ranked(public.matches) from public, anon, authenticated;

-- Gast behält sein Konto: eigener Name und Passwort, danach ein normales Konto
create or replace function public.guest_claim(new_name text, pw text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); nn text;
begin
  if not public.is_guest(u) then raise exception 'Du hast schon ein Konto.'; end if;
  if char_length(coalesce(pw, '')) < 6 then raise exception 'Das Passwort ist zu kurz (mindestens 6 Zeichen).'; end if;
  if char_length(pw) > 72 then raise exception 'Das Passwort ist zu lang.'; end if;
  nn := public.rename_user_internal(u, new_name);
  update public.profiles set guest = false, hidden = false, name_changed_at = null where id = u;
  update auth.users set encrypted_password = extensions.crypt(pw, extensions.gen_salt('bf')),
    is_anonymous = false, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
    where id = u;
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u::text, u, jsonb_build_object('sub', u::text, 'email', nn || '@bananemdnaa.github.io', 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
  return nn;
end;
$$;
revoke all on function public.guest_claim(text, text) from public, anon;
grant execute on function public.guest_claim(text, text) to authenticated;

-- alte Gäste aufräumen (30 Tage nicht gesehen)
create or replace function public.guest_sweep()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id in (
    select p.id from public.profiles p where p.guest and coalesce(p.last_seen, p.created_at) < now() - interval '30 days' limit 50);
$$;
revoke all on function public.guest_sweep() from public, anon, authenticated;

-- ---------- Blockieren ----------
create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table public.blocks enable row level security;   -- nur über die Funktionen unten

create or replace function public.blocked_between(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x));
$$;
revoke all on function public.blocked_between(uuid, uuid) from public, anon, authenticated;

-- Blockieren beendet auch eine Freundschaft und offene Einladungen zwischen beiden
create or replace function public.block_player(name text, on_ boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name);
begin
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  if on_ then
    if (select count(*) from public.blocks where blocker = u) >= 300 then raise exception 'Du hast schon 300 Spieler blockiert.'; end if;
    insert into public.blocks (blocker, blocked) values (u, o) on conflict do nothing;
    delete from public.friendships where (requester = u and addressee = o) or (requester = o and addressee = u);
    update public.matches set status = 'declined', finished_at = now()
      where status = 'invited' and ((a = u and b = o) or (a = o and b = u));
  else
    delete from public.blocks where blocker = u and blocked = o;
  end if;
end;
$$;
revoke all on function public.block_player(text, boolean) from public, anon;
grant execute on function public.block_player(text, boolean) to authenticated;

create or replace function public.my_blocks()
returns table (username text, since timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.username, b.created_at from public.blocks b join public.profiles p on p.id = b.blocked
  where b.blocker = auth.uid() order by b.created_at desc;
$$;
revoke all on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- Freundschaftsanfragen: nicht zwischen blockierten Spielern, nicht an oder von Gästen
create or replace function public.friend_request(name text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); st text; n integer;
begin
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  if public.is_guest(u) then raise exception 'Für Freunde brauchst du ein Konto.'; end if;
  if public.is_guest(o) then raise exception 'Gäste können noch keine Freunde haben.'; end if;
  if public.blocked_between(u, o) then raise exception 'Das geht mit diesem Spieler nicht.'; end if;
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

-- Einer offenen Herausforderung beitreten (nicht, wenn einer den anderen blockiert hat)
create or replace function public.match_join(mid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); m public.matches;
begin
  perform public.match_sweep();
  if exists (select 1 from public.matches where status = 'live' and (a = u or b = u)) then
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
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited';
  update public.matches set status = 'declined', finished_at = now() where b = u and status = 'invited' and id <> mid;
  return public.match_view(m, 0, u);
end;
$$;
revoke all on function public.match_join(uuid) from public, anon;
grant execute on function public.match_join(uuid) to authenticated;

-- Menü: offene Herausforderungen ohne blockierte Spieler, Gäste dürfen dabei sein
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'open', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at, 'guest', p.guest) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a
      where m.b is null and m.status = 'invited' and m.a <> u and (not p.hidden or p.guest)
        and not public.blocked_between(m.a, u)
        and (not public.is_guest(u) or m.game in ('c4', 'ttt', 'ships', 'dots'))),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and (m.a = u or m.b = u) limit 1),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'),
    'req_from', (select p.username from public.friendships f join public.profiles p on p.id = f.requester
      where f.addressee = u and f.status = 'pending' order by f.created_at desc limit 1),
    'friend_n', (select count(*) from public.friendships where (requester = u or addressee = u) and status = 'accepted'));
end;
$$;

-- ---------- Schnelles Spiel ----------
-- Sucht eine wartende offene Herausforderung (gm leer: egal welches Spiel) und tritt bei. Gibt es keine,
-- wird eine eigene angelegt (Spiel gm, sonst fb) und der Browser wartet darauf. Ein Lock sorgt dafür, dass zwei
-- gleichzeitige Suchen sich finden, statt zwei Herausforderungen nebeneinander anzulegen.
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
  if exists (select 1 from public.matches where status = 'live' and (a = u or b = u)) then
    raise exception 'Beende erst deine laufende Partie.';
  end if;
  -- schon eine eigene offene Herausforderung: weiter darauf warten
  select * into own from public.matches where a = u and b is null and status = 'invited' order by created_at desc limit 1;
  if own.id is not null and (g is null or own.game = g) then
    return jsonb_build_object('status', 'waiting', 'id', own.id, 'game', own.game);
  end if;
  select m.id into found_id from public.matches m join public.profiles p on p.id = m.a
    where m.status = 'invited' and m.b is null and m.a <> u
      and (g is null or m.game = g)
      and (not me_guest or m.game = any (guest_ok))
      and (not p.hidden or p.guest)
      and m.a_seen > now() - interval '20 seconds'
      and not public.blocked_between(m.a, u)
    order by m.created_at limit 1;
  if found_id is not null then return public.match_join(found_id); end if;
  -- niemand wartet: eigene Herausforderung
  update public.matches set status = 'canceled', finished_at = now() where a = u and status = 'invited';
  g := coalesce(g, nullif(trim(coalesce(fb, '')), ''), 'c4');
  if not (g = any (ok)) or (me_guest and not (g = any (guest_ok))) then g := 'c4'; end if;
  if op is null or jsonb_typeof(op) <> 'object' or octet_length(op::text) > 500 then op := '{}'::jsonb; end if;
  insert into public.matches (game, opts, a, b) values (g, op, u, null) returning id into mid;
  return jsonb_build_object('status', 'waiting', 'id', mid, 'game', g);
end;
$$;
revoke all on function public.quick_match(text, text, jsonb) from public, anon;
grant execute on function public.quick_match(text, text, jsonb) to authenticated;

-- wie viele gerade eine schnelle Partie suchen oder spielen (für die Anzeige im Online-Tab)
create or replace function public.quick_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'waiting', (select count(*) from public.matches where status = 'invited' and b is null and a_seen > now() - interval '20 seconds'),
    'playing', (select count(*) * 2 from public.matches where status = 'live'),
    'online', (select count(*) from public.profiles where last_seen > now() - interval '2 minutes' and not dev));
$$;
revoke all on function public.quick_stats() from public;
grant execute on function public.quick_stats() to anon, authenticated;

-- ---------- Melden ----------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references auth.users (id) on delete set null,
  reporter_name text,
  target uuid references auth.users (id) on delete cascade,
  target_name text not null,
  reason text not null check (reason in ('name', 'cheat', 'abuse', 'other')),
  note text check (char_length(note) <= 300),
  match_id uuid references public.matches (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'done')),
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_open_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;   -- nur über die Funktionen unten

create or replace function public.report_player(name text, why text, note text default null, mid uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); o uuid := public.uid_of(name); t text := nullif(trim(coalesce(note, '')), '');
begin
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = u then raise exception 'Das bist du selbst.'; end if;
  if why not in ('name', 'cheat', 'abuse', 'other') then raise exception 'Unbekannter Grund.'; end if;
  if char_length(t) > 300 then t := left(t, 300); end if;
  if (select count(*) from public.reports where reporter = u and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Du hast heute schon 10 Meldungen geschickt.';
  end if;
  if exists (select 1 from public.reports where reporter = u and target = o and status = 'open') then
    raise exception 'Du hast diesen Spieler schon gemeldet. Das Team schaut es sich an.';
  end if;
  if mid is not null and not exists (select 1 from public.matches where id = mid and ((a = u and b = o) or (a = o and b = u))) then mid := null; end if;
  insert into public.reports (reporter, reporter_name, target, target_name, reason, note, match_id)
    values (u, (select username from public.profiles where id = u), o, lower(trim(name)), why, t, mid);
end;
$$;
revoke all on function public.report_player(text, text, text, uuid) from public, anon;
grant execute on function public.report_player(text, text, text, uuid) to authenticated;

create or replace function public.admin_reports(st text default 'open', lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'open', (select count(*) from public.reports where status = 'open'),
    'list', (select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) from (
      select r.created_at as t, jsonb_build_object(
        'id', r.id, 'reporter', r.reporter_name, 'target', coalesce(p.username, r.target_name), 'reason', r.reason, 'note', r.note,
        'match', r.match_id, 'game', m.game, 'status', r.status, 'by', r.handled_by, 'at', r.created_at, 'done_at', r.handled_at,
        'count', (select count(*) from public.reports r2 where r2.target = r.target),
        'banned', (select u.banned_until > now() from auth.users u where u.id = r.target)) as j
      from public.reports r
      left join public.profiles p on p.id = r.target
      left join public.matches m on m.id = r.match_id
      where coalesce(st, 'open') = 'all' or r.status = coalesce(st, 'open')
      order by r.created_at desc limit least(greatest(lim, 1), 200)) x));
end;
$$;

create or replace function public.admin_report_done(rid bigint, done boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  perform public.require_admin();
  update public.reports set status = case when done then 'done' else 'open' end,
    handled_by = case when done then (select username from public.profiles where id = auth.uid()) else null end,
    handled_at = case when done then now() else null end
    where id = rid returning target_name into t;
  if t is null then raise exception 'Meldung nicht gefunden.'; end if;
  perform public.admin_note(case when done then 'report_done' else 'report_open' end, t, '#' || rid);
end;
$$;
do $$
declare f text;
begin
  foreach f in array array['admin_reports(text, integer)', 'admin_report_done(bigint, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ---------- Wiederherstellungscode ----------
-- Es gibt keine echten E-Mails. Wer sein Passwort vergisst, setzt es mit diesem Code neu.
-- Gespeichert wird nur ein Hash; der Code selbst wird genau einmal angezeigt.
create table if not exists public.recovery_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  fails integer not null default 0,
  locked_until timestamptz
);
alter table public.recovery_codes enable row level security;

create or replace function public.recovery_new()
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text := ''; i integer;
begin
  if public.is_guest(u) then raise exception 'Erst ein Konto anlegen, dann gibt es einen Code.'; end if;
  for i in 1..12 loop c := c || substr(abc, 1 + floor(random() * 32)::integer, 1); end loop;
  insert into public.recovery_codes (user_id, code_hash) values (u, extensions.crypt(c, extensions.gen_salt('bf')))
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now(), fails = 0, locked_until = null;
  return substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
end;
$$;
revoke all on function public.recovery_new() from public, anon;
grant execute on function public.recovery_new() to authenticated;

-- ohne Login aufrufbar; nach 5 falschen Versuchen eine Stunde Pause.
-- Antwort 'ok', 'wrong' oder 'locked' statt einer Exception, damit der Fehlversuch gespeichert bleibt.
create or replace function public.recovery_reset(name text, code text, pw text)
returns text language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); r public.recovery_codes; c text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if char_length(coalesce(pw, '')) < 6 then raise exception 'Das Passwort ist zu kurz (mindestens 6 Zeichen).'; end if;
  if char_length(pw) > 72 then raise exception 'Das Passwort ist zu lang.'; end if;
  if o is not null then select * into r from public.recovery_codes where user_id = o for update; end if;
  if r.user_id is null then return 'wrong'; end if;
  if r.locked_until > now() then return 'locked'; end if;
  if r.code_hash <> extensions.crypt(c, r.code_hash) then
    update public.recovery_codes set fails = case when locked_until is not null then 1 else fails + 1 end,
      locked_until = case when fails + 1 >= 5 and locked_until is null then now() + interval '1 hour' else null end
      where user_id = o;
    return 'wrong';
  end if;
  update auth.users set encrypted_password = extensions.crypt(pw, extensions.gen_salt('bf')), updated_at = now() where id = o;
  -- der Code gilt nur einmal
  delete from public.recovery_codes where user_id = o;
  return 'ok';
end;
$$;
revoke all on function public.recovery_reset(text, text, text) from public;
grant execute on function public.recovery_reset(text, text, text) to anon, authenticated;

-- Eigenes Konto: zusätzlich Gast ja/nein und ob es einen Wiederherstellungscode gibt
create or replace function public.my_info()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('username', p.username, 'joined', p.created_at, 'dev', p.dev, 'guest', p.guest,
    'role', (select role from public.admins where user_id = p.id),
    'renamed', p.name_changed_at, 'next_rename', p.name_changed_at + interval '7 days',
    'recovery', exists (select 1 from public.recovery_codes r where r.user_id = p.id))
  from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.my_info() from public, anon;
grant execute on function public.my_info() to authenticated;

-- ---------- Keep-alive ----------
-- Eine GitHub Action ruft das alle paar Tage auf, damit das kostenlose Supabase-Projekt nicht pausiert.
create or replace function public.ping()
returns text language sql stable set search_path = '' as $$ select 'ok'::text; $$;
grant execute on function public.ping() to anon, authenticated;
