import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme";
import { useThemeContext } from "../../contexts/themeContext";
import useThemeColors from "../../hooks/useThemeColors";
import { useKeysContext } from "../../contexts/keysContext";
import { useGifts } from "../../contexts/giftsContext";
import { useSpark } from "../../contexts/sparkContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { STARTING_INDEX_FOR_GIFTS_DERIVE } from "../../constants";
import {
  deriveSparkGiftMnemonic,
  deriveSparkIdentityKey,
} from "../../functions/gift/deriveGiftWallet";
import { createGiftUrl } from "../../functions/gift/encodeDecodeSecret";
import { encryptMessage } from "../../functions/encodingAndDecoding";
import { getPublicKey } from "../../functions/seed";
import { sparkPaymenWrapper } from "../../functions/spark/payments";
import {
  initializeSparkWallet,
  getSparkAddress,
} from "../../functions/spark/index";
import CustomButton from "../../components/customButton/customButton";
import "./createGift.css";

const DURATION_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
];

export default function CreateGift() {
  const navigate = useNavigate();
  const { theme, darkModeType } = useThemeContext();
  const {
    textColor,
    backgroundColor,
    backgroundOffset,
    textInputBackground,
    textInputColor,
  } = useThemeColors();
  const { accountMnemoinc } = useKeysContext();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const {
    currentDerivedGiftIndex,
    saveGiftToCloud,
    deleteGiftFromCloudAndLocal,
    incrementGiftIndex,
  } = useGifts();

  const colors = theme
    ? darkModeType
      ? Colors.lightsout
      : Colors.dark
    : Colors.light;

  const [amount, setAmount] = useState("");
  const [denomination, setDenomination] = useState("BTC");
  const [duration, setDuration] = useState(7);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  const amountSats = denomination === "BTC" ? parseInt(amount, 10) || 0 : 0;

  const handleCreate = useCallback(async () => {
    if (!amount || amountSats <= 0) {
      setError("Please enter a valid amount in sats.");
      return;
    }
    if (!accountMnemoinc) {
      setError("Wallet not initialized.");
      return;
    }

    setIsLoading(true);
    setError("");

    let savedGiftUuid = null;

    try {
      const currentDeriveIndex =
        STARTING_INDEX_FOR_GIFTS_DERIVE + currentDerivedGiftIndex;

      setLoadingMessage("Deriving gift wallet...");
      const giftWalletResult = deriveSparkGiftMnemonic(
        accountMnemoinc,
        currentDeriveIndex,
      );
      if (!giftWalletResult.success)
        throw new Error("Failed to derive gift wallet");

      const giftMnemonic = giftWalletResult.derivedMnemonic;

      setLoadingMessage("Encrypting gift secret...");
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const secretPubKey = getPublicKey(secretHex);

      const encryptedMnemonic = await encryptMessage(
        secretHex,
        secretPubKey,
        giftMnemonic,
      );
      if (!encryptedMnemonic) throw new Error("Encryption failed");

      const giftId = crypto.randomUUID();
      const urls = createGiftUrl(giftId, secretBytes);

      const daysInMS = 1000 * 60 * 60 * 24;
      const now = Date.now();

      setLoadingMessage("Initializing gift wallet...");
      const network =
        import.meta.env.MODE === "development" ? "REGTEST" : "MAINNET";
      const initResult = await initializeSparkWallet(giftMnemonic, network);
      if (!initResult.isConnected)
        throw new Error("Failed to initialize gift wallet");

      const giftAddressResult = await getSparkAddress(giftMnemonic);
      if (!giftAddressResult.didWork)
        throw new Error("Failed to get gift Spark address");

      const derivedIdentityPubKey = deriveSparkIdentityKey(giftMnemonic, 1);

      const storageObject = {
        uuid: giftId,
        createdTime: now,
        lastUpdated: now,
        expireTime: now + duration * daysInMS,
        encryptedText: encryptedMnemonic,
        amount: amountSats,
        description: description.trim(),
        createdBy:
          masterInfoObject?.uuid || sparkInformation.identityPubKey || "",
        state: "Unclaimed",
        giftNum: currentDeriveIndex,
        claimURL: urls.webUrl,
        satDisplay: masterInfoObject.satDisplay,
        denomination,
        identityPubKey: derivedIdentityPubKey.success
          ? derivedIdentityPubKey.publicKeyHex
          : "",
      };

      setLoadingMessage("Saving gift...");
      const didSave = await saveGiftToCloud(storageObject);
      if (!didSave) throw new Error("Failed to save gift");
      savedGiftUuid = giftId;

      setLoadingMessage("Sending funds to gift...");
      const paymentResponse = await sparkPaymenWrapper({
        address: giftAddressResult.response,
        paymentType: "spark",
        amountSats,
        masterInfoObject,
        sparkInformation,
        mnemonic: accountMnemoinc,
      });

      if (!paymentResponse.didWork) {
        await deleteGiftFromCloudAndLocal(giftId);
        savedGiftUuid = null;
        throw new Error(paymentResponse.error || "Payment failed");
      }

      await incrementGiftIndex();

      setLoadingMessage("");

      navigate("/gift-confirmation", {
        state: {
          amount: amountSats,
          description: description.trim(),
          expireTime: storageObject.expireTime,
          giftId,
          giftLink: urls.webUrl,
        },
        replace: true,
      });
    } catch (err) {
      console.error("Create gift error:", err);
      setError(err.message || "Failed to create gift");
      if (savedGiftUuid) {
        try {
          await deleteGiftFromCloudAndLocal(savedGiftUuid);
        } catch {
          /* best-effort cleanup */
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [
    amount,
    amountSats,
    accountMnemoinc,
    currentDerivedGiftIndex,
    denomination,
    duration,
    description,
    sparkInformation,
    masterInfoObject,
    saveGiftToCloud,
    deleteGiftFromCloudAndLocal,
    incrementGiftIndex,
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="createGift-container" style={{ backgroundColor }}>
        <div className="createGift-loading">
          <div className="createGift-loadingSpinner" />
          <p style={{ color: textColor, fontSize: 16, margin: 0 }}>
            {loadingMessage || "Creating gift..."}
          </p>
        </div>
      </div>
    );
  }

  /** Matches primary actions on `giftCardBlue` (lights-out uses dark text on blue). */
  const onGiftCardBlueText = {
    color: theme && darkModeType ? "#0d0d0d" : "#ffffff",
  };

  return (
    <div className="createGift-container" style={{ backgroundColor }}>
      <div className="createGift-header">
        <button
          type="button"
          className="createGift-backBtn"
          style={{ color: textColor }}
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <p className="createGift-title" style={{ color: textColor }}>
          Create Gift
        </p>
        <div style={{ width: 32 }} />
      </div>

      <div className="createGift-form">
        <div className="createGift-heroIcon">🎁</div>

        <div
          className="createGift-field"
          style={{ backgroundColor: backgroundOffset }}
        >
          <p className="createGift-label" style={{ color: textColor }}>
            Amount
          </p>
          <input
            className="createGift-input"
            style={{
              backgroundColor: textInputBackground,
              color: textInputColor,
            }}
            type="number"
            min="1"
            placeholder={
              denomination === "BTC" ? "Amount in sats" : "Amount in USD"
            }
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div
          className="createGift-field"
          style={{ backgroundColor: backgroundOffset }}
        >
          <p className="createGift-label" style={{ color: textColor }}>
            Type
          </p>
          <div
            className="createGift-denomToggle"
            style={{ backgroundColor: textInputBackground }}
          >
            {["BTC", "USD"].map((d) => {
              const selected = denomination === d;
              return (
                <CustomButton
                  key={d}
                  actionFunction={() => setDenomination(d)}
                  textContent={d}
                  buttonStyles={{
                    flex: 1,
                    minWidth: 0,
                    width: "auto",
                    backgroundColor: selected
                      ? colors.giftCardBlue
                      : "transparent",
                    borderRadius: 0,
                    padding: "12px 8px",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div
          className="createGift-field"
          style={{ backgroundColor: backgroundOffset }}
        >
          <p className="createGift-label" style={{ color: textColor }}>
            Description{" "}
            <span style={{ opacity: 0.5, fontSize: 12 }}>(optional)</span>
          </p>
          <textarea
            className="createGift-textarea"
            style={{
              backgroundColor: textInputBackground,
              color: textInputColor,
            }}
            placeholder="e.g. Happy birthday!"
            maxLength={150}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div
          className="createGift-field"
          style={{ backgroundColor: backgroundOffset }}
        >
          <p className="createGift-label" style={{ color: textColor }}>
            Duration
          </p>
          <select
            className="createGift-select"
            style={{
              backgroundColor: textInputBackground,
              color: textInputColor,
            }}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <p className="createGift-disclaimer" style={{ color: textColor }}>
          This gift will expire after {duration} days. If unclaimed, you can
          reclaim the funds.
        </p>

        {error && <p className="createGift-error">{error}</p>}

        <CustomButton
          actionFunction={handleCreate}
          textContent="Create Gift"
          buttonStyles={{ width: "auto" }}
          // textStyles={primaryText}
          disabled={!amount || amountSats <= 0}
        />
      </div>
    </div>
  );
}
