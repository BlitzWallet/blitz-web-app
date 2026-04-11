import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./splashScreen.css";
import { updateBlitzAnimationData } from "../../functions/lottieViewColorTransformers";
import blizBLogo from "../../assets/BlitzAnimation.json";
import { useThemeContext } from "../../contexts/themeContext";
import Lottie from "lottie-react";
import { initializeDatabase } from "../../functions/messaging/cachedMessages";
// import { initializeGiftCardDatabase } from "../../functions/contacts/giftCardStorage";
import { initializePOSTransactionsDatabase } from "../../functions/pos";
import { initializeSparkDatabase } from "../../functions/spark/transactions";
// import { initRootstockSwapDB } from "../../functions/boltz/rootstock/swapDb";
import { initGiftDb } from "../../functions/gift/giftsStorage";
import { useTranslation } from "react-i18next";
import { initPoolDb } from "../../functions/pools/poolsStorage";
import { initSavingsDb } from "../../functions/savings/savingsStorage";

/**
 * SplashScreen — web equivalent of the React Native splash screen.
 *
 * Mirrors the RN behaviour:
 *  - Initialises DBs / auth checks while the animation plays
 *  - Navigates to "/" (home) after ~2 750 ms
 *  - Shows an error state if initialisation fails
 *
 * Theming is driven by the same CSS variables your ThemeContextProvider
 * should expose:  --bg-color, --accent-color, --bolt-color
 * (fallbacks are provided so the screen works standalone too).
 */
export default function SplashScreen({ onInit, onDone }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("enter"); // enter | hold | exit
  const timerRef = useRef(null);
  const { theme } = useThemeContext();
  const didRun = useRef(null);

  const transformedAnimation = useMemo(() => {
    return updateBlitzAnimationData(blizBLogo, theme ? "white" : "blue");
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (didRun.current) return;
      didRun.current = true;
      try {
        const didOpen = await initializeDatabase();
        // const giftCardTable = await initializeGiftCardDatabase();
        const posTransactions = await initializePOSTransactionsDatabase();
        const sparkTxs = await initializeSparkDatabase();
        // const rootstockSwaps = await initRootstockSwapDB();
        const giftsDb = await initGiftDb();
        const poolsDB = await initPoolDb();
        const savingsDB = await initSavingsDb();

        if (
          !didOpen ||
          //   !giftCardTable ||
          !posTransactions ||
          !sparkTxs ||
          //   !rootstockSwaps ||
          !giftsDb ||
          !poolsDB ||
          !savingsDB
        )
          throw new Error(t("screens.inAccount.loadingScreen.dbInitError"));

        // Match the RN 2 750 ms delay before navigating away
        timerRef.current = setTimeout(() => {
          setPhase("exit");
          setTimeout(() => onDone(), 400); // wait for fade-out then unmount
        }, 2750);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Initialisation failed.");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      // didRun.current = false;
    };
  }, []);

  return (
    <div className={`splash-root splash-${phase}`}>
      {error ? (
        <ErrorView message={error} />
      ) : (
        <LogoView transformedAnimation={transformedAnimation} />
      )}
    </div>
  );
}

/* ─── Logo animation ─────────────────────────────────────────── */

function LogoView({ transformedAnimation }) {
  return (
    <div className="splash-center">
      <Lottie
        style={{ width: "70%", aspectRatio: 1 }}
        animationData={transformedAnimation}
        loop={true}
      />
    </div>
  );
}

/* ─── Error view ─────────────────────────────────────────────── */

function ErrorView({ message }) {
  return (
    <div className="splash-error">
      {/* Simple "X" icon – mirrors the RN errorTxAnimation */}
      <svg viewBox="0 0 80 80" className="splash-error-icon" aria-hidden="true">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="var(--accent-color,#0375F6)"
          strokeWidth="4"
          fill="none"
        />
        <line
          x1="25"
          y1="25"
          x2="55"
          y2="55"
          stroke="#ff4d4d"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="55"
          y1="25"
          x2="25"
          y2="55"
          stroke="#ff4d4d"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>

      <p className="splash-error-title">Database initialisation failed</p>
      <p className="splash-error-body">{message}</p>

      <a
        href="https://recover.blitzwalletapp.com/"
        target="_blank"
        rel="noreferrer"
        className="splash-error-btn"
      >
        Recover wallet
      </a>
    </div>
  );
}
