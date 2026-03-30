-- Product signup: organizers register before creating games. No hardcoded admins required.

CREATE TABLE IF NOT EXISTS public.organizer_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizer_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT organizer_accounts_email_key UNIQUE (email)
);

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS organizer_id bigint REFERENCES public.organizer_accounts (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS games_organizer_id_idx ON public.games (organizer_id);
