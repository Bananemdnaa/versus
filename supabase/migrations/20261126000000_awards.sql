-- Versus: Abzeichen im Profil
-- Die Abzeichen werden im Spiel vergeben (js/app.js, BADGES) und mit dem Konto abgeglichen (user_data).
-- Damit andere sie im Profil sehen, schickt das Spiel die verdienten mit set_awards an profiles.awards;
-- player_badges liefert sie mit (zusätzlich zu invited, role und look).
-- profiles.awards: { id: 'JJJJ-MM-TT', ... }, ids wie 'pro5' oder 'd30', höchstens 100 Stück.
-- Nur Aussehen, keine Vorteile im Spiel.

alter table public.profiles add column if not exists awards jsonb not null default '{}'::jsonb;

create or replace function public.set_awards(a jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); res jsonb := '{}'::jsonb; k text; v text; n integer := 0;
begin
  if u is null or exists (select 1 from public.profiles where id = u and guest) then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if a is null or jsonb_typeof(a) <> 'object' then a := '{}'::jsonb; end if;
  for k, v in select key, value #>> '{}' from jsonb_each(a) loop
    if k ~ '^[a-z0-9]{1,12}$' and v ~ '^\d{4}-\d{2}-\d{2}$' then
      res := res || jsonb_build_object(k, v); n := n + 1;
      exit when n >= 100;
    end if;
  end loop;
  update public.profiles set awards = res where id = u;
end;
$$;
revoke all on function public.set_awards(jsonb) from public, anon;
grant execute on function public.set_awards(jsonb) to authenticated;

create or replace function public.player_badges(name text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'invited', (select count(*) from public.profiles r
      where r.referred_by = (select id from public.profiles where username = lower(trim(name)))
        and not r.guest and not r.dev and not r.hidden),
    'role', (select public.role_of(p.id) from public.profiles p where p.username = lower(trim(name))),
    'look', (select p.look from public.profiles p where p.username = lower(trim(name))),
    'awards', (select p.awards from public.profiles p where p.username = lower(trim(name))));
$$;
revoke all on function public.player_badges(text) from public, anon;
grant execute on function public.player_badges(text) to authenticated;

-- das Team kann die Abzeichen eines Spielers zurücksetzen (z. B. bei offensichtlich gefälschten)
create or replace function public.admin_clear_awards(name text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  update public.profiles set awards = '{}'::jsonb where id = o;
  perform public.admin_note('note', lower(trim(name)), 'Abzeichen zurückgesetzt');
end;
$$;
revoke all on function public.admin_clear_awards(text) from public, anon;
grant execute on function public.admin_clear_awards(text) to authenticated;
