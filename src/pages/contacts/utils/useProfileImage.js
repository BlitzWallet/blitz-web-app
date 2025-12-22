import React, { useState, useRef, createContext, useContext } from "react";
import { useOverlay } from "../../../contexts/overlayContext";
import { useGlobalContacts } from "../../../contexts/globalContacts";
import { useImageCache } from "../../../contexts/imageCacheContext";
import {
  deleteDatabaseImage,
  setDatabaseIMG,
} from "../../../../db/photoStorage";

// Profile Image Hook
export function useProfileImage() {
  const { openOverlay } = useOverlay();
  const { globalContactsInformation, toggleGlobalContactsInformation } =
    useGlobalContacts();
  const { refreshCache, removeProfileImageFromCache } = useImageCache();

  const [isAddingImage, setIsAddingImage] = useState(false);

  /**
   * Opens file picker and gets image from library
   */
  const getImageFromLibrary = async () => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve({ didRun: false });
          return;
        }

        if (!file.type.startsWith("image/")) {
          resolve({ didRun: true, error: "Please select a valid image file" });
          return;
        }

        try {
          const imgURL = await fileToImageData(file);
          resolve({ didRun: true, imgURL, file });
        } catch (error) {
          resolve({ didRun: true, error: "Failed to load image" });
        }
      };

      input.click();
    });
  };

  /**
   * Converts File to image data with dimensions
   */
  const fileToImageData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            uri: e.target.result,
            width: img.width,
            height: img.height,
            file,
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Gets a profile picture for a contact
   */
  const getProfileImage = async () => {
    try {
      const imagePickerResponse = await getImageFromLibrary();
      const { didRun, error, imgURL } = imagePickerResponse;

      if (!didRun) return;

      if (error) {
        openOverlay({
          for: "error",
          errorMessage: error,
        });
        return;
      }

      const startTime = Date.now();
      setIsAddingImage(true);

      const savedImage = await resizeImage({ imgURL });

      if (!savedImage.uri) return;

      const offsetTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 700 - offsetTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      console.log(savedImage, imgURL, "test");
      return { comparison: savedImage, imgURL };
    } catch (err) {
      console.log("error getting profile image", err);
    } finally {
      setIsAddingImage(false);
    }
  };

  /**
   * Saves a profile picture for a contact
   */
  const saveProfileImage = async (
    imgData,
    isEditingMyProfile,
    selectedContact
  ) => {
    try {
      if (isEditingMyProfile) {
        const response = await uploadProfileImage({
          imgBlob: imgData.comparison.blob, // Pass the blob, not the URI
          imgURL: imgData.comparison.uri, // Keep URI for cache
          uuid: globalContactsInformation.myProfile.uuid,
        });

        if (!response) return;

        toggleGlobalContactsInformation(
          {
            myProfile: {
              ...globalContactsInformation.myProfile,
              hasProfileImage: true,
            },
            addedContacts: globalContactsInformation.addedContacts,
          },
          true
        );
        return;
      }

      if (selectedContact) {
        await refreshCache(selectedContact.uuid, imgData.comparison.uri, false);
      }
    } catch (err) {
      console.log("error saving profile image", err);
    }
  };

  /**
   * Resizes and crops an image to a circle for profile pictures
   */
  const resizeImage = async ({ imgURL }) => {
    try {
      const { width: originalWidth, height: originalHeight, uri } = imgURL;
      const photoWidth = originalWidth * 0.95;
      const photoHeight = originalHeight * 0.95;
      const targetSize = 250;

      const smallerDimension = Math.min(photoWidth, photoHeight);
      const cropSize = smallerDimension;
      const cropX = (photoWidth - cropSize) / 2;
      const cropY = (photoHeight - cropSize) / 2;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            targetSize,
            targetSize
          );

          canvas.toBlob(
            (blob) => {
              const resizedUri = URL.createObjectURL(blob);
              resolve({
                uri: resizedUri,
                width: targetSize,
                height: targetSize,
                blob,
              });
            },
            "image/webp",
            0.4
          );
        };
        img.src = uri;
      });
    } catch (err) {
      console.log("Error resizing image", err);
      return {};
    }
  };

  /**
   * Uploads and processes a profile image
   */
  const uploadProfileImage = async ({ imgBlob, imgURL, uuid, removeImage }) => {
    try {
      if (!removeImage) {
        console.log(imgURL);
        const response = await setDatabaseIMG(uuid, imgBlob);
        if (response) {
          await refreshCache(uuid, imgURL, false);
          return true;
        } else {
          throw new Error("Unable to save profile image");
        }
      } else {
        await deleteDatabaseImage(uuid);
        await removeProfileImageFromCache(uuid);
        return true;
      }
    } catch (err) {
      console.log(err);
      openOverlay({ for: "error", errorMessage: err.message });
      return false;
    }
  };

  /**
   * Deletes a profile picture
   */
  const deleteProfilePicture = async (
    isEditingMyProfile,
    selectedContact = null
  ) => {
    try {
      if (isEditingMyProfile) {
        console.log(globalContactsInformation.myProfile.uuid);
        const response = await uploadProfileImage({
          removeImage: true,
          uuid: globalContactsInformation.myProfile.uuid,
        });

        if (!response) return;

        toggleGlobalContactsInformation(
          {
            myProfile: {
              ...globalContactsInformation.myProfile,
              hasProfileImage: false,
            },
            addedContacts: globalContactsInformation.addedContacts,
          },
          true
        );
        return;
      }

      if (selectedContact) {
        await removeProfileImageFromCache(selectedContact.uuid);
      }
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: "Failed to delete profile image",
      });
      console.log(err);
    }
  };

  return {
    isAddingImage,
    deleteProfilePicture,
    getProfileImage,
    saveProfileImage,
  };
}
