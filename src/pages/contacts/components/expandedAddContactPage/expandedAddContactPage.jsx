import React, { memo, useEffect, useMemo, useState } from "react";
import "./style.css";
import { ArrowLeft, Settings, Star } from "lucide-react";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useExpandedNavbar } from "../../utils/useExpandedNavbar";
import ContactProfileImage from "../profileImage/profileImage";
import { useLocation, useNavigate } from "react-router-dom";
import AddContactPage from "../addContactPage/addContactPage";
import ExpandedContactsPage from "../ExpandedContactsPage/ExpandedContactsPage";

// Memoized shared header component
const SharedHeader = memo(
  ({
    selectedContact,
    imageData,
    theme,
    darkModeType,
    backgroundOffset,
    isContactAdded,
    isEditingMyProfile,
    navigate,
  }) => {
    return (
      <div className="profile-image-container">
        <div
          className="profile-image"
          style={{ backgroundColor: backgroundOffset }}
        >
          <ContactProfileImage
            updated={imageData?.updated}
            uri={imageData?.localUri}
            darkModeType={darkModeType}
            theme={theme}
          />
        </div>
      </div>
    );
  }
);

// Memoized navbar
const MemoizedNavBar = memo(
  ({
    onBack,
    theme,
    darkModeType,
    selectedContact,
    backgroundColor,
    isContactAdded,
    handleFavortie,
    handleSettings,
  }) => {
    return (
      <div className="top-bar">
        <button className="back-button-container" onClick={onBack}>
          <ArrowLeft
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            size={30}
          />
        </button>
        {selectedContact && isContactAdded && (
          <Star
            onClick={() => handleFavortie({ selectedContact })}
            style={{ marginRight: "10px" }}
            fill={
              selectedContact?.isFavorite
                ? theme && darkModeType
                  ? Colors.dark.text
                  : Colors.constants.blue
                : "transparent"
            }
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            size={30}
          />
        )}
        {selectedContact && isContactAdded && (
          <Settings
            onClick={() => handleSettings({ selectedContact })}
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            size={30}
          />
        )}
      </div>
    );
  }
);

export default function ExpandedAddContactsPage({ route }) {
  const { decodedAddedContacts, globalContactsInformation, contactsMessags } =
    useGlobalContacts();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { cache, refreshCacheObject } = useImageCache();
  const { handleFavortie, handleSettings } = useExpandedNavbar();

  const navigate = useNavigate();
  const location = useLocation();
  const props = location.state;
  console.log(props, location);
  const newContact = props;

  useEffect(() => {
    refreshCacheObject();
  }, []);

  // Memoize contact lookup
  const selectedContact = useMemo(() => {
    return decodedAddedContacts.find(
      (contact) =>
        (contact.uuid === newContact?.uuid && contact.isAdded) ||
        (contact.isLNURL &&
          contact.receiveAddress.toLowerCase() ===
            newContact.receiveAddress?.toLowerCase())
    );
  }, [decodedAddedContacts, newContact]);

  const isSelf = useMemo(() => {
    return (
      newContact.uniqueName?.toLowerCase() ===
      globalContactsInformation?.myProfile?.uniqueName?.toLowerCase()
    );
  }, [newContact.uniqueName, globalContactsInformation?.myProfile?.uniqueName]);

  const isContactAdded = !!selectedContact;
  const imageData = cache[newContact?.uuid];
  const contactTransactions = contactsMessags[newContact?.uuid]?.messages || [];

  // Memoize back handler
  const handleBack = useMemo(() => {
    return () => navigate(-1);
  }, [navigate]);

  return (
    <div className="global-theme-view">
      <MemoizedNavBar
        theme={theme}
        darkModeType={darkModeType}
        onBack={handleBack}
        selectedContact={selectedContact}
        backgroundColor={backgroundColor}
        isContactAdded={isContactAdded}
        handleFavortie={handleFavortie}
        handleSettings={handleSettings}
      />

      <div className="scroll-view" style={{}}>
        <SharedHeader
          selectedContact={newContact}
          imageData={imageData}
          theme={theme}
          darkModeType={darkModeType}
          backgroundOffset={backgroundOffset}
          isContactAdded={isContactAdded}
          isEditingMyProfile={isSelf}
          navigate={navigate}
        />

        {isContactAdded ? (
          <ExpandedContactsPage
            uuid={selectedContact.uuid}
            hideProfileImage={true}
          />
        ) : (
          <AddContactPage selectedContact={newContact} />
        )}
      </div>
    </div>
  );
}
