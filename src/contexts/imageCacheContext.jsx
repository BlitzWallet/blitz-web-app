import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { getDownloadURL, getMetadata, getStorage, ref } from "firebase/storage";
import { useGlobalContacts } from "./globalContacts";
import { useAppStatus } from "./appStatus";
import { BLITZ_PROFILE_IMG_STORAGE_REF } from "../constants";
import {
  clearAllCachedImages,
  deleteCachedImage,
  downloadAndCacheImage,
  getAllImageKeys,
  getCachedImage,
} from "../functions/images/storage";
import { useGlobalContextProvider } from "./masterInfoObject";

const ImageCacheContext = createContext();

export function ImageCacheProvider({ children }) {
  const [cache, setCache] = useState({});
  const { masterInfoObject } = useGlobalContextProvider();
  const { didGetToHomepage } = useAppStatus();
  const { decodedAddedContacts } = useGlobalContacts();
  const didRunContextCacheCheck = useRef(null);
  const cachedImagesRef = useRef(cache);

  const inFlightRequests = useRef(new Map());

  const refreshCacheObject = useCallback(async () => {
    try {
      const keys = await getAllImageKeys();

      const initialCache = {};

      for (const key of keys) {
        const value = await getCachedImage(key);
        if (value) {
          const uuid = key.replace(BLITZ_PROFILE_IMG_STORAGE_REF + "/", "");
          initialCache[uuid] = { ...value, localUri: value.uri };
        }
      }

      setCache(initialCache);
    } catch (e) {
      console.error("Error loading image cache from storage", e);
    }
  }, []);

  useEffect(() => {
    cachedImagesRef.current = cache;
  }, [cache]);

  useEffect(() => {
    refreshCacheObject();
  }, [decodedAddedContacts, refreshCacheObject]); //rerun the cache when adding or removing contacts

  const refreshCache = useCallback(
    async (uuid, hasdownloadURL, skipCacheUpdate = false) => {
      if (inFlightRequests.current.has(uuid)) {
        console.log("Request already in flight for", uuid);
        return inFlightRequests.current.get(uuid);
      }
      const requestPromise = (async () => {
        try {
          console.log("Refreshing image for", uuid);
          const key = `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}`;
          let url;
          let metadata;
          let updated;

          if (!hasdownloadURL) {
            const storageInstance = getStorage();

            const reference = ref(
              storageInstance,
              `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}.jpg`
            );

            metadata = await getMetadata(reference);
            updated = metadata.updated;

            const cached = cache[uuid];
            if (cached && cached.updated === updated) {
              const cachedImage = await getCachedImage(key);
              if (cachedImage) {
                return {
                  uri: cachedImage.uri,
                  localUri: cachedImage.uri,
                  updated: cachedMetadata.updated,
                  isObjectURL: cachedImage.isObjectURL,
                };
              }
            }

            url = await getDownloadURL(reference);
          } else {
            url = hasdownloadURL;
            updated = new Date().toISOString();
          }

          const blob = await downloadAndCacheImage(key, url, { updated });

          if (!blob) {
            throw new Error("Failed to download image");
          }

          // Get the newly cached image
          const cachedImage = await getCachedImage(key);

          if (!cachedImage) {
            throw new Error("Failed to retrieve cached image");
          }

          const newCacheEntry = {
            uri: cachedImage.uri,
            localUri: cachedImage.uri,
            updated,
            isObjectURL: cachedImage.isObjectURL,
          };

          if (!skipCacheUpdate) {
            setCache((prev) => ({ ...prev, [uuid]: newCacheEntry }));
          }

          return newCacheEntry;
        } catch (err) {
          console.log("Error refreshing image cache", err);
          throw err;
        } finally {
          inFlightRequests.current.delete(uuid);
        }
      })();

      inFlightRequests.current.set(uuid, requestPromise);

      return requestPromise;
    },
    [cache]
  );

  const removeProfileImageFromCache = useCallback(async (uuid) => {
    try {
      console.log("Deleting profile image", uuid);
      const key = `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}`;

      const newCacheEntry = {
        uri: null,
        localUri: null,
        updated: new Date().getTime(),
      };

      deleteCachedImage(key);
      setCache((prev) => ({ ...prev, [uuid]: newCacheEntry }));
      return newCacheEntry;
    } catch (err) {
      console.log("Error refreshing image cache", err);
    }
  }, []);

  useEffect(() => {
    if (!didGetToHomepage) return;
    if (didRunContextCacheCheck.current) return;
    if (!masterInfoObject.uuid) return;
    didRunContextCacheCheck.current = true;

    async function refreshContactsImages() {
      // allways check all images, will return cahced image if its already cached. But this prevents against stale images
      let refreshArray = [
        ...decodedAddedContacts,
        { uuid: masterInfoObject.uuid },
      ];

      const validContacts = refreshArray.filter((element) => !element.isLNURL);

      const results = await Promise.allSettled(
        validContacts.map((element) => refreshCache(element.uuid, null, true))
      );

      const cacheUpdates = {};

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          try {
            const uuid = validContacts[index].uuid;
            const newEntry = result.value;
            const existingEntry = cachedImagesRef.current[uuid];

            // Only add to updates if the entry is new or has changed
            if (
              !existingEntry ||
              existingEntry.updated !== newEntry.updated ||
              existingEntry.localUri !== newEntry.localUri
            ) {
              cacheUpdates[uuid] = newEntry;
            }
          } catch (err) {
            console.error("Error updating response", err);
          }
        }
      });

      if (Object.keys(cacheUpdates).length > 0) {
        setCache((prev) => ({ ...prev, ...cacheUpdates }));
      }
    }
    refreshContactsImages();
  }, [
    decodedAddedContacts,
    didGetToHomepage,
    masterInfoObject?.uuid,
    refreshCache,
  ]);

  const contextValue = useMemo(
    () => ({
      cache,
      refreshCache,
      removeProfileImageFromCache,
      refreshCacheObject,
    }),
    [cache, refreshCache, removeProfileImageFromCache, refreshCacheObject]
  );

  return (
    <ImageCacheContext.Provider value={contextValue}>
      {children}
    </ImageCacheContext.Provider>
  );
}

export function useImageCache() {
  return useContext(ImageCacheContext);
}
