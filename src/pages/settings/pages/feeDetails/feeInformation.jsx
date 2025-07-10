import React, { useMemo, useState, useRef } from "react";
import "./feeDetails.css";

// import GetThemeColors from "../../../../hooks/themeColors";
// import { CENTER, COLORS, SIZES } from "../../../../constants";

// import { FONT, INSET_WINDOW_WIDTH } from "../../../../constants/theme";
// import displayCorrectDenomination from "../../../../functions/displayCorrectDenomination";

import ThemeText from "../../../../components/themeText/themeText";
import { useNodeContext } from "../../../../contexts/nodeContext";
import {
  bitcoinBrackets,
  lightningBrackets,
  sparkBrackets,
} from "../../../../functions/spark/calculateSupportFee";
import displayCorrectDenomination from "../../../../functions/displayCorrectDenomination";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { Colors } from "../../../../constants/theme";
import { INSET_WINDOW_WIDTH } from "../../../../constants";

export default function BlitzFeeInformation() {
  const { fiatStats } = useNodeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { theme, darkModeType } = { theme: false, darkModeType: false }; // useGlobalThemeContext();
  //   const { textColor } = GetThemeColors();
  const [paymentType, setPaymentType] = useState("lightning");
  const [minHeight, setMinHeight] = useState(0);

  const timeFrameElements = useMemo(() => {
    return ["lightning", "spark", "bitcoin"].map((item) => (
      <button
        key={item}
        onClick={() => setPaymentType(item)}
        style={{
          backgroundColor:
            item === paymentType
              ? theme && darkModeType
                ? Colors.dark.text
                : Colors.light.blue
              : "transparent",
          borderColor:
            theme && darkModeType ? Colors.dark.text : Colors.light.blue,
          borderWidth: "2px",
          borderStyle: "solid",
          borderRadius: "8px",
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
        }}
      >
        <ThemeText
          textStyles={{
            color:
              item === paymentType
                ? theme && darkModeType
                  ? Colors.light.text
                  : Colors.dark.text
                : Colors.light.text, //textColor,
            textTransform: "capitalize",
            padding: 10,
          }}
          textContent={item}
        />
      </button>
    ));
  }, [
    paymentType,
    // textColor,
    theme,
    darkModeType,
  ]);

  return (
    <div id="feeDetails">
      <ThemeText
        textStyles={{ textAlign: "center", marginBottom: 20 }}
        textContent={`Blitz Wallet offers free and open‑source products for the Bitcoin community.`}
      />
      <ThemeText
        textStyles={{ textAlign: "center", marginBottom: 20 }}
        textContent={`To help keep the project sustainable, we’ve added a small transaction fee to each payment.`}
      />
      <ThemeText
        textStyles={{ textAlign: "center", marginBottom: 30 }}
        textContent={`Here’s how those fees are distributed:`}
      />

      <GridSection
        title="Lightning"
        bracket={
          paymentType === "lightning"
            ? lightningBrackets
            : paymentType === "spark"
            ? sparkBrackets
            : bitcoinBrackets
        }
        color={"#F7931A"}
        setMinHeight={setMinHeight}
        minHeight={minHeight}
        masterInfoObject={masterInfoObject}
        fiatStats={fiatStats}
      />

      <div className="timeFrameElementsContainer">{timeFrameElements}</div>
    </div>
  );
}

function GridSection({
  bracket,
  setMinHeight,
  minHeight,
  masterInfoObject,
  fiatStats,
}) {
  //   const { backgroundOffset } = GetThemeColors();

  return (
    <div
      className="gridContainer"
      ref={(el) => {
        if (el && el.clientHeight && minHeight === 0) {
          setMinHeight(el.clientHeight);
        }
      }}
    >
      <div
        className="gridRow"
        style={{
          backgroundColor: Colors.light.backgroundOffset, // backgroundOffset,
        }}
      >
        <ThemeText textStyles={headerCellStyle} textContent={"Up To"} />
        <ThemeText textStyles={headerCellStyle} textContent={"Fixed Fee"} />
        <ThemeText textStyles={headerCellStyle} textContent={"Percent"} />
      </div>

      {bracket.map((br, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "row",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <ThemeText
            className={"dataCell"}
            textContent={
              br.upTo === Infinity
                ? "No limit"
                : displayCorrectDenomination({
                    amount: br.upTo,
                    masterInfoObject,
                    fiatStats,
                  })
            }
          />
          <ThemeText
            className={"dataCell"}
            textContent={displayCorrectDenomination({
              amount: br.fixedFee,
              masterInfoObject,
              fiatStats,
            })}
          />
          <ThemeText
            className={"dataCell"}
            textContent={`${(br.percentage * 100).toFixed(1)}%`}
          />
        </div>
      ))}
    </div>
  );
}

// Styles
const headerCellStyle = {
  padding: 10,
  width: "33.33%",
  flexShrink: 1,
  textAlign: "center",
};
