import { useSpark } from "../../../../contexts/sparkContext";
import copyToClipboard from "../../../../functions/copyToClipboard";
import "./sparkInfo.css";
import { useLocation, useNavigate } from "react-router-dom";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../contexts/themeContext";
import { Colors } from "../../../../constants/theme";
import ThemeText from "../../../../components/themeText/themeText";
import { useOverlay } from "../../../../contexts/overlayContext";
import { ClipboardIcon } from "lucide-react";

export default function SparkInformation() {
  const { openOverlay } = useOverlay();
  const { sparkInformation } = useSpark();
  const navigate = useNavigate();
  const location = useLocation();
  const { backgroundOffset } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  return (
    <div id="sparkInfoContainer">
      <div className="contentContainer">
        <div
          style={{
            backgroundColor: theme ? backgroundOffset : Colors.dark.text,
          }}
          className="techincalContainer"
        >
          <div className="technicalRow">
            <ThemeText
              className="techicalLabel"
              textContent={"Spark address"}
            />
            <span
              onClick={() =>
                copyToClipboard(
                  sparkInformation.sparkAddress,
                  openOverlay,
                  location
                )
              }
              className="techicalData"
            >
              <ThemeText
                textStyles={{ marginRight: 5 }}
                textContent={`${sparkInformation.sparkAddress.slice(0, 5)}...
                ${sparkInformation.sparkAddress.slice(
                  sparkInformation.sparkAddress.length - 5
                )}`}
              />
              <ClipboardIcon
                size={20}
                color={
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.blue
                }
              />
            </span>
          </div>
          <div className="technicalRow">
            <ThemeText className="techicalLabel" textContent={"Public key"} />
            <span
              onClick={() =>
                copyToClipboard(
                  sparkInformation.identityPubKey,
                  openOverlay,
                  location
                )
              }
              className="techicalData"
            >
              <ThemeText
                textStyles={{ marginRight: 5 }}
                textContent={`${sparkInformation.identityPubKey.slice(0, 5)}...
                ${sparkInformation.identityPubKey.slice(
                  sparkInformation.identityPubKey.length - 5
                )}`}
              />
              <ClipboardIcon
                size={20}
                color={
                  theme && darkModeType
                    ? Colors.dark.text
                    : Colors.constants.blue
                }
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
