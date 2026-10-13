-- ScoreSphere Phase 2 — matches, playing XI, innings, deliveries, corrections (+ RLS)
-- Depends on 0001_core.sql (profiles, teams, players, has_role, set_updated_at).

-- ---------- enums ----------
create type public.match_format       as enum ('T20', 'ODI', 'CUSTOM');
create type public.match_status       as enum ('upcoming', 'live', 'innings_break', 'completed', 'abandoned', 'no_result');
create type public.toss_decision      as enum ('bat', 'bowl');
create type public.result_type        as enum ('win', 'tie', 'no_result', 'abandoned');
create type public.margin_type        as enum ('runs', 'wickets');
create type public.extra_type         as enum ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE');
create type public.wicket_type        as enum ('BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET',
                                               'OBSTRUCTING', 'HIT_TWICE', 'RETIRED_HURT', 'RETIRED_OUT');
create type public.innings_status     as enum ('in_progress', 'completed');
create type public.innings_end_reason as enum ('ALL_OUT', 'OVERS_COMPLETE', 'TARGET_REACHED', 'DECLARED', 'MANUAL');

-- ---------- matches ----------
create table public.matches (
  id                   uuid primary key default gen_random_uuid(),
  team_a_id            uuid not null references public.teams (id),
  team_b_id            uuid not null references public.teams (id),
  format               public.match_format not null default 'T20',
  overs_per_innings    smallint not null check (overs_per_innings between 1 and 50),
  balls_per_over       smallint not null default 6 check (balls_per_over between 4 and 8),
  max_overs_per_bowler smallint not null default 0 check (max_overs_per_bowler between 0 and 50),
  free_hit_enabled     boolean not null default true,
  players_per_side     smallint not null default 11 check (players_per_side between 2 and 11),
  scheduled_at         timestamptz not null,
  venue                text,
  stage                text,
  tournament_name      text,
  toss_winner_id       uuid references public.teams (id),
  toss_decision        public.toss_decision,
  status               public.match_status not null default 'upcoming',
  result_type          public.result_type,
  winner_team_id       uuid references public.teams (id),
  margin_type          public.margin_type,
  margin_value         smallint,
  result_summary       text,
  player_of_match_id   uuid references public.players (id),
  scorer_id            uuid references public.profiles (id),
  created_by           uuid not null references public.profiles (id),
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint matches_distinct_teams check (team_a_id <> team_b_id),
  constraint matches_toss_pair check ((toss_winner_id is null) = (toss_decision is null))
);
create index matches_updated_at_idx on public.matches (updated_at);
create index matches_status_idx     on public.matches (status, scheduled_at desc);

-- ---------- playing XI ----------
create table public.playing_xi (
  match_id      uuid not null references public.matches (id) on delete cascade,
  player_id     uuid not null references public.players (id),
  team_id       uuid not null references public.teams (id),
  batting_order smallint not null check (batting_order between 1 and 15),
  is_captain    boolean not null default false,
  is_keeper     boolean not null default false,
  active        boolean not null default true,                      -- removal = active false (no hard deletes)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (match_id, player_id)
);
create index playing_xi_updated_at_idx on public.playing_xi (updated_at);

-- ---------- innings ----------
create table public.innings (
  id                      uuid primary key,                         -- client-generated
  match_id                uuid not null references public.matches (id) on delete cascade,
  innings_no              smallint not null check (innings_no in (1, 2)),
  batting_team_id         uuid not null references public.teams (id),
  bowling_team_id         uuid not null references public.teams (id),
  opening_striker_id      uuid not null references public.players (id),
  opening_non_striker_id  uuid not null references public.players (id),
  opening_bowler_id       uuid references public.players (id),
  target                  integer check (target is null or target > 0),
  status                  public.innings_status not null default 'in_progress',
  end_reason              public.innings_end_reason,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (match_id, innings_no),
  constraint innings_distinct_teams check (batting_team_id <> bowling_team_id)
);
create index innings_updated_at_idx on public.innings (updated_at);

