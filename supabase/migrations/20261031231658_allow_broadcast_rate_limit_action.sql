alter table private.admin_rate_limits
  drop constraint if exists admin_rate_limits_action_check;

alter table private.admin_rate_limits
  add constraint admin_rate_limits_action_check
  check (action in ('read', 'write', 'session', 'broadcast'));
