-- LABOUR initial Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('client', 'worker', 'admin')),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'sw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.services (name, slug)
values
  ('Mason', 'mason'),
  ('Plumber', 'plumber'),
  ('Electrician', 'electrician'),
  ('Painter', 'painter'),
  ('Carpenter', 'carpenter'),
  ('Cleaner', 'cleaner'),
  ('Gardener', 'gardener')
on conflict (slug) do nothing;

create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text,
  phone text,
  bio text,
  location_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  experience_years integer not null default 0 check (experience_years >= 0),
  base_price numeric(12, 2) check (base_price >= 0),
  availability text not null default 'available',
  working_hours text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  emergency_jobs boolean not null default false,
  rating_average numeric(3, 2) not null default 0 check (rating_average >= 0 and rating_average <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worker_profiles
add column if not exists display_name text;

alter table public.worker_profiles
add column if not exists phone text;

create table if not exists public.worker_services (
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (worker_id, service_id)
);

create table if not exists public.worker_photos (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  job_title text not null,
  job_description text,
  job_location text,
  contact_phone text,
  scheduled_for timestamptz,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'online')),
  quoted_price numeric(12, 2) check (quoted_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
add column if not exists contact_phone text;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as '
begin
  new.updated_at = now();
  return new;
end;
';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as '
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = ''admin''
  );
';

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_worker_profiles_updated_at on public.worker_profiles;
create trigger set_worker_profiles_updated_at
before update on public.worker_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.refresh_worker_rating()
returns trigger
language plpgsql
as '
begin
  update public.worker_profiles
  set
    rating_average = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.reviews r
      where r.worker_id = new.worker_id
    ), 0),
    rating_count = (
      select count(*)
      from public.reviews r
      where r.worker_id = new.worker_id
    )
  where id = new.worker_id;

  return new;
end;
';

drop trigger if exists refresh_worker_rating_after_review on public.reviews;
create trigger refresh_worker_rating_after_review
after insert or update on public.reviews
for each row execute function public.refresh_worker_rating();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_services enable row level security;
alter table public.worker_photos enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Services are public" on public.services;
create policy "Services are public"
on public.services for select
using (true);

drop policy if exists "Verified worker profiles are public" on public.worker_profiles;
create policy "Verified worker profiles are public"
on public.worker_profiles for select
using (verification_status = 'verified' or user_id = auth.uid() or public.is_admin());

drop policy if exists "Worker services are public" on public.worker_services;
create policy "Worker services are public"
on public.worker_services for select
using (true);

drop policy if exists "Workers can manage their own services" on public.worker_services;
create policy "Workers can manage their own services"
on public.worker_services for all
using (
  exists (
    select 1
    from public.worker_profiles wp
    where wp.id = worker_services.worker_id
      and wp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.worker_profiles wp
    where wp.id = worker_services.worker_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Worker photos are public" on public.worker_photos;
create policy "Worker photos are public"
on public.worker_photos for select
using (true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Workers can create their own worker profile" on public.worker_profiles;
create policy "Workers can create their own worker profile"
on public.worker_profiles for insert
with check (user_id = auth.uid());

drop policy if exists "Workers can update their own worker profile" on public.worker_profiles;
create policy "Workers can update their own worker profile"
on public.worker_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins can update worker verification" on public.worker_profiles;
create policy "Admins can update worker verification"
on public.worker_profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Clients can create bookings" on public.bookings;
create policy "Clients can create bookings"
on public.bookings for insert
with check (client_id = auth.uid());

drop policy if exists "Clients and workers can read their bookings" on public.bookings;
create policy "Clients and workers can read their bookings"
on public.bookings for select
using (
  client_id = auth.uid()
  or exists (
    select 1
    from public.worker_profiles wp
    where wp.id = bookings.worker_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Clients and workers can update their bookings" on public.bookings;
create policy "Clients and workers can update their bookings"
on public.bookings for update
using (
  client_id = auth.uid()
  or exists (
    select 1
    from public.worker_profiles wp
    where wp.id = bookings.worker_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Booking participants can read reviews" on public.reviews;
create policy "Booking participants can read reviews"
on public.reviews for select
using (
  client_id = auth.uid()
  or exists (
    select 1
    from public.worker_profiles wp
    where wp.id = reviews.worker_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Reviews are public for worker cards" on public.reviews;
create policy "Reviews are public for worker cards"
on public.reviews for select
using (true);

drop policy if exists "Clients can review completed bookings" on public.reviews;
create policy "Clients can review completed bookings"
on public.reviews for insert
with check (
  client_id = auth.uid()
  and exists (
    select 1
    from public.bookings b
    where b.id = reviews.booking_id
      and b.client_id = auth.uid()
      and b.status = 'completed'
  )
);
