import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ThemeText from "../../../../../components/themeText/themeText";
import useThemeColors from "../../../../../hooks/useThemeColors";
import { AI_MODEL_COST } from "../constants/AIModelCost";
import { getModels } from "../functions/getModels";
import CustomInput from "../../../../../components/customInput/customInput";

export default function SwitchModel({ onSelectModel, onClose }) {
  const { t } = useTranslation();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  const [modelSearch, setModelSearch] = useState("");
  const [models, setModels] = useState(AI_MODEL_COST);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getModels().then((result) => {
      setModels(result);
      setIsLoading(false);
    });
  }, []);

  const filteredList = models.filter((item) =>
    item.name?.toLowerCase()?.startsWith(modelSearch.toLowerCase()),
  );

  const handleClick = useCallback(
    (item) => {
      onSelectModel(item);
      onClose();
    },
    [onSelectModel, onClose],
  );

  return (
    <div className="switchModel-overlay" onClick={onClose}>
      <div
        className="switchModel-panel"
        style={{ backgroundColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <ThemeText
          textContent={t("apps.chatGPT.switchModel.chooseModel")}
          textStyles={{
            fontSize: "18px",
            textAlign: "center",
            marginBottom: "10px",
          }}
        />
        <CustomInput
          containerStyles={{ maxWidth: "unset" }}
          placeholder="OpenAI: o4 Mini"
          value={modelSearch}
          onchange={setModelSearch}
        />
        <div className="switchModel-list">
          {isLoading ? (
            <ThemeText
              textContent={t("constants.loading")}
              textStyles={{ textAlign: "center", marginTop: "10px" }}
            />
          ) : filteredList.length ? (
            filteredList.map((item) => (
              <button
                key={item.id}
                className="switchModel-item"
                onClick={() => handleClick(item)}
              >
                <div className="switchModel-itemRow">
                  <ThemeText
                    textContent={item.name}
                    textStyles={{
                      flexGrow: 1,
                      maxWidth: "55%",
                      textAlign: "left",
                      margin: 0,
                    }}
                  />
                  <div className="switchModel-priceCol">
                    <ThemeText
                      textContent={t("apps.chatGPT.switchModel.inputLabel", {
                        amount: item.inputPrice,
                      })}
                      textStyles={{ fontSize: "12px", margin: 0 }}
                    />
                    <ThemeText
                      textContent={t("apps.chatGPT.switchModel.outputLabel", {
                        amount: item.outputPrice,
                      })}
                      textStyles={{ fontSize: "12px", margin: 0 }}
                    />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <ThemeText
              textContent={t("apps.chatGPT.switchModel.noModels")}
              textStyles={{ textAlign: "center", marginTop: "10px" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
