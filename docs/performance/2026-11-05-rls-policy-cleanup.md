# 2026-11-05 RLS Policy Cleanup

## Applied Migration

- Project: `zgmyabmxxtgzbeplodde`
- Migration: `20261104160203_harden_rls_policies`

## Advisor Evidence

Before:

- `auth_rls_initplan`: 9
- `multiple_permissive_policies`: 6

After:

- `auth_rls_initplan`: absent
- `multiple_permissive_policies`: absent
- Security advisor findings are unchanged from the pre-existing baseline.

## Behavior Checks

All checks ran in production transactions with `SET LOCAL ROLE` and JWT claim substitution, then rolled back.

Anonymous:

- Read public Buildings.
- Read only the public valid Announcement.
- Could not read an internal Announcement.
- Inserted a pending Ticket.

Authenticated Reporter:

- Updated their own Profile.
- Could not update another Profile.
- Inserted a Ticket note as their own author.

Technician:

- Updated a Ticket assigned to them.
- Could not update an unassigned Ticket.
- Deleted their own Technician Category link.

Admin:

- Updated a Building.
- Updated an Announcement.
- Inserted a Building.

The rewritten policies replace row-by-row `auth.uid()` calls with `(select auth.uid())` and remove overlapping permissive SELECT paths by splitting admin `ALL` policies into command-specific INSERT, UPDATE, and DELETE policies.
