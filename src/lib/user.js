const DEFAULT_USER = {
  id: "demo-user-001",
  name: "Demo User",
  email: "demo@salesflow.ai",
  plan: "free",
};

let cachedUser = null;

export const getBootstrapUser = () => {
  if (cachedUser) return cachedUser;
  cachedUser = { ...DEFAULT_USER };
  return cachedUser;
};

export const setBootstrapUser = (user) => {
  cachedUser = { ...DEFAULT_USER, ...user };
  return cachedUser;
};

export const resetBootstrapUser = () => {
  cachedUser = { ...DEFAULT_USER };
  return cachedUser;
};
