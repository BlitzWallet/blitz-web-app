import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Menu,
  ChevronUp,
  Bot,
} from "lucide-react";

import ThemeText from "../../../../components/themeText/themeText";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import useThemeColors from "../../../../hooks/useThemeColors";
import { useThemeContext } from "../../../../contexts/themeContext";
import { useGlobalAppData } from "../../../../contexts/appDataContext";
import { useKeysContext } from "../../../../contexts/keysContext";
import { useNodeContext } from "../../../../contexts/nodeContext";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import { useToast } from "../../../../contexts/toastManager";

import fetchBackend from "../../../../../db/handleBackend";
import customUUID from "../../../../functions/customUUID";
import saveChatGPTChat from "./functions/saveChat";
import { AI_MODEL_COST } from "./constants/AIModelCost";
import { getModels } from "./functions/getModels";
import ExampleGPTSearchCard from "./exampleSearchCards";
import ConfirmLeaveChat from "./components/confirmLeaveChat";
import SwitchModel from "./components/switchModel";

import "./style.css";
import AddChatGPTCredits from "./addCredits/addCredits";
import BackArrow from "../../../../components/backArrow/backArrow";
import { Colors } from "../../../../constants/theme";

const SATSPERBITCOIN = 100000000;
const ONEMILLION = 1000000;

