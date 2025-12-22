import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { AlertTriangle } from "lucide-react";
import ThemeText from "../../../../components/themeText/themeText";
import CustomButton from "../../../../components/customButton/customButton";
import { Colors } from "../../../../constants/theme";
import "./backupSeedWarning.css";

export default function BackupSeedWarning({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, darKModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor, textColor } = useThemeColors();

  const navigateToSettings = () => {
    onClose();
    navigate("/settings-item", {
      state: { for: "Backup wallet" },
    });
  };

  return (
    <div
      style={{ backgroundColor: Colors.constants.halfModalBackground }}
      className="backupContainer"
    >
      <div className="backup-content">
        <AlertTriangle
          size={45}
          color={
            theme && darKModeType ? Colors.light.text : Colors.constants.blue
          }
        />
        <ThemeText
          className={"header"}
          textContent={t("wallet.homeLightning.backupSeedWarning.header")}
        />

        <ThemeText
          className={"description"}
          textContent={t("wallet.homeLightning.backupSeedWarning.description")}
        />

        <CustomButton
          actionFunction={navigateToSettings}
          buttonStyles={{
            maxWidth: "unset",
            backgroundColor: theme ? backgroundColor : Colors.constants.blue,
          }}
          textStyles={{ color: theme ? textColor : Colors.dark.text }}
          textContent={t("wallet.homeLightning.backupSeedWarning.backupBTN")}
        />

        <CustomButton
          actionFunction={() => {
            onClose();
          }}
          buttonStyles={{
            backgroundColor: "transparent",
            maxWidth: "unset",
          }}
          textStyles={{ color: textColor }}
          textContent={t("wallet.homeLightning.backupSeedWarning.laterBTN")}
        />
      </div>
    </div>
  );
}
