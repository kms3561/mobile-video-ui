create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 32),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null,
  file_url text not null,
  thumbnail_url text,
  caption text not null,
  created_at timestamptz not null default now(),
  constraint media_posts_media_type_check check (media_type in ('video', 'image', 'audio'))
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.media_comments (
  id uuid primary key default gen_random_uuid(),
  media_post_id uuid not null references public.media_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists media_posts_created_at_idx on public.media_posts(created_at desc);
create index if not exists media_posts_user_id_idx on public.media_posts(user_id);
create index if not exists questions_created_at_idx on public.questions(created_at desc);
create index if not exists questions_user_id_idx on public.questions(user_id);
create index if not exists question_replies_question_id_created_at_idx on public.question_replies(question_id, created_at asc);
create index if not exists question_replies_user_id_idx on public.question_replies(user_id);
create index if not exists media_comments_media_post_id_created_at_idx on public.media_comments(media_post_id, created_at asc);
create index if not exists media_comments_user_id_idx on public.media_comments(user_id);

alter table public.profiles enable row level security;
alter table public.media_posts enable row level security;
alter table public.questions enable row level security;
alter table public.question_replies enable row level security;
alter table public.media_comments enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles
for select
using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "Media posts are readable by everyone" on public.media_posts;
create policy "Media posts are readable by everyone"
on public.media_posts
for select
using (true);

drop policy if exists "Authenticated users can create media posts" on public.media_posts;
create policy "Authenticated users can create media posts"
on public.media_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own media posts" on public.media_posts;
create policy "Users can update their own media posts"
on public.media_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own media posts" on public.media_posts;
create policy "Users can delete their own media posts"
on public.media_posts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Questions are readable by everyone" on public.questions;
create policy "Questions are readable by everyone"
on public.questions
for select
using (true);

drop policy if exists "Authenticated users can create questions" on public.questions;
create policy "Authenticated users can create questions"
on public.questions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own questions" on public.questions;
create policy "Users can update their own questions"
on public.questions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own questions" on public.questions;
create policy "Users can delete their own questions"
on public.questions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Question replies are readable by everyone" on public.question_replies;
create policy "Question replies are readable by everyone"
on public.question_replies
for select
using (true);

drop policy if exists "Authenticated users can create question replies" on public.question_replies;
create policy "Authenticated users can create question replies"
on public.question_replies
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own question replies" on public.question_replies;
create policy "Users can update their own question replies"
on public.question_replies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own question replies" on public.question_replies;
create policy "Users can delete their own question replies"
on public.question_replies
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Media comments are readable by everyone" on public.media_comments;
create policy "Media comments are readable by everyone"
on public.media_comments
for select
using (true);

drop policy if exists "Authenticated users can create media comments" on public.media_comments;
create policy "Authenticated users can create media comments"
on public.media_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own media comments" on public.media_comments;
create policy "Users can update their own media comments"
on public.media_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own media comments" on public.media_comments;
create policy "Users can delete their own media comments"
on public.media_comments
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Media files are readable by everyone" on storage.objects;
create policy "Media files are readable by everyone"
on storage.objects
for select
using (bucket_id = 'media');

drop policy if exists "Authenticated users can upload media files" on storage.objects;
create policy "Authenticated users can upload media files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own media files" on storage.objects;
create policy "Users can update their own media files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own media files" on storage.objects;
create policy "Users can delete their own media files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
