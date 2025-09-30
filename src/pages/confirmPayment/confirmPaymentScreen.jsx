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

export default function ConfirmPayment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useThemeContext();
  const location = useLocation();
  const props = location.state;
  const animationRef = useRef(null);

  const transaction = props?.transaction;
  const isLNURLAuth = props?.useLNURLAuth;

  const paymentType = location.state?.for;
  const formmatingType = location.state?.formattingType;
  const didSucceed = transaction?.paymentStatus !== "failed" || isLNURLAuth;
  const paymentFee = transaction?.details.fee;
  const paymentNetwork = transaction?.paymentType;
  const errorMessage = transaction?.details.error || "Unknown Error";
  const amount = transaction?.details.amount;
  const showPendingMessage = transaction?.paymentStatus === "pending";

  console.log(paymentFee, "etstasdas");

  const confirmAnimation = useMemo(() => {
    return updateConfirmAnimation(confirmTxAnimation, "light");
  }, []);

  const errorAnimation = useMemo(() => {
    return applyErrorAnimationTheme(errorTxAnimation, "light");
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
          <h1 className="paymentStatus">
            {!didSucceed
              ? "Failed to send"
              : paymentType?.toLowerCase() === "paymentsucceed"
              ? "Sent successfully"
              : "Received successfully"}
          </h1>
        )}

        {didSucceed && !isLNURLAuth && (
          <FormattedSatText
            containerStyles={{ marginBottom: "20px" }}
            styles={{ fontSize: "2.5rem", margin: 0 }}
            balance={amount}
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

        <p className="errorText">
          {didSucceed
            ? ""
            : "There was an issue sending this payment, please try again."}
        </p>

        {didSucceed && !isLNURLAuth && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: 200,
              }}
            >
              <p>Fee</p>
              <FormattedSatText balance={paymentFee} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: 200,
              }}
            >
              <p>Type</p>
              <p className="paymentNetwork">{paymentNetwork}</p>
            </div>
          </div>
        )}

        {!didSucceed && !isLNURLAuth && (
          <div className="errorMessageTextContainer">
            <p>{errorMessage}</p>
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
          textStyles={{ color: theme ? Colors.dark.text : Colors.light.text }}
          buttonClassName={"continueBTN"}
          textContent={t("constants.continue")}
        />
      </div>
    </div>
  );
}
