import { useEffect, useState } from "react";
import "./send.css";
import { useLocation, useNavigate } from "react-router-dom";
import BackArrow from "../../components/backArrow/backArrow";
import walletIcon from "../../assets/adminHomeWallet_dark.png";
import arrowIcon from "../../assets/arrow-left-blue.png";
import deleteIcon from "../../assets/leftCheveronDark.png";
import { sparkPaymenWrapper } from "../../functions/spark/payments";
import { useSpark } from "../../contexts/sparkContext";
import FullLoadingScreen from "../../components/fullLoadingScreen/fullLoadingScreen";
import { Colors } from "../../constants/theme";
import hasAlredyPaidInvoice from "../../functions/sendBitcoin/hasPaid";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useNodeContext } from "../../contexts/nodeContext";
import { useAppStatus } from "../../contexts/appStatus";
import ErrorWithPayment from "./components/errorScreen";
import decodeSendAddress from "../../functions/sendBitcoin/decodeSendAdress";
import { LIQUID_TYPES, SATSPERBITCOIN } from "../../constants";
import CustomInput from "../../components/customInput/customInput";
import CustomNumberKeyboard from "../../components/customNumberKeyboard/customNumberKeyboard";
import NumberInputSendPage from "./components/numberInput";
import CustomButton from "../../components/customButton/customButton";
import { getBoltzApiUrl } from "../../functions/boltz/boltzEndpoitns";

import displayCorrectDenomination from "../../functions/displayCorrectDenomination";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";

