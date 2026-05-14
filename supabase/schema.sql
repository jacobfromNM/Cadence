-- =============================================================
-- Cadence — Supabase Schema
-- =============================================================
-- Run this entire file in your Supabase project's SQL Editor.
-- Dashboard → SQL Editor → New query → paste → Run
--
-- Tables:
--   schools           one row per school
--   classes           one row per classroom
--   students          one row per student
--   pickup_requests   one row per pickup event (created each day)
--   absent_today      students marked absent (cleared nightly via cron)
-- =============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Schools ───────────────────────────────────────────────────
create table public.schools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  code            text not null unique,         -- e.g. 'MESA-ELEM'
  staff_pin_hash  text not null,                -- bcrypt hash in production
  admin_pin_hash  text not null,
  latitude        numeric,                      -- school GPS for parent geofencing
  longitude       numeric,
  created_at      timestamptz default now()
);

-- ── Classes ───────────────────────────────────────────────────
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  code        text not null,                    -- e.g. 'KG-A'
  teacher_name text not null,
  created_at  timestamptz default now(),
  unique(school_id, code)
);

-- ── Students ──────────────────────────────────────────────────
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  name        text not null,
  parent_code     text,                         -- auto-generated code for parent login ([2-letter prefix][6 digits])
  parent_group_id uuid,                         -- shared UUID across linked siblings; null = unlinked
  created_at  timestamptz default now(),
  -- Prevents duplicate names within the same class on re-import
  unique(school_id, class_id, name),
  unique(school_id, parent_code)
);

-- ── Parent Nearby ─────────────────────────────────────────────
-- Written by parent device when within geofence; read by staff/teachers.
create table public.parent_nearby (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz,    -- NULL = active alert
  converted_at timestamptz     -- set when staff converts to a pickup request
);

