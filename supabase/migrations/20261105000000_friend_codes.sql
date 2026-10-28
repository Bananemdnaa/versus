-- Versus: Freundescodes. Jeder hat einen kurzen Code (z. B. K7M2QX), als QR-Code und Link teilbar.
-- Wer den Code eingibt oder scannt, ist sofort befreundet (der Code ist die Zustimmung des Besitzers).
-- Dazu meldet my_pending neue Anfragen und neue Freunde, damit die App Bescheid geben kann.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.profiles add column if not exists friend_code text;
create unique index if not exists profiles_friend_code_idx on public.profiles (friend_code);

-- fehlgeschlagene Code-Eingaben, gegen Durchprobieren
create table if not exists public.friend_code_tries (
  uid uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists friend_code_tries_idx on public.friend_code_tries (uid, at);
alter table public.friend_code_tries enable row level security;   -- nur über die Funktionen unten

-- eigener Code; renew = true erstellt einen neuen (alte Links und QR-Codes gelten dann nicht mehr)
create or replace function public.my_friend_code(renew boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i integer;
begin
  select friend_code into c from public.profiles where id = u;
  if c is not null and not coalesce(renew, false) then return c; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::integer, 1); end loop;
    exit when not exists (select 1 from public.profiles where friend_code = c);
  end loop;
  update public.profiles set friend_code = c where id = u;
  return c;
end;
$$;
revoke all on function public.my_friend_code(boolean) from public, anon;
grant execute on function public.my_friend_code(boolean) to authenticated;

-- mit Code befreunden: offene Anfragen werden angenommen, sonst entsteht direkt eine Freundschaft
create or replace function public.friend_add_code(code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me(); c text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g')); o public.profiles; st text; n integer;
begin
  select count(*) into n from public.friend_code_tries where uid = u and at > now() - interval '1 hour';
  if n >= 20 then raise exception 'Zu viele falsche Codes. Versuch es in einer Stunde nochmal.'; end if;
  select * into o from public.profiles where friend_code = c and char_length(c) = 6;
  if o.id is null then
    insert into public.friend_code_tries (uid) values (u);
    raise exception 'Diesen Code gibt es nicht. Vertippt?';
  end if;
  if o.id = u then raise exception 'Das ist dein eigener Code.'; end if;
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

-- Menü: zusätzlich der Name der neuesten Anfrage und die Zahl der Freunde
create or replace function public.my_pending()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  perform public.match_sweep();
  return jsonb_build_object(
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a where m.b = u and m.status = 'invited'),
    'open', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', p.username, 'game', m.game, 'opts', m.opts, 'at', m.created_at) order by m.created_at desc), '[]'::jsonb)
      from public.matches m join public.profiles p on p.id = m.a
      where m.b is null and m.status = 'invited' and m.a <> u and not p.hidden),
    'active', (select jsonb_build_object('id', m.id, 'game', m.game, 'opponent', (select username from public.profiles where id = case when m.a = u then m.b else m.a end))
      from public.matches m where m.status = 'live' and (m.a = u or m.b = u) limit 1),
    'requests', (select count(*) from public.friendships where addressee = u and status = 'pending'),
    'req_from', (select p.username from public.friendships f join public.profiles p on p.id = f.requester
      where f.addressee = u and f.status = 'pending' order by f.created_at desc limit 1),
    'friend_n', (select count(*) from public.friendships where (requester = u or addressee = u) and status = 'accepted'));
end;
$$;
