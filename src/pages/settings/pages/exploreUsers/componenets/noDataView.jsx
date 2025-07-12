import { useEffect, useMemo, useRef, useState } from "react";

import CustomButton from "../../../../../components/customButton/customButton";
import { applyErrorAnimationTheme } from "../../../../../functions/lottieViewColorTransformer";
import { useGlobalContextProvider } from "../../../../../contexts/masterInfoObject";
import fetchBackend from "../../../../../../db/handleBackend";
import { useKeysContext } from "../../../../../contexts/keysContext";
import Storage from "../../../../../functions/localStorage";
import Lottie from "lottie-react";
import errorTxAnimation from "../../../../../assets/errorTxAnimation.json";
import ThemeText from "../../../../../components/themeText/themeText";
import "./noData.css";

export default function NoDataView() {
  const [isLoading, setIsLoading] = useState(false);
  const { theme, darkModeType } = { theme: false, darkModeType: false }; // useGlobalThemeContext();
  const { publicKey, contactsPrivateKey } = useKeysContext();
  const { toggleMasterInfoObject } = useGlobalContextProvider();
  const animationRef = useRef(null);

  const errorAnimation = useMemo(() => {
    return applyErrorAnimationTheme(
      errorTxAnimation,
      theme ? (darkModeType ? "lightsOut" : "dark") : "light"
    );
  }, [theme, darkModeType]);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const handleSearch = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetchBackend(
        "getTotalUserCount",
        { data: publicKey },
        contactsPrivateKey,
        publicKey
      );

      toggleMasterInfoObject({ exploreData: response });
      Storage.setItem("savedExploreData", {
        lastUpdated: new Date().getTime(),
        data: response,
      });
      setLocalStorageItem(
        "savedExploreData",
        JSON.stringify({ lastUpdated: new Date().getTime(), data: response })
      );
    } catch (err) {
      console.log("handling explore users search err", err);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="exporeUsersDataErrorContainer">
      <Lottie
        lottieRef={animationRef}
        animationData={errorAnimation}
        loop={false}
        className="lottieViewAnimation"
      />

      <ThemeText
        styles={{ marginBottom: "auto" }}
        content={"We were unable to retrive Blitz user count."}
      />
      <CustomButton
        actionFunction={handleSearch}
        useLoading={isLoading}
        buttonStyles={{ marginTop: "auto" }}
        textContent={"Try again"}
      />
    </div>
  );
}