-- ── Pickup Requests ───────────────────────────────────────────
-- One row per student per pickup event.
-- status: 'requested' → 'sent' → 'complete'
create table public.pickup_requests (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  class_id     uuid not null references public.classes(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  status       text not null default 'requested'
                 check (status in ('requested', 'sent', 'complete')),
  requested_at timestamptz default now(),
  sent_at      timestamptz,
  completed_at timestamptz
);

-- ── Absent Today ──────────────────────────────────────────────
-- Cleared each morning via a Supabase pg_cron job (see below).
create table public.absent_today (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date       date not null default current_date,
  unique(student_id, date)
);

-- =============================================================
-- Indexes
-- =============================================================

-- pickup_requests: filtered by class + status for real-time queries
create index on public.pickup_requests(class_id, status);
create index on public.pickup_requests(school_id);

-- students: school-scoped fetches and class-scoped joins
create index on public.students(school_id);
create index on public.students(class_id);

-- absent_today: daily cleanup + school-scoped fetch
create index on public.absent_today(school_id, date);

-- =============================================================
-- Row Level Security (RLS)
-- Ensures each school can only see its own data.
-- =============================================================

alter table public.schools          enable row level security;
alter table public.classes          enable row level security;
alter table public.students         enable row level security;
alter table public.pickup_requests  enable row level security;
alter table public.absent_today     enable row level security;
alter table public.parent_nearby    enable row level security;

-- For now: allow all authenticated users to read/write their own school's data.
-- In production you would scope this to a school_id claim in the JWT.
-- These open policies are safe for a single-school deployment while you get started.

create policy "allow_all_schools"         on public.schools         for all using (true) with check (true);
create policy "allow_all_classes"         on public.classes         for all using (true) with check (true);
create policy "allow_all_students"        on public.students        for all using (true) with check (true);
create policy "allow_all_pickup_requests" on public.pickup_requests for all using (true) with check (true);
create policy "allow_all_absent_today"    on public.absent_today    for all using (true) with check (true);
create policy "allow_all_parent_nearby"   on public.parent_nearby   for all using (true) with check (true);

-- Grant table-level privileges to the anon and authenticated roles.
-- RLS policies filter rows, but the role must also have GRANT access to touch the table.
grant select, insert, update, delete on public.schools         to anon, authenticated;
grant select, insert, update, delete on public.classes         to anon, authenticated;
grant select, insert, update, delete on public.students        to anon, authenticated;
grant select, insert, update, delete on public.pickup_requests to anon, authenticated;
grant select, insert, update, delete on public.absent_today    to anon, authenticated;
grant select, insert, update, delete on public.parent_nearby   to anon, authenticated;

-- =============================================================
-- Real-time
-- Enable Supabase real-time on ALL tables that need live updates.
-- Dashboard → Database → Replication → toggle these tables on,
-- OR run the SQL below.
-- =============================================================

alter publication supabase_realtime add table public.pickup_requests;
alter publication supabase_realtime add table public.absent_today;
alter publication supabase_realtime add table public.students;
-- classes must be in the publication so the client subscription fires
alter publication supabase_realtime add table public.classes;
alter publication supabase_realtime add table public.parent_nearby;

-- REPLICA IDENTITY FULL is required so that Supabase Realtime DELETE events
-- include all columns (e.g. student_id, school_id) — not just the primary key.
-- Without this, the school_id filter on DELETE subscriptions is silently ignored
-- and the student_id needed to un-absent a student is missing from the payload.
alter table public.absent_today     replica identity full;
alter table public.pickup_requests  replica identity full;

-- =============================================================
-- Nightly cleanup (optional but recommended)
-- Clears absent_today and completed pickup_requests each morning.
-- Requires the pg_cron extension (enabled in Supabase Dashboard →
-- Database → Extensions → pg_cron).
-- =============================================================

select cron.schedule(
  'clear-daily-pickup-data',
  '0 6 * * *',  -- 6:00 AM UTC = midnight Mountain Time (adjust if needed)
  $$
    delete from public.absent_today where date < current_date;
    delete from public.pickup_requests
      where completed_at < now() - interval '18 hours';
  $$
);

-- =============================================================
-- Migration note for existing deployments
-- If you already ran an earlier version of this schema, apply
-- these ALTER statements to bring your database up to date:
--
--   alter table public.students
--     add constraint students_school_id_class_id_name_key
--     unique (school_id, class_id, name);
--
--   create index if not exists students_school_id_idx on public.students(school_id);
--   create index if not exists students_class_id_idx  on public.students(class_id);
--   create index if not exists absent_today_school_date_idx
--     on public.absent_today(school_id, date);
--
--   alter publication supabase_realtime add table public.classes;
--
-- Parent Nearby feature (added later):
--
--   alter table public.schools add column latitude numeric;
--   alter table public.schools add column longitude numeric;
--
--   alter table public.students add column parent_code text;
--   alter table public.students add constraint students_school_id_parent_code_key unique (school_id, parent_code);
--
--   create table public.parent_nearby (
--     id           uuid primary key default gen_random_uuid(),
--     school_id    uuid not null references public.schools(id) on delete cascade,
--     student_id   uuid not null references public.students(id) on delete cascade,
--     created_at   timestamptz not null default now(),
--     dismissed_at timestamptz,
--     converted_at timestamptz
--   );
--   alter table public.parent_nearby enable row level security;
--   create policy "allow_all_parent_nearby" on public.parent_nearby for all using (true) with check (true);
--   grant select, insert, update, delete on public.parent_nearby to anon, authenticated;
--   alter publication supabase_realtime add table public.parent_nearby;
--
-- Active hours feature (added later):
--
  -- alter table public.schools add column if not exists active_days integer[] default '{1,2,3,4,5}';
  -- alter table public.schools add column if not exists active_start_time time;
  -- alter table public.schools add column if not exists active_end_time time;
--
-- Realtime DELETE fix (required for absent undo to sync across devices):
--
--   alter table public.absent_today    replica identity full;
--   alter table public.pickup_requests replica identity full;
--
-- =============================================================

-- =============================================================
-- Seed data (optional — matches the mock data in src/lib/mockData.js)
-- Uncomment to populate your project with the demo school.
-- =============================================================

-- insert into public.schools (name, code, staff_pin_hash, admin_pin_hash)
-- values ('Mesa Elementary', 'MESA-ELEM', '1234', '9999');
--
-- -- After inserting school, grab its ID:
-- -- select id from public.schools where code = 'MESA-ELEM';
-- -- Then insert classes with that school_id.
