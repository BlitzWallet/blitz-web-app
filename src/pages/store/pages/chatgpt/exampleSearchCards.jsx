import { useTranslation } from 'react-i18next';
import ThemeText from '../../../../components/themeText/themeText';
import useThemeColors from '../../../../hooks/useThemeColors';

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ExampleGPTSearchCard({ submitChatMessage }) {
  const { backgroundOffset } = useThemeColors();
  const { t } = useTranslation();

  const examples = t('apps.chatGPT.exampleSearchCards.examples', {
    returnObjects: true,
  });

  const cardElements = shuffleArray(examples)
    .slice(0, 6)
    .map((item, index) => (
      <button
        key={index}
        className="exampleCard-item"
        style={{ backgroundColor: backgroundOffset }}
        onClick={() => submitChatMessage(item.topLine + ' ' + item.bottomLine)}
      >
        <ThemeText
          textContent={item.topLine}
          textStyles={{ fontWeight: 500, margin: 0 }}
        />
        <ThemeText
          textContent={item.bottomLine}
          textStyles={{ fontWeight: 300, margin: 0 }}
        />
      </button>
    ));

  return (
    <div className="exampleCards-container">
      <div className="exampleCards-scroll">
        {cardElements}
      </div>
    </div>
  );
}
