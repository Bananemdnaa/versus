-- Versus: Einstellung "Online-Status verbergen". Freunde sehen dann nicht, ob und was jemand gerade spielt.
-- Herausforderungen und Partien funktionieren ganz normal weiter; Admins sehen den Status weiterhin.
-- Einmal im Supabase SQL-Editor ausführen. Baut auf allen bisherigen Migrationen auf.

alter table public.profiles add column if not exists stealth boolean not null default false;

create or replace function public.set_stealth(hide boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  update public.profiles set stealth = coalesce(hide, false) where id = u;
end;
$$;
grant execute on function public.set_stealth(boolean) to authenticated;

-- Freundesliste: bei verborgenem Status kein "online", kein Spiel, kein "zuletzt gesehen"
create or replace function public.friends()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.me();
begin
  return jsonb_build_object(
    'friends', (select coalesce(jsonb_agg(jsonb_build_object(
        'username', p.username,
        'online', not p.stealth and p.last_seen > now() - interval '2 minutes',
        'seen', case when p.stealth then null else p.last_seen end,
        'game', case when p.stealth then null else p.current_game end,
        'busy', not p.stealth and exists (select 1 from public.matches m where m.status = 'live' and (m.a = p.id or m.b = p.id)))
        order by (not p.stealth and p.last_seen > now() - interval '2 minutes') desc, p.username), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = case when f.requester = u then f.addressee else f.requester end
      where f.status = 'accepted' and (f.requester = u or f.addressee = u)),
    'incoming', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.requester where f.addressee = u and f.status = 'pending'),
    'outgoing', (select coalesce(jsonb_agg(p.username order by f.created_at), '[]'::jsonb)
      from public.friendships f join public.profiles p on p.id = f.addressee where f.requester = u and f.status = 'pending'));
end;
$$;
