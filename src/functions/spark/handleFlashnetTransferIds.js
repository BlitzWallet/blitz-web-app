import Storage from "../localStorage";

let flashnetInternalTransferIds = new Set();

export function getFlashnetTransfers() {
  return flashnetInternalTransferIds;
}

export function isFlashnetTransfer(txid) {
  return flashnetInternalTransferIds.has(txid);
}

export function setFlashnetTransfer(txid) {
  flashnetInternalTransferIds.add(txid);
  const current = Array.from(flashnetInternalTransferIds);
  Storage.setItem("savedFlashnetTransferIds", current);
}

export async function loadSavedTransferIds() {
  const savedIds = Storage.getItem("savedFlashnetTransferIds");
  flashnetInternalTransferIds = new Set(savedIds || []);
  return flashnetInternalTransferIds;
}
