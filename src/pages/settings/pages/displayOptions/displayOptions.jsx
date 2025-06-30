import { useRef } from "react";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { BITCOIN_SAT_TEXT, BITCOIN_SATS_ICON } from "../../../../constants";
import { Colors } from "../../../../constants/theme";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { formatCurrency } from "../../../../functions/formatCurrency";
import handleDBStateChange from "../../../../functions/handleDBStateChange";
import "./displayOptions.css";

export default function DisplayOptions() {
  const { toggleMasterInfoObject, setMasterInfoObject, masterInfoObject } =
    useGlobalContextProvider();

  const { fiatStats } = useNodeContext();

  const satDisplay = masterInfoObject?.satDisplay;
  const currencyText = fiatStats?.coin || "USD";
  const formattedCurrency = formatCurrency({
    amount: 0,
    code: currencyText,
  });
  const currencySymbol = formattedCurrency[2];
  const saveTimeoutRef = useRef(null);
  return (
    <div id="displayOptionsContainer">
      <p>Balance Denomination</p>

      <div
        style={{ backgroundColor: Colors.dark.text, marginBottom: "20px" }}
        className="backgroundContainer"
      >
        <p className="denominationLabelText">Current denomination</p>
        <div
          onClick={() => {
            if (masterInfoObject.userBalanceDenomination === "sats")
              handleDBStateChange(
                { userBalanceDenomination: "fiat" },
                setMasterInfoObject,
                toggleMasterInfoObject,
                saveTimeoutRef
              );
            else if (masterInfoObject.userBalanceDenomination === "fiat")
              handleDBStateChange(
                { userBalanceDenomination: "hidden" },
                setMasterInfoObject,
                toggleMasterInfoObject,
                saveTimeoutRef
              );
            else
              handleDBStateChange(
                { userBalanceDenomination: "sats" },
                setMasterInfoObject,
                toggleMasterInfoObject,
                saveTimeoutRef
              );
          }}
          style={{ backgroundColor: Colors.light.background }}
          className="denominationContainer"
        >
          <p style={{ color: Colors.light.blue }}>
            {masterInfoObject.userBalanceDenomination === "sats"
              ? BITCOIN_SATS_ICON
              : masterInfoObject.userBalanceDenomination === "fiat"
              ? formattedCurrency[2]
              : "*"}
          </p>
        </div>
      </div>
      <div
        style={{ backgroundColor: Colors.dark.text }}
        className="backgroundContainer"
      >
        <p className="denominationLabelText">
          How to display {BITCOIN_SAT_TEXT}
        </p>
        <div
          onClick={() => {
            if (masterInfoObject.satDisplay === "symbol") return;
            toggleMasterInfoObject({ satDisplay: "symbol" });
          }}
          style={{
            backgroundColor:
              satDisplay !== "word"
                ? Colors.light.blue
                : Colors.light.background,
            marginLeft: "auto",
            marginRight: "10px",
          }}
          className="denominationContainer"
        >
          <p
            style={{
              color:
                satDisplay !== "word" ? Colors.dark.text : Colors.light.blue,
            }}
          >
            {masterInfoObject.userBalanceDenomination !== "fiat"
              ? BITCOIN_SATS_ICON
              : currencySymbol}
          </p>
        </div>
        <div
          onClick={() => {
            if (masterInfoObject.satDisplay === "word") return;
            toggleMasterInfoObject({ satDisplay: "word" });
          }}
          style={{
            backgroundColor:
              satDisplay === "word"
                ? Colors.light.blue
                : Colors.light.background,
          }}
          className="denominationContainer"
        >
          <p
            style={{
              color:
                satDisplay === "word" ? Colors.dark.text : Colors.light.blue,
            }}
          >
            {masterInfoObject.userBalanceDenomination !== "fiat"
              ? "Sats"
              : currencyText}
          </p>
        </div>
      </div>
      <p className="exampleText">Example</p>
      <FormattedSatText balance={50} />
    </div>
  );
}
