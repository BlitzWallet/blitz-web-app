import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bitcoin,
  DollarSign,
  ChevronDown,
  UsersRound,
  PiggyBank,
} from "lucide-react";
import ThemeText from "../themeText/themeText";
import CustomButton from "../customButton/customButton";
import FormattedBalanceInput from "../formattedBalanceInput/formattedBalanceInput";
import FormattedSatText from "../formattedSatText/formattedSatText";
import CustomNumberKeyboard from "../customNumberKeyboard/customNumberKeyboard";
import ContactProfileImage from "../../pages/contacts/components/profileImage/profileImage";
import { formatDisplayName } from "../../pages/contacts/utils/formatListDisplayName";
import { useProcessedContacts } from "../../pages/contacts/utils/hooks";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import { useFlashnet } from "../../contexts/flashnetContext";
import usePaymentInputDisplay from "../../hooks/usePaymentInputDisplay";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import convertTextInputValue from "../../functions/textInputConvertValue";
import customUUID from "../../functions/customUUID";
import { HIDDEN_OPACITY } from "../../constants/theme";
import "./HalfModalReceiveOptions.css";

const BTC_ORANGE = "#FFAC30";
const DOLLAR_GREEN = "#60D263";
const PRIMARY = "#0375F6";
const DARK_TEXT = "white";

// ── ContactRow ────────────────────────────────────────────────────────────────

