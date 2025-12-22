import {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { sendDataToDB } from "../../db/interactionManager";
import { useKeysContext } from "./keysContext";
import { getDataFromCollection } from "../../db";
import { auth } from "../../db/initializeFirebase";

// Initiate context
const GlobalContextManger = createContext(null);

const GlobalContextProvider = ({ children }) => {
  const { publicKey } = useKeysContext();

  const [masterInfoObject, setMasterInfoObject] = useState({});

  const [preloadedUserData, setPreLoadedUserData] = useState({
    isLoading: true,
    data: null,
  });

  const { i18n } = useTranslation();

  const toggleMasterInfoObject = useCallback(
    async (newData, shouldSendToDb = true) => {
      if (newData.userSelectedLanguage) {
        i18n.changeLanguage(newData.userSelectedLanguage);
      }

      setMasterInfoObject((prev) => ({ ...prev, ...newData }));
      if (!shouldSendToDb) return;
      await sendDataToDB(newData, publicKey);
    },
    [i18n, publicKey]
  );

  useEffect(() => {
    async function preloadUserData() {
      try {
        if (auth.currentUser) {
          const collectionData = await getDataFromCollection(
            "blitzWalletUsers",
            auth.currentUser.uid
          );
          if (!collectionData) throw new Error("No data returened");
          setPreLoadedUserData({ isLoading: true, data: collectionData });
        } else throw new Error("No user logged in");
      } catch (err) {
        console.log("Error preloading user data");
        setPreLoadedUserData({ isLoading: false, data: null });
      }
    }
    preloadUserData();
  }, []);

  const contextValue = useMemo(
    () => ({
      toggleMasterInfoObject,
      setMasterInfoObject,
      masterInfoObject,
      preloadedUserData,
      setPreLoadedUserData,
    }),
    [
      toggleMasterInfoObject,
      masterInfoObject,
      setMasterInfoObject,
      preloadedUserData,
      setPreLoadedUserData,
    ]
  );

  return (
    <GlobalContextManger.Provider value={contextValue}>
      {children}
    </GlobalContextManger.Provider>
  );
};

function useGlobalContextProvider() {
  const context = useContext(GlobalContextManger);
  if (!context) {
    throw new Error(
      "useGlobalContextProvider must be used within a GlobalContextProvider"
    );
  }
  return context;
}

export { GlobalContextManger, GlobalContextProvider, useGlobalContextProvider };
