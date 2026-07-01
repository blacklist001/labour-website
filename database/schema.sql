-- LABOUR initial Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('worker-photos', 'worker-photos', true)
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('client', 'worker', 'admin')),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'sw')),
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
add column if not exists privacy_accepted_at timestamptz;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  service_category text not null default 'General',
  created_at timestamptz not null default now()
);

alter table public.services
add column if not exists service_category text not null default 'General';

insert into public.services (name, slug, service_category)
values
  ('Plumbers', 'plumber', 'Home & Repair Services'),
  ('Electricians', 'electrician', 'Home & Repair Services'),
  ('Painters', 'painter', 'Home & Repair Services'),
  ('Carpenters', 'carpenter', 'Home & Repair Services'),
  ('Masons', 'mason', 'Home & Repair Services'),
  ('Roofers', 'roofer', 'Home & Repair Services'),
  ('Welders', 'welder', 'Home & Repair Services'),
  ('Glass installers', 'glass-installer', 'Home & Repair Services'),
  ('Mechanics', 'mechanic', 'Automotive Services'),
  ('Car electricians', 'car-electrician', 'Automotive Services'),
  ('Tire repair', 'tire-repair', 'Automotive Services'),
  ('Vehicle inspection', 'vehicle-inspection', 'Automotive Services'),
  ('Car wash and detailing', 'car-wash-detailing', 'Automotive Services'),
  ('House cleaners', 'house-cleaner', 'Cleaning Services'),
  ('Office cleaners', 'office-cleaner', 'Cleaning Services'),
  ('Sofa cleaning', 'sofa-cleaning', 'Cleaning Services'),
  ('Window cleaning', 'window-cleaning', 'Cleaning Services'),
  ('Cleaners', 'cleaner', 'Cleaning Services'),
  ('Movers', 'mover', 'Moving & Transport'),
  ('Packers', 'packer', 'Moving & Transport'),
  ('Delivery riders', 'delivery-rider', 'Moving & Transport'),
  ('Farm laborers', 'farm-laborer', 'Farm Services'),
  ('Tree pruning', 'tree-pruning', 'Garden Services'),
  ('Landscaping', 'landscaping', 'Garden Services'),
  ('Grass cutting', 'grass-cutting', 'Garden Services'),
  ('Garden maintenance', 'garden-maintenance', 'Garden Services'),
  ('Gardeners', 'gardener', 'Garden Services'),
  ('Computer repair', 'computer-repair', 'Technical Services'),
  ('Phone repair', 'phone-repair', 'Technical Services'),
  ('CCTV installation', 'cctv-installation', 'Technical Services'),
  ('Network installation', 'network-installation', 'Technical Services'),
  ('Babysitters', 'babysitter', 'Domestic Services'),
  ('Caregivers', 'caregiver', 'Domestic Services'),
  ('Cooks', 'cook', 'Domestic Services'),
  ('Housekeepers', 'housekeeper', 'Domestic Services'),
  ('Casual labourers', 'casual-labourer', 'Construction Services'),
  ('Site supervisors', 'site-supervisor', 'Construction Services'),
  ('Quantity surveyors', 'quantity-surveyor', 'Construction Services'),
  ('Contractors', 'contractor', 'Construction Services')
on conflict (slug) do update
set
  name = excluded.name,
  service_category = excluded.service_category;

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
  verification_status text not null default 'verified' check (verification_status in ('pending', 'verified', 'rejected')),
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

alter table public.worker_profiles
alter column verification_status set default 'verified';

update public.worker_profiles
set verification_status = 'verified'
where verification_status = 'pending';

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
  payment_method text not null default 'cash',
  payment_status text not null default 'unpaid',
  payment_reference text,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_result_code integer,
  mpesa_result_description text,
  mpesa_amount numeric(12, 2),
  mpesa_phone text,
  mpesa_paid_at text,
  quoted_price numeric(12, 2) check (quoted_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
add column if not exists contact_phone text;

alter table public.bookings
add column if not exists payment_status text not null default 'unpaid';

alter table public.bookings
add column if not exists payment_reference text;

alter table public.bookings
add column if not exists merchant_request_id text;

alter table public.bookings
add column if not exists checkout_request_id text;

alter table public.bookings
add column if not exists mpesa_result_code integer;

alter table public.bookings
add column if not exists mpesa_result_description text;

alter table public.bookings
add column if not exists mpesa_amount numeric(12, 2);

alter table public.bookings
add column if not exists mpesa_phone text;

alter table public.bookings
add column if not exists mpesa_paid_at text;

update public.bookings
set payment_method = 'mpesa'
where payment_method = 'online';

alter table public.bookings
drop constraint if exists bookings_payment_method_check;

alter table public.bookings
add constraint bookings_payment_method_check
check (payment_method in ('cash', 'mpesa', 'card'));

alter table public.bookings
drop constraint if exists bookings_payment_status_check;

alter table public.bookings
add constraint bookings_payment_status_check
check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
on public.profiles (role);

create index if not exists services_category_name_idx
on public.services (service_category, name);

create index if not exists worker_profiles_user_id_idx
on public.worker_profiles (user_id);

create index if not exists worker_profiles_verification_created_idx
on public.worker_profiles (verification_status, created_at desc);

create index if not exists worker_profiles_rating_idx
on public.worker_profiles (rating_average desc, rating_count desc);

create index if not exists worker_services_service_id_idx
on public.worker_services (service_id);

create index if not exists worker_photos_worker_id_idx
on public.worker_photos (worker_id);

create index if not exists bookings_client_created_idx
on public.bookings (client_id, created_at desc);

create index if not exists bookings_worker_created_idx
on public.bookings (worker_id, created_at desc);

create index if not exists bookings_status_idx
on public.bookings (status);

create index if not exists bookings_checkout_request_idx
on public.bookings (checkout_request_id);

create index if not exists reviews_worker_id_idx
on public.reviews (worker_id);

create index if not exists reviews_client_id_idx
on public.reviews (client_id);

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
drop policy if exists "Active worker profiles are public" on public.worker_profiles;
create policy "Active worker profiles are public"
on public.worker_profiles for select
using (verification_status <> 'rejected' or user_id = auth.uid() or public.is_admin());

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

drop policy if exists "Workers can add their own photo records" on public.worker_photos;
create policy "Workers can add their own photo records"
on public.worker_photos for insert
with check (
  exists (
    select 1
    from public.worker_profiles wp
    where wp.id = worker_photos.worker_id
      and wp.user_id = auth.uid()
  )
);

drop policy if exists "Worker storage photos are public" on storage.objects;
create policy "Worker storage photos are public"
on storage.objects for select
using (bucket_id = 'worker-photos');

drop policy if exists "Workers can upload their own storage photos" on storage.objects;
create policy "Workers can upload their own storage photos"
on storage.objects for insert
with check (
  bucket_id = 'worker-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Booking workers can read client profiles" on public.profiles;
create policy "Booking workers can read client profiles"
on public.profiles for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings b
    join public.worker_profiles wp on wp.id = b.worker_id
    where b.client_id = profiles.id
      and wp.user_id = auth.uid()
  )
);

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
