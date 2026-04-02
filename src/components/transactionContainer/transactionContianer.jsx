import { useSpark } from "../../contexts/sparkContext";
import "./style.css";
import { useNavigate } from "react-router-dom";
import SkeletonLoadingTx from "./skeletonLoadingTx";
import FormattedSatText from "../formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import {
  APPROXIMATE_SYMBOL,
  BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
  HIDDEN_BALANCE_TEXT,
  USDB_TOKEN_ID,
} from "../../constants";
import ThemeText from "../themeText/themeText";
import { useThemeContext } from "../../contexts/themeContext";
import { useTranslation } from "react-i18next";
import { memo, useMemo, useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  CircleX,
  Gift,
  PiggyBank,
  UsersRound,
  ArrowLeftRight,
} from "lucide-react";
import { Colors } from "../../constants/theme";
import useThemeColors from "../../hooks/useThemeColors";
import { useAppStatus } from "../../contexts/appStatus";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";
import { isFlashnetTransfer } from "../../functions/spark/handleFlashnetTransferIds";
import { satsToDollars } from "../../functions/spark/flashnet";

const TRANSACTION_CONSTANTS = {
  VIEW_ALL_PAGE: "viewAllTx",
  SPARK_WALLET: "sparkWallet",
  HOME: "home",
  FAILED: "failed",
  PENDING: "pending",
  LIGHTNING: "lightning",
  LIGHTNING_INITIATED: "LIGHTNING_PAYMENT_INITIATED",
  INCOMING: "INCOMING",
  OUTGOING: "OUTGOING",
};

// Matches RN getTxIconName — returns which icon to show
const getTxIconName = (
  details,
  transactionPaymentType,
  showSwapConversion,
  isFailedPayment,
  isReceive,
) => {
  if (isFailedPayment) return "CircleX";
  if (showSwapConversion) return "Clock";
  return isReceive ? "ArrowDown" : "ArrowUp";
  if (details.isGift) return "Gift";
  if (details.isPoolPayment) return "PiggyBank";
  if (details.sendingUUID?.trim()) return "UsersRound";
  if (
    details.showSwapLabel ||
    (details.isLRC20Payment &&
      details.direction === "OUTGOING" &&
      (transactionPaymentType === "lightning" ||
        transactionPaymentType === "bitcoin"))
  ) {
    return "ArrowLeftRight";
  }
  return isReceive ? "ArrowDown" : "ArrowUp";
};

const ICON_MAP = {
  ArrowDown,
  ArrowUp,
  Clock,
  CircleX,
  Gift,
  PiggyBank,
  UsersRound,
  ArrowLeftRight,
};

// Utility functions
const calculateTimeDifference = (currentTime, paymentDate) => {
  const timeDifferenceMs = currentTime - paymentDate;
  const minutes = timeDifferenceMs / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  const years = days / 365;
  return { minutes, hours, days, years, timeDifferenceMs };
};

const generateBannerText = (timeDifference, texts) => {
  const { todayText, yesterdayText, dayText, monthText, yearText, agoText } =
    texts;
  if (timeDifference < 0.5) return todayText;
  if (timeDifference > 0.5 && timeDifference < 1) return yesterdayText;
  const roundedDays = Math.round(timeDifference);
  if (roundedDays <= 30) {
    return `${roundedDays} ${roundedDays === 1 ? dayText : dayText + "s"} ${agoText}`;
  }
  if (roundedDays < 365) {
    const months = Math.floor(roundedDays / 30);
    return `${months} ${monthText}${months === 1 ? "" : "s"} ${agoText}`;
  }
  const years = Math.floor(roundedDays / 365);
  return `${years} ${yearText}${years === 1 ? "" : "s"} ${agoText}`;
};

