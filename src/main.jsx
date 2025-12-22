import "../i18n.js";
import "./fonts.css";
import "./index.css";
import "./App.css";
import "../pollyfills.js";
import { StrictMode, Suspense, lazy, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import SafeAreaComponent from "./components/safeAreaContainer.jsx";
import { AnimatePresence } from "framer-motion";

// Lazy-loaded pages
const CreateSeed = lazy(() => import("./pages/createSeed/createSeed.jsx"));
const DisclaimerPage = lazy(() => import("./pages/disclaimer/disclaimer.jsx"));
const CreatePassword = lazy(() =>
  import("./pages/createPassword/createPassword.jsx")
);
const Home = lazy(() => import("./pages/home/home.jsx"));
const Login = lazy(() => import("./pages/login/login.jsx"));
const WalletHome = lazy(() => import("./pages/wallet/wallet.jsx"));
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
const SparkSettingsPage = lazy(() =>
  import("./pages/settings/pages/sparkSettingsPage/index.jsx")
);
const ExpandedAddContactsPage = lazy(() =>
  import(
    "./pages/contacts/components/expandedAddContactPage/expandedAddContactPage.jsx"
  )
);
const ExpandedContactsPage = lazy(() =>
  import(
    "./pages/contacts/components/ExpandedContactsPage/ExpandedContactsPage.jsx"
  )
);
const SendAndRequestPage = lazy(() =>
  import(
    "./pages/contacts/components/sendAndRequestPage/sendAndRequsetPage.jsx"
  )
);
const ChooseContactListPage = lazy(() =>
  import("./pages/contacts/components/contactsList/contactsList.jsx")
);
const EditMyProfilePage = lazy(() =>
  import("./pages/contacts/screens/editMyProfilePage/editMyProfilePage.jsx")
);
const SettingsContentIndex = lazy(() =>
  import("./pages/settings/settingsItem/settingsItem.jsx")
);
const SettingsHome = lazy(() => import("./pages/settings/settings.jsx"));
const ViewMnemoinc = lazy(() => import("./pages/viewkey/viewKey.jsx"));
const RestoreWallet = lazy(() =>
  import("./pages/restoreWallet/restoreWallet.jsx")
);
const ViewAllTxsPage = lazy(() =>
  import("./pages/viewAllTx/viewAllTxPage.jsx")
);
const Contacts = lazy(() => import("./pages/contacts/contacts.jsx"));
const Store = lazy(() => import("./pages/store/store.jsx"));
const ConfirmPayment = lazy(() =>
  import("./pages/confirmPayment/confirmPaymentScreen.jsx")
);
const LoadingScreen = lazy(() => import("./pages/loadingScreen/index.jsx"));

// Lazy load bottom tabs
const BottomTabs = lazy(() => import("./tabs/tabs.jsx"));

// Lazy load components that are used conditionally
const AnimatedRouteWrapper = lazy(() =>
  import("./components/animatedRouteWrapper.jsx")
);
const OverlayHost = lazy(() => import("./components/overlayHost.jsx"));
const AuthGate = lazy(() => import("./components/authGate.jsx"));

// Import contexts (these need to be imported normally as they wrap the app)
import { ThemeContextProvider } from "./contexts/themeContext.jsx";
import { BitcoinPriceProvider } from "./contexts/bitcoinPriceContext.jsx";
import { KeysContextProvider } from "./contexts/keysContext.jsx";
import { GlobalContextProvider } from "./contexts/masterInfoObject.jsx";
import { GlobalAppDataProvider } from "./contexts/appDataContext.jsx";
import { GlobalContactsList } from "./contexts/globalContacts.jsx";
import { AppStatusProvider } from "./contexts/appStatus.jsx";
import { GLobalNodeContextProider } from "./contexts/nodeContext.jsx";
import { LiquidEventProvider } from "./contexts/liquidEventContext.jsx";
import { GlobalRescanLiquidSwaps } from "./contexts/rescanLiquidSwaps.jsx";
import HandleLNURLPayments from "./contexts/lnurlContext.jsx";
import { ImageCacheProvider } from "./contexts/imageCacheContext.jsx";
import { ActiveCustodyAccountProvider } from "./contexts/activeAccount.jsx";
import { GlobalServerTimeProvider } from "./contexts/serverTime.jsx";
import { OverlayProvider } from "./contexts/overlayContext.jsx";
import { ToastContainer, ToastProvider } from "./contexts/toastManager.jsx";
import { SparkNavigationListener } from "./contexts/SDKNavigation.jsx";
import { SparkWalletProvider } from "./contexts/sparkContext.jsx";
import { AuthProvider } from "./contexts/authContext.jsx";
import { NavigationStackProvider } from "./contexts/navigationLogger.jsx";

// Import loading screen component (not lazy loaded as it's needed immediately)
import FullLoadingScreen from "./components/fullLoadingScreen/fullLoadingScreen.jsx";

function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(1);

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
                      <SparkWalletProvider navigate={navigate}>
                        <GLobalNodeContextProider>
                          <BitcoinPriceProvider>
                            <GlobalAppDataProvider>
                              <LiquidEventProvider>
                                <ImageCacheProvider>
                                  <GlobalServerTimeProvider>
                                    <OverlayProvider>
                                      <ToastProvider>
                                        <HandleLNURLPayments />
                                        <Suspense
                                          fallback={
                                            <div style={{ display: "none" }} />
                                          }
                                        >
                                          <AuthGate />
                                        </Suspense>
                                        <ToastContainer />
                                        <SparkNavigationListener />
                                        <AnimatePresence mode="wait">
                                          <Suspense
                                            fallback={
                                              <SafeAreaComponent>
                                                <div
                                                  style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    width: "100%",
                                                    height: "100%",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                  }}
                                                >
                                                  <FullLoadingScreen />
                                                </div>
                                              </SafeAreaComponent>
                                            }
                                          >
                                            <Routes
                                              location={background || location}
                                            >
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
                                                element={<WalletHome />}
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
                                                path="/expandedAddContactsPage"
                                                element={
                                                  <SafeAreaComponent>
                                                    <ExpandedAddContactsPage />
                                                  </SafeAreaComponent>
                                                }
                                              />
                                              <Route
                                                path="/expandedContactsPage"
                                                element={
                                                  <SafeAreaComponent>
                                                    <ExpandedContactsPage />
                                                  </SafeAreaComponent>
                                                }
                                              />
                                              <Route
                                                path="/chooseContactListPage"
                                                element={
                                                  <SafeAreaComponent>
                                                    <ChooseContactListPage />
                                                  </SafeAreaComponent>
                                                }
                                              />
                                              <Route
                                                path="/sendAndRequestPage"
                                                element={
                                                  <SafeAreaComponent>
                                                    <SendAndRequestPage />
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
                                                    initialAnimation={{
                                                      y: "100%",
                                                    }}
                                                    animate={{ y: 0 }}
                                                    exitAnimation={{
                                                      y: "100%",
                                                    }}
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
                                                    initialAnimation={{
                                                      y: "100%",
                                                    }}
                                                    animate={{ y: 0 }}
                                                    exitAnimation={{
                                                      y: "100%",
                                                    }}
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
                                                    initialAnimation={{
                                                      y: "100%",
                                                    }}
                                                    animate={{ y: 0 }}
                                                    exitAnimation={{
                                                      y: "100%",
                                                    }}
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
                                                    initialAnimation={{
                                                      opacity: 0,
                                                    }}
                                                    animate={{ opacity: 1 }}
                                                    exitAnimation={{
                                                      opacity: 0,
                                                    }}
                                                  >
                                                    <SafeAreaComponent>
                                                      <ConfirmPayment
                                                        setValue={setValue}
                                                      />
                                                    </SafeAreaComponent>
                                                  </AnimatedRouteWrapper>
                                                }
                                              />
                                              <Route
                                                path="/settings"
                                                element={
                                                  <AnimatedRouteWrapper
                                                    initialAnimation={{
                                                      x: "100%",
                                                    }}
                                                    animate={{ x: 0 }}
                                                    exitAnimation={{
                                                      x: "100%",
                                                    }}
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
                                                    initialAnimation={{
                                                      x: "100%",
                                                    }}
                                                    animate={{ x: 0 }}
                                                    exitAnimation={{
                                                      x: "100%",
                                                    }}
                                                  >
                                                    <SettingsContentIndex />
                                                  </AnimatedRouteWrapper>
                                                }
                                              />
                                              <Route
                                                path="/settings-item/SparkSettingsPage"
                                                element={
                                                  <AnimatedRouteWrapper
                                                    initialAnimation={{
                                                      x: "100%",
                                                    }}
                                                    animate={{ x: 0 }}
                                                    exitAnimation={{
                                                      x: "100%",
                                                    }}
                                                  >
                                                    <SafeAreaComponent>
                                                      <SparkSettingsPage />
                                                    </SafeAreaComponent>
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
                                            </Routes>
                                            <Suspense fallback={null}>
                                              <OverlayHost />
                                            </Suspense>
                                          </Suspense>
                                        </AnimatePresence>
                                        {shouldShowBottomTabs && (
                                          <Suspense fallback={null}>
                                            <BottomTabs
                                              value={value}
                                              setValue={setValue}
                                              Link={Link}
                                            />
                                          </Suspense>
                                        )}
                                      </ToastProvider>
                                    </OverlayProvider>
                                  </GlobalServerTimeProvider>
                                </ImageCacheProvider>
                              </LiquidEventProvider>
                            </GlobalAppDataProvider>
                          </BitcoinPriceProvider>
                        </GLobalNodeContextProider>
                      </SparkWalletProvider>
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
