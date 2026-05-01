import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomButton from "../../../../components/customButton/customButton";
import ThemeText from "../../../../components/themeText/themeText";
import useThemeColors from "../../../../hooks/useThemeColors";
import "./style.css";

export default function AddDescriptionHalfModal({ params = {}, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { textInputBackground, textInputColor } = useThemeColors();
  const inputRef = useRef(null);

  const {
    description: initialDescription = "",
    receiveOption = "lightning",
    amount = 0,
    endReceiveType = "BTC",
    navigateHome = false,
  } = params;

  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    // Auto-focus input after modal slide-in animation
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => inputRef.current?.focus()),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const hasChanged =
    description !== initialDescription &&
    (description || (!description && initialDescription));

  const handleSave = () => {
    navigate("/receive", {
      state: {
        amount,
        description,
        receiveOption,
        endReceiveType,
        navigateHome,
      },
      replace: true,
    });
    onClose?.();
  };

  const handleBack = () => onClose?.();

  const handleBlur = () => {
    if (!hasChanged) handleBack();
    else handleSave();
  };

  const buttonLabel = hasChanged ? t("constants.save") : t("constants.back");

  return (
    <div className="add-description-modal">
      <ThemeText
        textStyles={{
          width: "100%",
          fontWeight: 500,
          fontSize: "1.1rem",
          marginBottom: 15,
          marginTop: 0,
        }}
        textContent={t("screens.inAccount.receiveBtcPage.editDescriptionHead")}
      />
      <input
        ref={inputRef}
        className="add-description-input"
        style={{ backgroundColor: textInputBackground, color: textInputColor }}
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleBlur}
        placeholder={t("constants.paymentDescriptionPlaceholder")}
      />
      <CustomButton
        actionFunction={hasChanged ? handleSave : handleBack}
        buttonStyles={{
          marginTop: "auto",
          width: "max-content",
        }}
        textContent={buttonLabel}
      />
    </div>
  );
}
