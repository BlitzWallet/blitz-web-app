import { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { useGlobalContacts } from "../../../contexts/globalContacts";
import { useKeysContext } from "../../../contexts/keysContext";
import { encryptMessage } from "../../../functions/encodingAndDecoding";

/**
 * Returns a stable `navigateToExpandedContact(contact)` callback.
 * If the contact has not yet been marked as added, it will be marked
 * before navigation — consistent behaviour across ContactsPage and ExpandedTx.
 */
export function useNavigateToContact() {
  const navigate = useNavigate();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const {
    decodedAddedContacts,
    globalContactsInformation,
    toggleGlobalContactsInformation,
  } = useGlobalContacts();

  const navigateToExpandedContact = useCallback(
    async (contact, fromPage) => {
      try {
        if (!contact.isAdded) {
          const newAddedContacts = [...decodedAddedContacts];
          const index = newAddedContacts.findIndex(
            (obj) => obj.uuid === contact.uuid,
          );

          if (index !== -1) {
            newAddedContacts[index] = {
              ...newAddedContacts[index],
              isAdded: true,
            };
          }

          toggleGlobalContactsInformation(
            {
              myProfile: { ...globalContactsInformation.myProfile },
              addedContacts: await encryptMessage(
                contactsPrivateKey,
                publicKey,
                JSON.stringify(newAddedContacts),
              ),
            },
            true,
          );
        }

        navigate("/expandedContactsPage", {
          state: { uuid: contact.uuid },
        });
      } catch (err) {
        console.log("Error navigating to expanded contact", err);
        navigate("/expandedContactsPage", {
          state: { uuid: contact.uuid },
        });
      }
    },
    [
      decodedAddedContacts,
      globalContactsInformation,
      toggleGlobalContactsInformation,
      contactsPrivateKey,
      publicKey,
      navigate,
    ],
  );

  return navigateToExpandedContact;
}
