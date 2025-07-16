import CustomButton from "../../../../components/customButton/customButton";
import { Colors } from "../../../../constants/theme";
import openLinkToNewTab from "../../../../functions/openLinkToNewTab";
import "./about.css";

export default function AboutPage() {
  return (
    <div id="aboutPageContainer">
      <p className="sectionHeader">Software</p>
      <p className="sectionDescription">
        Blitz is a free and open source app under the{" "}
        <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache License</a>
        , Version 2.0
      </p>
      <p className="sectionHeader">Blitz Wallet</p>
      <p className="sectionDescription">
        This is self-custodial Bitcoin lightning wallet. Blitz does not have
        access to your funds, if you lose your backup pharse it will result in
        lost of funds.
      </p>
      <p>
        Blitz Web app uses{" "}
        <span style={{ color: Colors.light.blue }}>Spark </span>and{" "}
        <span style={{ color: Colors.light.blue }}>Breez Liquid SDK</span>
      </p>
      <p className="sectionHeader">Good to know</p>
      <p className="sectionDescription">
        Blitz Web App is a powered by the Spark protocol. Spark is an{" "}
        <span style={{ color: Colors.light.blue }}>off-chain protocol</span>{" "}
        where Spark Operators and users nodes update the state of Bitcoin
        ownership allowing for{" "}
        <span style={{ color: Colors.light.blue }}>fast</span>,{" "}
        <span style={{ color: Colors.light.blue }}>low-fee</span>, and{" "}
        <span style={{ color: Colors.light.blue }}>non-custodial</span>{" "}
        transfers without touching the blockchain.
      </p>

      <div className="peopleContainer">
        <p className="sectionHeader">Creator</p>
        <CustomButton
          actionFunction={() =>
            openLinkToNewTab(`https://x.com/blakekaufman17`)
          }
          buttonStyles={{
            backgroundColor: Colors.light.blue,
            minWidth: "unset",
          }}
          textStyles={{ color: Colors.dark.text }}
          buttonClassName={"peopleLink"}
          textContent={"Blake Kaufman"}
        />
        <p className="sectionHeader">UI/UX</p>
        <CustomButton
          actionFunction={() => openLinkToNewTab(`https://x.com/Stromens`)}
          buttonStyles={{
            backgroundColor: Colors.light.blue,
            minWidth: "unset",
          }}
          textStyles={{ color: Colors.dark.text }}
          buttonClassName={"peopleLink"}
          textContent={"Oliver Koblizek"}
        />
      </div>
      <p>Versoin 0.0.4</p>
    </div>
  );
}
