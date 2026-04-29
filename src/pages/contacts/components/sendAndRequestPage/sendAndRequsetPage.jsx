import { useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publishMessage } from "../../../../functions/messaging/publishMessage";

import { useTranslation } from "react-i18next";
import { Colors, HIDDEN_OPACITY } from "../../../../constants/theme";
import { SATSPERBITCOIN, USDB_TOKEN_ID } from "../../../../constants";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import CustomNumberKeyboard from "../../../../components/customNumberKeyboard/customNumberKeyboard";
import CustomButton from "../../../../components/customButton/customButton";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import customUUID from "../../../../functions/customUUID";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { useAppStatus } from "../../../../contexts/appStatus";
import { useKeysContext } from "../../../../contexts/keysContext";
import convertTextInputValue from "../../../../functions/textInputConvertValue";
import { useServerTimeOnly } from "../../../../contexts/serverTime";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Edit, Gift } from "lucide-react";
import fetchBackend from "../../../../../db/handleBackend";
import { getDataFromCollection } from "../../../../../db";
import loadNewFiatData from "../../../../functions/saveAndUpdateFiatData";
import giftCardPurchaseAmountTracker from "../../../../functions/apps/giftCardPurchaseTracker";
import { useSpark } from "../../../../contexts/sparkContext";
import getReceiveAddressAndContactForContactsPayment from "../../utils/getReceiveAddressAndKindForPayment";
import { useActiveCustodyAccount } from "../../../../contexts/activeAccount";
import { sparkPaymenWrapper } from "../../../../functions/spark/payments";
import EmojiQuickBar from "../../../../components/emojiBar/emojiQuickBar";

import "./sendAndRequestPage.css";
import CustomInput from "../../../../components/customInput/customInput";
import ThemeText from "../../../../components/themeText/themeText";
import FormattedBalanceInput from "../../../../components/formattedBalanceInput/formattedBalanceInput";
import { useOverlay } from "../../../../contexts/overlayContext";
import { useUserBalanceContext } from "../../../../contexts/userBalanceContext";
import { useFlashnet } from "../../../../contexts/flashnetContext";
import { useToast } from "../../../../contexts/toastManager";
import usePaymentInputDisplay from "../../../../hooks/usePaymentInputDisplay";
import { InputTypes, parseInput } from "bitcoin-address-parser";
import { getLNAddressForLiquidPayment } from "../../../../functions/sendBitcoin/payments";
import {
  dollarsToSats,
  getLightningPaymentQuote,
  satsToDollars,
  USD_ASSET_ADDRESS,
} from "../../../../functions/spark/flashnet";
import displayCorrectDenomination from "../../../../functions/displayCorrectDenomination";
import usePaymentValidation from "../../../../functions/sendBitcoin/paymentValidation";
import PageNavBar from "../../../../components/navBar/navBar";
import useDebounce from "../../../../hooks/useDebounce";
import ChoosePaymentMethod from "../../../sendPage/components/ChoosePaymentMethodContainer";
import ContactProfileImage from "../profileImage/profileImage";

