# Cloudflare Turnstile protects anonymous writes

Cloudflare Turnstile protects sign-in, registration, password reset, public report submission, and reporter confirm/reopen actions. Auth flows pass the token through Supabase Auth's built-in CAPTCHA protection, while the other server actions validate it with Cloudflare Siteverify. The Supabase project and Cloudflare widget share one production secret, so `localhost` and a fixed preview hostname use the same real widget instead of Cloudflare test keys. Verification fails closed when the token is missing, invalid, expired, or cannot be checked.

## Consequences

- Supabase Auth rejects direct password and email-change requests that bypass the application server actions, so app-level verification alone is insufficient.
- `TURNSTILE_SECRET_KEY` is also configured in the Supabase Dashboard; the two copies must match for the single active widget.
- Dynamic Vercel Preview hostnames are not used for auth verification because they cannot be added to the widget allowlist.
- Turnstile is not a rate limit; valid-token abuse remains possible until a separate throttling policy is introduced.
