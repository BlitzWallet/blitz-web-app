import { useEffect, useRef, useState } from "react";
import MascotWalking from "../../components/mascotWalking";
import "./style.css";
import { useAuth } from "../../contexts/authContext";
import initializeUserSettings from "../../functions/initializeUserSettings";
import { useKeysContext } from "../../contexts/keysContext";
import { useGlobalContextProvider } from "../../contexts/masterInfoObject";
import { useGlobalAppData } from "../../contexts/appDataContext";
import { useGlobalContacts } from "../../contexts/globalContacts";
import { useSpark } from "../../contexts/sparkContext";
import { useNavigate } from "react-router-dom";
import { Colors } from "../../constants/theme.js";
import { useThemeContext } from "../../contexts/themeContext.jsx";
import { useTranslation } from "react-i18next";
import { Settings } from "lucide-react";
import { getPublicKey, privateKeyFromSeedWords } from "../../functions/seed.js";
import { deriveSparkIdentityKey } from "../../functions/gift/deriveGiftWallet.js";
import { getCachedSparkTransactions } from "../../functions/spark/index.js";
import { getAccountBalanceSnapshot } from "../../functions/spark/balanceSnapshots.js";
import ThemeText from "../../components/themeText/themeText.jsx";

export default function LoadingScreen() {
  const navigate = useNavigate();
  const {
    toggleMasterInfoObject,
    masterInfoObject,
    setMasterInfoObject,
    preloadedUserData,
    setPreLoadedUserData,
  } = useGlobalContextProvider();
  const { connectToSparkWallet, setSparkInformation } = useSpark();
  const { theme, darkModeType } = useThemeContext();
  const { toggleContactsPrivateKey } = useKeysContext();
  const { mnemoinc } = useAuth();
  const { toggleGlobalContactsInformation } = useGlobalContacts();
  const { toggleGlobalAppDataInformation } = useGlobalAppData();
  const didRunConnectionRef = useRef(false);
  const { t } = useTranslation();

  const [hasError, setHasError] = useState("");

  useEffect(() => {
    async function startConnectProcess() {
      const startTime = Date.now();

      try {
        console.log("Process 1", new Date().getTime());

        const [privateKey, identityPubKey] = await Promise.all([
          privateKeyFromSeedWords(mnemoinc),
          deriveSparkIdentityKey(mnemoinc),
        ]);

        connectToSparkWallet(identityPubKey.publicKeyHex);

        const publicKey = privateKey ? getPublicKey(privateKey) : null;
        if (!privateKey || !publicKey)
          throw new Error(
            t("screens.inAccount.loadingScreen.userSettingsError"),
          );

        const hasSavedInfo = Object.keys(masterInfoObject || {}).length > 5; //arbitrary number but filters out onboarding items

        const [placeholderTxs, balanceSnapshot, didLoadUserSettings] =
          await Promise.all([
            getCachedSparkTransactions(20, identityPubKey.publicKeyHex),
            getAccountBalanceSnapshot(identityPubKey.publicKeyHex),
            hasSavedInfo
              ? Promise.resolve(true)
              : initializeUserSettings({
                  setMasterInfoObject,
                  toggleGlobalContactsInformation,
                  toggleGlobalAppDataInformation,
                  toggleMasterInfoObject,
                  preloadedData: preloadedUserData.data,
                  setPreLoadedUserData,
                  privateKey,
                  publicKey,
                }),
          ]);

        if (!hasSavedInfo) {
          if (!didLoadUserSettings)
            throw new Error(
              t("screens.inAccount.loadingScreen.userSettingsError"),
            );
        }

        toggleContactsPrivateKey(privateKey);
        console.log(balanceSnapshot, placeholderTxs, "balance and tx snapshot");

        setSparkInformation((prev) => ({
          ...prev,
          transactions: placeholderTxs,
          ...(balanceSnapshot ?? {}),
        }));

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(
          0,
          (hasSavedInfo ? 500 : 1500) - elapsedTime,
        );

        if (remainingTime > 0) {
          console.log(
            `Waiting ${remainingTime}ms to reach minimum 1s duration`,
          );
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        navigate("/wallet", { replace: true });
      } catch (err) {
        console.log("intializatiion error", err);
        setHasError(err.message);
      }
    }
    if (preloadedUserData.isLoading && !preloadedUserData.data) return;
    if (didRunConnectionRef.current) return;
    if (!mnemoinc) return;
    didRunConnectionRef.current = true;

    startConnectProcess();
  }, [preloadedUserData, masterInfoObject]);

  return (
    <div id="loadingScreenContainer">
      {!!hasError && (
        <Settings
          className="doomsday"
          onClick={() => navigate("/settings", { state: { isDoomsday: true } })}
          style={{ cursor: "pointer" }}
          color={
            theme && darkModeType ? Colors.dark.text : Colors.constants.blue
          }
        />
      )}
      <div className="mascotContainer">
        <MascotWalking />
      </div>
      {hasError && (
        <ThemeText
          textStyles={{
            color: theme ? Colors.dark.text : Colors.constants.blue,
          }}
          textContent={hasError}
        />
      )}
    </div>
  );
}
