import telegramIcon from "../../../assets/telegram.png";
import telegramIconWhite from "../../../assets/telegramWhite.png";
import twitter from "../../../assets/twitter.png";
import twitterIconWhite from "../../../assets/twitterWhite.png";
import github from "../../../assets/github.png";
import githubIconWhite from "../../../assets/githubWhite.png";
import "./socialOptions.css";
import ThemeImage from "../../../components/ThemeImage/themeImage";
export default function SocialOptionsBottomBar() {
  return (
    <div className="socialOptionsContainer">
      <a
        target="_blank"
        href="https://t.me/blitzwallet"
        className="imgContainer"
      >
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          lightModeIcon={telegramIcon}
          darkModeIcon={telegramIcon}
          lightsOutIcon={telegramIconWhite}
        />
      </a>
      <a
        target="_blank"
        href="https://github.com/BlitzWallet/blitz-web-app"
        className="imgContainer"
      >
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          lightModeIcon={github}
          darkModeIcon={github}
          lightsOutIcon={githubIconWhite}
        />
      </a>
      <a
        target="_blank"
        href="https://x.com/BlitzWalletApp"
        className="imgContainer"
      >
        <ThemeImage
          styles={{ width: "100%", height: "100%" }}
          lightModeIcon={twitter}
          darkModeIcon={twitter}
          lightsOutIcon={twitterIconWhite}
        />
      </a>
    </div>
  );
}
