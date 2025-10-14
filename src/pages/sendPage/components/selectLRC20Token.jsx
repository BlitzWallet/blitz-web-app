import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import "./selectLRC20Token.css"; // we'll define styles here
import { useThemeContext } from "../../../contexts/themeContext";
import useThemeColors from "../../../hooks/useThemeColors";
import ThemeText from "../../../components/themeText/themeText";
import CustomInput from "../../../components/customInput/customInput";
import FormattedSatText from "../../../components/formattedSatText/formattedSatText";
import { Colors } from "../../../constants/theme";
import { formatTokensNumber } from "../../../functions/lrc20/formatTokensBalance";
import CustomSettingsNavbar from "../../../components/customSettingsNavbar";

export default function SelectLRC20Token({
  navigate,
  sparkInformation,
  goBackFunction,
  setSelectedToken,
}) {
  const [searchInput, setSearchInput] = useState("");
  const assetsAvailable = Object.entries(sparkInformation.tokens);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { t } = useTranslation();

  const handleSearch = (term) => setSearchInput(term);

  const selectToken = (token) => setSelectedToken(token);

  const filteredData = [
    [
      "Bitcoin",
      {
        balance: sparkInformation.balance,
        tokenMetadata: {
          tokenTicker: "Bitcoin",
          tokenName: "Bitcoin",
        },
      },
    ],
    ...assetsAvailable,
  ].filter(([_, data]) => {
    const name = data?.tokenMetadata?.tokenName?.toLowerCase() || "";
    const ticker = data?.tokenMetadata?.tokenTicker?.toLowerCase() || "";
    const search = searchInput.toLowerCase();
    return name.startsWith(search) || ticker.startsWith(search);
  });

  const AssetItem = useCallback(
    ({ item }) => {
      const [tokenIdentifier, details] = item;
      const isBitcoin = details?.tokenMetadata?.tokenTicker === "Bitcoin";

      return (
        <div
          className="asset-container"
          style={{
            backgroundColor: theme
              ? darkModeType
                ? backgroundColor
                : backgroundOffset
              : Colors.dark.text,
          }}
          onClick={() =>
            selectToken({
              tokenName: tokenIdentifier,
              details,
            })
          }
        >
          <ThemeText
            textStyles={{ marginRight: "auto" }}
            textContent={
              isBitcoin
                ? details?.tokenMetadata?.tokenTicker
                : details?.tokenMetadata?.tokenTicker?.toUpperCase()
            }
          />
          <FormattedSatText
            balance={
              isBitcoin
                ? details?.balance
                : formatTokensNumber(
                    details?.balance,
                    details?.tokenMetadata?.decimals
                  )
            }
            useCustomLabel={!isBitcoin}
            customLabel=""
            useMillionDenomination={true}
          />
        </div>
      );
    },
    [theme, darkModeType, selectToken]
  );

  return (
    <>
      <CustomSettingsNavbar
        customBackFunction={goBackFunction}
        label={t("wallet.sendPages.selectLRC20Token.title")}
      />

      <div className="inner-container">
        <CustomInput
          containerStyles={{ maxWidth: "unset" }}
          placeholder={t("wallet.sendPages.selectLRC20Token.searchPlaceholder")}
          onchange={handleSearch}
          value={searchInput}
        />

        {filteredData.length ? (
          <div className="list-container">
            {filteredData.map((item) => (
              <AssetItem key={item[0]} item={item} />
            ))}
          </div>
        ) : (
          <ThemeText
            styles={{ textAlign: "center", marginTop: 10 }}
            textContent={t(
              "wallet.sendPages.selectLRC20Token.noTokensFoundText"
            )}
          />
        )}
      </div>
    </>
  );
}
