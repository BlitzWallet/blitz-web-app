import { Colors } from "../../constants/theme";
import { useTranslation } from "react-i18next";
import { useSpark } from "../../contexts/sparkContext";
import ThemeText from "../../components/themeText/themeText";
import { INFINITY_SYMBOL, TOKEN_TICKER_MAX_LENGTH } from "../../constants";
import formatBalanceAmount from "../formatNumber";
import useThemeColors from "../../hooks/useThemeColors";
import copyToClipboard from "../copyToClipboard";
import { formatTokensNumber } from "./formatTokensBalance";
import "./tokenHalfModalStyle.css";
import { useOverlay } from "../../contexts/overlayContext";

export default function LRC20TokenInformation({ theme, darkModeType, params }) {
  const { openOverlay } = useOverlay();
  const { sparkInformation } = useSpark();
  const selectedToken = sparkInformation.tokens?.[params?.tokenIdentifier];
  const { balance, tokenMetadata } = selectedToken;

  const { backgroundOffset, backgroundColor } = useThemeColors();

  const { t } = useTranslation();

  return (
    <div className="tokenHalfModalDataContainer">
      <ThemeText
        className={"titleText"}
        textContent={tokenMetadata.tokenName?.toUpperCase()}
      />

      <div
        className="tokenHalfModalDataInnerContainer"
        style={{
          backgroundColor: theme
            ? darkModeType
              ? backgroundColor
              : backgroundOffset
            : Colors.dark.text,
        }}
      >
        <div
          className="itemRow"
          style={{
            borderBottomColor: theme
              ? darkModeType
                ? backgroundOffset
                : backgroundColor
              : backgroundColor,
          }}
        >
          <ThemeText
            textStyles={{ marginRight: 5 }}
            textContent={t("screens.inAccount.lrc20TokenDataHalfModal.balance")}
          />
          <ThemeText
            className={"textItem"}
            textContent={formatBalanceAmount(
              formatTokensNumber(balance, tokenMetadata?.decimals),
              true
            )}
          />
        </div>
        <div
          className={"itemRow"}
          style={{
            borderBottomColor: theme
              ? darkModeType
                ? backgroundOffset
                : backgroundColor
              : backgroundColor,
          }}
        >
          <ThemeText
            textStyles={{ marginRight: 5 }}
            textContent={t(
              "screens.inAccount.lrc20TokenDataHalfModal.maxSupply"
            )}
          />
          <ThemeText
            className={"textItem"}
            textContent={
              !tokenMetadata.maxSupply
                ? INFINITY_SYMBOL
                : formatBalanceAmount(
                    formatTokensNumber(
                      tokenMetadata.maxSupply,
                      tokenMetadata?.decimals
                    ),
                    true
                  )
            }
          />
        </div>
        <div
          className={"itemRow"}
          style={{
            borderBottomColor: theme
              ? darkModeType
                ? backgroundOffset
                : backgroundColor
              : backgroundColor,
          }}
        >
          <ThemeText
            textStyles={{ marginRight: 5 }}
            textContent={t(
              "screens.inAccount.lrc20TokenDataHalfModal.tokenTicker"
            )}
          />
          <ThemeText
            className={"textItem"}
            textContent={tokenMetadata.tokenTicker
              ?.toUpperCase()
              .slice(0, TOKEN_TICKER_MAX_LENGTH)}
          />
        </div>
        <div
          className={"itemRow"}
          style={{
            borderBottomWidth: 0,
          }}
        >
          <ThemeText
            textStyles={{ marginRight: 5 }}
            textContent={t(
              "screens.inAccount.lrc20TokenDataHalfModal.tokenPubKey"
            )}
          />

          <ThemeText
            className={"textItem"}
            clickFunction={() => {
              copyToClipboard(tokenMetadata.tokenPublicKey, openOverlay);
            }}
            textContent={tokenMetadata.tokenPublicKey}
          />
        </div>
      </div>
    </div>
  );
}
