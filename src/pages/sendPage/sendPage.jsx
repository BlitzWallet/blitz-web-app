import { useEffect, useMemo, useState } from "react";
import "./send.css";
import { useLocation, useNavigate } from "react-router-dom";
import BackArrow from "../../components/backArrow/backArrow";
import { sparkPaymenWrapper } from "../../functions/spark/payments";
import { useSpark } from "../../contexts/sparkContext";
import FullLoadingScreen from "../../components/fullLoadingScreen/fullLoadingScreen";
import { Colors } from "../../constants/theme";
import hasAlredyPaidInvoice from "../../functions/sendBitcoin/hasPaid";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import { useAppStatus } from "../../contexts/appStatus";
import ErrorWithPayment from "./components/errorScreen";
import decodeSendAddress from "../../functions/sendBitcoin/decodeSendAdress";
import {
  QUICK_PAY_STORAGE_KEY,
  SATSPERBITCOIN,
  SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT,
} from "../../constants";
import CustomInput from "../../components/customInput/customInput";
import CustomNumberKeyboard from "../../components/customNumberKeyboard/customNumberKeyboard";
import NumberInputSendPage from "./components/numberInput";
import CustomButton from "../../components/customButton/customButton";
import { getBoltzApiUrl } from "../../functions/boltz/boltzEndpoitns";

import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import formatSparkPaymentAddress from "../../functions/sendBitcoin/formatSparkPaymentAddress";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { useTranslation } from "react-i18next";
import { InputTypes } from "bitcoin-address-parser";
import ThemeImage from "../../components/ThemeImage/themeImage";
import { adminHomeWallet } from "../../constants/icons";
import ThemeText from "../../components/themeText/themeText";
import SelectLRC20Token from "./components/selectLRC20Token";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";
import CustomSettingsNavbar from "../../components/customSettingsNavbar";
import AcceptButtonSendPage from "./components/acceptButton";
import { useOverlay } from "../../contexts/overlayContext";
import NavBarWithBalance from "../../components/navBarWithBalance/navbarWithBalance";
import {
  handlePaymentUpdate,
  publishMessage,
} from "../../functions/messaging/publishMessage";
import { useKeysContext } from "../../contexts/keysContext";

