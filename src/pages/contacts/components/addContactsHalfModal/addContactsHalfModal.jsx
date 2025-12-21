import { useState, useEffect, useRef, useCallback } from "react";
import "./style.css";
import customUUID from "../../../../functions/customUUID";
import useDebounce from "../../../../hooks/useDebounce";
import { EMAIL_REGEX, VALID_USERNAME_REGEX } from "../../../../constants";
import { searchUsers } from "../../../../../db";
import { getCachedProfileImage } from "../../../../functions/cachedImage";
import ContactProfileImage from "../profileImage/profileImage";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import ThemeText from "../../../../components/themeText/themeText";
import { useNavigate } from "react-router-dom";
import CustomButton from "../../../../components/customButton/customButton";
import { useTranslation } from "react-i18next";
import CustomInput from "../../../../components/customInput/customInput";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";

// Main Component
export default function AddContactsModal({ onClose, params }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(
    params.startingSearchValue || ""
  );
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const searchInputRef = useRef(null);
  const searchTrackerRef = useRef(null);
  const didClickCamera = useRef(null);
  const { theme, darkModeType } = useThemeContext();

  // Mock context values
  const globalContactsInformation = {
    myProfile: { uniqueName: "currentUser" },
  };

  const isUsingLNURL =
    searchInput?.includes("@") && searchInput?.indexOf("@") !== 0;

  useEffect(() => {
    if (params.startingSearchValue) {
      handleSearch(params.startingSearchValue);
    }
  }, []);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearchTrackerRef = () => {
    const requestUUID = customUUID();
    searchTrackerRef.current = requestUUID;
    return requestUUID;
  };

  const debouncedSearch = useDebounce(async (term, requestUUID) => {
    if (searchTrackerRef.current !== requestUUID) {
      return;
    }

    const searchTerm = term.replace(/@/g, "");
    if (searchTerm && VALID_USERNAME_REGEX.test(searchTerm)) {
      const results = await searchUsers(searchTerm);
      const newUsers = (
        await Promise.all(
          results.map(async (savedContact) => {
            if (!savedContact) return false;
            if (
              savedContact.uniqueName ===
              globalContactsInformation.myProfile.uniqueName
            )
              return false;
            if (!savedContact?.uuid) return false;

            let responseData;
            if (
              savedContact.hasProfileImage ||
              typeof savedContact.hasProfileImage === "boolean"
            ) {
              responseData = await getCachedProfileImage(savedContact.uuid);
              console.log(responseData);
            }

            if (!responseData) return savedContact;
            else return { ...savedContact, ...responseData };
          })
        )
      ).filter(Boolean);

      setIsSearching(false);
      setUsers(newUsers);
    } else {
      setIsSearching(false);
    }
  }, 650);

  const handleSearch = (term) => {
    setSearchInput(term);

    if (isUsingLNURL) {
      searchTrackerRef.current = null;
      setIsSearching(false);
      return;
    }

    if (term.length === 0 || term === "@") {
      searchTrackerRef.current = null;
      setUsers([]);
      setIsSearching(false);
      return;
    }

    if (term.length > 0) {
      const requestUUID = handleSearchTrackerRef();
      setIsSearching(true);
      debouncedSearch(term, requestUUID);
    }
  };

  const clearHalfModalForLNURL = () => {
    if (!EMAIL_REGEX.test(searchInput)) return;

    const newContact = {
      name: searchInput.split("@")[0],
      bio: "",
      uniqueName: "",
      isFavorite: false,
      transactions: [],
      unlookedTransactions: 0,
      receiveAddress: searchInput,
      isAdded: true,
      isLNURL: true,
      profileImage: "",
      uuid: customUUID(),
    };

    console.log("Navigate to expanded page with LNURL:", newContact);

    if (onClose) {
      onClose();
    }

    navigate("/expandedAddContactsPage", {
      state: newContact,
    });
  };

  return (
    <div className="modal-container">
      <div className="title-container">
        <ThemeText className="title-text" textContent={"Add Contact"} />
        {isSearching && (
          <FullLoadingScreen
            containerStyles={{ flex: 0 }}
            size="small"
            showText={false}
          />
        )}
      </div>

      <CustomInput
        ref={searchInputRef}
        placeholder="Find a contact"
        containerStyles={{ maxWidth: "unset" }}
        onchange={handleSearch}
        value={searchInput}
      />

      {isUsingLNURL ? (
        <div className="lnurl-container">
          <ThemeText
            className="lnurl-text"
            textContent={"Add Lightning Address:"}
          />
          <ThemeText className="lnurl-address" textContent={searchInput} />
          <CustomButton
            actionFunction={clearHalfModalForLNURL}
            textContent={t("constants.continue")}
          />
        </div>
      ) : (
        <div className="users-list">
          {users.length > 0 ? (
            users.map((item) => (
              <ContactListItem
                theme={theme}
                darkModeType={darkModeType}
                key={item.uniqueName}
                savedContact={item}
                onClose={onClose}
              />
            ))
          ) : (
            <p className="empty-message">
              {isSearching && searchInput.length > 0
                ? ""
                : searchInput.length > 0 && searchInput !== "@"
                ? "No profiles found"
                : "Search by LNURL (e.g. name@service.com) or Blitz username"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ContactListItem({ savedContact, theme, darkModeType, onClose }) {
  const { backgroundOffset } = useThemeColors();
  const navigate = useNavigate();
  const newContact = {
    ...savedContact,
    isFavorite: false,
    transactions: [],
    unlookedTransactions: 0,
    isAdded: true,
  };

  const handleClick = () => {
    console.log("Navigate to expanded page with:", newContact);
    if (onClose) {
      onClose();
    }

    navigate("/expandedAddContactsPage", {
      state: newContact,
    });
  };

  return (
    <button onClick={handleClick} className="contact-item">
      <div
        style={{ backgroundColor: backgroundOffset }}
        className="contact-avatar"
      >
        <ContactProfileImage
          updated={newContact.updated}
          uri={newContact.localUri}
          darkModeType={darkModeType}
          theme={theme}
        />
      </div>
      <div className="contact-info">
        <ThemeText
          className="contact-username"
          textContent={newContact.uniqueName}
        />
        <ThemeText
          className="contact-name"
          textContent={newContact.name || "No name set"}
        />
      </div>
    </button>
  );
}
