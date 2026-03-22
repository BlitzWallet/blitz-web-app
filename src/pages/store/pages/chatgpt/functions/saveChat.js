import {
  encryptMessage,
  decryptMessage,
} from '../../../../../functions/encodingAndDecoding';
import { getPublicKey } from '../../../../../functions/seed';
import customUUID from '../../../../../functions/customUUID';

export default async function saveChatGPTChat({
  contactsPrivateKey,
  globalAppDataInformation,
  chatHistory,
  newChats,
  toggleGlobalAppDataInformation,
  navigate,
  errorMessage,
}) {
  try {
    const publicKey = getPublicKey(contactsPrivateKey);
    const currentTime = new Date();

    let savedHistory =
      typeof globalAppDataInformation.chatGPT?.conversation === 'string'
        ? [
            ...JSON.parse(
              await decryptMessage(
                contactsPrivateKey,
                publicKey,
                globalAppDataInformation.chatGPT.conversation,
              ),
            ),
          ]
        : [];

    const filteredHistory = savedHistory.find(
      (item) => item.uuid === chatHistory.uuid,
    );

    let newChatHistoryObject = {};

    if (filteredHistory) {
      newChatHistoryObject = { ...filteredHistory };
      newChatHistoryObject['conversation'] = [
        ...filteredHistory.conversation,
        ...newChats,
      ];
      newChatHistoryObject['lastUsed'] = currentTime;
    } else {
      newChatHistoryObject['conversation'] = [
        ...chatHistory.conversation,
        ...newChats,
      ];
      newChatHistoryObject['firstQuery'] = newChats[0]?.content || '';
      newChatHistoryObject['lastUsed'] = currentTime;
      newChatHistoryObject['uuid'] = customUUID();
      savedHistory.push(newChatHistoryObject);
    }

    const newHistory = filteredHistory
      ? savedHistory.map((item) => {
          if (item.uuid === newChatHistoryObject.uuid)
            return newChatHistoryObject;
          else return item;
        })
      : savedHistory;

    const encrypted = await encryptMessage(
      contactsPrivateKey,
      publicKey,
      JSON.stringify(newHistory),
    );

    toggleGlobalAppDataInformation(
      {
        chatGPT: {
          conversation: encrypted,
          credits: globalAppDataInformation.chatGPT?.credits || 0,
        },
      },
      true,
    );

    navigate(-1);
  } catch (err) {
    console.log(err);
    navigate('/wallet', { state: { errorMessage } });
  }
}
