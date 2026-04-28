import ThemeIcon from "../themeIcon";
import ThemeImage from "../ThemeImage/themeImage";
import recipt from "../../assets/icons/receipt.png";
import ThemeText from "../themeText/themeText";
import CustomButton from "../customButton/customButton";
import "./noContentScreen.css";

export default function NoContentScreen({
  iconName = "",
  titleText = "",
  subTitleText = "",
  containerStyles = {},
  showButton = false,
  buttonText = "",
  buttonFunction = () => {},
}) {
  return (
    <div className="noContentContainer" style={containerStyles}>
      {iconName === "Receipt" ? (
        <ThemeImage
          lightModeIcon={recipt}
          darkModeIcon={recipt}
          lightsOutIcon={recipt}
        />
      ) : (
        <ThemeIcon iconName={iconName} />
      )}
      <ThemeText className={"emptyTitle"} textContent={titleText} />
      <ThemeText
        className={"emptySubtext"}
        textStyles={{ marginBottom: showButton ? 25 : 0 }}
        textContent={subTitleText}
      />
      {showButton && (
        <CustomButton
          buttonClassName={"emptyButton"}
          actionFunction={buttonFunction}
          textContent={buttonText}
        />
      )}
    </div>
  );
}
