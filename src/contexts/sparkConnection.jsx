import { useNavigation } from "@react-navigation/native";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSpark } from "./sparkContext";
import { useAppStatus } from "./appStatus";
import { useOverlay } from "./overlayContext";

export function SparkConnectionManager() {
  const { sparkConnectionError, sparkInformation } = useSpark();
  const { didGetToHomepage } = useAppStatus();
  const { openOverlay } = useOverlay();
  const navigation = useNavigation();
  const { t } = useTranslation();

  useEffect(() => {
    if (
      sparkInformation.didConnect === false &&
      sparkConnectionError &&
      didGetToHomepage
    ) {
      openOverlay({
        for: "error",
        errorMessage:
          sparkConnectionError || t("errormessages.sparkConnectionError"),
      });
    }
  }, [sparkInformation.didConnect, sparkConnectionError, didGetToHomepage]);

  return null;
}
