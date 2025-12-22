import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";

import { useOverlay } from "../contexts/overlayContext.jsx";
import InformationPopup from "../pages/informationPopup/index.jsx";
import CustomHalfModal from "../pages/customHalfModal/index.jsx";
import ErrorScreen from "../pages/error/error.jsx";
import ConfirmActionPage from "./confirmActionPage/confirmActionPage.jsx";
import BackupSeedWarning from "../pages/wallet/components/backupSeedWarning/backupSeedWarning.jsx";

export default function OverlayHost() {
  const { overlays, closeOverlay, openOverlay } = useOverlay();

  const overlayElements = useMemo(
    () =>
      overlays.map((overlay, index) => (
        <div key={index}>
          {overlay.for === "confirm-action" && (
            <ConfirmActionPage overlay={overlay} onClose={closeOverlay} />
          )}

          {overlay.for === "error" && (
            <ErrorScreen overlay={overlay} onClose={closeOverlay} />
          )}

          {overlay.for === "halfModal" && (
            <CustomHalfModal
              contentType={overlay.contentType}
              params={overlay.params}
              onClose={closeOverlay}
              openOverlay={openOverlay}
            />
          )}

          {overlay.for === "informationPopup" && (
            <InformationPopup
              overlay={overlay}
              onClose={closeOverlay}
              openOverlay={openOverlay}
            />
          )}

          {overlay.for === "backupSeedWarning" && (
            <BackupSeedWarning overlay={overlay} onClose={closeOverlay} />
          )}
        </div>
      )),
    [overlays, closeOverlay, openOverlay]
  );

  return <AnimatePresence mode="wait">{overlayElements}</AnimatePresence>;
}
