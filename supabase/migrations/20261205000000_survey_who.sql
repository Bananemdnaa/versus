-- Versus: im Admin-Panel sehen, wer bei einer Umfrage schon mitgemacht hat
--
-- admin_survey_results liefert zusätzlich 'who': die neuesten 500 Teilnahmen, je { name, guest, at }.
--   name ist der Spielername (null bei Antworten ohne Konto, nur mit Geräte-ID), guest = Gastkonto.
--   Nur wer mitgemacht hat, nicht was: die Antworten bleiben weiter ohne Namen.
-- Sonst unverändert gegenüber 20261129000000_flags_surveys.sql.

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
    'questions', res,
    'who', (select coalesce(jsonb_agg(jsonb_build_object('name', w.username, 'guest', coalesce(w.guest, false), 'at', w.at) order by w.at desc), '[]'::jsonb)
      from (select p.username, p.guest, a.at from public.survey_answers a
        left join public.profiles p on p.id = a.user_id
        where a.survey_id = sid order by a.at desc limit 500) w));
end;
$$;

revoke all on function public.admin_survey_results(bigint) from public, anon;
grant execute on function public.admin_survey_results(bigint) to authenticated;
