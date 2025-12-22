import "./style.css";
import BackArrow from "../../components/backArrow/backArrow";
import { useEffect, useRef, useState } from "react";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { KeyContainer } from "../../components/keyContainer/keyContainer";
import { useLocation, useNavigate } from "react-router-dom";
import copyToClipboard from "../../functions/copyToClipboard";
import { useAuth } from "../../contexts/authContext";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useTranslation } from "react-i18next";
import useThemeColors from "../../hooks/useThemeColors";
import ThemeText from "../../components/themeText/themeText";
import PageNavBar from "../../components/navBar/navBar";
import { useOverlay } from "../../contexts/overlayContext";

function CreateSeed() {
  const { openOverlay } = useOverlay();
  const { t } = useTranslation();
  const { mnemoinc, setMnemoinc } = useAuth();
  const seed = mnemoinc?.split(" ");
  const navigate = useNavigate();
  const location = useLocation();
  const [showSeed, setShowSeed] = useState(false);

  const { backgroundColor } = useThemeColors();
  const keyContainerRef = useRef(null);

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
    <div className="seedContainer">
      <PageNavBar />
      <p className="headerInfoText">
        {t("createAccount.keySetup.generateKey.header")}
      </p>

      <div className="keyContainerWrapper" ref={keyContainerRef}>
        <KeyContainer keys={seed} />

        {!showSeed && (
          <div
            className="seedOverlayContainer"
            style={{
              backgroundColor: backgroundColor,
            }}
          >
            <div
              className="seedOverlayContentContainer"
              style={{ backgroundColor: Colors.dark.text }}
            >
              <ThemeText
                textContent={t(
                  "createAccount.keySetup.generateKey.seedPrivacyMessage"
                )}
              />
              <CustomButton
                actionFunction={() => setShowSeed(true)}
                textContent={t("createAccount.keySetup.generateKey.showIt")}
                buttonStyles={{
                  backgroundColor: backgroundColor,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <p className="firstWarningText">
        {t("createAccount.keySetup.generateKey.subHeader")}
      </p>
      <p className="secondWarningText">
        {t("createAccount.keySetup.generateKey.disclaimer")}
      </p>

      <div className="buttonsContainer">
        <CustomButton
          actionFunction={() =>
            copyToClipboard(seed.join(" "), openOverlay, location)
          }
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={"Copy"}
        />
        <CustomButton
          actionFunction={() =>
            navigate("/createPassword", {
              state: { mnemoinc: seed.join(" ") },
            })
          }
          textContent={"Next"}
        />
      </div>
    </div>
  );
}

export default CreateSeed;
