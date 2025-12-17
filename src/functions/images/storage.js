/**
 * storage.js - Local Image Cache Manager
 * Handles caching of images using IndexedDB and localStorage
 */

const DB_NAME = "ImageCacheDB";
const STORE_NAME = "images";
const METADATA_STORE_NAME = "metadata";
const DB_VERSION = 2;

/**
 * Open or create IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create images store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      // Create metadata store if it doesn't exist
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        db.createObjectStore(METADATA_STORE_NAME);
      }
    };
  });
}

/**
 * Get item from IndexedDB
 */
async function getIndexedDBItem(key, storeName = STORE_NAME) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Set item in IndexedDB
 */
async function setIndexedDBItem(key, value, storeName = STORE_NAME) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete item from IndexedDB
 */
async function deleteIndexedDBItem(key, storeName = STORE_NAME) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Get all keys from IndexedDB store
 */
async function getAllImageKeys(storeName = STORE_NAME) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all items from a store
 */
async function clearStore(storeName = STORE_NAME) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

// ============================================================================
// Image Utility Functions
// ============================================================================

/**
 * Convert blob to data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download image from URL and return as blob
 */
async function downloadImageBlob(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Create object URL from blob (remember to revoke when done)
 */
function createObjectURL(blob) {
  return URL.createObjectURL(blob);
}

/**
 * Revoke object URL to free memory
 */
function revokeObjectURL(url) {
  try {
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Error revoking object URL:", e);
  }
}

// ============================================================================
// High-Level Image Cache Functions
// ============================================================================

/**
 * Store image in cache with metadata
 * @param {string} key - Unique identifier for the image
 * @param {Blob} blob - Image blob data
 * @param {Object} metadata - Additional metadata (e.g., { updated: timestamp })
 */
export async function cacheImage(key, blob, metadata = {}) {
  try {
    // Store the blob in IndexedDB
    await setIndexedDBItem(key, blob, STORE_NAME);

    // Store metadata in IndexedDB metadata store
    const metadataWithTimestamp = {
      ...metadata,
      cachedAt: new Date().toISOString(),
    };
    await setIndexedDBItem(key, metadataWithTimestamp, METADATA_STORE_NAME);

    return true;
  } catch (e) {
    console.error("Error caching image:", e);
    return false;
  }
}

/**
 * Get cached image and its metadata
 * @param {string} key - Unique identifier for the image
 * @param {boolean} asDataURL - If true, returns data URL; if false, returns blob
 */
export async function getCachedImage(key, asDataURL = true) {
  try {
    const blob = await getIndexedDBItem(key, STORE_NAME);
    const metadata = await getIndexedDBItem(key, METADATA_STORE_NAME);

    if (!blob) {
      return null;
    }

    const uri = asDataURL ? await blobToDataURL(blob) : createObjectURL(blob);

    return {
      uri,
      blob,
      metadata,
      isObjectURL: !asDataURL,
    };
  } catch (e) {
    console.error("Error getting cached image:", e);
    return null;
  }
}

/**
 * Download and cache image from URL
 * @param {string} key - Unique identifier for the image
 * @param {string} url - URL to download from
 * @param {Object} metadata - Additional metadata
 */
export async function downloadAndCacheImage(key, url, metadata = {}) {
  try {
    const blob = await downloadImageBlob(url);
    await cacheImage(key, blob, metadata);
    return blob;
  } catch (e) {
    console.error("Error downloading and caching image:", e);
    return null;
  }
}

/**
 * Check if image exists in cache
 * @param {string} key - Unique identifier for the image
 */
export async function isCached(key) {
  try {
    const blob = await getIndexedDBItem(key, STORE_NAME);
    return blob !== undefined && blob !== null;
  } catch (e) {
    console.error("Error checking cache:", e);
    return false;
  }
}

/**
 * Delete cached image and its metadata
 * @param {string} key - Unique identifier for the image
 */
export async function deleteCachedImage(key) {
  try {
    await deleteIndexedDBItem(key, STORE_NAME);
    await deleteIndexedDBItem(key, METADATA_STORE_NAME);
    return true;
  } catch (e) {
    console.error("Error deleting cached image:", e);
    return false;
  }
}

/**
 * Get metadata for a cached image
 * @param {string} key - Unique identifier for the image
 */
export async function getCachedImageMetadata(key) {
  try {
    return await getIndexedDBItem(key, METADATA_STORE_NAME);
  } catch (e) {
    console.error("Error getting cached image metadata:", e);
    return null;
  }
}

/**
 * Update metadata for a cached image
 * @param {string} key - Unique identifier for the image
 * @param {Object} metadata - Metadata to update
 */
export async function updateCachedImageMetadata(key, metadata) {
  try {
    const existing = await getIndexedDBItem(key, METADATA_STORE_NAME);
    const updated = { ...existing, ...metadata };
    await setIndexedDBItem(key, updated, METADATA_STORE_NAME);
    return true;
  } catch (e) {
    console.error("Error updating cached image metadata:", e);
    return false;
  }
}

/**
 * Get all cached image keys
 */
export async function getAllCachedImageKeys() {
  try {
    return await getAllKeys(STORE_NAME);
  } catch (e) {
    console.error("Error getting all cached image keys:", e);
    return [];
  }
}

/**
 * Clear all cached images
 */
export async function clearAllCachedImages() {
  try {
    await clearStore(STORE_NAME);
    await clearStore(METADATA_STORE_NAME);
    return true;
  } catch (e) {
    console.error("Error clearing all cached images:", e);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const keys = await getAllKeys(STORE_NAME);
    const db = await openDatabase();

    // Estimate size (not precise but gives an idea)
    let totalSize = 0;
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const sizes = await Promise.all(
      keys.map((key) => {
        return new Promise((resolve) => {
          const request = store.get(key);
          request.onsuccess = () => {
            const blob = request.result;
            resolve(blob ? blob.size : 0);
          };
          request.onerror = () => resolve(0);
        });
      })
    );

    totalSize = sizes.reduce((sum, size) => sum + size, 0);

    return {
      totalImages: keys.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  } catch (e) {
    console.error("Error getting cache stats:", e);
    return null;
  }
}

export {
  blobToDataURL,
  createObjectURL,
  revokeObjectURL,
  downloadImageBlob,
  getIndexedDBItem,
  getAllImageKeys,
  setIndexedDBItem,
  deleteIndexedDBItem,
};
