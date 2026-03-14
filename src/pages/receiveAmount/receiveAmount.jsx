import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./style.css";
import BackArrow from "../../components/backArrow/backArrow";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { HIDDEN_OPACITY, SATSPERBITCOIN } from "../../constants";
import { useNodeContext } from "../../contexts/nodeContext";
import convertNumberForTextInput from "../../functions/convertNumberForTextInput";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import CustomNumberKeyboard from "../../components/customNumberKeyboard/customNumberKeyboard";
import CustomButton from "../../components/customButton/customButton";
import { useTranslation } from "react-i18next";
import { useFlashnet } from "../../contexts/flashnetContext";
import usePaymentInputDisplay from "../../hooks/usePaymentInputDisplay";
import convertTextInputValue from "../../functions/textInputConvertValue";
import customUUID from "../../functions/customUUID";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import { useOverlay } from "../../contexts/overlayContext";
import FormattedBalanceInput from "../../components/formattedBalanceInput/formattedBalanceInput";

const EditReceivePaymentInformation = () => {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();

  const { swapLimits, swapUSDPriceDollars } = useFlashnet();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const [amountValue, setAmountValue] = useState("");
  const location = useLocation();
  const props = location.state;
  const { t } = useTranslation();

  const receiveOption = props?.receiveOption;
  const fromPage = props?.from;
  const receiveType = props.receiveType;

  const endReceiveType = props.endReceiveType;
  const hasReceiveAmount = !!props.userReceiveAmount;

  const isUSDReceiveMode = endReceiveType === "USD";

  const [inputDenomination, setInputDenomination] = useState(
    isUSDReceiveMode
      ? "fiat"
      : masterInfoObject.userBalanceDenomination !== "fiat"
        ? "sats"
        : "fiat",
  );
  console.log(amountValue, "amount value");

  const {
    primaryDisplay,
    secondaryDisplay,
    conversionFiatStats,
    convertDisplayToSats,
    getNextDenomination,
    convertForToggle,
  } = usePaymentInputDisplay({
    paymentMode: endReceiveType,
    inputDenomination,
    fiatStats,
    usdFiatStats: { coin: "USD", value: swapUSDPriceDollars },
    masterInfoObject,
  });

  const localSatAmount = convertDisplayToSats(amountValue);

  const cannotRequset =
    receiveType.toLowerCase() === "lightning" &&
    endReceiveType === "USD" &&
    localSatAmount < swapLimits.bitcoin;

  console.log(fromPage, "testing");

  const handleDenominationToggle = () => {
    const nextDenom = getNextDenomination();
    setInputDenomination(nextDenom);
    setAmountValue(convertForToggle(amountValue, convertTextInputValue));
  };

  const handleSubmit = () => {
    const sendAmount = !Number(localSatAmount) ? 0 : Number(localSatAmount);
    console.log("Running in edit payment information submit function");

    if (hasReceiveAmount && !localSatAmount) {
      if (fromPage === "homepage") {
        navigate(`/receive`, {
          state: {
            ...location.state,
            receiveAmount: 0,
          },
          replace: true,
        });
      } else {
        navigate(`/receive`, {
          state: {
            ...location.state,
            receiveAmount: 0,
            endReceiveType: endReceiveType,
            uuid: customUUID(),
          },
          replace: true,
        });
      }
    } else if (!localSatAmount) {
      navigate(-1);
      return;
    }

    if (localSatAmount && cannotRequset) {
      openOverlay({
        for: "error",
        errorMessage: t("wallet.receivePages.editPaymentInfo.minUSDSwap", {
          amount: displayCorrectDenomination({
            amount: swapLimits.bitcoin,
            masterInfoObject: {
              ...masterInfoObject,
              userBalanceDenomination:
                primaryDisplay.denomination === "fiat" ? "fiat" : "sats",
            },
            forceCurrency: primaryDisplay.forceCurrency,
            fiatStats: conversionFiatStats,
          }),
        }),
      });
      return;
    }

    if (fromPage === "homepage") {
      navigate(`/receive`, {
        state: {
          ...location.state,
          receiveAmount: sendAmount,
        },
        replace: true,
      });
    } else {
      navigate(`/receive`, {
        state: {
          ...location.state,
          receiveAmount: sendAmount,
          endReceiveType: endReceiveType,
          uuid: customUUID(),
        },
        replace: true,
      });
    }

    setAmountValue("");
  };

  return (
    <div className="edit-receive-container">
      <BackArrow />
      <div className="balanceContainer">
        <div
          style={{ opacity: !amountValue ? HIDDEN_OPACITY : 1, width: "100%" }}
          onClick={handleDenominationToggle}
        >
          <FormattedBalanceInput
            maxWidth={0.9}
            amountValue={amountValue}
            inputDenomination={primaryDisplay.denomination}
            forceCurrency={primaryDisplay.forceCurrency}
            forceFiatStats={primaryDisplay.forceFiatStats}
          />

          <FormattedSatText
            neverHideBalance={true}
            globalBalanceDenomination={secondaryDisplay.denomination}
            forceCurrency={secondaryDisplay.forceCurrency}
            forceFiatStats={secondaryDisplay.forceFiatStats}
            balance={localSatAmount}
          />
        </div>
      </div>

      <CustomNumberKeyboard
        containerClassName={"custom-number-keyboard-container"}
        setAmountValue={setAmountValue}
        showDot={inputDenomination === "fiat"}
        fiatStats={fiatStats}
      />
      <CustomButton
        actionFunction={handleSubmit}
        buttonStyles={{
          margin: "0 auto",
          maxWidth: 375,
        }}
        textContent={
          !localSatAmount ? t("constants.back") : t("constants.request")
        }
      />
    </div>
  );
};

export default EditReceivePaymentInformation;
