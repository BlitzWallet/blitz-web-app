import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addDataToCollection } from "../../db";
import { decryptMessage } from "../functions/encodingAndDecoding";
import { useKeysContext } from "./keysContext";

// Create a context for the WebView ref
const GlobalAppData = createContext(null);

export const GlobalAppDataProvider = ({ children }) => {
  const { contactsPrivateKey, publicKey } = useKeysContext();

  const [globalAppDataInformation, setGlobalAppDatasInformation] = useState({});
  const [giftCardsList, setGiftCardsList] = useState([]);
  const [decodedChatGPT, setDecodedChatGPT] = useState([]);
  const [decodedVPNS, setDecodedVPNS] = useState({});
  const [decodedGiftCards, setDecodedGiftCards] = useState({});
  const [decodedMessages, setDecodedMessages] = useState({
    received: [],
    sent: [],
  });

  const toggleGlobalAppDataInformation = (newData, writeToDB) => {
    setGlobalAppDatasInformation((prev) => {
      const newAppData = { ...prev, ...newData };
      if (writeToDB) {
        addDataToCollection(
          { appData: newAppData },
          "blitzWalletUsers",
          publicKey,
        );
      }
      return newAppData;
    });
  };
  const toggleGiftCardsList = useCallback((giftCards) => {
    setGiftCardsList(giftCards);
  }, []);

  const decryptData = async (key, defaultValue) => {
    let data;
    if (key === "chatGPT") {
      data = globalAppDataInformation[key]?.conversation;
    } else {
      data = globalAppDataInformation[key];
    }
    if (!publicKey || typeof data !== "string") return defaultValue;
    return JSON.parse(
      await decryptMessage(contactsPrivateKey, publicKey, data),
    );
  };

  useEffect(() => {
    async function handleChatGPT() {
      const decryptedConversations = await decryptData("chatGPT", []);
      setDecodedChatGPT({
        conversation: decryptedConversations,
        credits: globalAppDataInformation?.chatGPT?.credits || 0,
      });
    }
    handleChatGPT();
  }, [globalAppDataInformation.chatGPT, publicKey, contactsPrivateKey]);

  useEffect(() => {
    async function handleVPNs() {
      const decodedVPNs = await decryptData("VPNplans", {});
      setDecodedVPNS(decodedVPNs);
    }
    handleVPNs();
  }, [globalAppDataInformation.VPNplans, publicKey, contactsPrivateKey]);

  useEffect(() => {
    async function handleGiftCards() {
      const decodedGiftCards = await decryptData("giftCards", {});
      setDecodedGiftCards(decodedGiftCards);
    }
    handleGiftCards();
  }, [globalAppDataInformation.giftCards, publicKey, contactsPrivateKey]);

  useEffect(() => {
    async function handleMessages() {
      const decodedMessages = await decryptData("messagesApp", {
        received: [],
        sent: [],
      });
      setDecodedMessages(decodedMessages);
    }
    handleMessages();
  }, [globalAppDataInformation.messagesApp, publicKey, contactsPrivateKey]);

  return (
    <GlobalAppData.Provider
      value={{
        decodedChatGPT,
        decodedMessages,
        decodedVPNS,
        globalAppDataInformation,
        decodedGiftCards,
        toggleGlobalAppDataInformation,
        giftCardsList,
        toggleGiftCardsList,
      }}
    >
      {children}
    </GlobalAppData.Provider>
  );
};

export const useGlobalAppData = () => {
  return React.useContext(GlobalAppData);
};
