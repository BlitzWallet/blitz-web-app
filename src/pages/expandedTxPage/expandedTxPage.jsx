import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import "./style.css";

import ThemeText from "../../components/themeText/themeText";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import CustomButton from "../../components/customButton/customButton";
import BackArrow from "../../components/backArrow/backArrow";

import { Colors } from "../../constants/theme";
import { TOKEN_TICKER_MAX_LENGTH } from "../../constants";

import { useThemeContext } from "../../contexts/themeContext";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useImageCache } from "../../contexts/imageCacheContext";
import { useSpark } from "../../contexts/sparkContext";
import useThemeColors from "../../hooks/useThemeColors";

import { bulkUpdateSparkTransactions } from "../../functions/spark/transactions";
import { formatLocalTimeShort } from "../../functions/timeFormatter";
import displayCorrectDenomination from "../../functions/displayCorrectDenomination";

import { Check, Clock, X, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTokensNumber } from "../../functions/lrc20/formatTokensBalance";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";

export default function ExpandedTxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const { decodedAddedContacts } = useGlobalContacts();
  const { masterInfoObject } = useGlobalContextProvider();
  const { fiatStats } = useNodeContext();
  const { cache } = useImageCache();
  const { sparkInformation } = useSpark();

  const [transaction, setTransaction] = useState(location.state.transaction);

  const sendingContactUUID = transaction.details?.sendingUUID;

  const selectedContact = useMemo(() => {
    return decodedAddedContacts?.find((c) => c.uuid === sendingContactUUID);
  }, [decodedAddedContacts, sendingContactUUID]);

  const isPending = transaction.paymentStatus === "pending";
  const isFailed = transaction.paymentStatus === "failed";

  const isLRC20Payment = transaction.details.isLRC20Payment;
  const selectedToken = isLRC20Payment
    ? sparkInformation.tokens?.[transaction.details.LRC20Token]
    : undefined;

  const formattedTokensBalance = formatTokensNumber(
    transaction.details.amount,
    selectedToken?.tokenMetadata?.decimals
  );
  console.log(transaction, sendingContactUUID);
  const paymentType = sendingContactUUID
    ? t("screens.inAccount.expandedTxPage.contactPaymentType")
    : transaction.details.isGift
    ? t("constants.gift")
    : transaction.paymentType;

  const paymentDate = new Date(transaction.details.time);

  const handleSave = async (memoText) => {
    if (memoText === transaction.details.description) return;
    const newTx = structuredClone(transaction);
    newTx.details.description = memoText;
    newTx.useTempId = true;
    newTx.id = transaction.sparkID;
    newTx.tempID = transaction.sparkID;
    await bulkUpdateSparkTransactions(
      [newTx],
      undefined,
      undefined,
      undefined,
      true
    );
    setTransaction(newTx);
  };

  const statusColors = getStatusColors({
    theme,
    darkModeType,
    isPending,
    isFailed,
  });

  return (
    <>
      <BackArrow backFunction={() => navigate(-1)} />

      <div className="expandedTxContainer">
        <div
          className="receiptContainer"
          style={{
            backgroundColor: theme
              ? backgroundOffset
              : Colors.light.expandedTxReceitBackground,
          }}
        >
          <StatusCircle
            isPending={isPending}
            isFailed={isFailed}
            colors={statusColors}
            backgroundColor={backgroundColor}
            theme={theme}
          />

          <ThemeText
            className="receiveAmountLabel"
            textContent={t("screens.inAccount.expandedTxPage.confirmMessage", {
              context:
                transaction.details.direction === "OUTGOING" || isFailed
                  ? "sent"
                  : "received",
            })}
          />

          <FormattedSatText
            neverHideBalance={true}
            balance={
              isLRC20Payment && formattedTokensBalance >= 1
                ? formattedTokensBalance
                : transaction.details.amount
            }
            useCustomLabel={isLRC20Payment}
            customLabel={selectedToken?.tokenMetadata?.tokenTicker}
            useMillionDenomination={true}
            styles={{ margin: 0, fontSize: "1.5em" }}
          />

          <PaymentStatus
            isPending={isPending}
            isFailed={isFailed}
            colors={statusColors}
          />

          <Border backgroundColor={backgroundColor} />

          {sendingContactUUID && (
            <div className="contactRow">
              <div className="profileImage" style={{ backgroundColor }}>
                <img src={cache[sendingContactUUID]?.localUri} alt="contact" />
              </div>
              <ThemeText
                textContent={
                  selectedContact?.name || selectedContact?.uniqueName
                }
              />
            </div>
          )}

          <div className="infoGridContainer">
            <Info
              label={t("transactionLabelText.date")}
              value={formatLocalTimeShort(paymentDate)}
            />
            <Info
              label={t("transactionLabelText.time")}
              value={formatTime(paymentDate)}
            />
            <Info
              label={t("constants.fee")}
              value={displayCorrectDenomination({
                amount: transaction.details.fee || 0,
                fiatStats,
                masterInfoObject,
              })}
            />
            <Info label={t("constants.type")} value={paymentType} />
            {isLRC20Payment && (
              <Info
                label={t("constants.token")}
                value={selectedToken?.tokenMetadata?.tokenTicker
                  ?.toUpperCase()
                  ?.slice(0, TOKEN_TICKER_MAX_LENGTH)}
              />
            )}
          </div>

          <MemoSection
            initialValue={transaction.details.description}
            onSave={handleSave}
            theme={theme}
            backgroundColor={backgroundColor}
          />

          <CustomButton
            textContent={t("screens.inAccount.expandedTxPage.detailsBTN")}
            buttonStyles={{
              backgroundColor: theme ? Colors.dark.text : Colors.light.blue,
              margin: "30px auto",
            }}
            textStyles={{ color: theme ? Colors.light.text : Colors.dark.text }}
            actionFunction={() =>
              navigate("/technical-details", { state: { transaction } })
            }
          />

          <ReceiptDots backgroundColor={backgroundColor} />
        </div>
      </div>
    </>
  );
}

