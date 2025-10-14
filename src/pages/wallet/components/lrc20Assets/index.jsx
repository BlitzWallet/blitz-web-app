import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import "./style.css"; // ✅ External CSS
import ThemeText from "../../../../components/themeText/themeText";
import ThemeImage from "../../../../components/ThemeImage/themeImage";
import { smallArrowLeft } from "../../../../constants/icons";
import { formatTokensNumber } from "../../../../functions/lrc20/formatTokensBalance";
import {
  getContrastingTextColor,
  stringToColorCrypto,
} from "../../../../functions/randomColorFromHash";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import CustomInput from "../../../../components/customInput/customInput";
import formatBalanceAmount from "../../../../functions/formatNumber";
import { useSpark } from "../../../../contexts/sparkContext";
import { Colors } from "../../../../constants/theme";

export default function LRC20Assets({ openOverlay }) {
  const { darkModeType, theme } = useThemeContext();
  const { sparkInformation } = useSpark();
  const { textColor } = useThemeColors();
  const { t } = useTranslation();

  const homepageBackgroundOffsetColor = useMemo(() => {
    return theme
      ? darkModeType
        ? Colors.constants.walletHomeLightsOutOffset
        : Colors.constants.walletHomeDarkModeOffset
      : Colors.constants.walletHomeLightModeOffset;
  }, [theme, darkModeType]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableTokens = useMemo(() => {
    return Object.entries(sparkInformation.tokens || {});
  }, [sparkInformation.tokens]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return availableTokens;
    const query = searchQuery.toLowerCase();

    return availableTokens.filter(([tokenIdentifier, details]) => {
      const ticker = details?.tokenMetadata?.tokenTicker?.toLowerCase() || "";
      const identifier = tokenIdentifier.toLowerCase();
      return ticker.startsWith(query) || identifier.startsWith(query);
    });
  }, [availableTokens, searchQuery]);

  const tokens = useMemo(() => {
    return filteredTokens.map(([tokenIdentifier, details]) => {
      if (!tokenIdentifier || !details) return null;

      const backgroundColor = stringToColorCrypto(
        tokenIdentifier,
        theme && darkModeType ? "lightsout" : "light"
      );
      const contrastColor = getContrastingTextColor(backgroundColor);

      return (
        <div
          key={tokenIdentifier}
          className="token-row"
          style={{ backgroundColor: homepageBackgroundOffsetColor }}
          onClick={() =>
            openOverlay({
              for: "halfModal",
              contentType: "LRC20TokenInformation",
              params: {
                tokenIdentifier,
              },
            })
          }
        >
          <div className="token-initial" style={{ backgroundColor }}>
            <ThemeText
              textStyles={{ color: contrastColor }}
              textContent={details?.tokenMetadata?.tokenTicker[0]?.toUpperCase()}
            />
          </div>

          <div className="token-description">
            <ThemeText
              textStyles={{
                textTransform: "uppercase",
                maxWidth: "45%",
                margin: 0,
              }}
              textContent={details?.tokenMetadata?.tokenName}
            />
            <ThemeText
              textStyles={{ opacity: 0.7, margin: 0 }}
              textContent={`${tokenIdentifier.slice(
                0,
                6
              )}...${tokenIdentifier.slice(tokenIdentifier.length - 4)}`}
            />
          </div>

          <ThemeText
            textStyles={{ textTransform: "uppercase" }}
            textContent={formatBalanceAmount(
              formatTokensNumber(
                details?.balance,
                details?.tokenMetadata?.decimals
              ),
              true
            )}
          />
        </div>
      );
    });
  }, [filteredTokens, theme, darkModeType, homepageBackgroundOffsetColor]);

  return (
    <div className="lrc20-container">
      <button
        className="expand-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ThemeText
          textContent={t("wallet.homeLightning.lrc20Assets.actionText", {
            action: isExpanded ? t("constants.hide") : t("constants.show"),
          })}
        />
        <motion.div
          className="arrow-icon"
          animate={{ rotate: isExpanded ? 90 : -90 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ThemeImage
            styles={{ width: 15, height: 15 }}
            icon={smallArrowLeft}
          />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className="token-list-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height:
                Object.entries(sparkInformation.tokens || {}).length > 3
                  ? 220
                  : 150,
              opacity: 1,
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {availableTokens.length > 3 && (
              <CustomInput
                inputText={searchQuery}
                setInputText={setSearchQuery}
                containerStyles={{ marginBottom: 10 }}
                placeholderText={t(
                  "wallet.homeLightning.lrc20Assets.tokensSearchPlaceholder"
                )}
              />
            )}

            {!tokens.length ? (
              <ThemeText
                textStyles={{ textAlign: "center" }}
                textContent={
                  searchQuery
                    ? t("wallet.homeLightning.lrc20Assets.noTokensFoundText")
                    : t("wallet.homeLightning.lrc20Assets.noTokensText")
                }
              />
            ) : (
              tokens
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
