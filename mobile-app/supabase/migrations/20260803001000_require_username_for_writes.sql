create or replace function public.has_completed_username_setup()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and username ~ '^[A-Za-z0-9_]{3,20}$'
      and username !~ '^user_[a-f0-9]{12}$'
  );
$$;

drop policy if exists "Authenticated users can create media posts" on public.media_posts;
create policy "Authenticated users can create media posts"
on public.media_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.has_completed_username_setup()
);

drop policy if exists "Authenticated users can create questions" on public.questions;
create policy "Authenticated users can create questions"
on public.questions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.has_completed_username_setup()
);

drop policy if exists "Authenticated users can create question replies" on public.question_replies;
create policy "Authenticated users can create question replies"
on public.question_replies
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.has_completed_username_setup()
);

drop policy if exists "Authenticated users can create media comments" on public.media_comments;
create policy "Authenticated users can create media comments"
on public.media_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.has_completed_username_setup()
);

drop policy if exists "Authenticated users can upload media files" on storage.objects;
create policy "Authenticated users can upload media files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.has_completed_username_setup()
);
