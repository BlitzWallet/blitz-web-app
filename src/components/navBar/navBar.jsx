import BackArrow from "../backArrow/backArrow";
import ThemeText from "../themeText/themeText";
import "./navbar.css";
export default function PageNavBar({ text = "", textClassName }) {
  return (
    <div className="pageNavBar">
      <BackArrow />
      <ThemeText
        className={`pageHeaderText ${textClassName}`}
        textContent={text}
      />
    </div>
  );
}
