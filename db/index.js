import {
  addDoc,
  and,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  or,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./initializeFirebase";
import {
  getCachedMessages,
  queueSetCashedMessages,
} from "../src/functions/messaging/cachedMessages";

export async function addDataToCollection(dataObject, collectionName, uuid) {
  try {
    if (!uuid) throw Error("Not authenticated");

    const db = getFirestore();

    const docRef = doc(db, collectionName, uuid);

    await setDoc(docRef, dataObject, { merge: true });

    console.log("Document merged with ID: ", uuid);
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    return false;
  }
}

export async function getDataFromCollection(collectionName, uuid) {
  try {
    if (!uuid) throw Error("Not authenticated");
    try {
      const docRef = doc(db, collectionName, uuid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists) {
        const userData = docSnap.data();
        return userData;
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      return null;
    }
  } catch (err) {
    console.log(err);
    return null;
  }
}
export async function getLnurlPayments(uuid) {
  try {
    if (!uuid) throw Error("User ID missing");

    const paymentsRef = collection(
      db,
      "blitzWalletUsers",
      uuid,
      "lnurlPayments"
    );

    const querySnapshot = await getDocs(paymentsRef);

    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    return payments;
  } catch (err) {
    console.error("Error fetching LNURL payments:", err);
    return [];
  }
}

export async function batchDeleteLnurlPayments(uuid, paymentIds) {
  try {
    if (!uuid) throw Error("User ID missing");
    if (!paymentIds?.length) throw Error("No payment IDs provided");

    const batch = writeBatch(db);

    paymentIds.forEach((paymentId) => {
      const paymentRef = doc(
        db,
        "blitzWalletUsers",
        uuid,
        "lnurlPayments",
        paymentId
      );
      batch.delete(paymentRef);
    });

    await batch.commit();

    return { success: true, count: paymentIds.length };
  } catch (err) {
    console.error("Error batch deleting payments:", err);
    return { success: false, message: err.message };
  }
}

export async function isValidUniqueName(
  collectionName = "blitzWalletUsers",
  wantedName
) {
  try {
    const usersRef = collection(db, collectionName);
    const q = query(
      usersRef,
      where(
        "contacts.myProfile.uniqueNameLower",
        "==",
        wantedName.toLowerCase()
      )
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error checking unique name:", error);
    return false;
  }
}
export async function getSingleContact(
  wantedName,
  collectionName = "blitzWalletUsers"
) {
  try {
    const usersRef = collection(db, collectionName);
    const q = query(
      usersRef,
      where(
        "contacts.myProfile.uniqueNameLower",
        "==",
        wantedName.toLowerCase()
      )
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error fetching contact:", error);
    return [];
  }
}

export async function canUsePOSName(
  collectionName = "blitzWalletUsers",
  wantedName
) {
  try {
    const usersRef = collection(db, collectionName);
    const q = query(
      usersRef,
      where("posSettings.storeNameLower", "==", wantedName.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error checking POS name:", error);

    return false;
  }
}

export async function searchUsers(
  searchTerm,
  collectionName = "blitzWalletUsers"
) {
  const parsedSearchTerm = searchTerm.trim();
  if (!parsedSearchTerm) return [];

  try {
    const usersRef = collection(db, collectionName);
    const term = parsedSearchTerm.toLowerCase();

    // Execute two separate queries and merge results
    const uniqueNameQuery = query(
      usersRef,
      where("contacts.myProfile.uniqueNameLower", ">=", term),
      where("contacts.myProfile.uniqueNameLower", "<=", term + "\uffff"),
      limit(5)
    );

    const nameQuery = query(
      usersRef,
      where("contacts.myProfile.nameLower", ">=", term),
      where("contacts.myProfile.nameLower", "<=", term + "\uffff"),
      limit(5)
    );

    // Execute both queries
    const [uniqueNameSnapshot, nameSnapshot] = await Promise.all([
      getDocs(uniqueNameQuery),
      getDocs(nameQuery),
    ]);

    // Combine results, removing duplicates using Map
    const uniqueUsers = new Map();

    // Process uniqueName results
    uniqueNameSnapshot.docs.forEach((doc) => {
      const profile = doc.data().contacts?.myProfile;
      if (profile?.uuid) {
        uniqueUsers.set(profile.uuid, profile);
      }
    });

    // Process name results
    nameSnapshot.docs.forEach((doc) => {
      const profile = doc.data().contacts?.myProfile;
      if (profile?.uuid) {
        uniqueUsers.set(profile.uuid, profile);
      }
    });

    return Array.from(uniqueUsers.values());
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}

export async function getUnknownContact(
  uuid,
  collectionName = "blitzWalletUsers"
) {
  try {
    const docRef = doc(db, collectionName, uuid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists) {
      return docSnap.data();
    }
    return false;
  } catch (err) {
    console.error("Error fetching unknown contact:", err);
    return null;
  }
}

export async function bulkGetUnknownContacts(
  uuidList,
  collectionName = "blitzWalletUsers"
) {
  // Validate input
  if (!Array.isArray(uuidList) || uuidList.length === 0) {
    console.warn("Invalid UUID list provided");
    return [];
  }

  // Firestore 'in' queries are limited to 10 items in v9
  const MAX_IN_CLAUSE = 10;
  const chunks = [];

  // Split into chunks of 10 UUIDs each
  for (let i = 0; i < uuidList.length; i += MAX_IN_CLAUSE) {
    chunks.push(uuidList.slice(i, i + MAX_IN_CLAUSE));
  }

  try {
    const results = [];

    // Process each chunk sequentially to avoid overwhelming Firestore
    for (const chunk of chunks) {
      const usersRef = collection(db, collectionName);
      const q = query(usersRef, where("contacts.myProfile.uuid", "in", chunk));

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        results.push(...snapshot.docs.map((doc) => doc.data()));
      }
    }

    return results.length > 0 ? results : null;
  } catch (err) {
    console.error("Error fetching bulk contacts:", err);
    return null;
  }
}

export async function updateMessage({
  newMessage,
  fromPubKey,
  toPubKey,
  onlySaveToLocal,
}) {
  try {
    const messagesRef = collection(db, "contactMessages");
    const timestamp = new Date().getTime();

    const message = {
      fromPubKey,
      toPubKey,
      message: newMessage,
      timestamp,
    };

    if (onlySaveToLocal) {
      queueSetCashedMessages({
        newMessagesList: [message],
        myPubKey: fromPubKey,
      });
      return true;
    }

    await addDoc(messagesRef, message);
    console.log("New message was published:", message);
    return true;
  } catch (err) {
    console.error("Error updating message:", err);
    return false;
  }
}

export async function syncDatabasePayment(myPubKey, privateKey) {
  try {
    const cachedConversations = await getCachedMessages();
    const savedMillis = cachedConversations.lastMessageTimestamp;
    console.log("Retrieving docs from timestamp:", savedMillis);
    const messagesRef = collection(db, "contactMessages");

    const combinedQuery = query(
      messagesRef,
      and(
        where("timestamp", ">", savedMillis),
        or(
          where("toPubKey", "==", myPubKey),
          where("fromPubKey", "==", myPubKey)
        )
      ),
      orderBy("timestamp")
    );

    const snapshot = await getDocs(combinedQuery);
    const allMessages = snapshot.docs.map((doc) => doc.data());

    if (allMessages.length === 0) return [];
    console.log(allMessages);
    console.log(`${allMessages.length} messages received from history`);

    const processedMessages = await processWithRAF(
      allMessages,
      myPubKey,
      privateKey
    );

    return processedMessages;
  } catch (err) {
    console.error("Error syncing database payments:", err);
    // Consider adding error handling callback if needed
    return [];
  }
}

function processWithRAF(allMessages, myPubKey, privateKey, onProgress) {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new Worker(
      new URL("../src/workers/messageWorker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = function (e) {
      const { type, data, current, total } = e.data;

      if (type === "PROGRESS") {
        console.log(`Processing: ${current}/${total}`);
        if (onProgress) {
          onProgress(current, total);
        }
      } else if (type === "COMPLETE") {
        worker.terminate();
        resolve(data);
      }
    };

    worker.onerror = function (error) {
      console.error("Worker error:", error);
      worker.terminate();
      reject(error);
    };

    // Send data to worker
    worker.postMessage({
      type: "PROCESS_MESSAGES",
      data: { allMessages, myPubKey, privateKey },
    });
  });
}
