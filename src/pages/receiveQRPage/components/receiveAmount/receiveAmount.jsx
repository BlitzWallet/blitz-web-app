import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./style.css";
import BackArrow from "../../../../components/backArrow/backArrow";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { SATSPERBITCOIN } from "../../../../constants";
import { useNodeContext } from "../../../../contexts/nodeContext";
import convertNumberForTextInput from "../../../../functions/convertNumberForTextInput";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import CustomNumberKeyboard from "../../../../components/customNumberKeyboard/customNumberKeyboard";
import CustomButton from "../../../../components/customButton/customButton";
import { useFlashnet } from "../../../../contexts/flashnetContext";
import ThemeText from "../../../../components/themeText/themeText";

const EditReceivePaymentInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const { swapLimits } = useFlashnet();
  const props = location.state;

  const receiveOption = props?.receiveOption || "lightning";
  const fromPage = props?.from;
  const endReceiveType = props?.endReceiveType || "BTC";
  const userReceiveAmount = props?.userReceiveAmount || 0;
  const hasReceiveAmount = !!userReceiveAmount;
  const passedDescription = props?.description || "";
  const navigateHome = props?.navigateHome ?? false;

  const isUSDReceiveMode = endReceiveType === "USD";

  const [amountValue, setAmountValue] = useState("");
  const [inputDenomination, setInputDenomination] = useState(
    isUSDReceiveMode
      ? "fiat"
      : masterInfoObject.userBalanceDenomination !== "fiat"
        ? "sats"
        : "fiat",
  );

  const localSatAmount = Math.round(
    Number(
      inputDenomination === "sats"
        ? Number(amountValue)
        : Math.round(SATSPERBITCOIN / (fiatStats?.value || 65000)) *
            Number(amountValue),
    ) || 0,
  );

  const cannotRequest =
    receiveOption.toLowerCase() === "lightning" &&
    isUSDReceiveMode &&
    localSatAmount > 0 &&
    localSatAmount < (swapLimits?.bitcoin || 0);

  const handleSubmit = () => {
    // No amount entered
    if (!localSatAmount) {
      if (hasReceiveAmount) {
        // Remove existing amount
        navigate("/receive", {
          state: {
            amount: 0,
            description: passedDescription,
            receiveOption,
            endReceiveType,
            navigateHome,
          },
          replace: true,
        });
      } else {
        navigate(-1);
      }
      return;
    }

    if (cannotRequest) return;

    navigate("/receive", {
      state: {
        amount: localSatAmount,
        description: passedDescription,
        receiveOption,
        endReceiveType,
        navigateHome,
      },
      replace: fromPage !== "homepage",
    });

    setAmountValue("");
  };

  const buttonLabel =
    hasReceiveAmount && !localSatAmount
      ? t("constants.remove")
      : !hasReceiveAmount && !localSatAmount
        ? t("constants.back")
        : t("constants.request");

  return (
    <div className="edit-receive-container">
      <BackArrow />
      <div className="balanceContainer">
        <div
          onClick={() => {
            if (isUSDReceiveMode) return; // USD mode stays in fiat
            setInputDenomination((prev) => (prev === "sats" ? "fiat" : "sats"));
            setAmountValue(
              convertNumberForTextInput(
                amountValue,
                inputDenomination,
                fiatStats,
              ) || "",
            );
          }}
          className="scroll-content"
          style={{ cursor: isUSDReceiveMode ? "default" : "pointer" }}
        >
          <FormattedSatText
            containerStyles={{ opacity: !amountValue ? 0.5 : 1 }}
            styles={{ fontSize: "2.75rem", margin: 0 }}
            globalBalanceDenomination={inputDenomination}
            neverHideBalance={true}
            balance={localSatAmount}
          />
        </div>
        {!isUSDReceiveMode && (
          <FormattedSatText
            containerStyles={{ opacity: !amountValue ? 0.5 : 1 }}
            styles={{ fontSize: "1.2rem", margin: 0 }}
            globalBalanceDenomination={
              inputDenomination === "sats" ? "fiat" : "sats"
            }
            neverHideBalance={true}
            balance={localSatAmount}
          />
        )}
      </div>

      {cannotRequest && (
        <ThemeText
          textStyles={{
            fontSize: "0.85rem",
            textAlign: "center",
            opacity: 0.7,
          }}
          textContent={t("wallet.receivePages.editPaymentInfo.minUSDSwap", {
            amount: swapLimits?.bitcoin || 0,
          })}
        />
      )}

      <CustomNumberKeyboard
        containerClassName="custom-number-keyboard-container"
        setAmountValue={setAmountValue}
        showDot={inputDenomination === "fiat"}
        fiatStats={fiatStats}
      />
      <CustomButton
        actionFunction={handleSubmit}
        buttonStyles={{
          margin: "0 auto",
          opacity: cannotRequest ? 0.5 : 1,
        }}
        textContent={buttonLabel}
      />
    </div>
  );
};

export default EditReceivePaymentInformation;
