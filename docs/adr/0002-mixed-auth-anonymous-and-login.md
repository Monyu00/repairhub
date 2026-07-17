# Mixed authentication: anonymous ticket submission with optional login

Ticket submission does not require authentication. Reporters provide an email address as the minimum identifier. Logged-in users (via Google OAuth or email/password through Supabase Auth) additionally get a "my tickets" history view where past submissions are linked by email. This hybrid model maximizes reporting rates — requiring login to report a broken door would deter students — while still allowing identity-linked features for those who opt in.

System roles (`admin`, `technician`) are assigned to authenticated accounts only. A user with no role is a general user who can submit tickets and view their own history. "Reporter" is a behavior anyone can perform, not a managed role.

## Consequences

- The `reporter_email` field on tickets is the universal join key, not a foreign key to the users table (since anonymous reporters have no user record).
- When a user logs in, their history is assembled by matching their verified email against `reporter_email` on existing tickets.
- Supabase RLS policies must handle both authenticated and anonymous access paths.
