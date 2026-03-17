create table if not exists public.teams (
  id bigint primary key,
  team_name text not null unique,
  start_location_name text not null,
  address text not null,
  route_summary text not null,
  walk_time text not null,
  color text not null,
  badge_label text not null
);

create table if not exists public.access_credentials (
  id bigint generated always as identity primary key,
  role text not null check (role in ('admin', 'team')),
  display_name text not null,
  pin text not null,
  team_id bigint references public.teams(id) on delete cascade,
  unique (role, display_name)
);

create table if not exists public.challenges (
  id bigint primary key,
  challenge_order integer not null unique,
  title text not null,
  text text not null,
  expected_location text not null default '',
  allow_media_upload boolean not null default true,
  timer_started_at timestamptz,
  is_released boolean not null default false
);

alter table public.challenges
  add column if not exists expected_location text not null default '';

alter table public.challenges
  add column if not exists allow_media_upload boolean not null default true;

alter table public.challenges
  add column if not exists timer_started_at timestamptz;

create table if not exists public.team_challenge_status (
  team_id bigint not null references public.teams(id) on delete cascade,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'submitted')),
  proof_note text not null default '',
  awarded_points integer not null default 0,
  submitted_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  review_note text not null default '',
  reviewed_at timestamptz,
  reviewed_by text,
  primary key (team_id, challenge_id)
);

alter table public.team_challenge_status
  add column if not exists awarded_points integer not null default 0;

create table if not exists public.challenge_media (
  id bigint generated always as identity primary key,
  team_id bigint not null references public.teams(id) on delete cascade,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  bucket_name text not null,
  storage_path text not null unique,
  public_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.team_checkins (
  id bigint generated always as identity primary key,
  team_id bigint not null references public.teams(id) on delete cascade,
  checkin_type text not null check (checkin_type in ('start', 'challenge', 'finish')),
  challenge_id bigint references public.challenges(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  checkin_note text not null default '',
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  gps_captured_at timestamptz,
  created_at timestamptz not null default now(),
  review_note text not null default '',
  reviewed_at timestamptz,
  reviewed_by text
);

create table if not exists public.team_scores (
  team_id bigint primary key references public.teams(id) on delete cascade,
  arrival_rank integer,
  creativity_score integer not null default 0
);

create index if not exists idx_access_credentials_role_name
  on public.access_credentials(role, display_name);

create index if not exists idx_team_challenge_status_team
  on public.team_challenge_status(team_id);

create index if not exists idx_challenge_media_team_challenge
  on public.challenge_media(team_id, challenge_id);

create index if not exists idx_team_checkins_team_created
  on public.team_checkins(team_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('challenge-proof', 'challenge-proof', false)
on conflict (id) do update set public = excluded.public;

truncate table
  public.access_credentials,
  public.team_checkins,
  public.challenge_media,
  public.team_challenge_status,
  public.team_scores,
  public.challenges,
  public.teams
restart identity cascade;

insert into public.teams
  (id, team_name, start_location_name, address, route_summary, walk_time, color, badge_label)
values
  (1, 'Team 1', 'Krembil Research Institute', '60 Leonard Ave, Toronto, ON M5T 0S8', 'Head east toward Spadina or University, continue south through downtown, then east on Front Street to Union Station.', '35-45 min', '#d85f3a', 'Streetcar Spark'),
  (2, 'Team 2', 'John P. Robarts Research Library', '130 St George St, Toronto, ON M5S 0C2', 'Cut southeast through the U of T and Queen''s Park area, continue south on University Avenue, then east on Front Street to Union Station.', '40-50 min', '#2c7a7b', 'Stacks Sprint'),
  (3, 'Team 3', 'Coronation Park', '711 Lake Shore Blvd W, Toronto, ON M5V 1A7', 'Follow the waterfront east via Queens Quay or the waterfront trail, then head north into Union Station.', '30-40 min', '#2563eb', 'Harbour Heat'),
  (4, 'Team 4', 'Regent Park', '620 Dundas St E, Toronto, ON M5A 3S4', 'Walk west along Dundas Street or Queen Street into downtown, then head south to Front Street and continue to Union Station.', '40-50 min', '#8b5cf6', 'East End Echo');

insert into public.access_credentials (role, display_name, pin, team_id)
values
  ('admin', 'HQ Admin', 'UNIONHQ2026', null),
  ('team', 'Team 1', 'TEAM1GO', 1),
  ('team', 'Team 2', 'TEAM2GO', 2),
  ('team', 'Team 3', 'TEAM3GO', 3),
  ('team', 'Team 4', 'TEAM4GO', 4);

insert into public.team_scores (team_id, arrival_rank, creativity_score)
values
  (1, null, 0),
  (2, null, 0),
  (3, null, 0),
  (4, null, 0);

alter table public.teams enable row level security;
alter table public.access_credentials enable row level security;
alter table public.challenges enable row level security;
alter table public.team_challenge_status enable row level security;
alter table public.challenge_media enable row level security;
alter table public.team_checkins enable row level security;
alter table public.team_scores enable row level security;
