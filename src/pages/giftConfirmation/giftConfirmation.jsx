// GiftConfirmationScreen.web.jsx
import React, { useMemo } from "react";
import Lottie from "lottie-react";
import { QRCodeSVG } from "qrcode.react";

// Adjust this import path to wherever you place the animation JSON in your web app.
import confirmTxAnimation from "../../assets/confirmTxAnimation.json";

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {/* Top bar (Share) */}
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5 active:bg-white/10"
          >
            Share
          </button>
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto h-[100px] w-[100px]">
            <Lottie animationData={confirmTxAnimation} loop={false} autoplay />
          </div>

          <div className="mt-2 text-xl font-medium">Gift created</div>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-300">
            Share this link or QR code with the recipient.
          </p>
        </div>

        {/* QR card */}
        <div className="mb-4 rounded-2xl bg-white/5 p-3">
          <button
            type="button"
            onClick={() => copy(giftLink)}
            title="Click to copy link"
            className="mx-auto block rounded-xl bg-white p-2"
          >
            <QRCodeSVG value={giftLink} size={250} />
          </button>
          <div className="mt-3 text-center text-xs text-zinc-400">
            Tap the QR to copy the link
          </div>
        </div>

        {/* Details card */}
        <div className="mb-4 rounded-2xl bg-white/5 p-4">
          <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
            <span className="text-lg" aria-hidden="true">
              🎁
            </span>
            <div className="text-sm font-semibold">Details</div>
          </div>

          <div className="space-y-3 text-sm">
            <Row label="Amount" value={computedAmount} />

            {description ? (
              <Row
                label="Description"
                value={description}
                valueClassName="max-w-[60%] break-words text-right"
              />
            ) : null}

            {expiration ? (
              <Row label="Expires" value={String(expiration)} mutedValue />
            ) : null}
          </div>
        </div>

        {/* Gift link card */}
        <div className="mb-6 rounded-2xl bg-white/5 p-4">
          <div className="mb-3 text-sm font-semibold">Gift link</div>

          <div className="flex gap-2">
            <div
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-100"
              title={giftLink}
            >
              <div className="truncate">{giftLink}</div>
            </div>

            <button
              type="button"
              onClick={() => copy(giftLink)}
              className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-transparent text-xs font-semibold text-blue-400 hover:bg-white/5 active:bg-white/10"
              title="Copy"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="grid gap-3">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-blue-400 active:bg-blue-600"
          >
            Done
          </button>

          <button
            type="button"
            onClick={resetPageState}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-bold text-zinc-100 hover:bg-white/5 active:bg-white/10"
          >
            Create another
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mutedValue = false, valueClassName = "" }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-zinc-200">{label}</div>
      <div
        className={[
          "text-right",
          mutedValue ? "text-zinc-300" : "text-zinc-100",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
