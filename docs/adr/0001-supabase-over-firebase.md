# Supabase over Firebase for backend services

The requirements spec originally called for Firebase (Auth + Firestore + Storage + Cloud Functions). We chose Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) instead because the system needs relational queries for reporting — cross-dimensional aggregation by month, region, and category (FR-18) is painful in Firestore's NoSQL model but trivial in PostgreSQL. Secondary benefits: predictable cost model (vs Firestore's per-read billing with `onSnapshot`), unified deployment on Vercel (vs managing Cloud Functions separately), and lower vendor lock-in (standard SQL vs proprietary SDK).

## Considered Options

- **Firebase (Firestore + Cloud Functions)**: Original spec. Strong real-time sync out of the box. Poor fit for aggregate reporting queries; would require maintaining denormalized counters or exporting to BigQuery.
- **Supabase (PostgreSQL + Edge Functions)**: Relational model handles reporting natively. Realtime subscription available where needed. Auth, Storage, and Edge Functions cover the same surface as Firebase.
- **Neon + NextAuth + S3**: Maximum flexibility but requires assembling multiple services. More operational overhead for no clear benefit over Supabase's integrated offering.
