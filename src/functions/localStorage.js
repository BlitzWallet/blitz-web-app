const Storage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error("Error saving to localStorage", err);
    }
  },

  getItem: (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error("Error reading from localStorage", err);
      return null;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error("Error removing from localStorage", err);
    }
  },

  removeAllItems: () => {
    try {
      let numberOfItems = localStorage.length;
      let runCount = 0;
      let maxRunCount = 5;
      while (numberOfItems && runCount < maxRunCount) {
        for (let index = 0; index < numberOfItems; index++) {
          const keyName = localStorage.key(index);
          Storage.removeItem(keyName);
        }
        numberOfItems = localStorage.length;
      }
    } catch (err) {
      console.error("Error removing from localStorage", err);
    }
  },
  getAllKeys: () => {
    try {
      let values = [];
      const numberOfItems = localStorage.length;
      for (let index = 0; index < numberOfItems; index++) {
        const keyName = localStorage.key(index);
        values.push(keyName);
      }
      return values;
    } catch (err) {
      console.error("Error getting all keys from localStorage", err);
    }
  },
  multiGet: (keyNames) => {
    try {
      let values = [];
      for (const key of keyNames) {
        const value = Storage.getItem(key);
        values.push([key, value]);
      }
      return values;
    } catch (err) {
      console.error("Error getting all keys from localStorage", err);
    }
  },
};

export default Storage;

// --- AsyncStorage-style API (RN parity): raw string values in window.localStorage ---
// Use these for ports from React Native; keep default `Storage` for JSON-shaped helpers.

export async function setLocalStorageItem(key, val) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, val == null ? "" : String(val));
    return true;
  } catch {
    return false;
  }
}

export async function getLocalStorageItem(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function removeLocalStorageItem(key) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export async function removeAllLocalData() {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.clear();
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function getAllLocalKeys() {
  try {
    if (typeof localStorage === "undefined") return [];
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k != null) keys.push(k);
    }
    return keys;
  } catch (e) {
    console.log(e);
    return [];
  }
}

/** @returns {Promise<Array<[string, string | null]>>} */
export async function getMultipleItems(itemsList) {
  try {
    if (typeof localStorage === "undefined") return [];
    return itemsList.map((key) => [key, localStorage.getItem(key)]);
  } catch (e) {
    console.log(e);
    return [];
  }
}
