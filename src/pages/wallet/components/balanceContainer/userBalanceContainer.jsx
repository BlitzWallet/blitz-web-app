import { useRef } from "react";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../contexts/sparkContext";
import "./style.css";
import handleDBStateChange from "../../../../functions/handleDBStateChange";

export default function UserBalance() {
  const { sparkInformation } = useSpark();
  const { toggleMasterInfoObject, masterInfoObject, setMasterInfoObject } =
    useGlobalContextProvider();
  const saveTimeoutRef = useRef(null);

  return (
    <div className="userBalanceContainer">
      <p>Total balance</p>
      <div
        onClick={() => {
          if (masterInfoObject.userBalanceDenomination === "sats")
            handleDBStateChange(
              { userBalanceDenomination: "fiat" },
              setMasterInfoObject,
              toggleMasterInfoObject,
              saveTimeoutRef
            );
          else if (masterInfoObject.userBalanceDenomination === "fiat")
            handleDBStateChange(
              { userBalanceDenomination: "hidden" },
              setMasterInfoObject,
              toggleMasterInfoObject,
              saveTimeoutRef
            );
          else
            handleDBStateChange(
              { userBalanceDenomination: "sats" },
              setMasterInfoObject,
              toggleMasterInfoObject,
              saveTimeoutRef
            );
        }}
        className="balanceContianer"
      >
        <FormattedSatText
          styles={{ fontSize: "2rem" }}
          balance={sparkInformation.balance}
        />
      </div>
    </div>
  );
}