export default function SendPage() {
  const location = useLocation();
  const params = location.state || {};

  const {
    btcAddress: btcAdress,
    fromPage,
    publishMessageFunc,
    comingFromAccept,
    enteredPaymentInfo,
    errorMessage: globalError,
  } = params;
  const [paymentInfo, setPaymentInfo] = useState({});
  const { masterInfoObject, toggleMasterInfoObject } =
    useGlobalContextProvider();
  const { liquidNodeInformation, fiatStats } = useNodeContext();
  const { minMaxLiquidSwapAmounts } = useAppStatus();
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(globalError);
  const [loadingMessage, setLoadingMessage] = useState(
    "Getting invoice information"
  );
  const navigate = useNavigate();
  const { sparkInformation } = useSpark();

  const userBalance = sparkInformation.balance;
  const sendingAmount = paymentInfo?.sendAmount || 0;
  const isBTCdenominated =
    masterInfoObject.userBalanceDenomination === "hidden" ||
    masterInfoObject.userBalanceDenomination === "sats";
  const canEditPaymentAmount = paymentInfo?.canEditPayment;
  const convertedSendAmount = isBTCdenominated
    ? Math.round(Number(sendingAmount))
    : Math.round(
        (SATSPERBITCOIN / (fiatStats?.value || 65000)) * Number(sendingAmount)
      ) || 0;

  const isLightningPayment = paymentInfo?.paymentNetwork === "lightning";
  const isLiquidPayment = paymentInfo?.paymentNetwork === "liquid";
  const isBitcoinPayment = paymentInfo?.paymentNetwork === "Bitcoin";
  const isSparkPayment = paymentInfo?.paymentNetwork === "spark";

  const paymentFee =
    (paymentInfo?.paymentFee || 0) + (paymentInfo?.supportFee || 0);
  const canSendPayment =
    Number(userBalance) >= Number(convertedSendAmount) + paymentFee &&
    convertedSendAmount != 0; //ecash is built into ln
  console.log(
    canSendPayment,
    "can send payment",
    userBalance,
    paymentFee,
    paymentInfo
  ); //ecash is built into ln);
  const isUsingSwapWithZeroInvoice =
    paymentInfo?.paymentNetwork === "lightning" &&
    paymentInfo.type === "bolt11" &&
    !paymentInfo?.data?.invoice.amountMsat;

  useEffect(() => {
    async function decodePayment() {
      const didPay = hasAlredyPaidInvoice({
        scannedAddress: btcAdress,
        sparkInformation,
      });

      if (didPay) {
        errorMessageNavigation("You have already paid this invoice");
        return;
      }

      console.log({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        // setWebViewArgs,
        navigate,
        maxZeroConf:
          minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept,
        enteredPaymentInfo,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        publishMessageFunc,
      });

      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        // setWebViewArgs,
        // webViewRef,
        navigate,
        maxZeroConf:
          minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept,
        enteredPaymentInfo,
        setLoadingMessage,
        paymentInfo,
        fromPage,
        publishMessageFunc,
      });
    }
    setTimeout(decodePayment, 1000);
  }, []);

  const handleSend = async () => {
    if (!canSendPayment) return;
    if (isSendingPayment) return;
    setIsSendingPayment(true);

    try {
      let formmateedSparkPaymentInfo = {
        address: "",
        paymentType: "",
      };
      // manipulate paymetn details here
      if (
        paymentInfo.type.toLowerCase() === LIQUID_TYPES.Bolt11.toLowerCase()
      ) {
        formmateedSparkPaymentInfo.address =
          paymentInfo?.decodedInput?.invoice?.bolt11?.toLowerCase();
        formmateedSparkPaymentInfo.paymentType = "lightning";
      } else if (paymentInfo.type.toLowerCase() === "spark") {
        formmateedSparkPaymentInfo.address =
          paymentInfo?.data?.address.toLowerCase();
        formmateedSparkPaymentInfo.paymentType = "spark";
      } else if (
        paymentInfo.type.toLowerCase() === LIQUID_TYPES.LnUrlPay.toLowerCase()
      ) {
        formmateedSparkPaymentInfo.address =
          paymentInfo?.data?.invoice.toLowerCase();
        formmateedSparkPaymentInfo.paymentType = "lightning";
      } else if (paymentInfo.type.toLowerCase() === "liquid") {
        formmateedSparkPaymentInfo.address =
          paymentInfo?.data?.invoice.toLowerCase();
        formmateedSparkPaymentInfo.paymentType = "lightning";
        console.log(paymentInfo?.boltzData);
      } else if (paymentInfo?.type.toLowerCase() === "bitcoin") {
        formmateedSparkPaymentInfo.address = paymentInfo?.address.toLowerCase();
        formmateedSparkPaymentInfo.paymentType = "bitcoin";
      }
      console.log(formmateedSparkPaymentInfo, "manual spark information");
      const paymentObject = {
        getFee: false,
        ...formmateedSparkPaymentInfo,
        amountSats:
          paymentInfo?.type === "Bitcoin"
            ? convertedSendAmount + paymentFee
            : convertedSendAmount,
        masterInfoObject,
        fee: paymentFee,
        memo: paymentDescription || paymentInfo?.data.message || "",
        userBalance: userBalance,
        sparkInformation,
      };
      // Shouuld be same for all paymetns
      const paymentResponse = await sparkPaymenWrapper(paymentObject);

      if (paymentInfo.type === "liquid" && paymentResponse.didWork) {
        async function pollBoltzSwapStatus() {
          let didSettleInvoice = false;
          let runCount = 0;

          while (!didSettleInvoice && runCount < 10) {
            runCount += 1;
            const resposne = await fetch(
              getBoltzApiUrl(import.meta.env.VITE_BOLTZ_ENVIRONMENT) +
                `/v2/swap/${paymentInfo.boltzData.id}`
            );
            const boltzData = await resposne.json();

            if (boltzData.status === "invoice.settled") {
              didSettleInvoice = true;

              navigate("/confirm-page", {
                state: {
                  for: "paymentsucceed",
                  transaction: paymentResponse.response,
                },
                replace: true,
              });
            } else {
              console.log("Waiting for confirmation....");
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          }
          if (didSettleInvoice) return;
          navigate("/confirm-page", {
            state: {
              for: "paymentFailed",
              transaction: {
                ...paymentResponse.response,
                details: {
                  ...paymentResponse.response.details,
                  error: "Unable to settle swap",
                },
              },
            },
            replace: true,
          });
        }
        pollBoltzSwapStatus();
        return;
      }

      if (paymentResponse.didWork) {
        navigate("/confirm-page", {
          state: {
            for: "paymentsucceed",
            transaction: paymentResponse.response,
          },
          replace: true,
        });
      } else {
        navigate("/confirm-page", {
          state: {
            for: "paymentfailed",
            transaction: {
              paymentStatus: "failed",
              details: { error: paymentResponse.error },
            },
          },
          replace: true,
        });
      }
    } catch (err) {
      console.error("Payment send error", err);
    }
  };

  const handleSave = async () => {
    try {
      if (Number(userBalance) <= paymentInfo.sendAmount) {
        navigate("/error", {
          state: {
            errorMessage: "Sending amount is greater than wallet balance.",
            background: location,
          },
        });
        return;
      }
      if (
        isLiquidPayment &&
        paymentInfo.sendAmount < minMaxLiquidSwapAmounts.min
      ) {
        navigate("/error", {
          state: {
            errorMessage: `Liquid payment must be greater than ${displayCorrectDenomination(
              {
                amount: minMaxLiquidSwapAmounts.min,
                masterInfoObject,
                fiatStats,
              }
            )}`,
            background: location,
          },
        });
        return;
      }
      if (!canSendPayment) return;
      setIsLoading(true);
      await decodeSendAddress({
        fiatStats,
        btcAdress,
        goBackFunction: errorMessageNavigation,
        setPaymentInfo,
        liquidNodeInformation,
        masterInfoObject,
        // setWebViewArgs,
        // webViewRef,
        navigate,
        maxZeroConf:
          minMaxLiquidSwapAmounts?.submarineSwapStats?.limits?.maximalZeroConf,
        comingFromAccept: true,
        enteredPaymentInfo: {
          amount: convertedSendAmount,
          description: paymentDescription,
        },
        setLoadingMessage,
        paymentInfo,
        parsedInvoice: paymentInfo.decodedInput,
        fromPage,
        publishMessageFunc,
      });
    } catch (err) {
      console.error("Error saving payment info", err);

      navigate("/error", {
        state: {
          errorMessage: "Error decoding payment.",
          navigateBack: "wallet",
          background: location,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!Object.keys(paymentInfo).length && !errorMessage)
    return (
      <FullLoadingScreen
        loadingColor={Colors.light.blue}
        text={loadingMessage}
      />
    );

  if (errorMessage) {
    console.log("RUNNING ERROR COMPONENT");
    return <ErrorWithPayment reason={errorMessage} />;
  }

  const totalFee =
    (paymentInfo.paymentFee || 0) + (paymentInfo.supportFee || 0);

  return (
    <div className="sendContainer">
      <NabBar sparkInformation={sparkInformation} />
      <div className="paymentInfoContainer">
        <div className="balanceContainer">
          <div className="scroll-content">
            <FormattedSatText
              containerStyles={{
                opacity: !convertedSendAmount ? 0.5 : 1,
              }}
              styles={{
                fontSize: "2.75rem",
                margin: 0,
              }}
              neverHideBalance={true}
              balance={convertedSendAmount || 0}
            />
          </div>
          <FormattedSatText
            containerStyles={{
              opacity: !convertedSendAmount ? 0.5 : 1,
            }}
            styles={{ fontSize: "1.2rem", margin: 0 }}
            globalBalanceDenomination={
              masterInfoObject.userBalanceDenomination === "sats"
                ? "fiat"
                : "sats"
            }
            neverHideBalance={true}
            balance={convertedSendAmount}
          />
        </div>

        {!canEditPaymentAmount && (
          <>
            <p className="paymentFeeDesc">Fee & speed</p>
            <FormattedSatText
              styles={{ marginTop: 0 }}
              balance={totalFee}
              backText={"and Instant"}
            />
          </>
        )}

        {canEditPaymentAmount && (
          <>
            <CustomInput
              onchange={setPaymentDescription}
              placeholder={"Description..."}
              value={paymentDescription}
              containerClassName="customTextInputContinaerStyles"
            />
            <NumberInputSendPage
              setPaymentInfo={setPaymentInfo}
              paymentInfo={paymentInfo}
              fiatStats={fiatStats}
            />
          </>
        )}

        <CustomButton
          buttonStyles={{
            marginTop: canEditPaymentAmount ? 0 : "auto",
            opacity: isSendingPayment ? 1 : canSendPayment ? 1 : 0.5,
          }}
          actionFunction={() => {
            canEditPaymentAmount ? handleSave() : handleSend();
          }}
          textContent={
            paymentInfo.canEdit
              ? isLoading
                ? "Loading..."
                : "Save"
              : isSendingPayment
              ? "Sending..."
              : "Send Payment"
          }
          useLoading={isSendingPayment || isLoading}
        />
      </div>
    </div>
  );
  function goBackFunction() {
    navigate(-1);
  }
  function errorMessageNavigation(reason) {
    setErrorMessage(reason);
    setPaymentInfo({});
  }
}

function NabBar({ sparkInformation }) {
  return (
    <div className="navBar">
      <BackArrow />
      <div className="label">
        <img src={walletIcon} alt="wallet icon to show user balance" />
        <FormattedSatText balance={sparkInformation.balance} />
      </div>
    </div>
  );
}
