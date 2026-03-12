import * as secp256k1 from "@noble/secp256k1";

async function main() {
  const privateKeyBytes = secp256k1.utils.randomPrivateKey();
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, true); // compressed

  const privateKeyHex = Buffer.from(privateKeyBytes).toString("hex");
  const publicKeyHex = Buffer.from(publicKeyBytes).toString("hex");

  console.log("PRIVATE KEY (backend only, KEEP SECRET):");
  console.log(privateKeyHex);
  console.log("");
  console.log("PUBLIC KEY (put into VITE_BACKEND_PUB_KEY in your .env):");
  console.log(publicKeyHex);
}

main().catch((err) => {
  console.error("Error generating keypair:", err);
  process.exit(1);
});

