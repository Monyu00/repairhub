# Bulk import forces password reset

Bulk-imported users start with an Email Username-derived Default Password. Because this password is predictable, imported accounts are marked as requiring a password change and cannot continue into the dashboard until they set a new password. Admin password resets use the same state. Users may update only their own non-sensitive profile fields; `must_change_password`, `user_role`, and `is_active` remain privileged.
