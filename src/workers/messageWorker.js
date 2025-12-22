import { decryptMessage } from "../functions/encodingAndDecoding";

self.onmessage = async function (e) {
  const { type, data } = e.data;

  if (type === "PROCESS_MESSAGES") {
    const { allMessages, myPubKey, privateKey } = data;
    const processedMessages = [];

    for (let i = 0; i < allMessages.length; i++) {
      const message = allMessages[i];

      // Send progress updates every 10 messages
      if (i % 10 === 0) {
        self.postMessage({
          type: "PROGRESS",
          current: i,
          total: allMessages.length,
        });
      }

      try {
        const isReceived = message.toPubKey === myPubKey;

        if (typeof message.message === "string") {
          const sendersPubkey =
            message.toPubKey === myPubKey
              ? message.fromPubKey
              : message.toPubKey;

          const decoded = await decryptMessage(
            privateKey,
            sendersPubkey,
            message.message
          );

          if (!decoded) continue;

          let parsedMessage;
          try {
            parsedMessage = JSON.parse(decoded);
          } catch (err) {
            console.log("error parsing decoded message", err);
            continue;
          }

          processedMessages.push({
            ...message,
            message: parsedMessage,
            sendersPubkey,
            isReceived,
          });
        } else {
          processedMessages.push(message);
        }
      } catch (err) {
        console.log("error decoding incoming request from history");
      }
    }

    // Send completed result
    self.postMessage({
      type: "COMPLETE",
      data: processedMessages,
    });
  }
};
