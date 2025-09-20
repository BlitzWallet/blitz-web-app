import "./fonts.css";
import "./index.css";
import App from "./App.jsx";
import "../pollyfills.js";
import { StrictMode, Suspense, lazy, useContext, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import SafeAreaComponent from "./components/safeAreaContainer.jsx";
import { AuthProvider } from "./contexts/authContext.jsx";
import AuthGate from "./components/authGate.jsx";
import { SparkWalletProvider } from "./contexts/sparkContext.jsx";
import { AnimatePresence } from "framer-motion";
import { NavigationStackProvider } from "./contexts/navigationLogger.jsx";

// Lazy-loaded pages
const CreateSeed = lazy(() => import("./pages/createSeed/createSeed.jsx"));
const DisclaimerPage = lazy(() => import("./pages/disclaimer/disclaimer.jsx"));
const CreatePassword = lazy(() =>
  import("./pages/createPassword/createPassword.jsx")
);
const Home = lazy(() => import("./pages/home/home.jsx"));
const Login = lazy(() => import("./pages/login/login.jsx"));
import WalletHome from "./pages/wallet/wallet.jsx";
// const WalletHome = lazy(() => import("./pages/wallet/wallet.jsx"));
const EditReceivePaymentInformation = lazy(() =>
  import("./pages/receiveAmount/receiveAmount.jsx")
);
const ReceiveQRPage = lazy(() =>
  import("./pages/receiveQRPage/receiveQRPage.jsx")
);
const TechnicalDetailsPage = lazy(() =>
  import("./pages/technicalDetails/technicalDetails.jsx")
);
const Camera = lazy(() => import("./pages/camera/camera.jsx"));
const SwitchReceiveOption = lazy(() =>
  import("./pages/switchReceiveOption/switchReceiveOption.jsx")
);
const ExpandedTxPage = lazy(() =>
  import("./pages/expandedTxPage/expandedTxPage.jsx")
);
const SendPage = lazy(() => import("./pages/sendPage/sendPage.jsx"));
import ConfirmPayment from "./pages/confirmPayment/confirmPaymentScreen.jsx";
import {
  ThemeContext,
  ThemeContextProvider,
  useThemeContext,
} from "./contexts/themeContext.jsx";
import LoadingScreen from "./pages/loadingScreen/index.jsx";
import { BitcoinPriceProvider } from "./contexts/bitcoinPriceContext.jsx";
import { KeysContextProvider } from "./contexts/keysContext.jsx";
import { GlobalContextProvider } from "./contexts/masterInfoObject.jsx";
import { GlobalAppDataProvider } from "./contexts/appDataContext.jsx";
import { GlobalContactsList } from "./contexts/globalContacts.jsx";
import { AppStatusProvider } from "./contexts/appStatus.jsx";
import { GLobalNodeContextProider } from "./contexts/nodeContext.jsx";
import { LiquidEventProvider } from "./contexts/liquidEventContext.jsx";
import { Colors } from "./constants/theme.js";
import AnimatedRouteWrapper from "./components/animatedRouteWrapper.jsx";
import ConfirmActionPage from "./components/confirmActionPage/confirmActionPage.jsx";
import { GlobalRescanLiquidSwaps } from "./contexts/rescanLiquidSwaps.jsx";
import Contacts from "./pages/contacts/contacts.jsx";
import Store from "./pages/store/store.jsx";
import TabsIcon from "./components/tabsIcon/tabsIcon.jsx";
import SettingsContentIndex from "./pages/settings/settingsItem/settingsItem.jsx";
import HandleLNURLPayments from "./contexts/lnurlContext.jsx";
import { ImageCacheProvider } from "./contexts/imageCacheContext.jsx";
import EditMyProfilePage from "./pages/contacts/screens/editMyProfilePage/editMyProfilePage.jsx";
import MyProfilePage from "./pages/contacts/screens/myProfilePage/myProfilePage.jsx";
import useThemeColors from "./hooks/useThemeColors.js";
import BottomTabs from "./tabs/tabs.jsx";
import { ActiveCustodyAccountProvider } from "./contexts/activeAccount.jsx";

// const ConfirmPayment = lazy(() =>
//   import("./pages/confirmPayment/confirmPaymentScreen.jsx")
// );
const SettingsHome = lazy(() => import("./pages/settings/settings.jsx"));
const ViewMnemoinc = lazy(() => import("./pages/viewkey/viewKey.jsx"));
const RestoreWallet = lazy(() =>
  import("./pages/restoreWallet/restoreWallet.jsx")
);
const ErrorScreen = lazy(() => import("./pages/error/error.jsx"));
const ViewAllTxsPage = lazy(() =>
  import("./pages/viewAllTx/viewAllTxPage.jsx")
);

function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(1);
  const { theme, darkModeType } = useThemeContext();
  const { backgroundColor, backgroundOffset, textColor } = useThemeColors();
  console.log(
    backgroundColor,
    backgroundOffset,
    textColor,
    theme,
    darkModeType
  );
  // Define paths where the bottom navigation should be visible
  const showBottomTabsRoutes = ["/wallet", "/contacts", "/store"];
  const shouldShowBottomTabs = showBottomTabsRoutes.includes(location.pathname);
  const background = location.state && location.state.background;

  return (
    <NavigationStackProvider>
      <AuthProvider navigate={navigate}>
        <GlobalRescanLiquidSwaps>
          <KeysContextProvider>
            <GlobalContactsList>
              <GlobalContextProvider>
                <ActiveCustodyAccountProvider>
                  <AppStatusProvider>
                    <ThemeContextProvider>
                      <GLobalNodeContextProider>
                        <SparkWalletProvider navigate={navigate}>
                          <BitcoinPriceProvider>
                            <GlobalAppDataProvider>
                              <LiquidEventProvider>
                                <ImageCacheProvider>
                                  <HandleLNURLPayments />
                                  <AuthGate />
                                  <AnimatePresence mode="wait">
                                    <Suspense
                                      fallback={
                                        <SafeAreaComponent>
                                          <div
                                            style={{
                                              flex: 1,
                                              width: "100%",
                                              height: "100%",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          >
                                            Loading...
                                          </div>
                                        </SafeAreaComponent>
                                      }
                                    >
                                      <Routes location={background || location}>
                                        {/* Public Routes */}
                                        <Route
                                          path="/"
                                          element={
                                            <SafeAreaComponent>
                                              <Home />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/disclaimer"
                                          element={
                                            <SafeAreaComponent>
                                              <DisclaimerPage />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/createAccount"
                                          element={
                                            <SafeAreaComponent>
                                              <CreateSeed />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/createPassword"
                                          element={
                                            <SafeAreaComponent>
                                              <CreatePassword />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/login"
                                          element={
                                            <SafeAreaComponent>
                                              <Login />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/wallet"
                                          element={
                                            <SafeAreaComponent>
                                              <WalletHome />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/contacts"
                                          element={
                                            <SafeAreaComponent>
                                              <Contacts />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/edit-profile"
                                          element={
                                            <SafeAreaComponent>
                                              <EditMyProfilePage />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/my-profile"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ x: "100%" }}
                                              animate={{ x: 0 }}
                                              exitAnimation={{ x: "100%" }}
                                            >
                                              <SafeAreaComponent>
                                                <MyProfilePage />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/store"
                                          element={
                                            <SafeAreaComponent>
                                              <Store />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/receiveAmount"
                                          element={
                                            <SafeAreaComponent>
                                              <EditReceivePaymentInformation />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/receive"
                                          element={
                                            <SafeAreaComponent>
                                              <ReceiveQRPage />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/send"
                                          element={
                                            <SafeAreaComponent>
                                              <SendPage />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/receive-options"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ y: "100%" }}
                                              animate={{ y: 0 }}
                                              exitAnimation={{ y: "100%" }}
                                            >
                                              <SafeAreaComponent>
                                                <SwitchReceiveOption />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/expanded-tx"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ y: "100%" }}
                                              animate={{ y: 0 }}
                                              exitAnimation={{ y: "100%" }}
                                            >
                                              <SafeAreaComponent>
                                                <ExpandedTxPage />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/technical-details"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ y: "100%" }}
                                              animate={{ y: 0 }}
                                              exitAnimation={{ y: "100%" }}
                                            >
                                              <SafeAreaComponent>
                                                <TechnicalDetailsPage />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/camera"
                                          element={<Camera />}
                                        />
                                        <Route
                                          path="/confirm-page"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              exitAnimation={{ opacity: 0 }}
                                            >
                                              <SafeAreaComponent>
                                                <ConfirmPayment />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/settings"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ x: "100%" }}
                                              animate={{ x: 0 }}
                                              exitAnimation={{ x: "100%" }}
                                            >
                                              <SafeAreaComponent>
                                                <SettingsHome />
                                              </SafeAreaComponent>
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/settings-item"
                                          element={
                                            <AnimatedRouteWrapper
                                              initialAnimation={{ x: "100%" }}
                                              animate={{ x: 0 }}
                                              exitAnimation={{ x: "100%" }}
                                            >
                                              <SettingsContentIndex />
                                            </AnimatedRouteWrapper>
                                          }
                                        />
                                        <Route
                                          path="/key"
                                          element={
                                            <SafeAreaComponent>
                                              <ViewMnemoinc />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/restore"
                                          element={
                                            <SafeAreaComponent>
                                              <RestoreWallet />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/viewAllTransactions"
                                          element={
                                            <SafeAreaComponent>
                                              <ViewAllTxsPage />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        <Route
                                          path="/connecting"
                                          element={
                                            <SafeAreaComponent>
                                              <LoadingScreen />
                                            </SafeAreaComponent>
                                          }
                                        />
                                        {/* <Route
                                    path="/error"
                                    element={<ErrorScreen />}
                                  /> */}
                                      </Routes>

                                      {location.pathname ===
                                        "/confirm-action" && (
                                        <ConfirmActionPage />
                                      )}
                                      {location.pathname === "/error" && (
                                        <ErrorScreen />
                                      )}
                                    </Suspense>
                                  </AnimatePresence>
                                  {shouldShowBottomTabs && (
                                    <BottomTabs
                                      value={value}
                                      setValue={setValue}
                                      Link={Link}
                                    />
                                  )}
                                </ImageCacheProvider>
                              </LiquidEventProvider>
                            </GlobalAppDataProvider>
                          </BitcoinPriceProvider>
                        </SparkWalletProvider>
                      </GLobalNodeContextProider>
                    </ThemeContextProvider>
                  </AppStatusProvider>
                </ActiveCustodyAccountProvider>
              </GlobalContextProvider>
            </GlobalContactsList>
          </KeysContextProvider>
        </GlobalRescanLiquidSwaps>
      </AuthProvider>
    </NavigationStackProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);
