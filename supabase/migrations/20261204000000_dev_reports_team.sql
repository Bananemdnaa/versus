-- Versus: Das Team (Admins und Owner) sieht die Bug-Meldungen der Dev-Konten auch ohne eigenes Dev-Konto
-- (Admin-Panel → Tab „Dev-Bugs“) und kann sie abhaken. Senden bleibt den Dev-Konten vorbehalten. Im SQL-Editor ausführen.

create or replace function public.dev_reports(lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_dev(public.me()) or public.role_of(auth.uid()) is not null) then raise exception 'Nur für Dev-Konten und das Team.'; end if;
  return (select coalesce(jsonb_agg(x.j order by x.t desc), '[]'::jsonb) from (
    select r.created_at as t, jsonb_build_object('id', r.id, 'at', r.created_at, 'txt', r.txt, 'game', r.game, 'v', r.v, 'errs', r.errs,
      'name', coalesce((select p.username from public.profiles p where p.id = r.user_id), r.username), 'done', r.done, 'by', r.done_by) as j
    from public.dev_reports r order by r.done, r.created_at desc limit least(greatest(lim, 1), 200)) x);
end;
$$;
revoke all on function public.dev_reports(integer) from public, anon;
grant execute on function public.dev_reports(integer) to authenticated;

create or replace function public.dev_report_snap(rid bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_dev(public.me()) or public.role_of(auth.uid()) is not null) then raise exception 'Nur für Dev-Konten und das Team.'; end if;
  return (select r.snap from public.dev_reports r where r.id = rid);
end;
$$;
revoke all on function public.dev_report_snap(bigint) from public, anon;
grant execute on function public.dev_report_snap(bigint) to authenticated;

create or replace function public.dev_report_done(rid bigint, done boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if not (public.is_dev(u) or public.role_of(u) is not null) then raise exception 'Nur für Dev-Konten und das Team.'; end if;
  update public.dev_reports r set done = dev_report_done.done,
    done_by = case when dev_report_done.done then (select p.username from public.profiles p where p.id = u) end
  where r.id = rid;
end;
$$;
revoke all on function public.dev_report_done(bigint, boolean) from public, anon;
grant execute on function public.dev_report_done(bigint, boolean) to authenticated;
