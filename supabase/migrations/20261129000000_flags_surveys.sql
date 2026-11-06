-- Versus: Länderflagge neben dem Namen und freiwillige Umfragen
--
-- Flagge: profiles.flag (zwei Buchstaben, ISO-Ländercode wie 'DE'), auch für Gäste.
--   Das Spiel setzt sie beim ersten Login automatisch (Zeitzone bzw. Sprache des Geräts, set_flag mit auto = true).
--   Wer selbst wählt (auch "Keine Flagge"), bekommt flag_chosen = true; danach ändert auto nichts mehr.
--   set_flag(f, auto) setzt oder entfernt die eigene, flags_of(names) liefert sie für bis zu 100 Namen ({name: code}).
--   Die Liste der Länder und die Zeichnungen der Flaggen stehen in js/flag.js.
--
-- Umfragen: das Team legt sie im Admin-Panel an (Tab "Umfragen"), live geschaltet erscheinen sie als Banner.
--   Mitmachen ist freiwillig, jede Frage darf leer bleiben. Eine Antwort pro Konto (Schlüssel = Konto-ID)
--   oder pro Gerät ohne Konto (Schlüssel 'd:' + zufällige Geräte-ID aus dem Browser).
--   questions: [{ q: Frage, t: 'one' | 'many' | 'scale' | 'text', o: [Antworten] }]  (o nur bei one/many)
--   answers:   je Frage null, ein Index (one), eine Liste von Indizes (many), 1..5 (scale) oder Text (text)

-- ---------- Flagge ----------
alter table public.profiles add column if not exists flag text check (flag ~ '^[A-Z]{2}$');
alter table public.profiles add column if not exists flag_chosen boolean not null default false;

-- gibt die Flagge zurück, die danach gilt (bei auto die schon gewählte, wenn es eine gibt)
create or replace function public.set_flag(f text, auto boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); c text := upper(nullif(trim(coalesce(f, '')), '')); res text;
begin
  if u is null then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if c is not null and c !~ '^[A-Z]{2}$' then raise exception 'Unbekanntes Land.'; end if;
  if coalesce(auto, false) then
    update public.profiles set flag = c where id = u and not flag_chosen and flag is null and c is not null;
    select p.flag into res from public.profiles p where p.id = u;
    return res;
  end if;
  update public.profiles set flag = c, flag_chosen = true where id = u;
  return c;
end;
$$;
revoke all on function public.set_flag(text, boolean) from public, anon;
grant execute on function public.set_flag(text, boolean) to authenticated;

create or replace function public.flags_of(names text[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(p.username, p.flag), '{}'::jsonb)
  from public.profiles p
  where p.flag is not null
    and p.username = any (select lower(trim(n)) from unnest(names[1:100]) n);
$$;
revoke all on function public.flags_of(text[]) from public;
grant execute on function public.flags_of(text[]) to anon, authenticated;

-- ---------- Umfragen ----------
create table if not exists public.surveys (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 80),
  intro text check (char_length(intro) <= 300),
  lang text not null default '' check (lang in ('', 'de', 'en')),   -- '' = alle Sprachen
  questions jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  created_by text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  closed_at timestamptz
);
alter table public.surveys enable row level security;   -- nur über die Funktionen unten

create table if not exists public.survey_answers (
  id bigint generated always as identity primary key,
  survey_id bigint not null references public.surveys (id) on delete cascade,
  key text not null,
  user_id uuid references auth.users (id) on delete set null,
  answers jsonb not null,
  at timestamptz not null default now(),
  unique (survey_id, key)
);
create index if not exists survey_answers_time_idx on public.survey_answers (survey_id, at desc);
alter table public.survey_answers enable row level security;

