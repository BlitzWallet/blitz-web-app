import { useRef, useState, useCallback } from "react";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../contexts/sparkContext";
import "./style.css";
import handleDBStateChange from "../../../../functions/handleDBStateChange";
import ThemeText from "../../../../components/themeText/themeText";
import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Colors } from "../../../../constants/theme";
import formatBalanceAmount from "../../../../functions/formatNumber";
import { useUserBalanceContext } from "../../../../contexts/userBalanceContext";

const PAGES = [
  { key: "total", labelKey: "constants.total_balance" },
  { key: "sats", labelKey: "constants.sat_balance" },
  { key: "usd", labelKey: "constants.usd_balance" },
];

export default function UserBalance() {
  const { t } = useTranslation();
  const { sparkInformation } = useSpark();
  const { toggleMasterInfoObject, masterInfoObject, setMasterInfoObject } =
    useGlobalContextProvider();
  const { theme, darkModeType } = useThemeContext();
  const { bitcoinBalance, dollarBalanceToken, totalSatValue } =
    useUserBalanceContext();
  const saveTimeoutRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(0);

  const dragStartX = useRef(null);
  const didSwipe = useRef(false);

  const dotColor =
    theme && darkModeType ? Colors.dark.text : Colors.constants.blue;

  const getBalanceForPage = useCallback(
    (pageKey) => {
      if (pageKey === "total") return totalSatValue;
      if (pageKey === "sats") return bitcoinBalance;
      return formatBalanceAmount(dollarBalanceToken, false, masterInfoObject);
    },
    [totalSatValue, bitcoinBalance, dollarBalanceToken, masterInfoObject],
  );

  const getDenominationForPage = useCallback(
    (pageKey) => {
      const hidden = masterInfoObject.userBalanceDenomination === "hidden";
      if (hidden) return "hidden";
      if (pageKey === "total") return masterInfoObject.userBalanceDenomination;
      if (pageKey === "sats") return "sats";
      return "fiat";
    },
    [masterInfoObject.userBalanceDenomination],
  );

  const goToPage = useCallback((idx) => {
    setCurrentPage(Math.max(0, Math.min(PAGES.length - 1, idx)));
  }, []);

  const onPointerDown = (e) => {
    dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX;
    didSwipe.current = false;
  };

  const onPointerUp = (e) => {
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    if (dragStartX.current === null || endX === undefined) return;
    const dx = endX - dragStartX.current;
    if (Math.abs(dx) > 40) {
      didSwipe.current = true;
      goToPage(currentPage + (dx < 0 ? 1 : -1));
    }
    dragStartX.current = null;
  };

  const handleBalanceClick = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const den = masterInfoObject.userBalanceDenomination;
    const pageKey = PAGES[currentPage].key;
    let nextDen;
    if (pageKey === "total") {
      nextDen = den === "sats" ? "fiat" : den === "fiat" ? "hidden" : "sats";
    } else {
      nextDen =
        den !== "hidden" ? "hidden" : pageKey === "sats" ? "sats" : "fiat";
    }
    handleDBStateChange(
      { userBalanceDenomination: nextDen },
      setMasterInfoObject,
      toggleMasterInfoObject,
      saveTimeoutRef,
    );
  };

  return (
    <div className="userBalanceContainer">
      {/* Pager */}
      <div
        className="balancePagerTrack"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchEnd={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="balancePagerSlides"
          style={{ transform: `translateX(calc(-${currentPage} * 100%))` }}
        >
          {PAGES.map((page) => (
            <div
              key={page.key}
              className="balancePagerPage"
              onClick={handleBalanceClick}
            >
              <ThemeText
                textContent={t(page.labelKey)}
                textStyles={{
                  textTransform: "uppercase",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  opacity: 0.55,
                }}
              />
              <FormattedSatText
                styles={{
                  fontSize: "2.5rem",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1,
                }}
                balance={getBalanceForPage(page.key)}
                useSizing={true}
                globalBalanceDenomination={getDenominationForPage(page.key)}
                forceCurrency={page.key === "usd" ? "USD" : ""}
                useBalance={page.key === "usd"}
                masterInfoObject={masterInfoObject}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="balanceDots">
        {PAGES.map((page, i) => (
          <button
            key={page.key}
            className={`balanceDot ${i === currentPage ? "balanceDotActive" : ""}`}
            style={{
              backgroundColor: dotColor,
              opacity: i === currentPage ? 1 : 0.3,
              width: i === currentPage ? "20px" : "6px",
            }}
            onClick={() => goToPage(i)}
            aria-label={t(page.labelKey)}
          />
        ))}
      </div>
    </div>
  );
}
