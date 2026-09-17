-- Two live functions had an em dash baked into their default/error text —
-- social_proof_render_template's no-template fallback and
-- admin_send_test_social_proof_event's disabled-test-mode error. Neither
-- changes behavior, just the punctuation in user-facing strings.

create or replace function social_proof_render_template(p_event_type text, p_vars jsonb)
returns text as $$
declare
  v_template text;
  v_result text;
  v_key text;
begin
  select template into v_template from social_proof_templates where event_type = p_event_type;
  if v_template is null then
    v_template := '{name}: ' || p_event_type;
  end if;

  v_result := v_template;
  for v_key in select jsonb_object_keys(p_vars) loop
    v_result := replace(v_result, '{' || v_key || '}', coalesce(p_vars ->> v_key, ''));
  end loop;

  return v_result;
end;
$$ language plpgsql stable set search_path = public;

create or replace function admin_send_test_social_proof_event(p_event_type text, p_vars jsonb, p_amount numeric default null, p_plan_name text default null)
returns social_proof_events as $$
declare
  v_settings social_proof_settings%rowtype;
  v_event social_proof_events%rowtype;
  v_name text;
begin
  if not has_permission('social_proof.manage') then
    raise exception 'not authorized to manage social proof';
  end if;

  select * into v_settings from social_proof_settings limit 1;
  if not v_settings.test_mode_enabled then
    raise exception 'live-looking test notifications are disabled. Enable them in Social Proof settings first.';
  end if;
  if not (p_event_type = any(v_settings.test_event_types)) then
    raise exception 'event type % is not enabled for test broadcasts', p_event_type;
  end if;

  v_name := coalesce(p_vars ->> 'name', social_proof_privacy_name(coalesce(p_vars ->> 'fullName', 'A member'), v_settings.privacy_mode));

  insert into social_proof_events (event_type, source, display_name, message, amount, plan_name, generated_by_admin_id, environment, broadcast_scope)
  values (p_event_type, 'admin_test', v_name,
    social_proof_render_template(p_event_type, p_vars || jsonb_build_object(
      'name', v_name,
      'amount', case when p_amount is not null then '$' || p_amount::text else coalesce(p_vars ->> 'amount', '') end,
      'planName', coalesce(p_plan_name, p_vars ->> 'planName', 'a plan')
    )),
    p_amount, p_plan_name, auth.uid(), coalesce(current_setting('app.environment', true), 'development'), 'client_test')
  returning * into v_event;

  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'client_test_notification_sent', 'social_proof', p_event_type, v_event.message, v_event.environment);

  return v_event;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function admin_send_test_social_proof_event to authenticated;
