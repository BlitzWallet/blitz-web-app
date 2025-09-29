import { useMemo, useState } from "react";
import PinnedContactElement from "./components/pinnedContact/pinnedContact";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useAppStatus } from "../../contexts/appStatus";
import { useLocation, useNavigate } from "react-router-dom";
import { ContactElement } from "./components/contactElement/contactElement";
import CustomInput from "../../components/customInput/customInput";
import ThemeText from "../../components/themeText/themeText";
import CustomButton from "../../components/customButton/customButton";
import questionMark from "../../assets/questionMarkSVG.svg";
import "./contacts.css";
import ContactProfileImage from "./components/profileImage/profileImage";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";

export default function Contacts({ openOverlay }) {
  const { masterInfoObject } = useGlobalContextProvider();
  const { decodedAddedContacts, globalContactsInformation, contactsMessags } =
    useGlobalContacts();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset } = useThemeColors();
  const { isConnectedToTheInternet } = useAppStatus();
  const { cache } = useImageCache();
  const hideUnknownContacts = masterInfoObject.hideUnknownContacts;
  const myProfile = globalContactsInformation?.myProfile;
  const didEditProfile = globalContactsInformation?.myProfile?.didEditProfile;
  const navigate = useNavigate();
  const location = useLocation();
  const [inputText, setInputText] = useState("");

  console.log("test", import.meta.env.MODE);

  const pinnedContacts = useMemo(() => {
    return decodedAddedContacts
      .filter((contact) => contact.isFavorite)
      .map((contact, id) => {
        return (
          <PinnedContactElement
            cache={cache}
            key={contact.uuid}
            contact={contact}
          />
        );
      });
  }, [decodedAddedContacts, contactsMessags, cache]);

  const contactElements = useMemo(() => {
    return decodedAddedContacts
      .filter((contact) => {
        return (
          (contact.name?.toLowerCase()?.startsWith(inputText.toLowerCase()) ||
            contact?.uniqueName
              ?.toLowerCase()
              ?.startsWith(inputText.toLowerCase())) &&
          !contact.isFavorite &&
          (!hideUnknownContacts || contact.isAdded)
        );
      })
      .sort((a, b) => {
        const earliset_A = contactsMessags[a.uuid]?.lastUpdated;
        const earliset_B = contactsMessags[b.uuid]?.lastUpdated;
        return (earliset_B || 0) - (earliset_A || 0);
      })
      .map((contact, id) => {
        return (
          <ContactElement cache={cache} key={contact.uuid} contact={contact} />
        );
      });
  }, [
    decodedAddedContacts,
    inputText,
    hideUnknownContacts,
    contactsMessags,
    cache,
  ]);

  return (
    <div id="contactsPage">
      {myProfile?.didEditProfile && (
        <div className="contactsPageTopBar">
          {/* <div
            className="addContactsContainer"
            onPress={() => {
              keyboardNavigate(() => {
                if (!isConnectedToTheInternet) {
                  navigate.navigate("ErrorScreen", {
                    errorMessage:
                      "Please connect to the internet to use this feature",
                  });
                  return;
                }
                navigate.navigate("CustomHalfModal", {
                  wantedContent: "addContacts",
                  sliderHight: 0.4,
                });
              });
            }}
          >
             <Icon
              name={"addContactsIcon"}
              width={30}
              height={30}
              color={
                theme && darkModeType ? COLORS.darkModeText : COLORS.primary
              }
              offsetColor={
                theme
                  ? darkModeType
                    ? COLORS.lightsOutBackground
                    : COLORS.darkModeBackground
                  : COLORS.lightModeBackground
              }
            /> 
          </div> */}
          <div
            style={{ backgroundColor: backgroundOffset }}
            className="myContactContainer"
            onClick={() => {
              navigate("/my-profile");
            }}
          >
            <ContactProfileImage
              updated={cache[masterInfoObject?.uuid]?.updated}
              uri={cache[masterInfoObject?.uuid]?.localUri}
              theme={theme}
              darkModeType={darkModeType}
            />
          </div>
        </div>
      )}
      {/* {decodedAddedContacts.filter(
        (contact) => !hideUnknownContacts || contact.isAdded
      ).length !== 0 && myProfile.didEditProfile ? (
        <div
          className="hasContactsContainer"
          style={{ flex: 1, overflow: "hidden" }}
        >
          {pinnedContacts.length != 0 && (
            <div
              className="pinnedContactElementContainer"
              style={{ height: 120 }}
            >
              <div className="pinnedContactScrollview">{pinnedContacts}</div>
            </div>
          )}
          <CustomInput
            placeholderText={"Search added contacts..."}
            inputText={inputText}
            setInputText={setInputText}
            containerStyles={{ width: "100%" }}
          />
          {contactElements}
        </div>
      ) : ( */}
      <div className="noContactsContainer">
        <img
          style={{
            filter: theme
              ? "brightness(0) saturate(100%) invert(100%) sepia(3%) saturate(7500%) hue-rotate(137deg) brightness(113%) contrast(101%)"
              : "initial",
          }}
          className="questionMarkIcon"
          src={questionMark}
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
          actionFunction={() => {
            if (!isConnectedToTheInternet) {
              openOverlay({
                for: "error",
                errorMessage:
                  "Please connect to the internet to use this feature.",
              });
              return;
            }
            if (didEditProfile) {
              //navigate to add contacts popup
              openOverlay({
                for: "error",
                errorMessage: "Feature coming soon...",
              });
            } else {
              navigate("/edit-profile", {
                state: { pageType: "myProfile", fromSettings: false },
              });
            }
          }}
          textContent={`${didEditProfile ? "Add contact" : "Edit profile"}`}
        />
      </div>
      {/* )} */}
    </div>
  );
}
