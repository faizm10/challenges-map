-- Deleting a game cascades to teams and challenges; child rows must not block team/challenge deletes.

ALTER TABLE public.team_scores
  DROP CONSTRAINT IF EXISTS team_scores_team_id_fkey,
  ADD CONSTRAINT team_scores_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.team_checkins
  DROP CONSTRAINT IF EXISTS team_checkins_team_id_fkey,
  ADD CONSTRAINT team_checkins_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.team_checkins
  DROP CONSTRAINT IF EXISTS team_checkins_challenge_id_fkey,
  ADD CONSTRAINT team_checkins_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES public.challenges (id) ON DELETE CASCADE;

ALTER TABLE public.challenge_media
  DROP CONSTRAINT IF EXISTS challenge_media_team_id_fkey,
  ADD CONSTRAINT challenge_media_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.challenge_media
  DROP CONSTRAINT IF EXISTS challenge_media_challenge_id_fkey,
  ADD CONSTRAINT challenge_media_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES public.challenges (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_checkpoints
  DROP CONSTRAINT IF EXISTS team_challenge_checkpoints_team_id_fkey,
  ADD CONSTRAINT team_challenge_checkpoints_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_checkpoints
  DROP CONSTRAINT IF EXISTS team_challenge_checkpoints_challenge_id_fkey,
  ADD CONSTRAINT team_challenge_checkpoints_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES public.challenges (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_prompts
  DROP CONSTRAINT IF EXISTS team_challenge_prompts_team_id_fkey,
  ADD CONSTRAINT team_challenge_prompts_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_prompts
  DROP CONSTRAINT IF EXISTS team_challenge_prompts_challenge_id_fkey,
  ADD CONSTRAINT team_challenge_prompts_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES public.challenges (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_status
  DROP CONSTRAINT IF EXISTS team_challenge_status_team_id_fkey,
  ADD CONSTRAINT team_challenge_status_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;

ALTER TABLE public.team_challenge_status
  DROP CONSTRAINT IF EXISTS team_challenge_status_challenge_id_fkey,
  ADD CONSTRAINT team_challenge_status_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES public.challenges (id) ON DELETE CASCADE;

ALTER TABLE public.access_credentials
  DROP CONSTRAINT IF EXISTS access_credentials_team_id_fkey,
  ADD CONSTRAINT access_credentials_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE;
