import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../components/themeText/themeText";
import CustomButton from "../../../components/customButton/customButton";
import customUUID from "../../../functions/customUUID";
import CustomInput from "../../../components/customInput/customInput";
import "./addDescription.css";

export default function AddReceiveMessageHalfModal({
  memo = "",
  setContentHeight,
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [description, setDescription] = useState(memo || "");
  const textInputRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    textInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setContentHeight(350);
  }, []);

  const handleSave = () => {
    console.log(description, memo);
    onClose();
    if (description === memo || !description) {
      return;
    }

    setTimeout(() => {
      navigate("/receive", {
        state: {
          ...location.state,
          description,
          uuid: customUUID(),
          navigateHome: true,
        },
        replace: true,
      });
    }, 200);
  };

  return (
    <div className="addReceiveMessageContainer">
      <ThemeText
        removeMargin={true}
        textStyles={{ fontWeight: 500, marginBottom: 15 }}
        textContent={t("screens.inAccount.receiveBtcPage.editDescriptionHead")}
      />
      <CustomInput
        textInputRef={textInputRef}
        inputText={description}
        onchange={setDescription}
        autoFocus={true}
        containerStyles={{ maxWidth: "unset" }}
        placeholder={t("constants.paymentDescriptionPlaceholder")}
      />
      <CustomButton
        actionFunction={handleSave}
        buttonStyles={{ marginTop: "auto", alignSelf: "center" }}
        textContent={
          description !== memo && (description || (!description && memo))
            ? t("constants.save")
            : t("constants.back")
        }
      />
    </div>
  );
}
