import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo } from "react";

import { useTranslation } from "react-i18next";

import ContactsTransactionItem from "../../internalComponents/contactTransactions/contactsTransactions";
import ThemeText from "../../../../components/themeText/themeText";
import { useAppStatus } from "../../../../contexts/appStatus";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { queueSetCashedMessages } from "../../../../functions/messaging/cachedMessages";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import CustomSendAndRequsetBTN from "../../../../components/sendAndRequsetButton/customSendAndRequsetButton";
import ContactProfileImage from "../profileImage/profileImage";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import { useServerTimeOnly } from "../../../../contexts/serverTime";
import { useExpandedNavbar } from "../../utils/useExpandedNavbar";
import "./expandedContactsPage.css";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { ArrowLeft, Settings, Share, Star } from "lucide-react";
import {
  Colors,
  HIDDEN_OPACITY,
  INSET_WINDOW_WIDTH,
} from "../../../../constants/theme";

export default function ExpandedContactsPage({
  uuid,
  hideProfileImage: globalHide,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const props = location.state;
  const { isConnectedToTheInternet } = useAppStatus();
  const { theme, darkModeType } = useThemeContext();
  const {
    backgroundOffset,
    backgroundColor,
    textInputColor,
    textInputBackground,
  } = useThemeColors();
  const { decodedAddedContacts, globalContactsInformation, contactsMessags } =
    useGlobalContacts();
  const { cache } = useImageCache();
  const getServerTime = useServerTimeOnly();
  const currentTime = getServerTime();
  const { t } = useTranslation();
  const { handleFavortie, handleSettings } = useExpandedNavbar();
  const selectedUUID = uuid || props?.uuid;
  const myProfile = globalContactsInformation?.myProfile;
  const hideProfileImage = globalHide || props?.hideProfileImage;
  console.log(decodedAddedContacts, props, "hide profile image");
  const [selectedContact] = useMemo(
    () =>
      decodedAddedContacts.filter((contact) => contact?.uuid === selectedUUID),
    [decodedAddedContacts, selectedUUID]
  );
  console.log(selectedContact);
  const imageData = cache[selectedContact.uuid];
  const contactTransactions = contactsMessags[selectedUUID]?.messages || [];

  useEffect(() => {
    //listening for messages when you're on the contact
    async function updateSeenTransactions() {
      const newMessagesList = [];
      let consecutiveSeenCount = 0;
      const REQUIRED_CONSECUTIVE_SEEN = 100;

      for (let i = 0; i < contactTransactions.length; i++) {
        const msg = contactTransactions[i];

        if (msg.message.wasSeen) {
          consecutiveSeenCount++;
          if (consecutiveSeenCount >= REQUIRED_CONSECUTIVE_SEEN) {
            break;
          }
        } else {
          consecutiveSeenCount = 0;
          newMessagesList.push({
            ...msg,
            message: { ...msg.message, wasSeen: true },
          });
        }
      }

      if (!newMessagesList.length) return;

      queueSetCashedMessages({
        newMessagesList,
        myPubKey: globalContactsInformation.myProfile.uuid,
      });
    }

    updateSeenTransactions();
  }, [contactTransactions]);

  const handleShare = () => {
    if (selectedContact?.isLNURL || !selectedContact?.uniqueName) return;

    const shareText = `${t("share.contact")}\nhttps://blitzwalletapp.com/u/${
      selectedContact?.uniqueName
    }`;

    if (navigator.share) {
      navigator
        .share({
          text: shareText,
        })
        .catch((err) => console.log("Share failed:", err));
    } else {
      navigator.clipboard.writeText(shareText);
      // Optionally show a toast notification
    }
  };

  // Header component for the list
  const ListHeaderComponent = useCallback(
    () => (
      <>
        {!hideProfileImage && (
          <button
            className={`profile-image-button ${
              !selectedContact?.isLNURL && selectedContact?.uniqueName
                ? "active"
                : "inactive"
            }`}
            onClick={handleShare}
          >
            <div
              className="profile-image"
              style={{
                backgroundColor: backgroundOffset,
              }}
            >
              <ContactProfileImage
                updated={imageData?.updated}
                uri={imageData?.localUri}
                darkModeType={darkModeType}
                theme={theme}
              />
            </div>
            {!selectedContact?.isLNURL && selectedContact?.uniqueName && (
              <div className="select-from-photos">
                <Share
                  size={20}
                  color={
                    theme && darkModeType
                      ? Colors.dark.text
                      : Colors.constants.blue
                  }
                />
              </div>
            )}
          </button>
        )}

        <ThemeText
          textStyles={{
            textAlign: "center",
            opacity: 0.6,
            marginTop: 10,
            marginBottom: selectedContact?.uniqueName ? 5 : 25,
          }}
          textContent={selectedContact.name || t("constants.annonName")}
        />

        {selectedContact.uniqueName && (
          <ThemeText
            textStyles={{
              textAlign: "center",
              margin: 0,
              marginBottom: 20,
            }}
            textContent={`@${selectedContact.uniqueName}`}
          />
        )}

        <div
          className="button-global-container"
          style={{
            marginBottom: selectedContact?.bio
              ? 10
              : contactTransactions.length
              ? 30
              : 0,
          }}
        >
          <CustomSendAndRequsetBTN
            btnType={"send"}
            btnFunction={() => {
              if (!isConnectedToTheInternet) {
                navigate("/error", {
                  state: { errorMessage: t("errormessages.nointernet") },
                });
                return;
              }
              navigate("/send-request", {
                state: {
                  selectedContact: selectedContact,
                  paymentType: "send",
                  imageData,
                },
              });
            }}
            arrowColor={
              theme
                ? darkModeType
                  ? Colors.lightsout.background
                  : Colors.dark.background
                : Colors.constants.blue
            }
            containerBackgroundColor={Colors.dark.text}
            containerStyles={{ marginRight: 30 }}
          />

          <CustomSendAndRequsetBTN
            btnType={"receive"}
            activeOpacity={selectedContact.isLNURL ? 1 : undefined}
            btnFunction={() => {
              if (selectedContact.isLNURL) {
                navigate("/error", {
                  state: {
                    errorMessage: t(
                      "contacts.expandedContactPage.requestLNURLError"
                    ),
                  },
                });
                return;
              }
              if (!isConnectedToTheInternet) {
                navigate("/error", {
                  state: { errorMessage: t("errormessages.nointernet") },
                });
                return;
              }
              navigate("/send-request", {
                state: {
                  selectedContact: selectedContact,
                  paymentType: "request",
                  imageData,
                },
              });
            }}
            arrowColor={
              theme
                ? darkModeType
                  ? Colors.lightsout.background
                  : Colors.dark.background
                : Colors.constants.blue
            }
            containerBackgroundColor={Colors.dark.text}
            containerStyles={{
              opacity: selectedContact.isLNURL ? HIDDEN_OPACITY : 1,
            }}
          />
        </div>

        {!!selectedContact?.bio?.trim() && (
          <div
            className="bio-container"
            style={{
              marginTop: 10,
              marginBottom: contactTransactions.length ? 30 : 0,
              backgroundColor: textInputBackground,
            }}
          >
            <div className="bio-scroll">
              <ThemeText
                textStyles={{
                  textAlign: "center",
                  margin: "auto",
                  color: textInputColor,
                }}
                textContent={selectedContact?.bio}
              />
            </div>
          </div>
        )}
      </>
    ),
    [
      theme,
      darkModeType,
      selectedContact?.name,
      selectedContact?.uniqueName,
      selectedContact?.bio,
      selectedContact?.isLNURL,
      imageData?.updated,
      imageData?.localUri,
      isConnectedToTheInternet,
      hideProfileImage,
      contactTransactions.length,
    ]
  );

  if (hideProfileImage) {
    return (
      <div className="flex-container">
        {!selectedContact ? (
          <FullLoadingScreen
            text={t("contacts.expandedContactPage.loadingContactError")}
            textStyles={{ textAlign: "center" }}
          />
        ) : contactTransactions.length !== 0 ? (
          <>
            <ListHeaderComponent />
            <div className="transactions-list">
              {contactTransactions.slice(0, 50).map((item, index) => (
                <ContactsTransactionItem
                  key={index}
                  transaction={item}
                  id={index}
                  selectedContact={selectedContact}
                  myProfile={myProfile}
                  currentTime={currentTime}
                  imageData={imageData}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex-container">
            <ListHeaderComponent />
            <ThemeText
              textStyles={{
                margin: "20px auto 0",
                textAlign: "center",
                width: INSET_WINDOW_WIDTH,
              }}
              textContent={t("contacts.expandedContactPage.noTransactions")}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="expandedContactsPage">
      <div className="top-bar">
        <button className="back-button-container" onClick={() => navigate(-1)}>
          <ArrowLeft
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            size={30}
          />
        </button>
        {selectedContact && (
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
        {selectedContact && (
          <Settings
            onClick={() => handleSettings({ selectedContact })}
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            size={30}
          />
        )}
      </div>

      {!selectedContact ? (
        <FullLoadingScreen
          text={t("contacts.expandedContactPage.loadingContactError")}
          textStyles={{ textAlign: "center" }}
        />
      ) : contactTransactions.length !== 0 ? (
        <div className="contacts-list-container">
          <ListHeaderComponent />
          <div className="transactions-list">
            {contactTransactions.slice(0, 50).map((item, index) => (
              <ContactsTransactionItem
                key={index}
                transaction={item}
                id={index}
                selectedContact={selectedContact}
                myProfile={myProfile}
                currentTime={currentTime}
                imageData={imageData}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-container">
          <ListHeaderComponent />
          <ThemeText
            textStyles={{
              marginTop: 20,
              textAlign: "center",
              width: INSET_WINDOW_WIDTH,
            }}
            textContent={t("contacts.expandedContactPage.noTransactions")}
          />
        </div>
      )}
    </div>
  );
}
