import React, { useCallback, useRef, useState } from "react";
import "./style.css";
import ContactProfileImage from "../../../contacts/components/profileImage/profileImage";
import useThemeColors from "../../../../hooks/useThemeColors";
import ActivityIndicator from "../../../../components/activityIndicator/activityIndicator";
import { Colors } from "../../../../constants/theme";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { aboutIcon, ImagesIconDark } from "../../../../constants/icons";
import ThemeText from "../../../../components/themeText/themeText";
import { useTranslation } from "react-i18next";
import CustomInput from "../../../../components/customInput/customInput";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import CustomButton from "../../../../components/customButton/customButton";
import { VALID_USERNAME_REGEX } from "../../../../constants";
import { isValidUniqueName } from "../../../../../db";
import { useOverlay } from "../../../../contexts/overlayContext";

export default function EditLNURLContactOnReceivePage({
  theme,
  darkModeType,
  onClose,
}) {
  const { openOverlay } = useOverlay();
  const { globalContactsInformation, toggleGlobalContactsInformation } =
    useGlobalContacts();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const { backgroundOffset, textInputColor, textColor, backgroundColor } =
    useThemeColors();
  const [isAddingImage, setIsAddingImage] = useState(false);

  const addProfilePicture = useCallback(() => {
    openOverlay({
      for: "error",
      errorMessage: "Coming soon: Image selection!",
    });
  }, []);

  const saveProfileName = useCallback(async () => {
    try {
      if (
        !username ||
        !username.length ||
        globalContactsInformation.myProfile.uniqueName.toLowerCase() ===
          username.toLowerCase()
      ) {
        onClose();
        return;
      }

      if (username.length > 30) return;
      if (!VALID_USERNAME_REGEX.test(username))
        throw new Error(t("contacts.editMyProfilePage.unqiueNameRegexError"));

      const isFreeUniqueName = await isValidUniqueName(
        "blitzWalletUsers",
        username.trim()
      );
      if (!isFreeUniqueName)
        throw new Error(
          t("contacts.editMyProfilePage.usernameAlreadyExistsError")
        );
      toggleGlobalContactsInformation(
        {
          myProfile: {
            ...globalContactsInformation.myProfile,
            uniqueName: username.trim(),
            uniqueNameLower: username.trim().toLowerCase(),
          },
          addedContacts: globalContactsInformation.addedContacts,
        },
        true
      );
      onClose();
    } catch (err) {
      console.log("Saving to database error", err);
      openOverlay({
        for: "error",
        errorMessage: err.message,
      });
    }
  }, [username]);

  return (
    <div className="editLNURLContactOnReceiveContainer">
      <button
        onClick={() => {
          if (isAddingImage) return;
          addProfilePicture();
        }}
        className="profileContainer"
        style={{
          backgroundColor:
            theme && darkModeType ? backgroundColor : backgroundOffset,
        }}
      >
        {isAddingImage ? (
          <ActivityIndicator
            color={theme ? textColor : Colors.constants.blue}
            size="small"
          />
        ) : (
          <ContactProfileImage
            uri={undefined}
            darkModeType={darkModeType}
            theme={theme}
          />
        )}

        <div style={{ backgroundColor: Colors.dark.text }} className="addImage">
          <ThemeImage
            styles={{ width: 15, height: 15 }}
            icon={ImagesIconDark}
            filter={true}
          />
        </div>
      </button>

      {/* Username Input */}
      <div className="infoContainer">
        <ThemeText
          textStyles={{ margin: 0, marginRight: 10 }}
          textContent={t(
            "wallet.receivePages.editLNURLContact.usernameInputDesc"
          )}
        />
        <ThemeImage
          clickFunction={() =>
            openOverlay({
              for: "informationPopup",
              textContent: t(
                "wallet.receivePages.editLNURLContact.informationMessage"
              ),
              buttonText: t("constants.understandText"),
            })
          }
          styles={{ width: 20, height: 20, cursor: "pointer" }}
          icon={aboutIcon}
        />
      </div>
      <div style={{ width: "100%", marginTop: 10, marginBottom: 10 }}>
        <CustomInput
          onchange={setUsername}
          value={username}
          placeholder={globalContactsInformation.myProfile.uniqueName}
          customInputStyles={{
            color:
              username.length < 30
                ? textInputColor
                : theme && darkModeType
                ? textInputColor
                : Colors.constants.cancelRed,
          }}
          containerStyles={{ width: "100%", maxWidth: "unset" }}
        />

        <ThemeText
          textStyles={{
            textAlign: "right",
            color:
              username.length < 30
                ? textInputColor
                : theme && darkModeType
                ? textInputColor
                : Colors.constants.cancelRed,
          }}
          textContent={`${username.length}/30`}
        />
      </div>

      {/* Save Button */}
      <CustomButton
        buttonStyles={{
          marginTop: "auto",
          backgroundColor: theme ? Colors.dark.text : Colors.constants.blue,

          alignSelf: "center",
        }}
        textStyles={{
          color: theme ? Colors.light.text : Colors.dark.text,
        }}
        textContent={t("constants.save")}
        actionFunction={saveProfileName}
      />
    </div>
  );
}
