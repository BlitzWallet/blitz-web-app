import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, replace } from "react-router-dom";
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
import { useOverlay } from "../../contexts/overlayContext";
import { useKeysContext } from "../../contexts/keysContext";
import { useFlashnet } from "../../contexts/flashnetContext";
import { useSpark } from "../../contexts/sparkContext";
import { satsToDollars } from "../../functions/spark/flashnet";
import { Share2, Info, Copy, SquarePen } from "lucide-react";
// import SkeletonPlaceholder from "../../components/skeletonPlaceholder/skeletonPlaceholder";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// import { shareMessage } from "../../functions/handleShare";

import { useTranslation } from "react-i18next";
import { useAppStatus } from "../../contexts/appStatus";

export default function ReceiveQRPage() {
  const { openOverlay } = useOverlay();
  const { fiatStats } = useNodeContext();
  const { swapLimits, poolInfoRef, swapUSDPriceDollars } = useFlashnet();
  const { sparkInformation } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const { globalContactsInformation } = useGlobalContacts();
  const { minMaxLiquidSwapAmounts } = useAppStatus();
  // const { signer, startRootstockEventListener } = useRootstock();
  const { isUsingAltAccount, currentWalletMnemoinc } =
    useActiveCustodyAccount();
  const { theme, darkModeType } = useThemeContext();

  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const navigate = useNavigate();
  const location = useLocation();

  const { contactsPrivateKey, publicKey: contactsPublicKey } = useKeysContext();
  const { t } = useTranslation();
  const isSharingRef = useRef(null);

  const props = location.state;
  const userReceiveAmount = props?.receiveAmount || 0;
  const [initialSendAmount, setInitialSendAmount] = useState(userReceiveAmount);
  console.log(props);
  const receiveOption = props?.receiveOption;
  const amount = props?.amount || 0;
  const description = props?.description;
  const navigateHome = props?.navigateHome;
  const endReceiveType = props?.endReceiveType || "BTC";
  const requestUUID = props?.uuid;

  const paymentDescription = description || "";
  const selectedRecieveOption = (receiveOption || "Lightning").toLowerCase();

  const [holdExpirySeconds, setHoldExpirySeconds] = useState(2592000);

  const prevRequstInfo = useRef(null);
  const addressStateRef = useRef(null);

  const [addressState, setAddressState] = useState({
    selectedRecieveOption: selectedRecieveOption,
    isReceivingSwap: false,
    generatedAddress: isUsingAltAccount
      ? ""
      : encodeLNURL(globalContactsInformation?.myProfile?.uniqueName),
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

  const handleHoldToggle = useCallback(() => {
    if (!addressState.isHoldInvoice) {
      openOverlay({
        for: "informationPopup",
        textContent: t("screens.inAccount.receiveBtcPage.holdInvoiceExplainer"),
        buttonText: t("constants.understandText"),
        customNavigation: () => proceedWithHoldToggle(true),
      });
      return;
    }
    proceedWithHoldToggle(false);
  }, [addressState.isHoldInvoice]);

  const proceedWithHoldToggle = useCallback(async (newValue) => {
    setAddressState((prev) => ({
      ...prev,
      isHoldInvoice: newValue,
      generatedAddress: "",
      isGeneratingInvoice: newValue,
    }));
  }, []);

  const handleExpirySelect = useCallback(async (seconds) => {
    setAddressState((prev) => ({
      ...prev,
      generatedAddress: "",
      isGeneratingInvoice: true,
    }));
    setHoldExpirySeconds(seconds.value);
  }, []);

  useEffect(() => {
    async function runAddressInit() {
      // toggleNewestPaymentTimestamp();

      if (
        prevRequstInfo.current &&
        userReceiveAmount === prevRequstInfo.current.userReceiveAmount &&
        selectedRecieveOption.toLowerCase() ===
          prevRequstInfo.current.selectedRecieveOption.toLowerCase() &&
        paymentDescription === prevRequstInfo.current.paymentDescription &&
        !addressStateRef.current.errorMessageText.text &&
        endReceiveType === prevRequstInfo.current.endReceiveType &&
        addressState.isHoldInvoice === prevRequstInfo.current.isHoldInvoice &&
        holdExpirySeconds === prevRequstInfo.current.holdExpirySeconds
      ) {
        return;
      }

      prevRequstInfo.current = {
        userReceiveAmount,
        selectedRecieveOption,
        paymentDescription,
        endReceiveType,
        isHoldInvoice: addressState.isHoldInvoice,
        holdExpirySeconds,
      };

      if (
        !userReceiveAmount &&
        selectedRecieveOption.toLowerCase() === "lightning" &&
        !isUsingAltAccount &&
        endReceiveType === "BTC" &&
        !paymentDescription &&
        !addressState.isHoldInvoice
      ) {
        setInitialSendAmount(0);
        setAddressState((prev) => ({
          ...prev,
          generatedAddress: encodeLNURL(
            globalContactsInformation?.myProfile?.uniqueName,
          ),
        }));
        return;
      }

      await initializeAddressProcess({
        userBalanceDenomination: masterInfoObject.userBalanceDenomination,
        receivingAmount: userReceiveAmount,
        description: paymentDescription,
        masterInfoObject,
        setAddressState: setAddressState,
        selectedRecieveOption: selectedRecieveOption,
        navigate,
        // signer,
        currentWalletMnemoinc,
        sparkInformation,
        endReceiveType,
        swapLimits,
        setInitialSendAmount,
        userReceiveAmount,
        poolInfoRef,
        isHoldInvoice: addressState.isHoldInvoice,
        holdExpirySeconds,
        contactsPrivateKey,
        contactsPublicKey,
      });
    }
    runAddressInit();
  }, [
    userReceiveAmount,
    paymentDescription,
    selectedRecieveOption,
    requestUUID,
    endReceiveType,
    addressState.isHoldInvoice,
    holdExpirySeconds,
  ]);

  const handleShare = async () => {
    if (!addressState.generatedAddress) return;
    if (addressState.isGeneratingInvoice) return;
    try {
      isSharingRef.current = true;
      // await shareMessage({ message: addressState.generatedAddress });
    } catch (err) {
      console.log("Error sharing invoice", err);
    } finally {
      isSharingRef.current = false;
    }
  };

  const headerContext =
    selectedRecieveOption === "spark" || selectedRecieveOption === "lightning"
      ? `${selectedRecieveOption}_${endReceiveType?.toLowerCase()}`
      : selectedRecieveOption;

  return (
    <div className="receiveQrPage">
      <TopBar
        navigateHome={navigateHome}
        navigate={navigate}
        handleShare={handleShare}
        label={t("constants.receive")}
      />
      <div className="receiveQrPageContent">
        <ThemeText
          removeMargin={true}
          className={"selectedReceiveOption"}
          textStyles={{ opacity: 0.7, marginTop: "auto", marginBottom: 8 }}
          textContent={t("screens.inAccount.receiveBtcPage.header", {
            context: headerContext,
          })}
        />

        <QrCode
          addressState={addressState}
          navigate={navigate}
          location={location}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
          globalContactsInformation={globalContactsInformation}
          selectedRecieveOption={selectedRecieveOption}
          initialSendAmount={initialSendAmount || userReceiveAmount}
          masterInfoObject={masterInfoObject}
          fiatStats={fiatStats}
          isUsingAltAccount={isUsingAltAccount}
          t={t}
          endReceiveType={endReceiveType}
          swapLimits={swapLimits}
          poolInfoRef={poolInfoRef}
          isSharingRef={isSharingRef}
          paymentDescription={paymentDescription}
          userReceiveAmount={userReceiveAmount}
          handleHoldToggle={handleHoldToggle}
          handleExpirySelect={handleExpirySelect}
          isHoldInvoice={addressState.isHoldInvoice}
          holdExpirySeconds={holdExpirySeconds}
          backgroundOffset={backgroundOffset}
          backgroundColor={backgroundColor}
          textColor={textColor}
          receiveOption={selectedRecieveOption}
        />

        <ReceiveButtonsContainer
          initialSendAmount={initialSendAmount || userReceiveAmount}
          description={paymentDescription}
          receiveOption={selectedRecieveOption}
          generatingInvoiceQRCode={addressState.isGeneratingInvoice}
          generatedAddress={addressState.generatedAddress}
          isUsingAltAccount={isUsingAltAccount}
          endReceiveType={endReceiveType}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
        />

        <div style={{ marginBottom: "auto" }} />

        <div
          onClick={() => {
            if (
              (selectedRecieveOption === "lightning" &&
                endReceiveType !== "USD") ||
              selectedRecieveOption === "spark"
            )
              return;

            let informationText = "";
            if (selectedRecieveOption === "bitcoin") {
              informationText = t(
                "screens.inAccount.receiveBtcPage.onchainFeeMessage",
              );
            } else if (selectedRecieveOption === "liquid") {
              informationText = t(
                "screens.inAccount.receiveBtcPage.liquidFeeMessage",
                {
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
                },
              );
            } else if (selectedRecieveOption === "lightning") {
              informationText = t(
                "screens.inAccount.receiveBtcPage.lightningConvertMessage",
              );
            }

            if (informationText) {
              openOverlay({
                for: "informationPopup",
                textContent: informationText,
                buttonText: t("constants.understandText"),
              });
            }
          }}
          className="feeContainer"
          style={{
            cursor:
              (selectedRecieveOption !== "lightning" ||
                (selectedRecieveOption === "lightning" &&
                  endReceiveType === "USD")) &&
              selectedRecieveOption !== "spark"
                ? "pointer"
                : "default",
          }}
        >
          <div className="feeTextContainer">
            <ThemeText
              textStyles={{
                margin: 0,
                marginRight:
                  (selectedRecieveOption !== "lightning" ||
                    (selectedRecieveOption === "lightning" &&
                      endReceiveType === "USD")) &&
                  selectedRecieveOption !== "spark"
                    ? 5
                    : 0,
              }}
              textContent={t("constants.fee")}
            />
            {(selectedRecieveOption !== "lightning" ||
              (selectedRecieveOption === "lightning" &&
                endReceiveType === "USD")) &&
              selectedRecieveOption !== "spark" && (
                <Info size={15} color={textColor} />
              )}
          </div>
          {(selectedRecieveOption !== "lightning" ||
            (selectedRecieveOption === "lightning" &&
              endReceiveType === "USD")) &&
          selectedRecieveOption !== "spark" ? (
            <ThemeText
              textStyles={{ margin: 0 }}
              textContent={t("constants.veriable")}
            />
          ) : (
            <FormattedSatText
              styles={{ margin: 0 }}
              balance={0}
              neverHideBalance={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QrCode({
  addressState,
  navigate,
  location,
  openOverlay,
  globalContactsInformation,
  selectedRecieveOption,
  initialSendAmount,
  masterInfoObject,
  fiatStats,
  isUsingAltAccount,
  t,
  endReceiveType,
  swapLimits,
  poolInfoRef,
  isSharingRef,
  paymentDescription,
  userReceiveAmount,
  handleHoldToggle,
  handleExpirySelect,
  isHoldInvoice,
  holdExpirySeconds,
  backgroundOffset,
  backgroundColor,
  textColor,
  receiveOption,
}) {
  const isUsingLnurl =
    selectedRecieveOption === "lightning" &&
    !initialSendAmount &&
    !isUsingAltAccount &&
    endReceiveType === "BTC" &&
    !paymentDescription &&
    !isHoldInvoice;

  const address =
    (isUsingLnurl
      ? `${globalContactsInformation?.myProfile?.uniqueName}@blitzwalletapp.com`
      : addressState.generatedAddress) || "";

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

  const qrData = isUsingLnurl
    ? encodeLNURL(globalContactsInformation?.myProfile?.uniqueName)
    : addressState.generatedAddress || " ";

  const invoiceContext =
    selectedRecieveOption === "lightning"
      ? !isUsingLnurl
        ? "lightningInvoice"
        : "lightningAddress"
      : `${selectedRecieveOption}Address`;

  const handlePress = () => {
    if (!addressState.generatedAddress) return;
    if (addressState.isGeneratingInvoice) return;
    if (isSharingRef.current) return;
    copyToClipboard(addressState.generatedAddress, openOverlay, location);
  };

  const editAmount = () => {
    if (isSharingRef.current) return;
    navigate(`/receiveAmount`, {
      state: {
        receiveOption,
        from: "receivePage",
        receiveType: selectedRecieveOption,
        endReceiveType,
        userReceiveAmount,
        description: paymentDescription,
      },
    });
  };

  const editDescription = () => {
    if (isSharingRef.current) return;
    openOverlay({
      for: "halfModal",
      contentType: "AddMessageReceivePage",
      memo: paymentDescription,
    });
  };

  const hasError =
    addressState.errorMessageText?.text &&
    addressState.errorMessageText?.type !== "warning";

  return (
    <div
      className="qrCodeContainerReceivePage"
      style={{ backgroundColor: backgroundOffset }}
    >
      <div
        className="animatedQRContainer"
        onClick={handlePress}
        style={{
          cursor: addressState.generatedAddress ? "pointer" : "default",
        }}
      >
        {!hasError ? (
          <>
            {addressState.isGeneratingInvoice &&
            !addressState.generatedAddress ? (
              <div className="qrLoadingWrapper">
                <FullLoadingScreen showText={false} />
              </div>
            ) : (
              <QRCodeQrapper data={qrData} />
            )}
          </>
        ) : (
          <div className="qrErrorWrapper">
            <ThemeText
              removeMargin={true}
              className="receiveErrorText"
              textContent={
                t(addressState.errorMessageText.text) ||
                t("errormessages.invoiceRetrivalError")
              }
            />
          </div>
        )}
      </div>

      {addressState.errorMessageText?.text &&
        addressState.errorMessageText?.type === "warning" && (
          <ThemeText
            removeMargin={true}
            className="receiveWarningText"
            textContent={t(addressState.errorMessageText.text)}
          />
        )}

      {canUseAmount && (
        <QRInformationRow
          title={t("constants.amount")}
          info={
            !initialSendAmount
              ? t("screens.inAccount.receiveBtcPage.amountPlaceholder")
              : displayCorrectDenomination({
                  masterInfoObject: {
                    ...masterInfoObject,
                    userBalanceDenomination:
                      endReceiveType === "USD"
                        ? "fiat"
                        : masterInfoObject.userBalanceDenomination,
                  },
                  fiatStats,
                  amount:
                    endReceiveType === "USD"
                      ? satsToDollars(
                          initialSendAmount,
                          poolInfoRef?.currentPriceAInB,
                        ).toFixed(2)
                      : initialSendAmount,
                  convertAmount: endReceiveType !== "USD",
                  forceCurrency: endReceiveType === "USD" ? "USD" : null,
                })
          }
          iconName="SquarePen"
          showBorder={true}
          actionFunction={editAmount}
          backgroundColor={backgroundColor}
          textColor={textColor}
        />
      )}

      {canUseDescription && (
        <QRInformationRow
          title={t("constants.description")}
          info={
            !paymentDescription
              ? t("screens.inAccount.receiveBtcPage.editDescriptionPlaceholder")
              : paymentDescription
          }
          iconName="SquarePen"
          showBorder={true}
          actionFunction={editDescription}
          backgroundColor={backgroundColor}
          textColor={textColor}
        />
      )}

      <QRInformationRow
        title={t("screens.inAccount.receiveBtcPage.invoiceDescription", {
          context: invoiceContext,
        })}
        info={
          isUsingLnurl
            ? address
            : address
              ? address.slice(0, showLongerAddress ? 14 : 7) +
                "..." +
                address.slice(address.length - 7)
              : ""
        }
        iconName="Copy"
        actionFunction={() => {
          if (addressState.isGeneratingInvoice) return;
          if (isSharingRef.current) return;
          if (addressState.generatedAddress)
            copyToClipboard(address, openOverlay, location);
        }}
        showSkeleton={addressState.isGeneratingInvoice}
        backgroundColor={backgroundColor}
        textColor={textColor}
      />
    </div>
  );
}

function QRInformationRow({
  title = "",
  info = "",
  showBorder,
  actionFunction,
  showSkeleton = false,
  iconName,
  backgroundColor,
  textColor,
  customNumberOfLines = 1,
}) {
  const IconComponent =
    iconName === "SquarePen" ? SquarePen : iconName === "Copy" ? Copy : null;

  return (
    <div
      className="qrInfoContainer"
      style={{
        borderBottom: showBorder ? `2px solid ${backgroundColor}` : "none",
      }}
      onClick={() => {
        if (actionFunction) actionFunction();
      }}
    >
      <div className="infoTextContainer">
        <ThemeText
          removeMargin={true}
          textStyles={{ fontSize: 12, includeFontPadding: false }}
          textContent={title}
        />
        {showSkeleton ? (
          <Skeleton
            style={{ height: 10, width: "100%", lineHeight: "unset" }}
            baseColor={"rgba(128,128,128,0.3)"}
            highlightColor={backgroundColor}
          />
        ) : (
          <ThemeText
            removeMargin={true}
            textStyles={{
              fontSize: 12,
              opacity: 0.6,
              includeFontPadding: false,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: customNumberOfLines === 1 ? "nowrap" : "normal",
            }}
            textContent={info}
          />
        )}
      </div>

      <div className="qrInfoIconContainer" style={{ backgroundColor }}>
        {IconComponent && <IconComponent size={15} color={textColor} />}
      </div>
    </div>
  );
}

function TopBar({ navigateHome, navigate, handleShare, label }) {
  return (
    <div className="receiveTopBar">
      <BackArrow
        backFunction={() => {
          navigate("/wallet", { replace: true });
        }}
      />
      <ThemeText
        className={"navBarText"}
        removeMargin={true}
        textContent={label}
        textStyles={{ fontSize: "1.25rem" }}
      />
      {/* <button className="shareButton" onClick={handleShare}>
        <Share2 size={20} />
      </button> */}
    </div>
  );
}
