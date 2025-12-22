import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGlobalContacts } from "../../../contexts/globalContacts";
import { useAppStatus } from "../../../contexts/appStatus";
import {
  decryptMessage,
  encryptMessage,
} from "../../../functions/encodingAndDecoding";
import { useKeysContext } from "../../../contexts/keysContext";
import { useOverlay } from "../../../contexts/overlayContext";

/**
 * Custom hook for managing profile image operations
 * Handles adding, uploading, and deleting profile images for contacts
 */
export function useExpandedNavbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openOverlay } = useOverlay();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { isConnectedToTheInternet } = useAppStatus();
  const { globalContactsInformation, toggleGlobalContactsInformation } =
    useGlobalContacts();

  /**
   * toggle whether a contact is a favorite
   * @param {object} selectedContact - The contact object (only needed if not editing own profile)
   */
  const handleFavortie = async ({ selectedContact }) => {
    if (!isConnectedToTheInternet) {
      navigate.navigate("ErrorScreen", {
        errorMessage: t("errormessages.nointernet"),
      });
      return;
    }
    if (!selectedContact) return;
    toggleGlobalContactsInformation(
      {
        myProfile: { ...globalContactsInformation.myProfile },
        addedContacts: await encryptMessage(
          contactsPrivateKey,
          publicKey,
          JSON.stringify(
            [
              ...JSON.parse(
                await decryptMessage(
                  contactsPrivateKey,
                  publicKey,
                  globalContactsInformation.addedContacts
                )
              ),
            ].map((savedContact) => {
              if (savedContact.uuid === selectedContact.uuid) {
                return {
                  ...savedContact,
                  isFavorite: !savedContact.isFavorite,
                };
              } else return savedContact;
            })
          )
        ),
      },
      true
    );
  };

  /**
   * navigate to settings page
   * @param {object} params - Upload parameters
   * @param {object} selectedContact - The contact object (only needed if not editing own profile)
   */
  const handleSettings = ({ selectedContact }) => {
    if (!isConnectedToTheInternet) {
      openOverlay({
        for: "error",
        errorMessage: t("errormessages.nointernet"),
      });
      return;
    }
    if (!selectedContact) return;
    navigate("/edit-profile", {
      state: {
        pageType: "addedContact",
        selectedAddedContact: selectedContact,
      },
    });
  };

  return {
    handleFavortie,
    handleSettings,
  };
}
