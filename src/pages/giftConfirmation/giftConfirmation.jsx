// GiftConfirmationScreen.web.jsx
import React, { useMemo } from "react";
import Lottie from "lottie-react";
import { QRCodeSVG } from "qrcode.react";

import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";

// Adjust this import path to wherever you place the animation JSON in your web app.
import confirmTxAnimation from "../../assets/confirmTxAnimation.json";

import "./giftConfirmation.css";

/**
 * Tailwind web port of:
 * app/components/admin/homeComponents/gifts/giftConfirmationScreen.js
 *
 * Props you should pass from your app:
 * - amount, description, expiration, giftLink, resetPageState, storageObject
 * - formattedAmount (recommended) OR pass `formatAmount` to compute it
 * - onDone (navigate back)
 * - onShare (optional): your share implementation; fallback tries Web Share API then copy.
 */
export default function GiftConfirmation({
  amount,
  description,
  expiration,
  giftLink = " ",
  resetPageState,

  // Option A (recommended): compute this in your app using the same logic as RN
  formattedAmount,

  // Option B: pass a formatter function similar to displayCorrectDenomination(...) usage
  formatAmount, // ({ amount, storageObject }) => string

  storageObject, // { denomination: 'BTC'|'USD', dollarAmount?: number }

  onDone,
  onShare, // async ({ giftLink, formattedAmount }) => void
}) {
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();

  const computedAmount = useMemo(() => {
    if (formattedAmount) return formattedAmount;
    if (formatAmount) return formatAmount({ amount, storageObject });
    return String(amount ?? "");
  }, [formattedAmount, formatAmount, amount, storageObject]);

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    // Replace with your toast if you have one
    // e.g. toast.success("Copied")
  };

  const handleShare = async () => {
    try {
      if (onShare) {
        await onShare({ giftLink, formattedAmount: computedAmount });
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: "Gift", text: giftLink, url: giftLink });
      } else {
        await copy(giftLink);
        alert("Link copied (sharing not supported in this browser).");
      }
    } catch {
      // share cancelled
    }
  };

  const linkFieldBg = theme ? backgroundColor : Colors.light.text;
  const copyIconColor =
    theme && darkModeType ? Colors.light.text : Colors.constants.blue;

  return (
    <div
      className="giftConfirmation-root"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="giftConfirmation-topBar">
        <button
          type="button"
          onClick={handleShare}
          className="giftConfirmation-shareBtn"
          style={{
            borderColor: backgroundColor,
            color: textColor,
          }}
        >
          Share
        </button>
      </div>

      <div className="giftConfirmation-scroll">
        <div className="giftConfirmation-scrollInner">
          {/* Header */}
          <div className="giftConfirmation-header">
            <div className="giftConfirmation-lottie">
              <Lottie animationData={confirmTxAnimation} loop={false} autoplay />
            </div>

            <div className="giftConfirmation-title">Gift created</div>
            <p className="giftConfirmation-subtitle">
              Share this link or QR code with the recipient.
            </p>
          </div>

          {/* QR card */}
          <div
            className="giftConfirmation-qrCard"
            style={{ backgroundColor: backgroundOffset }}
          >
            <button
              type="button"
              onClick={() => copy(giftLink)}
              title="Click to copy link"
              className="giftConfirmation-qrBtn"
            >
              <div className="giftConfirmation-qrWrap">
                <QRCodeSVG value={giftLink} size={250} />
              </div>
            </button>
          </div>

          {/* Details card */}
          <div
            className="giftConfirmation-card"
            style={{ backgroundColor: backgroundOffset }}
          >
            <div
              className="giftConfirmation-cardHeader"
              style={{ borderBottomColor: backgroundColor }}
            >
              <span className="text-lg" aria-hidden="true">
                🎁
              </span>
              <div className="giftConfirmation-cardHeaderText">Details</div>
            </div>

            <div className="giftConfirmation-detailsContent">
              <Row label="Amount" value={computedAmount} />

              {description ? (
                <Row
                  label="Description"
                  value={description}
                  valueClassName="giftConfirmation-detailDescription"
                />
              ) : null}

              {expiration ? (
                <Row
                  label="Expires"
                  value={String(expiration)}
                  mutedValue
                />
              ) : null}
            </div>
          </div>

          {/* Gift link card */}
          <div
            className="giftConfirmation-card"
            style={{ backgroundColor: backgroundOffset }}
          >
            <div className="giftConfirmation-inputLabel">Gift link</div>

            <div className="giftConfirmation-inputRow">
              <div
                className="giftConfirmation-linkContainer"
                style={{
                  borderColor: backgroundColor,
                  backgroundColor: linkFieldBg,
                  color: theme ? textColor : Colors.light.background,
                }}
                title={giftLink}
              >
                <div className="giftConfirmation-linkText">{giftLink}</div>
              </div>

              <button
                type="button"
                onClick={() => copy(giftLink)}
                className="giftConfirmation-copyButton"
                style={{ color: copyIconColor }}
                title="Copy"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="giftConfirmation-bottomButtons">
        <button
          type="button"
          onClick={onDone}
          className="giftConfirmation-btnPrimary"
          style={{
            backgroundColor: Colors.constants.blue,
            color: "#fff",
          }}
        >
          Done
        </button>

        <button
          type="button"
          onClick={resetPageState}
          className="giftConfirmation-btnSecondary"
          style={{ color: textColor }}
        >
          Create another
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mutedValue = false, valueClassName = "" }) {
  return (
    <div
      className={[
        "giftConfirmation-detailRow",
        mutedValue ? "giftConfirmation-detailMuted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>{label}</div>
      <div className={valueClassName} style={{ textAlign: "right" }}>
        {value}
      </div>
    </div>
  );
}
