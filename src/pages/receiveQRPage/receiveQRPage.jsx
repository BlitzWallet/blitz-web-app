import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import copyToClipboard from "../../functions/copyToClipboard";
import BackArrow from "../../components/backArrow/backArrow";
import QRCodeQrapper from "../../components/qrCode/qrCode";
import "./style.css";
import ReceiveButtonsContainer from "./components/buttonContainer";
import { initializeAddressProcess } from "../../functions/receiveBitcoin/addressGeneration";
import { useGlobalContacts } from "../../contexts/globalContacts";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { encodeLNURL } from "../../functions/lnurl/bench32Formmater";
import FullLoadingScreen from "../../components/fullLoadingScreen/fullLoadingScreen";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import { Colors } from "../../constants/theme";
import { useOverlay } from "../../contexts/overlayContext";
import { Info } from "lucide-react";
import ThemeIcon from "../../components/themeIcon";
import { useKeysContext } from "../../contexts/keysContext";
import { useTranslation } from "react-i18next";
import { useSpark } from "../../contexts/sparkContext";
import { useFlashnet } from "../../contexts/flashnetContext";

export default function ReceiveQRPage() {
  const { sparkInformation } = useSpark();
  const { t } = useTranslation();
  const { openOverlay } = useOverlay();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const { globalContactsInformation } = useGlobalContacts();
  const { swapLimits, poolInfoRef } = useFlashnet();
  const { currentWalletMnemoinc, isUsingAltAccount } =
    useActiveCustodyAccount();
  const { theme, darkModeType } = useThemeContext();
  const { textColor } = useThemeColors();
  const { publcKey, contactsPrivateKey } = useKeysContext();
  const navigate = useNavigate();
  const location = useLocation();
  const props = location.state;

  const receiveOption = props?.receiveOption;
  const amount = props?.amount || 0;
  const description = props?.description;
  const navigateHome = props?.navigateHome;
  const endReceiveType =
    props?.endReceiveType || props?.initialReceiveType || "BTC";

  const hasInitialized = useRef(false);
  const prevRequstInfo = useRef(null);
  const addressStateRef = useRef(null);

  const [initialSendAmount, setInitialSendAmount] = useState(Number(amount));
  const paymentDescription = description || "";
  const selectedRecieveOption = (receiveOption || "Lightning").toLowerCase();

  const [addressState, setAddressState] = useState({
    selectedRecieveOption: selectedRecieveOption,
    isReceivingSwap: false,
    generatedAddress: isUsingAltAccount
      ? ""
      : `${globalContactsInformation?.myProfile?.uniqueName}@blitzwalletapp.com`,
    isGeneratingInvoice: false,
    isHoldInvoice: false,
    minMaxSwapAmount: { min: 0, max: 0 },
    swapPegInfo: {},
    errorMessageText: { type: null, text: "" },
    hasGlobalError: false,
    fee: 0,
  });

  useEffect(() => {
    addressStateRef.current = addressState;
  }, [addressState]);

  useEffect(() => {
    if (
      prevRequstInfo.current &&
      initialSendAmount === prevRequstInfo.current.initialSendAmount &&
      selectedRecieveOption.toLowerCase() ===
        prevRequstInfo.current.selectedRecieveOption.toLowerCase() &&
      paymentDescription === prevRequstInfo.current.paymentDescription &&
      !addressStateRef.current.errorMessageText.text &&
      endReceiveType === prevRequstInfo.current.endReceiveType
    ) {
      return;
    }
    prevRequstInfo.current = {
      initialSendAmount,
      selectedRecieveOption,
      paymentDescription,
      endReceiveType,
    };

    if (
      !initialSendAmount &&
      selectedRecieveOption.toLowerCase() === "lightning" &&
      !isUsingAltAccount &&
      endReceiveType === "BTC" &&
      !paymentDescription &&
      !addressState.isHoldInvoice
    ) {
      setInitialSendAmount(0);
      setAddressState((prev) => ({
        ...prev,
        errorMessageText: { type: null, text: "" },
        hasGlobalError: false,
        generatedAddress: `${globalContactsInformation?.myProfile?.uniqueName}@blitzwalletapp.com`,
      }));
      return;
    }
    initializeAddressProcess({
      userBalanceDenomination: masterInfoObject.userBalanceDenomination,
      receivingAmount: initialSendAmount,
      description: paymentDescription,
      masterInfoObject,
      setAddressState,
      selectedRecieveOption,
      navigate,
      currentWalletMnemoinc,
      sparkInformation,
      endReceiveType,
      swapLimits,
      setInitialSendAmount,
      userReceiveAmount: initialSendAmount,
      poolInfoRef,
      contactsPrivateKey,
      contactsPublicKey: publcKey,
    });
  }, [
    initialSendAmount,
    paymentDescription,
    selectedRecieveOption,
    endReceiveType,
    globalContactsInformation?.myProfile?.uniqueName,
  ]);

  const headerContext =
    selectedRecieveOption?.toLowerCase() === "spark" ||
    selectedRecieveOption?.toLowerCase() === "lightning"
      ? selectedRecieveOption?.toLowerCase() +
        `_${endReceiveType?.toLowerCase()}`
      : selectedRecieveOption?.toLowerCase();

  // Fee section logic: matches RN
  // "Variable" (+ info icon, clickable) for: bitcoin, liquid, rootstock, lightning+USD
  // "0 sats" for: lightning+BTC, spark
  const isFreeFee =
    (selectedRecieveOption === "lightning" && endReceiveType !== "USD") ||
    selectedRecieveOption === "spark";

  const handleFeePress = () => {
    if (isFreeFee) return;
    let msg = "";
    if (selectedRecieveOption === "bitcoin") {
      msg =
        "On-chain payments have a network fee and 0.1% Spark fee.\n\nIf you send money to yourself, you'll pay the network fee twice — once to send it and once to claim it.\n\nIf someone else sends you money, you'll only pay the network fee once to claim it.";
    } else if (selectedRecieveOption === "liquid") {
      msg = t("screens.inAccount.receiveBtcPage.liquidFeeMessage", {
        fee: displayCorrectDenomination({
          amount: 34,
          masterInfoObject,
          fiatStats,
        }),
        claimFee: displayCorrectDenomination({
          amount: 19,
          masterInfoObject,
          fiatStats,
        }),
      });
    } else if (selectedRecieveOption === "rootstock") {
      msg = t("screens.inAccount.receiveBtcPage.rootstockFeeMessage", {
        fee: displayCorrectDenomination({
          amount: 185,
          masterInfoObject,
          fiatStats,
        }),
      });
    } else if (selectedRecieveOption === "lightning") {
      msg = t("screens.inAccount.receiveBtcPage.lightningConvertMessage", {
        convertFee: `${(poolInfoRef?.lpFeeBps / 100 + 1).toFixed(2)}%`,
        satExchangeRate: "",
        dollarAmount: "$1",
      });
    }
    openOverlay({ for: "error", errorMessage: msg });
  };

  const handleShare = async () => {
    if (!addressState.generatedAddress) return;
    if (addressState.isGeneratingInvoice) return;
    const text = addressState.generatedAddress;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (_) {}
    } else {
      copyToClipboard(text, openOverlay, location);
    }
  };

  return (
    <div className="receiveQrPage">
      <TopBar
        navigateHome={navigateHome}
        navigate={navigate}
        onShare={handleShare}
        t={t}
      />
      <ThemeText
        className={"selectedReceiveOption"}
        textContent={t("screens.inAccount.receiveBtcPage.header", {
          context: headerContext,
        })}
      />
      <div className="receiveQrPageContent">
        <QrCode
          addressState={addressState}
          navigate={navigate}
          location={location}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
          selectedRecieveOption={selectedRecieveOption}
          initialSendAmount={initialSendAmount}
          paymentDescription={paymentDescription}
          endReceiveType={endReceiveType}
          masterInfoObject={masterInfoObject}
          fiatStats={fiatStats}
          isUsingAltAccount={isUsingAltAccount}
          globalContactsInformation={globalContactsInformation}
          t={t}
          navigateHome={navigateHome}
        />
        <ReceiveButtonsContainer
          initialSendAmount={initialSendAmount}
          description={paymentDescription}
          receiveOption={selectedRecieveOption}
          endReceiveType={endReceiveType}
          generatingInvoiceQRCode={addressState.isGeneratingInvoice}
          generatedAddress={addressState.generatedAddress}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
        />
        <div style={{ marginBottom: "auto" }} />
        <div
          onClick={handleFeePress}
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            cursor: isFreeFee ? "default" : "pointer",
          }}
        >
          <div className="feeTextContainer">
            <ThemeText
              textStyles={{ margin: 0, marginRight: 5 }}
              textContent={"Fee"}
            />
            {!isFreeFee && (
              <Info
                size={15}
                color={
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.blue
                }
              />
            )}
          </div>
          {!isFreeFee ? (
            <ThemeText textStyles={{ margin: 0 }} textContent={"Variable"} />
          ) : (
            <FormattedSatText balance={0} neverHideBalance={true} />
          )}
        </div>
      </div>
    </div>
  );
}

