import "server-only";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  // Create standard Supabase client with secret key to bypass RLS
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
