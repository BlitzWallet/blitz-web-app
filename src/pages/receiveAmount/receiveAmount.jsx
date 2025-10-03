import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./style.css";
import BackArrow from "../../components/backArrow/backArrow";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { SATSPERBITCOIN } from "../../constants";
import { useNodeContext } from "../../contexts/nodeContext";
import convertNumberForTextInput from "../../functions/convertNumberForTextInput";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import CustomNumberKeyboard from "../../components/customNumberKeyboard/customNumberKeyboard";
import CustomButton from "../../components/customButton/customButton";

const EditReceivePaymentInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const props = location.state;

  const receiveOption = props?.receiveOption;
  const fromPage = props?.from;

  const [amountValue, setAmountValue] = useState("");
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const [paymentDescription, setPaymentDescription] = useState("");

  const [inputDenomination, setInputDenomination] = useState(
    masterInfoObject.userBalanceDenomination != "fiat" ? "sats" : "fiat"
  );
  console.log(amountValue, "amount value");

  const localSatAmount = Math.round(
    Number(
      inputDenomination === "sats"
        ? Number(amountValue)
        : Math.round(SATSPERBITCOIN / (fiatStats?.value || 65000)) * amountValue
    ) || 0
  );

  console.log(fromPage, "testing");
  const handleSubmit = () => {
    console.log("Running in edit payment information submit function");

    navigate(`/receive`, {
      state: {
        amount: Number(localSatAmount),
        description: paymentDescription,
        receiveOption: receiveOption || "lightning",
        navigateHome: fromPage !== "homepage",
      },
      replace: fromPage !== "homepage",
    });

    setAmountValue("");
  };

  return (
    <div className="edit-receive-container">
      <BackArrow />
      <div className="balanceContainer">
        <div
          onClick={() => {
            setInputDenomination((prev) => (prev === "sats" ? "fiat" : "sats"));
            setAmountValue(
              convertNumberForTextInput(
                amountValue,
                inputDenomination,
                fiatStats
              ) || ""
            );
          }}
          className="scroll-content"
        >
          <FormattedSatText
            containerStyles={{
              opacity: !amountValue ? 0.5 : 1,
              cursor: "pointer",
            }}
            styles={{
              fontSize: "2.75rem",
              margin: 0,
            }}
            globalBalanceDenomination={inputDenomination}
            neverHideBalance={true}
            balance={localSatAmount}
          />
        </div>
        <FormattedSatText
          containerStyles={{
            opacity: !amountValue ? 0.5 : 1,
            cursor: "pointer",
          }}
          styles={{ fontSize: "1.2rem", margin: 0 }}
          globalBalanceDenomination={
            inputDenomination === "sats" ? "fiat" : "sats"
          }
          neverHideBalance={true}
          balance={localSatAmount}
        />
      </div>
      <div className="description-input-container">
        <input
          type="text"
          value={paymentDescription}
          onChange={(e) => setPaymentDescription(e.target.value)}
          placeholder={"Add a note..."}
          className="description-input"
          onFocus={() => setIsKeyboardFocused(true)}
          onBlur={() => setIsKeyboardFocused(false)}
        />
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
        }}
        textContent={"Request"}
      />
    </div>
  );
};

export default EditReceivePaymentInformation;
