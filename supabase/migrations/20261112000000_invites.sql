-- Versus: Einladungen. Wer über deinen Freundes-Link (?add=CODE) neu ein Konto erstellt, wird dein Freund und zählt
-- für dein Werber-Abzeichen ("hat 3 Spieler eingeladen"). Nur ein Abzeichen, keine Vorteile im Spiel.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen früheren Migrationen auf.

alter table public.profiles add column if not exists referred_by uuid references auth.users (id) on delete set null;
create index if not exists profiles_referred_idx on public.profiles (referred_by);

-- Freund per Code. Neu: nicht für Gäste und blockierte Spieler; ein Konto, das höchstens einen Tag alt ist und noch
-- von niemandem geworben wurde, zählt als eingeladen von dem, dessen Code es benutzt.
create or replace function public.friend_add_code(code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g')); o public.profiles; st text; n integer;
begin
  if public.is_guest(u) then raise exception 'Für Freunde brauchst du ein Konto.'; end if;
  select count(*) into n from public.friend_code_tries where uid = u and at > now() - interval '1 hour';
  if n >= 20 then raise exception 'Zu viele falsche Codes. Versuch es in einer Stunde nochmal.'; end if;
  select * into o from public.profiles where friend_code = c and char_length(c) = 6;
  if o.id is null then
    insert into public.friend_code_tries (uid) values (u);
    raise exception 'Diesen Code gibt es nicht. Vertippt?';
  end if;
  if o.id = u then raise exception 'Das ist dein eigener Code.'; end if;
  if public.blocked_between(u, o.id) then raise exception 'Das geht mit diesem Spieler nicht.'; end if;
  -- neues Konto über einen Einladungslink: zählt für das Werber-Abzeichen
  update public.profiles set referred_by = o.id
    where id = u and referred_by is null and created_at > now() - interval '1 day';
  select f.status into st from public.friendships f where (f.requester = u and f.addressee = o.id) or (f.requester = o.id and f.addressee = u) limit 1;
  if st = 'accepted' then return jsonb_build_object('username', o.username, 'status', 'friends'); end if;
  if st = 'pending' then
    update public.friendships set status = 'accepted' where (requester = u and addressee = o.id) or (requester = o.id and addressee = u);
    return jsonb_build_object('username', o.username, 'status', 'accepted');
  end if;
  select count(*) into n from public.friendships where requester = u or addressee = u;
  if n >= 150 then raise exception 'Du hast schon 150 Freunde und Anfragen.'; end if;
  insert into public.friendships (requester, addressee, status) values (u, o.id, 'accepted');
  return jsonb_build_object('username', o.username, 'status', 'accepted');
end;
$$;
revoke all on function public.friend_add_code(text) from public, anon;
grant execute on function public.friend_add_code(text) to authenticated;

-- Abzeichen eines Spielers: wie viele echte Konten er eingeladen hat (ohne Gäste, Dev-, ausgeblendete und gesperrte Konten)
create or replace function public.player_badges(name text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('invited', (
    select count(*) from public.profiles r
    where r.referred_by = (select id from public.profiles where username = lower(trim(name)))
      and not r.guest and not r.dev and not r.hidden));
$$;
revoke all on function public.player_badges(text) from public, anon;
grant execute on function public.player_badges(text) to authenticated;
