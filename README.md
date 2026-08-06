# Mobile Video UI

This repository contains the original static HTML/CSS/JavaScript prototype and a new Expo React Native app in `mobile-app/`.

## Project Structure

- `index.html`, `styles.css`, `app.js` - original static prototype.
- `mobile-app/` - Expo React Native app for iOS and Android.

## Install Dependencies

```powershell
cd mobile-app
npm install
```

## Supabase Auth Setup

Create a Supabase project, then copy the Project URL and publishable key from the project settings.

```powershell
cd mobile-app
copy .env.example .env
```

Fill in `mobile-app/.env`:

```powershell
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Restart Expo after changing environment variables.

In the Supabase dashboard, enable Email authentication under Authentication providers. If email confirmations are enabled, new users must confirm their email address before signing in.

## Guest Browsing And Protected Actions

Users can browse the Videos and Q&A tabs without signing in. Authentication and username setup are required only for write actions such as uploading media, asking a question, replying, commenting, or using future messaging features.

Use `ProtectedActionButton` or `requireAuth(...)` from the auth context before starting any write flow. If the user is signed out, the shared sign-up/sign-in prompt opens. If the user is signed in but still has a generated username, the username setup prompt opens. After successful authentication and username setup, the attempted action resumes.

The Messages tab also acts as the account area:

- Signed-out users see sign-up and sign-in options.
- Signed-in users see their public username, private email, change-username action, and sign-out action.

## Username Setup

New users get a temporary generated username from the signup trigger. Before posting content, they must choose a public username.

Username rules:

- 3-20 characters.
- Letters, numbers, and underscores only.
- Surrounding spaces are trimmed.
- Usernames are case-insensitively unique in the database.
- Emails are private account information and are not shown publicly.

## Run The App

```powershell
cd mobile-app
npm run start
```

Then use the Expo CLI options to open the app:

- Press `a` for Android emulator/device.
- Press `i` for iOS simulator on macOS.
- Scan the QR code with Expo Go on a physical iPhone or Android device.

You can also run platform commands directly:

```powershell
npm run android
npm run ios
```

## Checks

```powershell
cd mobile-app
npx expo install --fix
npx expo-doctor
npm run validate:sql
npm run typecheck
npm run lint
```

## Current Scope

The Expo app includes guest browsing, Supabase email/password authentication, required username setup for posting, TUS resumable media uploads, a public media feed with comments, and text-only Q&A backed by Supabase. Likes, profile navigation, notifications, and real messaging are still placeholder-only.

## Database Foundation

Apply migrations from `mobile-app/supabase/migrations` to your Supabase project before wiring real data into the app.

The initial migration creates:

- `profiles`
- `media_posts`
- `questions`
- `question_replies`
- `media_comments`
- public `media` storage bucket

Every table has Row Level Security enabled. Public users can read public content. Authenticated users can insert rows for themselves. Users can update and delete only rows they own.

The follow-up Storage migration expands the `media` bucket MIME allowlist for HEIC/HEIF images and M4A audio.

The username rules migration enforces 3-20 character usernames and adds a case-insensitive unique index on `profiles.username`.

The username write-policy migration adds `public.has_completed_username_setup()` and updates write/upload policies so generated usernames cannot create media posts, questions, replies, comments, or Storage uploads.

The media bucket limit migration sets the `media` Storage bucket limit to 50 MB.

## Media Uploads

The Upload tab supports signed-in uploads for:

- Images: JPEG, PNG, HEIC
- Videos: MP4, MOV
- Audio: MP3, WAV, M4A

Files are stored in the Supabase `media` bucket under the authenticated user's folder:

```text
{user_id}/{generated_file_name}
```

All supported media files use Supabase TUS resumable uploads through `tus-js-client`, including files under 6 MB. After Storage upload succeeds, the app inserts a row into `media_posts` with the user ID, media type, public file URL, caption, and creation timestamp.

Resumable upload notes:

- Files can be up to 50 MB.
- TUS uploads use the direct Supabase Storage hostname.
- Upload progress is based on bytes sent.
- Recoverable interruptions retry automatically.

## Public Media Feed

The Videos tab reads from `media_posts`, newest first, and looks up matching `profiles` rows for display usernames. Guests and signed-in users can view the feed.

Feed behavior:

- Images, videos, and audio are shown in reusable media cards.
- Pull down on the Videos tab to refresh.
- More posts load as you scroll.
- Rows with missing profile data or unavailable media display a graceful fallback instead of blocking the feed.

## Media Comments

Media comments read from `media_comments`.

- Guests and signed-in users can view comments.
- The main feed loads comment counts only, not full comment lists.
- Tap "View comments" on a media post to open the post and its comments.
- Comments are sorted oldest first.
- Posting a comment uses the protected-action auth prompt.
- Comment authors can edit or delete their own comments from a compact three-dot menu.
- Usernames are display-only for now.

## Q&A

The Q&A tab reads from `questions` and `question_replies`.

- Guests can browse questions and replies.
- Questions are sorted newest first.
- Replies are sorted oldest first.
- Asking a question or posting a reply uses the protected-action auth prompt.
- Question lists support pull-to-refresh and pagination.
- Usernames are display-only for now.

## Owner Edits And Deletes

Signed-in owners see a compact three-dot menu on their own media posts, media comments, questions, and replies. Guests and other users do not see these controls.

- Media post edits update caption metadata only.
- Media post deletes remove the file from the `media` Storage bucket first, then delete the `media_posts` row.
- Comment edits update body text only.
- Question edits update title and body.
- Question deletes rely on the `question_replies.question_id references questions(id) on delete cascade` relationship to remove replies.
- Reply edits update body text only.

The UI hides owner actions for non-owners, but authorization is still enforced by Supabase RLS policies for update/delete operations.

## Delete Account

The Account tab includes a red text "Delete Account" action. The app verifies the user's current password, asks for final confirmation, then invokes the `delete-account` Supabase Edge Function.

The Edge Function requires `SUPABASE_SERVICE_ROLE_KEY` as a Supabase function secret. Never store this key in the Expo app.

Deploy/update the function:

```powershell
cd mobile-app
npx supabase functions deploy delete-account
```

Set the service-role key as a function secret:

```powershell
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Testing notes:

- Signed-out users can browse, but choosing/uploading media opens the auth prompt.
- Sign in before testing successful uploads.
- Sign in before testing media comment posting.
- Sign in before testing question and reply posting.
- Use two accounts to confirm non-owners cannot see owner menus and remote update/delete attempts are rejected by RLS.
- Create or sign into an account with a generated `user_...` username and confirm posting prompts for username setup.
- Try changing one account's username to match another account with different casing and confirm it is rejected.
- On iPhone, grant photo library permission when prompted for images/videos.
- Audio files are selected through the document picker.
- Keep test files within the upload limit: 50 MB.
