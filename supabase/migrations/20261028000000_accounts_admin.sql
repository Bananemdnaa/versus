-- Versus: Konten, Cloud-Speicher, Online-Status und Admin-Panel
-- Einmal im Supabase SQL-Editor ausführen (neues, leeres Projekt).
--
-- Danach dich selbst zum Owner machen (Benutzernamen anpassen, nachdem du dich im Spiel registriert hast):
--   insert into public.admins (user_id, role) select id, 'owner' from public.profiles where username = 'dein_name' on conflict (user_id) do update set role = 'owner';

-- ---------- Namensfilter ----------
-- Vereinheitlicht Schreibweisen (Umlaute, 0→o, 1→i, 4→a, @→a …) und findet Wörter auch mit verdoppelten Buchstaben.
create or replace function public.bad_name(n text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  s text; w text;
  words text[] := array[
    'nigger', 'nigga', 'neger', 'kanake', 'kanacke', 'zigeuner', 'schwuchtel', 'faggot', 'tranny', 'chink', 'wetback',
    'retard', 'spast', 'missgeburt', 'judensau', 'hitler', 'siegheil', 'nazi',
    'hurensohn', 'hure', 'whore', 'nutte', 'fotze', 'cunt', 'wichser', 'arschloch', 'schlampe', 'bitch', 'slut',
    'fuck', 'fick', 'porno', 'penis'];
begin
  s := lower(coalesce(n, ''));
  s := replace(s, 'ß', 'ss');
  s := translate(s, 'äöü0134578@$!|', 'aouoieastbasii');
  s := regexp_replace(s, '[^a-z]', '', 'g');
  foreach w in array words loop
    if s ~ regexp_replace(w, '(.)', '\1+', 'g') then return true; end if;
  end loop;
  return false;
end;
$$;
grant execute on function public.bad_name(text) to anon, authenticated;

-- ---------- Profile ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,16}$'),
  created_at timestamptz not null default now(),
  last_seen timestamptz,
  current_game text,
  hidden boolean not null default false,   -- aus Ranglisten und Suche genommen
  dev boolean not null default false,      -- Testkonto: überall ausgeblendet
  name_changed_at timestamptz
);
alter table public.profiles enable row level security;
drop policy if exists "Eigenes Profil lesen" on public.profiles;
create policy "Eigenes Profil lesen" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create or replace function public.profiles_name_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.bad_name(new.username) then raise exception 'Dieser Benutzername ist nicht erlaubt.'; end if;
  return new;
end;
$$;
drop trigger if exists profiles_name_guard on public.profiles;
create trigger profiles_name_guard
  before insert or update of username on public.profiles
  for each row execute function public.profiles_name_guard();

-- Profil beim Registrieren anlegen (Benutzername kommt aus den Metadaten)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, last_seen)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'), now());
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Hilfsfunktionen ----------
create or replace function public.me()
returns uuid language plpgsql stable set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Nicht eingeloggt'; end if;
  return u;
end;
$$;
revoke all on function public.me() from public, anon;

create or replace function public.uid_of(name text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles where username = lower(trim(name));
$$;
revoke all on function public.uid_of(text) from public, anon, authenticated;

create or replace function public.is_dev(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select dev from public.profiles where id = u), false);
$$;
revoke all on function public.is_dev(uuid) from public, anon, authenticated;

