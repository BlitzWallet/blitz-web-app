import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import BackArrow from "../../../../../components/backArrow/backArrow";
import ThemeText from "../../../../../components/themeText/themeText";
import CustomButton from "../../../../../components/customButton/customButton";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import { useToast } from "../../../../../contexts/toastManager";
import "../style.css";
import CustomSettingsNavBar from "../../../../../components/customSettingsNavbar";

export default function SMS4SatsSentPayments() {
  const location = useLocation();
  const props = location.state || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor } = useThemeColors();
  const { showToast } = useToast();
  const { decodedMessages, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const clickData = useRef({});

  const selectedPage = (props.selectedPage || "send").toLowerCase();
  const isReceiveMode = selectedPage !== "send";

  const messagesData = useMemo(() => {
    if (!decodedMessages) return [];
    return decodedMessages[isReceiveMode ? "received" : "sent"] || [];
  }, [decodedMessages, isReceiveMode]);

  console.log(decodedMessages);
  const formatPhoneNumber = useCallback((number) => {
    if (!number) return "";
    const cleaned = String(number).replace(/\D/g, "");
    return cleaned.length > 0 ? `+${cleaned}` : String(number);
  }, []);

  const fetchOrderStatus = useCallback(async (orderId) => {
    const response = await fetch(
      `https://api2.sms4sats.com/orderstatus?orderId=${orderId}`,
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return response.json();
  }, []);

  const updateOrderStatus = useCallback(
    async (element, smsData, shouldDelete = false) => {
      const savedMessages = JSON.parse(JSON.stringify(decodedMessages));

      if (shouldDelete) {
        savedMessages[isReceiveMode ? "received" : "sent"] = savedMessages[
          isReceiveMode ? "received" : "sent"
        ].filter((item) => item.orderId !== element.orderId);
      } else {
        const updatedItem = {
          ...element,
          code: smsData.code,
          number: smsData.number,
          country: smsData.country,
          id: smsData.id,
          timestamp: smsData.timestamp,
          isPending:
            !smsData.code && !(smsData.status === "OK" && !!smsData.error),
          isRefunded: smsData.status === "OK" && !!smsData.error,
        };

        savedMessages.received = savedMessages.received.map((item) =>
          item.orderId === element.orderId ? updatedItem : item,
        );
      }

      const encryptedMessage = await encryptMessage(
        contactsPrivateKey,
        publicKey,
        JSON.stringify(savedMessages),
      );
      await toggleGlobalAppDataInformation(
        { messagesApp: encryptedMessage },
        true,
      );
    },
    [
      decodedMessages,
      contactsPrivateKey,
      publicKey,
      toggleGlobalAppDataInformation,
      isReceiveMode,
    ],
  );

  const handleOrderPress = useCallback(
    async (element, setIsLoading) => {
      if (!isReceiveMode) {
        try {
          await navigator.clipboard.writeText(element.orderId);
          showToast({ message: "Copied!", type: "success" });
        } catch {
          showToast({ message: "Copied!", type: "success" });
        }
        return;
      }

      if (element.code) {
        navigate("/store-item", {
          state: {
            for: "sms4sats-view-code",
            country: element.country,
            code: element.code,
            phone: element.number,
          },
        });
        return;
      }

      if (!element.isPending) return;

      setIsLoading(true);
      try {
        const smsData = await fetchOrderStatus(element.orderId);

        if (smsData.paid && smsData.code) {
          await updateOrderStatus(element, smsData);
          navigate("/store-item", {
            state: {
              for: "sms4sats-view-code",
              country: smsData.country,
              code: smsData.code,
              phone: smsData.number,
            },
          });
        } else if (smsData.status === "OK" && smsData.error) {
          await updateOrderStatus(element, smsData);
          showToast({
            message: t("apps.sms4sats.sentPayments.refundedOrder"),
            type: "error",
          });
        } else if (!element.number && smsData.number) {
          await updateOrderStatus(element, smsData);
        } else {
          showToast({
            message: t("apps.sms4sats.sentPayments.reclaimComplete"),
            type: "error",
          });
        }
      } catch (error) {
        showToast({
          message: t("apps.sms4sats.sentPayments.fetchOrderError"),
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      isReceiveMode,
      showToast,
      navigate,
      fetchOrderStatus,
      updateOrderStatus,
      t,
    ],
  );

  const getDisplayContent = useCallback(
    (element, field) => {
      switch (field) {
        case "title":
          if (!isReceiveMode) return formatPhoneNumber(element.phone);
          if (element.isRefunded)
            return t("apps.sms4sats.sentPayments.refunded");
          return element.title;
        case "subtitle":
          return isReceiveMode
            ? element.code || t("apps.sms4sats.sentPayments.noCode")
            : element.message;
        case "details":
          return element.orderId;
        default:
          return "";
      }
    },
    [isReceiveMode, formatPhoneNumber, t],
  );

  const getButtonText = useCallback(
    (element) => {
      if (isReceiveMode && !element.code) {
        return t("apps.sms4sats.sentPayments.retryClaim");
      }
      return t("apps.sms4sats.sentPayments.orderId");
    },
    [isReceiveMode, t],
  );

  const handleSupportContact = useCallback(() => {
    try {
      navigator.clipboard.writeText("support@sms4sats.com");
      showToast({ message: "Copied!", type: "success" });
    } catch {
      showToast({ message: "Copied!", type: "success" });
    }
  }, [showToast]);

  if (!messagesData.length) {
    return (
      <div className="sms4sats-page">
        <CustomSettingsNavBar
          text={t(`apps.sms4sats.sentPayments.title${selectedPage}`)}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <ThemeText
            textContent={t("apps.noPurchaseTitle")}
            textStyles={{
              textAlign: "center",
              fontSize: "1.1rem",
              marginBottom: 8,
            }}
          />
          <ThemeText
            textContent={t("apps.sms4sats.sentPayments.noPurchasesTitle")}
            textStyles={{ textAlign: "center", opacity: 0.7 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="sms4sats-page">
      <CustomSettingsNavBar
        text={t(`apps.sms4sats.sentPayments.title${selectedPage}`)}
      />

      <div className="sms4sats-history-content">
        <div className="sms4sats-history-scroll">
          {messagesData.map((element) => (
            <MessageItem
              key={element.orderId}
              element={element}
              isReceiveMode={isReceiveMode}
              getDisplayContent={getDisplayContent}
              getButtonText={getButtonText}
              handleOrderPress={handleOrderPress}
              updateOrderStatus={updateOrderStatus}
              formatPhoneNumber={formatPhoneNumber}
              textColor={textColor}
              clickData={clickData}
              showToast={showToast}
              navigate={navigate}
              t={t}
            />
          ))}
        </div>

        <div
          className="sms4sats-support-container"
          onClick={handleSupportContact}
        >
          <ThemeText
            textContent={t("apps.sms4sats.sentPayments.helpMessage")}
            textStyles={{ textAlign: "center", marginBottom: 4 }}
          />
          <ThemeText
            textContent="support@sms4sats.com"
            textStyles={{ textAlign: "center", fontWeight: "600" }}
          />
        </div>
      </div>
    </div>
  );
}

function MessageItem({
  element,
  isReceiveMode,
  getDisplayContent,
  getButtonText,
  handleOrderPress,
  updateOrderStatus,
  formatPhoneNumber,
  textColor,
  clickData,
  showToast,
  navigate,
  t,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isReceiveMode && element.isPending && element.number) {
      try {
        navigator.clipboard.writeText(element.number);
        showToast({ message: "Copied!", type: "success" });
      } catch {
        showToast({ message: "Copied!", type: "success" });
      }
      return;
    }
    try {
      navigator.clipboard.writeText(element.orderId);
      showToast({ message: "Copied!", type: "success" });
    } catch {
      showToast({ message: "Copied!", type: "success" });
    }
  };

  const handleRetryClick = () => {
    const now = Date.now();
    const orderId = element.orderId;

    if (!clickData.current[orderId]) {
      clickData.current[orderId] = { numberOfClicks: 1, lastClick: now };
      handleOrderPress(element, setIsLoading);
      return;
    }

    const orderClickData = clickData.current[orderId];

    if (now - orderClickData.lastClick < 30000) {
      if (orderClickData.numberOfClicks >= 5) {
        showToast({
          message: t("apps.sms4sats.sentPayments.rateLimitError"),
          type: "error",
        });
        return;
      }
      clickData.current[orderId].numberOfClicks += 1;
    } else {
      clickData.current[orderId] = { numberOfClicks: 1, lastClick: now };
    }

    handleOrderPress(element, setIsLoading);
  };

  return (
    <div className="sms4sats-order-item">
      <div className="sms4sats-order-text-container" onClick={handleClick}>
        <p
          className="sms4sats-order-title"
          style={{ color: textColor, margin: 0 }}
        >
          {getDisplayContent(element, "title")}
        </p>
        {isReceiveMode && element.number && (
          <p
            className="sms4sats-order-subtitle"
            style={{ color: textColor, margin: "2px 0 0" }}
          >
            {formatPhoneNumber(element.number)}
          </p>
        )}
        <p
          className="sms4sats-order-subtitle"
          style={{ color: textColor, margin: "2px 0 0" }}
        >
          {getDisplayContent(element, "subtitle")}
        </p>
        <p
          className="sms4sats-order-id"
          style={{ color: textColor, margin: "2px 0 0" }}
        >
          {getDisplayContent(element, "details")}
        </p>
      </div>

      {isReceiveMode && element.isPending && (
        <CustomButton
          actionFunction={handleRetryClick}
          buttonStyles={{ minWidth: 50, flexShrink: 0 }}
          textContent={getButtonText(element)}
          useLoading={isLoading}
        />
      )}

      {(element.isRefunded || !element.isPending) && (
        <button
          className="sms4sats-icon-btn"
          onClick={() => updateOrderStatus(element, undefined, true)}
        >
          <Trash2 color={textColor} size={20} />
        </button>
      )}
    </div>
  );
}
