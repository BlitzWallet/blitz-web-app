<img src=".github/assets/images/wordmark.png" alt="Project Logo" width="100%">

---

Blitz Wallet Web App is a React application that allows users to interact with the Bitcoin Lightning Network in a self-custodial way. By using Spark, we aim to create a seamless and simple payment experience to instantly show anyone how easy it is to use the Bitcoin network for payments.

---

⚠️ This is a SELF-CUSTODIAL Bitcoin Lightning wallet. We do not have access to your seed phrase or funds. If you lose your seed phrase, access to your funds will be lost. Also, do not share your seed phrase with anyone. If you do, they will be able to steal your funds.

## Features

- Send Bitcoin payments
  - From camera
  - From clipboard
- Receive Bitcoin payments
  - Using a Lightning QR code
  - Using a Spark QR code
- Wallet recovery

## TODO

- [x] Send / Receive Bitcoin payments
- [x] LNURL
- [x] Dark modes
- [x] Fiat currencies
- [x] Blitz Contacts
- [ ] Store items
- [x] Match Blitz Mobile settings options
- [x] More send options (from image, manual input, from contacts)
- [x] Liquid receive option

## Contribute

We rely on GitHub for bug tracking. Before reporting a new bug, please take a moment to search the <a href='https://github.com/BlitzWallet/BlitzWallet/issues'>existing issues</a> to see if your problem has already been addressed. If you can't find an existing report, feel free to create a new issue.

Moreover, we encourage contributions to the project by submitting pull requests to improve the codebase or introduce new features. All pull requests will be thoroughly reviewed by members of the Blitz team. Your contributions are invaluable to us!

## Build

To run the project locally, follow these steps:

1. **Clone the repository**

   ```bash
   git clone https://github.com/BlitzWallet/blitz-web-app
   cd blitz-web-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn
   ```

3. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Environment setup**

   ```bash
   cp .env.example .env
   ```

   Go to the Firebase console for your Blitz Wallet project. In the left-hand navigation, expand the Build section and click on Authentication. Go to the Sign-in method tab. Find Anonymous in the list of sign-in providers and click the pencil icon to edit it. Toggle the Enable switch to turn on Anonymous sign-in. Click Save.

## Running Firebase Emulators Locally

To test Firebase Functions (e.g. `customToken`, `serverTime`, `bitcoinPriceData`) locally without deploying, use the Firebase emulator suite.

### Prerequisites

- **Java 21+** — required by the Firestore emulator

  ```bash
  java -version
  # If below 21:
  sudo apt-get install -y openjdk-21-jdk
  ```

- **Firebase CLI** — install globally if you haven't already

  ```bash
  npm install -g firebase-tools
  firebase login
  ```

### Setup

