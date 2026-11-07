-- Mit Discord anmelden: ein Versus-Konto kann mit genau einem Discord-Konto verknüpft sein (und umgekehrt).
-- Die Edge Function "discord-login" prüft bei Discord, wer sich meldet, und ruft diese Funktionen mit dem
-- Service-Role-Schlüssel auf. Spieler sehen die Tabelle nie direkt, nur ihren eigenen Eintrag über my_discord().
-- pw: false, solange ein über Discord erstelltes Konto kein Passwort hat, das der Spieler kennt (dann kein Trennen).

create table if not exists public.discord_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  discord_id text not null unique,
  discord_name text,
  pw boolean not null default true,
  linked_at timestamptz not null default now()
);
alter table public.discord_links enable row level security;
revoke all on public.discord_links from public, anon, authenticated;

-- wer gehört zu dieser Discord-ID? (für den Login: die interne Adresse, mit der die Funktion die Sitzung erzeugt)
create or replace function public.discord_lookup(did text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'email', u.email, 'guest', coalesce(p.guest, false))
  from public.discord_links l join auth.users u on u.id = l.user_id left join public.profiles p on p.id = u.id
  where l.discord_id = did;
$$;
revoke all on function public.discord_lookup(text) from public, anon, authenticated;
grant execute on function public.discord_lookup(text) to service_role;

-- verknüpfen (Konto-Tab oder direkt nach dem Erstellen)
create or replace function public.discord_link(u uuid, did text, dname text, known boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(did, '') = '' then raise exception 'Discord-ID fehlt.'; end if;
  if public.is_guest(u) then raise exception 'Gäste können Discord nicht verknüpfen. Leg zuerst ein Konto an.'; end if;
  if exists (select 1 from public.discord_links where discord_id = did and user_id <> u) then
    raise exception 'Dieses Discord-Konto ist schon mit einem anderen Versus-Konto verknüpft.';
  end if;
  insert into public.discord_links (user_id, discord_id, discord_name, pw) values (u, did, left(dname, 40), known)
    on conflict (user_id) do update set discord_id = excluded.discord_id, discord_name = excluded.discord_name, linked_at = now();
end;
$$;
revoke all on function public.discord_link(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.discord_link(uuid, text, text, boolean) to service_role;

-- ein Gast (zum Beispiel aus der Discord-Aktivität) wird mit Discord zum richtigen Konto: Name wählen, kein Passwort
-- nötig (ein zufälliges, das niemand kennt). Seine Online-Partien und Freunde bleiben.
create or replace function public.discord_claim_guest(u uuid, new_name text, did text, dname text)
returns text language plpgsql security definer set search_path = '' as $$
declare nn text;
begin
  if not public.is_guest(u) then raise exception 'Du hast schon ein Konto.'; end if;
  if exists (select 1 from public.discord_links where discord_id = did) then
    raise exception 'Dieses Discord-Konto ist schon mit einem anderen Versus-Konto verknüpft.';
  end if;
  nn := public.rename_user_internal(u, new_name);
  update public.profiles set guest = false, hidden = false, name_changed_at = null where id = u;
  update auth.users set encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    is_anonymous = false, email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
    where id = u;
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u::text, u, jsonb_build_object('sub', u::text, 'email', nn || '@bananemdnaa.github.io', 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
  insert into public.discord_links (user_id, discord_id, discord_name, pw) values (u, did, left(dname, 40), false);
  return nn;
end;
$$;
revoke all on function public.discord_claim_guest(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.discord_claim_guest(uuid, text, text, text) to service_role;

-- für den Konto-Tab: mit welchem Discord-Namen bin ich verknüpft, und kenne ich ein Passwort?
create or replace function public.my_discord()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', discord_name, 'pw', pw, 'at', linked_at) from public.discord_links where user_id = auth.uid();
$$;
revoke all on function public.my_discord() from public, anon;
grant execute on function public.my_discord() to authenticated;

-- trennen: nur wer auch ohne Discord wieder hineinkommt (ein Passwort kennt)
create or replace function public.discord_unlink()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.discord_links where user_id = auth.uid() and not pw) then
    raise exception 'Leg zuerst ein Passwort fest, sonst kommst du ohne Discord nicht mehr in dein Konto.';
  end if;
  delete from public.discord_links where user_id = auth.uid();
end;
$$;
revoke all on function public.discord_unlink() from public, anon;
grant execute on function public.discord_unlink() to authenticated;

-- ein über Discord erstelltes Konto bekommt ein Passwort (zum Einloggen ohne Discord, Trennen und Löschen).
-- Nur solange noch keins festgelegt ist; danach geht ein neues Passwort wie bei allen über den Wiederherstellungscode.
create or replace function public.discord_set_password(new_pw text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  if not exists (select 1 from public.discord_links where user_id = u and not pw) then raise exception 'Du hast schon ein Passwort.'; end if;
  if char_length(coalesce(new_pw, '')) < 6 then raise exception 'Das Passwort ist zu kurz (mindestens 6 Zeichen).'; end if;
  if char_length(new_pw) > 72 then raise exception 'Das Passwort ist zu lang.'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_pw, extensions.gen_salt('bf')), updated_at = now() where id = u;
  update public.discord_links set pw = true where user_id = u;
end;
$$;
revoke all on function public.discord_set_password(text) from public, anon;
grant execute on function public.discord_set_password(text) to authenticated;
