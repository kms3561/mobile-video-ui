grant usage on schema public to anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

grant select on table public.media_posts to anon, authenticated;
grant insert, update, delete on table public.media_posts to authenticated;

grant select on table public.questions to anon, authenticated;
grant insert, update, delete on table public.questions to authenticated;

grant select on table public.question_replies to anon, authenticated;
grant insert, update, delete on table public.question_replies to authenticated;

grant select on table public.media_comments to anon, authenticated;
grant insert, update, delete on table public.media_comments to authenticated;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles
for select
to anon, authenticated
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

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
  generated_display_name text;
begin
  generated_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  generated_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(new.email, '@', 1), ''),
    generated_username
  );

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    generated_username,
    generated_display_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
