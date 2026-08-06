const fs = require('node:fs');
const path = require('node:path');

const initialMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260728000000_initial_database_foundation.sql',
);
const mimeMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260729000000_expand_media_bucket_mime_types.sql',
);
const grantsMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260730000000_fix_profile_privileges_and_signup_trigger.sql',
);
const restrictedGrantsMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260730001000_restrict_app_table_grants.sql',
);
const usernameRulesMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260803000000_enforce_profile_username_rules.sql',
);
const usernameWritesMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260803001000_require_username_for_writes.sql',
);
const bucketLimitMigration = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260805000000_increase_media_bucket_limit.sql',
);

const sql = fs.readFileSync(initialMigration, 'utf8');
const mimeSql = fs.readFileSync(mimeMigration, 'utf8');
const grantsSql = fs.readFileSync(grantsMigration, 'utf8');
const restrictedGrantsSql = fs.readFileSync(restrictedGrantsMigration, 'utf8');
const usernameRulesSql = fs.readFileSync(usernameRulesMigration, 'utf8');
const usernameWritesSql = fs.readFileSync(usernameWritesMigration, 'utf8');
const bucketLimitSql = fs.readFileSync(bucketLimitMigration, 'utf8');

const requiredSnippets = [
  'create table if not exists public.profiles',
  'create table if not exists public.media_posts',
  'create table if not exists public.questions',
  'create table if not exists public.question_replies',
  'create table if not exists public.media_comments',
  'alter table public.profiles enable row level security',
  'alter table public.media_posts enable row level security',
  'alter table public.questions enable row level security',
  'alter table public.question_replies enable row level security',
  'alter table public.media_comments enable row level security',
  "insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)",
  "bucket_id = 'media'",
];

const missing = requiredSnippets.filter((snippet) => !sql.includes(snippet));

if (missing.length > 0) {
  console.error('Missing required SQL snippets:');
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

const stripped = sql
  .replace(/--.*$/gm, '')
  .replace(/'([^']|'')*'/g, "''")
  .trim();

const pairs = [
  ['(', ')'],
  ['[', ']'],
];

for (const [open, close] of pairs) {
  let depth = 0;
  for (const char of stripped) {
    if (char === open) {
      depth += 1;
    }
    if (char === close) {
      depth -= 1;
    }
    if (depth < 0) {
      console.error(`SQL delimiter imbalance around ${open}${close}`);
      process.exit(1);
    }
  }
  if (depth !== 0) {
    console.error(`SQL delimiter imbalance around ${open}${close}`);
    process.exit(1);
  }
}

const statements = stripped
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

if (!stripped.endsWith(';')) {
  console.error('Migration must end with a semicolon.');
  process.exit(1);
}

if (statements.length < 50) {
  console.error('Migration has fewer SQL statements than expected.');
  process.exit(1);
}

console.log(
  `Validated ${path.basename(initialMigration)} (${statements.length} statements).`,
);

const mimeRequiredSnippets = [
  "update storage.buckets",
  "where id = 'media'",
  "'image/heic'",
  "'image/heif'",
  "'image/jpg'",
  "'audio/m4a'",
  "'audio/x-m4a'",
];

const missingMime = mimeRequiredSnippets.filter(
  (snippet) => !mimeSql.includes(snippet),
);

if (missingMime.length > 0) {
  console.error('Missing required MIME migration snippets:');
  for (const snippet of missingMime) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!mimeSql.trim().endsWith(';')) {
  console.error('MIME migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(mimeMigration)}.`);

const grantRequiredSnippets = [
  'grant usage on schema public to anon, authenticated',
  'grant select on table public.profiles to anon, authenticated',
  'grant insert, update on table public.profiles to authenticated',
  'create policy "Profiles are readable by everyone"',
  'create policy "Users can create their own profile"',
  'create policy "Users can update their own profile"',
  'create or replace function public.handle_new_user_profile()',
  'security definer',
  'create trigger on_auth_user_created_create_profile',
];

const missingGrants = grantRequiredSnippets.filter(
  (snippet) => !grantsSql.includes(snippet),
);

if (missingGrants.length > 0) {
  console.error('Missing required grants/profile migration snippets:');
  for (const snippet of missingGrants) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!grantsSql.trim().endsWith(';')) {
  console.error('Grants/profile migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(grantsMigration)}.`);

const restrictedGrantRequiredSnippets = [
  'revoke all privileges on table public.profiles from anon, authenticated',
  'grant select on table public.profiles to anon, authenticated',
  'grant insert, update on table public.profiles to authenticated',
  'grant insert, update, delete on table public.media_posts to authenticated',
  'grant insert, update, delete on table public.questions to authenticated',
  'grant insert, update, delete on table public.question_replies to authenticated',
  'grant insert, update, delete on table public.media_comments to authenticated',
];

const missingRestrictedGrants = restrictedGrantRequiredSnippets.filter(
  (snippet) => !restrictedGrantsSql.includes(snippet),
);

if (missingRestrictedGrants.length > 0) {
  console.error('Missing required restricted grant migration snippets:');
  for (const snippet of missingRestrictedGrants) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!restrictedGrantsSql.trim().endsWith(';')) {
  console.error('Restricted grants migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(restrictedGrantsMigration)}.`);

const usernameRulesRequiredSnippets = [
  'drop constraint if exists profiles_username_length',
  'char_length(username) between 3 and 20',
  "username ~ '^[A-Za-z0-9_]+$'",
  'create unique index if not exists profiles_username_lower_unique',
  'on public.profiles (lower(username))',
];

const missingUsernameRules = usernameRulesRequiredSnippets.filter(
  (snippet) => !usernameRulesSql.includes(snippet),
);

if (missingUsernameRules.length > 0) {
  console.error('Missing required username rules migration snippets:');
  for (const snippet of missingUsernameRules) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!usernameRulesSql.trim().endsWith(';')) {
  console.error('Username rules migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(usernameRulesMigration)}.`);

const usernameWritesRequiredSnippets = [
  'create or replace function public.has_completed_username_setup()',
  "username !~ '^user_[a-f0-9]{12}$'",
  'drop policy if exists "Authenticated users can create media posts"',
  'drop policy if exists "Authenticated users can create questions"',
  'drop policy if exists "Authenticated users can create question replies"',
  'drop policy if exists "Authenticated users can create media comments"',
  'drop policy if exists "Authenticated users can upload media files"',
  'and public.has_completed_username_setup()',
];

const missingUsernameWrites = usernameWritesRequiredSnippets.filter(
  (snippet) => !usernameWritesSql.includes(snippet),
);

if (missingUsernameWrites.length > 0) {
  console.error('Missing required username write policy migration snippets:');
  for (const snippet of missingUsernameWrites) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!usernameWritesSql.trim().endsWith(';')) {
  console.error('Username write policy migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(usernameWritesMigration)}.`);

const bucketLimitRequiredSnippets = [
  'update storage.buckets',
  'set file_size_limit = 52428800',
  "where id = 'media'",
];

const missingBucketLimit = bucketLimitRequiredSnippets.filter(
  (snippet) => !bucketLimitSql.includes(snippet),
);

if (missingBucketLimit.length > 0) {
  console.error('Missing required bucket limit migration snippets:');
  for (const snippet of missingBucketLimit) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

if (!bucketLimitSql.trim().endsWith(';')) {
  console.error('Bucket limit migration must end with a semicolon.');
  process.exit(1);
}

console.log(`Validated ${path.basename(bucketLimitMigration)}.`);
