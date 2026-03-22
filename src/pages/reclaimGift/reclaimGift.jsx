import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useGifts } from "../../contexts/giftsContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { RotateCcw } from "lucide-react";
import CustomButton from "../../components/customButton/customButton";
import "./reclaimGift.css";

export default function ReclaimGift() {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const {
    textColor,
    backgroundColor,
    backgroundOffset,
    textInputBackground,
    textInputColor,
  } = useThemeColors();
  const { expiredGiftsArray, currentDerivedGiftIndex } = useGifts();
  const { masterInfoObject } = useGlobalContextProvider();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  const [enteredLink, setEnteredLink] = useState("");
  const [selectedUuid, setSelectedUuid] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [giftNumber, setGiftNumber] = useState("");

  const currentGiftIndex =
    masterInfoObject?.currentDerivedGiftIndex || currentDerivedGiftIndex || 1;

  const dropdownOptions = useMemo(() => {
    if (!expiredGiftsArray || !expiredGiftsArray.length) return [];
    return expiredGiftsArray.map((item) => ({
      label: item.uuid,
      value: item.uuid,
      data: item,
    }));
  }, [expiredGiftsArray]);

  const hasExpiredGifts = dropdownOptions.length > 0;

  function handleDropdownSelect(e) {
    const uuid = e.target.value;
    setSelectedUuid(uuid);
    setEnteredLink(uuid);
  }

  function handleReclaim() {
    if (!enteredLink) return;
    const trimmed = enteredLink.trim();
    setEnteredLink("");
    setSelectedUuid("");
    navigate("/claim-gift", {
      state: {
        claimType: "reclaim",
        url: trimmed,
        giftUuid: trimmed,
      },
    });
  }

  const advancedParsedNum = parseInt(giftNumber, 10);
  const advancedIsValid =
    giftNumber &&
    advancedParsedNum >= 1 &&
    advancedParsedNum <= currentGiftIndex;
  const advancedShowError = giftNumber && !advancedIsValid;

  function handleAdvancedClaim() {
    if (!advancedIsValid) return;
    setGiftNumber("");
    navigate("/claim-gift", {
      state: {
        claimType: "reclaim",
        expertMode: true,
        customGiftIndex: advancedParsedNum,
      },
    });
  }

  const cardBorder = theme
    ? darkModeType
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(255, 255, 255, 0.1)"
    : "1px solid rgba(0, 0, 0, 0.06)";

  if (showAdvanced) {
    return (
      <div className="reclaimGift-container" style={{ backgroundColor }}>
        <div className="reclaimGift-topBar">
          <button
            className="reclaimGift-backBtn"
            style={{ color: textColor }}
            onClick={() => setShowAdvanced(false)}
          >
            ←
          </button>
          <p className="reclaimGift-topBarTitle" style={{ color: textColor }}>
            Advanced Gift Recovery
          </p>
          <div style={{ width: 32 }} />
        </div>

        <div className="reclaimGift-scrollContent">
          <div
            className="reclaimGift-indexCard"
            style={{
              backgroundColor:
                theme && darkModeType ? backgroundOffset : colors.giftCardBlue,
            }}
          >
            <div>
              <p className="reclaimGift-indexLabel">Current Gift Index</p>
              <p className="reclaimGift-indexNumber">{currentGiftIndex}</p>
            </div>
            <div className="reclaimGift-indexIconCircle">
              <span className="reclaimGift-indexIconEmoji">🎁</span>
            </div>
          </div>

          <div
            className="reclaimGift-infoCard"
            style={{ backgroundColor: backgroundOffset, border: cardBorder }}
          >
            <p className="reclaimGift-infoTitle" style={{ color: textColor }}>
              How does this work?
            </p>
            <p className="reclaimGift-infoDesc" style={{ color: textColor }}>
              Each gift you create is assigned an index number. If a gift wasn't
              claimed and you've lost track of it, you can enter its index
              number here to attempt recovery.
            </p>
            <p
              className="reclaimGift-infoDesc reclaimGift-infoDescSpaced"
              style={{ color: textColor }}
            >
              Valid gift numbers range from 1 to {currentGiftIndex}. Only use
              this if the normal reclaim process doesn't work.
            </p>
          </div>

          <div
            className="reclaimGift-inputCard"
            style={{ backgroundColor: backgroundOffset, border: cardBorder }}
          >
            <p className="reclaimGift-inputLabel" style={{ color: textColor }}>
              Gift Number
            </p>
            <input
              className="reclaimGift-input"
              style={{
                backgroundColor: textInputBackground,
                color: textInputColor,
              }}
              type="number"
              min="1"
              max={currentGiftIndex}
              placeholder={`1 – ${currentGiftIndex}`}
              value={giftNumber}
              onChange={(e) => setGiftNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdvancedClaim()}
            />
            {advancedShowError && (
              <div
                className="reclaimGift-errorBox"
                style={{
                  backgroundColor:
                    theme && darkModeType
                      ? textInputBackground
                      : colors.giftCardBlue,
                }}
              >
                <span className="reclaimGift-errorIcon">⚠️</span>
                <p className="reclaimGift-errorText">
                  Please enter a number between 1 and {currentGiftIndex}
                </p>
              </div>
            )}
          </div>
        </div>

        <CustomButton
          actionFunction={handleAdvancedClaim}
          textContent="Restore Gift"
          buttonStyles={{
            // ...CENTER,
            width: "auto",
          }}
          disabled={!advancedIsValid}
        />
      </div>
    );
  }

  return (
    <div className="reclaimGift-container" style={{ backgroundColor }}>
      <div className="reclaimGift-topBar">
        <button
          className="reclaimGift-backBtn"
          style={{ color: textColor }}
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <p className="reclaimGift-topBarTitle" style={{ color: textColor }}>
          Reclaim Gift
        </p>
        <div style={{ width: 32 }} />
      </div>

      <div className="reclaimGift-scrollContent">
        <div className="reclaimGift-centerContent">
          <div
            className="reclaimGift-iconCircle"
            style={{ backgroundColor: backgroundOffset }}
          >
            <RotateCcw size={36} color={textColor} />
          </div>

          <p className="reclaimGift-mainTitle" style={{ color: textColor }}>
            Reclaim Expired Gifts
          </p>

          {hasExpiredGifts ? (
            <>
              <p className="reclaimGift-mainDesc" style={{ color: textColor }}>
                Select an expired gift from the list or enter its UUID to
                reclaim the funds back to your wallet.
              </p>

              <div
                className="reclaimGift-formCard"
                style={{
                  backgroundColor: backgroundOffset,
                  border: cardBorder,
                }}
              >
                <input
                  className="reclaimGift-input"
                  style={{
                    backgroundColor: textInputBackground,
                    color: textInputColor,
                  }}
                  type="text"
                  placeholder="Enter gift UUID..."
                  value={enteredLink}
                  onChange={(e) => {
                    setEnteredLink(e.target.value);
                    setSelectedUuid("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleReclaim()}
                />

                <select
                  className="reclaimGift-select"
                  style={{
                    backgroundColor: textInputBackground,
                    color: textInputColor,
                  }}
                  value={selectedUuid}
                  onChange={handleDropdownSelect}
                >
                  <option value="">Select an expired gift...</option>
                  {dropdownOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label.substring(0, 20)}...
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <p className="reclaimGift-mainDesc" style={{ color: textColor }}>
              You don't have any expired gifts that can be reclaimed right now.
            </p>
          )}

          <button
            className="reclaimGift-advancedLink"
            style={{ color: textColor }}
            onClick={() => setShowAdvanced(true)}
          >
            Advanced Mode
          </button>
        </div>
      </div>

      {hasExpiredGifts && (
        <CustomButton
          actionFunction={handleReclaim}
          textContent="Reclaim"
          buttonStyles={{
            // ...CENTER,
            width: "auto",
          }}
          disabled={!enteredLink}
        />
      )}
    </div>
  );
}
