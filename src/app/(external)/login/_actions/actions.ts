"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function loginWithEmail(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function registerWithEmail(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getGoogleOAuthUrl(redirectTo?: string) {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = `${siteUrl}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data.url) {
    return { success: false, error: error?.message ?? "無法啟動 Google 登入流程" };
  }

  return { success: true, url: data.url };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
