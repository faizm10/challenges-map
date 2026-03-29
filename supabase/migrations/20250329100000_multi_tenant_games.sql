-- Multi-tenant: add games and game_id. Run after existing schema.sql (single-tenant).
-- Safe to run once; uses IF NOT EXISTS / guards where possible.

CREATE TABLE IF NOT EXISTS public.games (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  finish_point_label text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_slug_key UNIQUE (slug)
);

-- Default row for existing data
INSERT INTO public.games (slug, name, finish_point_label)
VALUES ('converge', 'Converge', 'Union Station, Front Street entrance')
ON CONFLICT (slug) DO NOTHING;

-- Resolve default game id (assumes slug converge exists)
DO $$
DECLARE
  gid bigint;
BEGIN
  SELECT id INTO gid FROM public.games WHERE slug = 'converge' LIMIT 1;
  IF gid IS NULL THEN
    RAISE EXCEPTION 'games table missing converge row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE public.teams ADD COLUMN game_id bigint;
    UPDATE public.teams SET game_id = gid WHERE game_id IS NULL;
    ALTER TABLE public.teams ALTER COLUMN game_id SET NOT NULL;
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games (id) ON DELETE CASCADE;
    ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_team_name_key;
    ALTER TABLE public.teams ADD CONSTRAINT teams_game_id_team_name_key UNIQUE (game_id, team_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN game_id bigint;
    UPDATE public.challenges SET game_id = gid WHERE game_id IS NULL;
    ALTER TABLE public.challenges ALTER COLUMN game_id SET NOT NULL;
    ALTER TABLE public.challenges
      ADD CONSTRAINT challenges_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games (id) ON DELETE CASCADE;
    ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_challenge_order_key;
    ALTER TABLE public.challenges ADD CONSTRAINT challenges_game_id_challenge_order_key UNIQUE (game_id, challenge_order);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_credentials' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE public.access_credentials ADD COLUMN game_id bigint;
    UPDATE public.access_credentials SET game_id = gid WHERE game_id IS NULL;
    ALTER TABLE public.access_credentials ALTER COLUMN game_id SET NOT NULL;
    ALTER TABLE public.access_credentials
      ADD CONSTRAINT access_credentials_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games (id) ON DELETE CASCADE;
    -- Allow same display_name across games: composite unique on (game_id, role, display_name)
    ALTER TABLE public.access_credentials DROP CONSTRAINT IF EXISTS access_credentials_display_name_key;
    ALTER TABLE public.access_credentials ADD CONSTRAINT access_credentials_game_admin_name UNIQUE (game_id, role, display_name);
  END IF;
END $$;
