import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Storage from "../functions/localStorage";
import { CUSTODY_ACCOUNTS_STORAGE_KEY } from "../constants";
import { decryptMnemonic, encryptMnemonic } from "../functions/handleMnemonic";
import { useKeysContext } from "./keysContext";
import { useGlobalContextProvider } from "./masterInfoObject";

// Create a context for the WebView ref
const ActiveCustodyAccount = createContext(null);

export const ActiveCustodyAccountProvider = ({ children }) => {
  const { masterInfoObject } = useGlobalContextProvider();
  const [custodyAccounts, setCustodyAccounts] = useState([]);
  const [isUsingNostr, setIsUsingNostr] = useState(false);
  const { accountMnemoinc } = useKeysContext();
  const [nostrSeed, setNostrSeed] = useState("");
  const hasSessionReset = useRef(false);
  const selectedAltAccount = custodyAccounts.filter((item) => item.isActive);
  const didSelectAltAccount = !!selectedAltAccount.length;
  const enabledNWC = masterInfoObject.didViewNWCMessage;

  // useEffect(() => {
  //   if (nostrSeed.length || !enabledNWC) return;
  //   async function getNostrSeed() {
  //     const NWCMnemoinc = (await retrieveData(NWC_SECURE_STORE_MNEMOINC)).value;
  //     if (!NWCMnemoinc) return;
  //     setNostrSeed(NWCMnemoinc);
  //   }
  //   getNostrSeed();
  // }, [nostrSeed, enabledNWC]);

  const toggleIsUsingNostr = (value) => {
    setIsUsingNostr(value);
  };
  useEffect(() => {
    async function initializeAccouts() {
      try {
        const accoutList = Storage.getItem(CUSTODY_ACCOUNTS_STORAGE_KEY) || [];

        const decryptedList = accoutList.map((item) =>
          JSON.parse(decryptMnemonic(item, accountMnemoinc))
        );

        setCustodyAccounts(decryptedList);
      } catch (err) {
        console.log("Custody account intialization error", err);
      }
    }

    console.log("Initializing accounts....");
    if (!accountMnemoinc) return;
    initializeAccouts();
  }, [accountMnemoinc]);

  // Clear active account once per session to sync with default accountMnemonic
  useEffect(() => {
    if (!custodyAccounts.length || hasSessionReset.current || !accountMnemoinc)
      return;

    async function clearActiveAccountsOnSessionStart() {
      try {
        const hasActiveAccounts = custodyAccounts.some(
          (account) => account.isActive
        );

        if (hasActiveAccounts) {
          console.log("Clearing active accounts for session sync...");

          const clearedAccounts = custodyAccounts.map((account) => ({
            ...account,
            isActive: false,
          }));

          Storage.setItem(
            CUSTODY_ACCOUNTS_STORAGE_KEY,
            encriptAccountsList(clearedAccounts)
          );

          setCustodyAccounts(clearedAccounts);
        }

        hasSessionReset.current = true;
      } catch (err) {
        console.log("Session reset error", err);
        hasSessionReset.current = true;
      }
    }

    clearActiveAccountsOnSessionStart();
  }, [custodyAccounts, accountMnemoinc]);

  const encriptAccountsList = (custodyAccounts) => {
    return custodyAccounts.map((item) =>
      encryptMnemonic(JSON.stringify(item), accountMnemoinc)
    );
  };

  const removeAccount = async (account) => {
    try {
      let accountInformation = JSON.parse(JSON.stringify(custodyAccounts));
      let newAccounts = accountInformation.filter((accounts) => {
        return accounts.uuid !== account.uuid;
      });
      //   clear spark information here too. Delte txs from database, reove listeners
      Storage.setItem(
        CUSTODY_ACCOUNTS_STORAGE_KEY,
        encriptAccountsList(newAccounts)
      );

      setCustodyAccounts(newAccounts);
      return { didWork: true };
    } catch (err) {
      console.log("Remove account error", err);
      return { didWork: false, err: err.message };
    }
  };
  const createAccount = async (accountInformation) => {
    try {
      let savedAccountInformation = JSON.parse(JSON.stringify(custodyAccounts));

      savedAccountInformation.push(accountInformation);

      console.log(savedAccountInformation);
      Storage.setItem(
        CUSTODY_ACCOUNTS_STORAGE_KEY,
        encriptAccountsList(savedAccountInformation)
      );

      setCustodyAccounts(savedAccountInformation);
      return { didWork: true };
    } catch (err) {
      console.log("Create custody account error", err);
      return { didWork: false, err: err.message };
    }
  };

  const updateAccount = async (account) => {
    try {
      let accountInformation = JSON.parse(JSON.stringify(custodyAccounts));
      let newAccounts = accountInformation.map((accounts) => {
        if (account.uuid === accounts.uuid) {
          return { ...accounts, ...account };
        } else return accounts;
      });

      Storage.setItem(
        CUSTODY_ACCOUNTS_STORAGE_KEY,
        encriptAccountsList(newAccounts)
      );

      setCustodyAccounts(newAccounts);
      return { didWork: true };
    } catch (err) {
      console.log("Remove account error", err);
      return { didWork: false, err: err.message };
    }
  };
  const updateAccountCacheOnly = async (account) => {
    try {
      if (!account) throw new Error("No account selected");
      let accountInformation = JSON.parse(JSON.stringify(custodyAccounts));
      let newAccounts = accountInformation.map((accounts) => {
        if (account.uuid === accounts.uuid) {
          return { ...accounts, ...account };
        } else return { ...accounts, isActive: false };
      });

      setCustodyAccounts(newAccounts);
      return { didWork: true };
    } catch (err) {
      console.log("Remove account error", err);
      return { didWork: false, err: err.message };
    }
  };

  const currentWalletMnemoinc = useMemo(() => {
    if (didSelectAltAccount) {
      return selectedAltAccount[0].mnemoinc;
    } else if (isUsingNostr) {
      return nostrSeed;
    } else {
      return accountMnemoinc;
    }
  }, [
    accountMnemoinc,
    selectedAltAccount,
    didSelectAltAccount,
    isUsingNostr,
    nostrSeed,
  ]);

  const isUsingAltAccount = currentWalletMnemoinc !== accountMnemoinc;

  return (
    <ActiveCustodyAccount.Provider
      value={{
        custodyAccounts,
        removeAccount,
        createAccount,
        updateAccount,
        updateAccountCacheOnly,
        selectedAltAccount,
        isUsingAltAccount,
        currentWalletMnemoinc,
        toggleIsUsingNostr,
        isUsingNostr,
        nostrSeed,
      }}
    >
      {children}
    </ActiveCustodyAccount.Provider>
  );
};

export const useActiveCustodyAccount = () => {
  return React.useContext(ActiveCustodyAccount);
};
