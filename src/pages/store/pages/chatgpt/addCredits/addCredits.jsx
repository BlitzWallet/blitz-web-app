import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import FullLoadingScreen from "../../../../../components/fullLoadingScreen/fullLoadingScreen";
import FormattedSatText from "../../../../../components/formattedSatText/formattedSatText";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useGlobalContextProvider } from "../../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../../contexts/sparkContext";
import { useActiveCustodyAccount } from "../../../../../contexts/activeAccount";
import { useKeysContext } from "../../../../../contexts/keysContext";

import { sparkPaymenWrapper } from "../../../../../functions/spark/payments";
import { decodeLNURL } from "../../../../../functions/lnurl/bench32Formmater";
import { getLNAddressForLiquidPayment } from "../../../../../functions/sendBitcoin/payments";
import { InputTypes } from "bitcoin-address-parser";
import { AI_MODEL_COST } from "../constants/AIModelCost";
import { getModels } from "../functions/getModels";
import "../style.css";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";
import getLNURLDetails from "../../../../../functions/lnurl/getLNURLDetails";

const CREDIT_OPTIONS = [
  {
    titleKey: "apps.chatGPT.addCreditsPage.casualPlanTitle",
    price: 2200,
    numSearches: "40",
    isSelected: false,
  },
  {
    titleKey: "apps.chatGPT.addCreditsPage.proPlanTitle",
    price: 3300,
    numSearches: "100",
    isSelected: true,
  },
  {
    titleKey: "apps.chatGPT.addCreditsPage.powerPlanTitle",
    price: 4400,
    numSearches: "150",
    isSelected: false,
  },
];

