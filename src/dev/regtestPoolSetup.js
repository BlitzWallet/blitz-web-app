/**
 * Dev-only regtest: create issuer token → mint → Flashnet constant-product pool (token = asset A, BTC = asset B).
 *
 * Uses `@buildonspark/issuer-sdk` (`IssuerSparkWallet`) per Spark issuance docs — not `SparkWallet` alone.
 *
 * - Create token: https://docs.spark.money/issuance/create-token
 * - Mint: https://docs.spark.money/issuance/mint-tokens
 * - Pool: https://docs.flashnet.xyz/products/flashnet-amm/creation
 *
 * Console: `window.__BLITZ_REGTEST_POOL_SETUP__(mnemonic)`
 *
 * Flashnet FSAG-4002 (“Host not found”): pool creation needs a registered host namespace.
 * This script registers one (`registerHost`) when missing, then passes `hostNamespace` to
 * `createConstantProductPool`. Override with `options.hostNamespace` or
 * `VITE_FLASHNET_POOL_HOST_NAMESPACE`.
 */

import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { decodeSparkHumanReadableTokenIdentifier } from "@flashnet/sdk";
import {
  registerSparkWalletInstance,
  initializeFlashnet,
  getFlashnetClient,
  getSparkBalance,
  getSparkStaticBitcoinL1Address,
} from "../functions/spark/index.js";
import { BTC_ASSET_ADDRESS } from "../functions/spark/flashnet.js";

const SPARK_NETWORK = "REGTEST";

/** Must be ≤ `totalHostFeeRateBps` on the pool (Flashnet host rules). */
const HOST_MIN_FEE_BPS = 10;
const LP_FEE_BPS = 30;
/** Includes host fee slice; must be ≥ `HOST_MIN_FEE_BPS` when using a host. */
const TOTAL_HOST_FEE_BPS = 20;

/** Pool liquidity: A = token base units, B = sats. */
const DEFAULT_INITIAL_LIQUIDITY = {
  assetAAmount: 10_000_000n,
  assetBAmount: 1000n,
  assetAMinAmountIn: 10_000_000n,
  assetBMinAmountIn: 1000n,
};

/** Default “USD-like” issuer token (6 decimals). Override via `options.token`. */
const DEFAULT_ISSUER_TOKEN = {
  tokenName: "Regtest USD",
  tokenTicker: "RUSD",
  decimals: 6,
  isFreezable: false,
  maxSupply: 0n,
};

// function mergeInitialLiquidity(overrides) {
//   if (!overrides?.initialLiquidity) return { ...DEFAULT_INITIAL_LIQUIDITY };
//   const o = overrides.initialLiquidity;
//   return {
//     assetAAmount: o.assetAAmount ?? DEFAULT_INITIAL_LIQUIDITY.assetAAmount,
//     assetBAmount: o.assetBAmount ?? DEFAULT_INITIAL_LIQUIDITY.assetBAmount,
//     assetAMinAmountIn:
//       o.assetAMinAmountIn ?? DEFAULT_INITIAL_LIQUIDITY.assetAMinAmountIn,
//     assetBMinAmountIn:
//       o.assetBMinAmountIn ?? DEFAULT_INITIAL_LIQUIDITY.assetBMinAmountIn,
//   };
// }

/** Flashnet pool asset id: 64-char hex from `btknrt1…` or pass-through hex. */
// function tokenIdentifierToFlashnetHex(tokenRef) {
//   const s = String(tokenRef).trim();
//   if (/^[0-9a-fA-F]{64}$/.test(s)) {
//     return s.toLowerCase();
//   }
//   const { tokenIdentifier } = decodeSparkHumanReadableTokenIdentifier(
//     s,
//     SPARK_NETWORK,
//   );
//   return String(tokenIdentifier).toLowerCase();
// }

/**
 * Flashnet AMM expects a real host; sending no / empty `hostNamespace` yields FSAG-4002.
 * Register this wallet as host if needed, then return the namespace.
 */
// async function ensureFlashnetHostNamespace(
//   client,
//   options,
//   logs,
//   identityPublicKey,
// ) {
//   const fromEnv =
//     typeof import.meta.env?.VITE_FLASHNET_POOL_HOST_NAMESPACE === "string"
//       ? import.meta.env.VITE_FLASHNET_POOL_HOST_NAMESPACE.trim()
//       : "";
//   let ns =
//     (options.hostNamespace && String(options.hostNamespace).trim()) || fromEnv;
//   if (!ns) {
//     const pk = String(identityPublicKey || "").trim();
//     ns = pk.length >= 10 ? `blitz-${pk.slice(2, 10)}` : "blitz-regtest-local";
//   }

