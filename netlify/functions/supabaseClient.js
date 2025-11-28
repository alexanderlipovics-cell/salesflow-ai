const { createClient } = require("@supabase/supabase-js");

let cachedSupabase = null;

/**
 * Returns a memoized Supabase service client for Netlify Functions.
 * Keeps the service role key server-side.
 */
function getSupabase() {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "Supabase credentials missing. Please set SUPABASE_URL and a valid key."
    );
    return null;
  }

  cachedSupabase = createClient(url, key);
  return cachedSupabase;
}

module.exports = { getSupabase };
