-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.access_credentials (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'team'::text])),
  display_name text NOT NULL,
  pin text NOT NULL,
  team_id bigint,
  game_id bigint NOT NULL,
  CONSTRAINT access_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT access_credentials_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT access_credentials_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.challenge_media (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  team_id bigint NOT NULL,
  challenge_id bigint NOT NULL,
  bucket_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text])),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT challenge_media_pkey PRIMARY KEY (id),
  CONSTRAINT challenge_media_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT challenge_media_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.challenges (
  id bigint NOT NULL,
  challenge_order integer NOT NULL,
  title text NOT NULL,
  text text NOT NULL,
  expected_location text NOT NULL DEFAULT ''::text,
  allow_media_upload boolean NOT NULL DEFAULT true,
  is_released boolean NOT NULL DEFAULT false,
  timer_started_at timestamp with time zone,
  game_id bigint NOT NULL,
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.organizer_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizer_accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.games (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  finish_point_label text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  organizer_id bigint,
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.organizer_accounts(id)
);
CREATE TABLE public.team_challenge_checkpoints (
  team_id bigint NOT NULL,
  challenge_id bigint NOT NULL,
  checkpoint_label text NOT NULL,
  checkpoint_address text NOT NULL,
  latitude double precision,
  longitude double precision,
  unlock_radius_meters integer NOT NULL DEFAULT 150,
  CONSTRAINT team_challenge_checkpoints_pkey PRIMARY KEY (team_id, challenge_id),
  CONSTRAINT team_challenge_checkpoints_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_challenge_checkpoints_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.team_challenge_prompts (
  team_id bigint NOT NULL,
  challenge_id bigint NOT NULL,
  prompt_text text NOT NULL DEFAULT ''::text,
  CONSTRAINT team_challenge_prompts_pkey PRIMARY KEY (team_id, challenge_id),
  CONSTRAINT team_challenge_prompts_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_challenge_prompts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.team_challenge_status (
  team_id bigint NOT NULL,
  challenge_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'submitted'::text])),
  proof_note text NOT NULL DEFAULT ''::text,
  submitted_at timestamp with time zone,
  review_status text NOT NULL DEFAULT 'pending'::text CHECK (review_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  review_note text NOT NULL DEFAULT ''::text,
  reviewed_at timestamp with time zone,
  reviewed_by text,
  awarded_points integer NOT NULL DEFAULT 0,
  CONSTRAINT team_challenge_status_pkey PRIMARY KEY (team_id, challenge_id),
  CONSTRAINT team_challenge_status_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_challenge_status_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.team_checkins (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  team_id bigint NOT NULL,
  checkin_type text NOT NULL CHECK (checkin_type = ANY (ARRAY['start'::text, 'challenge'::text, 'finish'::text])),
  challenge_id bigint,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  checkin_note text NOT NULL DEFAULT ''::text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  gps_captured_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  review_note text NOT NULL DEFAULT ''::text,
  reviewed_at timestamp with time zone,
  reviewed_by text,
  CONSTRAINT team_checkins_pkey PRIMARY KEY (id),
  CONSTRAINT team_checkins_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_checkins_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id)
);
CREATE TABLE public.team_scores (
  team_id bigint NOT NULL,
  arrival_rank integer,
  creativity_score integer NOT NULL DEFAULT 0,
  CONSTRAINT team_scores_pkey PRIMARY KEY (team_id),
  CONSTRAINT team_scores_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.teams (
  id bigint NOT NULL,
  team_name text NOT NULL,
  start_location_name text NOT NULL,
  address text NOT NULL,
  route_summary text NOT NULL,
  walk_time text NOT NULL,
  color text NOT NULL,
  badge_label text NOT NULL,
  game_id bigint NOT NULL,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.waitlist_signups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_pkey PRIMARY KEY (id)
);