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

const NUMARRAY = Array.from({ length: 12 }, (_, i) => i + 1);
const INITIAL_KEY_STATE = NUMARRAY.reduce((acc, num) => {
  acc[`key${num}`] = "";
  return acc;
}, {});

export default function RestoreWallet() {
  const location = useLocation();
  const params = location.state;
  const navigate = useNavigate();

  const [isValidating, setIsValidating] = useState(false);
  const [currentFocused, setCurrentFocused] = useState(null);
  const keyRefs = useRef({});
  const [inputedKey, setInputedKey] = useState(INITIAL_KEY_STATE);

  const handleInputElement = (text, keyNumber) => {
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

      const data = response.data;
      const splitSeed = data.split(" ");
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
      navigate("/error", { state: { errorMessage: err.message } });
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

      navigate("/createPassword", {
        state: { mnemoinc: mnemonic.join(" ") },
      });
    } catch (err) {
      console.error(err);
      navigate("/error", { state: { errorMessage: err.message } });
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
        <button onClick={handleSeedFromClipboard}>Paste</button>
        <button onClick={keyValidation}>Restore</button>
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
