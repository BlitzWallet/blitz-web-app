import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ThemeText from "../../../../components/themeText/themeText";
import { Colors, HIDDEN_OPACITY } from "../../../../constants/theme";
import { Bitcoin, DollarSign, Gift } from "lucide-react";
import { HIDE_IN_APP_PURCHASE_ITEMS } from "../../../../constants";
import ContactProfileImage from "../../../contacts/components/profileImage/profileImage";
import { formatDisplayName } from "../../../contacts/utils/formatListDisplayName";

function parseLnurlDomain(receiveAddress) {
  try {
    const parts = receiveAddress.split("@");
    if (parts.length !== 2) return "";
    const domainParts = parts[1].split(".");
    return domainParts.length >= 2
      ? domainParts[domainParts.length - 2]
      : domainParts[0];
  } catch {
    return "";
  }
}

export default function ContactRow({
  contact,
  cache,
  theme,
  darkModeType,
  backgroundColor,
  backgroundOffset,
  textColor,
  expandedContact,
  onToggleExpand,
  onSelectPaymentType,
  t,
}) {
  const isExpanded = expandedContact === contact.uuid;

  const lnurlDomain = useMemo(() => {
    if (!contact.isLNURL) return "";
    return parseLnurlDomain(contact.receiveAddress);
  }, [contact.isLNURL, contact.receiveAddress]);

  const displayName = formatDisplayName(contact) || contact.uniqueName || "";

  const avatarBg = theme && darkModeType ? backgroundColor : backgroundOffset;
  const optionBg = theme && darkModeType ? backgroundColor : backgroundOffset;
  const btcCircleBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundOffset
        : backgroundColor
      : "#F7931A";
  const usdCircleBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundOffset
        : backgroundColor
      : "#2ECC71";
  const giftCircleBg =
    theme && darkModeType
      ? darkModeType
        ? backgroundOffset
        : backgroundColor
      : Colors.constants.blue;

  return (
    <div className="contactWrapper">
      <button
        className="contactRowContainer"
        onClick={() => onToggleExpand(contact.uuid)}
      >
        <div
          className="contactImageContainer"
          style={{ backgroundColor: avatarBg }}
        >
          <ContactProfileImage
            updated={cache[contact.uuid]?.updated}
            uri={cache[contact.uuid]?.localUri}
            darkModeType={darkModeType}
            theme={theme}
          />
        </div>
        <div className="contactNameContainer">
          <div className="nameAndDomainRow">
            <ThemeText
              textStyles={{
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              textContent={displayName}
            />
            {contact.isLNURL && lnurlDomain && (
              <span
                className="lnurlDomainBadge"
                style={{ backgroundColor: avatarBg }}
              >
                <ThemeText
                  textStyles={{
                    fontSize: "0.65rem",
                    opacity: HIDDEN_OPACITY,
                    margin: 0,
                  }}
                  textContent={lnurlDomain}
                />
              </span>
            )}
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ThemeText
                  textStyles={{ fontSize: "0.75rem", opacity: 0.6, margin: 0 }}
                  textContent={t("wallet.halfModal.chooseWhatToSend")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ opacity: HIDDEN_OPACITY, flexShrink: 0 }}
        >
          <ChevronDown size={20} color={textColor} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="expandedPaymentOptions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="paymentOptionsRow">
              <button
                className="paymentOption"
                style={{ backgroundColor: optionBg }}
                onClick={() =>
                  onSelectPaymentType(contact, "BTC", contact?.isLNURL)
                }
              >
                <div
                  className="paymentIconCircle"
                  style={{ backgroundColor: btcCircleBg }}
                >
                  <img
                    width={18}
                    height={18}
                    src={`/icons/bitcoinIcon.png`}
                    alt="icon"
                    className="icon-image"
                  />
                </div>
                <ThemeText
                  textStyles={{ margin: 0, fontSize: "0.9rem" }}
                  textContent={t("constants.bitcoin_upper")}
                />
              </button>

              <button
                className="paymentOption"
                style={{ backgroundColor: optionBg }}
                onClick={() =>
                  onSelectPaymentType(contact, "USD", contact?.isLNURL)
                }
              >
                <div
                  className="paymentIconCircle"
                  style={{ backgroundColor: usdCircleBg }}
                >
                  <img
                    width={18}
                    height={18}
                    src={`/icons/dollarIcon.png`}
                    alt="icon"
                    className="icon-image"
                  />
                </div>
                <ThemeText
                  textStyles={{ margin: 0, fontSize: "0.9rem" }}
                  textContent={t("constants.dollars_upper")}
                />
              </button>

              {/* {!contact?.isLNURL && !HIDE_IN_APP_PURCHASE_ITEMS && (
                <button
                  className="paymentOption"
                  style={{ backgroundColor: optionBg }}
                  onClick={() =>
                    onSelectPaymentType(contact, "gift", contact?.isLNURL)
                  }
                >
                  <div
                    className="paymentIconCircle"
                    style={{ backgroundColor: giftCircleBg }}
                  >
                    <Gift size={18} color="white" />
                  </div>
                  <ThemeText
                    textStyles={{ margin: 0, fontSize: "0.9rem" }}
                    textContent={t("constants.gift")}
                  />
                </button>
              )} */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
