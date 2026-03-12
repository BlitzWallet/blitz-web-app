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

*Coming soon…*

## Documentation

*Coming soon…*

## Deployment

*Coming soon…*

## License

Blitz Web App is released under the terms of the Apache 2.0 license. See LICENSE for more information.
