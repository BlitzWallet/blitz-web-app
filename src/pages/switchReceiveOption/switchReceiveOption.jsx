import { useEffect, useState } from "react";
import {
  bitcoinReceiveIcon,
  blockstreamLiquid,
  lightningReceiveIcon,
  rootstockLogo,
  smallArrowLeft,
  sparkAsteriskWhite,
} from "../../constants/icons";
import ThemeText from "../../components/themeText/themeText";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import "./style.css";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useAppStatus } from "../../contexts/appStatus";
import { useActiveCustodyAccount } from "../../contexts/activeAccount";
import { useKeysContext } from "../../contexts/keysContext";
import { useNavigate } from "react-router-dom";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import { useNodeContext } from "../../contexts/nodeContext";
import { useOverlay } from "../../contexts/overlayContext";
import { ArrowDown } from "lucide-react";
import { Colors } from "../../constants/theme";

const MAIN_PAYMENTS = [
  ["Lightning", "Instant"],
  ["Bitcoin", "~ 10 minutes"],
  ["Spark", "Instant"],
  ["Liquid", "~ 1 minute"],
  // ["Rootstock", "~ 1 minute"],
];

export default function SwitchReceiveOption({ params }) {
  const { openOverlay, closeOverlay } = useOverlay();
  const onClose = closeOverlay;
  const navigate = useNavigate();
  const { fiatStats } = useNodeContext();
  const { currentWalletMnemonic } = useActiveCustodyAccount();
  const { accountMnemoinc } = useKeysContext();
  const { minMaxLiquidSwapAmounts } = useAppStatus();
  const { theme, darkModeType } = useThemeContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const { t } = useTranslation();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const isLRC20Enabled = masterInfoObject?.lrc20Settings?.isEnabled;

  const didWarnLiquid = params?.didWarnLiquid;
  const didWarnSpark = params?.didWarnSpark;
  const didWarnRootstock = params?.didWarnRootstock;

  useEffect(() => {
    if (!didWarnSpark && !didWarnLiquid && !didWarnRootstock) return;
    handleGoBack(
      didWarnLiquid ? "Liquid" : didWarnSpark ? "Spark" : "Rootstock"
    );
  }, [didWarnSpark, didWarnLiquid, didWarnRootstock]);

  const handleGoBack = (selectedOption) => {
    onClose();
    setTimeout(() => {
      navigate("/receive", {
        state: {
          receiveOption: selectedOption,
          amount: 0,
          description: "",
        },
        replace: true,
      });
    }, 200);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClick = (selectedOption) => {
    if (selectedOption === "Spark" && !isLRC20Enabled) {
      openOverlay({
        for: "informationPopup",
        textContent: t(
          "wallet.receivePages.switchReceiveOptionPage.sparkWarningMessage"
        ),
        buttonText: t("constants.understandText"),
        customNavigation: () => {
          console.log("runninghere");
          openOverlay({
            for: "halfModal",
            contentType: "switchReceiveOptions",
            params: {
              didWarnSpark: true,
            },
          });
        },
      });
      return;
    } else if (selectedOption === "Liquid") {
      openOverlay({
        for: "informationPopup",
        textContent:
          t("wallet.receivePages.switchReceiveOptionPage.swapWarning", {
            amount: displayCorrectDenomination({
              amount: minMaxLiquidSwapAmounts.min,
              masterInfoObject,
              fiatStats,
            }),
            swapType: "Liquid",
          }) +
          `${currentWalletMnemonic !== accountMnemoinc ? "\n\n" : ""}${
            currentWalletMnemonic !== accountMnemoinc
              ? t(
                  "wallet.receivePages.switchReceiveOptionPage.notUsingMainAccountWarning",
                  {
                    swapType: "Liquid",
                  }
                )
              : ""
          }`,
        buttonText: t("constants.understandText"),
        customNavigation: () => {
          console.log("runninghere");
          openOverlay({
            for: "halfModal",
            contentType: "switchReceiveOptions",
            params: {
              didWarnLiquid: true,
            },
          });
        },
      });

      return;
    } else if (selectedOption === "Rootstock") {
      const warningText = `Minimum swap amount is ${
        minMaxLiquidSwapAmounts.rsk.min + 1000
      } sats for Rootstock.${
        currentWalletMnemonic !== accountMnemoinc
          ? "\n\nYou are not using your main account for Rootstock swaps."
          : ""
      }`;

      if (navigate) {
        navigate("InformationPopup", {
          textContent: warningText,
          buttonText: "I Understand",
          customNavigation: () =>
            navigate("switchReceiveOption", { didWarnRootstock: true }),
        });
      }
      return;
    }
    handleGoBack(selectedOption);
  };

  const paymentTypes = MAIN_PAYMENTS.map((item, index) => {
    const [name] = item;
    return (
      <button
        key={name}
        onClick={() => handleClick(name)}
        className="receiveItemContainer"
        style={{
          backgroundColor:
            theme && darkModeType ? backgroundColor : backgroundOffset,
          marginBottom: index !== 4 ? "20px" : 0,
        }}
      >
        <div
          className="logoContainer"
          style={{
            backgroundColor: theme
              ? darkModeType
                ? backgroundOffset
                : backgroundColor
              : "var(--primaryBlue)",
          }}
        >
          <img
            className="receiveLogo"
            src={
              name === "Lightning"
                ? lightningReceiveIcon
                : name === "Bitcoin"
                ? bitcoinReceiveIcon
                : name === "Spark"
                ? sparkAsteriskWhite
                : name === "Liquid"
                ? blockstreamLiquid
                : rootstockLogo
            }
            alt={name}
          />
        </div>
        <div className="itemTextContiner">
          <ThemeText
            textContent={
              name === "Lightning"
                ? "Lightning Network"
                : name === "Bitcoin"
                ? "On-Chain"
                : name === "Liquid"
                ? "Liquid Network"
                : name === "Spark"
                ? "Spark"
                : "Rootstock"
            }
          />
          <ThemeText
            textStyles={{ opacity: 0.7, fontSize: "0.75rem" }}
            textContent={
              name === "Lightning"
                ? t("constants.instant")
                : name === "Bitcoin"
                ? t("wallet.receivePages.switchReceiveOptionPage.tenMinutes", {
                    numMins: 10,
                  })
                : name === "Liquid"
                ? t("wallet.receivePages.switchReceiveOptionPage.oneMinute", {
                    numMins: 1,
                  })
                : name === "Spark"
                ? t("constants.instant")
                : t("wallet.receivePages.switchReceiveOptionPage.tenMinutes", {
                    numMins: 3,
                  })
            }
          />
        </div>
      </button>
    );
  });

  return (
    <div className="receiveItemsContainer">
      <ThemeText
        textStyles={{ marginTop: 10, marginBottom: 20 }}
        textContent={t("wallet.receivePages.switchReceiveOptionPage.title")}
      />

      {paymentTypes.slice(0, isLRC20Enabled ? 3 : 2)}

      <button className="moreOptionsButton" onClick={toggleExpanded}>
        <ThemeText
          textContent={t(
            "wallet.receivePages.switchReceiveOptionPage.actionBTN",
            {
              action: isExpanded
                ? t("constants.lessLower")
                : t("constants.moreLower"),
            }
          )}
        />
        <ArrowDown
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
          size={15}
          style={{
            marginLeft: "5px",
            transform: `rotate(${isExpanded ? 180 : 0}deg)`,
            transition: "transform 0.3s ease",
          }}
        />
      </button>

      <div
        style={{
          width: "100%",
          maxHeight: isExpanded ? `${contentHeight}px` : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <div
          ref={(el) => {
            if (el && contentHeight === 0) {
              setContentHeight(el.scrollHeight);
            }
          }}
          style={{ width: "100%" }}
        >
          {paymentTypes.slice(isLRC20Enabled ? 3 : 2)}
        </div>
      </div>
    </div>
  );
}