export default function SendPage() {
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const { sparkInformation } = useSpark();
  const params = location.state || {};
  const { t } = useTranslation();
  const {
    btcAddress: btcAdress,
    fromPage,
    publishMessageFunc,
    comingFromAccept,
    enteredPaymentInfo,
    errorMessage: globalError,
    contactInfo,
  } = params;
  console.log(params, "oi");
  const [paymentInfo, setPaymentInfo] = useState({});
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { liquidNodeInformation, fiatStats } = useNodeContext();
  const { minMaxLiquidSwapAmounts } = useAppStatus();
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(globalError);
  const [loadingMessage, setLoadingMessage] = useState(
    sparkInformation.didConnect
      ? t("wallet.sendPages.sendPaymentScreen.initialLoadingMessage")
      : t("wallet.sendPages.sendPaymentScreen.connectToSparkMessage")
  );
  const navigate = useNavigate();

  const userBalance = sparkInformation.balance;
  const sendingAmount = paymentInfo?.sendAmount || 0;
  const isBTCdenominated =
    masterInfoObject.userBalanceDenomination === "hidden" ||
    masterInfoObject.userBalanceDenomination === "sats";
  const canEditPaymentAmount = paymentInfo?.canEditPayment;
  const enabledLRC20 = masterInfoObject?.lrc20Settings?.isEnabled;
  const [masterTokenInfo, setMasterTokenInfo] = useState({});
  const selectedLRC20Asset = masterTokenInfo?.tokenName || "Bitcoin";
  const seletctedToken = masterTokenInfo?.details || {};
  const isUsingLRC20 = selectedLRC20Asset !== "Bitcoin";
  const formattedTokensBalance =
    selectedLRC20Asset !== "Bitcoin"
      ? formatTokensNumber(
          seletctedToken?.balance,
          seletctedToken?.tokenMetadata?.decimals
        )
      : sparkInformation.balance;

  const convertedSendAmount = isBTCdenominated
    ? Math.round(Number(sendingAmount))
    : Math.round(
        (SATSPERBITCOIN / (fiatStats?.value || 65000)) * Number(sendingAmount)
      ) || 0;

  const isLightningPayment = paymentInfo?.paymentNetwork === "lightning";
  const isLiquidPayment = paymentInfo?.paymentNetwork === "liquid";
  const isBitcoinPayment = paymentInfo?.paymentNetwork === "Bitcoin";
  const isSparkPayment = paymentInfo?.paymentNetwork === "spark";
  const isLNURLPayment = paymentInfo?.type === InputTypes.LNURL_PAY;
  const minLNURLSatAmount = isLNURLPayment
    ? paymentInfo?.data?.minSendable / 1000
    : 0;
  const maxLNURLSatAmount = isLNURLPayment
    ? paymentInfo?.data?.maxSendable / 1000
    : 0;

  const paymentFee =
    (paymentInfo?.paymentFee || 0) + (paymentInfo?.supportFee || 0);
  const canSendPayment = !isUsingLRC20
    ? Number(sparkInformation.balance) >=
        Number(convertedSendAmount) + paymentFee && sendingAmount != 0
    : sparkInformation.balance >= paymentFee &&
      sendingAmount != 0 &&
      seletctedToken.balance >=
        sendingAmount * 10 ** seletctedToken?.tokenMetadata?.decimals;
  console.log(
    canSendPayment,
    "can send payment",
    userBalance,
    paymentFee,
    paymentInfo
  ); //ecash is built into ln);
  const isUsingSwapWithZeroInvoice =
    paymentInfo?.paymentNetwork === "lightning" &&
    paymentInfo.type === "bolt11" &&
    !paymentInfo?.data?.invoice.amountMsat;

  useEffect(() => {
    async function decodePayment() {
      const didPay = hasAlredyPaidInvoice({
        scannedAddress: btcAdress,
        sparkInformation,
      });

      if (didPay) {
        errorMessageNavigation("You have already paid this invoice");
        return;
      }

      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        // setWebViewArgs,
        // webViewRef,
        navigate,
        maxZeroConf:
          minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept,
        enteredPaymentInfo,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        publishMessageFunc,
        sparkInformation,
        seletctedToken,
        currentWalletMnemoinc,
        t,
      });
    }
    decodePayment();
  }, []);

  useEffect(() => {
    if (!Object.keys(paymentInfo).length) return;
    if (!masterInfoObject[QUICK_PAY_STORAGE_KEY]?.isFastPayEnabled) return;
    if (!canSendPayment) return;
    if (canEditPaymentAmount) return;
    // if (paymentInfo.type === InputTypeVariant.LN_URL_PAY) return;
    if (
      !(
        masterInfoObject[QUICK_PAY_STORAGE_KEY].fastPayThresholdSats >=
        convertedSendAmount
      )
    )
      return;
    // if (paymentInfo.type === 'liquid' && !paymentInfo.data.isBip21) return;

    setTimeout(() => {
      handleSend();
    }, 150);
  }, [paymentInfo, canEditPaymentAmount]);

  const handleSend = async () => {
    if (!canSendPayment) return;
    if (isSendingPayment) return;
    setIsSendingPayment(true);

    try {
      const formmateedSparkPaymentInfo = formatSparkPaymentAddress(
        paymentInfo,
        false
      );

      // manipulate paymetn details here
      console.log(formmateedSparkPaymentInfo, "manual spark information");

      const memo =
        paymentInfo.type === InputTypes.BOLT11
          ? enteredPaymentInfo?.description ||
            paymentDescription ||
            paymentInfo?.data.message ||
            ""
          : paymentDescription || paymentInfo?.data.message || "";
      const paymentObject = {
        getFee: false,
        ...formmateedSparkPaymentInfo,
        amountSats: isUsingLRC20
          ? paymentInfo?.sendAmount *
            10 ** seletctedToken?.tokenMetadata?.decimals
          : paymentInfo?.type === "Bitcoin"
          ? convertedSendAmount + (paymentInfo?.paymentFee || 0)
          : convertedSendAmount,
        masterInfoObject,
        fee: paymentFee,
        memo,
        userBalance: sparkInformation.balance,
        sparkInformation,
        feeQuote: paymentInfo.feeQuote,
        usingZeroAmountInvoice: paymentInfo.usingZeroAmountInvoice,
        seletctedToken: selectedLRC20Asset,
        mnemonic: currentWalletMnemoinc,
        contactInfo,
        fromMainSendScreen: true,
      };
      // Shouuld be same for all paymetns
      const paymentResponse = await sparkPaymenWrapper(paymentObject);

      if (paymentResponse.didWork) {
        if (fromPage?.includes("contacts") && paymentResponse.response?.id) {
          if (fromPage === "contacts-request") {
            handlePaymentUpdate({
              transaction: params.publishMessageFuncParams.transaction,
              didPay: params.publishMessageFuncParams.didPay,
              txid: paymentResponse.response?.id,
              globalContactsInformation:
                params.publishMessageFuncParams.globalContactsInformation,
              selectedContact: params.publishMessageFuncParams.selectedContact,
              currentTime: params.publishMessageFuncParams.currentTime,
              contactsPrivateKey,
              publicKey,
              masterInfoObject,
            });
          } else {
            const sendObject = params.publishMessageFuncParams;
            sendObject.data.txid = paymentResponse.response?.id;
            console.log(sendObject);
            publishMessage(sendObject);
          }
        }
        navigate("/confirm-page", {
          state: {
            for: "paymentsucceed",
            transaction: paymentResponse.response,
          },
          replace: true,
        });
      } else {
        navigate("/confirm-page", {
          state: {
            for: "paymentfailed",
            transaction: {
              paymentStatus: "failed",
              details: { error: paymentResponse.error },
            },
          },
          replace: true,
        });
      }
    } catch (err) {
      console.error("Payment send error", err);
    }
  };

  const handleSave = async () => {
    try {
      if (Number(userBalance) <= paymentInfo.sendAmount) {
        openOverlay({
          for: "error",
          errorMessage: "Sending amount is greater than wallet balance.",
        });
        return;
      }
      if (
        isLiquidPayment &&
        (convertedSendAmount < minMaxLiquidSwapAmounts.min ||
          convertedSendAmount > minMaxLiquidSwapAmounts.max)
      ) {
        openOverlay({
          for: "error",
          errorMessage: `Liquid payment must be greater than ${displayCorrectDenomination(
            {
              amount: minMaxLiquidSwapAmounts.min,
              masterInfoObject,
              fiatStats,
            }
          )}`,
        });
        return;
      }

      if (
        paymentInfo?.type === "Bitcoin" &&
        convertedSendAmount < SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT
      ) {
        openOverlay({
          for: "error",
          errorMessage: `Minimum on-chain send amount is ${displayCorrectDenomination(
            {
              amount: SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT,
              fiatStats,
              masterInfoObject,
            }
          )}`,
        });
        return;
      }
      if (
        paymentInfo?.type === InputTypes.LNURL_PAY &&
        (convertedSendAmount < minLNURLSatAmount ||
          convertedSendAmount > maxLNURLSatAmount)
      ) {
        openOverlay({
          for: "error",
          errorMessage: `${
            convertedSendAmount < minLNURLSatAmount ? "Minimum" : "Maximum"
          } send amount ${displayCorrectDenomination({
            amount:
              convertedSendAmount < minLNURLSatAmount
                ? minLNURLSatAmount
                : maxLNURLSatAmount,
            fiatStats,
            masterInfoObject,
          })}`,
        });
        return;
      }

      if (!canSendPayment && !!paymentInfo?.sendAmount) {
        openOverlay({
          for: "error",
          errorMessage: "Not enough funds to cover fees",
        });
        return;
      }

      if (!canSendPayment) return;
      setIsLoading(true);
      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        // setWebViewArgs,
        // webViewRef,
        navigate,
        maxZeroConf:
          minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept: true,
        enteredPaymentInfo: {
          amount: convertedSendAmount,
          description: paymentDescription,
        },
        paymentInfo,
        setLoadingMessage,
        parsedInvoice: paymentInfo.decodedInput,
        fromPage,
        publishMessageFunc,
        sparkInformation,
        seletctedToken,
        currentWalletMnemoinc,
        t,
      });
    } catch (err) {
      console.error("Error saving payment info", err);
      openOverlay({
        for: "error",
        errorMessage: "Error decoding payment.",
        navigateBack: "wallet",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const clearSettings = () => {
    setPaymentInfo((prev) => ({
      ...prev,
      canEditPayment: true,
      sendAmount: "",
    }));
    setMasterTokenInfo({});
  };

  if (
    (!Object.keys(paymentInfo).length && !errorMessage) ||
    !sparkInformation.didConnect
  )
    return (
      <>
        {!sparkInformation.didConnect && <CustomSettingsNavbar />}
        <FullLoadingScreen text={loadingMessage} />
      </>
    );

  if (errorMessage) {
    return <ErrorWithPayment reason={errorMessage} />;
  }

  if (
    enabledLRC20 &&
    !Object.keys(seletctedToken).length &&
    paymentInfo.type === "spark"
  ) {
    return (
      <SelectLRC20Token
        sparkInformation={sparkInformation}
        seletctedToken={seletctedToken}
        goBackFunction={goBackFunction}
        setSelectedToken={setMasterTokenInfo}
      />
    );
  }

  if (!Object.keys(paymentInfo).length && !errorMessage)
    return (
      <FullLoadingScreen
        loadingColor={Colors.light.blue}
        text={loadingMessage}
      />
    );

  const totalFee =
    (paymentInfo.paymentFee || 0) + (paymentInfo.supportFee || 0);

  return (
    <div className="sendContainer">
      <NavBarWithBalance />
      <div className="paymentInfoContainer">
        <div className="balanceContainer">
          <div className="scroll-content">
            <FormattedSatText
              containerStyles={{
                opacity: !convertedSendAmount ? 0.5 : 1,
              }}
              styles={{
                fontSize: "2.75rem",
                margin: 0,
              }}
              neverHideBalance={true}
              balance={convertedSendAmount || 0}
              customLabel={
                isUsingLRC20 ? seletctedToken?.tokenMetadata?.tokenTicker : ""
              }
              useCustomLabel={isUsingLRC20}
            />
          </div>
          {!isUsingLRC20 && (
            <FormattedSatText
              containerStyles={{
                opacity: !convertedSendAmount ? 0.5 : 1,
              }}
              styles={{ fontSize: "1.2rem", margin: 0 }}
              globalBalanceDenomination={
                masterInfoObject.userBalanceDenomination === "sats"
                  ? "fiat"
                  : "sats"
              }
              neverHideBalance={true}
              balance={convertedSendAmount}
            />
          )}
        </div>

        {!canEditPaymentAmount && (
          <>
            <ThemeText
              textStyles={{ margin: 0, marginTop: 40 }}
              className="paymentFeeDesc"
              textContent={"Fee & speed"}
            />
            <FormattedSatText
              styles={{ marginTop: 0 }}
              balance={totalFee}
              backText={"and Instant"}
            />
          </>
        )}

        {canEditPaymentAmount && (
          <>
            <CustomInput
              onchange={setPaymentDescription}
              placeholder={"Description..."}
              value={paymentDescription}
              containerClassName="customTextInputContinaerStyles"
            />
            <NumberInputSendPage
              setPaymentInfo={setPaymentInfo}
              paymentInfo={paymentInfo}
              fiatStats={fiatStats}
            />
          </>
        )}

        {canEditPaymentAmount ? (
          <AcceptButtonSendPage
            canSendPayment={canSendPayment}
            errorMessageNavigation={errorMessageNavigation}
            decodeSendAddress={decodeSendAddress}
            openOverlay={openOverlay}
            btcAdress={btcAdress}
            paymentInfo={paymentInfo}
            convertedSendAmount={convertedSendAmount}
            paymentDescription={paymentDescription}
            setPaymentInfo={setPaymentInfo}
            setLoadingMessage={setLoadingMessage}
            minLNURLSatAmount={minLNURLSatAmount}
            maxLNURLSatAmount={maxLNURLSatAmount}
            sparkInformation={sparkInformation}
            isLRC20Payment={isUsingLRC20}
            seletctedToken={seletctedToken}
            navigate={navigate}
          />
        ) : (
          <CustomButton
            buttonStyles={{
              opacity: isSendingPayment
                ? 1
                : canSendPayment &&
                  !(
                    isLiquidPayment &&
                    (convertedSendAmount < minMaxLiquidSwapAmounts.min ||
                      convertedSendAmount > minMaxLiquidSwapAmounts.max)
                  ) &&
                  !(
                    paymentInfo?.type === "lnUrlPay" &&
                    (convertedSendAmount < minLNURLSatAmount ||
                      convertedSendAmount > maxLNURLSatAmount)
                  ) &&
                  !(
                    paymentInfo?.type === "Bitcoin" &&
                    convertedSendAmount < SMALLEST_ONCHAIN_SPARK_SEND_AMOUNT
                  )
                ? 1
                : 0.5,
              margin: "auto auto 0",
            }}
            actionFunction={() => {
              canEditPaymentAmount ? handleSave() : handleSend();
            }}
            textContent={
              paymentInfo.canEditPayment
                ? isLoading
                  ? "Loading..."
                  : "Save"
                : isSendingPayment
                ? "Sending..."
                : "Send Payment"
            }
            useLoading={isSendingPayment || isLoading}
          />
        )}
      </div>
    </div>
  );
  function goBackFunction() {
    navigate(-1);
  }
  function errorMessageNavigation(reason) {
    setErrorMessage(reason);
    setPaymentInfo({});
  }
}
