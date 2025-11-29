const FALLBACK_USER = {
  id: "demo-user",
  name: "Lena Velocity",
  email: "lena@salesflow.ai",
  team: "Revenue",
};

const STORAGE_KEY = "salesflow:user";

const parseStoredUser = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id) {
      return parsed;
    }
  } catch (error) {
    console.warn("Could not parse stored user payload", error);
  }
  return null;
};

/**
 * Returns a deterministic bootstrap user so the UI can render
 * without waiting for Supabase/Auth. Falls back to demo data
 * that mirrors the previous test environment.
 */
export const getBootstrapUser = () => {
  if (typeof window === "undefined") {
    return FALLBACK_USER;
  }

  const storedUser = parseStoredUser(
    window.localStorage?.getItem(STORAGE_KEY) || null
  );
  if (storedUser) {
    return storedUser;
  }

  window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(FALLBACK_USER));
  return FALLBACK_USER;
};

export const persistBootstrapUser = (user) => {
  if (typeof window === "undefined" || !user) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn("Could not persist bootstrap user", error);
  }
};
