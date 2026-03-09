import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import getDataFromClipboard from "../../functions/getDataFromClipboard";
import SuggestedWordContainer from "../../components/suggestedWordContainer/suggestedWords";
import "./restoreWallet.css";
import PageNavBar from "../../components/navBar/navBar";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { handleRestoreFromText } from "../../functions/seed";
import { useOverlay } from "../../contexts/overlayContext";
import { useAuth } from "../../contexts/authContext";
import { useTranslation } from "react-i18next";

const NUMARRAY = Array.from({ length: 12 }, (_, i) => i + 1);
const INITIAL_KEY_STATE = NUMARRAY.reduce((acc, num) => {
  acc[`key${num}`] = "";
  return acc;
}, {});

export default function RestoreWallet() {
  const { setMnemoinc } = useAuth();
  const { openOverlay } = useOverlay();
  const location = useLocation();
  const params = location.state;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isValidating, setIsValidating] = useState(false);
  const [currentFocused, setCurrentFocused] = useState(null);
  const keyRefs = useRef({});
  const [inputedKey, setInputedKey] = useState(INITIAL_KEY_STATE);

  const handleInputElement = useCallback((text, keyNumber) => {
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
  }, []);

  const handleFocus = useCallback((keyNumber) => {
    setCurrentFocused(keyNumber);
  }, []);

  const handleBlur = useCallback(() => {
    // Small delay so SuggestedWordContainer click can fire first
    setTimeout(() => setCurrentFocused(null), 150);
  }, []);

  const handleSubmit = useCallback((keyNumber) => {
    if (keyNumber < 12) {
      keyRefs.current[keyNumber + 1]?.focus();
    } else {
      keyRefs.current[12]?.blur();
    }
  }, []);

  const handleSeedFromClipboard = useCallback(async () => {
    try {
      const response = await getDataFromClipboard();
      if (!response) throw new Error("Not able to get clipboard data");

      const restoredSeed = handleRestoreFromText(response);
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
      openOverlay({ for: "error", errorMessage: err.message });
    }
  }, [openOverlay]);

  const keyValidation = useCallback(async () => {
    try {
      setIsValidating(true);
      const mnemonic = Object.values(inputedKey)
        .map((val) => val.trim().toLowerCase())
        .filter((val) => val);

      if (!mnemonic || mnemonic.length !== 12)
        throw new Error(t("createAccount.restoreWallet.home.error1"));

      if (!validateMnemonic(mnemonic.join(" "), wordlist))
        throw new Error(t("createAccount.restoreWallet.home.error2"));

      setMnemoinc(mnemonic.join(" "));
      navigate("/createPassword", { state: { didRestoreWallet: true } });
    } catch (err) {
      console.error(err);
      openOverlay({ for: "error", errorMessage: err.message });
    } finally {
      setIsValidating(false);
    }
  }, [inputedKey, navigate, openOverlay, setMnemoinc, t]);

  // Mirrors RN: pairs of inputs per row (2-column grid)
  const inputKeys = useMemo(() => {
    const rows = [];
    for (let i = 0; i < NUMARRAY.length; i += 2) {
      const item1 = NUMARRAY[i];
      const item2 = NUMARRAY[i + 1];
      rows.push(
        <div key={`row${item1}`} className="seedRow">
          {[item1, item2].map((num) => (
            <div key={num} className="seedItem">
              <span className="seedNumber">{num}.</span>
              <input
                className="seedTextInput"
                type="text"
                autoCorrect="off"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={inputedKey[`key${num}`]}
                ref={(ref) => (keyRefs.current[num] = ref)}
                onFocus={() => handleFocus(num)}
                onBlur={handleBlur}
                onChange={(e) => handleInputElement(e.target.value, num)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(num)}
              />
            </div>
          ))}
        </div>,
      );
    }
    return rows;
  }, [inputedKey, handleFocus, handleBlur, handleInputElement, handleSubmit]);

  if (isValidating)
    return (
      <div className="loadingScreen">
        <p>{t("constants.validating")}</p>
      </div>
    );

  return (
    <div className="restoreContainer">
      <PageNavBar />

      {/* ── Scrollable seed grid ── */}
      <div className="restoreScrollArea">
        {/* Header (mirrors RN headerText + subHeader) */}
        <h1 className="restoreHeader">
          {t("createAccount.restoreWallet.home.header")}
        </h1>
        <p className="restoreSubHeader">
          {t("createAccount.restoreWallet.home.desc")}
        </p>

        <div className="inputKeysContainer">{inputKeys}</div>
      </div>

      {/* ── Footer: only shown when no input is focused (mirrors RN !currentFocused) ── */}
      {!currentFocused && (
        <div className="restoreFooter">
          {/* Paste + Restore row (mirrors RN secondaryButtonRow + restoreButton) */}
          <div className="secondaryButtonRow">
            <CustomButton
              buttonStyles={{
                flex: 1,
              }}
              textStyles={{ color: Colors.light.text }}
              actionFunction={handleSeedFromClipboard}
              textContent={t("constants.paste")}
            />
            <CustomButton
              buttonStyles={{
                backgroundColor: Colors.light.blue,
                flex: 1,
              }}
              textStyles={{ color: Colors.dark.text }}
              actionFunction={keyValidation}
              textContent={t("constants.restore")}
            />
          </div>
        </div>
      )}

      {/* ── Suggested words — shown when an input is focused ── */}
      {currentFocused && (
        <SuggestedWordContainer
          inputedKey={inputedKey}
          setInputedKey={setInputedKey}
          selectedKey={currentFocused}
          keyRefs={keyRefs}
        />
      )}
    </div>
  );
}
