import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Typed Supabase client instance for all data access across the app.
 * (Wrapper exists because legacy modules still import from ./supabase.js)
 */
export const supabaseClient = supabase as SupabaseClient;

export type { SupabaseClient };

