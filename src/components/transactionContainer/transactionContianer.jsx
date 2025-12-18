import { useSpark } from "../../contexts/sparkContext";
import { TransferDirection } from "@buildonspark/spark-sdk/types";
import "./style.css";
import { useNavigate } from "react-router-dom";
import SkeletonLoadingTx from "./skeletonLoadingTx";
import FormattedSatText from "../formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import {
  BLITZ_DEFAULT_PAYMENT_DESCRIPTION,
  HIDDEN_BALANCE_TEXT,
} from "../../constants";
import ThemeText from "../themeText/themeText";
import { useThemeContext } from "../../contexts/themeContext";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";
import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { Colors } from "../../constants/theme";
import useThemeColors from "../../hooks/useThemeColors";
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

export default function TransactionContanier({ frompage }) {
  const { t } = useTranslation();
  const { sparkInformation } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const currentTime = new Date();
  const navigate = useNavigate();
  const { darkModeType, theme } = useThemeContext();
  const didEnabledLrc20 = masterInfoObject.lrc20Settings?.isEnabled;
  const userBalanceDenomination = masterInfoObject?.userBalanceDenomination;
  const homepageTxPreferance = masterInfoObject?.homepageTxPreferance;

  if (frompage === "home" && sparkInformation.didConnect === null) {
    return (
      <div className="transactionContainer">
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
        <SkeletonLoadingTx theme={theme} darkModeType={darkModeType} />
      </div>
    );
  }
  if (frompage === "home" && !sparkInformation.didConnect) {
    return (
      <div className="transactionContainer">
        <ThemeText
          className={"noTxText"}
          textContent={"Error connecting to spark."}
        />
      </div>
    );
  }
  const transfers = sparkInformation?.transactions;
  const sparkTransactionsLength = transfers.length;
  const formattedTxs = [];
  let currentGroupedDate = "";
  const transactionLimit =
    frompage !== "home"
      ? sparkTransactionsLength
      : masterInfoObject.homepageTxPreferance;

  const bannerTexts = {
    todayText: t("constants.today"),
    yesterdayText: t("constants.yesterday"),
    dayText: t("constants.day"),
    monthText: t("constants.month"),
    yearText: t("constants.year"),
    agoText: t("transactionLabelText.ago"),
  };

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

      const paymentDetails =
        frompage === TRANSACTION_CONSTANTS.SPARK_WALLET
          ? {
              time: currentTransaction.createdTime,
              direction: currentTransaction.transferDirection,
              amount: currentTransaction.totalValue,
            }
          : JSON.parse(currentTransaction.details);

      const isLRC20Payment = paymentDetails.isLRC20Payment;

      // Early continue conditions

      if (!didEnabledLrc20 && isLRC20Payment) continue;
      if (
        paymentStatus === TRANSACTION_CONSTANTS.FAILED &&
        paymentDetails.direction === TRANSACTION_CONSTANTS.INCOMING
      )
        continue;

      if (
        transactionPaymentType === TRANSACTION_CONSTANTS.LIGHTNING &&
        currentTransaction.status === TRANSACTION_CONSTANTS.LIGHTNING_INITIATED
      )
        continue;

      const paymentDate = new Date(paymentDetails.time).getTime();
      const uniuqeIDFromTx = currentTransaction.sparkID;
      const isFailedPayment = paymentStatus === TRANSACTION_CONSTANTS.FAILED;

      // Calculate time difference once
      const timeDifferenceInDays =
        (currentTime - paymentDate) / (1000 * 60 * 60 * 24);

      // Add date banner if needed
      if (
        (transactionIndex === 0 ||
          currentGroupedDate !==
            generateBannerText(timeDifferenceInDays, bannerTexts)) &&
        timeDifferenceInDays > 0.5 &&
        frompage !== TRANSACTION_CONSTANTS.HOME
      ) {
        const bannerText = generateBannerText(
          timeDifferenceInDays,
          bannerTexts
        );
        currentGroupedDate = bannerText;
        formattedTxs.push(
          <ThemeText
            key={`banner-${transactionIndex}`}
            textContent={bannerText}
            className={"dateBannerText"}
          />
        );
      }

      const styledTx = (
        <TxItem
          details={paymentDetails}
          navigate={navigate}
          key={transactionIndex}
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
        />
      );

      formattedTxs.push(styledTx);
    } catch (err) {
      // Only log in development
      console.log(err);
    }
  }

  if (!formattedTxs?.length) {
    return [
      <div className="transactionContainer">
        <ThemeText
          textStyles={{ marginTop: 20 }}
          className={"noTxText"}
          textContent={"Send or receive a transaction for it to show up here."}
        />
      </div>,
    ];
  }
  if (
    frompage !== TRANSACTION_CONSTANTS.VIEW_ALL_PAGE &&
    frompage !== TRANSACTION_CONSTANTS.SPARK_WALLET &&
    formattedTxs.length === homepageTxPreferance
  ) {
    formattedTxs.push(
      <ThemeText
        key={"viewAllTxText"}
        clickFunction={() => navigate("/viewAllTransactions")}
        className={"viewAllTxText"}
        textContent={"View all transactions"}
      />
    );
  }
  return <div className="transactionContainer">{formattedTxs}</div>;
}

