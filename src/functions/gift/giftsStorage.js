import Storage from "../localStorage";

const GIFTS_STORAGE_KEY = "BLITZ_GIFTS";

function getGiftsMap() {
  return Storage.getItem(GIFTS_STORAGE_KEY) || {};
}

function persistGiftsMap(map) {
  Storage.setItem(GIFTS_STORAGE_KEY, map);
}

export function saveGiftLocal(gift) {
  const map = getGiftsMap();
  map[gift.uuid] = gift;
  persistGiftsMap(map);
}

export function deleteGiftLocal(uuid) {
  const map = getGiftsMap();
  delete map[uuid];
  persistGiftsMap(map);
}

export function getAllLocalGifts() {
  return getGiftsMap();
}

export function getGiftByUuid(uuid) {
  const map = getGiftsMap();
  return map[uuid] || null;
}

export function updateGiftLocal(uuid, updates) {
  const map = getGiftsMap();
  if (!map[uuid]) return false;
  map[uuid] = { ...map[uuid], ...updates, lastUpdated: Date.now() };
  persistGiftsMap(map);
  return true;
}
