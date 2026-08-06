alter table public.profiles
drop constraint if exists profiles_username_length;

alter table public.profiles
add constraint profiles_username_length
check (char_length(username) between 3 and 20);

alter table public.profiles
drop constraint if exists profiles_username_format;

alter table public.profiles
add constraint profiles_username_format
check (username ~ '^[A-Za-z0-9_]+$');

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));
