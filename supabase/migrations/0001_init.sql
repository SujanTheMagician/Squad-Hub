-- Squad Hub schema: Kalvium @ AMET, Squads 91, 92, 93.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Allowlist: only these emails can sign up.
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email      text primary key check (email = lower(email)),
  full_name  text not null,
  squad      int check (squad in (91, 92, 93)),          -- null for the Campus Manager
  role       text not null default 'student'
             check (role in ('student', 'squad_lead', 'campus_manager')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: one per signed-up member, copied from the allowlist on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null unique,
  full_name  text not null,
  squad      int check (squad in (91, 92, 93)),
  role       text not null default 'student'
             check (role in ('student', 'squad_lead', 'campus_manager')),
  bio        text,
  skills     text[] not null default '{}',
  github     text,
  linkedin   text,
  leetcode   text,
  push_token text,
  created_at timestamptz not null default now()
);

-- Block signups from emails that are not on the allowlist, and create the profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  invite public.allowed_emails%rowtype;
begin
  select * into invite from public.allowed_emails where email = lower(new.email);
  if not found then
    raise exception 'Email % is not on the Squad Hub allowlist', new.email;
  end if;

  insert into public.profiles (id, email, full_name, squad, role)
  values (new.id, lower(new.email), invite.full_name, invite.squad, invite.role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so policies can call them without recursion).
create function public.is_member()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid()) $$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'campus_manager') $$;

create function public.is_moderator()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('campus_manager', 'squad_lead')) $$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  type       text not null check (type in ('note', 'project', 'idea', 'resource')),
  title      text not null check (char_length(title) between 1 and 140),
  body       text not null default '',
  subject    text,
  tags       text[] not null default '{}',
  squad      int check (squad in (91, 92, 93)),          -- null = visible as "all squads"
  link_url   text,                                       -- Drive / article / demo link
  github_url text,
  file_path  text,                                       -- path inside the "uploads" bucket
  file_name  text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_type_created_idx on public.posts (type, created_at desc);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.votes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  primary key (post_id, user_id)
);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  title      text not null,
  body       text not null default '',
  created_at timestamptz not null default now()
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts on delete cascade,
  comment_id  uuid references public.comments on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  reason      text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Feed view with author and counts. security_invoker keeps the posts RLS in force.
create view public.post_feed with (security_invoker = on) as
select
  p.*,
  a.full_name as author_name,
  a.squad     as author_squad,
  (select count(*) from public.votes v where v.post_id = p.id)::int    as vote_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
  exists (select 1 from public.votes v where v.post_id = p.id and v.user_id = auth.uid())         as voted,
  exists (select 1 from public.bookmarks b where b.post_id = p.id and b.user_id = auth.uid())     as bookmarked
from public.posts p
join public.profiles a on a.id = p.author_id;

-- Moderators pin/unpin posts (authors cannot pin their own).
create function public.set_pinned(post uuid, value boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only the Campus Manager or squad leads can pin posts';
  end if;
  update public.posts set pinned = value where id = post;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.allowed_emails enable row level security;
alter table public.profiles       enable row level security;
alter table public.posts          enable row level security;
alter table public.comments       enable row level security;
alter table public.votes          enable row level security;
alter table public.bookmarks      enable row level security;
alter table public.announcements  enable row level security;
alter table public.reports        enable row level security;

create policy "admin manages allowlist" on public.allowed_emails
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members read profiles" on public.profiles
  for select to authenticated using (public.is_member());
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members read posts" on public.posts
  for select to authenticated using (public.is_member());
create policy "members create posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid() and public.is_member());
create policy "authors edit posts" on public.posts
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors or moderators delete posts" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_moderator());

create policy "members read comments" on public.comments
  for select to authenticated using (public.is_member());
create policy "members comment" on public.comments
  for insert to authenticated with check (author_id = auth.uid() and public.is_member());
create policy "authors or moderators delete comments" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_moderator());

create policy "members read votes" on public.votes
  for select to authenticated using (public.is_member());
create policy "vote as self" on public.votes
  for insert to authenticated with check (user_id = auth.uid() and public.is_member());
create policy "unvote as self" on public.votes
  for delete to authenticated using (user_id = auth.uid());

create policy "own bookmarks" on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read announcements" on public.announcements
  for select to authenticated using (public.is_member());
create policy "admin posts announcements" on public.announcements
  for insert to authenticated with check (public.is_admin());
create policy "admin deletes announcements" on public.announcements
  for delete to authenticated using (public.is_admin());

create policy "members report" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and public.is_member());
create policy "moderators read reports" on public.reports
  for select to authenticated using (public.is_moderator());
create policy "moderators resolve reports" on public.reports
  for update to authenticated using (public.is_moderator());

-- Supabase table grants are opt-in: grant only what the policies above allow.
grant select, insert, delete on public.allowed_emails to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, bio, skills, github, linkedin, leetcode, push_token) on public.profiles to authenticated;
grant select, insert, delete on public.posts to authenticated;
grant update (title, body, subject, tags, squad, link_url, github_url, file_path, file_name) on public.posts to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.votes to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert, delete on public.announcements to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select on public.post_feed to authenticated;
grant execute on function public.set_pinned(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private "uploads" bucket; files live under <user id>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 10485760)   -- 10 MB per file
on conflict (id) do nothing;

create policy "members read uploads" on storage.objects
  for select to authenticated using (bucket_id = 'uploads' and public.is_member());
create policy "members upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy "delete own uploads" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
