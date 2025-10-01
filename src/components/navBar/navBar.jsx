import BackArrow from "../backArrow/backArrow";
import ThemeText from "../themeText/themeText";
import "./navbar.css";
export default function PageNavBar({ text = "", textClassName, showWhite }) {
  return (
    <div className="pageNavBar">
      <BackArrow showWhite={showWhite} />
      <ThemeText
        className={`pageHeaderText ${textClassName}`}
        textContent={text}
      />
    </div>
  );
}
