import { useState, useMemo, useCallback } from "react";
import "./contactsList.css";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import ContactProfileImage from "../profileImage/profileImage";
import { ArrowLeft } from "lucide-react";
import CustomSettingsNavBar from "../../../../components/customSettingsNavbar";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../../../contexts/themeContext";
import { useAppStatus } from "../../../../contexts/appStatus";
import CustomInput from "../../../../components/customInput/customInput";
import ThemeText from "../../../../components/themeText/themeText";
import { useNavigate } from "react-router-dom";

const formatDisplayName = (contact) => {
  return contact.name || contact.uniqueName || "";
};

export default function ChooseContactListPage() {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { isConnectedToTheInternet } = useAppStatus();
  const { decodedAddedContacts } = useGlobalContacts();
  const { cache } = useImageCache();

  const navigateToExpandedContact = useCallback((contact, imageData) => {
    console.log("Navigate to contact:", contact, imageData);
    navigate("/sendAndRequestPage", {
      replace: true,
      state: {
        selectedContact: contact,
        paymentType: "send",
        imageData,
      },
    });
  }, []);

  const sortedContacts = useMemo(() => {
    return [...decodedAddedContacts].sort((contactA, contactB) => {
      const nameA = contactA?.name || contactA?.uniqueName || "";
      const nameB = contactB?.name || contactB?.uniqueName || "";
      return nameA.localeCompare(nameB);
    });
  }, [decodedAddedContacts]);

  const filteredContacts = useMemo(() => {
    return sortedContacts.filter((contact) => {
      return (
        contact.name.toLowerCase().startsWith(inputText.toLowerCase()) ||
        (!contact.isLNURL &&
          contact.uniqueName
            ?.toLowerCase()
            ?.startsWith(inputText.toLowerCase()))
      );
    });
  }, [sortedContacts, inputText]);

  return (
    <div className="contact-picker-container">
      <CustomSettingsNavBar text={t("wallet.contactsPage.header")} />

      <div className="contacts-list">
        <CustomInput
          containerStyles={{ maxWidth: "unset" }}
          onchange={setInputText}
          placeholder={t("wallet.contactsPage.inputTextPlaceholder")}
        />
        <ThemeText
          textStyles={{ margin: 0 }}
          textContent={t("wallet.contactsPage.subHeader")}
        />
        {filteredContacts.map((contact) => (
          <div
            key={contact.uuid}
            className="contact-row"
            onClick={() =>
              navigateToExpandedContact(contact, cache[contact.uuid])
            }
          >
            <div className="contact-image-container">
              <ContactProfileImage
                updated={cache[contact.uuid]?.updated}
                uri={cache[contact.uuid]?.localUri}
                darkModeType={darkModeType}
                theme={theme}
              />
            </div>

            <div className="name-container">
              <ThemeText
                textStyles={{ margin: 0 }}
                textContent={
                  formatDisplayName(contact) || contact.uniqueName || ""
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
