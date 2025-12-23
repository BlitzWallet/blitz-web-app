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

import { routeGroups, animationConfigs, bottomTabRoutes } from "./routes.jsx";
const BottomTabs = lazy(() => import("./tabs/tabs.jsx"));
const AnimatedRouteWrapper = lazy(() =>
  import("./components/animatedRouteWrapper.jsx")
);
const OverlayHost = lazy(() => import("./components/overlayHost.jsx"));
const AuthGate = lazy(() => import("./components/authGate.jsx"));

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
import FullLoadingScreen from "./components/fullLoadingScreen/fullLoadingScreen.jsx";

function RouteRenderer({ route, animationType, setValue }) {
  const Component = route.component;
  const animationConfig = animationConfigs[animationType];

  const content = route.useSafeArea ? (
    <SafeAreaComponent>
      <Component {...(route.extraProps ? route.extraProps(setValue) : {})} />
    </SafeAreaComponent>
  ) : (
    <Component {...(route.extraProps ? route.extraProps(setValue) : {})} />
  );

  if (!animationConfig) {
    return content;
  }

  return (
    <AnimatedRouteWrapper
      initialAnimation={animationConfig.initial}
      animate={animationConfig.animate}
      exitAnimation={animationConfig.exit}
    >
      {content}
    </AnimatedRouteWrapper>
  );
}

function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(1);

  const shouldShowBottomTabs = bottomTabRoutes.includes(location.pathname);
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
                                              {Object.entries(routeGroups).map(
                                                ([animationType, routes]) =>
                                                  routes.map((route) => (
                                                    <Route
                                                      key={route.path}
                                                      path={route.path}
                                                      element={
                                                        <RouteRenderer
                                                          route={route}
                                                          animationType={
                                                            animationType
                                                          }
                                                          setValue={setValue}
                                                        />
                                                      }
                                                    />
                                                  ))
                                              )}
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