const ChatMessage = ({
  item,
  onCopy,
  onEdit,
  backgroundOffset,
  textColor,
  t,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="chatMessage-container">
      <div className="chatMessage-header">
        <div
          className="chatMessage-avatar"
          style={{ backgroundColor: backgroundOffset }}
        >
          {item.role === "user" ? (
            <span className="chatMessage-avatarText">B</span>
          ) : (
            <Bot size={15} color={textColor} />
          )}
        </div>
        <ThemeText
          textContent={
            item.role === "user"
              ? t("apps.chatGPT.chatGPTHome.youText")
              : item?.responseBot || "ChatGPT"
          }
          textStyles={{ fontWeight: 500, margin: 0 }}
        />
        <button
          className="chatMessage-menuBtn"
          onClick={() => setMenuOpen((v) => !v)}
        >
          &#8942;
        </button>
        {menuOpen && (
          <div
            className="chatMessage-dropdown"
            style={{ backgroundColor: backgroundOffset }}
          >
            <button
              onClick={() => {
                onCopy(item.content);
                setMenuOpen(false);
              }}
            >
              {t("constants.copy")}
            </button>
            <button
              onClick={() => {
                onEdit(item.content);
                setMenuOpen(false);
              }}
            >
              {t("constants.edit")}
            </button>
          </div>
        )}
      </div>
      <div className="chatMessage-body">
        {item.content ? (
          <ThemeText
            textContent={item.content}
            textStyles={{
              color:
                item.content.toLowerCase() ===
                t("errormessages.requestError").toLowerCase()
                  ? "#e20000"
                  : textColor,
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          />
        ) : (
          <FullLoadingScreen showText={false} size="small" />
        )}
      </div>
    </div>
  );
};

export default function ChatGPTHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { fiatStats } = useNodeContext();
  const { theme, darkModeType } = useThemeContext();
  const { textColor, backgroundOffset, backgroundColor } = useThemeColors();
  const {
    decodedChatGPT,
    toggleGlobalAppDataInformation,
    globalAppDataInformation,
  } = useGlobalAppData();
  const { globalContactsInformation } = useGlobalContacts();

  const chatHistoryFromProps = location.state?.chatHistory;

  const scrollContainerRef = useRef(null);

  const [chatHistory, setChatHistory] = useState({
    conversation: [],
    uuid: "",
    lastUsed: "",
    firstQuery: "",
  });
  const [newChats, setNewChats] = useState([]);
  const [model, setSearchModel] = useState(
    () =>
      AI_MODEL_COST.find((m) => m.shortName === "gpt-4o") || AI_MODEL_COST[0],
  );
  const [userChatText, setUserChatText] = useState("");
  const [showScrollBottomIndicator, setShowScrollBottomIndicator] =
    useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [showSwitchModel, setShowSwitchModel] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  const totalAvailableCredits = decodedChatGPT?.credits || 0;

  const conjoinedLists = useMemo(
    () => [...chatHistory.conversation, ...newChats],
    [chatHistory.conversation, newChats],
  );

  useEffect(() => {
    if (!chatHistoryFromProps) return;
    setChatHistory(JSON.parse(JSON.stringify(chatHistoryFromProps)));
  }, [chatHistoryFromProps]);

  useEffect(() => {
    getModels().then((freshModels) => {
      setSearchModel((current) => {
        const updated = freshModels.find((m) => m.id === current.id);
        return updated || freshModels[0];
      });
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conjoinedLists.length]);

  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottomIndicator(distFromBottom > 80);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  const handleCopy = useCallback(
    (content) => {
      navigator.clipboard.writeText(content).then(() => {
        showToast({ type: "clipboard", title: "constants.copy" });
      });
    },
    [showToast],
  );

  const handleEdit = useCallback((content) => {
    setUserChatText(content);
  }, []);

  const performSaveChat = useCallback(() => {
    saveChatGPTChat({
      contactsPrivateKey,
      globalAppDataInformation,
      chatHistory,
      newChats,
      toggleGlobalAppDataInformation,
      navigate,
      errorMessage: t("apps.chatGPT.saveChat.errorMessage"),
    });
  }, [
    contactsPrivateKey,
    globalAppDataInformation,
    chatHistory,
    newChats,
    toggleGlobalAppDataInformation,
    navigate,
    t,
  ]);

  const closeChat = useCallback(() => {
    console.log(newChats, "new chats");
    if (newChats.length === 0) {
      navigate("/store");
      return;
    }
    setShowConfirmLeave(true);
  }, [newChats.length, navigate]);

  const getChatResponse = useCallback(
    async (userChatObject, filteredModel) => {
      try {
        const tempArr = [...conjoinedLists, userChatObject];
        const requestData = {
          aiRequest: {
            model: filteredModel.id,
            messages: tempArr,
          },
          requestAccount: globalContactsInformation?.myProfile?.uuid,
        };

        const response = await fetchBackend(
          "generativeAIV3",
          requestData,
          contactsPrivateKey,
          publicKey,
        );

        if (!response) throw new Error("Unable to finish request");

        const [textInfo] = response.choices;
        const satsPerDollar = SATSPERBITCOIN / (fiatStats?.value || 60000);

        const price =
          (filteredModel.inputPrice / ONEMILLION) *
            response.usage.prompt_tokens +
          (filteredModel.outputPrice / ONEMILLION) *
            response.usage.completion_tokens;

        const apiCallCost = price * satsPerDollar;
        const blitzCost = Math.ceil(apiCallCost + 25);
        const newCredits = totalAvailableCredits - blitzCost;

        setNewChats((prev) => {
          const tempArr = [...prev];
          const oldItem = tempArr.pop();
          return [
            ...tempArr,
            {
              ...oldItem,
              content: textInfo.message.content,
              role: textInfo.message.role,
              responseBot: filteredModel.name,
            },
          ];
        });

        toggleGlobalAppDataInformation(
          {
            chatGPT: {
              conversation:
                globalAppDataInformation?.chatGPT?.conversation || [],
              credits: newCredits,
            },
          },
          true,
        );
      } catch (err) {
        console.log("Error with chatGPT request", err);
        setNewChats((prev) => {
          const tempArr = [...prev];
          const oldItem = tempArr.pop();
          return [
            ...tempArr,
            {
              ...oldItem,
              role: "assistant",
              content: t("errormessages.requestError"),
              responseBot: filteredModel.name,
            },
          ];
        });
      }
    },
    [
      conjoinedLists,
      globalContactsInformation?.myProfile?.uuid,
      contactsPrivateKey,
      publicKey,
      fiatStats?.value,
      totalAvailableCredits,
      toggleGlobalAppDataInformation,
      globalAppDataInformation?.chatGPT?.conversation,
      t,
    ],
  );

  const submitChatMessage = useCallback(
    async (forcedText) => {
      const trimmedText =
        typeof forcedText === "string"
          ? forcedText.trim()
          : userChatText.trim();
      if (!trimmedText) return;

      if (totalAvailableCredits < 30) {
        showToast({
          type: "error",
          title: "apps.chatGPT.chatGPTHome.noAvailableCreditsError",
        });
        return;
      }

      if (!model) return;

      const currentTime = new Date();
      const userChatObject = {
        content: trimmedText,
        role: "user",
        time: currentTime,
        uuid: customUUID(),
      };

      const GPTChatObject = {
        role: "assistant",
        responseBot: model.name,
        content: "",
        time: currentTime,
        uuid: customUUID(),
      };

      setNewChats((prev) => [...prev, userChatObject, GPTChatObject]);
      setUserChatText("");
      getChatResponse(userChatObject, model);
    },
    [totalAvailableCredits, model, userChatText, showToast, getChatResponse],
  );

  const hasNoChats = conjoinedLists.length === 0;
  const showExampleCards =
    chatHistory.conversation.length === 0 &&
    userChatText.length === 0 &&
    newChats.length === 0;

  const conversationHistory = decodedChatGPT?.conversation || [];

  if (totalAvailableCredits < 30) {
    return <AddChatGPTCredits />;
  }

  return (
    <div className="chatgpt-root" style={{ backgroundColor }}>
      {/* Top bar */}
      <div className="chatgpt-topBar">
        <button className="chatgpt-iconBtn">
          <BackArrow backFunction={closeChat} />
        </button>

        <button
          className="chatgpt-modelBtn"
          style={{ backgroundColor: backgroundOffset }}
          onClick={() => setShowSwitchModel(true)}
        >
          <ThemeText
            textContent={model?.name || model?.id}
            textStyles={{
              fontSize: "16px",
              marginRight: "4px",
              margin: 0,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          />
          <ChevronUp size={18} color={textColor} />
        </button>

        <button
          className="chatgpt-iconBtn"
          onClick={() => setShowHistorySidebar(true)}
        >
          <Menu
            size={30}
            color={
              theme && darkModeType ? Colors.dark.text : Colors.constants.blue
            }
          />
        </button>
      </div>

      {/* Credits */}
      <ThemeText
        textContent={t("apps.chatGPT.chatGPTHome.availableCredits", {
          credits: Number(totalAvailableCredits).toFixed(2),
        })}
        textStyles={{
          textAlign: "center",
          fontSize: "13px",
          margin: "0 0 4px",
        }}
      />

      {/* Message area */}
      <div className="chatgpt-messageArea">
        {hasNoChats ? (
          <div className="chatgpt-emptyState">
            <div
              className="chatgpt-emptyLogo"
              style={{ backgroundColor: theme ? "#ffffff" : "#E3E3E3" }}
            >
              <span className="chatgpt-emptyLogoText">B</span>
            </div>
          </div>
        ) : (
          <div className="chatgpt-scrollWrapper">
            <div
              className="chatgpt-scrollContainer"
              ref={scrollContainerRef}
              onScroll={handleScroll}
            >
              {conjoinedLists.map((item) => (
                <ChatMessage
                  key={item.uuid}
                  item={item}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  backgroundOffset={backgroundOffset}
                  textColor={textColor}
                  t={t}
                />
              ))}
            </div>
            {showScrollBottomIndicator && (
              <button
                className="chatgpt-scrollBottomBtn"
                style={{ backgroundColor: backgroundOffset }}
                onClick={scrollToBottom}
              >
                <ArrowDown size={18} color={textColor} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Example cards */}
      {showExampleCards && (
        <ExampleGPTSearchCard submitChatMessage={submitChatMessage} />
      )}

      {/* Input bar */}
      <div className="chatgpt-inputBar">
        <textarea
          className="chatgpt-textarea"
          style={{ color: textColor, borderColor: textColor }}
          placeholder={t("apps.chatGPT.chatGPTHome.inputPlaceholder", {
            gptName: model?.name || model?.id,
          })}
          value={userChatText}
          onChange={(e) => setUserChatText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (userChatText.trim()) submitChatMessage(userChatText);
            }
          }}
          rows={1}
        />
        <button
          className="chatgpt-sendBtn"
          style={{
            opacity: !userChatText.trim() ? 0.5 : 1,
            backgroundColor: textColor,
          }}
          disabled={!userChatText.trim()}
          onClick={() => submitChatMessage(userChatText)}
        >
          <ArrowUp size={20} color={backgroundColor} />
        </button>
      </div>

      {/* Confirm leave overlay */}
      {showConfirmLeave && (
        <ConfirmLeaveChat
          onSave={() => {
            setShowConfirmLeave(false);
            performSaveChat();
          }}
          onDiscard={() => {
            setShowConfirmLeave(false);
            navigate("/store");
          }}
        />
      )}

      {/* Switch model overlay */}
      {showSwitchModel && (
        <SwitchModel
          onSelectModel={(shortName) => setSearchModel(shortName)}
          onClose={() => setShowSwitchModel(false)}
        />
      )}

      {/* History sidebar */}
      {showHistorySidebar && (
        <div
          className="chatgpt-sidebarOverlay"
          onClick={() => setShowHistorySidebar(false)}
        >
          <div
            className="chatgpt-sidebar"
            style={{ backgroundColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chatgpt-sidebarHeader">
              <ThemeText
                textContent={t("apps.chatGPT.newChat") || "Conversations"}
                textStyles={{ fontWeight: 600, fontSize: "16px", margin: 0 }}
              />
            </div>

            <button
              className="chatgpt-newChatBtn"
              style={{ backgroundColor: backgroundOffset }}
              onClick={() => {
                setChatHistory({
                  conversation: [],
                  uuid: "",
                  lastUsed: "",
                  firstQuery: "",
                });
                setNewChats([]);
                setShowHistorySidebar(false);
              }}
            >
              <ThemeText
                textContent={t("apps.chatGPT.newChat") || "New Chat"}
                textStyles={{ margin: 0 }}
              />
            </button>

            <div className="chatgpt-sidebarList">
              {conversationHistory.length === 0 ? (
                <ThemeText
                  textContent={
                    t("apps.chatGPT.loadingMessage") || "No conversations yet"
                  }
                  textStyles={{
                    textAlign: "center",
                    fontSize: "13px",
                    marginTop: "20px",
                  }}
                />
              ) : (
                conversationHistory.map((conv) => (
                  <button
                    key={conv.uuid}
                    className="chatgpt-historyItem"
                    style={{ backgroundColor: backgroundOffset }}
                    onClick={() => {
                      setChatHistory(JSON.parse(JSON.stringify(conv)));
                      setNewChats([]);
                      setShowHistorySidebar(false);
                    }}
                  >
                    <ThemeText
                      textContent={conv.firstQuery || "Chat"}
                      textStyles={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "14px",
                      }}
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
