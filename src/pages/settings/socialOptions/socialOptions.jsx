import telegramIcon from "../../../assets/telegram.png";
import telegramIconWhite from "../../../assets/telegramWhite.png";
import twitter from "../../../assets/twitter.png";
import twitterIconWhite from "../../../assets/twitterWhite.png";
import github from "../../../assets/github.png";
import githubIconWhite from "../../../assets/githubWhite.png";
import "./socialOptions.css";
export default function SocialOptionsBottomBar() {
  return (
    <div className="socialOptionsContainer">
      <a
        target="_blank"
        href="https://t.me/blitzwallet"
        className="imgContainer"
      >
        <img src={telegramIcon} alt="" srcset="" />
      </a>
      <a
        target="_blank"
        href="https://github.com/BlitzWallet/blitz-web-app"
        className="imgContainer"
      >
        <img src={github} alt="" srcset="" />
      </a>
      <a
        target="_blank"
        href="https://x.com/BlitzWalletApp"
        className="imgContainer"
      >
        <img src={twitter} alt="" srcset="" />
      </a>
    </div>
  );
}