-- Zahl aus JSON lesen, alles andere zählt als 0
create or replace function public.jint(v jsonb)
returns integer language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'number' then least(greatest((v #>> '{}')::numeric, 0), 1000000000)::integer else 0 end;
$$;

-- Bilanz zusammenfassen: { played, ai_games, ai_wins, per: { spiel: partien } }
create or replace function public.stats_sum(s jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare e record; x jsonb; n integer; played integer := 0; aig integer := 0; wins integer := 0; per jsonb := '{}'::jsonb;
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    return jsonb_build_object('played', 0, 'ai_games', 0, 'ai_wins', 0, 'per', per);
  end if;
  for e in select key, value from jsonb_each(s) loop
    n := 0;
    if jsonb_typeof(e.value -> 'ai') = 'array' then
      for x in select value from jsonb_array_elements(e.value -> 'ai') loop
        n := n + public.jint(x -> 'w') + public.jint(x -> 'l') + public.jint(x -> 'd');
        aig := aig + public.jint(x -> 'w') + public.jint(x -> 'l') + public.jint(x -> 'd');
        wins := wins + public.jint(x -> 'w');
      end loop;
    end if;
    n := n + public.jint(e.value -> 'local' -> 'a') + public.jint(e.value -> 'local' -> 'b') + public.jint(e.value -> 'local' -> 'd');
    played := played + n;
    if n > 0 then per := per || jsonb_build_object(e.key, n); end if;
  end loop;
  return jsonb_build_object('played', played, 'ai_games', aig, 'ai_wins', wins, 'per', per);
end;
$$;

-- ---------- Cloud-Speicher (Bilanz, Einstellungen, Tutorials) ----------
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  rev integer not null default 0,
  reset_at timestamptz,          -- Admin hat die Bilanz zurückgesetzt: das Spiel übernimmt dann den Stand vom Server
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "Eigene Daten lesen" on public.user_data;
create policy "Eigene Daten lesen" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

-- Speichern nur über diese Funktion. base = zuletzt gelesene Revision; passt sie nicht, gibt es "conflict"
-- und das Spiel lädt erst den neuen Stand, führt beide zusammen und speichert dann erneut.
create or replace function public.save_data(d jsonb, base integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); cur integer;
begin
  if d is null or jsonb_typeof(d) <> 'object' then raise exception 'Ungültige Daten.'; end if;
  if octet_length(d::text) > 200000 then raise exception 'Zu viele Daten.'; end if;
  select rev into cur from public.user_data where user_id = u for update;
  if cur is null then
    insert into public.user_data (user_id, data, rev) values (u, d, 1);
    update public.profiles set last_seen = now() where id = u;
    return 1;
  end if;
  if cur <> coalesce(base, -1) then raise exception 'conflict'; end if;
  update public.user_data set data = d, rev = cur + 1, updated_at = now() where user_id = u;
  update public.profiles set last_seen = now() where id = u;
  return cur + 1;
end;
$$;
revoke all on function public.save_data(jsonb, integer) from public, anon;
grant execute on function public.save_data(jsonb, integer) to authenticated;

-- Lebenszeichen, solange das Spiel offen ist (für die Online-Liste)
create or replace function public.touch(game text default null)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set last_seen = now(), current_game = left(game, 20) where id = auth.uid();
$$;
revoke all on function public.touch(text) from public, anon;
grant execute on function public.touch(text) to authenticated;

-- Konto endgültig löschen (das Spiel fragt vorher das Passwort ab)
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  delete from auth.users where id = u;
end;
$$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- ---------- Benutzername ändern ----------
-- Login läuft über <name>@bananemdnaa.github.io, deshalb ändern sich Profil, Login-Adresse und Metadaten zusammen.
create or replace function public.rename_user_internal(o uuid, new_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare nn text := lower(trim(coalesce(new_name, ''))); mail text;
begin
  if nn !~ '^[a-z0-9_-]{3,16}$' then raise exception 'Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.'; end if;
  if public.bad_name(nn) then raise exception 'Dieser Benutzername ist nicht erlaubt.'; end if;
  if exists (select 1 from public.profiles where username = nn and id <> o) then raise exception 'Diesen Benutzernamen gibt es schon.'; end if;
  mail := nn || '@bananemdnaa.github.io';
  update public.profiles set username = nn, name_changed_at = now() where id = o;
  update auth.users set email = mail,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', nn)
    where id = o;
  update auth.identities set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', mail)
    where user_id = o and provider = 'email';
  return nn;
end;
$$;
revoke all on function public.rename_user_internal(uuid, text) from public, anon, authenticated;

-- Eigener Name: höchstens einmal alle 7 Tage
create or replace function public.change_username(new_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); last timestamptz; old text;
begin
  select name_changed_at, username into last, old from public.profiles where id = u;
  if lower(trim(coalesce(new_name, ''))) = old then raise exception 'Das ist schon dein Name.'; end if;
  if last is not null and last > now() - interval '7 days' then
    raise exception 'Du kannst deinen Namen erst wieder ab % ändern.', to_char(last + interval '7 days', 'DD.MM.YYYY');
  end if;
  return public.rename_user_internal(u, new_name);
end;
$$;
revoke all on function public.change_username(text) from public, anon;
grant execute on function public.change_username(text) to authenticated;

-- =====================================================================
-- Admin-Panel
-- =====================================================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin uuid references auth.users (id) on delete set null,
  admin_name text,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_time_idx on public.admin_log (created_at desc);
alter table public.admin_log enable row level security;

create table if not exists public.admin_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  ban_reason text,
  updated_by text,
  updated_at timestamptz not null default now()
);
alter table public.admin_notes enable row level security;

create or replace function public.role_of(u uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.admins where user_id = u;
$$;
revoke all on function public.role_of(uuid) from public, anon, authenticated;

create or replace function public.require_admin()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or public.role_of(u) is null then raise exception 'Keine Admin-Rechte.'; end if;
  return u;
end;
$$;
revoke all on function public.require_admin() from public, anon, authenticated;

create or replace function public.require_owner()
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if public.role_of(auth.uid()) is distinct from 'owner' then raise exception 'Das darf nur der Owner.'; end if;
  return auth.uid();
end;
$$;
revoke all on function public.require_owner() from public, anon, authenticated;

-- Owner darf alle bearbeiten, Admins nur normale Spieler und sich selbst
create or replace function public.check_target(o uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if public.role_of(o) is null or o = auth.uid() or public.role_of(auth.uid()) = 'owner' then return; end if;
  raise exception 'Admins und den Owner kann nur der Owner bearbeiten.';
end;
$$;
revoke all on function public.check_target(uuid) from public, anon, authenticated;

create or replace function public.admin_note(act text, tgt text, det text)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_log (admin, admin_name, action, target, detail)
  select auth.uid(), (select username from public.profiles where id = auth.uid()), act, tgt, det;
$$;
revoke all on function public.admin_note(text, text, text) from public, anon, authenticated;

-- Eigenes Konto für das Spiel: Name, Rolle, Dev, Namensänderung
create or replace function public.my_info()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('username', p.username, 'joined', p.created_at, 'dev', p.dev,
    'role', (select role from public.admins where user_id = p.id),
    'renamed', p.name_changed_at, 'next_rename', p.name_changed_at + interval '7 days')
  from public.profiles p where p.id = auth.uid();
$$;

-- ---------- Übersicht ----------
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

create or replace function public.admin_online()
returns table (username text, game text, seen timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query
    select p.username, coalesce(p.current_game, ''), p.last_seen
    from public.profiles p
    where p.last_seen > now() - interval '2 minutes' and not p.dev
    order by p.last_seen desc;
end;
$$;

-- Spieler nach Namensanfang (leer: zuletzt aktive)
create or replace function public.admin_players(q text default '', lim integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  perform public.require_admin();
  select coalesce(jsonb_agg(x.j order by x.last desc nulls last), '[]'::jsonb) into res from (
    select p.last_seen as last, jsonb_build_object(
      'username', p.username, 'joined', p.created_at, 'seen', p.last_seen, 'game', p.current_game,
      'hidden', p.hidden, 'dev', p.dev, 'role', public.role_of(p.id), 'me', p.id = auth.uid(),
      'renamed', p.name_changed_at,
      'note', n.note, 'ban_reason', n.ban_reason, 'note_by', n.updated_by,
      'banned_until', (select u.banned_until from auth.users u where u.id = p.id and u.banned_until > now()),
      'stats', public.stats_sum(d.data -> 'stats')) as j
    from public.profiles p
    left join public.admin_notes n on n.user_id = p.id
    left join public.user_data d on d.user_id = p.id
    where coalesce(trim(q), '') = '' or left(p.username, char_length(trim(q))) = lower(trim(q))
    order by p.last_seen desc nulls last
    limit least(greatest(lim, 1), 100)) x;
  return res;
end;
$$;

create or replace function public.admin_log_list(lim integer default 50)
returns table (admin_name text, action text, target text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select l.admin_name, l.action, l.target, l.detail, l.created_at
    from public.admin_log l order by l.created_at desc limit least(greatest(lim, 1), 200);
end;
$$;

-- ---------- Aktionen ----------
create or replace function public.admin_set_hidden(name text, hide boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  perform public.check_target(o);
  update public.profiles set hidden = hide where id = o;
  perform public.admin_note(case when hide then 'hide' else 'show' end, lower(trim(name)), null);
end;
$$;

create or replace function public.admin_ban(name text, days integer default null, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); r text := nullif(trim(coalesce(reason, '')), '');
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if o = auth.uid() then raise exception 'Du kannst dich nicht selbst sperren.'; end if;
  if public.role_of(o) = 'owner' then raise exception 'Der Owner kann nicht gesperrt werden.'; end if;
  perform public.check_target(o);
  if days is not null and (days < 1 or days > 3650) then raise exception 'Ungültige Dauer.'; end if;
  if char_length(r) > 200 then raise exception 'Der Grund hat höchstens 200 Zeichen.'; end if;
  update auth.users set banned_until = now() + case when days is null then interval '100 years' else make_interval(days => days) end where id = o;
  update public.profiles set hidden = true where id = o;
  insert into public.admin_notes (user_id, ban_reason, updated_by, updated_at)
    values (o, r, (select username from public.profiles where id = auth.uid()), now())
    on conflict (user_id) do update set ban_reason = excluded.ban_reason, updated_by = excluded.updated_by, updated_at = now();
  perform public.admin_note('ban', lower(trim(name)), case when days is null then 'dauerhaft' else days || ' Tage' end || coalesce(': ' || r, ''));
end;
$$;

create or replace function public.admin_unban(name text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  perform public.check_target(o);
  update auth.users set banned_until = null where id = o;
  update public.admin_notes set ban_reason = null where user_id = o;
  perform public.admin_note('unban', lower(trim(name)), null);
end;
$$;

create or replace function public.admin_set_note(name text, txt text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); t text := nullif(trim(coalesce(txt, '')), '');
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if char_length(t) > 500 then raise exception 'Notizen haben höchstens 500 Zeichen.'; end if;
  insert into public.admin_notes (user_id, note, updated_by, updated_at)
    values (o, t, (select username from public.profiles where id = auth.uid()), now())
    on conflict (user_id) do update set note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
  perform public.admin_note('note', lower(trim(name)), t);
end;
$$;

create or replace function public.admin_rename_user(name text, new_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); nn text;
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  perform public.check_target(o);
  nn := public.rename_user_internal(o, new_name);
  perform public.admin_note('rename', nn, lower(trim(name)) || ' → ' || nn);
end;
$$;

-- Bilanz eines Spielers auf null setzen; sein Spiel übernimmt den neuen Stand beim nächsten Abgleich
create or replace function public.admin_reset_stats(name text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name); prev jsonb;
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  perform public.check_target(o);
  select public.stats_sum(data -> 'stats') into prev from public.user_data where user_id = o;
  insert into public.user_data (user_id, data, rev, reset_at) values (o, jsonb_build_object('stats', '{}'::jsonb), 1, now())
    on conflict (user_id) do update set data = jsonb_set(public.user_data.data, '{stats}', '{}'::jsonb), rev = public.user_data.rev + 1, reset_at = now(), updated_at = now();
  perform public.admin_note('reset_stats', lower(trim(name)), coalesce((prev ->> 'played') || ' Partien', 'keine Daten'));
end;
$$;

-- Nur der Owner: Admins ernennen und entlassen, Dev-Konten (Testkonten, überall ausgeblendet)
create or replace function public.admin_set_admin(name text, make boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_owner();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  if public.role_of(o) = 'owner' then raise exception 'Die Owner-Rolle lässt sich hier nicht ändern.'; end if;
  if make then insert into public.admins (user_id, role) values (o, 'admin') on conflict do nothing;
  else delete from public.admins where user_id = o;
  end if;
  perform public.admin_note(case when make then 'admin_on' else 'admin_off' end, lower(trim(name)), null);
end;
$$;

create or replace function public.admin_set_dev(name text, make boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_owner();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  update public.profiles set dev = make, hidden = case when make then true else hidden end where id = o;
  perform public.admin_note(case when make then 'dev_on' else 'dev_off' end, lower(trim(name)), null);
end;
$$;

-- ---------- Rechte ----------
revoke all on function public.my_info() from public, anon;
grant execute on function public.my_info() to authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'admin_stats()', 'admin_online()', 'admin_players(text, integer)', 'admin_log_list(integer)',
    'admin_set_hidden(text, boolean)', 'admin_ban(text, integer, text)', 'admin_unban(text)', 'admin_set_note(text, text)',
    'admin_rename_user(text, text)', 'admin_reset_stats(text)', 'admin_set_admin(text, boolean)', 'admin_set_dev(text, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
