import { useNavigate } from "react-router-dom";
import "./login.css";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { useOverlay } from "../../contexts/overlayContext";
import { useEffect } from "react";

function Home() {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setMnemoinc, mnemoinc } = useAuth();

  const generateSeed = () => {
    try {
      let generatedMnemonic = generateMnemonic(wordlist);
      const unuiqueKeys = new Set(generatedMnemonic.split(" "));

      if (unuiqueKeys.size !== 12) {
        let runCount = 0;
        let didFindValidMnemoinc = false;
        while (runCount < 50 && !didFindValidMnemoinc) {
          console.log(`Running retry for account mnemoinc count: ${runCount}`);
          runCount += 1;
          const newTry = generateMnemonic(wordlist);
          const uniqueItems = new Set(newTry.split(" "));
          if (uniqueItems.size != 12) continue;
          didFindValidMnemoinc = true;
          generatedMnemonic = newTry;
        }
      }
      setMnemoinc(generatedMnemonic);
    } catch (err) {
      openOverlay({
        for: "error",
        errorMessage: err.message,
      });
      console.log("Error generating seed", err);
    }
  };
  useEffect(() => {
    if (mnemoinc) return;
    generateSeed();
  }, [mnemoinc]);

  return (
    <div className="loginComponenet">
      <h1>Blitz</h1>
      <div className="buttonContainer">
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() =>
            navigate("/disclaimer", {
              state: {
                nextPageName: "/createPassword",
              },
            })
          }
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={t("createAccount.homePage.buttons.button2")}
        />
        <CustomButton
          buttonClassName={"actionButton"}
          actionFunction={() =>
            navigate("/disclaimer", {
              state: {
                nextPageName: "/restore",
              },
            })
          }
          textContent={t("createAccount.homePage.buttons.button1")}
        />
      </div>
      <p>{t("createAccount.homePage.subtitle")}</p>
    </div>
  );
}

export default Home;
