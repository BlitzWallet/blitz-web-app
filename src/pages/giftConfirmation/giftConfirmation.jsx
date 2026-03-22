import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { Share, Gift, Copy } from "lucide-react";
import CustomButton from "../../components/customButton/customButton";
import "./giftConfirmation.css";

export default function GiftConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundColor, backgroundOffset, textInputBackground } =
    useThemeColors();

  const { amount, description, expireTime, giftId, giftLink } =
    location.state || {};

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  const [copied, setCopied] = useState(false);

  const expirationDate = expireTime
    ? new Date(expireTime).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const handleCopy = useCallback(
    async (data) => {
      const text = data || giftLink;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard not available */
      }
    },
    [giftLink],
  );

  const handleShare = useCallback(async () => {
    if (!giftLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Blitz Gift",
          text: "Claim your Bitcoin gift!",
          url: giftLink,
        });
      } else {
        handleCopy();
      }
    } catch {
      /* user cancelled */
    }
  }, [giftLink, handleCopy]);

  const cardBorder = theme
    ? darkModeType
      ? "1px solid rgba(255, 255, 255, 0.08)"
      : "1px solid rgba(255, 255, 255, 0.1)"
    : "1px solid rgba(0, 0, 0, 0.06)";

  if (!giftLink) {
    return (
      <div className="giftConfirm-container" style={{ backgroundColor }}>
        <p style={{ color: textColor }}>No gift data found.</p>
      </div>
    );
  }

  return (
    <div className="giftConfirm-container" style={{ backgroundColor }}>
      <div className="giftConfirm-topBar">
        <div style={{ width: 32 }} />
        <div style={{ flex: 1 }} />
        <button
          className="giftConfirm-shareBtn"
          onClick={handleShare}
          title="Share"
        >
          <Share size={20} color={textColor} />
        </button>
      </div>

      <div className="giftConfirm-scrollContent">
        <div className="giftConfirm-header">
          <div className="giftConfirm-successIcon">🎉</div>
          <p className="giftConfirm-title" style={{ color: textColor }}>
            Gift Created!
          </p>
          <p className="giftConfirm-subtitle" style={{ color: textColor }}>
            Share this link with the recipient to let them claim their Bitcoin.
          </p>
        </div>

        <div
          className="giftConfirm-qrCard"
          style={{ backgroundColor: backgroundOffset, border: cardBorder }}
          onClick={() => handleCopy()}
        >
          <QRCodeSVG value={giftLink} size={250} level="M" />
        </div>

        <div
          className="giftConfirm-card"
          style={{ backgroundColor: backgroundOffset, border: cardBorder }}
        >
          <div
            className="giftConfirm-cardHeader"
            style={{ borderBottomColor: textInputBackground }}
          >
            <Gift size={22} color={textColor} />
            <p
              className="giftConfirm-cardHeaderText"
              style={{ color: textColor }}
            >
              Gift Details
            </p>
          </div>
          <div className="giftConfirm-detailsContent">
            <div className="giftConfirm-detailRow">
              <p
                className="giftConfirm-detailLabel"
                style={{ color: textColor }}
              >
                Amount
              </p>
              <FormattedSatText
                balance={amount || 0}
                styles={{ color: textColor, fontWeight: 600, fontSize: "14px" }}
              />
            </div>
            {description && (
              <div className="giftConfirm-detailRow">
                <p
                  className="giftConfirm-detailLabel"
                  style={{ color: textColor }}
                >
                  Description
                </p>
                <p
                  className="giftConfirm-detailValueDesc"
                  style={{ color: textColor }}
                >
                  {description}
                </p>
              </div>
            )}
            <div className="giftConfirm-detailRow">
              <p
                className="giftConfirm-detailLabel"
                style={{ color: textColor }}
              >
                Expires
              </p>
              <p
                className="giftConfirm-detailValue"
                style={{ color: textColor }}
              >
                {expirationDate}
              </p>
            </div>
          </div>
        </div>

        <div
          className="giftConfirm-card"
          style={{ backgroundColor: backgroundOffset, border: cardBorder }}
        >
          <p className="giftConfirm-inputLabel" style={{ color: textColor }}>
            Gift Link
          </p>
          <div className="giftConfirm-linkRow">
            <div
              className="giftConfirm-linkBox"
              style={{
                backgroundColor: textInputBackground,
                borderColor: textInputBackground,
              }}
            >
              <p className="giftConfirm-linkText" style={{ color: textColor }}>
                {giftLink}
              </p>
            </div>
            <button
              className="giftConfirm-copyBtn"
              onClick={() => handleCopy()}
              title="Copy link"
            >
              <Copy
                size={20}
                color={theme && darkModeType ? textColor : colors.giftCardBlue}
              />
            </button>
          </div>
          {copied && (
            <p
              className="giftConfirm-copied"
              style={{ color: colors.giftCardBlue }}
            >
              Copied to clipboard!
            </p>
          )}
        </div>
      </div>

      <div className="giftConfirm-bottomButtons">
        <CustomButton
          actionFunction={() => navigate("/gift", { replace: true })}
          textContent="Done"
          buttonStyles={{
            // ...CENTER,
            width: "auto",
          }}
          // buttonStyles={primaryBtn}
        />
        <CustomButton
          actionFunction={() => navigate("/create-gift", { replace: true })}
          textContent="Create Another"
          buttonStyles={{
            // ...CENTER,
            width: "auto",
          }}
        />
      </div>
    </div>
  );
}
