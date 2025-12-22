import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import getDataFromClipboard from "../../functions/getDataFromClipboard";
import BackArrow from "../../components/backArrow/backArrow";
import SuggestedWordContainer from "../../components/suggestedWordContainer/suggestedWords";
import "./restoreWallet.css";
import PageNavBar from "../../components/navBar/navBar";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { handleRestoreFromText } from "../../functions/seed";
import { useOverlay } from "../../contexts/overlayContext";

const NUMARRAY = Array.from({ length: 12 }, (_, i) => i + 1);
const INITIAL_KEY_STATE = NUMARRAY.reduce((acc, num) => {
  acc[`key${num}`] = "";
  return acc;
}, {});

export default function RestoreWallet() {
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const params = location.state;
  const navigate = useNavigate();

  const [isValidating, setIsValidating] = useState(false);
  const [currentFocused, setCurrentFocused] = useState(null);
  const keyRefs = useRef({});
  const [inputedKey, setInputedKey] = useState(INITIAL_KEY_STATE);

  const handleInputElement = (text, keyNumber) => {
    const restoredSeed = handleRestoreFromText(text);

    if (restoredSeed.didWork && restoredSeed?.seed?.length === 12) {
      const splitSeed = restoredSeed.seed;
      const newKeys = {};
      NUMARRAY.forEach((num, index) => {
        newKeys[`key${num}`] = splitSeed[index];
      });
      setInputedKey(newKeys);
      return;
    }
    setInputedKey((prev) => ({ ...prev, [`key${keyNumber}`]: text }));
  };

  const handleFocus = (keyNumber) => {
    setCurrentFocused(keyNumber);
  };

  const handleSubmit = (keyNumber) => {
    if (keyNumber < 12) {
      keyRefs.current[keyNumber + 1]?.focus();
    } else {
      keyRefs.current[12]?.blur();
    }
  };

  const handleSeedFromClipboard = async () => {
    try {
      const response = await getDataFromClipboard();

      if (!response) throw new Error("Not able to get clipboard data");

      const data = response;
      const restoredSeed = handleRestoreFromText(data);
      if (!restoredSeed.didWork) throw new Error(restoredSeed.error);

      const splitSeed = restoredSeed.seed;
      if (
        !splitSeed.every((word) => word.trim().length > 0) ||
        splitSeed.length !== 12
      )
        throw new Error("Invalid clipboard data.");

      const newKeys = {};
      NUMARRAY.forEach((num, index) => {
        newKeys[`key${num}`] = splitSeed[index];
      });
      setInputedKey(newKeys);
    } catch (err) {
      console.error(err);
      openOverlay({
        for: "error",
        errorMessage: err.message,
      });
    }
  };

  const keyValidation = async () => {
    try {
      setIsValidating(true);
      const mnemonic = Object.values(inputedKey)
        .map((val) => val.trim().toLowerCase())
        .filter((val) => val);

      if (!mnemonic || mnemonic.length !== 12) {
        return;
      }
      if (!validateMnemonic(mnemonic.join(" "), wordlist))
        throw new Error("Not a valid seedphrase");

      navigate("/createPassword", {
        state: { mnemoinc: mnemonic.join(" ") },
      });
    } catch (err) {
      console.error(err);
      openOverlay({
        for: "error",
        errorMessage: err.message,
      });
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const handleBlur = () => setCurrentFocused(null);
    window.addEventListener("click", handleBlur);
    return () => window.removeEventListener("click", handleBlur);
  }, []);

  const inputKeys = useMemo(() => {
    const rows = [];
    for (let i = 1; i < NUMARRAY.length + 1; i += 1) {
      rows.push(
        <div key={i} className="seedPill">
          <span className="seedText">{i}.</span>
          <input
            className="textInput"
            type="text"
            value={inputedKey[`key${i}`]}
            ref={(ref) => (keyRefs.current[i] = ref)}
            onFocus={() => handleFocus(i)}
            onChange={(e) => handleInputElement(e.target.value, i)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(i)}
          />
        </div>
      );
    }
    return rows;
  }, [inputedKey]);

  if (isValidating)
    return (
      <div>
        <p>Vaidating seed</p>
      </div>
    );

  return (
    <div className="restoreContainer">
      <PageNavBar text="Restore wallet" />

      <div className="inputKeysContainer">{inputKeys}</div>

      {/* {!currentFocused && ( */}
      <div className="buttonsContainer">
        <CustomButton
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textStyles={{ color: Colors.dark.text }}
          actionFunction={handleSeedFromClipboard}
          textContent={"Paste"}
        />
        <CustomButton actionFunction={keyValidation} textContent={"Restore"} />
      </div>
      {/* )} */}

      {/* {currentFocused && (
        <SuggestedWordContainer
          inputedKey={inputedKey}
          setInputedKey={setInputedKey}
          selectedKey={currentFocused}
          keyRefs={keyRefs}
        />
      )} */}
    </div>
  );
}
