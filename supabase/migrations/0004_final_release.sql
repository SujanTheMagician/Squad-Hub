-- Squad Hub v1.4 (final release): profile details and photos, students directory, push on every device,
-- app-update and birthday notifications, doubts with accepted answers, leaderboard, account deletion,
-- in-app error log, 25 MB uploads.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Profile details. Phone and birthday are private: only the member, the Admin and the
-- Campus Manager can read them (through the functions below, never the table).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column phone              text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  add column birthday           date,
  add column avatar_url         text,
  add column celebrate_birthday boolean not null default true,
  add column notify_posts       boolean not null default true,
  add column notify_chat        boolean not null default true,
  add column onboarded_at       timestamptz,
  add column last_seen_at       timestamptz;

grant select (avatar_url, celebrate_birthday, notify_posts, notify_chat, onboarded_at) on public.profiles to authenticated;
grant update (phone, birthday, avatar_url, celebrate_birthday, notify_posts, notify_chat, onboarded_at)
  on public.profiles to authenticated;

create function public.my_private_profile()
returns jsonb
language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('phone', phone, 'birthday', birthday) from public.profiles where id = auth.uid() $$;
grant execute on function public.my_private_profile() to authenticated;

create function public.touch_last_seen()
returns void
language sql security definer set search_path = ''
as $$ update public.profiles set last_seen_at = now() where id = auth.uid() $$;
grant execute on function public.touch_last_seen() to authenticated;

-- Profile photos: public bucket (so images load fast everywhere), files under <user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])  -- 2 MB
on conflict (id) do nothing;

create policy "members list avatars" on storage.objects
  for select to authenticated using (bucket_id = 'avatars' and public.is_member());
create policy "members upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy "members delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Bigger attachments: 25 MB per file.
update storage.buckets set file_size_limit = 26214400 where id = 'uploads';

-- ---------------------------------------------------------------------------
-- Students directory. Everyone sees joined members' public profiles; the Admin and
-- Campus Manager also see phone, birthday, last seen and who hasn't joined yet.
-- ---------------------------------------------------------------------------
create function public.member_directory()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.is_admin() then
    return (
      select coalesce(jsonb_agg(row_to_json(m) order by m.squad nulls first, m.full_name), '[]')
        from (select p.id,
                     coalesce(p.email, a.email)          as email,
                     coalesce(p.full_name, a.full_name)  as full_name,
                     coalesce(p.squad, a.squad)          as squad,
                     coalesce(p.role, a.role)            as role,
                     p.avatar_url, p.bio, coalesce(p.skills, '{}') as skills,
                     p.phone, p.birthday, p.last_seen_at,
                     p.created_at                        as joined_at,
                     p.id is not null                    as joined
                from public.allowed_emails a
                full join public.profiles p on p.email = a.email) m);
  end if;

  if not public.is_member() then
    raise exception 'Only Squad Hub members can see the students list';
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(m) order by m.squad nulls first, m.full_name), '[]')
      from (select id, email, full_name, squad, role, avatar_url, bio, skills, true as joined
              from public.profiles) m);
end;
$$;
grant execute on function public.member_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- Push: one row per device, so every phone a member signs in on gets alerts.
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;  -- no policies: only the functions below touch it

insert into public.push_tokens (token, user_id)
select push_token, id from public.profiles where push_token like 'ExponentPushToken%'
on conflict (token) do nothing;

create function public.register_push_token(new_token text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.push_tokens (token, user_id)
  select new_token, auth.uid() where public.is_member() and new_token like 'ExponentPushToken%'
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
$$;

create function public.unregister_push_token(old_token text)
returns void
language sql security definer set search_path = ''
as $$ delete from public.push_tokens where token = old_token and user_id = auth.uid() $$;

grant execute on function public.register_push_token(text), public.unregister_push_token(text) to authenticated;

-- Send to every device of every recipient, 100 messages per request (Expo's limit).
create or replace function public.send_push(recipients uuid[], title text, body text, data jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  messages jsonb;
  total    int;
  i        int := 0;
begin
  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', title, 'body', left(body, 180),
           'data', data, 'channelId', 'default', 'sound', 'default'))
    into messages
    from public.push_tokens t
   where t.user_id = any(recipients);

  total := coalesce(jsonb_array_length(messages), 0);
  while i < total loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (select jsonb_agg(m.value order by m.n)
                 from jsonb_array_elements(messages) with ordinality as m(value, n)
                where m.n > i and m.n <= i + 100),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    i := i + 100;
  end loop;
end;
$$;

-- Members who haven't muted this kind of alert.
create function public.wants_push(recipients uuid[], kind text)
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(id), '{}')
    from public.profiles
   where id = any(recipients)
     and case kind when 'chat' then notify_chat when 'posts' then notify_posts else true end
