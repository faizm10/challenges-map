-- Remove organizer account model and rely on access_credentials for admin/HQ auth.

ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_organizer_id_fkey;

ALTER TABLE public.games
  DROP COLUMN IF EXISTS organizer_id;

DROP TABLE IF EXISTS public.organizer_accounts;
