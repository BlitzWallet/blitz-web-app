export default async function copyToClipboard(data, openOverlay, location) {
  try {
    await navigator.clipboard.writeText(data);
    // alert("Copied to clipboard!");
    openOverlay({
      for: "error",
      errorMessage: "Copied to clipboard!",
    });
  } catch (err) {
    console.error("Failed to copy: ", err);
    openOverlay({
      for: "error",
      errorMessage: "Error with copy.",
    });
  }
}