function TxItem({
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
}) {
  const { t } = useTranslation();
  const timeDifference = useMemo(
    () => calculateTimeDifference(currentTime, paymentDate),
    [currentTime, paymentDate]
  );
  const { backgroundColor, backgroundOffset } = useThemeColors();

  const token = useMemo(
    () =>
      isLRC20Payment
        ? sparkInformation.tokens?.[transaction.details.LRC20Token]
            ?.tokenMetadata
        : null,
    [isLRC20Payment, sparkInformation.tokens, transaction.details.LRC20Token]
  );

  const isPending = transaction.paymentStatus === "pending";

  const showPendingTransactionStatusIcon =
    transaction.paymentStatus === TRANSACTION_CONSTANTS.PENDING;
  const paymentDescription = transaction.details?.description?.trim();
  const isDefaultDescription =
    paymentDescription === BLITZ_DEFAULT_PAYMENT_DESCRIPTION;

  const descriptionContent = useMemo(() => {
    if (isFailedPayment) return t("transactionLabelText.notSent");
    // if (userBalanceDenomination === 'hidden') return HIDDEN_BALANCE_TEXT;
    if (isDefaultDescription || !paymentDescription) {
      return transaction.details.direction === TRANSACTION_CONSTANTS.OUTGOING
        ? t("constants.sent")
        : t("constants.received");
    }
    return paymentDescription;
  }, [
    isFailedPayment,
    userBalanceDenomination,
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

  return (
    <div
      style={{ width: frompage === "home" ? "100%" : "90%" }}
      onClick={() =>
        navigate("/expanded-tx", {
          state: { transaction: { ...transaction, details: details } },
        })
      }
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
          backgroundColor:
            frompage === "home" ? backgroundColor : backgroundOffset,
        }}
      >
        {isPending ? (
          <Clock
            color={
              theme && darkModeType
                ? details.direction === "INCOMING"
                  ? Colors.dark.text
                  : Colors.dark.text
                : details.direction === "INCOMING"
                ? Colors.constants.blue
                : theme
                ? Colors.dark.text
                : Colors.light.text
            }
            size={25}
          />
        ) : details.direction === "INCOMING" ? (
          <ArrowDown
            color={
              theme && darkModeType
                ? details.direction === "INCOMING"
                  ? Colors.dark.text
                  : Colors.dark.text
                : details.direction === "INCOMING"
                ? Colors.constants.blue
                : theme
                ? Colors.dark.text
                : Colors.light.text
            }
            size={25}
          />
        ) : (
          <ArrowUp
            color={
              theme && darkModeType
                ? details.direction === "INCOMING"
                  ? Colors.dark.text
                  : Colors.dark.text
                : details.direction === "INCOMING"
                ? Colors.constants.blue
                : theme
                ? Colors.dark.text
                : Colors.light.text
            }
            size={25}
          />
        )}
      </div>
      <div className="textContainer">
        <ThemeText
          className={"descriptionText"}
          textContent={descriptionContent}
        />
        <ThemeText className={"dateText"} textContent={timeDisplayContent} />
      </div>
      {!isFailedPayment && (
        <FormattedSatText
          frontText={
            userBalanceDenomination !== "hidden"
              ? transaction.details.direction === TRANSACTION_CONSTANTS.INCOMING
                ? "+"
                : "-"
              : ""
          }
          balance={
            isLRC20Payment
              ? formatTokensNumber(transaction.details.amount, token?.decimals)
              : transaction.details.amount
          }
          useCustomLabel={isLRC20Payment}
          customLabel={token?.tokenTicker?.slice(0, 3)}
          useMillionDenomination={true}
        />
      )}
    </div>
  );
}

// Utility functions moved outside component
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
    return `${roundedDays} ${
      roundedDays === 1 ? dayText : dayText + "s"
    } ${agoText}`;
  }

  if (roundedDays < 365) {
    const months = Math.floor(roundedDays / 30);
    return `${months} ${monthText}${months === 1 ? "" : "s"} ${agoText}`;
  }

  const years = Math.floor(roundedDays / 365);
  return `${years} ${yearText}${years === 1 ? "" : "s"} ${agoText}`;
};
