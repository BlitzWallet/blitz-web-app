import { useTranslation } from 'react-i18next';
import ThemeText from '../../../../../components/themeText/themeText';
import useThemeColors from '../../../../../hooks/useThemeColors';

export default function ConfirmLeaveChat({ onSave, onDiscard }) {
  const { textColor, backgroundColor } = useThemeColors();
  const { t } = useTranslation();

  return (
    <div className="confirmLeaveChat-overlay">
      <div
        className="confirmLeaveChat-inner"
        style={{ backgroundColor }}
      >
        <ThemeText
          textContent={t('apps.chatGPT.confirmLeaveChat.title')}
          textStyles={{ textAlign: 'center', marginBottom: '15px' }}
        />
        <div className="confirmLeaveChat-buttonRow">
          <button
            className="confirmLeaveChat-button"
            onClick={onSave}
          >
            <ThemeText
              textContent={t('constants.yes')}
              textStyles={{ fontSize: '18px' }}
            />
          </button>
          <div
            className="confirmLeaveChat-divider"
            style={{ backgroundColor: textColor }}
          />
          <button
            className="confirmLeaveChat-button"
            onClick={onDiscard}
          >
            <ThemeText
              textContent={t('constants.no')}
              textStyles={{ fontSize: '18px' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
