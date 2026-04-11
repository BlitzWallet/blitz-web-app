import { useEffect } from "react";
import TransactionContanier from "../../components/transactionContainer/transactionContianer";
import { useAppStatus } from "../../contexts/appStatus";
import UserBalance from "./components/balanceContainer/userBalanceContainer";
import WalletNavBar from "./components/nav/nav";
import SendAndRequestBtns from "./components/sendAndRequestBTNS/sendAndRequstBtns";
import "./wallet.css";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import useThemeColors from "../../hooks/useThemeColors";
import SafeAreaComponent from "../../components/safeAreaContainer";
import LRC20Assets from "./components/lrc20Assets";
import { useOverlay } from "../../contexts/overlayContext";
import { useSpark } from "../../contexts/sparkContext";
import ThemeText from "../../components/themeText/themeText";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function WalletHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { sparkInformation } = useSpark();
  const { openOverlay } = useOverlay();
  const { masterInfoObject } = useGlobalContextProvider();
  const { backgroundColor, backgroundOffset } = useThemeColors();
  const { toggleDidGetToHomepage } = useAppStatus();
  const { textColor } = useThemeColors();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;

  useEffect(() => {
    toggleDidGetToHomepage(true);
  }, []);

  return (
    <SafeAreaComponent
      addedClassName={"customWalletHomeStyle"}
      backgroundColor={didEnabledLrc20 ? backgroundOffset : "transparent"}
      customStyles={{ paddingTop: 0, width: "100%" }}
    >
      <div id="walletHomeContainer">
        <div
          style={{
            backgroundColor: didEnabledLrc20 ? backgroundColor : "transparent",
          }}
          className="lrc20Overlay"
        >
          <div className="lrc20ContentContiner">
            <WalletNavBar
              didEnabledLrc20={didEnabledLrc20}
              openOverlay={openOverlay}
            />
            <UserBalance />
            <SendAndRequestBtns openOverlay={openOverlay} />
            {didEnabledLrc20 && <LRC20Assets openOverlay={openOverlay} />}
          </div>
        </div>

        <div style={{ background: backgroundOffset }} className="txsContainer">
          {sparkInformation.transactions.length > 1 && (
            <div
              className="viewAllContainer"
              onClick={() => navigate("/viewAllTransactions")}
            >
              <ThemeText
                textContent={t("wallet.homeLightning.home.activity")}
              />
              <div
                style={{
                  opacity: 0.5,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ThemeText
                  textStyles={{ fontSize: ".8rem" }}
                  textContent={t("settings.hub.viewAll")}
                />
                <ChevronRight size={15} color={textColor} />
              </div>
            </div>
          )}

          <TransactionContanier frompage={"home"} />
        </div>
      </div>
    </SafeAreaComponent>
  );
}
