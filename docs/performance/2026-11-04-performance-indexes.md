# 2026-11-04 Performance Indexes

## Applied Migration

- Project: `zgmyabmxxtgzbeplodde`
- Migration: `20261104155336_add_performance_indexes`

## Advisor Evidence

Before:

- `unindexed_foreign_keys`: 10
- `auth_rls_initplan`: 9
- `multiple_permissive_policies`: 6

After:

- `unindexed_foreign_keys`: absent
- `auth_rls_initplan`: 9 (handled in #140)
- `multiple_permissive_policies`: 6 (handled in #140)
- New indexes appear under `unused_index` immediately after creation because statistics have not recorded usage yet.

## Representative Plans

Open Ticket queue:

```text
Limit
  -> Index Scan using idx_tickets_created_at on tickets
       Filter: status = ANY ('{pending,in_progress}')
```

Technician assigned queue:

```text
Limit
  -> Sort
       -> Index Scan using idx_tickets_assigned_status_created_at on tickets
            Index Cond: assigned_to = ... AND status = ANY ('{pending,in_progress}')
```

Dashboard pending count with sequential scans disabled:

```text
Aggregate
  -> Index Only Scan using idx_tickets_status_created_at on tickets
       Index Cond: status = 'pending'
```

One-year Report status range:

```text
HashAggregate
  -> Seq Scan on tickets
       Filter: created_at >= now() - '1 year'
```

The Report query remains a sequential scan because production currently has only 66 Tickets; the `idx_tickets_created_at` index is the scale guard for that access path.
