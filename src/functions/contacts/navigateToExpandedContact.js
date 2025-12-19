import { encryptMessage } from "../encodingAndDecoding";

export default async function navigateToExpandedContact(
  contact,
  decodedAddedContacts,
  globalContactsInformation,
  toggleGlobalContactsInformation,
  contactsPrivateKey,
  publicKey,
  navigate
) {
  if (!contact.isAdded) {
    let newAddedContacts = [...decodedAddedContacts];
    const indexOfContact = decodedAddedContacts.findIndex(
      (obj) => obj.uuid === contact.uuid
    );

    let newContact = newAddedContacts[indexOfContact];

    newContact["isAdded"] = true;

    toggleGlobalContactsInformation(
      {
        myProfile: { ...globalContactsInformation.myProfile },
        addedContacts: await encryptMessage(
          contactsPrivateKey,
          publicKey,
          JSON.stringify(newAddedContacts)
        ),
      },
      true
    );
  }

  //   navigate("ExpandedContactsPage", {
  //     uuid: contact.uuid,
  //   });
}
