"use server";

import { cookies } from "next/headers";

import { type PreferenceKey, type PreferenceValueMap, parsePreference } from "@/lib/preferences/preferences-config";

export async function getPreference<K extends PreferenceKey>(key: K): Promise<PreferenceValueMap[K]> {
  const cookieStore = await cookies();
  return parsePreference(key, cookieStore.get(key)?.value.trim());
}
