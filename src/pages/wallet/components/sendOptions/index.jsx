import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clipboard,
  ScanQrCode,
  Image,
  X,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ThemeText from "../../../../components/themeText/themeText";
import CustomButton from "../../../../components/customButton/customButton";
import ContactRow from "./ContactRow";

import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useThemeContext } from "../../../../contexts/themeContext";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import useThemeColors from "../../../../hooks/useThemeColors";

import { Colors } from "../../../../constants/theme";
import {
  getQRImage,
  navigateToSendUsingClipboard,
} from "../../../../functions/sendBitcoin/halfModalFunctions";
import handlePreSendPageParsing from "../../../../functions/sendBitcoin/handlePreSendPageParsing";
import "./style.css";
import AddContactOverlay from "./AddContactOverlay";
import { useProcessedContacts } from "../../../contacts/utils/hooks";
import getReceiveAddressAndContactForContactsPayment from "../../../contacts/utils/getReceiveAddressAndKindForPayment";

export default function HalfModalSendOptions({ openOverlay, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const { decodedAddedContacts, contactsMessags, globalContactsInformation } =
    useGlobalContacts();
  const { cache } = useImageCache();

  const [inputText, setInputText] = useState("");
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputError, setInputError] = useState("");
  const [expandedContact, setExpandedContact] = useState(null);
  const [showAddContactOverlay, setShowAddContactOverlay] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const iconColor = theme ? Colors.dark.text : Colors.light.text;
  const primaryColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;
  const scanIconBg = theme && darkModeType ? backgroundColor : backgroundOffset;
  const dividerColor =
    theme && darkModeType ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
  const inputBg = theme && darkModeType ? backgroundOffset : backgroundOffset;

  /* ── Contacts ── */
  const contactInfoList = useProcessedContacts(
    decodedAddedContacts,
    contactsMessags,
  );

  const sortedContacts = useMemo(() => {
    return contactInfoList
      .slice()
      .sort((a, b) => {
        const diff = (b.lastUpdated || 0) - (a.lastUpdated || 0);
        if (diff !== 0) return diff;
        const nameA = a.contact.name || a.contact.uniqueName || "";
        const nameB = b.contact.name || b.contact.uniqueName || "";
        return nameA.localeCompare(nameB);
      })
      .map((item) => item.contact);
  }, [contactInfoList]);

  /* ── Handlers ── */
  const handleToggleExpand = useCallback((uuid) => {
    setExpandedContact((prev) => (prev === uuid ? null : uuid));
  }, []);

  const handleSelectPaymentType = useCallback(
    (contact, paymentType, isLNURL) => {
      onClose();
      navigate("/sendAndRequestPage", {
        state: {
          selectedContact: contact,
          paymentType: "send",
          imageData: cache[contact.uuid],
          endReceiveType: isLNURL ? "BTC" : paymentType,
          selectedPaymentMethod: paymentType,
        },
      });
    },
    [navigate, cache, onClose],
  );

  const handleCameraScan = useCallback(() => {
    onClose();
    navigate("/camera");
  }, [navigate, onClose]);

  const handleImageScan = useCallback(async () => {
    const response = await getQRImage(fileInputRef.current);
    if (response.error) {
      openOverlay({ for: "error", errorMessage: t(response.error) });
      return;
    }
    if (!response.didWork || !response.btcAdress) return;
    onClose();
    navigate("/send", { state: { btcAddress: response.btcAdress } });
  }, [navigate, openOverlay, onClose, t]);

  const handleClipboardAction = useCallback(async () => {
    const clipboardText = await navigator.clipboard
      .readText()
      .catch(() => null);
    if (clipboardText) {
      setInputText(clipboardText);
      setInputError("");
      if (inputRef.current) inputRef.current.focus();
    }
  }, []);

  const handleManualInputSubmit = useCallback(async () => {
    if (!inputText.trim()) {
      inputRef.current?.blur();
      return;
    }
    const input = inputText.trim();
    const normalized = input.startsWith("@")
      ? input.slice(1).toLowerCase()
      : input.toLowerCase();

    // Check if it matches a saved contact username
    const matchedContact = decodedAddedContacts.find(
      (c) => c.uniqueName?.toLowerCase() === normalized,
    );

    if (matchedContact) {
      const senderName =
        globalContactsInformation.myProfile?.name ||
        globalContactsInformation.myProfile?.uniqueName;
      const payingContactMessage = {
        usingTranslation: true,
        type: "paid",
        name: senderName,
      };

      const { receiveAddress, didWork, error } =
        await getReceiveAddressAndContactForContactsPayment({
          sendingAmountSat: 0,
          selectedContact: matchedContact,
          myProfileMessage: "",
          payingContactMessage,
        });

      if (!didWork) {
        setInputError(t(error));
        return;
      }
      onClose();
      navigate("/send", { state: { btcAddress: receiveAddress } });
      return;
    }

    const parsed = handlePreSendPageParsing(input);
    if (parsed.error) {
      setInputError(t(parsed.error));
      return;
    }
    if (parsed.navigateToWebView) {
      window.open(parsed.webViewURL, "_blank");
      return;
    }
    onClose();
    navigate("/send", { state: { btcAddress: parsed.btcAdress } });
  }, [
    inputText,
    decodedAddedContacts,
    globalContactsInformation,
    navigate,
    onClose,
    t,
  ]);

  const handleInputFocus = () => {
    setIsInputMode(true);
    setInputError("");
  };

  const handleInputBlur = () => {
    if (!inputText.trim()) {
      setIsInputMode(false);
      setInputError("");
    }
  };
  const handleInput = (e) => {
    const el = e.target;

    // Reset height so scrollHeight is accurate
    el.style.height = "auto";

    // Grow up to 90px max
    const newHeight = Math.min(el.scrollHeight, 90);
    el.style.height = `${newHeight}px`;

    // Optional: enable scrolling after max height
    el.style.overflowY = el.scrollHeight > 90 ? "auto" : "hidden";
  };

  useEffect(() => {
    if (inputRef.current) {
      handleInput({ target: inputRef.current });
    }
  }, [inputText]);

  return (
    <div className="sendOptionsContainer">
      {/* Search / manual input row */}
      <div className="searchRow">
        <textarea
          ref={inputRef}
          className="searchInput"
          style={{ backgroundColor: inputBg, color: iconColor }}
          placeholder={t("wallet.halfModal.inputPlaceholder")}
          value={inputText}
          onInput={handleInput}
          onChange={(e) => {
            setInputText(e.target.value);
            setInputError("");
          }}
          rows={1}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleManualInputSubmit();
            }
          }}
        />
        <button
          className="inputActionBtn"
          onMouseDown={(e) => e.preventDefault()}
        >
          {inputText.trim() ? (
            <X
              size={20}
              color={primaryColor}
              onClick={() => {
                setInputText("");
                setInputError("");
              }}
            />
          ) : (
            <Clipboard
              size={20}
              color={primaryColor}
              onClick={handleClipboardAction}
            />
          )}
        </button>
      </div>

      {/* Scrollable body — hidden/faded when in input mode */}
      <motion.div
        className="contactsScrollArea"
        animate={{ opacity: isInputMode ? 0 : 1 }}
        transition={{ duration: 0.22 }}
        style={{ pointerEvents: isInputMode ? "none" : "auto" }}
      >
        {/* Scan QR */}
        <button className="scanButton" onClick={handleCameraScan}>
          <div
            className="scanIconCircle"
            style={{ backgroundColor: scanIconBg }}
          >
            <ScanQrCode size={24} color={primaryColor} />
          </div>
          <div className="scanTextGroup">
            <ThemeText
              textStyles={{ margin: 0 }}
              textContent={t("wallet.halfModal.scanQrCode")}
            />
            <ThemeText
              textStyles={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}
              textContent={t("wallet.halfModal.tapToScanQr")}
            />
          </div>
        </button>

        {/* Image QR */}
        <button
          className="scanButton"
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            className="scanIconCircle"
            style={{ backgroundColor: scanIconBg }}
          >
            <Image size={24} color={primaryColor} />
          </div>
          <div className="scanTextGroup">
            <ThemeText
              textStyles={{ margin: 0 }}
              textContent={t("wallet.halfModal.images")}
            />
            <ThemeText
              textStyles={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}
              textContent={t("wallet.halfModal.tapToScan")}
            />
          </div>
        </button>

        {/* Divider */}
        <div
          className="sectionDivider"
          style={{ backgroundColor: dividerColor }}
        />

        {/* Address book header */}
        <ThemeText
          className="addressBookLabel"
          textContent={t("wallet.halfModal.addressBook", { context: "send" })}
        />

        {/* Contact list or empty state */}
        {decodedAddedContacts.length > 0 ? (
          sortedContacts.map((contact) => (
            <ContactRow
              key={contact.uuid}
              contact={contact}
              cache={cache}
              theme={theme}
              darkModeType={darkModeType}
              backgroundColor={backgroundColor}
              backgroundOffset={backgroundOffset}
              textColor={textColor}
              expandedContact={expandedContact}
              onToggleExpand={handleToggleExpand}
              onSelectPaymentType={handleSelectPaymentType}
              t={t}
            />
          ))
        ) : (
          <div className="emptyContactsContainer">
            <UsersRound
              size={40}
              color={iconColor}
              className="emptyContactsIcon"
            />
            <ThemeText
              textStyles={{ margin: "0 0 4px" }}
              textContent={t("wallet.halfModal.noAddedContactsTitle")}
            />
            <ThemeText
              textStyles={{
                margin: "0 0 16px",
                fontSize: "0.8rem",
                opacity: 0.6,
              }}
              textContent={t("wallet.halfModal.noAddedContactsDesc")}
            />
            <CustomButton
              buttonStyles={{ width: "100%" }}
              textContent={t("contacts.editMyProfilePage.addContactBTN")}
              actionFunction={() => setShowAddContactOverlay(true)}
            />
          </div>
        )}
      </motion.div>

      {/* Continue / error bar (visible in input mode) */}
      <AnimatePresence>
        {isInputMode && (
          <motion.div
            className="continueBar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {inputError && (
              <div className="inputErrorRow">
                <TriangleAlert size={18} color={iconColor} />
                <ThemeText
                  textStyles={{ margin: 0, fontSize: "0.85rem" }}
                  textContent={inputError}
                />
              </div>
            )}
            <CustomButton
              buttonStyles={{ alignSelf: "center", width: "100%" }}
              textContent={
                inputText.trim() ? t("constants.continue") : t("constants.back")
              }
              actionFunction={handleManualInputSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for image QR scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={() => handleImageScan()}
      />

      <AddContactOverlay
        visible={showAddContactOverlay}
        onClose={() => setShowAddContactOverlay(false)}
        onNavigateAway={() => {
          setShowAddContactOverlay(false);
          onClose();
        }}
      />
    </div>
  );
}
