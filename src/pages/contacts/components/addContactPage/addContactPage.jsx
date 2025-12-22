import React from "react";
import "./style.css";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import CustomButton from "../../../../components/customButton/customButton";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../components/themeText/themeText";

export default function AddContactPage({ selectedContact }) {
  const newContact = selectedContact;

  const { textInputBackground, textInputColor } = useThemeColors();
  const { addContact } = useGlobalContacts();
  const { t } = useTranslation();

  const name = newContact?.name?.trim() || t("constants.annonName");
  const username = newContact?.uniqueName;
  const lnurl = newContact?.isLNURL ? newContact?.receiveAddress : null;
  const bio = newContact?.bio?.trim() || t("constants.noBioSet");

  return (
    <div className="container">
      <ThemeText className="name-text" textContent={name} />

      {!!username && (
        <ThemeText className="username-text" textContent={`@${username}`} />
      )}

      {!!lnurl && (
        <div className="info-container">
          <ThemeText className="info-label" textContent={"LNURL Address"} />
          <ThemeText className="info-value" textContent={lnurl} />
        </div>
      )}

      <div
        className="bio-container"
        style={{ backgroundColor: textInputBackground }}
      >
        <ThemeText
          textStyles={{ color: textInputColor, margin: 0 }}
          textContent={bio}
        />
      </div>

      <CustomButton
        actionFunction={() => {
          addContact(newContact);
        }}
        buttonStyles={{ marginTop: "auto" }}
        textContent={t("contacts.editMyProfilePage.addContactBTN")}
      />
    </div>
  );
}
