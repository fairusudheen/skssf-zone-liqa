-- Fix ambiguous column reference in mark_attendance().
-- The RETURNS TABLE output named registration_id/checked_in_at conflicted with
-- the table columns inside the PL/pgSQL function, causing every check-in to
-- fail with SQLSTATE 42702.
--
-- This version uses the primary-key constraint for ON CONFLICT, uses
-- GET DIAGNOSTICS instead of RETURNING, and resolves column references as
-- columns when names collide.

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
