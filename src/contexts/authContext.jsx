import React, { createContext, useState, useEffect, useContext } from "react";
import Storage from "../functions/localStorage";
import { wipeEntireSparkDatabase } from "../functions/spark/transactions";
import { wipeEntireContactDatabase } from "../functions/messaging/cachedMessages";
import { wipeEntirePOSDatabase } from "../functions/pos";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/** Alias for RN / shared hooks that expect this name (e.g. flashnetContext). */
export const useAuthContext = useAuth;

export const AuthProvider = ({ children, navigate }) => {
  // const navigate = useNavigate();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    lastSession: null,
    walletKey: null,
  });
  const [mnemoinc, setMnemoinc] = useState("");
  /** Bumps when auth/session identity changes so consumers can reset intervals/effects. */
  const [authResetkey, setAuthResetkey] = useState(0);

  const login = (walletKey) => {
    Storage.setItem("walletKey", walletKey);
    Storage.setItem("lastSession", Date.now().toString());

    setAuthState({
      isAuthenticated: true,
      walletKey,
      lastSession: Date.now().toString(),
    });
    setAuthResetkey((k) => k + 1);
    navigate("/connecting");
  };

  const deleteWallet = async () => {
    Storage.removeAllItems();
    await wipeEntireSparkDatabase();
    await wipeEntireContactDatabase();
    await wipeEntirePOSDatabase();

    setAuthState({
      isAuthenticated: false,
      walletKey: null,
      lastSession: null,
    });
    setAuthResetkey((k) => k + 1);
    // navigate("/");
  };

  const logout = () => {
    Storage.removeItem("lastSession");
    setAuthState({
      isAuthenticated: false,
      walletKey: null,
      lastSession: null,
    });
    setAuthResetkey((k) => k + 1);
    navigate("/login");
  };

  const updateSession = () => {
    const currentTime = Date.now();
    Storage.setItem("lastSession", currentTime.toString());

    setAuthState((prevState) => ({
      ...prevState,
      lastSession: currentTime.toString(),
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        authResetkey,
        login,
        logout,
        updateSession,
        setMnemoinc,
        mnemoinc,
        setAuthState,
        deleteWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