-- prüft die Fragen aus dem Admin-Panel und gibt sie bereinigt zurück
create or replace function public.survey_clean(qs jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare res jsonb := '[]'::jsonb; x jsonb; q text; t text; o jsonb; e jsonb; s text;
begin
  if qs is null or jsonb_typeof(qs) <> 'array' or jsonb_array_length(qs) = 0 then raise exception 'Die Umfrage braucht mindestens eine Frage.'; end if;
  if jsonb_array_length(qs) > 10 then raise exception 'Höchstens 10 Fragen.'; end if;
  for x in select value from jsonb_array_elements(qs) loop
    q := left(regexp_replace(trim(coalesce(x ->> 'q', '')), '\s+', ' ', 'g'), 200);
    t := x ->> 't';
    if char_length(q) < 3 then raise exception 'Jede Frage braucht einen Text.'; end if;
    if t is null or t not in ('one', 'many', 'scale', 'text') then raise exception 'Unbekannte Art bei „%“.', q; end if;
    o := '[]'::jsonb;
    if t in ('one', 'many') then
      if jsonb_typeof(x -> 'o') = 'array' then
        for e in select value from jsonb_array_elements(x -> 'o') loop
          s := left(trim(coalesce(e #>> '{}', '')), 60);
          if s <> '' then o := o || to_jsonb(s); end if;
        end loop;
      end if;
      if jsonb_array_length(o) < 2 or jsonb_array_length(o) > 8 then raise exception 'Bei „%“ braucht es 2 bis 8 Antworten.', q; end if;
      res := res || jsonb_build_array(jsonb_build_object('q', q, 't', t, 'o', o));
    else
      res := res || jsonb_build_array(jsonb_build_object('q', q, 't', t));
    end if;
  end loop;
  return res;
end;
$$;
revoke all on function public.survey_clean(jsonb) from public, anon, authenticated;

-- die neueste laufende Umfrage, bei der dieses Konto oder Gerät noch nicht mitgemacht hat (oder null)
create or replace function public.survey_current(l text default 'de', dev text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', s.id, 'title', s.title, 'intro', s.intro, 'questions', s.questions)
  from public.surveys s
  where s.status = 'live' and (s.lang = '' or s.lang = coalesce(l, 'de'))
    and not exists (select 1 from public.survey_answers a where a.survey_id = s.id
      and (a.key = auth.uid()::text or a.key = 'd:' || coalesce(dev, '-')))
  order by s.started_at desc nulls last
  limit 1;
$$;
revoke all on function public.survey_current(text, text) from public;
grant execute on function public.survey_current(text, text) to anon, authenticated;

create or replace function public.survey_answer(sid bigint, dev text, a jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); s public.surveys; k text; qs jsonb; q jsonb; x jsonb; v jsonb := '[]'::jsonb;
  i int; n int; c int := 0; el jsonb; picks int[]; tx text;
begin
  select * into s from public.surveys where id = sid;
  if s.id is null or s.status <> 'live' then raise exception 'Diese Umfrage ist schon vorbei.'; end if;
  if dev is null or dev !~ '^[a-z0-9-]{8,40}$' then dev := null; end if;
  if u is null and dev is null then raise exception 'Das hat leider nicht geklappt.'; end if;
  k := coalesce(u::text, 'd:' || dev);
  if exists (select 1 from public.survey_answers r where r.survey_id = sid and (r.key = k or r.key = 'd:' || coalesce(dev, '-'))) then
    raise exception 'Du hast hier schon mitgemacht. Danke!';
  end if;
  if u is null and (select count(*) from public.survey_answers r where r.user_id is null and r.at > now() - interval '1 hour') >= 200 then
    raise exception 'Gerade kommen zu viele Antworten. Versuch es später nochmal.';
  end if;
  qs := s.questions;
  if a is null or jsonb_typeof(a) <> 'array' or jsonb_array_length(a) <> jsonb_array_length(qs) then raise exception 'Das hat leider nicht geklappt.'; end if;
  for i in 0 .. jsonb_array_length(qs) - 1 loop
    q := qs -> i; x := a -> i; el := 'null'::jsonb;
    n := coalesce(jsonb_array_length(q -> 'o'), 0);
    if x is null or jsonb_typeof(x) = 'null' then
      null;
    elsif q ->> 't' = 'one' then
      if jsonb_typeof(x) = 'number' and x::text ~ '^\d{1,2}$' then
        if x::text::int < n then el := x; end if;
      end if;
    elsif q ->> 't' = 'scale' then
      if jsonb_typeof(x) = 'number' and x::text ~ '^[1-5]$' then el := x; end if;
    elsif q ->> 't' = 'many' then
      if jsonb_typeof(x) = 'array' then
        -- the case keeps the cast away from anything that is not a small number
        select array_agg(distinct p.k order by p.k) into picks from (
          select case when jsonb_typeof(e) = 'number' and e::text ~ '^\d{1,2}$' then e::text::int end as k
          from jsonb_array_elements(x) e) p
        where p.k < n;
        if picks is not null then el := to_jsonb(picks); end if;
      end if;
    elsif q ->> 't' = 'text' then
      tx := left(trim(coalesce(x #>> '{}', '')), 500);
      if tx <> '' then el := to_jsonb(tx); end if;
    end if;
    if el <> 'null'::jsonb then c := c + 1; end if;
    v := v || jsonb_build_array(el);
  end loop;
  if c = 0 then raise exception 'Beantworte mindestens eine Frage.'; end if;
  insert into public.survey_answers (survey_id, key, user_id, answers) values (sid, k, u, v);
end;
$$;
revoke all on function public.survey_answer(bigint, text, jsonb) from public;
grant execute on function public.survey_answer(bigint, text, jsonb) to anon, authenticated;

-- ---------- Admin ----------
create or replace function public.admin_surveys()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'intro', s.intro, 'lang', s.lang, 'status', s.status,
      'questions', s.questions, 'by', s.created_by, 'at', s.created_at, 'started', s.started_at, 'closed', s.closed_at,
      'n', (select count(*) from public.survey_answers a where a.survey_id = s.id)) order by s.created_at desc)
    from public.surveys s), '[]'::jsonb);
end;
$$;

-- Ergebnis einer Umfrage: je Frage die Zahl pro Antwort (one, many), pro Stufe 1..5 (scale) oder die neuesten Texte
create or replace function public.admin_survey_results(sid bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.surveys; res jsonb := '[]'::jsonb; q jsonb; i int; n int; r jsonb;
begin
  perform public.require_admin();
  select * into s from public.surveys where id = sid;
  if s.id is null then raise exception 'Diese Umfrage gibt es nicht.'; end if;
  for i in 0 .. jsonb_array_length(s.questions) - 1 loop
    q := s.questions -> i; n := coalesce(jsonb_array_length(q -> 'o'), 0);
    if q ->> 't' = 'one' then
      select jsonb_agg((select count(*) from public.survey_answers a where a.survey_id = sid and a.answers -> i = to_jsonb(k)) order by k)
        into r from generate_series(0, n - 1) k;
    elsif q ->> 't' = 'many' then
      select jsonb_agg((select count(*) from public.survey_answers a where a.survey_id = sid and a.answers -> i @> jsonb_build_array(k)) order by k)
        into r from generate_series(0, n - 1) k;
    elsif q ->> 't' = 'scale' then
      select jsonb_agg((select count(*) from public.survey_answers a where a.survey_id = sid and a.answers -> i = to_jsonb(k)) order by k)
        into r from generate_series(1, 5) k;
    else
      select coalesce(jsonb_agg(t.x order by t.at desc), '[]'::jsonb) into r from (
        select a.answers ->> i as x, a.at from public.survey_answers a
        where a.survey_id = sid and jsonb_typeof(a.answers -> i) = 'string' order by a.at desc limit 200) t;
    end if;
    res := res || jsonb_build_array(jsonb_build_object('r', r,
      'n', (select count(*) from public.survey_answers a where a.survey_id = sid and jsonb_typeof(a.answers -> i) <> 'null')));
  end loop;
  return jsonb_build_object('n', (select count(*) from public.survey_answers a where a.survey_id = sid),
    'accounts', (select count(*) from public.survey_answers a where a.survey_id = sid and a.user_id is not null),
    'questions', res);
end;
$$;

-- neu (sid null) oder Entwurf ändern; Fragen lassen sich nur ändern, solange niemand geantwortet hat
create or replace function public.admin_survey_save(sid bigint, title text, intro text, l text, qs jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare t text := left(trim(coalesce(title, '')), 80); i text := nullif(left(trim(coalesce(intro, '')), 300), ''); c jsonb; nid bigint;
begin
  perform public.require_admin();
  if char_length(t) < 3 then raise exception 'Die Umfrage braucht einen Titel.'; end if;
  if coalesce(l, '') not in ('', 'de', 'en') then raise exception 'Unbekannte Sprache.'; end if;
  c := public.survey_clean(qs);
  if sid is null then
    insert into public.surveys (title, intro, lang, questions, created_by)
    values (t, i, coalesce(l, ''), c, (select p.username from public.profiles p where p.id = auth.uid()))
    returning id into nid;
    perform public.admin_note('survey', null, t || ' angelegt');
    return nid;
  end if;
  if exists (select 1 from public.survey_answers a where a.survey_id = sid) then
    raise exception 'Es gibt schon Antworten, die Fragen bleiben deshalb so.';
  end if;
  update public.surveys set title = t, intro = i, lang = coalesce(l, ''), questions = c where id = sid;
  if not found then raise exception 'Diese Umfrage gibt es nicht.'; end if;
  return sid;
end;
$$;

-- st: 'live' (Banner an), 'closed' (beendet, Ergebnis bleibt), 'draft' (zurück zum Entwurf, nur ohne Antworten)
create or replace function public.admin_survey_status(sid bigint, st text)
returns void language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  perform public.require_admin();
  if st not in ('live', 'closed', 'draft') then raise exception 'Unbekannter Zustand.'; end if;
  if st = 'draft' and exists (select 1 from public.survey_answers a where a.survey_id = sid) then
    raise exception 'Es gibt schon Antworten. Beende die Umfrage stattdessen.';
  end if;
  update public.surveys set status = st,
    started_at = case when st = 'live' then coalesce(started_at, now()) else started_at end,
    closed_at = case when st = 'closed' then now() when st = 'live' then null else closed_at end
  where id = sid returning title into t;
  if t is null then raise exception 'Diese Umfrage gibt es nicht.'; end if;
  perform public.admin_note('survey', null, t || case st when 'live' then ' gestartet' when 'closed' then ' beendet' else ' zurück zum Entwurf' end);
end;
$$;

create or replace function public.admin_survey_delete(sid bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  perform public.require_admin();
  delete from public.surveys where id = sid returning title into t;
  if t is null then raise exception 'Diese Umfrage gibt es nicht.'; end if;
  perform public.admin_note('survey', null, t || ' gelöscht');
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_surveys()', 'admin_survey_results(bigint)', 'admin_survey_save(bigint, text, text, text, jsonb)',
      'admin_survey_status(bigint, text)', 'admin_survey_delete(bigint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
