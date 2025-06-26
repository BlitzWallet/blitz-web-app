import { useLocation, useNavigate } from "react-router-dom";
import BackArrow from "../../components/backArrow/backArrow";
import "./style.css";
import { Colors } from "../../constants/theme";
import check from "../../assets/check.svg";
import ThemeText from "../../components/themeText/themeText";
import FormattedSatText from "../../components/formattedSatText/formattedSatText";
import { useThemeContext } from "../../contexts/themeContext";
import { useEffect, useState } from "react";
import CustomButton from "../../components/customButton/customButton";

export default function ExpandedTxPage() {
  const location = useLocation();
  const props = location.state;
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(0);

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

  console.log(windowWidth);

  return (
    <>
      <BackArrow backFunction={() => navigate(-1)} />
      <div className="expandedTxContainer">
        <div
          style={{ backgroundColor: Colors.light.expandedTxReceitBackground }}
          className="receiptContainer"
        >
          <div
            style={{ backgroundColor: Colors.light.background }}
            className="paymentStatusOuterContainer"
          >
            <div
              style={{
                backgroundColor: isPending
                  ? Colors.light.expandedTxPendingOuter
                  : isFailed
                  ? Colors.light.expandedTxFailed
                  : Colors.light.expandedTxConfimred,
              }}
              className="paymentStatusFirstCircle"
            >
              <div
                style={{
                  backgroundColor: isPending
                    ? Colors.light.expandedTxPendingInner
                    : isFailed
                    ? Colors.constants.cancelRed
                    : Colors.light.blue,
                }}
                className="paymentStatusSecondCircle"
              >
                <img
                  style={{
                    filter: `invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)`,
                  }}
                  className="paymentStatusIcon"
                  src={check}
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
                  ? Colors.light.expandedTxPendingOuter
                  : isFailed
                  ? Colors.light.expandedTxFailed
                  : Colors.light.expandedTxConfimred,
              }}
            >
              <ThemeText
                textStyles={{
                  color: isPending
                    ? Colors.light.expandedTxPendingInner
                    : isFailed
                    ? Colors.constants.cancelRed
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
              backgroundColor: Colors.light.blue,
              margin: "30px auto",
            }}
            textStyles={{ color: Colors.dark.text }}
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
          backgroundColor: Colors.light.background,
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
          backgroundColor: Colors.light.background,
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
