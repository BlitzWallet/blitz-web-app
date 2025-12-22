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
  deleteCachedMessages,
  getCachedMessages,
  queueSetCashedMessages,
} from "../functions/messaging/cachedMessages";
import { db } from "../../db/initializeFirebase";
import { useKeysContext } from "./keysContext";
import {
  and,
  collection,
  onSnapshot,
  or,
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
  const [updateDB, setUpdateDB] = useState(null);

  const didTryToUpdate = useRef(false);
  const lookForNewMessages = useRef(true);
  const unsubscribeMessagesRef = useRef(null);
  const unsubscribeSentMessagesRef = useRef(null);
  const pendingWrite = useRef(null);
  const globalContactsInformationRef = useRef(globalContactsInformation);
  const decodedAddedContactsRef = useRef([]);

  const addedContacts = globalContactsInformation.addedContacts;

  useEffect(() => {
    globalContactsInformationRef.current = globalContactsInformation;
  }, [globalContactsInformation]);

  const toggleGlobalContactsInformation = useCallback(
    (newData, writeToDB) => {
      setUpdateDB({ newData, writeToDB });
    },
    [publicKey]
  );

  useEffect(() => {
    if (!updateDB) return;

    async function handleUpdate() {
      const { newData, writeToDB } = updateDB;
      const newContacts = {
        ...globalContactsInformationRef.current,
        ...newData,
      };
      setGlobalContactsInformation(newContacts);
      if (writeToDB) {
        addDataToCollection(
          { contacts: newContacts },
          "blitzWalletUsers",
          publicKey
        );
      }

      setUpdateDB(null);
    }
    handleUpdate();
  }, [updateDB]);

  useEffect(() => {
    decodedAddedContactsRef.current = decodedAddedContacts;
  }, [decodedAddedContacts]);

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
            !decodedAddedContactsRef.current.find(
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
          addedContacts: await encryptMessage(
            contactsPrivateKey,
            globalContactsInformation.myProfile.uuid,
            JSON.stringify(decodedAddedContactsRef.current.concat(newContats))
          ),
        },
        true
      );
    }
  }, [globalContactsInformation, contactsPrivateKey]);

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

  const updateContactUniqueName = useCallback(
    async (newUniqueNames) => {
      try {
        if (newUniqueNames.size === 0) {
          return;
        }
        let newValue = null;
        try {
          // Validate prerequisites
          if (!contactsPrivateKey || !publicKey) {
            console.warn("Missing required data for contact update");
            return;
          }

          let currentContacts;
          try {
            const decryptedData = await decryptMessage(
              contactsPrivateKey,
              publicKey,
              globalContactsInformationRef.current.addedContacts
            );

            if (!decryptedData) {
              console.warn("Decryption returned empty data");
              return;
            }

            currentContacts = JSON.parse(decryptedData);

            // Validate parsed data
            if (!Array.isArray(currentContacts)) {
              console.warn("Decrypted contacts is not an array");
              return;
            }
          } catch (decryptError) {
            console.error(
              "Failed to decode contacts for update:",
              decryptError
            );
            return;
          }

          let hasChanges = false;
          const updatedContacts = currentContacts.map((contact) => {
            try {
              const newUniqueName = newUniqueNames.get(contact.uuid);

              if (
                newUniqueName &&
                typeof newUniqueName === "string" &&
                newUniqueName.trim() !== "" &&
                newUniqueName !== contact.uniqueName
              ) {
                hasChanges = true;
                return {
                  ...contact,
                  uniqueName: newUniqueName,
                };
              }

              return contact;
            } catch (mapError) {
              console.error("Error processing contact:", mapError);
              return contact;
            }
          });

          if (!hasChanges) {
            return;
          }

          try {
            const newEncryptedContacts = await encryptMessage(
              contactsPrivateKey,
              publicKey,
              JSON.stringify(updatedContacts)
            );

            if (!newEncryptedContacts) {
              console.error("Encryption failed, aborting update");
              return;
            }

            addDataToCollection(
              {
                contacts: {
                  ...globalContactsInformationRef.current,
                  addedContacts: newEncryptedContacts,
                },
              },
              "blitzWalletUsers",
              publicKey
            ).catch((dbError) => {
              console.error("Failed to save contacts to database:", dbError);
            });

            newValue = {
              ...globalContactsInformationRef.current,
              addedContacts: newEncryptedContacts,
            };
          } catch (encryptError) {
            console.error("Failed to encrypt updated contacts:", encryptError);
            return;
          }
        } catch (stateError) {
          console.error("Error in state update function:", stateError);
          return;
        }

        if (newValue) {
          setGlobalContactsInformation(newValue);
        }
      } catch (outerError) {
        console.error("Critical error in updateContactUniqueName:", outerError);
      }
    },
    [contactsPrivateKey, publicKey]
  );

  useEffect(() => {
    if (!Object.keys(globalContactsInformation).length) return;
    const now = new Date().getTime();
    // Unsubscribe from previous listeners before setting new ones
    if (unsubscribeMessagesRef.current) {
      unsubscribeMessagesRef.current();
    }

    const combinedMessageQuery = query(
      collection(db, "contactMessages"),
      and(
        where("timestamp", ">", now),
        or(
          where("toPubKey", "==", globalContactsInformation.myProfile.uuid),
          where("fromPubKey", "==", globalContactsInformation.myProfile.uuid)
        )
      ),
      orderBy("timestamp")
    );

    // Set up the realtime listener
    unsubscribeMessagesRef.current = onSnapshot(
      combinedMessageQuery,
      async (snapshot) => {
        const changes = snapshot?.docChanges();
        if (!changes?.length) return;

        let newMessages = [];
        let newUniqueIds = new Map();

        await Promise.all(
          changes.map(async (change) => {
            if (change.type !== "added") return;

            const newMessage = change.doc.data();
            const isReceived =
              newMessage.toPubKey === globalContactsInformation.myProfile.uuid;
            console.log(
              `${isReceived ? "received" : "sent"} a new message`,
              newMessage
            );

            if (typeof newMessage.message !== "string") {
              newMessages.push(newMessage);
              return;
            }

            const sendersPubkey = isReceived
              ? newMessage.fromPubKey
              : newMessage.toPubKey;

            const decoded = await decryptMessage(
              contactsPrivateKey,
              sendersPubkey,
              newMessage.message
            );

            if (!decoded) return;

            let parsedMessage;
            try {
              parsedMessage = JSON.parse(decoded);
            } catch {
              return;
            }

            if (parsedMessage?.senderProfileSnapshot && isReceived) {
              newUniqueIds.set(
                sendersPubkey,
                parsedMessage.senderProfileSnapshot.uniqueName
              );
            }

            newMessages.push({
              ...newMessage,
              message: parsedMessage,
              sendersPubkey,
              isReceived,
            });
          })
        );

        if (newUniqueIds.size) {
          updateContactUniqueName(newUniqueIds);
        }

        if (newMessages.length) {
          queueSetCashedMessages({
            newMessagesList: newMessages,
            myPubKey: globalContactsInformation.myProfile.uuid,
          });
        }
      }
    );

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, [globalContactsInformation?.myProfile?.uuid, contactsPrivateKey]);

  const addContact = useCallback(
    async (contact) => {
      try {
        const newContact = {
          name: contact.name || "",
          nameLower: contact.nameLower || "",
          bio: contact.bio,
          unlookedTransactions: 0,
          isLNURL: contact.isLNURL,
          uniqueName: contact.uniqueName || "",
          uuid: contact.uuid,
          isAdded: true,
          isFavorite: false,
          profileImage: contact.profileImage,
          receiveAddress: contact.receiveAddress,
          transactions: [],
        };

        let newAddedContacts = JSON.parse(JSON.stringify(decodedAddedContacts));

        const isContactInAddedContacts = newAddedContacts.filter(
          (addedContact) => addedContact.uuid === newContact.uuid
        ).length;

        if (isContactInAddedContacts) {
          newAddedContacts = newAddedContacts.map((addedContact) => {
            if (addedContact.uuid === newContact.uuid) {
              return {
                ...addedContact,
                name: newContact.name,
                nameLower: newContact.nameLower,
                bio: newContact.bio,
                unlookedTransactions: 0,
                isAdded: true,
              };
            } else return addedContact;
          });
        } else newAddedContacts.push(newContact);

        toggleGlobalContactsInformation(
          {
            myProfile: {
              ...globalContactsInformation.myProfile,
              didEditProfile: true,
            },
            addedContacts: await encryptMessage(
              contactsPrivateKey,
              publicKey,
              JSON.stringify(newAddedContacts)
            ),
          },
          true
        );
      } catch (err) {
        console.log("Error adding  contact", err);
      }
    },
    [
      decodedAddedContacts,
      contactsPrivateKey,
      publicKey,
      globalContactsInformation,
    ]
  );

  const deleteContact = useCallback(
    async (contact) => {
      try {
        const newAddedContacts = decodedAddedContacts
          .map((savedContacts) => {
            if (savedContacts.uuid === contact.uuid) {
              return null;
            } else return savedContacts;
          })
          .filter((contact) => contact);

        await deleteCachedMessages(contact.uuid);

        toggleGlobalContactsInformation(
          {
            addedContacts: await encryptMessage(
              contactsPrivateKey,
              publicKey,
              JSON.stringify(newAddedContacts)
            ),
            myProfile: { ...globalContactsInformation.myProfile },
          },
          true
        );
      } catch (err) {
        console.log("Error deleating contact", err);
      }
    },
    [
      decodedAddedContacts,
      contactsPrivateKey,
      publicKey,
      globalContactsInformation,
    ]
  );

  useEffect(() => {
    if (!Object.keys(globalContactsInformation).length) return;
    if (!contactsPrivateKey) return;
    if (!addedContacts) return;

    if (lookForNewMessages.current) {
      lookForNewMessages.current = false;
      async function handleOfflineMessageSync() {
        console.log("RUNNING SYNC DATABAE");
        const restoredPayments = await syncDatabasePayment(
          globalContactsInformation.myProfile.uuid,
          contactsPrivateKey
        );

        if (restoredPayments.length === 0) {
          updatedCachedMessagesStateFunction();
        }

        const contactDataMap = new Map(
          restoredPayments
            .filter(
              (item) =>
                item.isReceived &&
                item?.message?.senderProfileSnapshot?.uniqueName
            )
            .map((item) => [
              item.sendersPubkey,
              item.message.senderProfileSnapshot.uniqueName,
            ])
        );
        updateContactUniqueName(contactDataMap);

        queueSetCashedMessages({
          newMessagesList: restoredPayments,
          myPubKey: globalContactsInformation.myProfile.uuid,
        });
      }
      handleOfflineMessageSync();
    }
  }, [
    globalContactsInformation,
    updatedCachedMessagesStateFunction,
    contactsPrivateKey,
    decodedAddedContacts,
    addedContacts,
  ]);

  const giftCardsList = useMemo(() => {
    if (!contactsMessags) return [];

    const actualContacts = Object.keys(contactsMessags);
    const lastMessageTimestampIndex = actualContacts.indexOf(
      "lastMessageTimestamp"
    );

    // Remove lastMessageTimestamp efficiently
    if (lastMessageTimestampIndex > -1) {
      actualContacts.splice(lastMessageTimestampIndex, 1);
    }

    if (actualContacts.length === 0) return [];

    const giftCards = [];

    // Process contacts efficiently
    for (const contact of actualContacts) {
      const contactData = contactsMessags[contact];
      if (!contactData?.messages?.length) continue;

      // Use for loop for better performance than filter + push
      const messages = contactData.messages;
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (message.message?.giftCardInfo && !message.message.didSend) {
          giftCards.push(message);
        }
      }
    }

    // Sort in-place for memory efficiency
    giftCards.sort((a, b) => {
      const timeA = a.serverTimestamp || a.timestamp;
      const timeB = b.serverTimestamp || b.timestamp;
      return timeB - timeA;
    });

    return giftCards;
  }, [contactsMessags]);

  const hasUnlookedTransactions = useMemo(() => {
    return Object.keys(contactsMessags).some((contactUUID) => {
      if (
        contactUUID === "lastMessageTimestamp" ||
        contactUUID === globalContactsInformation?.myProfile?.uuid
      ) {
        return false;
      }
      const messages = contactsMessags[contactUUID]?.messages;
      return messages?.some((message) => !message.message.wasSeen) || false;
    });
  }, [contactsMessags, globalContactsInformation?.myProfile?.uuid]);

  const contextValue = useMemo(
    () => ({
      decodedAddedContacts,
      globalContactsInformation,
      toggleGlobalContactsInformation,
      contactsMessags,
      updatedCachedMessagesStateFunction,
      giftCardsList,
      hasUnlookedTransactions,
      deleteContact,
      addContact,
    }),
    [
      decodedAddedContacts,
      globalContactsInformation,
      toggleGlobalContactsInformation,
      contactsMessags,
      updatedCachedMessagesStateFunction,
      giftCardsList,
      hasUnlookedTransactions,
      deleteContact,
      addContact,
    ]
  );

  return (
    <GlobalContacts.Provider value={contextValue}>
      {children}
    </GlobalContacts.Provider>
  );
};

export const useGlobalContacts = () => {
  return React.useContext(GlobalContacts);
};
