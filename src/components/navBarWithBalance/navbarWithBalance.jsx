import { useNavigate } from "react-router-dom";
import "./navBarWithBalance.css";
import { ArrowLeft, Wallet2 } from "lucide-react";
import { useThemeContext } from "../../contexts/themeContext";
import { Colors } from "../../constants/theme";
import FormattedSatText from "../formattedSatText/formattedSatText";
import { useSpark } from "../../contexts/sparkContext";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";

export default function NavBarWithBalance({
  backFunction,
  seletctedToken,
  selectedLRC20Asset = "Bitcoin",
  showBalance = true,
}) {
  const { theme, darkModeType } = useThemeContext();
  const navigate = useNavigate();
  const { sparkInformation } = useSpark();
  const balance = seletctedToken?.balance || sparkInformation.balance;

  const formattedTokensBalance =
    selectedLRC20Asset !== "Bitcoin"
      ? formatTokensNumber(balance, seletctedToken?.tokenMetadata?.decimals)
      : balance;

  const handleBack = () => {
    if (backFunction) {
      backFunction();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="nav-bar-top-bar">
      <button className="nav-bar-back-arrow" onClick={handleBack}>
        <ArrowLeft
          size={30}
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      </button>

      {showBalance && (
        <div className="nav-bar-container">
          <Wallet2
            size={25}
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
            style={{ marginRight: 5 }}
          />
          <FormattedSatText
            balance={
              selectedLRC20Asset !== "Bitcoin"
                ? Number(formattedTokensBalance).toFixed(
                    formattedTokensBalance < 1 ? 4 : 2
                  )
                : balance
            }
            useCustomLabel={
              seletctedToken?.tokenMetadata?.tokenTicker !== "Bitcoin" &&
              seletctedToken?.tokenMetadata?.tokenTicker !== undefined
            }
            customLabel={seletctedToken?.tokenMetadata?.tokenTicker}
            useMillionDenomination={true}
            useSizing={true}
            styles={{ margin: 0, lineHeight: 1 }}
          />
        </div>
      )}
    </div>
  );
}
