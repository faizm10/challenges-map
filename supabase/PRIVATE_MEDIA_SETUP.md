# Private Media Setup

Use this after deploying the signed-URL changes.

## 1. Confirm env vars
- In Supabase: Project Settings -> API
- In Vercel or your local env, confirm:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
- Make sure the service key is not exposed in browser code.

## 2. Run the SQL
- Open Supabase -> SQL Editor
- Run [schema.sql](/Applications/vscode/GoTransitFareCalculator/supabase/schema.sql)
- This will:
  - set `challenge-proof` to private
  - enable RLS on the app tables
  - keep your existing schema in sync with the app

## 3. Check the bucket
- Open Supabase -> Storage -> Buckets
- Open `challenge-proof`
- Confirm it is `Private`
- Optional:
  - restrict MIME types to images/videos
  - set a bucket file size limit that matches your app limits

## 4. Leave storage policies locked down
- Because the app uploads, deletes, and signs URLs from the server with `SUPABASE_SECRET_KEY`, you do not need broad browser-facing read policies.
- Default choice:
  - do not add anon read access to `storage.objects`
  - do not add authenticated read access unless you later add Supabase Auth

## 5. Verify media rows
- Open Supabase -> Table Editor -> `challenge_media`
- Confirm rows still contain:
  - `bucket_name`
  - `storage_path`
  - file metadata
- `public_url` may now be blank or unused. The app reads signed URLs from the server response instead.

## 6. Test in the app
- Upload an image from the team dashboard
- Open the same challenge in the admin dashboard
- Open `View Proof`
- Confirm the media renders
- Delete an upload and confirm it disappears

## 7. Important note
- Old public object URLs should no longer be relied on once the bucket is private.
- The app now expects signed URLs generated server-side on each dashboard/admin fetch.
