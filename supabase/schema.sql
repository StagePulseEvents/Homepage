-- StagePulse Events: Supabase schema
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'employee' check (role in ('admin','employee')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  event_type text not null,
  event_date date not null,
  venue text not null,
  services text[] not null,
  quantities text,
  guest_count integer,
  message text,
  status text not null default 'Neu' check (status in ('Neu','Angenommen','In Bearbeitung','Abgeschlossen','Abgelehnt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  note text not null,
  author_email text not null,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_created_at_idx on public.inquiries(created_at desc);
create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiry_notes_inquiry_id_idx on public.inquiry_notes(inquiry_id);

-- Profile for each new authenticated account. Admin must promote the first owner manually.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,role) values(new.id,new.email,'employee')
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_notes enable row level security;

create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active=true);
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active=true and role='admin');
$$;

create policy "staff can read own profile" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read inquiries" on public.inquiries for select to authenticated using (public.is_active_staff());
create policy "staff update inquiries" on public.inquiries for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "staff read notes" on public.inquiry_notes for select to authenticated using (public.is_active_staff());
create policy "staff add notes" on public.inquiry_notes for insert to authenticated with check (public.is_active_staff() and author_email=(auth.jwt()->>'email'));

-- No public table insert/select policy: public submissions go through the rate-limited Edge Function.
-- No client-side profile insert policy. First admin account is created in Auth, then promoted manually:
-- update public.profiles set role='admin' where email='YOUR_OWNER_EMAIL';
