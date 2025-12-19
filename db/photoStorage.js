import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { BLITZ_PROFILE_IMG_STORAGE_REF } from "../src/constants";
import { storage } from "./initializeFirebase";

export async function setDatabaseIMG(publicKey, imgBlob) {
  try {
    if (!(imgBlob instanceof Blob)) {
      throw new Error("Expected a Blob object");
    }

    const reference = ref(
      storage,
      `${BLITZ_PROFILE_IMG_STORAGE_REF}/${publicKey}.webp`
    );

    await uploadBytes(reference, imgBlob);

    const downloadURL = await getDownloadURL(reference);
    return downloadURL;
  } catch (err) {
    console.log("set database image error", err);
    return false;
  }
}

export async function deleteDatabaseImage(publicKey) {
  try {
    const reference = ref(
      storage,
      `${BLITZ_PROFILE_IMG_STORAGE_REF}/${publicKey}.jpg`
    );
    await deleteObject(reference);
    return true;
  } catch (err) {
    console.log("delete profile image error", err);
    if (err.message.includes("No object exists at the desired reference")) {
      return true;
    }
    return false;
  }
}