export default function SendAndRequestPage(props) {
  const location = useLocation();
  const {
    selectedRequestMethod = "BTC",
    selectedPaymentMethod = "BTC",
    endReceiveType = "BTC",
    selectedContact,
    paymentType, // 'send' or 'request'
    imageData,
    cardInfo: giftOption,
  } = location.state || {};
  const { openOverlay } = useOverlay();

  const navigate = useNavigate();
  const { dollarBalanceSat, dollarBalanceToken, bitcoinBalance } =
    useUserBalanceContext();
  const { poolInfoRef, swapLimits, swapUSDPriceDollars } = useFlashnet();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { isConnectedToTheInternet } = useAppStatus();
  const { fiatStats } = useNodeContext();
  const { globalContactsInformation } = useGlobalContacts();
  const getServerTime = useServerTimeOnly();
  const [amountValue, setAmountValue] = useState("");
  const [isAmountFocused, setIsAmountFocused] = useState(true);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, textColor, backgroundColor } = useThemeColors();
  const { t } = useTranslation();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { showToast } = useToast();
  const [lnFeeEstimate, setLnFeeEstimate] = useState(null);
  const [swapQuote, setSwapQuote] = useState({});
  const [lnInvoiceData, setLnInvoiceData] = useState(null);
  const lnurlParsedRef = useRef(null);
  const quoteId = useRef(null);
  const poolInfoRefSnapshotRef = useRef(poolInfoRef);
  const prefSelectedPaymentInfo = useRef({
    selectedPaymentMethod,
    selectedRequestMethod,
  });

  const descriptionRef = useRef(null);

  useEffect(() => {
    if (typeof giftOption?.memo !== "string") return;
    setDescriptionValue(giftOption.memo);
  }, [giftOption?.memo]);

  const paymentMode =
    paymentType === "send" || paymentType === "Gift"
      ? selectedPaymentMethod
      : selectedRequestMethod;

  // Determine if we're in USD mode
  const isUSDMode =
    paymentType === "send" || paymentType === "Gift"
      ? selectedPaymentMethod === "USD"
      : selectedRequestMethod === "USD";

  const [userSetInputDenomination, setUserSetInputDenomination] =
    useState(null);

  const inputDenomination = userSetInputDenomination
    ? userSetInputDenomination
    : paymentMode === "USD"
      ? "fiat"
      : masterInfoObject.userBalanceDenomination !== "fiat"
        ? "sats"
        : "fiat";

  const isBTCdenominated =
    inputDenomination == "hidden" || inputDenomination == "sats";

  const selectedContactDisplayName =
    selectedContact?.name ||
    (selectedContact?.isLNURL
      ? selectedContact?.receiveAddress?.split("@")[0]
      : selectedContact?.uniqueName) ||
    "";

  const selectedContactSecondaryLine = selectedContact?.uniqueName
    ? `@${selectedContact.uniqueName}`
    : selectedContact?.isLNURL && selectedContact?.receiveAddress?.includes("@")
      ? `@${selectedContact.receiveAddress.split("@")[1]}`
      : "";

  const {
    primaryDisplay,
    secondaryDisplay,
    conversionFiatStats,
    convertDisplayToSats,
    convertSatsToDisplay,
    getNextDenomination,
    convertForToggle,
  } = usePaymentInputDisplay({
    paymentMode,
    inputDenomination,
    fiatStats,
    usdFiatStats: { coin: "USD", value: swapUSDPriceDollars },
    masterInfoObject,
  });

  const displayAmount =
    paymentType !== "Gift" ? amountValue : convertSatsToDisplay(amountValue);

  // Calculate sat amount
  const convertedSendAmount =
    paymentType === "Gift"
      ? Number(amountValue)
      : convertDisplayToSats(amountValue);

  const min_usd_swap_amount = useMemo(() => {
    return Math.round(
      dollarsToSats(
        swapLimits.usd,
        poolInfoRefSnapshotRef.current.currentPriceAInB,
      ),
    );
  }, [poolInfoRefSnapshotRef.current.currentPriceAInB, swapLimits]);

  const estimateLNURLFee = useCallback(
    async (amount, id) => {
      if (quoteId.current !== id) return;
      if (!selectedContact?.isLNURL || paymentType !== "send" || !amount) {
        setIsLoading(false);
        return;
      }

      const balance =
        selectedPaymentMethod === "USD" ? dollarBalanceSat : bitcoinBalance;
      const bufferAmount = amount * 1.1;

      // Skip if balance easily covers the send + estimated fee buffer, or if
      // already over balance (validation will catch it without needing a fee)
      if (bufferAmount < balance || amount > balance) {
        setIsLoading(false);
        return;
      }

      try {
        if (!lnurlParsedRef.current) {
          lnurlParsedRef.current = await parseInput(
            selectedContact.receiveAddress,
          );
        }
        const lnurlInput = lnurlParsedRef.current;

        const invoiceResponse = await getLNAddressForLiquidPayment(
          lnurlInput,
          amount,
          "",
        );
        if (quoteId.current !== id) return;
        if (!invoiceResponse.pr) throw new Error("No invoice received");
        setLnInvoiceData(invoiceResponse);

        if (selectedPaymentMethod === "USD") {
          const quote = await getLightningPaymentQuote(
            currentWalletMnemoinc,
            invoiceResponse.pr,
            USD_ASSET_ADDRESS,
          );
          if (!quote.didWork)
            throw new Error(quote.error || "Fee quote failed");

          if (quoteId.current !== id) return;
          const estimatedAmmFeeSat = Math.round(
            dollarsToSats(
              quote.quote.estimatedAmmFee / Math.pow(10, 6),
              poolInfoRef.currentPriceAInB,
            ),
          );
          const fee = quote.quote.fee + estimatedAmmFeeSat;
          if (fee + amount > dollarBalanceSat) {
            showToast({
              type: "error",
              title: t("errormessages.lightningAmountFeeWarning", {
                amount: displayCorrectDenomination({
                  amount: fee,
                  masterInfoObject: {
                    ...masterInfoObject,
                    userBalanceDenomination: "sats",
                  },
                  fiatStats,
                }),
              }),
              duration: 6000,
            });
          }

          setSwapQuote(quote.quote);
          setLnFeeEstimate(fee);
        } else {
          const feeResult = await sparkPaymenWrapper({
            getFee: true,
            paymentType: "lightning",
            address: invoiceResponse.pr,
            amountSats: amount,
            masterInfoObject,
            sparkInformation,
            mnemonic: currentWalletMnemoinc,
          });
          if (!feeResult.didWork) throw new Error("Fee estimation failed");
          const fee = feeResult.fee;
          if (quoteId.current !== id) return;
          if (fee + amount > bitcoinBalance) {
            showToast({
              type: "error",
              title: t("errormessages.lightningAmountFeeWarning", {
                amount: displayCorrectDenomination({
                  amount: fee,
                  masterInfoObject: {
                    ...masterInfoObject,
                    userBalanceDenomination: "sats",
                  },
                  fiatStats,
                }),
              }),
              duration: 6000,
            });
          }
          setLnFeeEstimate(fee);
        }
      } catch {
        showToast({
          type: "error",
          title: t("wallet.sendPages.sendPaymentScreen.feeEstimateError"),
        });
      } finally {
        if (quoteId.current === id) {
          setIsLoading(false);
        }
      }
    },
    [
      selectedContact?.isLNURL,
      selectedContact?.receiveAddress,
      paymentType,
      selectedPaymentMethod,
      currentWalletMnemoinc,
      masterInfoObject,
      sparkInformation,
      showToast,
      t,
      dollarBalanceSat,
      bitcoinBalance,
    ],
  );

  const debouncedEstimateLNURLFee = useDebounce(estimateLNURLFee, 600);

  const paymentValidation = usePaymentValidation({
    paymentInfo: {
      sendAmount: convertedSendAmount,
      paymentNetwork:
        giftOption || selectedContact?.isLNURL ? "lightning" : "spark",
      isLNURLPayment: selectedContact?.isLNURL,
      data: {
        expectedReceive: endReceiveType === "BTC" ? "sats" : "tokens",
        expectedToken: endReceiveType === "BTC" ? null : USDB_TOKEN_ID,
      },
      decodedInput: {
        tpye:
          giftOption || selectedContact?.isLNURL ? InputTypes.BOLT11 : "spark",
        data: { amountMsat: convertedSendAmount * 1000 },
      },
      swapPaymentQuote: Object.keys(swapQuote).length
        ? swapQuote
        : {
            amountIn:
              selectedPaymentMethod === "BTC"
                ? convertedSendAmount
                : inputDenomination === "fiat"
                  ? amountValue * Math.pow(10, 6)
                  : satsToDollars(
                      convertedSendAmount,
                      poolInfoRef.currentPriceAInB,
                    )?.toFixed(2) * Math.pow(10, 6),
          },
    },
    convertedSendAmount,
    paymentFee: lnFeeEstimate ?? 0,
    determinePaymentMethod: selectedPaymentMethod,
    selectedPaymentMethod,

    bitcoinBalance: bitcoinBalance,
    dollarBalanceSat: dollarBalanceSat,
    dollarBalanceToken: dollarBalanceToken,

    min_usd_swap_amount: min_usd_swap_amount,
    swapLimits: swapLimits,

    isUsingLRC20: false,

    canEditAmount: true,

    t,

    masterInfoObject,
    fiatStats,
    inputDenomination: primaryDisplay.denomination,
    primaryDisplay,
    conversionFiatStats,

    sparkInformation,
    poolInfoRef,
  });

  const updatePageState = useCallback(
    (nextState) => {
      navigate("/sendAndRequestPage", {
        replace: true,
        state: {
          ...(location.state || {}),
          ...nextState,
        },
      });
    },
    [location.state, navigate],
  );

  const handleSelectPaymentMethod = useCallback(() => {
    if (paymentType === "send" || paymentType === "Gift") {
      openOverlay({
        for: "halfModal",
        contentType: "SelectPaymentMethod",
        params: {
          selectedPaymentMethod,
          onSelect: (term) => {
            updatePageState({ selectedPaymentMethod: term });
          },
        },
      });
    } else {
      openOverlay({
        for: "halfModal",
        contentType: "SelectContactRequestCurrency",
        params: {
          selectedRequestMethod,
          onSelect: (term) => {
            updatePageState({ selectedRequestMethod: term });
          },
        },
      });
    }
  }, [
    openOverlay,
    paymentType,
    selectedPaymentMethod,
    selectedRequestMethod,
    updatePageState,
  ]);

  useEffect(() => {
    if (
      prefSelectedPaymentInfo.current.selectedPaymentMethod !==
        selectedPaymentMethod ||
      prefSelectedPaymentInfo.current.selectedRequestMethod !==
        selectedRequestMethod
    ) {
      setAmountValue("");
      setUserSetInputDenomination(null);
      prefSelectedPaymentInfo.current = {
        selectedPaymentMethod,
        selectedRequestMethod,
      };
    }
  }, [selectedPaymentMethod, selectedRequestMethod]);

  useEffect(() => {
    if (!giftOption) {
      setAmountValue("");
      return;
    }
    const totalSats = Math.round(
      giftOption.selectedDenomination * giftOption.satsPerDollar,
    );
    const localfiatSatsPerDollar =
      (primaryDisplay.forceFiatStats?.value || fiatStats.value) /
      SATSPERBITCOIN;
    setAmountValue(
      String(
        primaryDisplay.denomination !== "fiat"
          ? totalSats
          : Math.round(localfiatSatsPerDollar * totalSats),
      ),
    );
  }, [giftOption]);

  useEffect(() => {
    lnurlParsedRef.current = null;
    setLnFeeEstimate(null);
  }, [selectedContact?.uuid]);

  useEffect(() => {
    if (!selectedContact?.isLNURL || paymentType !== "send") return;
    setLnFeeEstimate(null);
    setSwapQuote({});
    if (convertedSendAmount > 0) {
      const id = customUUID();
      quoteId.current = id;
      setIsLoading(true);
      debouncedEstimateLNURLFee(convertedSendAmount, id);
    }
  }, [convertedSendAmount, selectedContact?.isLNURL, paymentType]);

  const canProceed =
    paymentType === "request" ? !!amountValue : paymentValidation.canProceed;

  const handleDenominationToggle = () => {
    if (!isAmountFocused) return;
    if (paymentType === "Gift") {
      const nextDenom = getNextDenomination();
      setUserSetInputDenomination(nextDenom);
    } else {
      const nextDenom = getNextDenomination();
      setUserSetInputDenomination(nextDenom);
      setAmountValue(convertForToggle(amountValue, convertTextInputValue));
    }
  };

  const handleSubmit = useCallback(async () => {
    try {
      if (!canProceed) {
        const error = paymentValidation.getErrorMessage(
          paymentValidation.primaryError,
        );
        openOverlay({
          for: "error",
          errorMessage: error,
        });
        return;
      }
      if (!isConnectedToTheInternet) {
        openOverlay({
          for: "error",
          errorMessage: t("errormessages.nointernet"),
        });
        return;
      }
      setIsLoading(true);

      const sendingAmountMsat = convertedSendAmount * 1000;
      const contactMessage = descriptionValue;
      const isLNURL = selectedContact.isLNURL;
      const contactName = isLNURL
        ? selectedContact.name || selectedContact.receiveAddress.split("@")[0]
        : selectedContact.name || selectedContact.uniqueName;

      const myProfileMessage = descriptionValue
        ? descriptionValue
        : t("contacts.sendAndRequestPage.profileMessage", {
            name: contactName,
          });
      const payingContactMessage = descriptionValue
        ? descriptionValue
        : {
            usingTranslation: true,
            type: "paid",
            name:
              globalContactsInformation.myProfile.name ||
              globalContactsInformation.myProfile.uniqueName,
          };

      const currentTime = getServerTime();
      const UUID = customUUID();
      let sendObject = {};

      if (globalContactsInformation.myProfile.uniqueName) {
        sendObject["senderProfileSnapshot"] = {
          uniqueName: globalContactsInformation.myProfile.uniqueName,
        };
      }

      if (giftOption) {
        const retrivedContact = await getDataFromCollection(
          "blitzWalletUsers",
          selectedContact.uuid,
        );
        if (!retrivedContact) {
          openOverlay({
            for: "error",
            errorMessage: t("errormessages.fullDeeplinkError"),
          });
          return;
        }
        if (!retrivedContact.enabledGiftCards) {
          openOverlay({
            for: "error",
            errorMessage: t(
              "contacts.sendAndRequestPage.giftCardappVersionError",
            ),
          });
          return;
        }

        const postData = {
          type: "buyGiftCard",
          productId: giftOption.id, //string
          cardValue: giftOption.selectedDenomination, //number
          quantity: Number(1), //number
        };

        const response = await fetchBackend(
          "theBitcoinCompanyV3",
          postData,
          contactsPrivateKey,
          publicKey,
        );

        if (response.result) {
          const { amount, invoice, orderId, uuid } = response.result;
          const fiatRates = await (fiatStats.coin?.toLowerCase() === "usd"
            ? Promise.resolve({ didWork: true, fiatRateResponse: fiatStats })
            : loadNewFiatData(
                "usd",
                contactsPrivateKey,
                publicKey,
                masterInfoObject,
              ));
          const USDBTCValue = fiatRates.didWork
            ? fiatRates.fiatRateResponse
            : { coin: "USD", value: 100_000 };

          const sendingAmountSat = amount;
          const isOverDailyLimit = await giftCardPurchaseAmountTracker({
            sendingAmountSat: sendingAmountSat,
            USDBTCValue: USDBTCValue,
            testOnly: true,
          });

          if (isOverDailyLimit.shouldBlock) {
            openOverlay({
              for: "error",
              errorMessage: isOverDailyLimit.reason,
            });
            return;
          }

          sendObject["amountMsat"] = amount;
          sendObject["description"] = descriptionValue || "";
          sendObject["uuid"] = UUID;
          sendObject["isRequest"] = false;
          sendObject["isRedeemed"] = null;
          sendObject["wasSeen"] = null;
          sendObject["didSend"] = null;
          sendObject["giftCardInfo"] = {
            amount,
            invoice,
            orderId,
            uuid,
            logo: giftOption.logo,
            name: giftOption.name,
          };

          navigate("/send", {
            state: {
              btcAddress: invoice,
              comingFromAccept: true,
              enteredPaymentInfo: {
                amount: amount,
                description:
                  descriptionValue ||
                  t("contacts.sendAndRequestPage.giftCardDescription", {
                    name: selectedContact.name || selectedContact.uniqueName,
                    giftCardName: giftOption.name,
                  }),
              },
              contactInfo: {
                imageData,
                name: selectedContact.name || selectedContact.uniqueName,
                uniqueName: selectedContact.uniqueName,
                uuid: selectedContact.uuid,
              },
              preSelectedPaymentMethod: selectedPaymentMethod,
              selectedPaymentMethod: selectedPaymentMethod,
              fromPage: "contacts",
              publishMessageFunc: () => {
                giftCardPurchaseAmountTracker({
                  sendingAmountSat: sendingAmountSat,
                  USDBTCValue: USDBTCValue,
                });
                publishMessage({
                  toPubKey: selectedContact.uuid,
                  fromPubKey: globalContactsInformation.myProfile.uuid,
                  data: sendObject,
                  globalContactsInformation,
                  selectedContact,
                  isLNURLPayment: false,
                  privateKey: contactsPrivateKey,
                  retrivedContact,
                  currentTime,
                  masterInfoObject,
                });
              },
            },
          });
        } else {
          openOverlay({
            for: "error",
            errorMessage: t("contacts.sendAndRequestPage.cardDetailsError"),
          });
        }
        return;
      }

      const {
        receiveAddress,
        retrivedContact,
        didWork,
        error,
        formattedPayingContactMessage,
      } = await getReceiveAddressAndContactForContactsPayment({
        sendingAmountSat: convertedSendAmount,
        selectedContact,
        myProfileMessage,
        payingContactMessage,
        onlyGetContact: paymentType !== "send",
      });

      if (!didWork) {
        openOverlay({
          for: "error",
          errorMessage: t(error),
        });
        return;
      }

      sendObject["amountMsat"] = sendingAmountMsat;
      sendObject["uuid"] = UUID;
      sendObject["wasSeen"] = null;
      sendObject["didSend"] = null;
      sendObject["isRedeemed"] = null;

      if (paymentType === "send") {
        sendObject["description"] = contactMessage;
        sendObject["isRequest"] = false;
        sendObject["paymentDenomination"] = endReceiveType;
        sendObject["amountDollars"] =
          endReceiveType === "USD"
            ? satsToDollars(
                convertedSendAmount,
                poolInfoRefSnapshotRef.current.currentPriceAInB,
              ).toFixed(2)
            : null;
        navigate("/send", {
          state: {
            btcAddress: receiveAddress,
            comingFromAccept: true,
            enteredPaymentInfo: {
              fromContacts: true,
              amount: convertedSendAmount,
              description: myProfileMessage,
              endReceiveType: endReceiveType,
              lnFeeEstimate: selectedContact?.isLNURL ? lnFeeEstimate : null,
              swapQuote: Object.keys(swapQuote).length ? swapQuote : null,
              lnInvoiceData: selectedContact?.isLNURL ? lnInvoiceData : null,
            },
            contactInfo: {
              imageData,
              name: contactName,
              isLNURLPayment: selectedContact?.isLNURL,
              payingContactMessage: formattedPayingContactMessage, //handles remote tx description
              uniqueName: retrivedContact?.contacts?.myProfile?.uniqueName,
              uuid: selectedContact.uuid,
            },
            preSelectedPaymentMethod: selectedPaymentMethod,
            selectedPaymentMethod: selectedPaymentMethod,
            fromPage: "contacts",
            publishMessageFuncParms: {
              toPubKey: selectedContact.uuid,
              fromPubKey: globalContactsInformation.myProfile.uuid,
              data: {
                ...sendObject,
                name:
                  globalContactsInformation.myProfile.name ||
                  globalContactsInformation.myProfile.uniqueName,
              },
              globalContactsInformation,
              selectedContact,
              isLNURLPayment: selectedContact?.isLNURL,
              privateKey: contactsPrivateKey,
              retrivedContact,
              currentTime,
              masterInfoObject,
            },
          },
        });
      } else {
        sendObject["amountDollars"] =
          selectedRequestMethod === "USD"
            ? satsToDollars(
                convertedSendAmount,
                poolInfoRefSnapshotRef.current.currentPriceAInB,
              ).toFixed(2)
            : null;
        sendObject["description"] = descriptionValue;
        sendObject["isRequest"] = true;
        sendObject["paymentDenomination"] = selectedRequestMethod;

        await publishMessage({
          toPubKey: selectedContact.uuid,
          fromPubKey: globalContactsInformation.myProfile.uuid,
          data: sendObject,
          globalContactsInformation,
          selectedContact,
          isLNURLPayment: selectedContact?.isLNURL,
          privateKey: contactsPrivateKey,
          retrivedContact,
          currentTime,
          masterInfoObject,
        });

        navigate(-1);
      }
    } catch (err) {
      console.log(err, "publishing message error");
      openOverlay({
        for: "error",
        errorMessage: selectedContact.isLNURL
          ? t("errormessages.contactInvoiceGenerationError")
          : t("errormessages.invoiceRetrivalError"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    isConnectedToTheInternet,
    convertedSendAmount,
    canProceed,
    selectedContact,
    navigate,
    contactsPrivateKey,
    descriptionValue,
    paymentType,
    globalContactsInformation,
    getServerTime,
    giftOption,
    masterInfoObject,
    fiatStats,
    imageData,
    paymentValidation,
    selectedPaymentMethod,
    primaryDisplay,
    isUSDMode,
    inputDenomination,
  ]);

  const handleEmoji = (newDescription) => {
    setDescriptionValue(newDescription);
  };

  return (
    <div className="send-request-page">
      <div className="replacement-container">
        <PageNavBar
          text={
            paymentType === "Gift"
              ? t("constants.gift")
              : paymentType === "send"
                ? t("constants.send")
                : t("constants.request")
          }
        />
        {paymentType === "request" && (
          <ThemeText
            textStyles={{
              margin: 0,
              opacity: HIDDEN_OPACITY,
              marginBottom: 15,
            }}
            textContent={
              selectedRequestMethod === "BTC"
                ? t("constants.bitcoin_upper")
                : t("constants.dollars_upper")
            }
          />
        )}

        {selectedContact && (
          <div className="contact-identity-card">
            <div
              className="contact-identity-avatar"
              style={{ backgroundColor: backgroundOffset }}
            >
              <ContactProfileImage
                updated={imageData?.updated}
                uri={imageData?.localUri}
                darkModeType={darkModeType}
                theme={theme}
              />
            </div>
            <div className="contact-identity-text">
              <ThemeText
                textStyles={{ margin: 0, textAlign: "center" }}
                textContent={selectedContactDisplayName}
              />
              {!!selectedContactSecondaryLine && (
                <ThemeText
                  textStyles={{
                    margin: 0,
                    marginTop: 4,
                    opacity: HIDDEN_OPACITY,
                    textAlign: "center",
                  }}
                  textContent={selectedContactSecondaryLine}
                />
              )}
            </div>
          </div>
        )}

        <div
          className="scroll-view-container"
          style={{
            opacity:
              isAmountFocused || paymentType === "Gift" ? 1 : HIDDEN_OPACITY,
          }}
        >
          <div
            style={{ cursor: "pointer", width: "100%" }}
            onClick={handleDenominationToggle}
          >
            <FormattedBalanceInput
              maxWidth={0.9}
              amountValue={displayAmount || 0}
              inputDenomination={primaryDisplay.denomination}
              forceCurrency={primaryDisplay.forceCurrency}
              forceFiatStats={primaryDisplay.forceFiatStats}
            />

            <FormattedSatText
              containerStyles={{
                marginBottom: 16,
                opacity: !amountValue ? HIDDEN_OPACITY : 1,
              }}
              styles={{ marginTop: 0 }}
              neverHideBalance={true}
              globalBalanceDenomination={secondaryDisplay.denomination}
              forceCurrency={secondaryDisplay.forceCurrency}
              forceFiatStats={secondaryDisplay.forceFiatStats}
              balance={convertedSendAmount}
            />
          </div>

          {giftOption && (
            <div className="gift-amount-container">
              <button
                onClick={() =>
                  navigate("/modal", {
                    state: {
                      wantedContent: "giftCardSendAndReceiveOption",
                    },
                  })
                }
                className="pill"
                style={{
                  borderColor: backgroundOffset,
                  backgroundColor: theme ? backgroundOffset : backgroundOffset,
                }}
              >
                <div className="logo-container">
                  <img
                    className="card-logo"
                    src={giftOption.logo}
                    alt={giftOption.name}
                  />
                </div>
                <ThemeText
                  CustomNumberOfLines={1}
                  textStyles={{ flexShrink: 1 }}
                  textContent={t("contacts.sendAndRequestPage.giftCardText", {
                    giftName: giftOption.name,
                  })}
                />
                <div
                  className="edit-button"
                  style={{
                    backgroundColor: backgroundOffset,
                    borderColor: backgroundColor,
                  }}
                >
                  <Edit
                    color={
                      theme && darkModeType
                        ? Colors.dark.text
                        : Colors.constants.blue
                    }
                  />
                </div>
              </button>
              <div className="memo-section">
                <ThemeText
                  textStyles={{ marginBottom: 10, opacity: 0.8 }}
                  textContent={t("contacts.sendAndRequestPage.giftMessage")}
                />
                <div className="gift-memo-input">
                  <CustomInput
                    onFocusFunction={() => {
                      setIsAmountFocused(false);
                    }}
                    onBlurFunction={() => {
                      setIsAmountFocused(true);
                    }}
                    placeholder={t(
                      "contacts.sendAndRequestPage.giftMessagePlaceholder",
                    )}
                    customInputStyles={{
                      borderRadius: 16,
                      minHeight: 100,
                      height: "unset",
                    }}
                    containerStyles={{ width: "100%" }}
                    onchange={setDescriptionValue}
                    inputText={descriptionValue}
                    textInputMultiline={true}
                    textAlignVertical={"top"}
                    maxLength={500}
                  />
                </div>
              </div>

              {paymentType === "Gift" && (
                <div className="gift-payment-source">
                  <ThemeText
                    textStyles={{ marginBottom: 10, opacity: 0.8 }}
                    textContent={t(
                      "contacts.sendAndRequestPage.paymentSourceHeader",
                    )}
                  />
                  <ChoosePaymentMethod
                    theme={theme}
                    darkModeType={darkModeType}
                    determinePaymentMethod={selectedPaymentMethod}
                    handleSelectPaymentMethod={handleSelectPaymentMethod}
                    bitcoinBalance={sparkInformation.balance}
                    dollarBalanceToken={dollarBalanceToken}
                    masterInfoObject={masterInfoObject}
                    fiatStats={fiatStats}
                    uiState={"SELECT_INLINE"}
                    t={t}
                    selectedMethod={selectedPaymentMethod}
                    containerStyles={{ width: "100%", marginTop: 0 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {paymentType !== "Gift" && (
          <div className="input-and-gift-container">
            {paymentType === "send" && (
              <ChoosePaymentMethod
                theme={theme}
                darkModeType={darkModeType}
                determinePaymentMethod={
                  paymentType === "send" || paymentType === "Gift"
                    ? selectedPaymentMethod
                    : selectedRequestMethod
                }
                handleSelectPaymentMethod={handleSelectPaymentMethod}
                bitcoinBalance={sparkInformation.balance}
                dollarBalanceToken={dollarBalanceToken}
                masterInfoObject={masterInfoObject}
                fiatStats={fiatStats}
                uiState={
                  paymentType === "send" || paymentType === "Gift"
                    ? "SELECT_INLINE"
                    : "CONTACT_REQUEST"
                }
                t={t}
                selectedMethod={
                  paymentType === "send" || paymentType === "Gift"
                    ? selectedPaymentMethod
                    : selectedRequestMethod
                }
                containerStyles={{ width: "100%", marginBottom: 8 }}
              />
            )}

            <CustomInput
              onFocusFunction={() => {
                setIsAmountFocused(false);
              }}
              onBlurFunction={() => {
                setIsAmountFocused(true);
              }}
              textInputRef={descriptionRef}
              placeholder={t("constants.paymentDescriptionPlaceholder")}
              customInputStyles={{
                borderRadius: 8,
                height: "unset",
              }}
              editable={paymentType === "send" ? true : !!convertedSendAmount}
              containerStyles={{ maxWidth: 350, marginTop: 8 }}
              onchange={setDescriptionValue}
              inputText={descriptionValue}
              textInputMultiline={true}
              textAlignVertical={"center"}
              maxLength={149}
            />
          </div>
        )}

        {isAmountFocused && (
          <>
            {paymentType !== "Gift" && (
              <CustomNumberKeyboard
                showDot={primaryDisplay.denomination === "fiat"}
                frompage="sendContactsPage"
                setAmountValue={setAmountValue}
                usingForBalance={true}
                fiatStats={fiatStats}
                containerClassName="sendRequetContainer"
              />
            )}
            <CustomButton
              buttonStyles={{
                width: "auto",
                opacity: canProceed ? 1 : HIDDEN_OPACITY,
              }}
              useLoading={isLoading}
              actionFunction={handleSubmit}
              textContent={
                paymentType === "send" || paymentType === "Gift"
                  ? t("constants.review")
                  : t("constants.request")
              }
            />
          </>
        )}
      </div>
      {!isAmountFocused && (
        <EmojiQuickBar
          description={descriptionValue}
          onEmojiSelect={handleEmoji}
        />
      )}
    </div>
  );
}
