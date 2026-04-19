import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../../../constants/theme";
import { WEBSITE_REGEX } from "../../../../constants";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { parseGiftUrl } from "../../../../functions/gift/encodeDecodeSecret";
import CustomButton from "../../../../components/customButton/customButton";
import "./claimGiftHalfModal.css";

export default function ClaimGiftHalfModal({ onClose }) {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, textInputBackground, textInputColor } = useThemeColors();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  const handleClaimGift = useCallback(async () => {
    setError("");

    if (!link.trim()) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          setLink(text.trim());
          return;
        }
      } catch {
        /* clipboard not available */
      }
      setError("Please enter a gift link.");
      return;
    }

    if (!WEBSITE_REGEX.test(link.trim())) {
      setError("Invalid gift link format. Please enter a valid URL.");
      return;
    }

    const parsed = parseGiftUrl(link.trim());
    if (!parsed) {
      setError("Could not parse gift link. Please check the format.");
      return;
    }

    onClose?.();
    navigate("/claim-gift", {
      state: { claimType: "claim", url: link.trim() },
    });
  }, [link, navigate, onClose]);

  const handleClearOrPaste = useCallback(async () => {
    if (link) {
      setLink("");
      setError("");
    } else {
      try {
        const text = await navigator.clipboard.readText();
        if (text) setLink(text.trim());
      } catch {
        /* clipboard not available */
      }
    }
  }, [link]);

  return (
    <div className="claimGiftModal-container">
      <p className="claimGiftModal-title" style={{ color: textColor }}>
        Claim a Gift
      </p>
      <p className="claimGiftModal-desc" style={{ color: textColor }}>
        Paste a gift link below to claim the Bitcoin inside. You can get this
        link from the person who sent you the gift.
      </p>

      <div className="claimGiftModal-inputRow">
        <input
          className="claimGiftModal-input"
          style={{
            backgroundColor: textInputBackground,
            color: textInputColor,
          }}
          type="text"
          placeholder="Paste gift link here..."
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleClaimGift()}
        />
        <button
          className="claimGiftModal-iconBtn"
          style={{ color: textColor }}
          onClick={handleClearOrPaste}
          title={link ? "Clear" : "Paste"}
        >
          {link ? "✕" : "📋"}
        </button>
      </div>

      {error && <p className="claimGiftModal-error">{error}</p>}

      <CustomButton
        actionFunction={handleClaimGift}
        textContent={!link.trim() ? "Paste" : "Claim"}
        buttonStyles={{
          // ...CENTER,
          width: "auto",
        }}
      />
    </div>
  );
}
