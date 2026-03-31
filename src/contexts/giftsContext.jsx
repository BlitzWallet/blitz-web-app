import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useGlobalContextProvider } from "./masterInfoObject";
import { useKeysContext } from "./keysContext";
import {
  addGiftToDatabase,
  deleteGift,
  handleGiftCheck,
  reloadGiftsOnDomesday,
  updateGiftInDatabase,
} from "../../db";
import {
  saveGiftLocal,
  deleteGiftLocal,
  getAllLocalGifts,
  updateGiftLocal,
} from "../functions/gift/giftsStorage";
import { deriveSparkGiftMnemonic } from "../functions/gift/deriveGiftWallet";
import { deriveKeyFromMnemonic, getPublicKey } from "../functions/seed";
import { encryptMessage } from "../functions/encodingAndDecoding";
import { createGiftUrl } from "../functions/gift/encodeDecodeSecret";
import { GIFT_DERIVE_PATH_CUTOFF } from "../constants";
import Storage from "../functions/localStorage";

const GiftsContext = createContext(null);

export function GiftsContextProvider({ children }) {
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { accountMnemoinc } = useKeysContext();
  const [gifts, setGifts] = useState({});
  const isCheckingRefunds = useRef(false);

  const currentDerivedGiftIndex =
    masterInfoObject?.currentDerivedGiftIndex ?? 1000;

  const updateGiftList = useCallback(() => {
    const allGifts = getAllLocalGifts();
    setGifts(allGifts);
    return allGifts;
  }, []);

  useEffect(() => {
    updateGiftList();
  }, [updateGiftList]);

  const { giftsArray, expiredGiftsArray } = useMemo(() => {
    const now = Date.now();
    const all = [];
    const expired = [];

    Object.values(gifts).forEach((gift) => {
      all.push(gift);
      if (
        now >= gift.expireTime &&
        gift.state?.toLowerCase() !== "claimed" &&
        gift.state?.toLowerCase() !== "reclaimed"
      ) {
        expired.push(gift);
      }
    });

    return {
      giftsArray: all.sort((a, b) => (b.giftNum || 0) - (a.giftNum || 0)),
      expiredGiftsArray: expired.sort(
        (a, b) => (b.giftNum || 0) - (a.giftNum || 0),
      ),
    };
  }, [gifts]);

  const refreshGifts = useCallback(() => {
    setGifts(getAllLocalGifts());
  }, []);

  const saveGiftToCloud = useCallback(async (gift) => {
    try {
      const localObject = JSON.parse(JSON.stringify(gift));
      saveGiftLocal(localObject);

      const cloudData = { ...gift };
      delete cloudData.claimURL;
      const serverResponse = await addGiftToDatabase(cloudData);

      if (!serverResponse) throw new Error("Unable to save gift");
      setGifts((prev) => ({ ...prev, [localObject.uuid]: localObject }));
      return true;
    } catch (err) {
      console.log("error saving gift to cloud", err);
      return false;
    }
  }, []);

  const deleteGiftFromCloudAndLocal = useCallback(async (uuid) => {
    try {
      deleteGiftLocal(uuid);
      const response = await deleteGift(uuid);
      if (!response) throw new Error("Unable to delete gift from remote");
      setGifts((prev) => {
        const next = { ...prev };
        delete next[uuid];
        return next;
      });
      return true;
    } catch (err) {
      console.log("error deleting gift", err);
      return false;
    }
  }, []);

  const updateGiftState = useCallback((uuid, updates) => {
    updateGiftLocal(uuid, updates);
    setGifts((prev) => ({
      ...prev,
      [uuid]: { ...prev[uuid], ...updates, lastUpdated: Date.now() },
    }));
  }, []);

  const incrementGiftIndex = useCallback(async () => {
    const newIndex = currentDerivedGiftIndex + 1;
    await toggleMasterInfoObject({ currentDerivedGiftIndex: newIndex });
  }, [currentDerivedGiftIndex, toggleMasterInfoObject]);

  const checkForRefunds = useCallback(async (giftList) => {
    try {
      if (isCheckingRefunds.current) return;
      isCheckingRefunds.current = true;

      const localGifts = giftList || getAllLocalGifts();
      const giftArray = Object.values(localGifts);
      const now = Date.now();

      const expiredGifts = giftArray.filter(
        (item) => item.state === "Unclaimed" && now >= item.expireTime,
      );

      if (expiredGifts.length === 0) {
        console.log("No expired gifts to check");
        return;
      }

      console.log(`Checking ${expiredGifts.length} expired gifts...`);

      const checkPromises = expiredGifts.map((card) =>
        handleGiftCheck(card.uuid)
          .then((response) => ({ card, response }))
          .catch((error) => {
            console.error(`Error checking gift ${card.uuid}:`, error);
            return { card, response: null };
          }),
      );

      const results = await Promise.all(checkPromises);

      const updatePromises = results
        .filter(({ response }) => response?.didWork)
        .map(async ({ card, response }) => {
          try {
            if (response.wasClaimed) {
              await deleteGift(card.uuid);
            }
            updateGiftLocal(card.uuid, {
              state: response.wasClaimed ? "Claimed" : "Expired",
            });
            console.log(
              `Updated gift ${card.uuid}:`,
              response.wasClaimed ? "Claimed" : "Expired",
            );
          } catch (error) {
            console.error(`Error updating gift ${card.uuid}:`, error);
          }
        });

      await Promise.all(updatePromises);
      setGifts(getAllLocalGifts());
      console.log(`Processed ${updatePromises.length} gift updates`);
    } catch (err) {
      console.log("error checking for gift refunds", err.message);
    } finally {
      isCheckingRefunds.current = false;
    }
  }, []);

  const handleGiftRestoreOnDomesday = useCallback(
    async (giftList) => {
      const giftArray = Object.values(giftList || {});
      if (giftArray.length) return;

      const didCheck = Storage.getItem("checkForOutstandingGifts");
      if (didCheck) return;

      if (!masterInfoObject?.uuid || !accountMnemoinc) return;

      const outstandingGifts = await reloadGiftsOnDomesday(
        masterInfoObject.uuid,
      );

      if (!outstandingGifts.length) {
        Storage.setItem("checkForOutstandingGifts", true);
        return;
      }

      const now = Date.now();

      const reconstructedGifts = await Promise.all(
        outstandingGifts.map(async (item) => {
          let giftWalletMnemonic;

          if (item.createdTime > GIFT_DERIVE_PATH_CUTOFF) {
            giftWalletMnemonic = deriveSparkGiftMnemonic(
              accountMnemoinc,
              item.giftNum,
            );
          } else {
            giftWalletMnemonic = deriveKeyFromMnemonic(
              accountMnemoinc,
              item.giftNum,
            );
          }

          if (item.expireTime < now) {
            const expiredGift = {
              ...item,
              restoreKey: giftWalletMnemonic.derivedMnemonic,
            };
            saveGiftLocal(expiredGift);
            return expiredGift;
          } else {
            const secretBytes = crypto.getRandomValues(new Uint8Array(32));
            const secretHex = Array.from(secretBytes)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            const secretPubKey = getPublicKey(secretBytes);
            const encryptedMnemonic = await encryptMessage(
              secretHex,
              secretPubKey,
              giftWalletMnemonic.derivedMnemonic,
            );
            const urls = createGiftUrl(item.uuid, secretBytes);

            const updatedGift = {
              ...item,
              claimURL: urls.webUrl,
              encryptedText: encryptedMnemonic,
            };

            await Promise.all([
              updateGiftInDatabase(updatedGift),
              saveGiftLocal(updatedGift),
            ]);

            return updatedGift;
          }
        }),
      );

      setGifts((prev) => {
        const next = { ...prev };
        reconstructedGifts.forEach((g) => {
          next[g.uuid] = g;
        });
        return next;
      });

      Storage.setItem("checkForOutstandingGifts", true);
    },
    [accountMnemoinc, masterInfoObject?.uuid],
  );

  useEffect(() => {
    if (!masterInfoObject?.uuid) return;

    (async () => {
      const giftList = getAllLocalGifts();
      setGifts(giftList);
      await checkForRefunds(giftList);
      await handleGiftRestoreOnDomesday(giftList);
    })();
  }, [masterInfoObject?.uuid, checkForRefunds, handleGiftRestoreOnDomesday]);

  const contextValue = useMemo(
    () => ({
      gifts,
      giftsArray,
      expiredGiftsArray,
      currentDerivedGiftIndex,
      saveGiftToCloud,
      deleteGiftFromCloudAndLocal,
      updateGiftState,
      incrementGiftIndex,
      checkForRefunds,
      refreshGifts,
      updateGiftList,
    }),
    [
      gifts,
      giftsArray,
      expiredGiftsArray,
      currentDerivedGiftIndex,
      saveGiftToCloud,
      deleteGiftFromCloudAndLocal,
      updateGiftState,
      incrementGiftIndex,
      checkForRefunds,
      refreshGifts,
      updateGiftList,
    ],
  );

  return (
    <GiftsContext.Provider value={contextValue}>
      {children}
    </GiftsContext.Provider>
  );
}

export function useGifts() {
  const context = useContext(GiftsContext);
  if (!context) {
    throw new Error("useGifts must be used within a GiftsContextProvider");
  }
  return context;
}
