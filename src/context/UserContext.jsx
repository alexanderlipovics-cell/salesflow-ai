import { createContext, useContext, useMemo } from "react";
import { getBootstrapUser } from "../lib/user";

const UserContext = createContext(null);

export const UserProvider = ({ children, initialUser = null }) => {
  const user = useMemo(
    () => initialUser || getBootstrapUser(),
    [initialUser]
  );
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
