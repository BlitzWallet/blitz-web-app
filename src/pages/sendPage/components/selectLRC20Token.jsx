import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import "./selectLRC20Token.css";
import CustomInput from "../../../components/customInput/customInput";
import FormattedSatText from "../../../components/formattedSatText/formattedSatText";
import ThemeIcon from "../../../components/themeIcon";
import ThemeText from "../../../components/themeText/themeText";
import { USDB_TOKEN_ID } from "../../../constants";
import { Colors } from "../../../constants/theme";
import { useSpark } from "../../../contexts/sparkContext";
import { useThemeContext } from "../../../contexts/themeContext";
import { formatTokensNumber } from "../../../functions/lrc20/formatTokensBalance";
import useThemeColors from "../../../hooks/useThemeColors";

export default function SelectLRC20Token({
  setIsKeyboardActive,
  goBackFunction,
  setSelectedToken,
}) {
  const { sparkInformation, tokensImageCache } = useSpark();
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");

  const assetsAvailable = sparkInformation?.tokens
    ? Object.entries(sparkInformation.tokens)
    : [];

  const filteredData = useMemo(() => {
    const priorityToken = USDB_TOKEN_ID;
    const search = searchInput.toLowerCase();
    const bitcoin = [
      "Bitcoin",
      {
        balance: sparkInformation?.balance,
        tokenMetadata: {
          tokenTicker: "Bitcoin",
          tokenName: "Bitcoin",
        },
      },
    ];

    let priorityAsset = null;
    const otherAssets = [];

    for (const asset of assetsAvailable) {
      const [tokenIdentifier, details] = asset;
      const ticker = details?.tokenMetadata?.tokenTicker?.toLowerCase();
      const name = details?.tokenMetadata?.tokenName?.toLowerCase();

      if (ticker?.startsWith(search) || name?.startsWith(search)) {
        if (tokenIdentifier === priorityToken) {
          priorityAsset = asset;
        } else {
          otherAssets.push(asset);
        }
      }
    }

    const bitcoinMatches =
      searchInput === "" || "bitcoin".startsWith(searchInput.toLowerCase());

    const result = [];
    if (bitcoinMatches) result.push(bitcoin);
    if (priorityAsset) result.push(priorityAsset);
    result.push(...otherAssets);

    return result;
  }, [assetsAvailable, searchInput, sparkInformation?.balance]);

  const handleSelectToken = (tokenIdentifier, details) => {
    if (setSelectedToken) {
      setSelectedToken({
        tokenName: tokenIdentifier,
        details,
      });
      return;
    }

    goBackFunction?.();
  };

  return (
    <div className="select-lrc20-token">
      <CustomInput
        containerClassName="select-lrc20-token__search"
        containerStyles={{ maxWidth: "unset" }}
        placeholder={t("wallet.sendPages.selectLRC20Token.searchPlaceholder")}
        onchange={setSearchInput}
        value={searchInput}
        onFocus={() => setIsKeyboardActive?.(true)}
        onBlur={() => setIsKeyboardActive?.(false)}
      />

      {filteredData.length ? (
        <div className="select-lrc20-token__list">
          {filteredData.map(([tokenIdentifier, details]) => {
            const imageUri = tokensImageCache?.[tokenIdentifier];
            const isBitcoin = tokenIdentifier === "Bitcoin";
            const ticker = details?.tokenMetadata?.tokenTicker;
            const tokenLabel = isBitcoin ? ticker : ticker?.toUpperCase();

            return (
              <button
                key={tokenIdentifier}
                type="button"
                className="select-lrc20-token__asset"
                style={{
                  backgroundColor: theme
                    ? darkModeType
                      ? backgroundColor
                      : backgroundOffset
                    : Colors.dark.text,
                }}
                onClick={() => handleSelectToken(tokenIdentifier, details)}
              >
                <div
                  className="select-lrc20-token__avatar"
                  style={{
                    backgroundColor: imageUri
                      ? "transparent"
                      : theme && darkModeType
                        ? Colors.dark.text
                        : isBitcoin
                          ? Colors.constants.bitcoinOrange
                          : Colors.constants.blue,
                  }}
                >
                  {isBitcoin ? (
                    <img
                      className="select-lrc20-token__bitcoin-icon"
                      src="/icons/bitcoinIcon.png"
                      alt="Bitcoin"
                    />
                  ) : imageUri ? (
                    <img
                      className="select-lrc20-token__token-image"
                      src={imageUri}
                      alt={tokenIdentifier}
                    />
                  ) : (
                    <ThemeIcon
                      colorOverride={
                        theme && darkModeType
                          ? Colors.light.text
                          : Colors.dark.text
                      }
                      size={24}
                      iconName="Coins"
                    />
                  )}
                </div>

                <div>
                  <ThemeText
                    className="select-lrc20-token__ticker"
                    textStyles={{ margin: 0 }}
                    textContent={tokenLabel}
                  />

                  <FormattedSatText
                    balance={
                      isBitcoin
                        ? details?.balance
                        : formatTokensNumber(
                            details?.balance,
                            details?.tokenMetadata?.decimals,
                          )
                    }
                    useCustomLabel={!isBitcoin}
                    customLabel=""
                    useMillionDenomination={true}
                    neverHideBalance={true}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <ThemeText
          className="select-lrc20-token__empty"
          textStyles={{ marginTop: 10, textAlign: "center" }}
          textContent={t("wallet.sendPages.selectLRC20Token.noTokensFoundText")}
        />
      )}
    </div>
  );
}
