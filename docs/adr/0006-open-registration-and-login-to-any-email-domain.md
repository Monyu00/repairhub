# Open registration and login to any Email domain

Self-service registration and login no longer restrict Email addresses to the `stust.edu.tw` domain or its subdomains. The restriction was an undocumented implementation choice, and it applied only to self-service flows: admin-created accounts in the dashboard already accepted any domain, and the auth callback signed out non-school accounts after the code exchange, which also rejected Google OAuth logins from outside the school. Role policy is unchanged: a newly registered account is a general user with no role, and `admin` and `technician` roles remain admin-assigned only (ADR-0002).

## Consequences

- The domain guard is deleted from the client schemas, the server actions, and the auth callback, together with the `invalid-domain` callback error path.
- Email syntax is now checked by the client zod schemas; the server actions rely on Supabase Auth to reject malformed addresses, and registration still checks password length at the server.
- A disposable-address blocklist was considered and rejected as unrequested, so throwaway registrations are bounded only by the Supabase rate limiting and confirmation settings the project already has.
