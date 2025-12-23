// routes/routeConfig.js
import { lazy } from "react";

// Animation presets
export const ANIMATIONS = {
  NONE: "none",
  SLIDE_LEFT: "slideLeft",
  SLIDE_UP: "slideUp",
  FADE: "fade",
};

export const animationConfigs = {
  [ANIMATIONS.NONE]: null,
  [ANIMATIONS.SLIDE_LEFT]: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  [ANIMATIONS.SLIDE_UP]: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
  [ANIMATIONS.FADE]: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

// Lazy-loaded pages
const pages = {
  CreateSeed: lazy(() => import("./pages/createSeed/createSeed.jsx")),
  DisclaimerPage: lazy(() => import("./pages/disclaimer/disclaimer.jsx")),
  CreatePassword: lazy(() =>
    import("./pages/createPassword/createPassword.jsx")
  ),
  Home: lazy(() => import("./pages/home/home.jsx")),
  Login: lazy(() => import("./pages/login/login.jsx")),
  WalletHome: lazy(() => import("./pages/wallet/wallet.jsx")),
  EditReceivePaymentInformation: lazy(() =>
    import("./pages/receiveAmount/receiveAmount.jsx")
  ),
  ReceiveQRPage: lazy(() => import("./pages/receiveQRPage/receiveQRPage.jsx")),
  TechnicalDetailsPage: lazy(() =>
    import("./pages/technicalDetails/technicalDetails.jsx")
  ),
  Camera: lazy(() => import("./pages/camera/camera.jsx")),
  SwitchReceiveOption: lazy(() =>
    import("./pages/switchReceiveOption/switchReceiveOption.jsx")
  ),
  ExpandedTxPage: lazy(() =>
    import("./pages/expandedTxPage/expandedTxPage.jsx")
  ),
  SendPage: lazy(() => import("./pages/sendPage/sendPage.jsx")),
  SparkSettingsPage: lazy(() =>
    import("./pages/settings/pages/sparkSettingsPage/index.jsx")
  ),
  ExpandedAddContactsPage: lazy(() =>
    import(
      "./pages/contacts/components/expandedAddContactPage/expandedAddContactPage.jsx"
    )
  ),
  ExpandedContactsPage: lazy(() =>
    import(
      "./pages/contacts/components/ExpandedContactsPage/ExpandedContactsPage.jsx"
    )
  ),
  SendAndRequestPage: lazy(() =>
    import(
      "./pages/contacts/components/sendAndRequestPage/sendAndRequsetPage.jsx"
    )
  ),
  ChooseContactListPage: lazy(() =>
    import("./pages/contacts/components/contactsList/contactsList.jsx")
  ),
  EditMyProfilePage: lazy(() =>
    import("./pages/contacts/screens/editMyProfilePage/editMyProfilePage.jsx")
  ),
  SettingsContentIndex: lazy(() =>
    import("./pages/settings/settingsItem/settingsItem.jsx")
  ),
  SettingsHome: lazy(() => import("./pages/settings/settings.jsx")),
  ViewMnemoinc: lazy(() => import("./pages/viewkey/viewKey.jsx")),
  RestoreWallet: lazy(() => import("./pages/restoreWallet/restoreWallet.jsx")),
  ViewAllTxsPage: lazy(() => import("./pages/viewAllTx/viewAllTxPage.jsx")),
  Contacts: lazy(() => import("./pages/contacts/contacts.jsx")),
  Store: lazy(() => import("./pages/store/store.jsx")),
  ConfirmPayment: lazy(() =>
    import("./pages/confirmPayment/confirmPaymentScreen.jsx")
  ),
  LoadingScreen: lazy(() => import("./pages/loadingScreen/index.jsx")),
  ShowProfileQr: lazy(() =>
    import("./pages/settings/pages/showProfileQr/showProfileQr.jsx")
  ),
};

// Route configuration grouped by animation type
export const routeGroups = {
  // No animation - basic routes
  [ANIMATIONS.NONE]: [
    { path: "/", component: pages.Home, useSafeArea: true },
    { path: "/wallet", component: pages.WalletHome, useSafeArea: false },
    { path: "/contacts", component: pages.Contacts, useSafeArea: true },
    { path: "/store", component: pages.Store, useSafeArea: true },
    {
      path: "/chooseContactListPage",
      component: pages.ChooseContactListPage,
      useSafeArea: true,
    },
    {
      path: "/sendAndRequestPage",
      component: pages.SendAndRequestPage,
      useSafeArea: true,
    },

    {
      path: "/receiveAmount",
      component: pages.EditReceivePaymentInformation,
      useSafeArea: true,
    },
    { path: "/receive", component: pages.ReceiveQRPage, useSafeArea: true },
    { path: "/send", component: pages.SendPage, useSafeArea: true },
    { path: "/camera", component: pages.Camera, useSafeArea: false },
    { path: "/key", component: pages.ViewMnemoinc, useSafeArea: true },
    { path: "/restore", component: pages.RestoreWallet, useSafeArea: true },
  ],

  // Slide left animation - typically for settings/navigation
  [ANIMATIONS.SLIDE_LEFT]: [
    { path: "/settings", component: pages.SettingsHome, useSafeArea: true },
    {
      path: "/settings-item",
      component: pages.SettingsContentIndex,
      useSafeArea: false,
    },
    {
      path: "/settings-item/SparkSettingsPage",
      component: pages.SparkSettingsPage,
      useSafeArea: true,
    },
    { path: "/disclaimer", component: pages.DisclaimerPage, useSafeArea: true },
    { path: "/createAccount", component: pages.CreateSeed, useSafeArea: true },
    {
      path: "/createPassword",
      component: pages.CreatePassword,
      useSafeArea: true,
    },

    {
      path: "/expandedAddContactsPage",
      component: pages.ExpandedAddContactsPage,
      useSafeArea: true,
    },
    {
      path: "/expandedContactsPage",
      component: pages.ExpandedContactsPage,
      useSafeArea: true,
    },
    {
      path: "/edit-profile",
      component: pages.EditMyProfilePage,
      useSafeArea: true,
    },
  ],

  // Slide up animation - typically for modals/overlays
  [ANIMATIONS.SLIDE_UP]: [
    {
      path: "/receive-options",
      component: pages.SwitchReceiveOption,
      useSafeArea: true,
    },
    {
      path: "/expanded-tx",
      component: pages.ExpandedTxPage,
      useSafeArea: true,
    },
    {
      path: "/technical-details",
      component: pages.TechnicalDetailsPage,
      useSafeArea: true,
    },
    { path: "/profile-qr", component: pages.ShowProfileQr, useSafeArea: true },
    {
      path: "/viewAllTransactions",
      component: pages.ViewAllTxsPage,
      useSafeArea: true,
    },
  ],

  // Fade animation - typically for transitions
  [ANIMATIONS.FADE]: [
    {
      path: "/confirm-page",
      component: pages.ConfirmPayment,
      useSafeArea: true,
      extraProps: (setValue) => ({ setValue }), // For components needing extra props
    },
    { path: "/login", component: pages.Login, useSafeArea: true },
    { path: "/connecting", component: pages.LoadingScreen, useSafeArea: true },
  ],
};

// Routes that should show bottom tabs
export const bottomTabRoutes = ["/wallet", "/contacts", "/store"];
