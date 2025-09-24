import {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { sparkReceivePaymentWrapper } from "../functions/spark/payments";
import { breezLiquidPaymentWrapper } from "../functions/breezLiquid";
import {
  claimnSparkStaticDepositAddress,
  getSparkBalance,
  getSparkLightningPaymentStatus,
  getSparkStaticBitcoinL1AddressQuote,
  getSparkTransactions,
  queryAllStaticDepositAddresses,
  sparkWallet,
  useSparkPaymentType,
} from "../functions/spark";
import {
  addSingleSparkTransaction,
  bulkUpdateSparkTransactions,
  deleteUnpaidSparkLightningTransaction,
  getAllSparkTransactions,
  getAllUnpaidSparkLightningInvoices,
  SPARK_TX_UPDATE_ENVENT_NAME,
  sparkTransactionsEventEmitter,
} from "../functions/spark/transactions";
import {
  findSignleTxFromHistory,
  fullRestoreSparkState,
  restoreSparkTxState,
  updateSparkTxStatus,
} from "../functions/spark/restore";
import { useGlobalContacts } from "./globalContacts";
import { initWallet } from "../functions/initiateWalletConnection";
import { useAppStatus } from "./appStatus";
import { useNodeContext } from "./nodeContext";
import { calculateBoltzFeeNew } from "../functions/boltz/boltzFeeNew";
import Storage from "../functions/localStorage";
import { useAuth } from "./authContext";
import getDepositAddressTxIds, {
  handleTxIdState,
} from "../functions/spark/getDepositAddressTxIds";
import EventEmitter from "events";
import { transformTxToPaymentObject } from "../functions/spark/transformTxToPayment";
import { useKeysContext } from "./keysContext";
import liquidToSparkSwap from "../functions/spark/liquidToSparkSwap";
import { useActiveCustodyAccount } from "./activeAccount";
import sha256Hash from "../functions/hash";

export const isSendingPayingEventEmiiter = new EventEmitter();
export const SENDING_PAYMENT_EVENT_NAME = "SENDING_PAYMENT_EVENT";

// Initiate context
const SparkWalletManager = createContext(null);
const sessionTime = new Date().getTime();

const SparkWalletProvider = ({ children, navigate }) => {
  const { accountMnemoinc, contactsPrivateKey, publicKey } = useKeysContext();
  const { currentWalletMnemoinc } = useActiveCustodyAccount();
  const { didGetToHomepage, minMaxLiquidSwapAmounts, appState } =
    useAppStatus();
  const { liquidNodeInformation } = useNodeContext();
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const { toggleGlobalContactsInformation, globalContactsInformation } =
    useGlobalContacts();
  const prevAccountMnemoincRef = useRef(null);
  const [sparkConnectionError, setSparkConnectionError] = useState(null);
  const [sparkInformation, setSparkInformation] = useState({
    balance: 0,
    transactions: [],
    identityPubKey: "",
    sparkAddress: "",
    didConnect: null,
  });
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [pendingLiquidPayment, setPendingLiquidPayment] = useState(null);
  const depositAddressIntervalRef = useRef(null);
  const sparkDBaddress = useRef(null);
  const updatePendingPaymentsIntervalRef = useRef(null);
  const isInitialRestore = useRef(true);
  const isInitialLRC20Run = useRef(true);
  const didInitializeSendingPaymentEvent = useRef(false);
  const initialBitcoinIntervalRun = useRef(null);
  const [numberOfCachedTxs, setNumberOfCachedTxs] = useState(0);
  // dont need any more velow

  const [numberOfIncomingLNURLPayments, setNumberOfIncomingLNURLPayments] =
    useState(0);
  const [numberOfConnectionTries, setNumberOfConnectionTries] = useState(0);
  const [startConnectingToSpark, setStartConnectingToSpark] = useState(false);

  const sessionTime = useMemo(() => {
    return Date.now();
  }, [currentWalletMnemoinc]);

  // Debounce refs
  const debounceTimeoutRef = useRef(null);
  const pendingTransferIds = useRef(new Set());

  const toggleIsSendingPayment = (isSending) => {
    setIsSendingPayment(isSending);
  };
  useEffect(() => {
    if (didInitializeSendingPaymentEvent.current) return;
    didInitializeSendingPaymentEvent.current = true;

    isSendingPayingEventEmiiter.addListener(
      SENDING_PAYMENT_EVENT_NAME,
      toggleIsSendingPayment
    );
  }, []);

  // This is a function that handles incoming transactions and formmataes it to reqirued formation
  const handleTransactionUpdate = async (
    recevedTxId,
    transactions,
    balance
  ) => {
    try {
      // First we need to get recent spark transfers
      if (!transactions)
        throw new Error("Unable to get transactions from spark");
      const { transfers } = transactions;
      let selectedSparkTransaction = transfers.find(
        (tx) => tx.id === recevedTxId
      );

      if (!selectedSparkTransaction) {
        console.log("Running full history sweep");
        const singleTxResponse = await findSignleTxFromHistory(
          recevedTxId,
          50,
          currentWalletMnemoinc
        );
        if (!singleTxResponse.tx)
          throw new Error("Unable to find tx in all of history");
        selectedSparkTransaction = singleTxResponse.tx;
      }

      console.log(
        selectedSparkTransaction,
        "received transaction from spark tx list"
      );
      if (!selectedSparkTransaction)
        throw new Error("Not able to get recent transfer");

      const unpaidInvoices = await getAllUnpaidSparkLightningInvoices();
      const paymentObject = await transformTxToPaymentObject(
        selectedSparkTransaction,
        sparkInformation.sparkAddress,
        undefined,
        false,
        unpaidInvoices,
        sparkInformation.identityPubKey
      );

      if (paymentObject) {
        await bulkUpdateSparkTransactions(
          [paymentObject],
          "incomingPayment",
          0,
          balance
        );
      }
      const savedTxs = await getAllSparkTransactions(
        5,
        sparkInformation.identityPubKey
      );
      return {
        txs: savedTxs,
        paymentObject: paymentObject || {},
        paymentCreatedTime: new Date(
          selectedSparkTransaction.createdTime
        ).getTime(),
      };
    } catch (err) {
      console.log("Handle incoming transaction error", err);
    }
  };
  console.log(sparkInformation);
  const handleIncomingPayment = async (transferId, transactions, balance) => {
    let storedTransaction = await handleTransactionUpdate(
      transferId,
      transactions,
      balance
    );

    if (!storedTransaction) {
      setSparkInformation((prev) => ({
        ...prev,
        balance: balance,
      }));
      return;
    }

    const selectedStoredPayment = storedTransaction.txs.find(
      (tx) => tx.sparkID === transferId
    );
    if (!selectedStoredPayment) return;
    console.log(selectedStoredPayment, "seleceted stored transaction");

    const details = JSON.parse(selectedStoredPayment.details);

    if (details?.shouldNavigate && !details.isLNURL) return;
    if (details.isLNURL && !details.isBlitzContactPayment) return;
    if (details.isRestore) return;
    if (storedTransaction.paymentCreatedTime < sessionTime) return;
    // Handle confirm animation here
    navigate("/confirm-page", {
      state: {
        for: "invoicePaid",
        transaction: { ...selectedStoredPayment, details },
      },
    });
  };

  const debouncedHandleIncomingPayment = useCallback(
    async (balance) => {
      if (pendingTransferIds.current.size === 0) return;

      const transferIdsToProcess = Array.from(pendingTransferIds.current);
      pendingTransferIds.current.clear();

      console.log(
        "Processing debounced incoming payments:",
        transferIdsToProcess
      );
      const transactions = await getSparkTransactions(
        1,
        undefined,
        currentWalletMnemoinc
      );
      // Process all pending transfer IDs
      for (const transferId of transferIdsToProcess) {
        try {
          await handleIncomingPayment(transferId, transactions, balance);
        } catch (error) {
          console.error(
            "Error processing incoming payment:",
            transferId,
            error
          );
        }
      }
    },
    [currentWalletMnemoinc, sparkInformation.identityPubKey]
  );

  const handleUpdate = async (...args) => {
    try {
      const [updateType = "transactions", fee = 0, passedBalance = 0] = args;
      console.log(
        "running update in spark context from db changes",
        updateType
      );

      const txs = await getAllSparkTransactions(
        null,
        sparkInformation.identityPubKey
      );
      if (
        updateType === "supportTx" ||
        updateType === "restoreTxs" ||
        updateType === "transactions"
      ) {
        setSparkInformation((prev) => ({
          ...prev,
          transactions: txs || prev.transactions,
        }));
        return;
      }
      if (updateType === "incomingPayment") {
        setSparkInformation((prev) => ({
          ...prev,
          transactions: txs || prev.transactions,
          balance: Number(passedBalance),
        }));
        return;
      }
      const balance = await getSparkBalance(currentWalletMnemoinc);

      if (updateType === "paymentWrapperTx") {
        setSparkInformation((prev) => {
          return {
            ...prev,
            transactions: txs || prev.transactions,
            balance: Math.round(
              (balance.didWork ? Number(balance.balance) : prev.balance) - fee
            ),
            tokens: balance.tokensObj,
          };
        });
      } else if (updateType === "fullUpdate") {
        setSparkInformation((prev) => {
          return {
            ...prev,
            balance: balance.didWork ? Number(balance.balance) : prev.balance,
            transactions: txs || prev.transactions,
            tokens: balance.tokensObj,
          };
        });
      }
    } catch (err) {
      console.error("Error in handleUpdate:", err);
    }
  };

  const transferHandler = (transferId, balance) => {
    console.log(`Transfer ${transferId} claimed. New balance: ${balance}`);

    // Add transferId to pending set
    pendingTransferIds.current.add(transferId);

    // Clear existing timeout if any
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced execution (500ms delay)
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedHandleIncomingPayment(balance);
    }, 500);
  };

  const addListeners = async () => {
    console.log("Adding Spark listeners...");

    sparkTransactionsEventEmitter.removeAllListeners(
      SPARK_TX_UPDATE_ENVENT_NAME
    );
    console.log(currentWalletMnemoinc, "tset");
    sparkWallet[sha256Hash(currentWalletMnemoinc)].removeAllListeners(
      "transfer:claimed"
    );
    sparkTransactionsEventEmitter.on(SPARK_TX_UPDATE_ENVENT_NAME, handleUpdate);

    sparkWallet[sha256Hash(currentWalletMnemoinc)].on(
      "transfer:claimed",
      transferHandler
    );
    // sparkWallet.on("deposit:confirmed", transferHandler);
    if (isInitialRestore.current) {
      isInitialRestore.current = false;
    }

    await fullRestoreSparkState({
      sparkAddress: sparkInformation.sparkAddress,
      batchSize: isInitialRestore.current ? 15 : 5,
      isSendingPayment: isSendingPayment,
      mnemonic: currentWalletMnemoinc,
      identityPubKey: sparkInformation.identityPubKey,
    });
    await updateSparkTxStatus(
      currentWalletMnemoinc,
      sparkInformation.identityPubKey
    );

    if (updatePendingPaymentsIntervalRef.current) {
      console.log("BLOCKING TRYING TO SET INTERVAL AGAIN");
      clearInterval(updatePendingPaymentsIntervalRef.current);
    }
    updatePendingPaymentsIntervalRef.current = setInterval(async () => {
      try {
        await updateSparkTxStatus(
          currentWalletMnemoinc,
          sparkInformation.identityPubKey
        );
        // await getLRC20Transactions({
        //   ownerPublicKeys: [sparkInformation.identityPubKey],
        //   sparkAddress: sparkInformation.sparkAddress,
        //   isInitialRun: isInitialLRC20Run.current,
        //   mnemonic: currentWalletMnemoinc,
        // });
      } catch (err) {
        console.error("Error during periodic restore:", err);
      }
    }, 10 * 1000);
  };

  const removeListeners = () => {
    console.log("Removing spark listeners");
    console.log(
      sparkTransactionsEventEmitter.listenerCount(SPARK_TX_UPDATE_ENVENT_NAME),
      "Nymber of event emiitter litsenrs"
    );
    console.log(
      sparkWallet[sha256Hash(prevAccountMnemoincRef.current)]?.listenerCount(
        "transfer:claimed"
      ),
      "number of spark wallet listenre"
    );
    if (
      sparkTransactionsEventEmitter.listenerCount(SPARK_TX_UPDATE_ENVENT_NAME)
    ) {
      sparkTransactionsEventEmitter.removeAllListeners(
        SPARK_TX_UPDATE_ENVENT_NAME
      );
    }
    if (
      sparkWallet[sha256Hash(prevAccountMnemoincRef.current)]?.listenerCount(
        "transfer:claimed"
      )
    ) {
      sparkWallet[
        sha256Hash(prevAccountMnemoincRef.current)
      ]?.removeAllListeners("transfer:claimed");
    }

    prevAccountMnemoincRef.current = currentWalletMnemoinc;
    // sparkWallet?.removeAllListeners('deposit:confirmed');

    // Clear debounce timeout when removing listeners
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    // Clear pending transfer IDs
    pendingTransferIds.current.clear();

    // Clear update payment state timer
    if (updatePendingPaymentsIntervalRef.current) {
      clearInterval(updatePendingPaymentsIntervalRef.current);
      updatePendingPaymentsIntervalRef.current = null;
    }
  };

  // Add event listeners to listen for bitcoin and lightning or spark transfers when receiving does not handle sending
  useEffect(() => {
    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    const shouldHaveListeners = appState === "active" && !isSendingPayment;
    const shouldHaveSparkEventEmitter = appState === "active";

    removeListeners();

    if (shouldHaveListeners) {
      addListeners();
    } else if (shouldHaveSparkEventEmitter && isSendingPayment) {
      addListeners();
    } else {
      removeListeners();
    }
  }, [
    appState,
    sparkInformation.didConnect,
    didGetToHomepage,
    isSendingPayment,
  ]);

  useEffect(() => {
    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    // Interval to check deposit addresses to see if they were paid
    const handleDepositAddressCheck = async () => {
      try {
        console.log("l1Deposit check running....");
        const allTxs = await getAllSparkTransactions(
          null,
          sparkInformation.identityPubKey
        );
        const savedTxMap = new Map(allTxs.map((tx) => [tx.sparkID, tx]));
        const depoistAddress = await queryAllStaticDepositAddresses(
          currentWalletMnemoinc
        );

        // Loop through deposit addresses and check if they have been paid
        for (const address of depoistAddress) {
          console.log("Checking deposit address:", address);
          if (!address) continue;

          // Get new txids for an address
          const txids = await getDepositAddressTxIds(
            address,
            contactsPrivateKey,
            publicKey
          );
          console.log("Deposit address txids:", txids);
          if (!txids || !txids.length) continue;
          const unpaidTxids = txids.filter((txid) => !txid.didClaim);
          let claimedTxs = Storage.getItem("claimedBitcoinTxs") || [];

          for (const txid of unpaidTxids) {
            // get quote for the txid
            const { didwork, quote, error } =
              await getSparkStaticBitcoinL1AddressQuote(
                txid.txid,
                currentWalletMnemoinc
              );
            const hasAlreadySaved = savedTxMap.has(txid.txid);

            if (!txid.isConfirmed) {
              if (!hasAlreadySaved) {
                await addPendingTransaction(
                  {
                    transactionId: txid.txid,
                    creditAmountSats: txid.amount - txid.fee,
                  },
                  address,
                  sparkInformation
                );
              }
            }

            console.log("Deposit address quote:", quote);

            if (!didwork || !quote) {
              console.log(error, "Error getting deposit address quote");
              if (
                error.includes("UTXO is already claimed by the current user.")
              ) {
                handleTxIdState(txid, true, address);
              }
              continue;
            }

            if (claimedTxs?.includes(quote.signature)) {
              continue;
            }

            const {
              didWork,
              error: claimError,
              response: claimTx,
            } = await claimnSparkStaticDepositAddress({
              ...quote,
              sspSignature: quote.signature,
              mnemonic: currentWalletMnemoinc,
            });

            if (!claimTx || !didWork) {
              console.log("Claim static deposit address error", claimError);
              if (
                claimError.includes("Static deposit has already been claimed")
              ) {
                handleTxIdState(txid, true, address);
              }
              // For any other claim errors (like utxo not found), don't add to DB
              continue;
            }

            if (!hasAlreadySaved) {
              await addPendingTransaction(quote, address, sparkInformation);
            }

            console.log("Claimed deposit address transaction:", claimTx);

            if (!claimedTxs?.includes(quote.signature)) {
              claimedTxs.push(quote.signature);
              Storage.setItem("claimedBitcoinTxs", claimedTxs);
              handleTxIdState(txid, true, address);
            }

            await new Promise((res) => setTimeout(res, 2000));

            const findBitcoinTxResponse = await findSignleTxFromHistory(
              claimTx.transferId,
              5,
              currentWalletMnemoinc
            );

            let updatedTx = {};
            if (!findBitcoinTxResponse.tx) {
              updatedTx = {
                useTempId: true,
                id: claimTx.transferId,
                tempId: quote.transactionId,
                paymentStatus: "pending",
                paymentType: "bitcoin",
                accountId: sparkInformation.identityPubKey,
              };
            } else {
              const { tx: bitcoinTransfer } = findBitcoinTxResponse;
              if (!bitcoinTransfer) {
                updatedTx = {
                  useTempId: true,
                  id: claimTx.transferId,
                  tempId: quote.transactionId,
                  paymentStatus: "pending",
                  paymentType: "bitcoin",
                  accountId: sparkInformation.identityPubKey,
                };
              } else {
                updatedTx = {
                  useTempId: true,
                  tempId: quote.transactionId,
                  id: bitcoinTransfer.id,
                  paymentStatus: "completed",
                  paymentType: "bitcoin",
                  accountId: sparkInformation.identityPubKey,
                  details: {
                    amount: bitcoinTransfer.totalValue,
                    fee: Math.abs(
                      quote.creditAmountSats - bitcoinTransfer.totalValue
                    ),
                  },
                };
              }
            }

            await bulkUpdateSparkTransactions([updatedTx], "fullUpdate");
            console.log("Updated bitcoin transaction:", updatedTx);
          }
        }
      } catch (err) {
        console.log("Handle deposit address check error", err);
      }
    };

    const addPendingTransaction = async (quote, address, sparkInformation) => {
      const pendingTx = {
        id: quote.transactionId,
        paymentStatus: "pending",
        paymentType: "bitcoin",
        accountId: sparkInformation.identityPubKey,
        details: {
          fee: 0,
          amount: quote.creditAmountSats,
          address: address,
          time: new Date().getTime(),
          direction: "INCOMING",
          description: "Deposit address payment",
          onChainTxid: quote.transactionId,
          isRestore: true, // This is a restore payment
        },
      };
      await addSingleSparkTransaction(pendingTx);
    };

    if (depositAddressIntervalRef.current) {
      clearInterval(depositAddressIntervalRef.current);
    }
    if (isSendingPayment) return;
    if (!initialBitcoinIntervalRun.current) {
      setTimeout(handleDepositAddressCheck, 1_000 * 5);
      initialBitcoinIntervalRun.current = true;
    }
    depositAddressIntervalRef.current = setInterval(
      handleDepositAddressCheck,
      1_000 * 60
    );
  }, [didGetToHomepage, sparkInformation.didConnect, isSendingPayment]);

  // This function connects to the spark node and sets the session up

  const connectToSparkWallet = useCallback(async () => {
    console.log(accountMnemoinc, "acc me");
    const { didWork, error } = await initWallet({
      setSparkInformation,
      // toggleGlobalContactsInformation,
      // globalContactsInformation,
      mnemonic: accountMnemoinc,
    });

    console.log(didWork, "did Connect to spark");
    if (!didWork) {
      setSparkInformation((prev) => ({ ...prev, didConnect: false }));
      setSparkConnectionError(error);
      console.log("Error connecting to spark wallet:", error);
      return;
    }
  }, [accountMnemoinc]);

  // Function to update db when all reqiured information is loaded
  useEffect(() => {
    if (!sparkInformation.didConnect) return;
    if (!globalContactsInformation?.myProfile) return;

    if (sparkDBaddress.current) return;
    sparkDBaddress.current = true;

    if (
      !globalContactsInformation.myProfile.sparkAddress ||
      !globalContactsInformation.myProfile.sparkIdentityPubKey
    ) {
      toggleGlobalContactsInformation(
        {
          myProfile: {
            ...globalContactsInformation.myProfile,
            sparkAddress: sparkInformation.sparkAddress,
            sparkIdentityPubKey: sparkInformation.identityPubKey,
          },
        },
        true
      );
    }
  }, [globalContactsInformation.myProfile, sparkInformation]);

  // This function checks to see if there are any liquid funds that need to be sent to spark
  useEffect(() => {
    async function swapLiquidToSpark() {
      try {
        if (liquidNodeInformation.userBalance > minMaxLiquidSwapAmounts.min) {
          setPendingLiquidPayment(true);
          await liquidToSparkSwap(
            globalContactsInformation.myProfile.uniqueName
          );
        }
      } catch (err) {
        console.log("transfering liquid to spark error", err);
      }
    }

    if (!didGetToHomepage) return;
    if (!sparkInformation.didConnect) return;
    swapLiquidToSpark();
  }, [
    didGetToHomepage,
    liquidNodeInformation,
    minMaxLiquidSwapAmounts,
    sparkInformation.didConnect,
    globalContactsInformation?.myProfile?.uniqueName,
  ]);

  const contextValue = useMemo(
    () => ({
      sparkInformation,
      setSparkInformation,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,
      numberOfCachedTxs,
      setNumberOfCachedTxs,
      setStartConnectingToSpark,
      connectToSparkWallet,
    }),
    [
      sparkInformation,
      setSparkInformation,
      pendingNavigation,
      setPendingNavigation,
      numberOfIncomingLNURLPayments,
      setNumberOfIncomingLNURLPayments,
      numberOfConnectionTries,
      numberOfCachedTxs,
      setNumberOfCachedTxs,
      setStartConnectingToSpark,
      connectToSparkWallet,
    ]
  );

  return (
    <SparkWalletManager.Provider value={contextValue}>
      {children}
    </SparkWalletManager.Provider>
  );
};

function useSpark() {
  const context = useContext(SparkWalletManager);
  if (!context) {
    throw new Error("useSparkWallet must be used within a SparkWalletProvider");
  }
  return context;
}

export { SparkWalletManager, SparkWalletProvider, useSpark };
