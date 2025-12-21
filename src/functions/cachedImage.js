/**
 * getCachedProfileImage.js
 * Browser-compatible profile image caching using storage.js
 */

import { getStorage, ref, getDownloadURL, getMetadata } from "firebase/storage";
import {
  deleteCachedImage,
  downloadAndCacheImage,
  getCachedImage,
  getCachedImageMetadata,
} from "./images/storage";
import { BLITZ_PROFILE_IMG_STORAGE_REF } from "../constants";

// Helper to generate cache key
const CACHE_KEY = (uuid) => `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}`;

/**
 * Get cached profile image from Firebase Storage
 * Checks cache first, validates against Firebase metadata, downloads if needed
 *
 * @param {string} uuid - User unique identifier
 * @param {Object} storage - Firebase storage instance (optional, will use default if not provided)
 * @param {boolean} asDataURL - If true, returns data URL; if false, returns object URL
 * @returns {Promise<{localUri: string, updated: string, isObjectURL?: boolean}|null>}
 */
export async function getCachedProfileImage(
  uuid,
  storage = null,
  asDataURL = true
) {
  try {
    // Use provided storage or get default
    const storageInstance = storage || getStorage();

    const key = CACHE_KEY(uuid);

    // Get Firebase Storage reference
    const reference = ref(
      storageInstance,
      `${BLITZ_PROFILE_IMG_STORAGE_REF}/${uuid}.jpg`
    );

    // Get metadata from Firebase to check if image has been updated
    const metadata = await getMetadata(reference);
    const updated = metadata.updated;

    // Check for cached image and its metadata
    const cachedMetadata = await getCachedImageMetadata(key);

    // If cached version matches current version, return cached image
    if (cachedMetadata?.updated === updated) {
      const cachedImage = await getCachedImage(key, asDataURL);

      if (cachedImage) {
        return {
          localUri: cachedImage.uri,
          updated: cachedMetadata.updated,
          isObjectURL: cachedImage.isObjectURL,
        };
      }
    }

    // Download new image if cache is stale or doesn't exist
    const url = await getDownloadURL(reference);

    // Download and cache the image with metadata
    const blob = await downloadAndCacheImage(key, url, { updated });

    if (!blob) {
      throw new Error("Failed to download image");
    }

    // Get the newly cached image
    const cachedImage = await getCachedImage(key, asDataURL);

    if (!cachedImage) {
      throw new Error("Failed to retrieve cached image");
    }

    return {
      localUri: cachedImage.uri,
      updated,
      isObjectURL: cachedImage.isObjectURL,
    };
  } catch (e) {
    console.log("Error caching profile image:", e);
    return null;
  }
}

/**
 * Preload multiple profile images into cache
 * Useful for loading images in bulk (e.g., contact list)
 *
 * @param {string[]} uuids - Array of user UUIDs
 * @param {Object} storage - Firebase storage instance
 * @returns {Promise<Object>} Object with success/failure counts
 */
export async function preloadProfileImages(uuids, storage = null) {
  const storageInstance = storage || getStorage();
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  await Promise.all(
    uuids.map(async (uuid) => {
      try {
        const result = await getCachedProfileImage(uuid, storageInstance);
        if (result) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ uuid, error: "Failed to cache" });
        }
      } catch (e) {
        results.failed++;
        results.errors.push({ uuid, error: e.message });
      }
    })
  );

  return results;
}
