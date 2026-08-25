"use client";

import { setClientCookie } from "../cookie.client";
import type { PreferenceKey, PreferenceValueMap } from "./preferences-config";

export function persistPreference<K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]): void {
  setClientCookie(key, value);
}
