import { useLocation, useNavigate } from "react-router-dom";
import SafeAreaComponent from "../../../components/safeAreaContainer";
import PageNavBar from "../../../components/navBar/navBar";
import AboutPage from "../pages/about/about";
import "./settingsItem.css";
import ViewMnemoinc from "../../viewkey/viewKey";
import SparkInformation from "../pages/sparkInfo/sparkInfo";
import DisplayCurrency from "../pages/currency/displayCurrency";
import DisplayOptions from "../pages/displayOptions/displayOptions";
import EditMyProfilePage from "../../contacts/screens/editMyProfilePage/editMyProfilePage";
import FastPay from "../pages/fastPay/fastPay";
import BlitzFeeInformation from "../pages/feeDetails/feeInformation";
import ExploreUsers from "../pages/exploreUsers/exploreUsers";

export default function SettingsContentIndex({ openOverlay }) {
  const location = useLocation();
  const props = location.state;
  const selectedPage = props.for?.toLowerCase();
  const navigate = useNavigate();

  if (selectedPage === "point-of-sale") {
    return <>{selectedPage === "point-of-sale" && <PosSettingsPage />}</>;
  }
  return (
    <SafeAreaComponent addedClassName={"settingsContentIndexContianer"}>
      <PageNavBar textClassName={"navbarText"} text={`${selectedPage}`} />
      <div className="settingsContentIndex">
        {selectedPage === "about" && <AboutPage />}
        {selectedPage === "display currency" && <DisplayCurrency />}
        {selectedPage === "node info" && <NodeInfo />}
        {selectedPage === "display options" && <DisplayOptions />}

        {selectedPage === "edit contact profile" && (
          <EditMyProfilePage
            navProps={{ fromSettings: true, pageType: "myProfile" }}
          />
        )}

        {selectedPage === "fast pay" && <FastPay />}

        {selectedPage === "blitz stats" && <ExploreUsers />}

        {selectedPage === "blitz fee details" && <BlitzFeeInformation />}

        {selectedPage === "backup wallet" && (
          <ViewMnemoinc openOverlay={openOverlay} />
        )}
        {selectedPage === "spark info" && (
          <SparkInformation openOverlay={openOverlay} />
        )}
      </div>
    </SafeAreaComponent>
  );
}