const ContactRow = ({
  contact,
  cache,
  theme,
  darkModeType,
  backgroundOffset,
  backgroundColor,
  textColor,
  expandedContact,
  onToggleExpand,
  onSelectPaymentType,
  registerRef,
  t,
}) => {
  const isExpanded = expandedContact === contact.uuid;
  const expandedHeight = 160;

  return (
    <div
      className="contact-wrapper"
      ref={(el) => el && registerRef(contact.uuid, el)}
    >
      <button
        className="contact-row"
        onClick={() => onToggleExpand(contact.uuid)}
      >
        <div
          className="contact-avatar"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundColor : backgroundOffset,
          }}
        >
          <ContactProfileImage
            updated={cache[contact.uuid]?.updated}
            uri={cache[contact.uuid]?.localUri}
            darkModeType={darkModeType}
            theme={theme}
          />
        </div>

        <div className="contact-name-container">
          <ThemeText
            textContent={formatDisplayName(contact) || contact.uniqueName || ""}
            textStyles={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}
          />
          <p
            style={{
              fontSize: 12,
              opacity: isExpanded ? 0.6 : 0,
              margin: 0,
              paddingTop: 4,
              color: textColor,
              transition: "opacity 200ms ease",
            }}
          >
            {t("wallet.halfModal.chooseWhatToReceive")}
          </p>
        </div>

        <span
          className={`contact-chevron${isExpanded ? " expanded" : ""}`}
          style={{ opacity: HIDDEN_OPACITY, color: textColor }}
        >
          <ChevronDown size={20} />
        </span>
      </button>

      <div
        className="contact-expanded"
        style={{
          height: isExpanded ? expandedHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="payment-options-row-r">
          <button
            className="payment-option-r"
            style={{
              backgroundColor:
                theme && darkModeType ? backgroundColor : backgroundOffset,
            }}
            onClick={() => onSelectPaymentType(contact, "BTC")}
          >
            <div
              className="payment-icon"
              style={{
                backgroundColor:
                  theme && darkModeType
                    ? darkModeType
                      ? backgroundOffset
                      : backgroundColor
                    : BTC_ORANGE,
              }}
            >
              <Bitcoin
                size={18}
                color={theme && darkModeType ? textColor : DARK_TEXT}
              />
            </div>
            <ThemeText
              textContent={t("constants.bitcoin_upper")}
              textStyles={{ margin: 0 }}
            />
          </button>

          <button
            className="payment-option-r"
            style={{
              backgroundColor:
                theme && darkModeType ? backgroundColor : backgroundOffset,
            }}
            onClick={() => onSelectPaymentType(contact, "USD")}
          >
            <div
              className="payment-icon"
              style={{
                backgroundColor:
                  theme && darkModeType
                    ? darkModeType
                      ? backgroundOffset
                      : backgroundColor
                    : DOLLAR_GREEN,
              }}
            >
              <DollarSign
                size={18}
                color={theme && darkModeType ? textColor : DARK_TEXT}
              />
            </div>
            <ThemeText
              textContent={t("constants.dollars_upper")}
              textStyles={{ margin: 0 }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AmountInputOverlay ────────────────────────────────────────────────────────

const AmountInputOverlay = ({
  visible,
  onClose,
  onSubmit,
  theme,
  darkModeType,
  backgroundColor,
  t,
}) => {
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const { swapLimits, swapUSDPriceDollars } = useFlashnet();
  const [amountValue, setAmountValue] = useState("");
  const [inputDenomination, setInputDenomination] = useState("fiat");

  const {
    primaryDisplay,
    secondaryDisplay,
    conversionFiatStats,
    convertDisplayToSats,
    getNextDenomination,
    convertForToggle,
  } = usePaymentInputDisplay({
    paymentMode: "USD",
    inputDenomination,
    fiatStats,
    usdFiatStats: { coin: "USD", value: swapUSDPriceDollars },
    masterInfoObject,
  });

  console.log(primaryDisplay, secondaryDisplay);

  const localSatAmount = convertDisplayToSats(amountValue);
  const cannotRequest =
    localSatAmount < swapLimits.bitcoin && localSatAmount > 0;

  const handleDenominationToggle = () => {
    const nextDenom = getNextDenomination();
    setInputDenomination(nextDenom);
    setAmountValue(convertForToggle(amountValue, convertTextInputValue));
  };

  const handleContinue = () => {
    if (!localSatAmount) {
      onClose();
      return;
    }
    if (cannotRequest) {
      // Show error — navigate to error page
      const errorMessage = t("wallet.receivePages.editPaymentInfo.minUSDSwap", {
        amount: displayCorrectDenomination({
          amount: swapLimits.bitcoin,
          masterInfoObject: {
            ...masterInfoObject,
            userBalanceDenomination:
              primaryDisplay.denomination === "fiat" ? "fiat" : "sats",
          },
          forceCurrency: primaryDisplay.forceCurrency,
          fiatStats: conversionFiatStats,
        }),
      });
      // Use navigate for error – component cannot import useNavigate at this level so pass via onClose/navigate
      alert(errorMessage);
      return;
    }
    onSubmit(localSatAmount);
  };

  return (
    <div
      className="hmr-overlay"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        backgroundColor,
      }}
    >
      <div
        className="hmr-overlay-balance"
        onClick={handleDenominationToggle}
        style={{ cursor: "pointer" }}
      >
        <FormattedBalanceInput
          maxWidth={0.9}
          amountValue={amountValue}
          inputDenomination={primaryDisplay.denomination}
          forceCurrency={primaryDisplay.forceCurrency}
          forceFiatStats={primaryDisplay.forceFiatStats}
        />
        <FormattedSatText
          containerStyles={{ opacity: !amountValue ? HIDDEN_OPACITY : 1 }}
          neverHideBalance={true}
          globalBalanceDenomination={secondaryDisplay.denomination}
          forceCurrency={secondaryDisplay.forceCurrency}
          forceFiatStats={secondaryDisplay.forceFiatStats}
          balance={localSatAmount}
        />
      </div>

      <div className="hmr-overlay-keyboard">
        <CustomNumberKeyboard
          showDot={primaryDisplay.denomination === "fiat"}
          setAmountValue={setAmountValue}
          usingForBalance={true}
          fiatStats={conversionFiatStats}
        />
        <CustomButton
          buttonStyles={{
            width: "90%",
            margin: "0 auto",
            opacity: cannotRequest ? HIDDEN_OPACITY : 1,
          }}
          actionFunction={handleContinue}
          textContent={
            !localSatAmount ? t("constants.back") : t("constants.continue")
          }
        />
      </div>
    </div>
  );
};

// ── HalfModalReceiveOptions ───────────────────────────────────────────────────

export default function HalfModalReceiveOptions({
  setIsKeyboardActive,
  onClose,
  openOverlay,
  setContentHeight,
}) {
  const [expandedContact, setExpandedContact] = useState(null);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const scrollRef = useRef(null);
  const rowRefsMap = useRef({});
  const previousExpandedRef = useRef(null);
  const navigate = useNavigate();
  const { cache } = useImageCache();
  const { decodedAddedContacts, contactsMessags } = useGlobalContacts();
  const { t } = useTranslation();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const contactInfoList = useProcessedContacts(
    decodedAddedContacts,
    contactsMessags,
  );

  const iconColor = theme && darkModeType ? textColor : PRIMARY;

  useEffect(() => {
    const timer = setTimeout(() => setVisibleCount(Infinity), 250);
    return () => clearTimeout(timer);
  }, []);

  const handleReceiveOption = useCallback(
    (type) => {
      if (type === "lightning") {
        onClose(() =>
          navigate("/receive", {
            state: {
              from: "homepage",
              initialReceiveType: "BTC",
              selectedRecieveOption: "lightning",
            },
          }),
        );
      } else {
        setShowAmountInput(true);
      }
    },
    [navigate, onClose],
  );

  const handleAmountSubmit = useCallback(
    (satAmount) => {
      setShowAmountInput(false);
      onClose(() =>
        navigate("/receive", {
          state: {
            receiveAmount: satAmount,
            endReceiveType: "USD",
            uuid: customUUID(),
          },
        }),
      );
    },
    [navigate, onClose],
  );

  const handleToggleExpand = useCallback((contactUuid) => {
    setExpandedContact((prev) => {
      previousExpandedRef.current = prev;
      return prev === contactUuid ? null : contactUuid;
    });
  }, []);

  const registerRef = useCallback((uuid, el) => {
    rowRefsMap.current[uuid] = el;
  }, []);

  const sortedContacts = useMemo(() => {
    return contactInfoList
      .sort((a, b) => {
        const tA = a?.lastUpdated || 0;
        const tB = b?.lastUpdated || 0;
        if (tA !== tB) return tB - tA;
        const nA = a?.contact?.name || a?.contact?.uniqueName || "";
        const nB = b?.contact?.name || b?.contact?.uniqueName || "";
        return nA.localeCompare(nB);
      })
      .map((c) => c.contact)
      .filter((c) => !c.isLNURL);
  }, [contactInfoList]);

  // Scroll expanded contact into view
  useEffect(() => {
    if (!expandedContact || !scrollRef.current) return;
    const el = rowRefsMap.current[expandedContact];
    if (!el) return;

    const expandedPanelHeight = 160;
    const collapsedRowHeight = 61;
    const container = scrollRef.current;
    const containerTop = container.getBoundingClientRect().top;

    const rowTop =
      el.getBoundingClientRect().top - containerTop + container.scrollTop;

    let collapseShift = 0;
    const prevExpanded = previousExpandedRef.current;
    if (prevExpanded && prevExpanded !== expandedContact) {
      const prevEl = rowRefsMap.current[prevExpanded];
      if (prevEl) {
        const prevTop =
          prevEl.getBoundingClientRect().top -
          containerTop +
          container.scrollTop;
        if (prevTop < rowTop) collapseShift = expandedPanelHeight;
      }
    }

    const adjustedRowY = rowTop - collapseShift;
    const expandedBottomEdge =
      adjustedRowY + collapsedRowHeight + expandedPanelHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = container.scrollTop + container.clientHeight;

    if (expandedBottomEdge > visibleBottom) {
      setTimeout(() => {
        container.scrollTo({
          top: expandedBottomEdge - container.clientHeight + 16,
          behavior: "smooth",
        });
      }, 220);
    } else if (adjustedRowY < visibleTop + 50) {
      setTimeout(() => {
        container.scrollTo({
          top: Math.max(0, adjustedRowY - 35),
          behavior: "smooth",
        });
      }, 220);
    }
  }, [expandedContact, sortedContacts]);

  const handleSelectPaymentType = useCallback(
    (contact, paymentType) => {
      onClose(() =>
        navigate("/sendAndRequestPage", {
          state: {
            selectedContact: contact,
            paymentType: "request",
            imageData: cache[contact.uuid],
            selectedRequestMethod: paymentType,
          },
        }),
      );
    },
    [navigate, cache, onClose],
  );

  return (
    <div className="hmr-container">
      {/* Main scrollable content */}
      <div
        className="hmr-content-fade"
        ref={scrollRef}
        style={{
          opacity: showAmountInput ? 0 : 1,
          transform: showAmountInput ? "translateX(-30px)" : "translateX(0)",
          pointerEvents: showAmountInput ? "none" : "auto",
        }}
      >
        {/* QR Receive Options sticky header */}
        <div
          className="hmr-section-header"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : backgroundColor,
          }}
        >
          <div className="hmr-inner">
            <ThemeText
              textContent={t("wallet.halfModal.qrReceiveOptions")}
              textStyles={{
                fontSize: 11,
                textTransform: "uppercase",
                opacity: 0.6,
                margin: "0 0 10px",
                letterSpacing: 0.5,
              }}
            />
          </div>
        </div>

        <div className="hmr-inner">
          {/* Bitcoin / Lightning */}
          <button
            className="hmr-scan-btn"
            onClick={() => handleReceiveOption("lightning")}
          >
            <div
              className="hmr-scan-icon"
              style={{
                backgroundColor:
                  theme && darkModeType ? backgroundColor : BTC_ORANGE,
              }}
            >
              <Bitcoin
                size={25}
                color={theme && darkModeType ? iconColor : DARK_TEXT}
              />
            </div>
            <div>
              <ThemeText
                textContent={t("constants.bitcoin_upper")}
                textStyles={{ margin: 0, marginBottom: 2 }}
              />
              <ThemeText
                textContent={t("wallet.halfModal.tapToGenerate_lightning_btc")}
                textStyles={{ margin: 0, fontSize: 12, opacity: 0.6 }}
              />
            </div>
          </button>

          {/* USD / Dollars */}
          <button
            className="hmr-scan-btn"
            onClick={() => handleReceiveOption("dollars")}
          >
            <div
              className="hmr-scan-icon"
              style={{
                backgroundColor:
                  theme && darkModeType ? backgroundColor : DOLLAR_GREEN,
              }}
            >
              <DollarSign
                size={25}
                color={theme && darkModeType ? iconColor : DARK_TEXT}
              />
            </div>
            <div>
              <ThemeText
                textContent={t("constants.dollars_upper")}
                textStyles={{ margin: 0, marginBottom: 2 }}
              />
              <ThemeText
                textContent={t("wallet.halfModal.tapToGenerate_lightning_usd")}
                textStyles={{ margin: 0, fontSize: 12, opacity: 0.6 }}
              />
            </div>
          </button>
        </div>

        {/* Pool section sticky header */}
        {/* <div
          className="hmr-section-header"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : backgroundColor,
            marginTop: 20,
          }}
        >
          <div className="hmr-inner">
            <ThemeText
              textContent={t("wallet.pools.receiveViaPool")}
              textStyles={{
                fontSize: 11,
                textTransform: "uppercase",
                opacity: 0.6,
                margin: "0 0 10px",
                letterSpacing: 0.5,
              }}
            />
          </div>
        </div> */}
        {/* Pool creation */}
        {/* <div className="hmr-inner">
          <button
            className="hmr-scan-btn"
            onClick={() =>
              openOverlay({ contentType: "createPoolFlow", params: {} })
            }
          >
            <div
              className="hmr-scan-icon"
              style={{
                backgroundColor:
                  theme && darkModeType ? backgroundColor : backgroundOffset,
              }}
            >
              <PiggyBank size={25} color={iconColor} />
            </div>
            <div>
              <ThemeText
                textContent={t("wallet.pools.createPool")}
                textStyles={{ margin: 0, marginBottom: 2 }}
              />
              <ThemeText
                textContent={t("wallet.pools.collectPaymentsDescription")}
                textStyles={{ margin: 0, fontSize: 12, opacity: 0.6 }}
              />
            </div>
          </button>

         
         
        </div> */}

        <hr
          className="hmr-divider"
          style={{
            borderColor:
              theme && darkModeType
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
          }}
        />

        {/* Contacts sticky header */}
        <div
          className="hmr-section-header"
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : backgroundColor,
          }}
        >
          <div className="hmr-inner">
            <ThemeText
              textContent={t("wallet.halfModal.addressBook", {
                context: "request",
              })}
              textStyles={{
                fontSize: 11,
                textTransform: "uppercase",
                opacity: 0.6,
                margin: "15px 0 10px",
                letterSpacing: 0.5,
              }}
            />
          </div>
        </div>

        <div className="hmr-inner">
          {decodedAddedContacts.length > 0 ? (
            sortedContacts
              .slice(0, visibleCount)
              .map((contact) => (
                <ContactRow
                  key={contact.uuid}
                  contact={contact}
                  cache={cache}
                  theme={theme}
                  darkModeType={darkModeType}
                  backgroundOffset={backgroundOffset}
                  backgroundColor={backgroundColor}
                  textColor={textColor}
                  expandedContact={expandedContact}
                  onToggleExpand={handleToggleExpand}
                  onSelectPaymentType={handleSelectPaymentType}
                  registerRef={registerRef}
                  t={t}
                />
              ))
          ) : (
            <div className="empty-contacts">
              <UsersRound size={40} color={textColor} />
              <ThemeText
                textContent={t("wallet.halfModal.noAddedContactsTitle")}
                textStyles={{
                  marginTop: 16,
                  marginBottom: 5,
                  textAlign: "center",
                }}
              />
              <ThemeText
                textContent={t("wallet.halfModal.noAddedContactsDesc")}
                textStyles={{
                  fontSize: 12,
                  opacity: 0.6,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              />
              <CustomButton
                buttonStyles={{ width: "100%" }}
                textContent={t("contacts.editMyProfilePage.addContactBTN")}
                actionFunction={() =>
                  openOverlay({
                    contentType: "addContactsHalfModal",
                    params: {},
                  })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Amount input overlay */}
      <AmountInputOverlay
        visible={showAmountInput}
        onClose={() => setShowAmountInput(false)}
        onSubmit={handleAmountSubmit}
        theme={theme}
        darkModeType={darkModeType}
        backgroundColor={backgroundColor}
        t={t}
      />
    </div>
  );
}
