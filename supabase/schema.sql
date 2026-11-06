-- LIQA' 2026 — fresh database schema for the Next.js app.
-- Run this once in a new Supabase project's SQL editor.
-- This file is safe to re-run: branches are upserted and objects use IF NOT EXISTS.

create extension if not exists pgcrypto;

-- Branch catalogue -----------------------------------------------------------
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  branch_key text not null unique,
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

insert into public.branches (name, branch_key, sort_order) values
  ('രാമന്തളി', 'രാമന്തളി', 1),
  ('എട്ടിക്കുളം', 'എട്ടിക്കുളം', 2),
  ('കവ്വായി', 'കവ്വായി', 3),
  ('കാറമേൽ', 'കാറമേൽ', 4),
  ('പുഞ്ചക്കാട്', 'പുഞ്ചക്കാട്', 5),
  ('കാങ്കോൽ', 'കാങ്കോൽ', 6),
  ('ഏച്ചിലാം വയൽ', 'ഏച്ചിലാം വയൽ', 7),
  ('മാത്തിൽ', 'മാത്തിൽ', 8),
  ('പെരുമ്പ', 'പെരുമ്പ', 9),
  ('കുണ്ടയം കൊവ്വൽ', 'കുണ്ടയം കൊവ്വൽ', 10),
  ('കരിവെള്ളൂർ', 'കരിവെള്ളൂർ', 11),
  ('കാങ്കോൽ ടൗൺ', 'കാങ്കോൽ ടൗൺ', 12),
  ('കൊവ്വപ്പുറം', 'കൊവ്വപ്പുറം', 13),
  ('കൊയപ്പാറ', 'കൊയപ്പാറ', 14),
  ('മണ്ടൂർ', 'മണ്ടൂർ', 15),
  ('പിലാത്തറ', 'പിലാത്തറ', 16),
  ('ചന്തപ്പുര', 'ചന്തപ്പുര', 17),
  ('അങ്ങാടി', 'അങ്ങാടി', 18),
  ('പാലത്തറ', 'പാലത്തറ', 19),
  ('തായിനേരി', 'തായിനേരി', 20),
  ('ആലിൻകീഴ്', 'ആലിൻകീഴ്', 21),
  ('വെള്ളൂർ', 'വെള്ളൂർ', 22)
on conflict (name) do update
  set branch_key = excluded.branch_key,
      sort_order = excluded.sort_order;

-- Registrations --------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null unique
    default ('LIQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  full_name text not null,
  phone text not null unique,
  branch_id uuid not null references public.branches(id) on delete restrict,
  branch_name text not null,
  branch_key text not null,
  role text not null,
  photo_key text,
  qr_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint registrations_full_name_length check (char_length(full_name) between 2 and 100),
  constraint registrations_phone_format check (phone ~ '^[6-9][0-9]{9}$'),
  constraint registrations_role_valid check (
    role in (
      'പ്രസിഡന്റ്',
      'വൈസ് പ്രസിഡന്റ്',
      'ജനറൽ സെക്രട്ടറി',
      'ജോയിന്റ് സെക്രട്ടറി',
      'വർക്കിംഗ് സെക്രട്ടറി',
      'ട്രഷറർ',
      'മെമ്പർ',
      'കൗൺസിലർ'
    )
  )
);

create index if not exists registrations_branch_id_idx
  on public.registrations (branch_id);
create index if not exists registrations_created_at_idx
  on public.registrations (created_at desc);

-- Attendance and organisers --------------------------------------------------
create table if not exists public.attendance (
  registration_id uuid primary key
    references public.registrations(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null
);

create index if not exists attendance_checked_in_at_idx
  on public.attendance (checked_in_at desc);

create table if not exists public.organisers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Public aggregate used by the registration form. It exposes counts only.
create or replace function public.branch_quota()
returns table (branch_name text, registered integer)
language sql
stable
security definer
set search_path = ''
as $$
  select b.name, count(r.id)::integer
  from public.branches b
  left join public.registrations r on r.branch_id = b.id
  group by b.name, b.sort_order
  order by b.sort_order;
$$;

revoke all on function public.branch_quota() from public;
grant execute on function public.branch_quota() to anon, authenticated, service_role;

-- Atomic check-in. Only the server-side service role calls this after it has
-- verified that the signed-in user is an organiser.
create or replace function public.mark_attendance(
  p_token uuid,
  p_organiser uuid default null
)
returns table (
  registration_id uuid,
  registration_code text,
  full_name text,
  branch_name text,
  role text,
  photo_key text,
  checked_in_at timestamptz,
  already_marked boolean,
  total_checked_in integer
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_reg public.registrations%rowtype;
  v_checked timestamptz;
  v_already boolean := false;
  v_total integer;
  v_rows integer;
begin
  select * into v_reg
  from public.registrations
  where qr_token = p_token;

  if not found then
    return;
  end if;

  select a.checked_in_at into v_checked
  from public.attendance a
  where a.registration_id = v_reg.id;

  if v_checked is not null then
    v_already := true;
  else
    insert into public.attendance (registration_id, checked_in_by)
    values (v_reg.id, p_organiser)
    on conflict on constraint attendance_pkey do nothing;

    get diagnostics v_rows = row_count;

    select a.checked_in_at into v_checked
    from public.attendance a
    where a.registration_id = v_reg.id;

    if v_rows = 0 then
      -- Another organiser won the race; report the original check-in time.
      v_already := true;
    end if;
  end if;

  select count(*)::integer into v_total from public.attendance;

  return query
    select
      v_reg.id,
      v_reg.registration_code,
      v_reg.full_name,
      v_reg.branch_name,
      v_reg.role,
      v_reg.photo_key,
      v_checked,
      v_already,
      v_total;
end;
$$;

revoke all on function public.mark_attendance(uuid, uuid) from public;
revoke all on function public.mark_attendance(uuid, uuid) from anon;
revoke all on function public.mark_attendance(uuid, uuid) from authenticated;
grant execute on function public.mark_attendance(uuid, uuid) to service_role;

-- Row level security: no browser role can read or write these tables directly.
-- The Next.js server uses the service-role key and enforces organiser access.
alter table public.branches enable row level security;
alter table public.registrations enable row level security;
alter table public.attendance enable row level security;
alter table public.organisers enable row level security;

revoke all on table public.branches from anon, authenticated;
revoke all on table public.registrations from anon, authenticated;
revoke all on table public.attendance from anon, authenticated;
revoke all on table public.organisers from anon, authenticated;

-- After creating an organiser in Authentication > Users, register their UUID:
--
--   insert into public.organisers (user_id)
--   values ('00000000-0000-0000-0000-000000000000')
--   on conflict (user_id) do nothing;
