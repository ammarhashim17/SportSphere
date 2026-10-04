-- ScoreSphere Phase 1 — core schema: profiles, teams, players, team_players (+ RLS, storage)
create extension if not exists pgcrypto;

-- ---------- enums ----------
create type public.user_role     as enum ('admin', 'scorer', 'team_manager', 'player', 'viewer');
create type public.player_role   as enum ('BAT', 'BOWL', 'AR', 'WK');
create type public.batting_style as enum ('right', 'left');

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();   -- server time is authoritative (ADR-10)
  return new;
end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  phone       text,
  roles       public.user_role[] not null default array['team_manager', 'scorer']::public.user_role[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- admin passes every role check
create or replace function public.has_role(r public.user_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (r = any (p.roles) or 'admin' = any (p.roles))
  );
$$;
revoke execute on function public.has_role(public.user_role) from public, anon;
grant  execute on function public.has_role(public.user_role) to authenticated;

-- ---------- teams ----------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  short_name  text not null check (short_name ~ '^[A-Za-z0-9]{2,4}$'),
  logo_url    text,
  colour      text check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  location    text,
  description text,
  created_by  uuid not null references public.profiles (id),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index teams_updated_at_idx on public.teams (updated_at);

-- ---------- players ----------
create table public.players (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 80),
  photo_url         text,
  role              public.player_role not null default 'BAT',
  batting_style     public.batting_style,
  bowling_style     text,
  date_of_birth     date,
  linked_profile_id uuid unique references public.profiles (id) on delete set null,
  created_by        uuid not null references public.profiles (id),
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index players_updated_at_idx on public.players (updated_at);

-- ---------- team_players (squads) ----------
create table public.team_players (
  team_id         uuid not null references public.teams (id)   on delete cascade,
  player_id       uuid not null references public.players (id) on delete cascade,
  jersey_no       smallint check (jersey_no between 0 and 999),
  is_captain      boolean not null default false,
  is_vice_captain boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (team_id, player_id),
  constraint captain_not_vice check (not (is_captain and is_vice_captain))
);
create unique index one_captain_per_team on public.team_players (team_id) where is_captain and active;
create unique index one_vice_per_team    on public.team_players (team_id) where is_vice_captain and active;
create index team_players_updated_at_idx on public.team_players (updated_at);

-- ---------- updated_at triggers ----------
create trigger trg_profiles_updated     before insert or update on public.profiles     for each row execute function public.set_updated_at();
create trigger trg_teams_updated        before insert or update on public.teams        for each row execute function public.set_updated_at();
create trigger trg_players_updated      before insert or update on public.players      for each row execute function public.set_updated_at();
create trigger trg_team_players_updated before insert or update on public.team_players for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.players      enable row level security;
alter table public.team_players enable row level security;

-- profiles: everyone signed in can read names/avatars; users edit only their own non-role columns
create policy profiles_read       on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant  update (full_name, avatar_url, phone) on public.profiles to authenticated;

-- teams
create policy teams_read   on public.teams for select to authenticated using (true);
create policy teams_insert on public.teams for insert to authenticated
  with check (public.has_role('team_manager') and (created_by = (select auth.uid()) or public.has_role('admin')));
create policy teams_update on public.teams for update to authenticated
  using      (created_by = (select auth.uid()) or public.has_role('admin'))
  with check (created_by = (select auth.uid()) or public.has_role('admin'));
-- no DELETE policy: teams are archived, never deleted (TEAM-06)

-- players
create policy players_read   on public.players for select to authenticated using (true);
create policy players_insert on public.players for insert to authenticated
  with check ((public.has_role('team_manager') or public.has_role('scorer'))
              and (created_by = (select auth.uid()) or public.has_role('admin')));
create policy players_update on public.players for update to authenticated
  using      (created_by = (select auth.uid()) or linked_profile_id = (select auth.uid()) or public.has_role('admin'))
  with check (created_by = (select auth.uid()) or linked_profile_id = (select auth.uid()) or public.has_role('admin'));

-- team_players: only the team's owner (or admin) manages the squad
create policy team_players_read on public.team_players for select to authenticated using (true);
create policy team_players_write on public.team_players for all to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id
                 and (t.created_by = (select auth.uid()) or public.has_role('admin'))))
  with check (exists (select 1 from public.teams t where t.id = team_id
                      and (t.created_by = (select auth.uid()) or public.has_role('admin'))));

-- ---------- storage (public-read buckets, per-user write folders) ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('team-logos', 'team-logos', true), ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

create policy media_read on storage.objects for select
  using (bucket_id in ('avatars', 'team-logos', 'player-photos'));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_update on storage.objects for update to authenticated
  using      (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_delete on storage.objects for delete to authenticated
  using      (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
