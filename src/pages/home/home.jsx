import { useNavigate } from "react-router-dom";
import "./login.css";
import CustomButton from "../../components/customButton/customButton";
import { Colors } from "../../constants/theme";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { useOverlay } from "../../contexts/overlayContext";
import { useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BOX_STROKE = "#D8DCE3";
const BOX_SIZE = 52;
const LIGHT_BG = "#FFFFFF"; // swap to your lightModeBackground value

// ─── Box-grid SVG background ─────────────────────────────────────────────────
function BoxGrid() {
  // Use viewport units so it always fills the screen
  const W = window.innerWidth;
  const H = window.innerHeight;
  const STEP = BOX_SIZE;
  const cols = Math.ceil(W / STEP) + 1;
  const rows = Math.ceil(H / STEP) + 1;

  const boxes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push({ x: c * STEP, y: r * STEP, key: `${r}-${c}` });
    }
  }

  return (
    <svg
      width={W}
      height={H}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LIGHT_BG} stopOpacity="0" />
          <stop offset="68%" stopColor={LIGHT_BG} stopOpacity="0" />
          <stop offset="100%" stopColor={LIGHT_BG} stopOpacity="1" />
        </linearGradient>
      </defs>

      {boxes.map((b) => (
        <rect
          key={b.key}
          x={b.x}
          y={b.y}
          width={BOX_SIZE}
          height={BOX_SIZE}
          fill={LIGHT_BG}
          stroke={BOX_STROKE}
          strokeWidth={0.8}
        />
      ))}

      {/* Gradient overlay that fades the grid out toward the bottom */}
      <rect x={0} y={0} width={W} height={H} fill="url(#fade)" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
function Home() {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setMnemoinc, mnemoinc } = useAuth();

  const generateSeed = () => {
    try {
      let generatedMnemonic = generateMnemonic(wordlist);
      const uniqueKeys = new Set(generatedMnemonic.split(" "));

      if (uniqueKeys.size !== 12) {
        let runCount = 0;
        let didFindValidMnemonic = false;
        while (runCount < 50 && !didFindValidMnemonic) {
          console.log(`Running retry for account mnemonic count: ${runCount}`);
          runCount += 1;
          const newTry = generateMnemonic(wordlist);
          const uniqueItems = new Set(newTry.split(" "));
          if (uniqueItems.size !== 12) continue;
          didFindValidMnemonic = true;
          generatedMnemonic = newTry;
        }
      }
      setMnemoinc(generatedMnemonic);
    } catch (err) {
      openOverlay({ for: "error", errorMessage: err.message });
      console.log("Error generating seed", err);
    }
  };

  useEffect(() => {
    if (mnemoinc) return;
    generateSeed();
  }, [mnemoinc]);

  return (
    <div className="loginComponent">
      <BoxGrid />

      {/* ── Headline — fades + slides up (mirrors RN headingStyle) ── */}
      <div className="heroWrap">
        <h1 className="headline">{t("createAccount.homePage.money")}</h1>
        <h1 className="headline">{t("createAccount.homePage.made")}</h1>
        <h1 className="headline headline--accent">
          {t("createAccount.homePage.simple")}
        </h1>
      </div>

      {/* ── CTAs — fades in after headline (mirrors RN btnsStyle) ── */}
      <div className="ctaSection">
        <CustomButton
          buttonClassName="actionButton actionButton--primary"
          actionFunction={() =>
            navigate("/disclaimer", {
              state: { nextPageName: "/createPassword" },
            })
          }
          textStyles={{ color: Colors.dark.text }}
          buttonStyles={{ backgroundColor: Colors.light.blue }}
          textContent={t("createAccount.homePage.buttons.button2")}
        />

        <CustomButton
          buttonClassName="actionButton actionButton--secondary"
          actionFunction={() =>
            navigate("/disclaimer", { state: { nextPageName: "/restore" } })
          }
          textContent={t("createAccount.homePage.buttons.button1")}
        />

        <p className="disclaimer">{t("createAccount.homePage.subtitle")}</p>
      </div>
    </div>
  );
}

export default Home;
