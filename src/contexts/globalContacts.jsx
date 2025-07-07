import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  addDataToCollection,
  bulkGetUnknownContacts,
  getUnknownContact,
  syncDatabasePayment,
} from "../../db";
import {
  decryptMessage,
  encryptMessage,
} from "../functions/encodingAndDecoding";
import {
  CONTACTS_TRANSACTION_UPDATE_NAME,
  contactsSQLEventEmitter,
  getCachedMessages,
  queueSetCashedMessages,
} from "../functions/messaging/cachedMessages";
import { db } from "../../db/initializeFirebase";
import { useKeysContext } from "./keysContext";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

// Create a context for the WebView ref
const GlobalContacts = createContext(null);

export const GlobalContactsList = ({ children }) => {
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const [globalContactsInformation, setGlobalContactsInformation] = useState(
    {}
  );
  const [contactsMessags, setContactsMessagses] = useState({});
  const [decodedAddedContacts, setDecodedAddedContacts] = useState([]);

  const didTryToUpdate = useRef(false);
  const lookForNewMessages = useRef(false);
  const unsubscribeMessagesRef = useRef(null);
  const unsubscribeSentMessagesRef = useRef(null);
  const pendingWrite = useRef(null);

  const addedContacts = globalContactsInformation.addedContacts;

  const toggleGlobalContactsInformation = useCallback((newData, writeToDB) => {
    console.log("WRITING TO DATABASE TWICE (should only see once)");

    setGlobalContactsInformation((prev) => {
      const newContacts = { ...prev, ...newData };

      if (writeToDB) {
        // Store the data we want to write outside the updater
        pendingWrite.current = newContacts;
      }

      return newContacts;
    });
  }, []);

  useEffect(() => {
    if (pendingWrite.current) {
      console.log("RUNNING IN WRITE TO DB (should only see once)");
      addDataToCollection(
        { contacts: pendingWrite.current },
        "blitzWalletUsers",
        publicKey
      );
      pendingWrite.current = null;
    }
  }, [globalContactsInformation, publicKey]);

  useEffect(() => {
    if (!publicKey || !addedContacts) return;

    const decrypt = async () => {
      if (typeof addedContacts === "string") {
        try {
          const decoded = await decryptMessage(
            contactsPrivateKey,
            publicKey,
            addedContacts
          );
          const parsed = JSON.parse(decoded);
          setDecodedAddedContacts(parsed);
        } catch (e) {
          console.error("Error decrypting or parsing:", e);
          setDecodedAddedContacts([]);
        }
      } else {
        setDecodedAddedContacts([]);
      }
    };

    decrypt();
  }, [addedContacts, publicKey, contactsPrivateKey]);

  const updatedCachedMessagesStateFunction = useCallback(async () => {
    if (!Object.keys(globalContactsInformation).length || !contactsPrivateKey)
      return;
    const savedMessages = await getCachedMessages();
    setContactsMessagses(savedMessages);
    const unknownContacts = await Promise.all(
      Object.keys(savedMessages)
        .filter((key) => key !== "lastMessageTimestamp")
        .filter(
          (contact) =>
            !decodedAddedContacts.find(
              (contactElement) => contactElement.uuid === contact
            ) && contact !== globalContactsInformation.myProfile.uuid
        )
        .map((contact) => getUnknownContact(contact, "blitzWalletUsers"))
    );

    const newContats = unknownContacts
      .filter(
        (retrivedContact) =>
          retrivedContact &&
          retrivedContact.uuid !== globalContactsInformation.myProfile.uuid
      )
      .map((retrivedContact) => ({
        bio: retrivedContact.contacts.myProfile.bio || "No bio",
        isFavorite: false,
        name: retrivedContact.contacts.myProfile.name,
        receiveAddress: retrivedContact.contacts.myProfile.receiveAddress,
        uniqueName: retrivedContact.contacts.myProfile.uniqueName,
        uuid: retrivedContact.contacts.myProfile.uuid,
        isAdded: false,
        unlookedTransactions: 0,
      }));

    if (newContats.length > 0) {
      toggleGlobalContactsInformation(
        {
          myProfile: { ...globalContactsInformation.myProfile },
          addedContacts: encryptMessage(
            contactsPrivateKey,
            globalContactsInformation.myProfile.uuid,
            JSON.stringify(decodedAddedContacts.concat(newContats))
          ),
        },
        true
      );
    }
  }, [globalContactsInformation, decodedAddedContacts, contactsPrivateKey]);

  useEffect(() => {
    async function handleUpdate(updateType) {
      try {
        console.log("Received contact transaction update type", updateType);
        updatedCachedMessagesStateFunction();
      } catch (err) {
        console.log("error in contact messages update function", err);
      }
    }
    contactsSQLEventEmitter.removeAllListeners(
      CONTACTS_TRANSACTION_UPDATE_NAME
    );
    contactsSQLEventEmitter.on(CONTACTS_TRANSACTION_UPDATE_NAME, handleUpdate);

    return () => {
      contactsSQLEventEmitter.removeAllListeners(
        CONTACTS_TRANSACTION_UPDATE_NAME
      );
    };
  }, [updatedCachedMessagesStateFunction]);

  useEffect(() => {
    return;
    if (!Object.keys(globalContactsInformation).length) return;
    const now = new Date().getTime();
    // Unsubscribe from previous listeners before setting new ones
    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current();
    }
    if (unsubscribeSentMessagesRef.current) {
      unsubscribeSentMessagesRef.current();
    }
    const inboundMessageQuery = query(
      collection(db, "contactMessages"),
      where("toPubKey", "==", globalContactsInformation.myProfile.uuid),
      orderBy("timestamp"),
      startAfter(now)
    );
    const outbounddMessageQuery = query(
      collection(db, "contactMessages"),
      where("fromPubKey", "==", globalContactsInformation.myProfile.uuid),
      orderBy("timestamp"),
      startAfter(now)
    );
    // Set up the realtime listener
    unsubscribeMessagesRef.current = onSnapshot(
      inboundMessageQuery,
      (snapshot) => {
        if (!snapshot?.docChanges()?.length) return;
        snapshot.docChanges().forEach((change) => {
          console.log("received a new message", change.type);
          if (change.type === "added") {
            const newMessage = change.doc.data();
            queueSetCashedMessages({
              newMessagesList: [newMessage],
              myPubKey: globalContactsInformation.myProfile.uuid,
            });
          }
        });
      }
    );
    unsubscribeSentMessagesRef.current = onSnapshot(
      outbounddMessageQuery,
      (snapshot) => {
        if (!snapshot?.docChanges()?.length) return;
        snapshot.docChanges().forEach((change) => {
          console.log("sent a new message", change.type);
          if (change.type === "added") {
            const newMessage = change.doc.data();
            queueSetCashedMessages({
              newMessagesList: [newMessage],
              myPubKey: globalContactsInformation.myProfile.uuid,
            });
          }
        });
      }
    );
    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
      if (unsubscribeSentMessagesRef.current) {
        unsubscribeSentMessagesRef.current();
      }
    };
  }, [globalContactsInformation?.myProfile?.uuid]);

  useEffect(() => {
    if (!Object.keys(globalContactsInformation).length) return;
    if (lookForNewMessages.current) return;
    lookForNewMessages.current = true;
    // syncDatabasePayment(
    //   globalContactsInformation.myProfile.uuid,
    //   updatedCachedMessagesStateFunction
    // );
  }, [globalContactsInformation, updatedCachedMessagesStateFunction]);

  return (
    <GlobalContacts.Provider
      value={{
        decodedAddedContacts,
        globalContactsInformation,
        toggleGlobalContactsInformation,
        contactsMessags,
        updatedCachedMessagesStateFunction,
      }}
    >
      {children}
    </GlobalContacts.Provider>
  );
};

export const useGlobalContacts = () => {
  return React.useContext(GlobalContacts);
};
