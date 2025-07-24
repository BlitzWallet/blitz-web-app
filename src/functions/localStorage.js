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
