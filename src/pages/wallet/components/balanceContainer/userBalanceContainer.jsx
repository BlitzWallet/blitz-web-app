import { useRef } from "react";
import FormattedSatText from "../../../../components/formattedSatText/formattedSatText";
import { useGlobalContextProvider } from "../../../../contexts/masterInfoObject";
import { useSpark } from "../../../../contexts/sparkContext";
import "./style.css";
import handleDBStateChange from "../../../../functions/handleDBStateChange";
import ThemeText from "../../../../components/themeText/themeText";

export default function UserBalance() {
  const { sparkInformation } = useSpark();
  const { toggleMasterInfoObject, masterInfoObject, setMasterInfoObject } =
    useGlobalContextProvider();
  const saveTimeoutRef = useRef(null);

  const handleBalanceClick = () => {
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
  };

  return (
    <div className="userBalanceContainer">
      <ThemeText textContent={"Total Balance"} />
      <div onClick={handleBalanceClick} className={`balanceContianer`}>
        <FormattedSatText
          styles={{ fontSize: "2rem" }}
          balance={sparkInformation.balance}
          useSizing={true}
        />
      </div>
    </div>
  );
}
