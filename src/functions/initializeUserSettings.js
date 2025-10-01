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

    const [
      _,
      // pastExploreData,
      // savedNWCData,
    ] = await Promise.all([
      initializeFirebase(publicKey, privateKey),
      // getLocalStorageItem('savedExploreData').then(data => JSON.parse(data)),
      // getNWCData().then((data) => data || {}),
    ]);

    // const shouldLoadExporeDataResp = shouldLoadExploreData(pastExploreData);

    // Wrap both of thses in promise.all to fetch together.
    let [
      blitzStoredData,
      localStoredData,
      //  freshExploreData
    ] = await Promise.all([
      getDataFromCollection("blitzWalletUsers", publicKey),
      fetchLocalStorageItems(),
      // shouldLoadExporeDataResp
      //   ? fetchBackend(
      //       'getTotalUserCount',
      //       {data: publicKey},
      //       privateKey,
      //       publicKey,
      //     )
      //   : Promise.resolve(null),
    ]);

    let {
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
      didViewNWCMessage,
      userSelectedLanguage,
      // nwc_identity_pub_key,
      userBalanceDenomination,
    } = localStoredData;

    if (blitzStoredData === null) throw Error("Failed to retrive");
    blitzStoredData = blitzStoredData || {};
    toggleContactsPrivateKey(privateKey);

    const generatedUniqueName = blitzStoredData?.contacts?.uniqueName
      ? ""
      : generateRandomContact();
    let contacts = blitzStoredData.contacts || {
      myProfile: {
        uniqueName: generatedUniqueName.uniqueName,
        uniqueNameLower: generatedUniqueName.uniqueName.toLowerCase(),
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

    let enabledLNURL = blitzStoredData.enabledLNURL;
    let enabledGiftCards = blitzStoredData.enabledGiftCards;
    let isUsingEncriptedMessaging = blitzStoredData.isUsingEncriptedMessaging;
    let isUsingNewNotifications = blitzStoredData.isUsingNewNotifications;

    const dbUserBalanceDenomination =
      blitzStoredData.userBalanceDenomination || "sats";

    const selectedLanguage = userSelectedLanguage;

    let pushNotifications = blitzStoredData.pushNotifications || {
      isEnabled: false,
      pushNotifications: {
        hash: "",
        key: {},
      },
      enabledServices: {
        contactPayments: false,
        lnurlPayments: false,
        nostrPayments: false,
        pointOfSale: false,
      },
    };

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
    let lrc20Settings = blitzStoredData.lrc20Settings;

    // const eCashInformation =
    //   blitzStoredData.eCashInformation ||
    //   [
    //     // {
    //     //   proofs: [],
    //     //   transactions: [],
    //     //   mintURL: '',
    //     //   isCurrentMint: null,
    //     // },
    //   ];
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
    const nip5Settings = blitzStoredData.nip5Settings || {
      name: "",
      pubkey: "",
    };

    // let lnurlPubKey = blitzStoredData.lnurlPubKey;

    //added here for legecy people
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
        contacts.myProfile.uniqueName.toLowerCase();
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
    if (enabledLNURL === undefined) {
      enabledLNURL = true;
      needsToUpdate = true;
    }
    if (enabledGiftCards === undefined) {
      enabledGiftCards = true;
      needsToUpdate = true;
    }
    if (!ecashWalletSettings) {
      ecashWalletSettings = {
        maxReceiveAmountSat: 10_000,
        maxEcashBalance: 25_000,
      };
      needsToUpdate = true;
    }
    if (pushNotifications.isEnabled === undefined) {
      const hasNotificationsStored = Object.keys(pushNotifications).length > 0;

      pushNotifications = {
        isEnabled: hasNotificationsStored,
        hash: pushNotifications?.hash || "",
        key: pushNotifications?.key || {},
        platform: pushNotifications?.platform || "",
        enabledServices: {
          contactPayments: hasNotificationsStored,
          lnurlPayments: hasNotificationsStored,
          nostrPayments: hasNotificationsStored,
          pointOfSale: hasNotificationsStored,
        },
      };

      needsToUpdate = true;
    }
    if (isUsingEncriptedMessaging === undefined) {
      isUsingEncriptedMessaging = true;
      needsToUpdate = true;
    }

    if (isUsingNewNotifications === undefined || !isUsingNewNotifications) {
      isUsingNewNotifications = true;
      needsToUpdate = true;
    }

    if (
      contacts.myProfile.uniqueName &&
      contacts.myProfile.uniqueNameLower &&
      (contacts.myProfile.uniqueName.trim() !== contacts.myProfile.uniqueName ||
        contacts.myProfile.uniqueNameLower.trim() !==
          contacts.myProfile.uniqueNameLower)
    ) {
      contacts.myProfile.uniqueName = contacts.myProfile.uniqueName.trim();
      contacts.myProfile.uniqueNameLower =
        contacts.myProfile.uniqueNameLower.trim();
      needsToUpdate = true;
    }

    if (!lrc20Settings) {
      lrc20Settings = {
        isEnabled: false,
      };
    }

    // if (!nwc_identity_pub_key) {
    //   const didInit = await initializeNWCWallet();

    //   if (didInit.isConnected) {
    //     const pubkey = await getNWCSparkIdentityPubKey();

    //     toggleMasterInfoObject({ [NWC_IDENTITY_PUB_KEY]: pubkey });
    //   }
    // }

    if (!userBalanceDenomination) {
      userBalanceDenomination = dbUserBalanceDenomination;
      Storage.setItem("userBalanceDenomination", dbUserBalanceDenomination);
    }

    // if (!lnurlPubKey) {
    //   lnurlPubKey = getBitcoinKeyPair(mnemonic).publicKey;
    //   needsToUpdate = true;
    // }

    // if (shouldLoadExporeDataResp && freshExploreData) {
    //   if (freshExploreData) {
    //     tempObject['exploreData'] = freshExploreData;
    //     setLocalStorageItem(
    //       'savedExploreData',
    //       JSON.stringify({
    //         lastUpdated: new Date().getTime(),
    //         data: freshExploreData,
    //       }),
    //     );
    //   } else tempObject['exploreData'] = null;
    // } else {
    //   tempObject['exploreData'] = pastExploreData.data;
    // }

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
    tempObject["enabledLNURL"] = enabledLNURL;
    tempObject["enabledGiftCards"] = enabledGiftCards;
    tempObject["useTrampoline"] = useTrampoline;
    tempObject["offlineReceiveAddresses"] = offlineReceiveAddresses;
    // tempObject['lnurlPubKey'] = lnurlPubKey;
    tempObject["isUsingEncriptedMessaging"] = isUsingEncriptedMessaging;
    tempObject["isUsingNewNotifications"] = isUsingNewNotifications;
    tempObject["lrc20Settings"] = lrc20Settings;

    // store in contacts context
    tempObject["contacts"] = contacts;
    tempObject["nip5Settings"] = nip5Settings;

    // Store in ecash context
    // tempObject['eCashInformation'] = eCashInformation;

    // store in app context
    tempObject["appData"] = appData;
    tempObject[QUICK_PAY_STORAGE_KEY] = fastPaySettings;
    tempObject["crashReportingSettings"] = crashReportingSettings;
    tempObject["enabledDeveloperSupport"] = enabledDeveloperSupport;
    tempObject["didViewNWCMessage"] = didViewNWCMessage;

    if (needsToUpdate || Object.keys(blitzStoredData).length === 0) {
      await sendDataToDB(tempObject, publicKey);
    }
    delete tempObject["contacts"];
    // delete tempObject['eCashInformation'];
    delete tempObject["appData"];
    // only add to local data, dont push to global storage
    // tempObject["NWC"] = savedNWCData;

    toggleGlobalAppDataInformation(appData);
    // toggleGLobalEcashInformation(eCashInformation);
    toggleGlobalContactsInformation(contacts);
    setMasterInfoObject(tempObject);

    return true;
  } catch (err) {
    console.log(err, "INITIALIZE USER SETTINGS");
    return false;
  }
}
