import { getDataFromCollection } from "../../db";
import fetchBackend from "../../db/handleBackend";
import { initializeFirebase } from "../../db/initializeFirebase";
import { sendDataToDB } from "../../db/interactionManager";
import { MIN_CHANNEL_OPEN_FEE, QUICK_PAY_STORAGE_KEY } from "../constants";
import { generateRandomContact } from "./contacts";
import { generateBitcoinKeyPair } from "./ecdh";
import { fetchLocalStorageItems } from "./initializeUserSettingsHelpers";
import Storage from "./localStorage";
import {
  getCurrentDateFormatted,
  getDateXDaysAgo,
  isNewDaySince,
} from "./rotateAddressDateChecker";
import { getPublicKey, privateKeyFromSeedWords } from "./seed";
export default async function initializeUserSettings(
  mnemoinc,
  toggleContactsPrivateKey,
  setMasterInfoObject,
  toggleGlobalContactsInformation,
  toggleGlobalAppDataInformation
) {
  try {
    let needsToUpdate = false;
    let tempObject = {};

    const privateKey = mnemoinc ? privateKeyFromSeedWords(mnemoinc) : null;
    const publicKey = privateKey ? getPublicKey(privateKey) : null;

    if (!privateKey || !publicKey) throw Error("Failed to retrieve keys");

    await initializeFirebase(publicKey, privateKey);

    // Wrap both of thses in promise.all to fetch together.
    let [blitzStoredData, localStoredData, lastUpdatedExploreData] =
      await Promise.all([
        getDataFromCollection("blitzWalletUsers", publicKey),
        fetchLocalStorageItems(),
        Promise.resolve(Storage.getItem("savedExploreData")),
      ]);

    console.log(blitzStoredData);
    console.log(localStoredData);
    console.log(lastUpdatedExploreData);

    const {
      storedUserTxPereferance,
      enabledSlidingCamera,
      userFaceIDPereferance,
      fiatCurrenciesList,
      failedTransactions,
      satDisplay,
      enabledEcash,
      hideUnknownContacts,
      useTrampoline,
      fastPaySettings,
      crashReportingSettings,
      enabledDeveloperSupport,
    } = localStoredData;
    if (blitzStoredData === null) throw Error("Failed to retrive");
    blitzStoredData = blitzStoredData || {};
    toggleContactsPrivateKey(privateKey);

    const generatedUniqueName = blitzStoredData?.contacts?.uniqueName
      ? ""
      : generateRandomContact();

    const contacts = blitzStoredData.contacts || {
      myProfile: {
        uniqueName: generatedUniqueName.uniqueName,
        uniqueNameLower: generatedUniqueName.uniqueName.toLocaleLowerCase(),
        bio: "",
        name: "",
        nameLower: "",
        uuid: publicKey,
        didEditProfile: false,
        receiveAddress: null,
        lastRotated: getCurrentDateFormatted(),
        lastRotatedAddedContact: getCurrentDateFormatted(),
      },
      addedContacts: [],
    };

    const fiatCurrency = blitzStoredData.fiatCurrency || "USD";

    const userBalanceDenomination =
      blitzStoredData.userBalanceDenomination || "sats";

    const selectedLanguage = blitzStoredData.userSelectedLanguage || "en";

    const pushNotifications = blitzStoredData.pushNotifications || {};

    const liquidSwaps = blitzStoredData.liquidSwaps || [];

    const chatGPT = blitzStoredData.chatGPT || {
      conversation: [],
      credits: 0,
    };

    const liquidWalletSettings = blitzStoredData.liquidWalletSettings || {
      autoChannelRebalance: true,
      autoChannelRebalancePercantage: 90,
      regulateChannelOpen: true,
      regulatedChannelOpenSize: MIN_CHANNEL_OPEN_FEE, //sats
      maxChannelOpenFee: 5000, //sats
      isLightningEnabled: false, //dissabled by deafult
      minAutoSwapAmount: 10000, //sats
    };

    let ecashWalletSettings = blitzStoredData.ecashWalletSettings;

    const messagesApp = blitzStoredData.messagesApp || {
      sent: [],
      received: [],
    };
    const VPNplans = blitzStoredData.VPNplans || [];

    const posSettings = blitzStoredData.posSettings || {
      storeName: contacts.myProfile.uniqueName,
      storeNameLower: contacts.myProfile.uniqueName.toLowerCase(),
      storeCurrency: fiatCurrency,
      lastRotated: getCurrentDateFormatted(),
      receiveAddress: null,
    };

    const appData = blitzStoredData.appData || {
      VPNplans: VPNplans,
      chatGPT: chatGPT,
      messagesApp: messagesApp,
    };

    const offlineReceiveAddresses = blitzStoredData.offlineReceiveAddresses || {
      lastUpdated: new Date().getTime(),
      addresses: [],
    };

    let lnurlPubKey = blitzStoredData.lnurlPubKey;

    liquidWalletSettings.regulatedChannelOpenSize =
      liquidWalletSettings.regulatedChannelOpenSize < MIN_CHANNEL_OPEN_FEE
        ? MIN_CHANNEL_OPEN_FEE
        : liquidWalletSettings.regulatedChannelOpenSize;

    if (isNaN(liquidWalletSettings?.maxChannelOpenFee)) {
      liquidWalletSettings.maxChannelOpenFee = 5000;
      needsToUpdate = true;
    }

    if (!contacts.myProfile?.uniqueNameLower) {
      contacts.myProfile.uniqueNameLower =
        contacts.myProfile.uniqueName.toLocaleLowerCase();
      needsToUpdate = true;
    }

    if (!contacts.myProfile.lastRotated) {
      contacts.myProfile.lastRotated = getCurrentDateFormatted();
      needsToUpdate = true;
    }

    if (!contacts.myProfile.lastRotatedAddedContact) {
      contacts.myProfile.lastRotatedAddedContact = getDateXDaysAgo(22); // set to 22 days ago to force contacts adderess update for legacy users
      needsToUpdate = true;
    }

    if (!posSettings.storeNameLower) {
      posSettings.storeNameLower = posSettings.storeName.toLowerCase();
      needsToUpdate = true;
    }

    if (!posSettings.lastRotated) {
      posSettings.lastRotated = getCurrentDateFormatted();
      needsToUpdate = true;
    }

    if (liquidWalletSettings.isLightningEnabled === undefined) {
      liquidWalletSettings.isLightningEnabled = true;
      needsToUpdate = true;
    }
    if (liquidWalletSettings.minAutoSwapAmount === undefined) {
      liquidWalletSettings.minAutoSwapAmount = 10000;
      needsToUpdate = true;
    }
    if (contacts.myProfile.didEditProfile === undefined) {
      contacts.myProfile.didEditProfile = true;
      needsToUpdate = true;
    }
    if (contacts.myProfile.nameLower === undefined) {
      contacts.myProfile.nameLower = contacts.myProfile.name.toLowerCase();
      needsToUpdate = true;
    }

    if (!ecashWalletSettings) {
      ecashWalletSettings = {
        maxReceiveAmountSat: 10_000,
        maxEcashBalance: 25_000,
      };
      needsToUpdate = true;
    }

    if (!lnurlPubKey) {
      lnurlPubKey = generateBitcoinKeyPair(mnemoinc).publicKey;
      console.log(lnurlPubKey, "lnurl pub key");
      needsToUpdate = true;
    }

    if (
      !lastUpdatedExploreData?.lastUpdated ||
      isNewDaySince(lastUpdatedExploreData?.lastUpdated)
    ) {
      const response = await fetchBackend(
        "getTotalUserCount",
        { data: publicKey },
        privateKey,
        publicKey
      );
      if (response) {
        tempObject["exploreData"] = response;
        Storage.setItem("savedExploreData", {
          lastUpdated: new Date().getTime(),
          data: response,
        });
      } else tempObject["exploreData"] = null;
    } else {
      tempObject["exploreData"] = lastUpdatedExploreData.data;
    }

    tempObject["homepageTxPreferance"] = storedUserTxPereferance;
    tempObject["userBalanceDenomination"] = userBalanceDenomination;
    tempObject["userSelectedLanguage"] = selectedLanguage;
    tempObject["fiatCurrenciesList"] = fiatCurrenciesList;
    tempObject["fiatCurrency"] = fiatCurrency;
    tempObject["userFaceIDPereferance"] = userFaceIDPereferance;
    tempObject["liquidSwaps"] = liquidSwaps;
    tempObject["failedTransactions"] = failedTransactions;
    tempObject["satDisplay"] = satDisplay;
    tempObject["uuid"] = publicKey;
    tempObject["liquidWalletSettings"] = liquidWalletSettings;
    tempObject["ecashWalletSettings"] = ecashWalletSettings;
    tempObject["enabledSlidingCamera"] = enabledSlidingCamera;
    tempObject["posSettings"] = posSettings;
    tempObject["enabledEcash"] = enabledEcash;
    tempObject["pushNotifications"] = pushNotifications;
    tempObject["hideUnknownContacts"] = hideUnknownContacts;
    tempObject["useTrampoline"] = useTrampoline;
    tempObject["offlineReceiveAddresses"] = offlineReceiveAddresses;
    tempObject["lnurlPubKey"] = lnurlPubKey;

    // store in contacts context
    tempObject["contacts"] = contacts;

    // store in app context
    tempObject["appData"] = appData;
    tempObject[QUICK_PAY_STORAGE_KEY] = fastPaySettings;
    tempObject["crashReportingSettings"] = crashReportingSettings;
    tempObject["enabledDeveloperSupport"] = enabledDeveloperSupport;

    if (needsToUpdate || Object.keys(blitzStoredData).length === 0) {
      await sendDataToDB(tempObject, publicKey);
    }

    delete tempObject["contacts"];

    delete tempObject["appData"];

    toggleGlobalAppDataInformation(appData);
    toggleGlobalContactsInformation(contacts);
    setMasterInfoObject(tempObject);
    return true;
  } catch (err) {
    console.log("initialzie user settings error", err);
    return false;
  }
}
