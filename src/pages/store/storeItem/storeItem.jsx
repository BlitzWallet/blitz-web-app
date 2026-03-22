import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const ChatGPT = lazy(() => import("../pages/chatgpt/chatgpt.jsx"));
const AddCredits = lazy(() =>
  import("../pages/chatgpt/addCredits/addCredits.jsx")
);
const SMS4SatsHome = lazy(() => import("../pages/sms4sats/home/home.jsx"));
const SMS4SatsSendPage = lazy(() =>
  import("../pages/sms4sats/sendPage/sendPage.jsx")
);
const SMS4SatsReceivePage = lazy(() =>
  import("../pages/sms4sats/receivePage/receivePage.jsx")
);
const SMS4SatsSentPayments = lazy(() =>
  import("../pages/sms4sats/sentPayments/sentPayments.jsx")
);
const ViewSMSCode = lazy(() =>
  import("../pages/sms4sats/viewSMSCode/viewSMSCode.jsx")
);
const ConfirmReceivePayment = lazy(() =>
  import("../pages/sms4sats/confirmReceivePayment/confirmReceivePayment.jsx")
);
const OnlineListings = lazy(() =>
  import("../pages/onlineListings/onlineListings.jsx")
);
const GiftCardsHome = lazy(() =>
  import("../pages/giftCards/home/giftCardsHome.jsx")
);
const CreateAccount = lazy(() =>
  import("../pages/giftCards/createAccount/createAccount.jsx")
);
const CountriesList = lazy(() =>
  import("../pages/giftCards/countriesList/countriesList.jsx")
);
const ExpandedGiftCard = lazy(() =>
  import("../pages/giftCards/expandedGiftCard/expandedGiftCard.jsx")
);
const ConfirmPurchase = lazy(() =>
  import("../pages/giftCards/confirmPurchase/confirmPurchase.jsx")
);
const GiftCardOrderDetails = lazy(() =>
  import("../pages/giftCards/orderDetails/giftCardOrderDetails.jsx")
);
const HistoricalPurchases = lazy(() =>
  import("../pages/giftCards/historicalPurchases/historicalPurchases.jsx")
);

export default function StoreItem() {
  const location = useLocation();
  const props = location.state || {};
  const selectedPage = props.for?.toLowerCase();

  return (
    <Suspense fallback={null}>
      {selectedPage === "chatgpt" && <ChatGPT {...props} />}
      {selectedPage === "chatgpt-add-credits" && <AddCredits {...props} />}
      {selectedPage === "sms4sats" && <SMS4SatsHome {...props} />}
      {selectedPage === "sms4sats-send" && <SMS4SatsSendPage {...props} />}
      {selectedPage === "sms4sats-receive" && (
        <SMS4SatsReceivePage {...props} />
      )}
      {selectedPage === "sms4sats-history" && (
        <SMS4SatsSentPayments {...props} />
      )}
      {selectedPage === "sms4sats-view-code" && <ViewSMSCode {...props} />}
      {selectedPage === "sms4sats-confirm-receive" && (
        <ConfirmReceivePayment {...props} />
      )}
      {selectedPage === "onlinelistings" && <OnlineListings {...props} />}
      {selectedPage === "giftcards" && <GiftCardsHome {...props} />}
      {selectedPage === "giftcards-create-account" && (
        <CreateAccount {...props} />
      )}
      {selectedPage === "giftcards-countries" && <CountriesList {...props} />}
      {selectedPage === "giftcards-expanded" && <ExpandedGiftCard {...props} />}
      {selectedPage === "giftcards-confirm-purchase" && (
        <ConfirmPurchase {...props} />
      )}
      {selectedPage === "giftcards-order-details" && (
        <GiftCardOrderDetails {...props} />
      )}
      {selectedPage === "giftcards-history" && (
        <HistoricalPurchases {...props} />
      )}
    </Suspense>
  );
}
