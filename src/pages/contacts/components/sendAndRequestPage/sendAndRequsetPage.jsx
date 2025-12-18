import { useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publishMessage } from "../../../../functions/messaging/publishMessage";

import { useTranslation } from "react-i18next";
import { Colors, HIDDEN_OPACITY } from "../../../../constants/theme";
import {
  CONTENT_KEYBOARD_OFFSET,
  QUICK_PAY_STORAGE_KEY,
  SATSPERBITCOIN,
} from "../../../../constants";
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
import NavBarWithBalance from "../../../../components/navBarWithBalance/navbarWithBalance";
import { sparkPaymenWrapper } from "../../../../functions/spark/payments";
import { getBolt11InvoiceForContact } from "../../../../functions/contacts";
import EmojiQuickBar from "../../../../components/emojiBar/emojiQuickBar";

import "./sendAndRequestPage.css";
import CustomInput from "../../../../components/customInput/customInput";
import ThemeText from "../../../../components/themeText/themeText";
import FormattedBalanceInput from "../../../../components/formattedBalanceInput/formattedBalanceInput";
import { useOverlay } from "../../../../contexts/overlayContext";

const MAX_SEND_OPTIONS = [
  { label: "25%", value: "25" },
  { label: "50%", value: "50" },
  { label: "75%", value: "75" },
  { label: "100%", value: "100" },
];

