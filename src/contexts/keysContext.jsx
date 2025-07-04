import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { getPublicKey } from "../functions/seed";
// Initiate context
const KeysContextManager = createContext(null);

const KeysContextProvider = ({ children }) => {
  const [contactsPrivateKey, setContactsPrivateKey] = useState("");
  const publicKey = useMemo(
    () => (contactsPrivateKey ? getPublicKey(contactsPrivateKey) : null),
    [contactsPrivateKey]
  );

  const toggleContactsPrivateKey = useCallback((newKey) => {
    setContactsPrivateKey(newKey);
  }, []);

  const contextValue = useMemo(
    () => ({
      contactsPrivateKey,
      publicKey,
      toggleContactsPrivateKey,
    }),
    [contactsPrivateKey, publicKey, toggleContactsPrivateKey]
  );

  return (
    <KeysContextManager.Provider value={contextValue}>
      {children}
    </KeysContextManager.Provider>
  );
};

function useKeysContext() {
  const context = useContext(KeysContextManager);
  if (!context) {
    throw new Error("useKeysContext must be used within a KeysContextProvider");
  }
  return context;
}

export { KeysContextManager, KeysContextProvider, useKeysContext };