//   try {
//     await client.getHost(ns);
//     logs.push(`flashnet_host_found:${ns}`);
//   } catch {
//     try {
//       await client.registerHost({
//         namespace: ns,
//         minFeeBps: HOST_MIN_FEE_BPS,
//       });
//       logs.push(`flashnet_host_registered:${ns}`);
//     } catch (e) {
//       const msg = e?.message || String(e);
//       if (/exist|already|taken|duplicate|409/i.test(msg)) {
//         logs.push(`flashnet_host_register_conflict:${msg}`);
//       } else {
//         throw e;
//       }
//     }
//   }

//   return ns;
// }

/**
 * @param {string} mnemonic
 * @param {{
 *   initialLiquidity?: { assetAAmount?: bigint, assetBAmount?: bigint, assetAMinAmountIn?: bigint, assetBMinAmountIn?: bigint },
 *   token?: { tokenName?: string, tokenTicker?: string, decimals?: number, isFreezable?: boolean, maxSupply?: bigint },
 *   mintTokenAmount?: bigint,
 *   hostNamespace?: string,
 * }} [options]
 */
export async function setupRegtestPool(mnemonic, options = {}) {
  const logs = [];

 
  if (import.meta.env.MODE !== "development") {
    return {
      ok: false,
      error:
        "Use Vite development build (MODE=development) so Spark/Flashnet use REGTEST",
      logs,
    };
  }
  if (!mnemonic || typeof mnemonic !== "string") {
    return { ok: false, error: "mnemonic string required", logs };
  }

  const sparkOpts = {
    network: SPARK_NETWORK,
    optimizationOptions: { multiplicity: 2 },
    sspClientOptions: { maxRetries: 4 },
  };

  let wallet;
  try {
    const { wallet } = await IssuerSparkWallet.initialize({
      mnemonicOrSeed: mnemonic,
      options: sparkOpts,
    });
   
    logs.push("issuer_spark_wallet_initialized");
  } catch (e) {
    return { ok: false, error: e?.message || String(e), logs };
  }

  // registerSparkWalletInstance(mnemonic, wallet);

  // const tokenParams = { ...DEFAULT_ISSUER_TOKEN, ...(options.token || {}) };

  let tokenIdentifier;
  try {
    const existing = await wallet.getIssuerTokenIdentifiers();
    if (existing?.length) {
      tokenIdentifier = existing[0];
      logs.push(`issuer_token_reuse:${String(tokenIdentifier)}`);
    } else {
      const created = await wallet.createToken({
        tokenName: tokenParams.tokenName,
        tokenTicker: tokenParams.tokenTicker,
        decimals: tokenParams.decimals,
        isFreezable: tokenParams.isFreezable,
        maxSupply: tokenParams.maxSupply ?? 0n,
        returnIdentifierForCreate: true,
      });
      tokenIdentifier = created.tokenIdentifier;
      logs.push(`create_token:${created.transactionHash}`);
    }
  } catch (e) {
    return { ok: false, error: e?.message || String(e), logs };
  }

  // const liquidity = mergeInitialLiquidity(options);
  // let mintAmount =
  //   options.mintTokenAmount !== undefined && options.mintTokenAmount !== null
  //     ? options.mintTokenAmount
  //     : liquidity.assetAAmount;
  // if (typeof mintAmount === "number") {
  //   mintAmount = BigInt(Math.floor(mintAmount));
  // } else if (typeof mintAmount === "string") {
  //   mintAmount = BigInt(mintAmount.trim());
  // }

  try {
    await wallet.mintTokens({
      tokenIdentifier,
      tokenAmount: mintAmount,
    });
    logs.push(`mint_tokens:${mintAmount.toString()}`);
  } catch (e) {
    return { ok: false, error: e?.message || String(e), logs };
  }

  // const assetAHex = tokenIdentifierToFlashnetHex(tokenIdentifier);

  // const bal = await getSparkBalance(mnemonic);
  // const btcSats = bal?.didWork ? Number(bal.balance) || 0 : 0;
  // if (btcSats <= 0) {
  //   let depositAddress;
  //   try {
  //     depositAddress = await getSparkStaticBitcoinL1Address(mnemonic);
  //   } catch {
  //     /* ignore */
  //   }
  //   return {
  //     ok: false,
  //     error: "zero_btc_balance",
  //     depositAddress,
  //     logs: [
  //       ...logs,
  //       "Regtest Spark BTC balance is 0 — fund this wallet before creating a pool (asset B is BTC).",
  //     ],
  //   };
  // }
  // logs.push(`btc_balance_sats:${btcSats}`);

  // const flashnetOk = await initializeFlashnet(mnemonic);
  // if (!flashnetOk) {
  //   return { ok: false, error: "initializeFlashnet failed", logs };
  // }
  // logs.push("flashnet_initialized");

  // let client;
  // try {
  //   client = getFlashnetClient(mnemonic);
  // } catch (e) {
  //   return { ok: false, error: e?.message || String(e), logs };
  // }

  // let identityPk;
  // try {
  //   identityPk = await wallet.getIdentityPublicKey();
  // } catch (e) {
  //   return { ok: false, error: e?.message || String(e), logs };
  // }

  // let hostNamespace;
  // try {
  //   hostNamespace = await ensureFlashnetHostNamespace(
  //     client,
  //     options,
  //     logs,
  //     identityPk,
  //   );
  // } catch (e) {
  //   return {
  //     ok: false,
  //     error: `Flashnet host: ${e?.message || String(e)}`,
  //     logs,
  //   };
  // }

  // const ASSET_B = BTC_ASSET_ADDRESS;

  let existing;
  try {
    existing = await client.listPools({
      assetAAddress: assetAHex,
      assetBAddress: ASSET_B,
      sort: "TVL_DESC",
      minTvl: 0,
      limit: 5,
    });
    if (!existing?.pools?.length) {
      existing = await client.listPools({
        assetAAddress: ASSET_B,
        assetBAddress: assetAHex,
        sort: "TVL_DESC",
        minTvl: 0,
        limit: 5,
      });
    }
  } catch (e) {
    return { ok: false, error: `listPools: ${e?.message || e}`, logs };
  }

  if (existing?.pools?.length > 0) {
    const poolId = existing.pools[0].poolId;
    console.log("[regtestPoolSetup] Pool already exists:", poolId);
    return {
      ok: true,
      skipped: true,
      reason: "pool_exists",
      poolId,
      assetAHex,
      hostNamespace,
      logs: [...logs, `existing_pool:${poolId}`],
    };
  }

  try {
    // Create pool without initial liquidity: bundled addInitialLiquidity uses
    // `response.poolId` only; some API responses use `pool_id`, leaving `poolId`
    // undefined and causing encodeSparkAddressNew(undefined) → "reading 'length'".
    const poolResponse = await client.createConstantProductPool({
      assetAAddress: assetAHex,
      assetBAddress: ASSET_B,
      lpFeeRateBps: LP_FEE_BPS,
      totalHostFeeRateBps: TOTAL_HOST_FEE_BPS,
      hostNamespace,
    });
    const poolId = poolResponse.poolId ?? poolResponse.pool_id;
    if (!poolId) {
      return {
        ok: false,
        error: "Pool created but response had no poolId / pool_id",
        logs: [...logs, `raw_response:${JSON.stringify(poolResponse)}`],
        assetAHex,
        hostNamespace,
      };
    }
    logs.push(`pool_created:${poolId}`);

    const addLiquidityRes = await client.addLiquidity({
      poolId,
      assetAAmount: liquidity.assetAAmount.toString(),
      assetBAmount: liquidity.assetBAmount.toString(),
      assetAMinAmountIn: liquidity.assetAMinAmountIn.toString(),
      assetBMinAmountIn: liquidity.assetBMinAmountIn.toString(),
    });
    logs.push(`pool_initial_liquidity:${addLiquidityRes.accepted ?? "ok"}`);

    console.log(
      "[regtestPoolSetup] Pool created:",
      poolId,
      poolResponse.message,
    );
    return {
      ok: true,
      skipped: false,
      poolId,
      message: poolResponse.message,
      assetAHex,
      hostNamespace,
      logs,
    };
  } catch (e) {
    const err = e?.message || String(e);
    console.error("[regtestPoolSetup] createConstantProductPool failed:", err);
    return { ok: false, error: err, logs, assetAHex, hostNamespace };
  }
}
