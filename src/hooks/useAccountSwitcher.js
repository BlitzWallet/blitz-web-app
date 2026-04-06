import { useCallback, useMemo, useRef, useState } from "react";

import {
  MAIN_ACCOUNT_UUID,
  NWC_ACCOUNT_UUID,
  useActiveCustodyAccount,
} from "../contexts/activeAccount";
import { useSparkWallet } from "../contexts/sparkContext";
import { initWallet } from "../functions/initiateWalletConnection";
import { useNavigate } from "react-router-dom";

export default function useAccountSwitcher() {
  const navigate = useNavigate();
  const { setSparkInformation, sparkInformation } = useSparkWallet();
  const {
    currentWalletMnemoinc,
    selectedAltAccount,
    getAccountMnemonic,
    updateAccountCacheOnly,
    toggleIsUsingNostr,
    isUsingNostr,
    custodyAccountsList,
    activeAccount,
  } = useActiveCustodyAccount();

  const [isSwitchingAccount, setIsSwitchingAccount] = useState({
    accountBeingLoaded: "",
    isLoading: false,
  });
  const isAccountPressRunning = useRef(false);

  const handleAccountPress = useCallback(
    async (account) => {
      const accountInfo = JSON.parse(JSON.stringify(sparkInformation));
      if (isAccountPressRunning.current) return;
      isAccountPressRunning.current = true;
      try {
        const accountMnemonic = await getAccountMnemonic(account);
        if (currentWalletMnemoinc === accountMnemonic) {
          return { reason: "matched" };
        }

        setIsSwitchingAccount({
          accountBeingLoaded: account.uuid || account.name,
          isLoading: true,
        });
        setSparkInformation((prev) => ({
          ...prev,
          didConnect: null,
          didConnectToFlashnet: null,
          identityPubKey: "",
        }));

        await new Promise((resolve) => setTimeout(resolve, 250));

        const initResponse = await initWallet({
          setSparkInformation,
          mnemonic: accountMnemonic,
          hasRestoreCompleted: false,
        });

        if (!initResponse.didWork) {
          setSparkInformation(accountInfo);
          return { reason: "failed" };
        }

        const isMainWallet = account.uuid === MAIN_ACCOUNT_UUID;
        const isNWC = account.uuid === NWC_ACCOUNT_UUID;

        if (isMainWallet || isNWC) {
          if (selectedAltAccount[0]) {
            await updateAccountCacheOnly({
              ...selectedAltAccount[0],
              isActive: false,
            });
          }
          toggleIsUsingNostr(isNWC);
        } else {
          await updateAccountCacheOnly({ ...account, isActive: true });
          toggleIsUsingNostr(false);
        }
        return { reason: "success" };
      } catch (error) {
        navigate.navigate("ErrorScreen", {
          errorMessage: error.message || "An error occurred",
        });
        setSparkInformation(accountInfo);
      } finally {
        setIsSwitchingAccount({
          accountBeingLoaded: "",
          isLoading: false,
        });
        isAccountPressRunning.current = false;
      }
    },
    [currentWalletMnemoinc, selectedAltAccount, sparkInformation],
  );

  return {
    accounts: custodyAccountsList,
    activeAccount,
    isSwitchingAccount,
    handleAccountPress,
    isUsingNostr,
    selectedAltAccount,
  };
}
