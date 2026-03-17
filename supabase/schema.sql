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
  is_released boolean not null default false
);

create table if not exists public.team_challenge_status (
  team_id bigint not null references public.teams(id) on delete cascade,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'submitted')),
  proof_note text not null default '',
  submitted_at timestamptz,
  primary key (team_id, challenge_id)
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

truncate table
  public.access_credentials,
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
  (4, 'Team 4', 'Regent Park', '620 Dundas St E, Toronto, ON M5A 3S4', 'Walk west along Dundas Street or Queen Street into downtown, then head south to Front Street and continue to Union Station.', '40-50 min', '#8b5cf6', 'East End Echo'),
  (5, 'Team 5', 'Wellesley-Magill Park', '125 Homewood Ave, Toronto, ON M4Y 0A6', 'Head southwest toward Yonge Street or Bay Street, walk south through downtown, then continue along Front Street to Union Station.', '45-60 min', '#c0841a', 'Midtown Rush');

insert into public.access_credentials (role, display_name, pin, team_id)
values
  ('admin', 'HQ Admin', 'UNIONHQ2026', null),
  ('team', 'Team 1', 'TEAM1GO', 1),
  ('team', 'Team 2', 'TEAM2GO', 2),
  ('team', 'Team 3', 'TEAM3GO', 3),
  ('team', 'Team 4', 'TEAM4GO', 4),
  ('team', 'Team 5', 'TEAM5GO', 5);

insert into public.challenges (id, challenge_order, title, text, is_released)
values
  (1, 1, 'Movie Trailer Shot', 'Film a 10-second dramatic trailer for your team''s race to Union.', false),
  (2, 2, 'Toronto Meme', 'Recreate a meme using something you find on the street.', false),
  (3, 3, 'Stranger Cameo', 'Get a stranger to say your team name on video.', false),
  (4, 4, 'Landmark Proof', 'Take a creative photo with a recognizable Toronto landmark.', false),
  (5, 5, 'Chaotic Commercial', 'Film a fake ad for a random everyday object.', false);

insert into public.team_scores (team_id, arrival_rank, creativity_score)
values
  (1, null, 0),
  (2, null, 0),
  (3, null, 0),
  (4, null, 0),
  (5, null, 0);

insert into public.team_challenge_status (team_id, challenge_id, status, proof_note, submitted_at)
values
  (1, 1, 'not_started', '', null),
  (1, 2, 'not_started', '', null),
  (1, 3, 'not_started', '', null),
  (1, 4, 'not_started', '', null),
  (1, 5, 'not_started', '', null),
  (2, 1, 'not_started', '', null),
  (2, 2, 'not_started', '', null),
  (2, 3, 'not_started', '', null),
  (2, 4, 'not_started', '', null),
  (2, 5, 'not_started', '', null),
  (3, 1, 'not_started', '', null),
  (3, 2, 'not_started', '', null),
  (3, 3, 'not_started', '', null),
  (3, 4, 'not_started', '', null),
  (3, 5, 'not_started', '', null),
  (4, 1, 'not_started', '', null),
  (4, 2, 'not_started', '', null),
  (4, 3, 'not_started', '', null),
  (4, 4, 'not_started', '', null),
  (4, 5, 'not_started', '', null),
  (5, 1, 'not_started', '', null),
  (5, 2, 'not_started', '', null),
  (5, 3, 'not_started', '', null),
  (5, 4, 'not_started', '', null),
  (5, 5, 'not_started', '', null);

alter table public.teams disable row level security;
alter table public.access_credentials disable row level security;
alter table public.challenges disable row level security;
alter table public.team_challenge_status disable row level security;
alter table public.team_scores disable row level security;
