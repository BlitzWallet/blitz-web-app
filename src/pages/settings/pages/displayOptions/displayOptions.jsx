import { useRef } from "react";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { BITCOIN_SAT_TEXT, BITCOIN_SATS_ICON } from "../../../../constants";
import { Colors } from "../../../../constants/theme";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { formatCurrency } from "../../../../functions/formatCurrency";
import handleDBStateChange from "../../../../functions/handleDBStateChange";
import "./displayOptions.css";
import DiscreteSlider from "../../../../components/slider/slider";
import ThemeText from "../../../../components/themeText/themeText";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import CheckCircle from "../../../../components/checkCircle/checkCircle";

export default function DisplayOptions() {
  const { toggleMasterInfoObject, setMasterInfoObject, masterInfoObject } =
    useGlobalContextProvider();
  const { theme, darkModeType, toggleDarkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();
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
      <ThemeText textContent={"Theme"} />

      <div
        onClick={() => {
          if (darkModeType) return;
          toggleDarkModeType(!darkModeType);
        }}
        className="themeRow"
      >
        <ThemeText textContent={"Lights out"} />
        <CheckCircle isActive={darkModeType} />
      </div>
      <div
        onClick={() => {
          if (!darkModeType) return;
          toggleDarkModeType(!darkModeType);
        }}
        className="themeRow"
      >
        <ThemeText textContent={"Dim"} />
        <CheckCircle isActive={!darkModeType} />
      </div>

      <ThemeText textContent={"Balance Denomination"} />

      <div
        style={{
          backgroundColor: theme ? backgroundOffset : Colors.dark.text,
          marginBottom: "20px",
        }}
        className="backgroundContainer"
      >
        <ThemeText
          className={"denominationLabelText"}
          textContent={"Current denomination"}
        />
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
          style={{
            backgroundColor: theme ? Colors.dark.text : Colors.light.background,
          }}
          className="denominationContainer"
        >
          <ThemeText
            textStyles={{
              color:
                theme && darkModeType
                  ? Colors.lightsout.background
                  : Colors.light.blue,
            }}
            textContent={
              masterInfoObject.userBalanceDenomination === "sats"
                ? BITCOIN_SATS_ICON
                : masterInfoObject.userBalanceDenomination === "fiat"
                ? formattedCurrency[2]
                : "*"
            }
          />
        </div>
      </div>
      <div
        style={{ backgroundColor: theme ? backgroundOffset : Colors.dark.text }}
        className="backgroundContainer"
      >
        <ThemeText
          className={"denominationLabelText"}
          textContent={` How to display ${BITCOIN_SAT_TEXT}`}
        />
        <div
          onClick={() => {
            if (masterInfoObject.satDisplay === "symbol") return;
            toggleMasterInfoObject({ satDisplay: "symbol" });
          }}
          style={{
            backgroundColor:
              satDisplay !== "word"
                ? theme && darkModeType
                  ? Colors.lightsout.background
                  : Colors.light.blue
                : theme
                ? Colors.dark.text
                : Colors.light.background,
            marginLeft: "auto",
            marginRight: "10px",
          }}
          className="denominationContainer"
        >
          <ThemeText
            textStyles={{
              color:
                satDisplay !== "word"
                  ? Colors.dark.text
                  : theme && darkModeType
                  ? Colors.lightsout.background
                  : Colors.light.blue,
            }}
            textContent={
              masterInfoObject.userBalanceDenomination !== "fiat"
                ? BITCOIN_SATS_ICON
                : currencySymbol
            }
          />
        </div>
        <div
          onClick={() => {
            if (masterInfoObject.satDisplay === "word") return;
            toggleMasterInfoObject({ satDisplay: "word" });
          }}
          style={{
            backgroundColor:
              satDisplay === "word"
                ? theme && darkModeType
                  ? Colors.lightsout.background
                  : Colors.light.blue
                : theme
                ? Colors.dark.text
                : Colors.light.background,
          }}
          className="denominationContainer"
        >
          <ThemeText
            textStyles={{
              color:
                satDisplay === "word"
                  ? Colors.dark.text
                  : theme && darkModeType
                  ? Colors.lightsout.background
                  : Colors.light.blue,
            }}
            textContent={
              masterInfoObject.userBalanceDenomination === "word"
                ? BITCOIN_SAT_TEXT
                : currencyText
            }
          />
        </div>
      </div>
      <ThemeText className={"exampleText"} textContent={"Example"} />
      <FormattedSatText balance={50} />
      <ThemeText textContent={"Home Screen"} />
      <ThemeText textContent={"Displayed Transactions"} />
      <DiscreteSlider
        toggleFunction={(value) => {
          console.log(value);
          toggleMasterInfoObject({ homepageTxPreferance: value });
        }}
        min={15}
        max={40}
        step={5}
        defaultValue={masterInfoObject.homepageTxPreferance}
        theme={theme}
        darkModeType={darkModeType}
        textColor={textColor}
      />
    </div>
  );
}