-- ---------- deliveries (append-only events; every legal AND non-legal ball) ----------
create table public.deliveries (
  id                 uuid primary key,                              -- client-generated
  innings_id         uuid not null references public.innings (id) on delete cascade,
  seq                integer not null check (seq > 0),
  kind               text not null default 'BALL' check (kind in ('BALL', 'DEAD')),
  striker_id         uuid not null references public.players (id),
  non_striker_id     uuid not null references public.players (id),
  bowler_id          uuid not null references public.players (id),
  runs_off_bat       smallint not null default 0 check (runs_off_bat between 0 and 7),
  is_boundary        boolean not null default false,
  extra_type         public.extra_type,
  extra_runs         smallint not null default 0 check (extra_runs between 0 and 12),
  extra_sub_type     text check (extra_sub_type in ('BYE', 'LEG_BYE')),
  wicket_type        public.wicket_type,
  player_out_id      uuid references public.players (id),
  fielder_id         uuid references public.players (id),
  incoming_batter_id uuid references public.players (id),
  incoming_at        text check (incoming_at in ('STRIKER', 'NON_STRIKER')),
  voided             boolean not null default false,
  version            integer not null default 1,
  device_id          text,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (innings_id, seq),
  constraint deliveries_extra_pair  check ((extra_type is null and extra_runs = 0) or (extra_type is not null and extra_runs >= 1)),
  constraint deliveries_wicket_pair check ((wicket_type is null) = (player_out_id is null)),
  constraint deliveries_distinct_batters check (striker_id <> non_striker_id)
);
create index deliveries_updated_at_idx on public.deliveries (updated_at);

-- ---------- audit of corrections (SCORE-08, NFR-15) ----------
create table public.score_corrections (
  id          uuid primary key,                                     -- client-generated
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  action      text not null check (action in ('UNDO', 'EDIT', 'REINSTATE')),
  old_json    jsonb,
  new_json    jsonb,
  reason      text,
  edited_by   uuid references public.profiles (id),
  edited_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index score_corrections_updated_at_idx on public.score_corrections (updated_at);

-- ---------- updated_at triggers ----------
create trigger trg_matches_updated     before insert or update on public.matches           for each row execute function public.set_updated_at();
create trigger trg_playing_xi_updated  before insert or update on public.playing_xi        for each row execute function public.set_updated_at();
create trigger trg_innings_updated     before insert or update on public.innings           for each row execute function public.set_updated_at();
create trigger trg_deliveries_updated  before insert or update on public.deliveries        for each row execute function public.set_updated_at();
create trigger trg_corrections_updated before insert or update on public.score_corrections for each row execute function public.set_updated_at();

-- ---------- authorisation helpers ----------
-- Who may change a match and everything under it: its creator, its scorer, or an admin.
create or replace function public.can_manage_match(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches x
    where x.id = m and (x.created_by = (select auth.uid()) or x.scorer_id = (select auth.uid()) or public.has_role('admin'))
  );
$$;
create or replace function public.can_manage_innings(i uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.innings n where n.id = i and public.can_manage_match(n.match_id));
$$;
create or replace function public.can_manage_delivery(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.deliveries x where x.id = d and public.can_manage_innings(x.innings_id));
$$;
revoke execute on function public.can_manage_match(uuid), public.can_manage_innings(uuid), public.can_manage_delivery(uuid) from public, anon;
grant  execute on function public.can_manage_match(uuid), public.can_manage_innings(uuid), public.can_manage_delivery(uuid) to authenticated;

-- ---------- Row Level Security ----------
alter table public.matches           enable row level security;
alter table public.playing_xi        enable row level security;
alter table public.innings           enable row level security;
alter table public.deliveries        enable row level security;
alter table public.score_corrections enable row level security;

create policy matches_read on public.matches for select to authenticated using (true);
create policy matches_insert on public.matches for insert to authenticated
  with check ((public.has_role('scorer') or public.has_role('team_manager'))
              and (created_by = (select auth.uid()) or public.has_role('admin')));
create policy matches_update on public.matches for update to authenticated
  using (public.can_manage_match(id)) with check (public.can_manage_match(id));
-- no DELETE policy: matches are archived

create policy playing_xi_read   on public.playing_xi for select to authenticated using (true);
create policy playing_xi_insert on public.playing_xi for insert to authenticated with check (public.can_manage_match(match_id));
create policy playing_xi_update on public.playing_xi for update to authenticated
  using (public.can_manage_match(match_id)) with check (public.can_manage_match(match_id));

create policy innings_read   on public.innings for select to authenticated using (true);
create policy innings_insert on public.innings for insert to authenticated with check (public.can_manage_match(match_id));
create policy innings_update on public.innings for update to authenticated
  using (public.can_manage_match(match_id)) with check (public.can_manage_match(match_id));

create policy deliveries_read   on public.deliveries for select to authenticated using (true);
create policy deliveries_insert on public.deliveries for insert to authenticated with check (public.can_manage_innings(innings_id));
create policy deliveries_update on public.deliveries for update to authenticated
  using (public.can_manage_innings(innings_id)) with check (public.can_manage_innings(innings_id));

create policy corrections_read   on public.score_corrections for select to authenticated using (true);
create policy corrections_insert on public.score_corrections for insert to authenticated with check (public.can_manage_delivery(delivery_id));
-- corrections are append-only: no UPDATE / DELETE policies
-- no DELETE policies anywhere: nothing in the match tree is ever hard-deleted
