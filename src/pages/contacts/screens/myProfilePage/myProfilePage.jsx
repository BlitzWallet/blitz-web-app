import BackArrow from "../../../../components/backArrow/backArrow";
import "./myProfilePage.css";
import ContactProfileImage from "../../components/profileImage/profileImage";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useAppStatus } from "../../../../contexts/appStatus";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import MaxHeap from "../../../../functions/maxHeap";
import ThemeText from "../../../../components/themeText/themeText";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { ImagesIconDark, settingsIcon } from "../../../../constants/icons";

export default function MyProfilePage({ openOverlay }) {
  const { cache } = useImageCache();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset } = useThemeColors();

  const { globalContactsInformation, decodedAddedContacts, contactsMessags } =
    useGlobalContacts();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTime = new Date();

  const myContact = globalContactsInformation.myProfile;

  const createdPayments = useMemo(() => {
    const messageHeap = new MaxHeap();
    const MAX_MESSAGES = 50;

    for (let contact of Object.keys(contactsMessags)) {
      if (contact === "lastMessageTimestamp") continue;
      const data = contactsMessags[contact];
      const selectedAddedContact = decodedAddedContacts.find(
        (contactElement) => contactElement.uuid === contact
      );

      for (let message of data.messages) {
        const timestamp = message.timestamp;

        const messageObj = {
          transaction: message,
          selectedProfileImage: selectedAddedContact?.profileImage || null,
          name:
            selectedAddedContact?.name ||
            selectedAddedContact?.uniqueName ||
            "Unknown",
          contactUUID: selectedAddedContact?.uuid || contact,
          time: timestamp,
        };

        messageHeap.add(messageObj);
      }
    }

    const result = [];
    while (!messageHeap.isEmpty() && result.length < MAX_MESSAGES) {
      result.push(messageHeap.poll());
    }

    console.log(result.length, "LENGTH OF RESULT ARRAY");

    return result;
  }, [decodedAddedContacts, contactsMessags]);

  return (
    <div id="myProfilePageContainer">
      <div className="pageNavbar">
        <BackArrow />
        <ThemeImage
          className="settingsIcon"
          clickFunction={() =>
            navigate("/edit-profile", {
              state: { pageType: "myProfile", fromSettings: false },
            })
          }
          icon={settingsIcon}
        />
      </div>
      <div
        onClick={() => {
          openOverlay({
            for: "error",
            errorMessage: "Feature coming soon...",
          });
        }}
        className="profileImageBackground"
        style={{ backgroundColor: backgroundOffset }}
      >
        <ContactProfileImage
          updated={cache[myContact.uuid]?.updated}
          uri={cache[myContact.uuid]?.localUri}
          theme={theme}
          darkModeType={darkModeType}
        />
        <div
          style={{ backgroundColor: Colors.dark.text }}
          className="scanProfileImageContianer"
        >
          <img src={ImagesIconDark} alt="Open scan profile modal" />
        </div>
      </div>
      <ThemeText
        className={"uniqueNameText"}
        textContent={myContact.uniqueName}
      />
      {myContact?.name && (
        <ThemeText className={"nameText"} textContent={myContact?.name} />
      )}
      <div
        style={{ backgroundColor: Colors.dark.text }}
        className="bioContainer"
      >
        <ThemeText
          textStyles={{ color: Colors.light.text }}
          textContent={myContact?.bio || "No bio set"}
        />
      </div>
      {createdPayments?.length != 0 ? (
        <p>Transactions go here</p>
      ) : (
        <ThemeText
          className={"noTxText"}
          textStyles={{ marginTop: 20 }}
          textContent={"No transaction history"}
        />
      )}
    </div>
  );
}
