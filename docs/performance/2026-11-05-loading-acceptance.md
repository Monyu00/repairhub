# 2026-11-05 Loading Performance Acceptance

## Deployment

- Production deployment: `dpl_8USah951fcjrCTGnbVsDqyGqz9io`
- URL: `https://repairhub.monyu.dev`
- Status: `READY`
- Function Region: `hnd1` (Tokyo)

## Core Web Vitals

Public homepage:

| Viewport         |    TTFB |    FCP |    LCP | Font Requests | Ticket Prefetches |
| ---------------- | ------: | -----: | -----: | ------------: | ----------------: |
| Mobile 390x844   | 21.1 ms | 372 ms | 372 ms |             1 |                 0 |
| Desktop 1440x900 | 22.6 ms | 416 ms | 416 ms |             1 |                 0 |

Dashboard:

| Viewport         |    TTFB |    FCP |    LCP | Browser Auth Requests | Browser Profile Requests |
| ---------------- | ------: | -----: | -----: | --------------------: | -----------------------: |
| Mobile 390x844   | 21.5 ms | 588 ms | 588 ms |                     0 |                        0 |
| Desktop 1440x900 | 21.9 ms | 552 ms | 552 ms |                     0 |                        0 |

Reports:

| Viewport         |    TTFB |    FCP |    LCP |
| ---------------- | ------: | -----: | -----: |
| Desktop 1440x900 | 21.8 ms | 792 ms | 792 ms |

The public homepage baseline was 22 Font requests and 8 RSC prefetches. Repeated Ticket rows now have `prefetch={false}`; remaining prefetches are `/login` and `/report`, which are primary navigation paths.

## Browser Behavior

- Public `/report`, `/track/:ticketId`, and `/login` returned HTTP 200.
- Dashboard summary showed `9` pending, `0` today, `6` in progress, and `124.2` average resolution days.
- Reports showed `66` Tickets, `74.2%` completion, `124.2` average resolution days, and `15` pending/in-progress Tickets.
- Reports browser requests contain no raw Ticket query; aggregation happens through the server-side `report_aggregates` RPC.
- Excel export menu opened and produced the success state `Excel 報表匯出成功！`; the PDF export entry was present.
- `agent-browser a11y --json` reported 0 violations on mobile Dashboard and desktop Reports.

## Validation

- `npx tsx --test <all src tests>`: 57 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- Scoped `npx biome check` over 22 changed TypeScript files: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- `report_aggregates` smoke: passed in a production transaction, then rolled back.

## Supabase

Applied migrations:

- `20261104155336_add_performance_indexes`
- `20261104160203_harden_rls_policies`
- `20261104160911_add_report_aggregate_rpc`

Advisor state:

- `unindexed_foreign_keys`: absent
- `auth_rls_initplan`: absent
- `multiple_permissive_policies`: absent
- Performance Advisors only report `unused_index` for newly created indexes that have not accumulated usage statistics yet.
- Security Advisors are unchanged from the pre-existing baseline.
