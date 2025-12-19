import BackArrow from "../../components/backArrow/backArrow";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useEffect, useMemo, useRef, useCallback } from "react";
import Lottie from "react-lottie-player";
import confirmTxAnimation from "../../assets/confirmTxAnimation.json";
import errorTxAnimation from "../../assets/errorTxAnimation.json";
import {
  applyErrorAnimationTheme,
  updateConfirmAnimation,
} from "../../functions/lottieViewColorTransformer";
import "./confirmPayment.css";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import ThemeText from "../../components/themeText/themeText";
import { useTranslation } from "react-i18next";
import { useSpark } from "../../contexts/sparkContext";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";

export default function ConfirmPayment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { sparkInformation } = useSpark();
  const { theme, darkModeType } = useThemeContext();
  const location = useLocation();
  const props = location.state;
  const animationRef = useRef(null);

  const transaction = props?.transaction;
  const isLNURLAuth = props?.useLNURLAuth;

  const paymentType = location.state?.for;
  const formmatingType = location.state?.formattingType;
  const didSucceed = transaction?.paymentStatus !== "failed" || isLNURLAuth;
  const paymentFee = transaction?.details.fee;
  const sendingContactUUID = transaction.details?.sendingUUID;
  const paymentNetwork = sendingContactUUID
    ? t("screens.inAccount.expandedTxPage.contactPaymentType")
    : transaction.details.isGift
    ? t("constants.gift")
    : transaction.paymentType;
  const errorMessage = transaction?.details.error || "Unknown Error";
  const amount = transaction?.details.amount;
  const showPendingMessage = transaction?.paymentStatus === "pending";

  const isLRC20Payment = transaction?.details?.isLRC20Payment;
  const token = isLRC20Payment
    ? sparkInformation.tokens?.[transaction.details.LRC20Token]
    : "";

  const formattedTokensBalance = formatTokensNumber(
    amount,
    token?.tokenMetadata?.decimals
  );

  console.log(paymentFee, "etstasdas");

  const confirmAnimation = useMemo(() => {
    return updateConfirmAnimation(
      confirmTxAnimation,
      theme ? (darkModeType ? "lightsOut" : "dark") : "light"
    );
  }, [theme, darkModeType]);

  const errorAnimation = useMemo(() => {
    return applyErrorAnimationTheme(
      errorTxAnimation,
      theme ? (darkModeType ? "lightsOut" : "dark") : "light"
    );
  }, []);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const handleBack = useCallback(() => {
    navigate("/wallet", { replace: true });
  }, [navigate]);
  return (
    <div className="receiveQrPage">
      <BackArrow backFunction={handleBack} />

      <div className="contentContainer">
        <Lottie
          className="confirmTxAnimation"
          ref={animationRef}
          animationData={didSucceed ? confirmAnimation : errorAnimation}
          play
          loop={false}
        />

        {!isLNURLAuth && (
          <ThemeText
            className={"paymentStatus"}
            textContent={
              !didSucceed
                ? "Failed to send"
                : paymentType?.toLowerCase() === "paymentsucceed"
                ? "Sent successfully"
                : "Received successfully"
            }
          />
        )}

        {didSucceed && !isLNURLAuth && (
          <FormattedSatText
            containerStyles={{ marginBottom: "20px" }}
            styles={{ fontSize: "2.5rem", margin: 0 }}
            neverHideBalance={true}
            balance={isLRC20Payment ? formattedTokensBalance : amount}
            useCustomLabel={isLRC20Payment}
            customLabel={token?.tokenMetadata?.tokenTicker}
            useMillionDenomination={true}
          />
        )}

        {isLNURLAuth && (
          <ThemeText
            textStyles={{
              width: "95%",
              maxWidth: 300,
              textAlign: "center",
              marginBottom: 40,
            }}
            textContent={t("screens.inAccount.confirmTxPage.lnurlAuthSuccess")}
          />
        )}

        <ThemeText
          className={"errorText"}
          textContent={
            didSucceed
              ? ""
              : "There was an issue sending this payment, please try again."
          }
        />

        {didSucceed && !isLNURLAuth && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: 200,
              }}
            >
              <ThemeText textContent={"Fee"} />
              <FormattedSatText balance={paymentFee} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: 200,
              }}
            >
              <ThemeText textContent={"Type"} />
              <ThemeText
                className={"paymentNetwork"}
                textContent={paymentNetwork}
              />
            </div>
          </div>
        )}

        {!didSucceed && !isLNURLAuth && (
          <div className="errorMessageTextContainer">
            <ThemeText textContent={errorMessage} />
          </div>
        )}

        {!didSucceed && !isLNURLAuth && (
          <CustomButton
            actionFunction={() => {
              const mailto = `mailto:blake@blitzwalletapp.com?subject=Payment Failed&body=${encodeURIComponent(
                errorMessage
              )}`;
              window.location.href = mailto;
            }}
            buttonStyles={{ backgroundColor: "transparent" }}
            textStyles={{ color: theme ? Colors.dark.text : Colors.light.text }}
            textContent={t("screens.inAccount.confirmTxPage.sendReport")}
          />
        )}
        <CustomButton
          actionFunction={handleBack}
          buttonClassName={"continueBTN"}
          textContent={t("constants.continue")}
        />
      </div>
    </div>
  );
}
