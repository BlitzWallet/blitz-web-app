import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Receipt } from "lucide-react";
import ThemeText from "../../../../../components/themeText/themeText";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { useToast } from "../../../../../contexts/toastManager";
import { useGlobalContextProvider } from "../../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../../contexts/sparkContext";
import { useActiveCustodyAccount } from "../../../../../contexts/activeAccount";
import { useGlobalAppData } from "../../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../../contexts/keysContext";
import { encryptMessage } from "../../../../../functions/encodingAndDecoding";
import sendStorePayment from "../../../../../functions/apps/payments";
import { sparkPaymenWrapper } from "../../../../../functions/spark/payments";
import { decode } from "bolt11";
import { countrymap } from "../constants/receiveCountryCodes";
import ReceiveCodeConfirmation from "../receiveCodeConfirmation/receiveCodeConfirmation";
import "../style.css";
import BackArrow from "../../../../../components/backArrow/backArrow";
import { getFlagFromCode } from "../../../../../functions/apps/countryFlag";
import CustomInput from "../../../../../components/customInput/customInput";

const imgEndpoint = (endpoint) => `https://sms4sats.com/${endpoint}`;

export default function SMS4SatsReceivePage() {
  const location = useLocation();
  const props = location.state || {};
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textColor, backgroundColor, backgroundOffset } = useThemeColors();
  const { showToast } = useToast();
  const { masterInfoObject } = useGlobalContextProvider();
  const { sparkInformation } = useSpark();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { decodedMessages, toggleGlobalAppDataInformation } =
    useGlobalAppData();
  const { contactsPrivateKey, publicKey } = useKeysContext();

  const initialServices = props.smsServices || [];
  const [localServices, setLocalServices] = useState(initialServices);
  const [userLocal, setUserLocal] = useState({ iso: "WW", value: 999 });
  const [searchInput, setSearchInput] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState({
    isLoading: false,
    message: t("apps.sms4sats.sendPage.payingMessage"),
  });
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    if (userLocal.value === 999) {
      setLocalServices(initialServices);
      return;
    }
    async function fetchLocationServices() {
      try {
        setIsLoadingLocation(true);
        const response = await fetch(
          `https://api2.sms4sats.com/getnumbersstatus?country=${userLocal.value}`,
          { method: "GET" },
        );
        const data = await response.json();
        setLocalServices(data);
      } catch (err) {
        console.log("Location services error:", err);
      } finally {
        setIsLoadingLocation(false);
      }
    }
    fetchLocationServices();
  }, [userLocal.value]);

  const filteredList = useMemo(() => {
    return localServices.filter((item) =>
      item?.text?.toLowerCase().startsWith(searchInput.toLowerCase()),
    );
  }, [searchInput, localServices]);

  const saveMessagesToDB = useCallback(
    async (messageObject) => {
      const em = await encryptMessage(
        contactsPrivateKey,
        publicKey,
        JSON.stringify(messageObject),
      );
      toggleGlobalAppDataInformation({ messagesApp: em }, true);
    },
    [contactsPrivateKey, publicKey, toggleGlobalAppDataInformation],
  );

  const handlePurchase = useCallback(
    async (invoiceInfo) => {
      let savedMessages = null;
      try {
        setIsPurchasing((prev) => ({ ...prev, isLoading: true }));
        savedMessages = JSON.parse(JSON.stringify(decodedMessages));

        const pendingOrder = {
          orderId: invoiceInfo.orderId,
          title: invoiceInfo.title,
          imgSrc: invoiceInfo.imgSrc,
          isPending: true,
          isRefunded: false,
        };

        savedMessages.received = [...savedMessages.received, pendingOrder];

        const paymentResponse = await sendStorePayment({
          invoice: invoiceInfo.payreq,
          masterInfoObject,
          sendingAmountSats: invoiceInfo.amountSat,
          paymentType: "lightning",
          fee: invoiceInfo.fee + invoiceInfo.supportFee,
          userBalance: sparkInformation.balance,
          sparkInformation,
          description: t("apps.sms4sats.receivePage.paymentMemo"),
          currentWalletMnemoinc,
        });

        if (!paymentResponse.didWork)
          throw new Error(t("errormessages.paymentError"));

        await saveMessagesToDB(savedMessages);

        setIsPurchasing((prev) => ({
          ...prev,
          message: t("apps.sms4sats.receivePage.orderDetailsLoading"),
        }));

        let maxRunCount = 5;
        let runCount = 0;
        let responseInfo = null;

        while (runCount < maxRunCount) {
          setIsPurchasing((prev) => ({
            ...prev,
            message: t("apps.VPN.VPNPlanPage.runningTries", {
              runCount,
              maxTries: maxRunCount,
            }),
          }));
          try {
            const res = await fetch(
              `https://api2.sms4sats.com/orderstatus?orderId=${invoiceInfo.orderId}`,
            );
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const resData = await res.json();
            if (resData.number && resData.country) {
              responseInfo = resData;
              break;
            } else {
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } catch (err) {
            console.log("Order status error:", err);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          } finally {
            runCount += 1;
          }
        }

        if (!responseInfo) {
          try {
            const cancelRes = await fetch(
              `https://api2.sms4sats.com/cancelorder?orderId=${invoiceInfo.orderId}`,
            );
            const cancelData = await cancelRes.json();
            navigate("/store-item", {
              state: {
                for: "sms4sats-confirm-receive",
                didSucceed: cancelData.status === "OK",
                isRefund: true,
              },
            });
          } catch {
            navigate("/store-item", {
              state: {
                for: "sms4sats-confirm-receive",
                didSucceed: false,
                isRefund: true,
              },
            });
          }
          return;
        }

        const finalMessages = {
          ...savedMessages,
          received: savedMessages.received.map((item) => {
            if (item.orderId === invoiceInfo.orderId) {
              return {
                ...item,
                number: responseInfo.number,
                country: responseInfo.country,
                timestamp: responseInfo.timestamp,
              };
            }
            return item;
          }),
        };
        await saveMessagesToDB(finalMessages);

        navigate("/store-item", {
          state: {
            for: "sms4sats-confirm-receive",
            didSucceed: true,
            isRefund: false,
            number: responseInfo.number,
          },
        });
      } catch (err) {
        console.log("Purchase error:", err);
        showToast({ message: err.message, type: "error" });
      } finally {
        setIsPurchasing((prev) => ({
          ...prev,
          isLoading: false,
          message: t("apps.sms4sats.sendPage.payingMessage"),
        }));
      }
    },
    [
      sparkInformation,
      currentWalletMnemoinc,
      masterInfoObject,
      saveMessagesToDB,
      decodedMessages,
      navigate,
      showToast,
      t,
    ],
  );

  const handleItemSelect = useCallback((serviceCode, title, imgSrc) => {
    setSelectedService({ serviceCode, title, imgSrc });
  }, []);

  const isLoading = isPurchasing.isLoading || isLoadingLocation;

  return (
    <div className="sms4sats-page">
      <div className="sms4sats-receive-topbar">
        <button className="sms4sats-icon-btn">
          <BackArrow backFunction={() => navigate(-1)} />
        </button>

        <ThemeText
          textContent={t("constants.receive")}
          textStyles={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: "600",
            fontSize: "1.1rem",
          }}
        />

        <div className="sms4sats-receive-topbar-actions">
          <button
            className="sms4sats-globe-btn"
            style={{
              backgroundColor:
                userLocal.iso === "WW" ? backgroundOffset : "transparent",
            }}
            onClick={() => {
              if (userLocal.iso !== "WW") {
                setUserLocal({ iso: "WW", value: 999 });
              }
            }}
          >
            {userLocal.iso === "WW" ? (
              <Globe color={textColor} size={18} />
            ) : (
              <span role="img" aria-label={userLocal.iso}>
                {getFlagFromCode({ code: userLocal.iso })}
              </span>
            )}
          </button>

          <button
            className="sms4sats-icon-btn"
            onClick={() =>
              navigate("/store-item", {
                state: { for: "sms4sats-history", selectedPage: "receive" },
              })
            }
          >
            <Receipt color={textColor} size={22} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="sms4sats-spinner">
          <div className="sms4sats-spinner-circle" />
          <ThemeText
            textContent={
              isLoadingLocation
                ? t("apps.sms4sats.receivePage.loacationLoadingMessage")
                : isPurchasing.message
            }
            textStyles={{ textAlign: "center" }}
          />
        </div>
      ) : (
        <>
          <div className="sms4sats-search-container">
            <CustomInput
              containerStyles={{ maxWidth: "unset" }}
              value={searchInput}
              onchange={setSearchInput}
              placeholder={t("apps.sms4sats.receivePage.inputPlaceholder")}
            />
          </div>

          {filteredList.length === 0 ? (
            <ThemeText
              textContent={t("apps.sms4sats.receivePage.noAvailableServices")}
              textStyles={{ textAlign: "center", padding: "40px 20px" }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 5%",
              }}
            >
              <div className="sms4sats-services-grid">
                {filteredList.map((item, idx) => (
                  <button
                    key={`${item.value}-${idx}`}
                    className="sms4sats-service-item"
                    style={{ background: "none", border: "none" }}
                    onClick={() =>
                      handleItemSelect(item.value, item.text, item.image?.src)
                    }
                  >
                    <img
                      className="sms4sats-service-image"
                      src={imgEndpoint(item.image?.src)}
                      alt={item.text}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <ThemeText
                      textContent={item.text}
                      textStyles={{
                        fontSize: "0.75rem",
                        textAlign: "center",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedService && (
        <ReceiveCodeConfirmation
          serviceCode={selectedService.serviceCode}
          title={selectedService.title}
          imgSrc={selectedService.imgSrc}
          location={userLocal.value}
          onConfirm={handlePurchase}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}

function getFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return "🌐";
  try {
    const codePoints = [...isoCode.toUpperCase()].map(
      (c) => 0x1f1e6 + c.charCodeAt(0) - 65,
    );
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}