$$;

-- ---------------------------------------------------------------------------
-- Notification kinds for this release.
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('post', 'announcement', 'comment', 'event', 'answer', 'birthday', 'update'));

-- ---------------------------------------------------------------------------
-- Doubts: a new post type; the author accepts the comment that solved it.
-- ---------------------------------------------------------------------------
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('note', 'project', 'idea', 'resource', 'doubt'));
alter table public.posts add column accepted_comment_id uuid references public.comments on delete set null;

-- The feed view expands p.* when created, so rebuild it to pick up the new column and author photos.
drop view public.post_feed;
create view public.post_feed with (security_invoker = on) as
select
  p.*,
  a.full_name  as author_name,
  a.squad      as author_squad,
  a.avatar_url as author_avatar,
  (select count(*) from public.votes v where v.post_id = p.id)::int    as vote_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
  exists (select 1 from public.votes v where v.post_id = p.id and v.user_id = auth.uid())         as voted,
  exists (select 1 from public.bookmarks b where b.post_id = p.id and b.user_id = auth.uid())     as bookmarked
from public.posts p
join public.profiles a on a.id = p.author_id;
grant select on public.post_feed to authenticated;

create function public.accept_answer(post uuid, answer uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target    public.posts%rowtype;
  responder uuid;
begin
  select * into target from public.posts where id = post;
  if target.author_id is distinct from auth.uid() then
    raise exception 'Only the person who asked can accept an answer';
  end if;

  if answer is null then
    update public.posts set accepted_comment_id = null where id = post;
    return;
  end if;

  select author_id into responder from public.comments where id = answer and post_id = post;
  if responder is null then
    raise exception 'That answer is not on this post';
  end if;

  update public.posts set accepted_comment_id = answer where id = post;
  if responder <> auth.uid() then
    insert into public.notifications (user_id, kind, title, body, post_id)
    values (responder, 'answer', 'Your answer was accepted ✅', target.title, post);
    perform public.send_push(array[responder], 'Your answer was accepted ✅', target.title,
                             jsonb_build_object('url', '/post/' || post));
  end if;
end;
$$;
grant execute on function public.accept_answer(uuid, uuid) to authenticated;

-- New posts: inbox for everyone in the audience, push only for those who haven't muted posts.
create or replace function public.on_post_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who   uuid[] := public.audience(new.squad, new.author_id);
  label text := case new.type when 'note' then 'New note' when 'project' then 'New project'
                              when 'idea' then 'New idea' when 'doubt' then 'New doubt' else 'New resource' end;
  name  text := (select full_name from public.profiles where id = new.author_id);
  head  text := label || ' from ' || coalesce(name, 'a member');
begin
  insert into public.notifications (user_id, kind, title, body, post_id)
  select u, 'post', head, new.title, new.id from unnest(who) as u;
  perform public.send_push(public.wants_push(who, 'posts'), head, new.title, jsonb_build_object('url', '/post/' || new.id));
  return new;
end;
$$;

create or replace function public.on_message_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who  uuid[] := public.audience(case when new.channel = 'batch' then null else new.channel::int end, new.author_id);
  name text := (select full_name from public.profiles where id = new.author_id);
  room text := case when new.channel = 'batch' then 'Batch chat' else 'Squad ' || new.channel || ' chat' end;
begin
  perform public.send_push(public.wants_push(who, 'chat'), room, coalesce(name, 'Someone') || ': ' || new.body,
                           jsonb_build_object('url', '/chat/' || new.channel));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- "Squad Hub updated" alert, sent by GitHub Actions after an over-the-air update.
-- Only the service role (the GitHub secret) can call it.
-- ---------------------------------------------------------------------------
create function public.notify_app_update(message text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  who uuid[] := public.audience(null, null);
begin
  insert into public.notifications (user_id, kind, title, body)
  select u, 'update', 'Squad Hub updated ✨', message from unnest(who) as u;
  perform public.send_push(who, 'Squad Hub updated ✨', message, jsonb_build_object('url', '/about'));
end;
$$;
revoke execute on function public.notify_app_update(text) from public, anon, authenticated;
grant execute on function public.notify_app_update(text) to service_role;

-- ---------------------------------------------------------------------------
-- Birthday wishes, every day at 8:00 AM IST (02:30 UTC). Members can opt out.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

create function public.send_birthday_wishes()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  person record;
  who    uuid[];
begin
  for person in
    select id, full_name from public.profiles
     where celebrate_birthday and birthday is not null
       and to_char(birthday, 'MM-DD') = to_char(now() at time zone 'Asia/Kolkata', 'MM-DD')
  loop
    who := public.audience(null, person.id);
    insert into public.notifications (user_id, kind, title, body)
    select u, 'birthday', 'Today is ' || person.full_name || '''s birthday 🎂', 'Send a wish in the batch chat!'
      from unnest(who) as u;
    perform public.send_push(who, 'Today is ' || person.full_name || '''s birthday 🎂', 'Send a wish in the batch chat!',
                             jsonb_build_object('url', '/chat/batch'));

    insert into public.notifications (user_id, kind, title, body)
    values (person.id, 'birthday', 'Happy birthday, ' || split_part(person.full_name, ' ', 1) || '! 🎉',
            'From everyone in Squads 91, 92 and 93.');
    perform public.send_push(array[person.id], 'Happy birthday, ' || split_part(person.full_name, ' ', 1) || '! 🎉',
                             'From everyone in Squads 91, 92 and 93.', jsonb_build_object('url', '/'));
  end loop;
end;
$$;
revoke execute on function public.send_birthday_wishes() from public, anon, authenticated;

select cron.schedule('birthday-wishes', '30 2 * * *', 'select public.send_birthday_wishes()');

-- ---------------------------------------------------------------------------
-- Leaderboard: posts 10, likes received 3, comments 1, accepted answers 15.
-- Pass days => 7 for this week, or null for all time.
-- ---------------------------------------------------------------------------
create function public.leaderboard(days int default null)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with since as (
    select case when days is null then '-infinity'::timestamptz else now() - make_interval(days => days) end as t
  ),
  scores as (
    select pr.id, pr.full_name, pr.squad, pr.avatar_url,
           (select count(*) from public.posts p, since
             where p.author_id = pr.id and p.created_at > since.t)::int as posts,
           (select count(*) from public.votes v join public.posts p on p.id = v.post_id, since
             where p.author_id = pr.id and v.user_id <> pr.id and p.created_at > since.t)::int as likes,
           (select count(*) from public.comments c, since
             where c.author_id = pr.id and c.created_at > since.t)::int as comments,
           (select count(*) from public.posts p join public.comments c on c.id = p.accepted_comment_id, since
             where c.author_id = pr.id and p.author_id <> pr.id and c.created_at > since.t)::int as answers
      from public.profiles pr
     where public.is_member()
  ),
  ranked as (
    select *, posts * 10 + likes * 3 + comments + answers * 15 as points from scores
  )
  select jsonb_build_object(
    'people', (select coalesce(jsonb_agg(row_to_json(r) order by r.points desc, r.full_name), '[]')
                 from (select * from ranked where points > 0 order by points desc, full_name limit 50) r),
    'squads', (select coalesce(jsonb_agg(row_to_json(s) order by s.points desc), '[]')
                 from (select squad, sum(points)::int as points, (count(*) filter (where points > 0))::int as active
                         from ranked where squad is not null group by squad) s)
  )
$$;
grant execute on function public.leaderboard(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Delete my account: removes the login, profile, posts, comments and messages.
-- The app deletes the member's files through the Storage API first.
-- ---------------------------------------------------------------------------
create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Crash and error log: the app reports errors here; the Admin / CM read them in Analytics.
-- ---------------------------------------------------------------------------
create table public.app_errors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid() references public.profiles on delete set null,
  message     text not null check (char_length(message) <= 2000),
  stack       text check (char_length(stack) <= 8000),
  fatal       boolean not null default false,
  app_version text,
  platform    text,
  created_at  timestamptz not null default now()
);
create index app_errors_created_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;
create policy "members report errors" on public.app_errors
  for insert to authenticated with check (user_id = auth.uid());
create policy "admin reads errors" on public.app_errors
  for select to authenticated using (public.is_admin());
create policy "admin clears errors" on public.app_errors
  for delete to authenticated using (public.is_admin());
grant select, insert, delete on public.app_errors to authenticated;

-- Storage used, for the Analytics screen (free plan: 1 GB).
create function public.storage_usage()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Admin or Campus Manager can view storage usage';
  end if;
  return (
    select coalesce(jsonb_object_agg(bucket_id, bytes), '{}')
      from (select bucket_id, sum((metadata->>'size')::bigint)::bigint as bytes
              from storage.objects where bucket_id in ('uploads', 'avatars') group by bucket_id) s);
end;
$$;
grant execute on function public.storage_usage() to authenticated;