export default function TransactionContainer({
  frompage,
  scrollPosition,
  poolInfoRef,
}) {
  const { t } = useTranslation();
  const { didGetToHomepage } = useAppStatus();
  const { sparkInformation } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const currentTime = new Date();
  const navigate = useNavigate();
  const { darkModeType, theme } = useThemeContext();
  const { textColor, backgroundColor } = useThemeColors();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;
  const userBalanceDenomination = masterInfoObject?.userBalanceDenomination;
  const homepageTxPreferance = masterInfoObject?.homepageTxPreferance;

  const shownTxs = new Set();
  const transfers = sparkInformation?.transactions;
  const sparkTransactionsLength = transfers.length;

  let formattedTxs = [];
  const ln_funding_txIds = new Set();
  let currentGroupedDate = "";
  const transactionLimit =
    frompage !== "home" ? sparkTransactionsLength : homepageTxPreferance;

  if (
    (!sparkInformation.didConnect ||
      !sparkInformation.identityPubKey ||
      !didGetToHomepage) &&
    sparkTransactionsLength
  ) {
    formattedTxs.push(
      <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />,
    );
  }

  const bannerTexts = {
    todayText: t("constants.today"),
    yesterdayText: t("constants.yesterday"),
    dayText: t("constants.day"),
    monthText: t("constants.month"),
    yearText: t("constants.year"),
    agoText: t("transactionLabelText.ago"),
  };

  // First pass: collect ln_funding_txIds (mirrors RN logic)
  for (let i = 0; i < sparkTransactionsLength; i++) {
    try {
      const tx = transfers[i];
      const details = JSON.parse(tx.details);
      if (details?.ln_funding_id) {
        ln_funding_txIds.add(details.ln_funding_id);
      }
    } catch (_) {}
  }

  for (
    let transactionIndex = 0;
    transactionIndex < sparkTransactionsLength &&
    formattedTxs.length < transactionLimit;
    transactionIndex++
  ) {
    try {
      const currentTransaction = transfers[transactionIndex];
      const transactionPaymentType = currentTransaction.paymentType;
      const paymentStatus = currentTransaction.paymentStatus;
      const paymentDetails = JSON.parse(currentTransaction.details);
      const isLRC20Payment = paymentDetails.isLRC20Payment;
      const hasSavedTokenData =
        sparkInformation.tokens?.[paymentDetails.LRC20Token];

      const showSwapConversion =
        paymentDetails.performSwaptoUSD &&
        (!paymentDetails.completedSwaptoUSD ||
          !ln_funding_txIds.has(currentTransaction.sparkID));

      // --- Filter parity with RN ---
      if (
        !didEnabledLrc20 &&
        isLRC20Payment &&
        paymentDetails.LRC20Token !== USDB_TOKEN_ID
      )
        continue;
      if (
        paymentDetails.senderIdentityPublicKey ===
        import.meta.env.VITE_SPARK_IDENTITY_PUBKEY
      )
        continue;
      if (shownTxs.has(currentTransaction.sparkID)) continue;
      if (isLRC20Payment && !hasSavedTokenData) continue;
      if (paymentStatus === TRANSACTION_CONSTANTS.FAILED) continue;
      if (
        transactionPaymentType === TRANSACTION_CONSTANTS.LIGHTNING &&
        currentTransaction.status === TRANSACTION_CONSTANTS.LIGHTNING_INITIATED
      )
        continue;
      if (
        frompage === TRANSACTION_CONSTANTS.HOME &&
        isFlashnetTransfer(currentTransaction.sparkID)
      )
        continue;
      if (
        scrollPosition === "total" &&
        paymentDetails.showSwapLabel &&
        paymentDetails.direction === "OUTGOING"
      )
        continue;
      if (
        (scrollPosition === "sats" && isLRC20Payment) ||
        (scrollPosition === "sats" && showSwapConversion)
      )
        continue;
      if (
        (scrollPosition === "usd" &&
          isLRC20Payment &&
          paymentDetails.LRC20Token !== USDB_TOKEN_ID) ||
        (scrollPosition === "usd" && !isLRC20Payment && !showSwapConversion)
      )
        continue;

      const paymentDate = new Date(paymentDetails.time).getTime();
      const uniuqeIDFromTx = currentTransaction.sparkID;
      const isFailedPayment = paymentStatus === TRANSACTION_CONSTANTS.FAILED;
      const timeDifferenceInDays =
        (currentTime - paymentDate) / (1000 * 60 * 60 * 24);

      // Date banner
      if (
        (transactionIndex === 0 ||
          currentGroupedDate !==
            generateBannerText(timeDifferenceInDays, bannerTexts)) &&
        timeDifferenceInDays > 0.5 &&
        frompage !== TRANSACTION_CONSTANTS.HOME
      ) {
        const bannerText = generateBannerText(
          timeDifferenceInDays,
          bannerTexts,
        );
        currentGroupedDate = bannerText;
        formattedTxs.push(
          <ThemeText
            key={`banner-${transactionIndex}`}
            textContent={bannerText}
            className={"dateBannerText"}
          />,
        );
      }

      shownTxs.add(uniuqeIDFromTx);
      formattedTxs.push(
        <TxItem
          details={paymentDetails}
          navigate={navigate}
          key={uniuqeIDFromTx}
          tx={{ ...currentTransaction, details: paymentDetails }}
          index={transactionIndex}
          currentTime={currentTime}
          currnetTxTime={paymentDate}
          masterInfoObject={masterInfoObject}
          darkModeType={darkModeType}
          theme={theme}
          transactionPaymentType={transactionPaymentType}
          paymentDate={paymentDate}
          id={uniuqeIDFromTx}
          frompage={frompage}
          userBalanceDenomination={userBalanceDenomination}
          isFailedPayment={isFailedPayment}
          sparkInformation={sparkInformation}
          isLRC20Payment={isLRC20Payment}
          showSwapConversion={showSwapConversion}
          poolInfoRef={poolInfoRef}
          isLastItem={false}
        />,
      );
    } catch (err) {
      console.log(err);
    }
  }

  if (!formattedTxs.length) {
    if (frompage === TRANSACTION_CONSTANTS.VIEW_ALL_PAGE) {
      return (
        <div className="transactionContainer">
          <ThemeText
            textStyles={{ marginTop: 20 }}
            className={"noTxText"}
            textContent={
              "Send or receive a transaction for it to show up here."
            }
          />
        </div>
      );
    } else {
      return (
        <div
          style={{ flexDirection: "row", alignItems: "center" }}
          className="transactionContainer"
        >
          <div
            style={{
              width: 45,
              height: 45,
              marginRight: 10,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: backgroundColor,
            }}
          >
            <Clock color={textColor} size={25} />
          </div>
          <ThemeText textContent={t("wallet.homeLightning.home.noTxs")} />
        </div>
      );
    }
  }

  return <div className="transactionContainer">{formattedTxs}</div>;
}

