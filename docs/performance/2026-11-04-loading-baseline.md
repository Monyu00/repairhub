# 2026-11-04 Loading Baseline

Measured against production at `https://repairhub.monyu.dev/` before the Function Region change.

## Deployment

- Project: `repairhub`
- Function Region: `hkg1`
- Target Function Region: `hnd1` (Tokyo)

After deployment, `vercel inspect https://repairhub.monyu.dev` reported all sampled Functions in `hnd1`.

## Public Homepage

| Viewport | TTFB | FCP | LCP | Font Requests | RSC Prefetches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile 390x844 | 25.4 ms | 3,820 ms | 3,820 ms | 22 | 8 |
| Desktop 1440x900 | 21.9 ms | 3,736 ms | 3,736 ms | 22 | 8 |

RSC prefetches include repeated `/login`, `/report`, and `/track/:id` requests.

## Public Homepage After Region Change

| Viewport | TTFB | FCP | LCP | Font Requests | RSC Prefetches |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile 390x844 | 20.0 ms | 1,480 ms | 1,480 ms | 22 | 8 |
| Desktop 1440x900 | 20.3 ms | 2,216 ms | 2,216 ms | 22 | 8 |

The region change reduces Supabase round-trip latency for dynamic requests; font and prefetch reductions are handled in later tickets.

## Dashboard

| Viewport | TTFB | FCP | LCP | Font Requests | Duplicate Auth Requests | Profile Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440x900 | 20.9 ms | 1,104 ms | 1,104 ms | 22 | 2 | 4 |

Mobile baseline for the Dashboard is collected during integration regression because the deployment requires an authenticated test session.

## Tooling

- Core Web Vitals: `agent-browser vitals --json`
- Request counts: `agent-browser network requests`
- Region/deployment evidence: `vercel inspect https://repairhub.monyu.dev`
