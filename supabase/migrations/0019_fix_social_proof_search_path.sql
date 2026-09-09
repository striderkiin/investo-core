-- Fixes a security-linter warning (function_search_path_mutable) on three
-- functions added in 0018_social_proof.sql: none of them declared
-- `set search_path`, which is required so a role couldn't shadow an
-- unqualified identifier by manipulating its own search_path. These are
-- read-only helpers (no writes), but the fix costs nothing and closes the
-- finding cleanly. Caught by running Supabase's own security advisor
-- against the real project after applying 0016-0018.

create or replace function social_proof_is_valid_privacy_mode(p_mode text) returns boolean as $$
  select p_mode is not null and p_mode in ('first_name', 'first_initial', 'anonymous');
$$ language sql immutable set search_path = public;

create or replace function social_proof_privacy_name(p_full_name text, p_mode text)
returns text as $$
declare
  v_first text;
  v_mode text;
begin
  v_first := split_part(trim(coalesce(p_full_name, '')), ' ', 1);
  v_mode := case when social_proof_is_valid_privacy_mode(p_mode) then p_mode else 'first_initial' end;

  if v_mode = 'anonymous' then
    return 'A member';
  elsif v_mode = 'first_name' then
    return coalesce(nullif(v_first, ''), 'A member');
  else
    if length(trim(coalesce(p_full_name, ''))) = 0 then
      return 'A member';
    end if;
    return coalesce(nullif(v_first, ''), 'A') || ' ' || upper(left(split_part(trim(p_full_name), ' ', 2), 1)) || '.';
  end if;
end;
$$ language plpgsql immutable set search_path = public;

create or replace function social_proof_render_template(p_event_type text, p_vars jsonb)
returns text as $$
declare
  v_template text;
  v_result text;
  v_key text;
begin
  select template into v_template from social_proof_templates where event_type = p_event_type;
  if v_template is null then
    v_template := '{name} — ' || p_event_type;
  end if;

  v_result := v_template;
  for v_key in select jsonb_object_keys(p_vars) loop
    v_result := replace(v_result, '{' || v_key || '}', coalesce(p_vars ->> v_key, ''));
  end loop;

  return v_result;
end;
$$ language plpgsql stable set search_path = public;