export default function AddChatGPTCredits() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const {
    decodedChatGPT,
    toggleGlobalAppDataInformation,
    globalAppDataInformation,
  } = useGlobalAppData();

  const [selectedSubscription, setSelectedSubscription] =
    useState(CREDIT_OPTIONS);
  const [confirmStep, setConfirmStep] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  const [invoiceError, setInvoiceError] = useState("");
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [models, setModels] = useState(AI_MODEL_COST);

  useEffect(() => {
    getModels().then(setModels);
  }, []);

  const selectedPlan = selectedSubscription.find((s) => s.isSelected);

  // When entering confirm step, fetch invoice and fee
  useEffect(() => {
    if (!confirmStep) return;
    let mounted = true;

    async function generateInvoiceAndFee() {
      setIsLoadingInvoice(true);
      setInvoiceError("");
      setInvoiceInfo(null);
      try {
        const creditPrice =
          confirmStep.price + 150 + Math.ceil(confirmStep.price * 0.005);

        const lnpayoutLnurl = import.meta.env.VITE_GPT_PAYOUT_LNURL || "";
        if (!lnpayoutLnurl) throw new Error("Payment configuration missing");

        const didGetData = await getLNURLDetails(lnpayoutLnurl);
        if (!didGetData) throw new Error("Unable to get lnurl data");
        console.log(didGetData);

        const paymentInfo = { type: InputTypes.LNURL_PAY, data: didGetData };
        const invoice = await getLNAddressForLiquidPayment(
          paymentInfo,
          creditPrice,
          t("apps.chatGPT.addCreditsPage.paymentMemo"),
        );
        if (!invoice) throw new Error(t("errormessages.invoiceRetrivalError"));

        const feeResult = await sparkPaymenWrapper({
          getFee: true,
          address: invoice,
          paymentType: "lightning",
          amountSats: creditPrice,
          masterInfoObject,
          sparkInformation,
          userBalance: sparkInformation.balance,
          mnemonic: currentWalletMnemoinc,
        });

        if (!feeResult.didWork)
          throw new Error(t("errormessages.paymentFeeError"));

        if (
          sparkInformation.balance <
          creditPrice + feeResult.fee + feeResult.supportFee
        ) {
          throw new Error(
            t("errormessages.insufficientBalanceError", {
              planType: t(confirmStep.titleKey),
            }),
          );
        }

        if (!mounted) return;
        setInvoiceInfo({
          fee: feeResult.fee,
          supportFee: feeResult.supportFee,
          invoice,
          creditPrice: confirmStep.price,
        });
      } catch (err) {
        console.log("chatGPT addCredits invoice error:", err);
        if (!mounted) return;
        setInvoiceError(err.message);
      } finally {
        if (mounted) setIsLoadingInvoice(false);
      }
    }

    generateInvoiceAndFee();
    return () => {
      mounted = false;
    };
  }, [confirmStep]);

  const handlePay = useCallback(async () => {
    if (!invoiceInfo) return;
    setIsPaying(true);
    try {
      const paymentResponse = await sparkPaymenWrapper({
        getFee: false,
        address: invoiceInfo.invoice,
        paymentType: "lightning",
        amountSats:
          invoiceInfo.creditPrice +
          150 +
          Math.ceil(invoiceInfo.creditPrice * 0.005),
        fee: invoiceInfo.fee,
        memo: t("apps.chatGPT.addCreditsPage.paymentMemo"),
        masterInfoObject,
        sparkInformation,
        userBalance: sparkInformation.balance,
        mnemonic: currentWalletMnemoinc,
      });

      if (!paymentResponse.didWork) throw new Error(paymentResponse.error);

      toggleGlobalAppDataInformation(
        {
          chatGPT: {
            conversation: globalAppDataInformation.chatGPT?.conversation || [],
            credits: (decodedChatGPT?.credits || 0) + invoiceInfo.creditPrice,
          },
        },
        true,
      );
    } catch (err) {
      console.log("chatGPT payment error:", err);
      setInvoiceError(err.message || t("errormessages.paymentError"));
    } finally {
      setIsPaying(false);
    }
  }, [
    invoiceInfo,
    masterInfoObject,
    sparkInformation,
    currentWalletMnemoinc,
    toggleGlobalAppDataInformation,
    globalAppDataInformation,
    decodedChatGPT,
    navigate,
    t,
  ]);

  const subscriptionElements = selectedSubscription.map((subscription, idx) => (
    <button
      key={idx}
      className={`addCredits-option`}
      style={{
        borderColor: textColor,
        backgroundColor: subscription.isSelected
          ? backgroundOffset
          : "transparent",
      }}
      onClick={() => {
        setSelectedSubscription((prev) =>
          prev.map((item) => ({
            ...item,
            isSelected: item.titleKey === subscription.titleKey,
          })),
        );
      }}
    >
      <div className="addCredits-optionLeft">
        <ThemeText
          textContent={t(subscription.titleKey)}
          textStyles={{ fontWeight: "bold", marginBottom: "8px", margin: 0 }}
        />
        <FormattedSatText
          styles={{ margin: 0 }}
          neverHideBalance={true}
          frontText={t("apps.chatGPT.addCreditsPage.price")}
          balance={subscription.price}
        />
      </div>
      <ThemeText
        textContent={t("apps.chatGPT.addCreditsPage.estSearches", {
          num: subscription.numSearches,
        })}
        textStyles={{ flexShrink: 1, textAlign: "right", margin: 0 }}
      />
    </button>
  ));

  const availableModels = models.map((item) => (
    <ThemeText
      key={item.id}
      textContent={item.name}
      textStyles={{ fontSize: "12px", marginBottom: "4px", margin: "2px 0" }}
    />
  ));

  if (isPaying) {
    return (
      <div className="addCredits-root" style={{ backgroundColor }}>
        <FullLoadingScreen
          text={`${t("constants.processing")}...`}
          textStyles={{ fontSize: "18px", textAlign: "center" }}
        />
      </div>
    );
  }

  // Confirmation step
  if (confirmStep) {
    return (
      <div className="addCredits-root" style={{ backgroundColor }}>
        <CustomSettingsNavBar
          customBackFunction={() => {
            setConfirmStep(null);
            setInvoiceInfo(null);
            setInvoiceError("");
          }}
          text={t("apps.chatGPT.confirmationPage.title")}
        />

        {isLoadingInvoice ? (
          <div className="addCredits-confirmBody">
            <FullLoadingScreen
              text={t("apps.chatGPT.loadingMessage") || "Loading..."}
            />
          </div>
        ) : invoiceError ? (
          <div className="addCredits-confirmBody">
            <ThemeText
              textContent={invoiceError}
              textStyles={{
                textAlign: "center",
                color: "#e20000",
                marginTop: "auto",
                marginBottom: "auto",
              }}
            />
            <CustomButton
              actionFunction={() => {
                setConfirmStep(null);
                setInvoiceInfo(null);
                setInvoiceError("");
              }}
              textContent={t("constants.back")}
            />
          </div>
        ) : (
          <div className="addCredits-confirmBody">
            <ThemeText
              textContent={t("apps.chatGPT.confirmationPage.plan", {
                planType: t(confirmStep.titleKey),
              })}
              textStyles={{
                fontSize: "16px",
                marginBottom: "12px",
                margin: 0,
                marginTop: "auto",
              }}
            />
            <FormattedSatText
              neverHideBalance={true}
              frontText={t("apps.chatGPT.confirmationPage.price")}
              balance={confirmStep.price}
              styles={{ margin: 0 }}
            />
            {invoiceInfo && (
              <FormattedSatText
                neverHideBalance={true}
                frontText={t("apps.chatGPT.confirmationPage.fee")}
                balance={invoiceInfo.fee + invoiceInfo.supportFee}
                styles={{ margin: 0, marginBottom: "auto" }}
              />
            )}
            <div
              style={{ marginTop: "auto" }}
              className="addCredits-confirmActions"
            >
              <CustomButton
                actionFunction={handlePay}
                textContent={t("constants.pay")}
                useLoading={!invoiceInfo}
                buttonStyles={{ marginTop: "auto" }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="addCredits-root" style={{ backgroundColor }}>
      <CustomSettingsNavBar
        customBackFunction={() => navigate("/store")}
        text={t("apps.chatGPT.addCreditsPage.title")}
      />

      <div className="addCredits-scroll">
        <ThemeText
          textContent={t("apps.chatGPT.addCreditsPage.description")}
          textStyles={{ textAlign: "center", marginBottom: "20px" }}
        />

        <div className="addCredits-options">{subscriptionElements}</div>

        <div className="addCredits-models">
          <ThemeText
            textContent={t("apps.chatGPT.addCreditsPage.supportedModels")}
            textStyles={{
              fontWeight: 500,
              fontSize: "16px",
              textAlign: "center",
              marginBottom: "8px",
            }}
          />
          {availableModels}
        </div>

        <ThemeText
          textContent={t("apps.chatGPT.addCreditsPage.feeInfo")}
          textStyles={{
            textAlign: "center",
            color: theme && darkModeType ? "#ffffff" : "#0375F6",
            fontSize: "12px",
            marginTop: "10px",
          }}
        />
      </div>

      <div className="addCredits-footer">
        <CustomButton
          actionFunction={() => {
            if (selectedPlan) setConfirmStep(selectedPlan);
          }}
          textContent={t("constants.pay")}
        />
      </div>
    </div>
  );
}
