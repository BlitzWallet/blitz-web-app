import { useLocation, useNavigate } from "react-router-dom";
import BackArrow from "../../components/backArrow/backArrow";
import "./style.css";
import { Colors } from "../../constants/theme";
import pendingTx from "../../assets/pendingTx.png";
import check from "../../assets/check.svg";
import failed from "../../assets/x-small-black.webp";
import ThemeText from "../../components/themeText/themeText";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { useThemeContext } from "../../contexts/themeContext";
import { useEffect, useState } from "react";
import CustomButton from "../../components/customButton/customButton";
import useThemeColors from "../../hooks/useThemeColors";

export default function ExpandedTxPage() {
  const location = useLocation();
  const props = location.state;
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(0);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  const transaction = props?.transaction;
  const paymentType = transaction.paymentType;

  const isFailed = transaction.paymentStatus === "failed";
  const isPending = transaction.paymentStatus === "pending";

  const paymentDate = new Date(transaction.details.time);

  const description = transaction.details.description;

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    window.addEventListener("resize", (e) => {
      setWindowWidth(window.innerWidth);
    });
  }, []);

  return (
    <>
      <BackArrow backFunction={() => navigate(-1)} />
      <div className="expandedTxContainer">
        <div
          style={{
            backgroundColor: theme
              ? backgroundOffset
              : Colors.light.expandedTxReceitBackground,
          }}
          className="receiptContainer"
        >
          <div
            style={{ backgroundColor: backgroundColor }}
            className="paymentStatusOuterContainer"
          >
            <div
              style={{
                backgroundColor: isPending
                  ? theme
                    ? Colors.dark.expandedTxPendingOuter
                    : Colors.light.expandedTxPendingOuter
                  : isFailed
                  ? theme && darkModeType
                    ? Colors.lightsout.backgroundOffset
                    : Colors.light.expandedTxFailed
                  : theme
                  ? Colors.dark.expandedTxConfimred
                  : Colors.light.expandedTxConfimred,
              }}
              className="paymentStatusFirstCircle"
            >
              <div
                style={{
                  backgroundColor: isPending
                    ? theme
                      ? Colors.dark.expandedTxPendingInner
                      : Colors.light.expandedTxPendingInner
                    : isFailed
                    ? theme && darkModeType
                      ? Colors.dark.text
                      : Colors.constants.cancelRed
                    : theme
                    ? Colors.dark.text
                    : Colors.light.blue,
                }}
                className="paymentStatusSecondCircle"
              >
                <img
                  style={{
                    filter: isPending
                      ? theme
                        ? "brightness(0) saturate(100%) invert(100%) sepia(100%) saturate(0%) hue-rotate(307deg) brightness(103%) contrast(101%)" // white
                        : "brightness(0) saturate(100%) invert(97%) sepia(31%) saturate(97%) hue-rotate(195deg) brightness(110%) contrast(84%)"
                      : backgroundColor === "#EBEBEB"
                      ? "brightness(0) saturate(100%) invert(97%) sepia(31%) saturate(97%) hue-rotate(195deg) brightness(110%) contrast(84%)"
                      : backgroundColor === "#000000"
                      ? "brightness(0) saturate(100%) invert(0%) sepia(100%) saturate(7459%) hue-rotate(44deg) brightness(92%) contrast(101%)"
                      : "brightness(0) saturate(100%) invert(12%) sepia(40%) saturate(2530%) hue-rotate(188deg) brightness(100%) contrast(107%)",
                  }}
                  className="paymentStatusIcon"
                  src={isFailed ? failed : isPending ? pendingTx : check}
                />
              </div>
            </div>
          </div>
          <ThemeText
            className={"receiveAmountLabel"}
            textContent={`${
              transaction.details.direction === "OUTGOING" ? "Sent" : "Received"
            } amount`}
          />
          <FormattedSatText
            containerStyles={{ marginTop: "-5px" }}
            neverHideBalance={true}
            styles={{
              fontSize: windowWidth < 200 ? "30px" : "40px",
              margin: 0,
            }}
            balance={transaction.details.amount}
          />
          <div className="paymentStatusTextContanier">
            <ThemeText textContent={"Payment status"} />
            <div
              className="paymentStatusPillContiner"
              style={{
                backgroundColor: isPending
                  ? theme
                    ? Colors.dark.expandedTxPendingInner
                    : Colors.light.expandedTxPendingOuter
                  : isFailed
                  ? theme && darkModeType
                    ? Colors.lightsout.background
                    : Colors.light.expandedTxFailed
                  : theme
                  ? Colors.dark.expandedTxConfimred
                  : Colors.light.expandedTxConfimred,
              }}
            >
              <ThemeText
                textStyles={{
                  color: isPending
                    ? theme
                      ? Colors.dark.text
                      : Colors.light.expandedTxPendingInner
                    : isFailed
                    ? theme && darkModeType
                      ? Colors.dark.text
                      : Colors.constants.cancelRed
                    : theme
                    ? Colors.dark.text
                    : Colors.light.blue,
                }}
                textContent={
                  isPending ? "Pending" : isFailed ? "Failed" : "Successful"
                }
              />
            </div>
          </div>
          <Border windowWidth={windowWidth} />
          <div className="infoGridContainer">
            <ThemeText textContent={"Time"} />
            <ThemeText
              textStyles={{ textAlign: windowWidth > 320 ? "right" : "center" }}
              textContent={`${
                paymentDate.getHours() <= 9
                  ? "0" + paymentDate.getHours()
                  : paymentDate.getHours()
              }:${
                paymentDate.getMinutes() <= 9
                  ? "0" + paymentDate.getMinutes()
                  : paymentDate.getMinutes()
              }`}
            />
            <ThemeText textContent={"Fee"} />
            <FormattedSatText
              containerStyles={{
                justifyContent: windowWidth > 320 ? "end" : "center",
              }}
              styles={{ marginTop: 0, marginBottom: 0 }}
              neverHideBalance={true}
              balance={isFailed ? 0 : transaction.details.fee}
            />
            <ThemeText textContent={"Type"} />
            <ThemeText
              textStyles={{
                textTransform: "capitalize",
                textAlign: windowWidth > 320 ? "right" : "center",
              }}
              textContent={paymentType}
            />
          </div>
          {description && (
            <div className="descriptionContainer">
              <ThemeText textContent={"Memo"} />
              <div
                className="descriptionScrollviewContainer"
                style={{ backgroundColor: Colors.light.background }}
              >
                <ThemeText textContent={description} />
              </div>
            </div>
          )}
          <CustomButton
            actionFunction={() =>
              navigate("/technical-details", { state: { transaction } })
            }
            buttonStyles={{
              width: "100%",
              maxWidth: "max-content",
              minWidth: "unset",
              backgroundColor: theme ? Colors.dark.text : Colors.light.primary,
              margin: "30px auto",
            }}
            textStyles={{ color: theme ? Colors.light.text : Colors.dark.text }}
            textContent={"Technical details"}
          />
          <ReceiptDots windowWidth={windowWidth} />
        </div>
      </div>
    </>
  );
}

function Border({ windowWidth }) {
  console.log(windowWidth);
  const { theme } = useThemeContext();
  const dotsWidth = windowWidth * 0.95 - 30;
  const numDots = Math.floor(dotsWidth / 25);

  let dotElements = [];

  for (let index = 0; index < numDots; index++) {
    dotElements.push(
      <div
        key={index}
        style={{
          width: "20px",
          height: "2px",
          marginRight: "5px",
          backgroundColor: theme ? Colors.dark.text : Colors.light.background,
        }}
      />
    );
  }

  return (
    <div className="borderElementsContainer">
      <div className="borderElementScroll">{dotElements}</div>
    </div>
  );
}

function ReceiptDots({ windowWidth }) {
  const { backgroundColor } = useThemeColors();
  let dotElements = [];
  const dotsWidth = windowWidth;
  const numDots = Math.floor(dotsWidth / 20);

  for (let index = 0; index < numDots; index++) {
    dotElements.push(
      <div
        key={index}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "10px",
          backgroundColor: backgroundColor,
        }}
      />
    );
  }

  return (
    <div className="dotElementsContainer">
      <div className="borderElementScroll">{dotElements}</div>
    </div>
  );
}
