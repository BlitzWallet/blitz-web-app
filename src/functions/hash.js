import { SHA256 } from "crypto-js";

export default function sha256Hash(message) {
  try {
    const hash = SHA256(message);
    return hash.toString();
  } catch (err) {
    console.error("Error creating hash:", err);
    return false;
  }
}