export default function SendAndRequestPage(props) {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [inputDenomination, setInputDenomination] = useState(
    masterInfoObject.userBalanceDenomination
  );
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, textColor, backgroundColor } = useThemeColors();
  const { t } = useTranslation();
  const descriptionRef = useRef(null);
  const [isGettingMax, setIsGettingMax] = useState(false);

  const selectedContact =
    location.state?.selectedContact || props.route?.params?.selectedContact;
  const paymentType =
    location.state?.paymentType || props.route?.params?.paymentType;
  const fromPage = location.state?.fromPage || props.route?.params?.fromPage;
  const imageData = location.state?.imageData || props.route?.params?.imageData;
  const giftOption = location.state?.cardInfo || props.route?.params?.cardInfo;
  const useAltLayout = false;

  const isBTCdenominated =
    inputDenomination == "hidden" || inputDenomination == "sats";

  const convertedSendAmount = useMemo(
    () =>
      (isBTCdenominated
        ? Math.round(amountValue)
        : Math.round(
            (SATSPERBITCOIN / fiatStats?.value) * (amountValue / 100)
          )) || 0,
    [amountValue, fiatStats, isBTCdenominated]
  );

  console.log(amountValue, convertedSendAmount, "testing");

  const canSendPayment = useMemo(
    () => convertedSendAmount,
    [convertedSendAmount, paymentType]
  );

  const switchTextToConfirm = useMemo(() => {
    return (
      masterInfoObject[QUICK_PAY_STORAGE_KEY]?.isFastPayEnabled &&
      convertedSendAmount <=
        masterInfoObject[QUICK_PAY_STORAGE_KEY].fastPayThresholdSats
    );
  }, [convertedSendAmount]);

  const handleSelctProcesss = useCallback(
    async (item) => {
      try {
        const balance = sparkInformation.balance;
        const selectedPercent = !item ? 100 : Number(item.value);

        const sendingBalance = Math.floor(balance * (selectedPercent / 100));

        setIsGettingMax(true);
        await new Promise((res) => setTimeout(res, 250));

        let maxAmountSats = 0;

        if (selectedContact.isLNURL) {
          const [username, domain] = selectedContact.receiveAddress.split("@");
          const lnurlResposne = await getBolt11InvoiceForContact(
            username,
            sendingBalance,
            undefined,
            false,
            domain
          );
          if (!lnurlResposne) throw new Error("Unable to get invoice");
          const invoice = lnurlResposne;
          const fee = await sparkPaymenWrapper({
            getFee: true,
            address: invoice,
            masterInfoObject,
            paymentType: "lightning",
            mnemonic: currentWalletMnemoinc,
          });

          if (!fee.didWork) throw new Error(fee.error);

          maxAmountSats = Math.max(
            Number(sendingBalance) - fee.fee + fee.supportFee,
            0
          );
        } else {
          const feeResponse = await sparkPaymenWrapper({
            getFee: true,
            address: sparkInformation.sparkAddress,
            masterInfoObject,
            paymentType: "spark",
            amountSats: sendingBalance,
            mnemonic: currentWalletMnemoinc,
          });
          if (!feeResponse.didWork) throw new Error("Unable to get invoice");
          maxAmountSats = Math.max(
            Number(sendingBalance) - feeResponse.fee + feeResponse.supportFee,
            0
          );
        }

        const convertedMax =
          inputDenomination != "fiat"
            ? Math.floor(Number(maxAmountSats))
            : (
                Number(maxAmountSats) /
                Math.floor(SATSPERBITCOIN / fiatStats?.value)
              ).toFixed(2);

        setAmountValue(convertedMax);
      } catch (err) {
        navigate("/error", {
          state: { errorMessage: t("errormessages.genericError") },
        });
      } finally {
        setIsGettingMax(false);
      }
    },
    [
      sparkInformation,
      inputDenomination,
      currentWalletMnemoinc,
      selectedContact,
    ]
  );

  useEffect(() => {
    if (!giftOption) {
      setAmountValue("");
      return;
    }
    const totalSats = Math.round(
      giftOption.selectedDenomination * giftOption.satsPerDollar
    );
    const localfiatSatsPerDollar = fiatStats.value / SATSPERBITCOIN;
    setAmountValue(
      String(
        isBTCdenominated
          ? totalSats
          : Math.round(localfiatSatsPerDollar * totalSats)
      )
    );
  }, [giftOption]);

  const handleSearch = useCallback((term) => {
    setAmountValue(term);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isConnectedToTheInternet) {
      navigate("/error", {
        state: { errorMessage: t("errormessages.nointernet") },
      });
      return;
    }
    try {
      if (!convertedSendAmount) return;
      if (!canSendPayment) return;

      setIsLoading(true);

      const sendingAmountMsat = convertedSendAmount * 1000;
      const contactMessage = descriptionValue;
      const myProfileMessage = descriptionValue
        ? descriptionValue
        : t("contacts.sendAndRequestPage.profileMessage", {
            name: selectedContact.name || selectedContact.uniqueName,
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
          selectedContact.uuid
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
              "contacts.sendAndRequestPage.giftCardappVersionError"
            ),
          });
          return;
        }

        const postData = {
          type: "buyGiftCard",
          productId: giftOption.id,
          cardValue: giftOption.selectedDenomination,
          quantity: Number(1),
        };

        const response = await fetchBackend(
          "theBitcoinCompanyV3",
          postData,
          contactsPrivateKey,
          publicKey
        );

        if (response.result) {
          const { amount, invoice, orderId, uuid } = response.result;
          const fiatRates = await (fiatStats.coin?.toLowerCase() === "usd"
            ? Promise.resolve({ didWork: true, fiatRateResponse: fiatStats })
            : loadNewFiatData(
                "usd",
                contactsPrivateKey,
                publicKey,
                masterInfoObject
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
          sendObject["description"] = giftOption.memo || "";
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

          navigate("/confirm-payment", {
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
          errorMessage: error,
        });
        return;
      }

      if (paymentType === "send") {
        sendObject["amountMsat"] = sendingAmountMsat;
        sendObject["description"] = contactMessage;
        sendObject["uuid"] = UUID;
        sendObject["isRequest"] = false;
        sendObject["isRedeemed"] = null;
        sendObject["wasSeen"] = null;
        sendObject["didSend"] = null;

        navigate("/send", {
          state: {
            btcAddress: receiveAddress,
            comingFromAccept: true,
            enteredPaymentInfo: {
              amount: sendingAmountMsat / 1000,
              description: myProfileMessage,
            },
            contactInfo: {
              imageData,
              name: selectedContact.name || selectedContact.uniqueName,
              isLNURLPayment: selectedContact?.isLNURL,
              payingContactMessage: formattedPayingContactMessage,
              uniqueName: retrivedContact?.contacts?.myProfile?.uniqueName,
              uuid: selectedContact.uuid,
            },
            fromPage: "contacts",
            publishMessageFuncParams: {
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
        sendObject["amountMsat"] = sendingAmountMsat;
        sendObject["description"] = descriptionValue;
        sendObject["uuid"] = UUID;
        sendObject["isRequest"] = true;
        sendObject["isRedeemed"] = null;
        sendObject["wasSeen"] = null;
        sendObject["didSend"] = null;

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
    canSendPayment,
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
  ]);

  const memorizedContainerStyles = useMemo(() => {
    return {
      flex: 0,
      borderRadius: 8,
      height: "unset",
      minWidth: "unset",
      justifyContent: "center",
    };
  }, []);

  const handleEmoji = (newDescription) => {
    setDescriptionValue(newDescription);
  };

  return (
    <div className="send-request-page">
      <div className="replacement-container">
        <NavBarWithBalance showBalance={paymentType === "send"} />
        <div
          className="scroll-view-container"
          style={{ opacity: isAmountFocused ? 1 : HIDDEN_OPACITY }}
        >
          <FormattedBalanceInput
            maxWidth={0.9}
            amountValue={amountValue || 0}
            inputDenomination={inputDenomination}
            containerFunction={() => {
              if (!isAmountFocused) return;
              setInputDenomination((prev) => {
                const newPrev = prev === "sats" ? "fiat" : "sats";
                return newPrev;
              });
              setAmountValue(
                convertTextInputValue(amountValue, fiatStats, inputDenomination)
              );
            }}
          />

          <FormattedSatText
            containerStyles={{
              marginBottom: 16,
              opacity: !amountValue ? HIDDEN_OPACITY : 1,
            }}
            styles={{ margin: 0 }}
            neverHideBalance={true}
            globalBalanceDenomination={isBTCdenominated ? "fiat" : "sats"}
            balance={convertedSendAmount}
          />

          {paymentType === "send" && !giftOption && !useAltLayout && (
            <div>
              {/* <DropdownMenu
                selectedValue={t(
                  `wallet.sendPages.sendMaxComponent.${"sendMax"}`
                )}
                onSelect={handleSelctProcesss}
                options={MAX_SEND_OPTIONS}
                showClearIcon={false}
                textStyles={{ textAlign: "center" }}
                showVerticalArrows={false}
                customButtonStyles={memorizedContainerStyles}
                useIsLoading={isGettingMax}
              /> */}
            </div>
          )}

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
              {giftOption.memo && (
                <div className="memo-section">
                  <ThemeText
                    textStyles={{ marginBottom: 10, opacity: 0.8 }}
                    textContent={t("contacts.sendAndRequestPage.giftMessage")}
                  />
                  <div
                    className="memo-container"
                    style={{
                      backgroundColor: theme
                        ? backgroundOffset
                        : Colors.dark.text,
                      borderColor: theme
                        ? backgroundOffset
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <ThemeText
                      textStyles={{
                        lineHeight: 22,
                        letterSpacing: 0.3,
                      }}
                      textContent={giftOption.memo}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!giftOption && (
          <>
            <div className="input-and-gift-container">
              {/* {paymentType === "send" &&
                !giftOption &&
                !selectedContact?.isLNURL && (
                  <button
                    onClick={() => navigate("/select-gift-card-contacts")}
                    className="gift-container"
                    style={{
                      backgroundColor: backgroundOffset,
                      marginBottom: useAltLayout ? 0 : CONTENT_KEYBOARD_OFFSET,
                    }}
                  >
                    <ThemeText
                      textStyles={{ margin: "0 8px 0 0" }}
                      textContent={t(
                        "contacts.sendAndRequestPage.sendGiftText"
                      )}
                    />
                    <Gift color={textColor} />
                  </button>
                )} */}
              <CustomInput
                onFocusFunction={() => {
                  setIsAmountFocused(false);
                }}
                onBlurFunction={() => {
                  setIsAmountFocused(true);
                }}
                textInputRef={descriptionRef}
                placeholder={t(
                  "contacts.sendAndRequestPage.descriptionPlaceholder"
                )}
                customInputStyles={{
                  borderRadius: useAltLayout ? 15 : 8,
                  height: useAltLayout ? 50 : "unset",
                }}
                editable={paymentType === "send" ? true : !!convertedSendAmount}
                containerStyles={{ maxWidth: 350, marginTop: 8 }}
                onchange={setDescriptionValue}
                inputText={descriptionValue}
                textInputMultiline={true}
                textAlignVertical={"center"}
                maxLength={149}
              />

              {useAltLayout && (
                <div className="max-and-accept-container">
                  <div
                    style={{
                      flexShrink: useAltLayout ? 0 : 1,
                      marginRight: useAltLayout ? 10 : 0,
                      marginBottom: useAltLayout ? 0 : 20,
                      alignSelf: useAltLayout ? "auto" : "center",
                    }}
                  >
                    {/* <DropdownMenu
                      selectedValue={t(
                        `wallet.sendPages.sendMaxComponent.${"sendMaxShort"}`
                      )}
                      onSelect={handleSelctProcesss}
                      options={MAX_SEND_OPTIONS}
                      showClearIcon={false}
                      textStyles={{ textAlign: "center" }}
                      showVerticalArrows={false}
                      customButtonStyles={{
                        flex: 0,
                        borderRadius: useAltLayout ? 30 : 8,
                        height: useAltLayout ? 50 : "unset",
                        minWidth: useAltLayout ? 70 : "unset",
                        justifyContent: "center",
                      }}
                    /> */}
                  </div>

                  <CustomButton
                    buttonStyles={{
                      borderRadius: useAltLayout ? 30 : 8,
                      height: useAltLayout ? 50 : "unset",
                      flexShrink: useAltLayout ? 1 : 0,
                      width: useAltLayout ? "100%" : "auto",
                    }}
                    useLoading={isLoading}
                    actionFunction={handleSubmit}
                    textContent={
                      paymentType === "send"
                        ? t("constants.confirm")
                        : t("constants.request")
                    }
                  />
                </div>
              )}
            </div>
            {isAmountFocused && (
              <CustomNumberKeyboard
                showDot={masterInfoObject.userBalanceDenomination === "fiat"}
                frompage="sendContactsPage"
                setAmountValue={handleSearch}
                usingForBalance={true}
                fiatStats={fiatStats}
                containerClassName="sendRequetContainer"
              />
            )}
          </>
        )}
        {((isAmountFocused && !useAltLayout) || giftOption) && (
          <CustomButton
            buttonStyles={{
              width: "auto",
              opacity: canSendPayment ? 1 : HIDDEN_OPACITY,
            }}
            useLoading={isLoading}
            actionFunction={handleSubmit}
            textContent={
              paymentType === "send"
                ? switchTextToConfirm
                  ? t("constants.confirm")
                  : t("constants.review")
                : t("constants.request")
            }
          />
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
