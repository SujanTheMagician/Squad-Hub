-- Squad Hub v1.2: Admin role, batch + squad chat, notifications (in-app + push), analytics.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Roles: add "admin". Admin and Campus Manager have the same powers.
-- ---------------------------------------------------------------------------
alter table public.allowed_emails drop constraint if exists allowed_emails_role_check;
alter table public.allowed_emails add constraint allowed_emails_role_check
  check (role in ('student', 'squad_lead', 'campus_manager', 'admin'));
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'squad_lead', 'campus_manager', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'campus_manager')) $$;

create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'campus_manager', 'squad_lead')) $$;

create or replace function public.my_squad()
returns int
language sql stable security definer set search_path = ''
as $$ select squad from public.profiles where id = auth.uid() $$;

update public.allowed_emails set role = 'admin' where email = 'sujan.anandh.s93@kalvium.community';
update public.profiles       set role = 'admin' where email = 'sujan.anandh.s93@kalvium.community';
update public.allowed_emails set role = 'campus_manager' where email = 'saru.priya@kalvium.community';
update public.profiles       set role = 'campus_manager' where email = 'saru.priya@kalvium.community';

-- Members can read each other's profiles, but not push tokens (those stay server-side).
revoke select on public.profiles from authenticated;
grant select (id, email, full_name, squad, role, bio, skills, github, linkedin, leetcode, created_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Chat: one batch-wide room plus one room per squad.
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null check (channel in ('batch', '91', '92', '93')),
  author_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_channel_created_idx on public.messages (channel, created_at desc);

create function public.can_use_channel(ch text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member()
     and (ch = 'batch' or ch = public.my_squad()::text or public.is_admin())
$$;

alter table public.messages enable row level security;
create policy "read own rooms" on public.messages
  for select to authenticated using (public.can_use_channel(channel));
create policy "post in own rooms" on public.messages
  for insert to authenticated with check (author_id = auth.uid() and public.can_use_channel(channel));
create policy "delete own or moderate" on public.messages
  for delete to authenticated using (author_id = auth.uid() or public.is_moderator());
grant select, insert, delete on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications inbox
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  kind       text not null check (kind in ('post', 'announcement', 'comment')),
  title      text not null,
  body       text not null default '',
  post_id    uuid references public.posts on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clear own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

-- Live updates for chat and the notification badge.
alter publication supabase_realtime add table public.messages, public.notifications;

-- ---------------------------------------------------------------------------
-- Push: send through Expo's push service with pg_net (async HTTP from Postgres).
-- Delivery to Android also needs FCM credentials uploaded to EAS (see README).
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create function public.send_push(recipients uuid[], title text, body text, data jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  batch jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', p.push_token, 'title', title, 'body', left(body, 180),
           'data', data, 'channelId', 'default', 'sound', 'default'))
    into batch
    from public.profiles p
   where p.id = any(recipients) and p.push_token like 'ExponentPushToken%';

  if batch is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
end;
$$;

-- Everyone who should hear about something for a squad (null = whole batch). Admins always do.
create function public.audience(for_squad int, except_user uuid)
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(id), '{}')
    from public.profiles
   where id <> coalesce(except_user, '00000000-0000-0000-0000-000000000000')
     and (for_squad is null or squad = for_squad or role in ('admin', 'campus_manager'))
$$;

create function public.on_post_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who   uuid[] := public.audience(new.squad, new.author_id);
  label text := case new.type when 'note' then 'New note' when 'project' then 'New project'
                              when 'idea' then 'New idea' else 'New resource' end;
  name  text := (select full_name from public.profiles where id = new.author_id);
  head  text := label || ' from ' || coalesce(name, 'a member');
begin
  insert into public.notifications (user_id, kind, title, body, post_id)
  select u, 'post', head, new.title, new.id from unnest(who) as u;
  perform public.send_push(who, head, new.title, jsonb_build_object('url', '/post/' || new.id));
  return new;
end;
$$;
create trigger post_created after insert on public.posts
  for each row execute function public.on_post_created();