function StatusCircle({ isPending, isFailed, colors, backgroundColor, theme }) {
  return (
    <div className="paymentStatusContainer" style={{ backgroundColor }}>
      <div
        className="paymentStatusOuterContainer"
        style={{ backgroundColor: colors.bg }}
      >
        <div
          className="paymentStatusFirstCircle"
          style={{ backgroundColor: colors.outer }}
        >
          <div
            className="paymentStatusSecondCircle"
            style={{ backgroundColor: colors.inner }}
          >
            {isPending ? (
              <Clock color={theme ? Colors.dark.text : backgroundColor} />
            ) : isFailed ? (
              <X color={backgroundColor} />
            ) : (
              <Check color={backgroundColor} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentStatus({ isPending, isFailed, colors }) {
  return (
    <div className="paymentStatusTextContanier">
      <ThemeText textStyles={{ margin: 0 }} textContent="Payment status" />
      <div
        className="paymentStatusPillContiner"
        style={{ backgroundColor: colors.bg }}
      >
        <ThemeText
          textStyles={{ color: colors.text }}
          textContent={
            isPending ? "Pending" : isFailed ? "Failed" : "Successful"
          }
        />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <>
      <ThemeText textStyles={{ margin: 0 }} textContent={label} />
      <ThemeText textStyles={{ margin: 0 }} textContent={value} />
    </>
  );
}

function MemoSection({ initialValue, onSave, backgroundColor }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue || "");
  const ref = useRef();

  return (
    <div className="descriptionContainer">
      <div className="memoHeader">
        <ThemeText textStyles={{ margin: 0 }} textContent="Memo" />
        {/* <button className="iconButton" onClick={() => setEditing(true)}>
          <Pencil size={16} />
        </button> */}
      </div>

      {(editing || initialValue) && (
        <div
          className="descriptionScrollviewContainer"
          style={{ backgroundColor }}
        >
          {editing ? (
            <textarea
              ref={ref}
              value={value}
              maxLength={200}
              onChange={(e) => setValue(e.target.value)}
              onBlur={async () => {
                await onSave(value);
                setEditing(false);
              }}
            />
          ) : (
            <ThemeText textStyles={{ margin: 0 }} textContent={value} />
          )}
        </div>
      )}
    </div>
  );
}

function Border({ backgroundColor }) {
  return (
    <div className="borderElementsContainer">
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
      <div style={{ backgroundColor }} className="border-element" />
    </div>
  );
}

function ReceiptDots({ backgroundColor }) {
  return (
    <div className="dotElementsContainer">
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
      <div style={{ backgroundColor }} className="dot-element" />
    </div>
  );
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getStatusColors({ theme, darkModeType, isPending, isFailed }) {
  if (isPending) {
    return {
      outer: theme
        ? Colors.dark.expandedTxPendingOuter
        : Colors.light.expandedTxPendingOuter,
      inner: theme
        ? Colors.dark.expandedTxPendingInner
        : Colors.light.expandedTxPendingInner,
      text: theme ? Colors.dark.text : Colors.light.expandedTxPendingInner,
      bg: theme
        ? Colors.dark.expandedTxPendingInner
        : Colors.light.expandedTxPendingOuter,
    };
  }

  if (isFailed) {
    return {
      outer:
        theme && darkModeType
          ? Colors.lightsout.backgroundOffset
          : Colors.light.expandedTxFailed,
      inner:
        theme && darkModeType ? Colors.dark.text : Colors.constants.cancelRed,
      text:
        theme && darkModeType ? Colors.dark.text : Colors.constants.cancelRed,
      bg:
        theme && darkModeType
          ? Colors.lightsout.background
          : Colors.light.expandedTxFailed,
    };
  }

  return {
    outer: theme
      ? Colors.dark.expandedTxConfimred
      : Colors.light.expandedTxConfimred,
    inner: theme ? Colors.dark.text : Colors.constants.blue,
    text: theme ? Colors.dark.text : Colors.constants.blue,
    bg: theme
      ? Colors.dark.expandedTxConfimred
      : Colors.light.expandedTxConfimred,
  };
}
