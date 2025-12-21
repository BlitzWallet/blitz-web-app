import { memo, useCallback, useMemo, useState } from "react";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useAppStatus } from "../../contexts/appStatus";
import { useLocation, useNavigate } from "react-router-dom";
import CustomInput from "../../components/customInput/customInput";
import ThemeText from "../../components/themeText/themeText";
import CustomButton from "../../components/customButton/customButton";

import "./contacts.css";
import ContactProfileImage from "./components/profileImage/profileImage";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { questionMarkSVG } from "../../constants/icons";
import ThemeImage from "../../components/ThemeImage/themeImage";
import NavBarProfileImage from "../../components/navBar/profileImage";
import { useKeysContext } from "../../contexts/keysContext";
import { useServerTime, useServerTimeOnly } from "../../contexts/serverTime";
import { useTranslation } from "react-i18next";
import { useFilteredContacts, useProcessedContacts } from "./utils/hooks";
import { encryptMessage } from "../../functions/encodingAndDecoding";
import { ChevronRight, PlusIcon } from "lucide-react";
import { createFormattedDate, formatMessage } from "./utils/utilityFunctions";
import { formatDisplayName } from "./utils/formatListDisplayName";
import { useOverlay } from "../../contexts/overlayContext";

export default function Contacts() {
  const { openOverlay } = useOverlay();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { cache } = useImageCache();
  const { theme, darkModeType } = useThemeContext();
  const {
    decodedAddedContacts,
    globalContactsInformation,
    contactsMessags,
    toggleGlobalContactsInformation,
    giftCardsList,
  } = useGlobalContacts();
  const { serverTimeOffset } = useServerTime();
  const getServerTime = useServerTimeOnly();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
  const { isConnectedToTheInternet } = useAppStatus();
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const hideUnknownContacts = masterInfoObject.hideUnknownContacts;
  const navigate = useNavigate();
  const myProfile = globalContactsInformation.myProfile;
  const didEditProfile = myProfile?.didEditProfile;

  const contactInfoList = useProcessedContacts(
    decodedAddedContacts,
    contactsMessags
  );

  const filteredContacts =
    useFilteredContacts(
      contactInfoList,
      inputText.trim(),
      hideUnknownContacts
    ) ?? [];
  const profileContainerStyle = useMemo(
    () => ({
      backgroundColor: backgroundOffset,
    }),
    [backgroundOffset]
  );

  const searchInputStyle = useMemo(
    () => ({
      width: "100%",
      paddingBottom: "10px",
      backgroundColor,
    }),
    [backgroundColor]
  );

  const scrollContentStyle = useMemo(
    () => ({
      paddingTop: contactInfoList.some((c) => c.contact.isFavorite) ? 0 : 10,
    }),
    [contactInfoList]
  );

  const showAddContactRowItem =
    !contactInfoList?.length ||
    filteredContacts?.length ||
    (contactInfoList?.length &&
      !filteredContacts?.length &&
      !inputText?.trim()?.length);

  const showHighlightedGifts = useMemo(() => {
    return giftCardsList && !!giftCardsList?.length;
  }, [giftCardsList]);

  const navigateToExpandedContact = useCallback(
    async (contact) => {
      try {
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
        navigate("/expandedContactsPage", {
          state: { uuid: contact.uuid },
        });
      } catch (err) {
        console.log("error navigating to expanded contact", err);
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
    ]
  );

  const pinnedContacts = useMemo(() => {
    return contactInfoList
      .filter((contact) => contact.contact.isFavorite)
      .map((contact) => (
        <PinnedContactElement
          key={contact.contact.uuid}
          contact={contact.contact}
          hasUnlookedTransaction={contact.hasUnlookedTransaction}
          cache={cache}
          darkModeType={darkModeType}
          theme={theme}
          backgroundOffset={backgroundOffset}
          navigateToExpandedContact={navigateToExpandedContact}
          // dimensions={dimensions}
          navigate={navigate}
          openOverlay={openOverlay}
        />
      ));
  }, [
    contactInfoList,
    cache,
    darkModeType,
    theme,
    backgroundOffset,
    navigateToExpandedContact,
    // dimensions,
    navigate,
    openOverlay,
  ]);

  const contactElements = useMemo(() => {
    const currentTime = getServerTime();

    let contacts = filteredContacts.map((item, index) => (
      <ContactElement
        key={item.contact.uuid}
        contact={item.contact}
        hasUnlookedTransaction={item.hasUnlookedTransaction}
        lastUpdated={item.lastUpdated}
        firstMessage={item.firstMessage}
        cache={cache}
        darkModeType={darkModeType}
        theme={theme}
        backgroundOffset={backgroundOffset}
        navigateToExpandedContact={navigateToExpandedContact}
        isConnectedToTheInternet={isConnectedToTheInternet}
        navigate={navigate}
        currentTime={currentTime}
        serverTimeOffset={serverTimeOffset}
        t={t}
        isLastElement={index === filteredContacts.length - 1}
        openOverlay={openOverlay}
      />
    ));
    if (showAddContactRowItem) {
      contacts.unshift(
        <AddContactRowItem
          key={"add-cotnacts-row-item"}
          theme={theme}
          darkModeType={darkModeType}
          backgroundOffset={backgroundOffset}
          isConnectedToTheInternet={isConnectedToTheInternet}
          navigate={navigate}
          numberOfContacts={filteredContacts?.length}
          t={t}
          openOverlay={openOverlay}
        />
      );
    }
    return contacts;
  }, [
    filteredContacts,
    cache,
    darkModeType,
    theme,
    backgroundOffset,
    navigateToExpandedContact,
    isConnectedToTheInternet,
    navigate,
    getServerTime,
    serverTimeOffset,
    showAddContactRowItem,
    t,
    openOverlay,
  ]);

  console.log(cache, "test");

  const handleButtonPress = useCallback(() => {
    if (!isConnectedToTheInternet) {
      openOverlay({
        for: "error",
        errorMessage: "Not connected to the internet",
      });
      return;
    }
    if (didEditProfile) {
      openOverlay({
        for: "halfModal",
        contentType: "addContactsHalfModal",
      });
    } else {
      navigate("/edit-profile", {
        state: { pageType: "myProfile", fromSettings: false },
      });
    }
  }, [isConnectedToTheInternet, didEditProfile, navigate]);

  const hasContacts =
    decodedAddedContacts.filter(
      (contact) => !hideUnknownContacts || contact.isAdded
    ).length !== 0;

  const stickyHeaderIndicesValue = useMemo(() => {
    return [pinnedContacts.length ? 1 : 0];
  }, [pinnedContacts]);

  return (
    <div id="contactsPage">
      {(didEditProfile || hasContacts) && (
        <div className="contactsPageTopBar">
          <ThemeText className="pageHeaderText" textContent={"Contacts"} />
          <div>
            <NavBarProfileImage />
          </div>
        </div>
      )}
      {hasContacts && didEditProfile ? (
        <div
          className="hasContactsContainer"
          style={{ flex: 1, overflow: "hidden" }}
        >
          {pinnedContacts.length != 0 && (
            <div className="pinnedContactElementContainer">
              <div className="pinnedContactScrollview">{pinnedContacts}</div>
            </div>
          )}
          <CustomInput
            placeholder={"Search added contacts..."}
            inputText={inputText}
            onchange={setInputText}
            containerStyles={{
              width: "100%",
              maxWidth: "unset",
              marginTop: 10,
              marginBottom: 15,
            }}
          />
          {contactElements.length ? (
            contactElements
          ) : (
            <div className="not-found-container">
              <ThemeText
                className="not-found-username"
                textContent={
                  `"${inputText}" ` + t("contacts.contactsPage.notFound")
                }
              />
              <ThemeText
                className="not-found-label"
                textContent={t("contacts.contactsPage.noContactSearch")}
              />
              <CustomButton
                cl
                actionFunction={() =>
                  openOverlay({
                    for: "halfModal",
                    contentType: "addContactsHalfModal",
                    params: {
                      startingSearchValue: inputText.trim(),
                    },
                  })
                }
                textContent={t("constants.search")}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="noContactsContainer">
          <ThemeImage
            icon={questionMarkSVG}
            styles={{ width: "95%", maxWidth: 200, height: "auto" }}
            alt="question mark to show no contact has been created"
          />
          <ThemeText
            textStyles={{
              width: "95%",
              maxWidth: "300px",
              textAlign: "center",
            }}
            textContent={
              didEditProfile
                ? "You have no contacts."
                : "Edit your profile to begin using contacts."
            }
          />

          <CustomButton
            buttonStyles={{
              // ...CENTER,
              width: "auto",
            }}
            actionFunction={handleButtonPress}
            textContent={`${didEditProfile ? "Add contact" : "Edit profile"}`}
          />
        </div>
      )}
    </div>
  );
}

export const PinnedContactElement = memo(
  ({
    contact,
    hasUnlookedTransaction,
    cache,
    darkModeType,
    theme,
    backgroundOffset,
    navigateToExpandedContact,
    navigate,
  }) => {
    const [textWidth, setTextWidth] = useState(0);

    const containerSize = useMemo(() => "calc(95% / 4 - 15px)", []);

    const handleLongPress = useCallback(
      (e) => {
        e.preventDefault();
        if (!contact.isAdded) return;
        navigate("ContactsPageLongPressActions", { contact });
      },
      [contact, navigate]
    );

    const handlePress = useCallback(() => {
      navigateToExpandedContact(contact);
    }, [contact, navigateToExpandedContact]);

    return (
      <div
        className="pinned-contact"
        style={{ width: containerSize, height: containerSize }}
        onClick={handlePress}
        onContextMenu={handleLongPress}
      >
        <div
          className="pinned-contact-image-container"
          style={{ backgroundColor: backgroundOffset }}
        >
          <ContactProfileImage
            updated={cache[contact.uuid]?.updated}
            uri={cache[contact.uuid]?.localUri}
            darkModeType={darkModeType}
            theme={theme}
          />
        </div>

        <div className="pinned-contact-footer">
          {hasUnlookedTransaction && (
            <span
              className="notification-dot"
              style={{
                backgroundColor: darkModeType && theme ? "#fff" : "#007bff",
                transform: `translateX(-${textWidth / 2 + 7}px)`,
              }}
            />
          )}

          <ThemeText
            ref={(el) => el && setTextWidth(el.offsetWidth)}
            textStyles={{
              width: `calc(100% - ${hasUnlookedTransaction ? "25px" : "0px"})`,
            }}
            className="pinned-contact-name"
            textContent={formatDisplayName(contact)}
          />
        </div>
      </div>
    );
  }
);

export const ContactElement = memo(
  ({
    contact,
    hasUnlookedTransaction,
    lastUpdated,
    firstMessage,
    cache,
    darkModeType,
    theme,
    backgroundOffset,
    navigateToExpandedContact,
    isConnectedToTheInternet,
    navigate,
    currentTime,
    serverTimeOffset,
    t,
    isLastElement,
    openOverlay,
  }) => {
    const handlePress = useCallback(() => {
      navigateToExpandedContact(contact);
    }, [contact, navigateToExpandedContact]);

    const formattedDate = lastUpdated
      ? createFormattedDate(
          lastUpdated - serverTimeOffset,
          currentTime - serverTimeOffset,
          t
        )
      : "";

    return (
      <div
        className="contact-row"
        style={
          !isLastElement
            ? { borderBottom: `1px solid ${backgroundOffset}` }
            : {}
        }
        onClick={handlePress}
      >
        <div
          className="contact-image-container"
          style={{ backgroundColor: backgroundOffset }}
        >
          <ContactProfileImage
            updated={cache[contact.uuid]?.updated}
            uri={cache[contact.uuid]?.localUri}
            darkModeType={darkModeType}
            theme={theme}
          />
        </div>

        <div className="contact-content">
          <div className="contact-row-inline">
            <div className="contact-name-block">
              <ThemeText
                textStyles={{ margin: 0 }}
                textContent={formatDisplayName(contact)}
              />
              {!contact.isAdded && (
                <ThemeText
                  textContent={t("contacts.contactsPage.unknownSender")}
                  className="unknown-sender"
                  textStyles={{
                    color:
                      darkModeType && theme
                        ? Colors.dark.text
                        : Colors.constants.blue,
                  }}
                />
              )}
            </div>

            {hasUnlookedTransaction && (
              <span
                className="notification-dot"
                style={{
                  backgroundColor:
                    darkModeType && theme
                      ? Colors.dark.text
                      : Colors.constants.blue,
                }}
              />
            )}

            <ThemeText className="contact-date" textContent={formattedDate} />
            <ChevronRight
              color={
                darkModeType && theme ? Colors.dark.text : Colors.constants.blue
              }
              size={20}
            />
          </div>

          {!!formatMessage(firstMessage) && contact.isAdded && (
            <div className="contact-row-inline">
              <ThemeText
                className="contact-preview"
                textContent={formatMessage(firstMessage)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);
export const AddContactRowItem = memo(
  ({
    darkModeType,
    theme,
    backgroundOffset,
    t,
    isConnectedToTheInternet,
    navigate,
    numberOfContacts,
    openOverlay,
  }) => {
    const goToAddContact = useCallback(() => {
      if (!isConnectedToTheInternet) {
        navigate("ErrorScreen", {
          errorMessage: t("errormessages.nointernet"),
        });
      } else {
        openOverlay({
          for: "halfModal",
          contentType: "addContactsHalfModal",
        });
      }
    }, [isConnectedToTheInternet, navigate, t]);

    return (
      <div
        className="contact-row"
        style={
          numberOfContacts
            ? { borderBottom: `1px solid ${backgroundOffset}` }
            : {}
        }
        onClick={goToAddContact}
      >
        <div
          className="contact-image-container"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : "#007bff",
          }}
        >
          <PlusIcon size={25} color={Colors.dark.text} />
        </div>
        <div className="contact-content">
          <ThemeText
            textStyles={{
              color:
                theme && darkModeType
                  ? Colors.dark.text
                  : Colors.constants.blue,
            }}
            textContent={t("contacts.contactsPage.addContactsText")}
            className="add-contact-text"
          />
        </div>
      </div>
    );
  }
);