1. **Generate a backend keypair** (if you haven't already)

   ```bash
   node scripts/gen-backend-keypair.mjs
   ```

   This prints a private key and a public key.

2. **Set the backend private key** for the Functions emulator by creating `functions/.env`:

   ```env
   BACKEND_PRIVATE_KEY=<64-char hex private key from step 1>
   ```

3. **Set the backend public key** in your root `.env`:

   ```env
   VITE_BACKEND_PUB_KEY=<66-char hex public key from step 1>
   ```

4. **Enable emulators** in your root `.env`:

   ```env
   MODE=development
   ```

5. **Install Functions dependencies**

   ```bash
   cd functions && npm install && cd ..
   ```

### Running

Start all three emulators (Auth, Functions, and Firestore must run together):

```bash
firebase emulators:start --only auth,functions,firestore
```

You should see all three listed:

| Emulator  | Host:Port      |
| --------- | -------------- |
| Auth      | 127.0.0.1:9099 |
| Functions | 127.0.0.1:5001 |
| Firestore | 127.0.0.1:8080 |

Then in a separate terminal, start the dev server:

```bash
npm run dev
```

### Why all three emulators?

- **Auth** — `admin.auth().createCustomToken()` needs the Auth emulator to sign tokens locally (otherwise it tries to call Google IAM and fails with a permission error).
- **Functions** — runs your Cloud Functions (`customToken`, `serverTime`, etc.) locally.
- **Firestore** — Auth emulator tokens are only valid against other emulators. Production Firestore rejects them, so the Firestore emulator is needed too.

## Architecture

### Overview

Blitz Web App is a **self-custodial** Bitcoin Lightning wallet built as a React SPA. It uses **Firebase** for auth, user data, and server-side callable functions; **Spark SDK** for Lightning/Spark wallet operations; and **Breez Liquid SDK** for Liquid network and swaps. All backend calls from the client are **encrypted** (ECDH + AES-CBC) so only the backend can read them.

### High-level flow

1. User creates/restores a wallet (mnemonic) and sets a password; the app derives keys from the mnemonic.
2. On login, the app signs in **anonymously** to Firebase, then calls the **customToken** Cloud Function with an encrypted payload. The backend verifies the anonymous UID, creates a Firebase custom token (uid = client public key), and returns it encrypted. The client signs in with that token so all Firestore/Storage access is scoped to that identity.
3. User data (settings, contacts, preferences) is loaded from **Firestore** and merged with local defaults in **initializeUserSettings**.
4. The **Spark SDK** is initialized with the mnemonic; balance, address, and transactions are managed via Spark and cached in IndexedDB/local state.
5. Optional: **Breez Liquid SDK** connects for Liquid swaps and LNURL pay/withdraw. Fiat prices come from the **bitcoinPriceData** callable (CoinGecko). Server time sync uses the **serverTime** callable.

### Frontend

- **Stack:** React 19, Vite 6, React Router 7, Framer Motion.
- **State:** React Context for global state (auth, keys, theme, Spark wallet, contacts, app status, server time, etc.). No Redux.
- **Routing:** Declared in `src/routes.jsx` with lazy-loaded pages and animation configs; bottom tabs for main wallet/settings flows.
- **Entry:** `src/main.jsx` mounts a deep provider tree (Auth → Keys → GlobalContext → SparkWallet → … → Routes) and an `AuthGate` that redirects unauthenticated users to login.

### Firebase layer

- **Auth:** Anonymous sign-in first; then custom token sign-in (uid = client public key) so Firestore/Storage rules can scope by that uid.
- **Firestore:** User document at `blitzWalletUsers/{uid}`; subcollections for LNURL payments, etc. Read/write via `db/index.js` (`getDataFromCollection`, `addDataToCollection`, etc.).
- **Functions:** Callable HTTPS functions (v2) in `functions/index.js`:
  - **customToken** — Verifies anonymous auth, decrypts payload, creates custom token (uid = client public key), returns encrypted token.
  - **serverTime** — Returns current server timestamp, encrypted.
  - **bitcoinPriceData** — Decrypts `currencyCode`, fetches BTC price from CoinGecko, returns encrypted price + 24h change.
- **Storage:** Profile pictures under `profile_pictures/`; CORS must be set on the bucket for browser fetches.

### Backend–client crypto

- **Key agreement:** Client has a keypair derived from the mnemonic (secp256k1); backend has its own keypair. Shared secret = ECDH(client private, backend public) = ECDH(backend private, client public).
- **Payload format:** Request body is `{ em: encryptedMessage, publicKey }`. Response is either `{ token: encryptedToken }` (customToken) or an encrypted string. Encryption: AES-CBC with IV, format `base64(ciphertext)?iv=base64(iv)`.
- **Client:** `db/handleBackend.js` uses `src/functions/encodingAndDecoding.js` to encrypt/decrypt; normalizes backend public key (64 hex, no 02/03 prefix) before calling encoding. Calls `httpsCallable(functions, method)({ em, publicKey })`.
- **Backend:** `functions/cryptoHelpers.js` mirrors the same ECDH + AES-CBC scheme; `getBackendPrivateKey()` reads from env or Firebase config.

### Wallet and keys

- **Keys:** Mnemonic → BIP39 seed → secp256k1 keypair; public key is the Firebase uid after custom token sign-in. Stored keys (e.g. contacts private key) are derived/retrieved via `src/functions/seed.js` and `src/contexts/keysContext.jsx`.
- **Spark:** `@buildonspark/spark-sdk` in `src/functions/spark/`. Initialized with mnemonic; provides balance, Spark address, identity pubkey, transactions, and payment APIs. State is held in `sparkContext.jsx` and persisted/cached where needed.
- **Liquid:** `@breeztech/breez-sdk-liquid` in `src/functions/connectToLiquid.js` and `src/functions/breezLiquid/` for Liquid node and LNURL pay/withdraw.

### Key directories

| Path | Purpose |
|------|--------|
| `src/` | React app: `main.jsx`, routes, pages, components, contexts. |
| `src/contexts/` | Global state providers (auth, keys, Spark, theme, server time, contacts, etc.). |
| `src/functions/` | Client-side logic: Spark, Breez Liquid, encoding, seed, messaging, send/receive. |
| `db/` | Firebase glue: `initializeFirebase.js`, `handleBackend.js`, Firestore helpers in `index.js`. |
| `functions/` | Cloud Functions (Node): `index.js` (customToken, serverTime, bitcoinPriceData), `cryptoHelpers.js`. |
| `scripts/` | e.g. `gen-backend-keypair.mjs` for backend ECDH keypair. |

## Documentation

*Coming soon…*

## Deployment

*Coming soon…*

## License

Blitz Web App is released under the terms of the Apache 2.0 license. See LICENSE for more information.
