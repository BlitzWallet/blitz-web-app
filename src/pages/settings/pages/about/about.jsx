import CustomButton from "../../../../components/customButton/customButton";
import { Colors } from "../../../../constants/theme";
import { useThemeContext } from "../../../../contexts/themeContext";
import openLinkToNewTab from "../../../../functions/openLinkToNewTab";
import useThemeColors from "../../../../hooks/useThemeColors";
import "./about.css";

export default function AboutPage() {
  const { textColor } = useThemeColors();
  const { theme, darkModeType } = useThemeContext();
  return (
    <div id="aboutPageContainer">
      <p style={{ color: textColor }} className="sectionHeader">
        Software
      </p>
      <p style={{ color: textColor }} className="sectionDescription">
        Blitz is a free and open source app under the{" "}
        <a
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
          href="https://www.apache.org/licenses/LICENSE-2.0"
        >
          Apache License
        </a>
        , Version 2.0
      </p>
      <p style={{ color: textColor }} className="sectionHeader">
        Blitz Wallet
      </p>
      <p style={{ color: textColor }} className="sectionDescription">
        This is self-custodial Bitcoin lightning wallet. Blitz does not have
        access to your funds, if you lose your backup pharse it will result in
        lost of funds.
      </p>
      <p style={{ color: textColor }}>
        Blitz Web app uses{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          Spark{" "}
        </span>
        and{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          Breez Liquid SDK
        </span>
      </p>
      <p style={{ color: textColor }} className="sectionHeader">
        Good to know
      </p>
      <p style={{ color: textColor }} className="sectionDescription">
        Blitz Web App is a powered by the Spark protocol. Spark is an{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          off-chain protocol
        </span>{" "}
        where Spark Operators and users nodes update the state of Bitcoin
        ownership allowing for{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          fast
        </span>
        ,{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          low-fee
        </span>
        , and{" "}
        <span
          style={{
            color: theme && darkModeType ? textColor : Colors.light.blue,
          }}
        >
          non-custodial
        </span>{" "}
        transfers without touching the blockchain.
      </p>

      <div className="peopleContainer">
        <p style={{ color: textColor }} className="sectionHeader">
          Creator
        </p>
        <CustomButton
          actionFunction={() =>
            openLinkToNewTab(`https://x.com/blakekaufman17`)
          }
          buttonStyles={{
            backgroundColor:
              theme && darkModeType ? Colors.dark.text : Colors.light.blue,
            minWidth: "unset",
          }}
          textStyles={{
            color: theme && darkModeType ? Colors.light.text : Colors.dark.text,
          }}
          buttonClassName={"peopleLink"}
          textContent={"Blake Kaufman"}
        />
        <p style={{ color: textColor }} className="sectionHeader">
          UI/UX
        </p>
        <CustomButton
          actionFunction={() => openLinkToNewTab(`https://x.com/Stromens`)}
          buttonStyles={{
            backgroundColor:
              theme && darkModeType ? Colors.dark.text : Colors.light.blue,
            minWidth: "unset",
          }}
          textStyles={{
            color: theme && darkModeType ? Colors.light.text : Colors.dark.text,
          }}
          buttonClassName={"peopleLink"}
          textContent={"Oliver Koblizek"}
        />
      </div>
      <p style={{ color: textColor }}>Version 0.1.7</p>
    </div>
  );
}