function QRInformationRow({
  title,
  info,
  iconName,
  actionFunction,
  showSkeleton = false,
  showBorder = true,
}) {
  const { backgroundOffset, textColor } = useThemeColors();

  return (
    <div
      className={`qrInfoRow${showBorder ? " qrInfoRowBorder" : ""}`}
      onClick={actionFunction}
      style={{ borderColor: backgroundOffset }}
    >
      <div className="qrInfoRowText">
        <ThemeText
          textStyles={{ fontSize: 12, margin: 0 }}
          textContent={title}
        />
        {showSkeleton ? (
          <div className="qrInfoSkeleton" />
        ) : (
          <ThemeText
            textStyles={{ fontSize: 12, margin: 0, opacity: 0.6 }}
            textContent={info}
            CustomNumberOfLines={1}
          />
        )}
      </div>
      <div
        className="qrInfoRowIcon"
        style={{ backgroundColor: backgroundOffset }}
      >
        <ThemeIcon iconName={iconName} size={15} colorOverride={textColor} />
      </div>
    </div>
  );
}

function QrCode({
  addressState,
  navigate,
  location,
  theme,
  darkModeType,
  openOverlay,
  selectedRecieveOption,
  initialSendAmount,
  paymentDescription,
  endReceiveType,
  masterInfoObject,
  fiatStats,
  isUsingAltAccount,
  globalContactsInformation,
  t,
  navigateHome,
}) {
  const { backgroundOffset } = useThemeColors();
  const [visible, setVisible] = useState(!!addressState.generatedAddress);
  const [displayAddress, setDisplayAddress] = useState(
    addressState.generatedAddress,
  );
  const prevAddress = useRef(addressState.generatedAddress);

  // Fade-transition: when address changes, fade out → swap → fade in
  useEffect(() => {
    const newAddr = addressState.generatedAddress;
    if (newAddr === prevAddress.current) return;
    setVisible(false);
    const timer = setTimeout(() => {
      prevAddress.current = newAddr;
      setDisplayAddress(newAddr);
      setVisible(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [addressState.generatedAddress]);

  const isUsingLnurl =
    selectedRecieveOption === "lightning" &&
    !initialSendAmount &&
    !isUsingAltAccount &&
    endReceiveType === "BTC" &&
    !paymentDescription &&
    !addressState.isHoldInvoice;

  const address =
    (isUsingLnurl
      ? `${globalContactsInformation?.myProfile?.uniqueName}@blitzwalletapp.com`
      : displayAddress) || "";

  const canUseAmount =
    selectedRecieveOption !== "spark" && selectedRecieveOption !== "rootstock";

  const canUseDescription =
    selectedRecieveOption === "lightning" ||
    selectedRecieveOption === "bitcoin" ||
    selectedRecieveOption === "liquid";

  const showLongerAddress =
    (selectedRecieveOption === "bitcoin" ||
      selectedRecieveOption === "liquid") &&
    !!initialSendAmount;

  const truncatedAddress = address
    ? isUsingLnurl
      ? address
      : address.slice(0, showLongerAddress ? 14 : 7) + "..." + address.slice(-7)
    : "";

  const invoiceContext =
    selectedRecieveOption === "lightning"
      ? isUsingLnurl
        ? "lightningAddress"
        : "lightningInvoice"
      : `${selectedRecieveOption}Address`;

  const handleCopy = () => {
    if (!addressState.generatedAddress || addressState.isGeneratingInvoice)
      return;
    copyToClipboard(addressState.generatedAddress, openOverlay, location);
  };

  const editAmount = () => {
    navigate("/receiveAmount", {
      state: {
        receiveOption: selectedRecieveOption,
        from: "receivePage",
        endReceiveType,
        userReceiveAmount: initialSendAmount,
        description: paymentDescription,
        navigateHome,
      },
    });
  };

  const editDescription = () => {
    openOverlay({
      for: "halfModal",
      contentType: "editReceiveDescription",
      params: {
        description: paymentDescription,
        receiveOption: selectedRecieveOption,
        amount: initialSendAmount,
        endReceiveType,
        navigateHome,
        sliderHeight: "50dvh",
      },
    });
  };

  const amountDisplay = !initialSendAmount
    ? t("screens.inAccount.receiveBtcPage.amountPlaceholder")
    : displayCorrectDenomination({
        amount: initialSendAmount,
        masterInfoObject,
        fiatStats,
      });

  const hasError =
    addressState.errorMessageText?.text &&
    addressState.errorMessageText?.type !== "warning";

  return (
    <div
      className="qrCodeContainerReceivePage"
      style={{ backgroundColor: backgroundOffset }}
    >
      {/* QR / loading / error area */}
      <div
        className="qrAnimatedContainer"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s" }}
        onClick={handleCopy}
      >
        {hasError ? (
          <ThemeText
            className={"receiveErrorText"}
            textContent={
              t(addressState.errorMessageText.text) ||
              "Unable to generate address"
            }
          />
        ) : addressState.isGeneratingInvoice && !displayAddress ? (
          <FullLoadingScreen showText={false} />
        ) : displayAddress ? (
          <QRCodeQrapper data={displayAddress} />
        ) : (
          <FullLoadingScreen showText={false} />
        )}
      </div>

      {addressState.errorMessageText?.text &&
        addressState.errorMessageText?.type === "warning" && (
          <ThemeText
            textStyles={{
              fontSize: 13,
              textAlign: "center",
              margin: "10px 0 20px",
              opacity: 0.8,
            }}
            textContent={t(addressState.errorMessageText.text)}
          />
        )}

      {/* Info rows */}
      {canUseAmount && (
        <QRInformationRow
          title={t("constants.amount")}
          info={amountDisplay}
          iconName="SquarePen"
          showBorder={true}
          actionFunction={editAmount}
        />
      )}
      {canUseDescription && (
        <QRInformationRow
          title={t("constants.description")}
          info={
            paymentDescription ||
            t("screens.inAccount.receiveBtcPage.editDescriptionPlaceholder")
          }
          iconName="SquarePen"
          showBorder={true}
          actionFunction={editDescription}
        />
      )}
      <QRInformationRow
        title={t("screens.inAccount.receiveBtcPage.invoiceDescription", {
          context: invoiceContext,
        })}
        info={truncatedAddress}
        iconName="Copy"
        showBorder={false}
        showSkeleton={addressState.isGeneratingInvoice && !displayAddress}
        actionFunction={handleCopy}
      />
    </div>
  );
}

function TopBar({ navigateHome, navigate, onShare, t }) {
  const { theme, darkModeType } = useThemeContext();
  const shareColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;
  return (
    <div className="receiveTopBar">
      <button
        className="shareButton"
        onClick={() =>
          navigate(navigateHome ? "/wallet" : -1, { replace: true })
        }
        aria-label="Back"
      >
        <ThemeIcon iconName="ArrowLeft" colorOverride={shareColor} />
      </button>

      <ThemeText className={"label"} textContent={t("constants.receive")} />
      <button className="shareButton" onClick={onShare} aria-label="Share">
        <ThemeIcon iconName="Share" size={22} colorOverride={shareColor} />
      </button>
    </div>
  );
}
