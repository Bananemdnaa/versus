-- Versus: Profil-Look (nur Aussehen, keine Vorteile im Spiel)
-- profiles.look: { c: Farbe, i: Avatar-Symbol, b: Banner-Muster, m: Spruch, g: Lieblingsspiel }
--   c: p y c g o v r w (Pink, Gelb, Cyan, Grün, Orange, Violett, Rot, Weiß)
--   i: 'ini' (Initialen) oder i0 … i19 (Symbole, Liste in js/look.js)
--   b: s d g w x p (Streifen, Punkte, Gitter, Wellen, Diagonale, schlicht)
--   m: bis 60 Zeichen, ohne verbotene Wörter (bad_name) und ohne Links
--   g: Spiel-ID
-- set_look(l) speichert den eigenen Look (nur Konten, keine Gäste), player_badges liefert ihn mit.

alter table public.profiles add column if not exists look jsonb not null default '{}'::jsonb;

create or replace function public.set_look(l jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); c text; i text; b text; m text; g text; res jsonb;
begin
  if u is null or exists (select 1 from public.profiles where id = u and guest) then raise exception 'Dafür brauchst du ein Konto.'; end if;
  if l is null or jsonb_typeof(l) <> 'object' then l := '{}'::jsonb; end if;
  c := l ->> 'c'; i := l ->> 'i'; b := l ->> 'b'; g := l ->> 'g';
  m := left(regexp_replace(trim(coalesce(l ->> 'm', '')), '\s+', ' ', 'g'), 60);
  if c is not null and c !~ '^[pycgovrw]$' then c := null; end if;
  if i is not null and i !~ '^(ini|i([0-9]|1[0-9]))$' then i := null; end if;
  if b is not null and b !~ '^[sdgwxp]$' then b := null; end if;
  if g is not null and g !~ '^[a-z0-9]{1,12}$' then g := null; end if;
  if m <> '' and (public.bad_name(m) or m ~* '(https?:|www\.|\.(com|de|net|org|gg|io)\y|discord\.gg)') then
    raise exception 'Dieser Spruch geht leider nicht.';
  end if;
  res := jsonb_strip_nulls(jsonb_build_object('c', c, 'i', i, 'b', b, 'm', nullif(m, ''), 'g', g));
  update public.profiles set look = res where id = u;
  return res;
end;
$$;
revoke all on function public.set_look(jsonb) from public, anon;
grant execute on function public.set_look(jsonb) to authenticated;

-- das Team kann einen unpassenden Spruch entfernen
create or replace function public.admin_clear_motto(name text)
returns void language plpgsql security definer set search_path = '' as $$
declare o uuid := public.uid_of(name);
begin
  perform public.require_admin();
  if o is null then raise exception 'Diesen Spieler gibt es nicht.'; end if;
  update public.profiles set look = look - 'm' where id = o;
  perform public.admin_note('note', lower(trim(name)), 'Spruch entfernt');
end;
$$;
revoke all on function public.admin_clear_motto(text) from public, anon;
grant execute on function public.admin_clear_motto(text) to authenticated;

create or replace function public.player_badges(name text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'invited', (select count(*) from public.profiles r
      where r.referred_by = (select id from public.profiles where username = lower(trim(name)))
        and not r.guest and not r.dev and not r.hidden),
    'role', (select public.role_of(p.id) from public.profiles p where p.username = lower(trim(name))),
    'look', (select p.look from public.profiles p where p.username = lower(trim(name))));
$$;
revoke all on function public.player_badges(text) from public, anon;
grant execute on function public.player_badges(text) to authenticated;