export const TxItem = memo(function TxItem({
  tx: transaction,
  index,
  currentTime,
  navigate,
  details,
  paymentDate,
  userBalanceDenomination,
  isFailedPayment,
  sparkInformation,
  isLRC20Payment,
  theme,
  darkModeType,
  frompage,
  transactionPaymentType,
  showSwapConversion,
  poolInfoRef,
  isLastItem,
  isFirstItem,
  masterInfoObject,
}) {
  const { t } = useTranslation();
  const timeDifference = useMemo(
    () => calculateTimeDifference(currentTime, paymentDate),
    [currentTime, paymentDate],
  );
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();

  const token = useMemo(
    () =>
      isLRC20Payment
        ? sparkInformation.tokens?.[transaction.details.LRC20Token]
            ?.tokenMetadata
        : null,
    [isLRC20Payment, sparkInformation.tokens, transaction.details.LRC20Token],
  );
  const showPendingTransactionStatusIcon =
    transaction.paymentStatus === TRANSACTION_CONSTANTS.PENDING ||
    transaction.isBalancePending ||
    showSwapConversion;

  const isReceive =
    transaction.details.direction === TRANSACTION_CONSTANTS.INCOMING;

  const iconName = getTxIconName(
    transaction.details,
    transactionPaymentType,
    showSwapConversion,
    isFailedPayment,
    isReceive,
  );

  const isGrayMode = theme && darkModeType;

  const iconBg =
    frompage === TRANSACTION_CONSTANTS.HOME
      ? backgroundColor
      : backgroundOffset;

  const iconColor = isGrayMode
    ? textColor
    : isFailedPayment
      ? theme && darkModeType
        ? textColor
        : Colors.constants.cancelRed
      : Colors.constants.blue;

  const amountColor = textColor;

  const paymentDescription = transaction.details?.description?.trim();
  const isDefaultDescription =
    paymentDescription === BLITZ_DEFAULT_PAYMENT_DESCRIPTION;

  const IconComponent = showPendingTransactionStatusIcon
    ? ICON_MAP["Clock"]
    : ICON_MAP[iconName] || ArrowDown;

  const descriptionContent = useMemo(() => {
    if (isFailedPayment) return t("transactionLabelText.notSent");
    if (isDefaultDescription || !paymentDescription) {
      return transaction.details.direction === TRANSACTION_CONSTANTS.OUTGOING
        ? t("constants.sent")
        : t("constants.received");
    }
    return paymentDescription;
  }, [
    isFailedPayment,
    isDefaultDescription,
    paymentDescription,
    transaction.details.direction,
    t,
  ]);

  const timeDisplayContent = useMemo(() => {
    const { minutes, hours, days, years } = timeDifference;
    if (minutes <= 1) return "Just now";
    let value, unit;
    if (minutes <= 60) {
      value = Math.round(minutes);
      unit = t("constants.minute") + (value === 1 ? "" : "s");
    } else if (hours <= 24) {
      value = Math.round(hours);
      unit = t("constants.hour") + (value === 1 ? "" : "s");
    } else if (days <= 365) {
      value = Math.round(days);
      unit = t("constants.day") + (value === 1 ? "" : "s");
    } else {
      value = Math.round(years);
      unit = value === 1 ? "year" : "years";
    }
    return `${value} ${unit} ${t("transactionLabelText.ago")}`;
  }, [timeDifference, t]);

  const handleClick = useCallback(() => {
    navigate("/expanded-tx", {
      state: { transaction: { ...transaction, details } },
    });
  }, [navigate, transaction, details]);

  return (
    <div
      style={{
        width: frompage === "home" ? "100%" : "85%",
        position: "relative",
      }}
      onClick={handleClick}
      className="transaction"
      key={index}
    >
      <div
        style={{
          width: 45,
          height: 45,
          marginRight: 10,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconBg,
        }}
      >
        <IconComponent color={iconColor} size={25} />
      </div>

      <div className="textContainer">
        <ThemeText
          className={"descriptionText"}
          textContent={descriptionContent}
          style={isFailedPayment ? { fontStyle: "italic" } : undefined}
        />
        <ThemeText className={"dateText"} textContent={timeDisplayContent} />
      </div>

      {!isFailedPayment &&
        (showSwapConversion && poolInfoRef ? (
          <FormattedSatText
            frontText={APPROXIMATE_SYMBOL}
            balance={
              satsToDollars(
                transaction.details.amount,
                poolInfoRef.currentPriceAInB,
              ) *
              (1 - (poolInfoRef.lpFeeBps / 100 + 1) / 100)
            }
            useCustomLabel={true}
            customLabel={token?.tokenTicker || "USDB"}
            useMillionDenomination={true}
          />
        ) : (
          <FormattedSatText
            frontText={
              userBalanceDenomination !== "hidden"
                ? transaction.details.direction ===
                  TRANSACTION_CONSTANTS.INCOMING
                  ? "+"
                  : "-"
                : ""
            }
            balance={
              isLRC20Payment
                ? formatTokensNumber(
                    transaction.details.amount,
                    token?.decimals,
                  )
                : transaction.details.amount
            }
            useCustomLabel={isLRC20Payment}
            customLabel={token?.tokenTicker?.slice(0, 3)}
            useMillionDenomination={true}
            masterInfoObject={masterInfoObject}
          />
        ))}

      {/* Hairline divider matching RN txDivider — hidden on last item */}
      {/* {!isLastItem && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 68,
            right: 0,
            height: 1,
            backgroundColor: textColor,
            opacity: 0.08,
          }}
        />
      )} */}
    </div>
  );
});
