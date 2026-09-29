import { supabase } from "../lib/supabase";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function getCommonHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Ask Supabase for the current logged-in user's session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If they have a valid token, attach it as a Bearer token
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}
