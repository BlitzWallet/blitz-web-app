const SERVER_URL = "https://api.thebitcoincompany.com";

export default async function getGiftCardsList() {
  try {
    const response = await fetch(`${SERVER_URL}/giftcards`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: {
        giftCards: data.result.svs,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      body: {
        error: "Error getting options",
      },
    };
  }
}
