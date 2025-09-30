import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { getStorage } from "firebase/storage";
import { useGlobalContacts } from "./globalContacts";
import { useAppStatus } from "./appStatus";
import { BLITZ_PROFILE_IMG_STORAGE_REF } from "../constants";
import { ImageCacheDB } from "../functions/contacts/imageCacheDb";

const ImageCacheContext = createContext();

export function ImageCacheProvider({ children }) {
  const [cache, setCache] = useState({});
  const { didGetToHomepage } = useAppStatus();
  const { decodedAddedContacts } = useGlobalContacts();
  const didRunContextCacheCheck = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const keys = await ImageCacheDB.getAllKeys();
        const initialCache = {};

        for (const key of keys) {
          const value = await ImageCacheDB.getItem(key);
          if (value && value.blob) {
            const uuid = key.replace(BLITZ_PROFILE_IMG_STORAGE_REF + "/", "");
            const blobUrl = URL.createObjectURL(value.blob);
            initialCache[uuid] = { ...value, uri: blobUrl };
          }
        }

        setCache(initialCache);
      } catch (e) {
        console.error("Error loading image cache from IndexedDB", e);
      }
    })();
  }, []);

  useEffect(() => {
    return;
    if (!didGetToHomepage) return;
    if (didRunContextCacheCheck.current) return;
    didRunContextCacheCheck.current = true;
    console.log(decodedAddedContacts, "DECIN FUNC");
    async function refreshContactsImages() {
      for (let index = 0; index < decodedAddedContacts.length; index++) {
        const element = decodedAddedContacts[index];
        await refreshCache(element.uuid);
      }
    }
    refreshContactsImages();
  }, [decodedAddedContacts, didGetToHomepage]);

  async function refreshCache(uuid, hasDownloadURL) {
    try {
      const key = `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}`;
      let url;
      let metadata;
      let updated;

      if (!hasDownloadURL) {
        const reference = getStorage().ref(
          `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}.jpg`
        );
        metadata = await reference.getMetadata();
        updated = metadata.updated;

        const cached = await ImageCacheDB.getItem(key);
        if (cached && cached.updated === updated) {
          const blobUrl = URL.createObjectURL(cached.blob);
          const newCache = { ...cached, uri: blobUrl };
          setCache((prev) => ({ ...prev, [uuid]: newCache }));
          return newCache;
        }

        url = await reference.getDownloadURL();
      } else {
        url = hasDownloadURL;
        updated = new Date().toISOString();
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const newCacheEntry = {
        updated,
        blob,
      };

      await ImageCacheDB.setItem(key, newCacheEntry);

      const newDisplayEntry = {
        ...newCacheEntry,
        uri: blobUrl,
      };

      setCache((prev) => ({ ...prev, [uuid]: newDisplayEntry }));

      return newDisplayEntry;
    } catch (err) {
      console.error("Error refreshing image cache", err);
    }
  }

  async function removeProfileImageFromCache(uuid) {
    try {
      const key = `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}`;
      await ImageCacheDB.deleteItem(key);
      const newCacheEntry = {
        uri: null,
        updated: new Date().toISOString(),
      };
      setCache((prev) => ({ ...prev, [uuid]: newCacheEntry }));
      return newCacheEntry;
    } catch (err) {
      console.error("Error deleting image from cache", err);
    }
  }

  return (
    <ImageCacheContext.Provider
      value={{ cache, refreshCache, removeProfileImageFromCache }}
    >
      {children}
    </ImageCacheContext.Provider>
  );
}

export function useImageCache() {
  return useContext(ImageCacheContext);
}