create function public.on_announcement_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who uuid[] := public.audience(null, new.author_id);
begin
  insert into public.notifications (user_id, kind, title, body)
  select u, 'announcement', 'Announcement: ' || new.title, new.body from unnest(who) as u;
  perform public.send_push(who, 'Announcement: ' || new.title, new.body, jsonb_build_object('url', '/'));
  return new;
end;
$$;
create trigger announcement_created after insert on public.announcements
  for each row execute function public.on_announcement_created();

create function public.on_comment_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid;
  post_title text;
  name text := (select full_name from public.profiles where id = new.author_id);
begin
  select author_id, title into owner, post_title from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into public.notifications (user_id, kind, title, body, post_id)
    values (owner, 'comment', coalesce(name, 'Someone') || ' commented on ' || post_title, new.body, new.post_id);
    perform public.send_push(array[owner], coalesce(name, 'Someone') || ' commented', new.body,
                             jsonb_build_object('url', '/post/' || new.post_id));
  end if;
  return new;
end;
$$;
create trigger comment_created after insert on public.comments
  for each row execute function public.on_comment_created();

-- Chat messages only push (no inbox row), so busy rooms don't flood the inbox.
create function public.on_message_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who  uuid[] := public.audience(case when new.channel = 'batch' then null else new.channel::int end, new.author_id);
  name text := (select full_name from public.profiles where id = new.author_id);
  room text := case when new.channel = 'batch' then 'Batch chat' else 'Squad ' || new.channel || ' chat' end;
begin
  perform public.send_push(who, room, coalesce(name, 'Someone') || ': ' || new.body,
                           jsonb_build_object('url', '/chat/' || new.channel));
  return new;
end;
$$;
create trigger message_created after insert on public.messages
  for each row execute function public.on_message_created();

-- ---------------------------------------------------------------------------
-- Analytics for Admin / Campus Manager
-- ---------------------------------------------------------------------------
create function public.batch_analytics()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Admin or Campus Manager can view analytics';
  end if;

  return jsonb_build_object(
    'members', (
      select jsonb_agg(row_to_json(m) order by m.squad)
        from (select a.squad,
                     count(*)::int as invited,
                     count(p.id)::int as joined
                from public.allowed_emails a
                left join public.profiles p on p.email = a.email
               where a.squad is not null
               group by a.squad) m),
    'posts_by_type', (
      select coalesce(jsonb_object_agg(type, n), '{}') from (select type, count(*)::int n from public.posts group by type) t),
    'posts_by_squad', (
      select jsonb_agg(row_to_json(s) order by s.squad)
        from (select pr.squad, count(*)::int as posts
                from public.posts po join public.profiles pr on pr.id = po.author_id
               where pr.squad is not null
               group by pr.squad) s),
    'daily', (
      select jsonb_agg(jsonb_build_object('day', d::date, 'posts',
               (select count(*) from public.posts where created_at::date = d::date),
               'messages', (select count(*) from public.messages where created_at::date = d::date)) order by d)
        from generate_series(current_date - 13, current_date, interval '1 day') d),
    'active_7d', (
      select count(distinct uid)::int from (
        select author_id uid from public.posts where created_at > now() - interval '7 days'
        union select author_id from public.comments where created_at > now() - interval '7 days'
        union select author_id from public.messages where created_at > now() - interval '7 days') x),
    'totals', jsonb_build_object(
      'posts', (select count(*) from public.posts),
      'comments', (select count(*) from public.comments),
      'messages', (select count(*) from public.messages),
      'votes', (select count(*) from public.votes)),
    'top_contributors', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
        select pr.full_name, pr.squad,
               (select count(*) from public.posts where author_id = pr.id)::int as posts,
               (select count(*) from public.comments where author_id = pr.id)::int as comments
          from public.profiles pr
         order by 3 desc, 4 desc
         limit 5) t)
  );
end;
$$;
grant execute on function public.batch_analytics() to authenticated;
