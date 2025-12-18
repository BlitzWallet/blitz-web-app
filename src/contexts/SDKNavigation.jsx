import { useEffect, useRef } from "react";

import i18next from "i18next";

import { useAppStatus } from "./appStatus";
import { useSpark } from "./sparkContext";
import { useToast } from "./toastManager";
import { useNodeContext } from "./nodeContext";
import { useNavigate } from "react-router-dom";

// export function RootstockNavigationListener() {
//   const navigation = useNavigate();
//   const { didGetToHomepage } = useAppStatus();
//   const { pendingNavigation, setPendingNavigation } = useRootstockProvider();
//   const isNavigating = useRef(false); // Use a ref for local state

//   useEffect(() => {
//     if (!pendingNavigation) return;
//     if (!didGetToHomepage) {
//       setPendingNavigation(null);
//       return;
//     }
//     if (isNavigating.current) return;
//     crashlyticsLogReport(`Navigating to confirm tx page in roostock listener`);
//     isNavigating.current = true;

//     setTimeout(() => {
//       requestAnimationFrame(() => {
//         navigation.navigate("ErrorScreen", {
//           errorMessage: i18next.t("errormessages.receivedRootstock"),
//         });
//         isNavigating.current = false;
//         console.log("cleaning up navigation for rootstock");
//       });
//     }, 100);

//     setPendingNavigation(null);
//   }, [pendingNavigation, didGetToHomepage]);

//   return null;
// }

// export function LiquidNavigationListener() {
//   const navigation = useNavigation();
//   const { didGetToHomepage } = useAppStatus();
//   const { pendingLiquidPayment, setPendingLiquidPayment } = useNodeContext();
//   const isNavigating = useRef(false); // Use a ref for local state

//   useEffect(() => {
//     if (!pendingLiquidPayment) return;
//     if (!didGetToHomepage) {
//       setPendingLiquidPayment(null);
//       return;
//     }
//     if (isNavigating.current) return;
//     crashlyticsLogReport(`Navigating to confirm tx page in liquid listener `);
//     isNavigating.current = true;

//     setTimeout(() => {
//       requestAnimationFrame(() => {
//         navigation.navigate("ErrorScreen", {
//           errorMessage: i18next.t("errormessages.receivedLiquid"),
//         });
//         isNavigating.current = false;
//         console.log("cleaning up navigation for liquid");
//       });
//     }, 100);

//     setPendingLiquidPayment(null);
//   }, [pendingLiquidPayment, didGetToHomepage]);

//   return null;
// }

export function SparkNavigationListener() {
  const navigate = useNavigate();
  const { didGetToHomepage } = useAppStatus();
  const { pendingNavigation, setPendingNavigation } = useSpark();
  const isNavigating = useRef(false); // Use a ref for local state
  const { showToast } = useToast();

  useEffect(() => {
    console.log(pendingNavigation, didGetToHomepage, "in navigation");
    if (!pendingNavigation) return;
    if (!didGetToHomepage) {
      setPendingNavigation(null);
      return;
    }
    if (isNavigating.current) return;
    isNavigating.current = true;

    setTimeout(() => {
      if (pendingNavigation.showFullAnimation) {
        navigate("/confirm-page", {
          state: {
            for: "paymentsucceed",
            transaction: pendingNavigation.tx,
          },
          replace: true,
        });
      } else {
        showToast({
          amount: pendingNavigation.amount,
          LRC20Token: pendingNavigation.LRC20Token,
          isLRC20Payment: pendingNavigation.isLRC20Payment,
          duration: 7000,
          type: "confirmTx",
        });
      }
      console.log("cleaning up navigation for spark");
      isNavigating.current = false;
    }, 100);

    setPendingNavigation(null);
  }, [pendingNavigation, didGetToHomepage]);

  return null;
}
