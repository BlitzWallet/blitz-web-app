import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { decode } from "bolt11";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import FullLoadingScreen from "../../../../../components/fullLoadingScreen/fullLoadingScreen";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { useGlobalContextProvider } from "../../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../../contexts/sparkContext";
import { useActiveCustodyAccount } from "../../../../../contexts/activeAccount";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { sparkPaymenWrapper } from "../../../../../functions/spark/payments";
import fetchBackend from "../../../../../../db/handleBackend";
import giftCardPurchaseAmountTracker from "../../../../../functions/apps/giftCardPurchaseTracker";
import { Colors } from "../../../../../constants/theme";
import "../style.css";
import { useGlobalContacts } from "../../../../../contexts/globalContacts";

export default function ConfirmPurchase({
  quantity,
  price,
  productId,
  email,
  selectedItem,
}) {
  const { globalContactsInformation } = useGlobalContacts();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  const { decodedGiftCards, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const didFetchGift = useRef(false);
  const [error, setError] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [productInfo, setProductInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function getGiftCardInfo() {
      try {
        if (didFetchGift.current) return;
        didFetchGift.current = true;
        const postData = {
          type: "buyGiftCard",
          productId: productId,
          cardValue: Number(price),
          quantity: Number(quantity),
          email: email,
          blitzUsername: globalContactsInformation.myProfile.uniqueName,
        };

        const response = await fetchBackend(
          "theBitcoinCompanyV3",
          postData,
          contactsPrivateKey,
          publicKey,
        );

        if (!response) throw new Error(t("errormessages.invoiceRetrivalError"));

        const decodedInvoice = decode(response.result?.invoice);

        const fee = await sparkPaymenWrapper({
          getFee: true,
          address: response.result?.invoice,
          paymentType: "lightning",
          amountSats: decodedInvoice.satoshis,
          masterInfoObject,
          mnemonic: currentWalletMnemoinc,
        });

        if (!fee.didWork) throw new Error(t("errormessages.paymentFeeError"));

        if (
          sparkInformation.balance <
          decodedInvoice.satoshis + fee.supportFee + fee.fee
        ) {
          throw new Error(
            t("errormessages.insufficientBalanceError", {
              planType: "gift card",
            }),
          );
        }

        const description = decodedInvoice.tags.filter(
          (tag) => tag.tagName === "description",
        );

        setProductInfo({
          ...response.result,
          paymentFee: fee.fee,
          supportFee: fee.supportFee,
          invoice: response.result?.invoice,
          amountSat: decodedInvoice.satoshis,
          description: description.length !== 0 ? description[0].data : "",
        });
      } catch (err) {
        console.log(err);

        setError(err.message);
      }
    }
    getGiftCardInfo();
    return () => {
      mounted = false;
    };
  }, []);

  const fee = (productInfo?.paymentFee || 0) + (productInfo?.supportFee || 0);

  const handleConfirm = useCallback(async () => {
    if (!productInfo || isPurchasing) return;
    try {
      setIsPurchasing(true);
      const currentTime = new Date();

      const isOverDailyLimit = await giftCardPurchaseAmountTracker({
        sendingAmountSat: productInfo.amountSat,
        USDBTCValue: { value: 100_000 },
      });

      if (isOverDailyLimit.shouldBlock) {
        setPurchaseError(isOverDailyLimit.reason);
        setIsPurchasing(false);
        return;
      }

      const paymentResponse = await sparkPaymenWrapper({
        address: productInfo.invoice,
        paymentType: "lightning",
        amountSats: productInfo.amountSat,
        masterInfoObject,
        fee: fee,
        memo: productInfo.description,
        userBalance: sparkInformation.balance,
        sparkInformation,
        mnemonic: currentWalletMnemoinc,
      });

      if (!paymentResponse.didWork) {
        setPurchaseError(t("errormessages.paymentError"));
        setIsPurchasing(false);
        return;
      }

      await saveClaimInformation({
        responseObject: productInfo,
        paymentObject: {
          ...paymentResponse.response,
          date: currentTime,
        },
        currentTime,
      });
    } catch (err) {
      console.log(err);
      setPurchaseError(t("errormessages.invoiceRetrivalError"));
      setIsPurchasing(false);
    }
  }, [productInfo, isPurchasing, fee]);

  async function saveClaimInformation({
    responseObject,
    paymentObject,
    currentTime,
  }) {
    const newClaimInfo = {
      logo: selectedItem?.logo || "",
      name: selectedItem?.name || "",
      id: responseObject.orderId,
      uuid: responseObject.uuid,
      invoice: responseObject.invoice,
      date: currentTime,
    };
    const newCardsList = decodedGiftCards?.purchasedCards
      ? [...decodedGiftCards.purchasedCards, newClaimInfo]
      : [newClaimInfo];

    const em = await encryptMessage(
      contactsPrivateKey,
      publicKey,
      JSON.stringify({
        ...decodedGiftCards,
        purchasedCards: newCardsList,
      }),
    );
    toggleGlobalAppDataInformation({ giftCards: em }, true);

    navigate("/store-item", {
      state: { for: "giftcards-history" },
      replace: true,
    });
  }

  if (error) {
    return (
      <div className="giftCardsContainer">
        <CustomSettingsNavBar customBackFunction={() => navigate(-1)} />
        <FullLoadingScreen showLoadingIcon={false} text={error} />
        <CustomButton
          textContent={t("constants.back")}
          actionFunction={() => navigate(-1)}
          buttonStyles={{ width: "90%", margin: "0 auto 20px" }}
        />
      </div>
    );
  }

  if (isPurchasing) {
    return (
      <div className="giftCardsContainer">
        <CustomSettingsNavBar customBackFunction={() => {}} />
        <FullLoadingScreen
          showLoadingIcon={!purchaseError}
          text={
            purchaseError ||
            t("apps.giftCards.expandedGiftCardPage.purchasingCardMessage")
          }
          textStyles={{ textAlign: "center" }}
        />
        {purchaseError && (
          <CustomButton
            textContent={t("constants.back")}
            actionFunction={() => navigate(-1)}
            buttonStyles={{ width: "90%", margin: "0 auto 20px" }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="giftCardsContainer">
      <CustomSettingsNavBar customBackFunction={() => navigate(-1)} />

      <div className="confirmPurchaseBody">
        {!productInfo ? (
          <FullLoadingScreen />
        ) : (
          <>
            <ThemeText
              textContent={t("apps.giftCards.confimPurchase.quantity", {
                quantity,
              })}
              textStyles={{ fontSize: 18, textAlign: "center" }}
            />
            <ThemeText
              textContent={t("apps.giftCards.confimPurchase.cardAmount", {
                amount: price,
                currency: selectedItem?.currency || "",
              })}
              textStyles={{ fontSize: 18, marginTop: 10 }}
            />

            <div className="confirmPurchaseAmountRow">
              <ThemeText
                textContent={t("apps.giftCards.confimPurchase.price")}
                textStyles={{ fontSize: 18, margin: 0 }}
              />
              <ThemeText
                textContent={`${productInfo.amount} sats`}
                textStyles={{ fontSize: 18, fontWeight: "600", margin: 0 }}
              />
            </div>

            <div className="confirmPurchaseFeeRow">
              <ThemeText
                textContent={t("apps.giftCards.confimPurchase.fee")}
                textStyles={{ margin: 0 }}
              />
              <ThemeText
                textContent={`${fee} sats`}
                textStyles={{ fontWeight: "500", margin: 0 }}
              />
            </div>

            <CustomButton
              textContent={t("apps.giftCards.expandedGiftCardPage.purchaseBTN")}
              actionFunction={handleConfirm}
              buttonStyles={{
                width: "90%",
                margin: "auto auto 20px",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
