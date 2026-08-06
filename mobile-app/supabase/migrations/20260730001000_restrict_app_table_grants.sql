revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.media_posts from anon, authenticated;
revoke all privileges on table public.questions from anon, authenticated;
revoke all privileges on table public.question_replies from anon, authenticated;
revoke all privileges on table public.media_comments from anon, authenticated;

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
