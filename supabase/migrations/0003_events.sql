-- Squad Hub v1.3: deadlines & events calendar.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null default auth.uid() references public.profiles on delete cascade,
  title       text not null check (char_length(title) between 1 and 140),
  description text not null default '',
  kind        text not null default 'event' check (kind in ('deadline', 'exam', 'hackathon', 'class', 'event')),
  squad       int check (squad in (91, 92, 93)),          -- null = whole batch
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at);

alter table public.events enable row level security;
create policy "members read their events" on public.events
  for select to authenticated
  using (public.is_member() and (squad is null or squad = public.my_squad() or public.is_admin()));
create policy "moderators add events" on public.events
  for insert to authenticated with check (created_by = auth.uid() and public.is_moderator());
create policy "moderators edit events" on public.events
  for update to authenticated using (public.is_moderator()) with check (public.is_moderator());
create policy "moderators remove events" on public.events
  for delete to authenticated using (public.is_moderator());
grant select, insert, delete on public.events to authenticated;
grant update (title, description, kind, squad, starts_at) on public.events to authenticated;

-- Events show up in the notification inbox too.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('post', 'announcement', 'comment', 'event'));

create function public.on_event_created()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  who  uuid[] := public.audience(new.squad, new.created_by);
  head text := 'New ' || new.kind || ': ' || new.title;
  info text := to_char(new.starts_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM');
begin
  insert into public.notifications (user_id, kind, title, body)
  select u, 'event', head, info from unnest(who) as u;
  perform public.send_push(who, head, info, jsonb_build_object('url', '/events'));
  return new;
end;
$$;
create trigger event_created after insert on public.events
  for each row execute function public.on_event_created();
