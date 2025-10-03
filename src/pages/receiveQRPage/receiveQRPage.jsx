import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
import ThemeImage from "../../components/ThemeImage/themeImage";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { encodeLNURL } from "../../functions/lnurl/bench32Formmater";
import FullLoadingScreen from "../../components/fullLoadingScreen/fullLoadingScreen";
import { aboutIcon, aboutIconWhite } from "../../constants/icons";

export default function ReceiveQRPage({ openOverlay }) {
  const { globalContactsInformation } = useGlobalContacts();
  const { currentWalletMnemoinc, isUsingAltAccount } =
    useActiveCustodyAccount();
  const { theme, darkModeType } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const props = location.state;

  console.log(props, "receive props");

  const receiveOption = props?.receiveOption;
  const amount = props?.amount || 0;
  const description = props?.description;
  const navigateHome = props?.navigateHome;
  const hasInitialized = useRef(false);

  const initialSendAmount = Number(amount);
  const paymentDescription = description || "";
  const selectedRecieveOption = (receiveOption || "Lightning").toLowerCase();

  console.log(initialSendAmount, paymentDescription, selectedRecieveOption);

  const [addressState, setAddressState] = useState({
    selectedRecieveOption: selectedRecieveOption,
    isReceivingSwap: false,
    generatedAddress: encodeLNURL(
      globalContactsInformation?.myProfile?.uniqueName
    ),
    isGeneratingInvoice: false,
    minMaxSwapAmount: { min: 0, max: 0 },
    swapPegInfo: {},
    errorMessageText: { type: null, text: "" },
    hasGlobalError: false,
    fee: 0,
  });

  useEffect(() => {
    initializeAddressProcess({
      userBalanceDenomination: "sats",
      receivingAmount: initialSendAmount,
      description: paymentDescription,
      masterInfoObject: {},
      setAddressState,
      selectedRecieveOption,
      navigate,
      currentWalletMnemoinc,
      globalContactsInformation,
      isUsingAltAccount,
    });
  }, [
    initialSendAmount,
    paymentDescription,
    selectedRecieveOption,
    globalContactsInformation?.myProfile?.uniqueName,
  ]);

  useEffect(() => {
    if (selectedRecieveOption !== "bitcoin") return;
    // requestAnimationFrame(() => {
    //   navigate("/error", {
    //     state: {
    //       errorMessage:
    //         "Currently, on-chain payment addresses are single-use only...",
    //     },
    //   });
    // });
  }, [selectedRecieveOption, navigate]);

  return (
    <div className="receiveQrPage">
      <TopBar
        navigateHome={navigateHome}
        receiveOption={selectedRecieveOption}
        navigate={navigate}
      />
      <div className="receiveQrPageContent">
        <ThemeText
          className={"selectedReceiveOption"}
          textContent={selectedRecieveOption}
        />

        <QrCode
          addressState={addressState}
          navigate={navigate}
          location={location}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
        />
        <ReceiveButtonsContainer
          initialSendAmount={initialSendAmount}
          description={paymentDescription}
          receiveOption={selectedRecieveOption}
          generatingInvoiceQRCode={addressState.isGeneratingInvoice}
          generatedAddress={addressState.generatedAddress}
          theme={theme}
          darkModeType={darkModeType}
          openOverlay={openOverlay}
        />
        <div style={{ marginBottom: "auto" }}></div>
        <div
          onClick={() => {
            if (selectedRecieveOption.toLowerCase() !== "bitcoin") return;
            openOverlay({
              for: "error",
              errorMessage:
                "On-chain payments have a network fee and 0.1% Spark fee.\n\nIf you send money to yourself, you’ll pay the network fee twice — once to send it and once to claim it.\n\nIf someone else sends you money, you’ll only pay the network fee once to claim it.",
            });
          }}
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            cursor:
              selectedRecieveOption.toLowerCase() === "bitcoin"
                ? "pointer"
                : "default",
          }}
        >
          <div className="feeTextContainer">
            <ThemeText textStyles={{ margin: 0 }} textContent={"Fee"} />
            <ThemeImage
              styles={{ width: 15, height: 15, marginLeft: "5px" }}
              lightModeIcon={aboutIcon}
              darkModeIcon={aboutIcon}
              lightsOutIcon={aboutIconWhite}
            />
          </div>
          {selectedRecieveOption.toLowerCase() === "bitcoin" ? (
            <ThemeText textStyles={{ margin: 0 }} textContent={"Variable"} />
          ) : (
            <FormattedSatText balance={0} neverHideBalance={true} />
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
  theme,
  darkModeType,
  openOverlay,
}) {
  const { backgroundOffset } = useThemeColors();
  if (addressState.isGeneratingInvoice) {
    return (
      <div
        style={{ backgroundColor: backgroundOffset }}
        className="qrCodeContainerReceivePage"
      >
        <FullLoadingScreen showText={false} />
      </div>
    );
  }
  if (!addressState.generatedAddress) {
    return (
      <div
        style={{ backgroundColor: backgroundOffset }}
        className="qrCodeContainerReceivePage"
      >
        <ThemeText
          className={"receiveErrorText"}
          textContent={
            addressState.errorMessageText.text || "Unable to generate address"
          }
        />
      </div>
    );
  }
  return (
    <div
      style={{ backgroundColor: backgroundOffset, cursor: "pointer" }}
      onClick={() =>
        copyToClipboard(addressState.generatedAddress, openOverlay, location)
      }
      className="qrCodeContainerReceivePage"
    >
      <QRCodeQrapper data={addressState.generatedAddress} />
      {addressState.errorMessageText.text && (
        <p>{addressState.errorMessageText.text}</p>
      )}
    </div>
  );
}

function TopBar({ navigateHome }) {
  const navigate = useNavigate();
  console.log(navigateHome, "navigaet home");
  return (
    <BackArrow
      backFunction={() => {
        navigate(navigateHome ? "/wallet" : -1, {
          replace: true,
        });
      }}
    />
  );
}
