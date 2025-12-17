<img src=".github/assets/images/wordmark.png" alt="Project Logo" width="100%">

<hr/>

Blitz Wallet Web App is a React application that allows users to interact with the Bitcoin Lighting Network in a self-custodial way. By using Spark, we aim to create a seamless and simple payment experience to intantly show anyone how easy it is to use the Bitcoin network for payments.

<hr>

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
- [ ] Blitz Contacts
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
2. **Install deendencies**
   ```
   npm install
   # or
   yarn
   ```
3. **Start the development server**
   ```
   npm run dev
    # or
    yarn dev
   ```

## License

Blitz Web App is released under the terms of the Apache 2.0 license. See LICENSE for more information.
