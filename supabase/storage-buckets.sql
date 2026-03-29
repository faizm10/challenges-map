-- Storage buckets used by this app (see lib/config.ts: CHALLENGE_PROOF_BUCKET).
-- Run in Supabase SQL Editor after selecting the project.
-- Idempotent: safe to re-run (skips if bucket id already exists).

-- Buckets referenced in codebase today:
--   challenge-proof — challenge media uploads (private; signed URLs from server)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-proof',
  'challenge-proof',
  false,
  52428800, -- 50 MiB; matches lib/config.ts MAX_UPLOAD_BYTES
  NULL       -- allow all MIME types (app accepts image/* and video/* uploads)
)
ON CONFLICT (id) DO NOTHING;
