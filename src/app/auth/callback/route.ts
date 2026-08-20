import { NextResponse } from "next/server";

import { isAllowedEmailDomain } from "@/lib/auth/validate-email-domain";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 如果不是密碼重設流程，驗證 email 是否屬於允許的學校網域
      const isResetPasswordFlow = next.startsWith("/reset-password");
      if (!isResetPasswordFlow) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email || !isAllowedEmailDomain(user.email)) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=invalid-domain`);
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions or back to login
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
