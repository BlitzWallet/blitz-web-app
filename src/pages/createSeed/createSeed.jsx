import "./style.css";
import BackArrow from "../../components/backArrow/backArrow";
import { useEffect, useState } from "react";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { KeyContainer } from "../../components/keyContainer/keyContainer";
import { useLocation, useNavigate } from "react-router-dom";
import copyToClipboard from "../../functions/copyToClipboard";
import { useAuth } from "../../contexts/authContext";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";

function CreateSeed({ openOverlay }) {
  const { mnemoinc, setMnemoinc } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const seed = mnemoinc?.split(" ");

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
      <BackArrow />
      <p className="headerInfoText">
        This is your password to your money, if you lose it you will lose your
        money!
      </p>

      <div className="keyContainerWrapper">
        <KeyContainer keys={seed} />
      </div>
      <p className="firstWarningText">
        Write it down with a pen and paper and keep it safe!
      </p>
      <p className="secondWarningText">WE CAN NOT help you if you lose it</p>

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
