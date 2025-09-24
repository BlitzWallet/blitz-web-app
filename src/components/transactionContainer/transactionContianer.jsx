import { useSpark } from "../../contexts/sparkContext";
import { TransferDirection } from "@buildonspark/spark-sdk/types";
import "./style.css";
import arrow from "../../assets/arrow-left-blue.png";
import pendingTx from "../../assets/pendingTx.png";
import { useNavigate } from "react-router-dom";
import SkeletonLoadingTx from "./skeletonLoadingTx";
import FormattedSatText from "../formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { HIDDEN_BALANCE_TEXT } from "../../constants";
import ThemeText from "../themeText/themeText";
import { useThemeContext } from "../../contexts/themeContext";

export default function TransactionContanier({ frompage }) {
  const { sparkInformation } = useSpark();
  const { masterInfoObject } = useGlobalContextProvider();
  const currentTime = new Date();
  const navigate = useNavigate();
  const { darkModeType, theme } = useThemeContext();

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
  const groupedTransfers = [];
  let lastBanner = null;

  transfers.forEach((tx, index) => {
    const details = JSON.parse(tx.details);
    const currnetTxTime = new Date(details.time).getTime();

    if (tx?.type === "PREIMAGE_SWAP" && tx?.status === "INVOICE_CREATED")
      return;

    const bannerText = getBannerText(currentTime, currnetTxTime);

    if (bannerText !== lastBanner && frompage !== "home") {
      lastBanner = bannerText;
      groupedTransfers.push(
        <ThemeText
          key={`banner-${index}`}
          textContent={bannerText}
          className={"dateBannerText"}
        />
      );
    }

    groupedTransfers.push(
      <TxItem
        details={details}
        navigate={navigate}
        key={index}
        tx={tx}
        index={index}
        currentTime={currentTime}
        currnetTxTime={currnetTxTime}
        masterInfoObject={masterInfoObject}
        darkModeType={darkModeType}
        theme={theme}
      />
    );
  });

  if (!groupedTransfers?.length) {
    return (
      <div className="transactionContainer">
        <ThemeText
          className={"noTxText"}
          textContent={"Send or receive a transaction for it to show up here."}
        />
      </div>
    );
  }
  return (
    <div className="transactionContainer">
      {groupedTransfers.slice(
        0,
        frompage === "home" ? masterInfoObject.homepageTxPreferance : undefined
      )}
      {groupedTransfers?.length >= masterInfoObject.homepageTxPreferance &&
        frompage === "home" && (
          <ThemeText
            clickFunction={() => navigate("/viewAllTransactions")}
            className={"viewAllTxText"}
            textContent={"View all transactions"}
          />
        )}
    </div>
  );
}

function TxItem({
  tx,
  index,
  currentTime,
  navigate,
  details,
  masterInfoObject,
  darkModeType,
  theme,
}) {
  const timeDifference = currentTime - details.time;
  const minutes = timeDifference / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  const years = days / 365;

  const paymentType = tx.paymentType;
  const isPending = tx.paymentStatus === "pending";

  const description = details.description;

  return (
    <div
      onClick={() =>
        navigate("/expanded-tx", {
          state: { transaction: { ...tx, details: details } },
        })
      }
      className="transaction"
      key={index}
    >
      <img
        style={{
          transform: `rotate(${
            isPending
              ? "0deg"
              : details.direction === "INCOMING"
              ? "-90deg"
              : "90deg"
          })`,
          filter:
            theme && darkModeType
              ? "brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(134deg) brightness(111%) contrast(101%)"
              : "initial",
        }}
        src={isPending ? pendingTx : arrow}
        alt=""
      />
      <div className="textContainer">
        <ThemeText
          className={"descriptionText"}
          textContent={
            masterInfoObject.userBalanceDenomination === "hidden"
              ? HIDDEN_BALANCE_TEXT
              : description
              ? description
              : details.direction === "INCOMING"
              ? "Received"
              : "Sent"
          }
        />
        <ThemeText
          className={"dateText"}
          textContent={`${
            minutes <= 1
              ? `Just now`
              : minutes <= 60
              ? Math.round(minutes) || ""
              : hours <= 24
              ? Math.round(hours)
              : days <= 365
              ? Math.round(days)
              : Math.round(years)
          } ${
            minutes <= 1
              ? ""
              : minutes <= 60
              ? "minute" + (Math.round(minutes) === 1 ? "" : "s")
              : hours <= 24
              ? "hour" + (Math.round(hours) === 1 ? "" : "s")
              : days <= 365
              ? "day" + (Math.round(days) === 1 ? "" : "s")
              : Math.round(years) === 1
              ? "year"
              : "years"
          } ${minutes < 1 ? "" : "ago"}`}
        />
      </div>

      <FormattedSatText
        frontText={
          masterInfoObject.userBalanceDenomination !== "hidden"
            ? details.direction === TransferDirection.OUTGOING
              ? "-"
              : "+"
            : ""
        }
        balance={details.amount}
      />
    </div>
  );
}

function getBannerText(currentTime, txTime) {
  const timeDifferenceMs = currentTime - txTime;
  const minutes = timeDifferenceMs / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  const years = days / 365;

  if (days < 0.5) return "Today";
  if (days >= 0.5 && days < 1) return "Yesterday";
  if (days < 30)
    return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"} ago`;
  if (days < 365)
    return `${Math.floor(days / 30)} month${
      Math.floor(days / 30) === 1 ? "" : "s"
    } ago`;
  return `${Math.floor(years)} year${Math.floor(years) === 1 ? "" : "s"} ago`;
}
