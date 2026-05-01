import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HalfModalSendOptions from "../wallet/components/sendOptions";
import useThemeColors from "../../hooks/useThemeColors";
import { useThemeContext } from "../../contexts/themeContext";
import "./Modal.css";
import ManualEnterSendAddress from "../wallet/components/sendOptions/manualEnter";
import EditLNURLContactOnReceivePage from "./components/editLNURLOnReceive";
import LRC20TokenInformation from "../../functions/lrc20/lrc20TokenDataHalfModal";
import AddContactsModal from "../contacts/components/addContactsHalfModal/addContactsHalfModal";
import SelectPaymentType from "../contacts/internalComponents/selectPaymentType/SelectPaymentType";
import SelectContactRequestCurrency from "../contacts/internalComponents/selectContactRequsetCurrency/SelectContactRequestCurrency";
import NearBudgetLimitWarning from "../sendPage/components/NearBudgetLimitWarning";
import SelectPaymentMethod from "../sendPage/components/selectPaymentMethod";
import SelectLRC20Token from "../sendPage/components/selectLRC20Token";
import SwitchReceiveOption from "../receiveQRPage/components/switchReceiveOption/switchReceiveOption";
import AddDescriptionHalfModal from "../receiveQRPage/components/addDescriptionHalfModal/addDescriptionHalfModal";

export default function CustomHalfModal({
  onClose,
  contentType,
  params = {},
  openOverlay,
}) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [isOpen, setIsOpen] = useState(null);

  // Default slide height (percentage of screen)
  const slideHeight = params?.sliderHeight || "50dvh";

  const handleClose = useCallback(() => {
    console.log("being clicked");
    setIsKeyboardActive(false);
    setIsOpen(false);
    if (onClose)
      setTimeout(() => {
        onClose();
      }, 300);
  }, [onClose]);

  useEffect(() => {
    // Optional: focus or keyboard listeners for web if needed
    setIsOpen(true);
  }, []);

  const renderContent = () => {
    switch (contentType) {
      case "HalfModalSendOptions":
        return (
          <HalfModalSendOptions openOverlay={openOverlay} onClose={onClose} />
        );
      case "manualEnterSendAddress":
        return (
          <ManualEnterSendAddress openOverlay={openOverlay} onClose={onClose} />
        );
      case "switchReceiveOptions":
        return (
          <SwitchReceiveOption
            params={params}
            openOverlay={openOverlay}
            onClose={onClose}
          />
        );
      case "editLNURLOnReceive":
        return (
          <EditLNURLContactOnReceivePage
            theme={theme}
            darkModeType={darkModeType}
            slideHeight={slideHeight}
            isKeyboardActive={isKeyboardActive}
            setIsKeyboardActive={setIsKeyboardActive}
            setContentHeight={setContentHeight}
            openOverlay={openOverlay}
            onClose={handleClose}
          />
        );
      case "LRC20TokenInformation":
        return (
          <LRC20TokenInformation
            theme={theme}
            darkModeType={darkModeType}
            slideHeight={slideHeight}
            openOverlay={openOverlay}
            onClose={handleClose}
            params={params}
          />
        );
      case "addContactsHalfModal":
        return (
          <AddContactsModal
            theme={theme}
            darkModeType={darkModeType}
            slideHeight={slideHeight}
            isKeyboardActive={isKeyboardActive}
            setIsKeyboardActive={setIsKeyboardActive}
            setContentHeight={setContentHeight}
            openOverlay={openOverlay}
            onClose={handleClose}
            params={params}
          />
        );
      case "SelectPaymentType":
        return (
          <SelectPaymentType
            theme={theme}
            darkModeType={darkModeType}
            params={params}
            onClose={handleClose}
            openOverlay={openOverlay}
          />
        );
      case "SelectContactRequestCurrency":
        return (
          <SelectContactRequestCurrency
            theme={theme}
            darkModeType={darkModeType}
            params={params}
            onClose={handleClose}
          />
        );
      case "SelectPaymentMethod":
        return (
          <SelectPaymentMethod
            theme={theme}
            darkModeType={darkModeType}
            params={params}
            onClose={handleClose}
          />
        );
      case "SelectLRC20Token":
        return (
          <SelectLRC20Token
            sparkInformation={params?.sparkInformation}
            goBackFunction={handleClose}
            setSelectedToken={(token) => {
              if (params?.onSelect) params.onSelect(token);
              handleClose();
            }}
          />
        );
      case "nearBudgetLimitWarning":
        return (
          <NearBudgetLimitWarning
            sendingAmount={params?.sendingAmount}
            handleBackPressFunction={handleClose}
          />
        );
      case "editReceiveDescription":
        return (
          <AddDescriptionHalfModal params={params} onClose={handleClose} />
        );
      case "confirmSMS":
        return <div>Confirm SMS: {params?.message}</div>;
      default:
        return <div>Default Content</div>;
    }
  };

  return (
    <div className="backdrop" onClick={handleClose}>
      <div
        className={`modal ${
          isOpen === null ? "" : !isOpen ? "slide-out" : "slide-in"
        }`}
        style={{
          backgroundColor:
            theme && darkModeType ? backgroundOffset : backgroundColor,
          height: slideHeight,
          maxHeight: "95dvh",
        }}
        onClick={(e) => e.stopPropagation()} // prevent backdrop close
      >
        {renderContent()}
      </div>
    </div>
  );
  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "100vw",
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 999,
        }}
        onClick={handleClose}
      >
        {isOpen && (
          <motion.div
            key="modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: contentHeight ? contentHeight : `${slideHeight}`,
              background: theme ? backgroundOffset : "white",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()} // prevent backdrop close
          >
            {/* draggable handle */}
            <div
              style={{
                width: "40px",
                height: "5px",
                borderRadius: "3px",
                margin: "10px auto",
              }}
            />
            <div
              style={{
                padding: 16,
                height: "100%",
                overflowY: "auto",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {renderContent()}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
