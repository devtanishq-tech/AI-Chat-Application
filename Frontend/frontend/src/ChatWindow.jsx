import "./ChatWindow.css";
import Chat from "./Chat";
import axios from "axios";
import { MyContext } from "./Mycontext";
import { useContext, useRef } from "react";

export default function ChatWindow({ onOpenSidebar }) {
  const {
    prompt,
    setprompt,
    setreply,
    currentID,
    loading,
    setloading,
    prevChats,
    setprevChats,
    setnewChat,
    setstopGeneration,
  } = useContext(MyContext);

  const controllerRef = useRef(null);

  // ---- Input change ----------------------------------------
  const onchange = (e) => setprompt(e.target.value);

  // ---- Send message ----------------------------------------
  const handleClick = async () => {
    if (!prompt.trim()) return;

    setprevChats((prev) => [...prev, { content: prompt, role: "user" }]);
    setloading(true);

    controllerRef.current = new AbortController();

    try {
      const res = await axios.post(
        "http://localhost:8080/chat/ai",
        { threadID: currentID, message: prompt },
        { signal: controllerRef.current.signal },
      );

      const aiReply = res.data.reply;

      setprevChats((prev) => [
        ...prev,
        { content: aiReply, role: "assistant" },
      ]);

      setreply(aiReply);
      setprompt("");
      setnewChat(false);
    } catch (err) {
      if (err.name === "CanceledError") {
        console.log("Generation stopped by user");
      } else {
        console.error(err);
      }
    } finally {
      setloading(false);
    }
  };

  // ---- Stop generation ------------------------------------
  const stopResponse = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setloading(false);
    setstopGeneration(true);
  };

  return (
    <section className="chatWindow">
      {/* ============ NAVBAR ============ */}
      {/* WHY flex-shrink:0 in CSS: the navbar never compresses.
          It always stays visible at the top of the chat window. */}
      <div className="navbarr">
        {/* Hamburger — only visible on mobile (display:none on desktop via CSS) */}
        <div className="nav-left">
          <button
            className="hamburger-btn"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <span>
            ChatGPT <i className="fa-solid fa-chevron-down" />
          </span>
        </div>

        <div className="nav-right">
          <button className="share-btn" aria-label="Share conversation">
            <i className="fa-solid fa-arrow-up-from-bracket" />
            <span>Share</span>
          </button>

          <button className="icon-btn" aria-label="More options">
            <i className="fa-solid fa-ellipsis" />
          </button>

          <div className="userIconnDiv">
            <span className="userIcon" role="img" aria-label="User avatar">
              <i className="fa-solid fa-user" />
            </span>
          </div>
        </div>
      </div>

      {/* ============ MESSAGES ============ */}
      {/* WHY: Chat is a flex:1 child — it grows to fill all space
          between navbar and bottomSection. Scroll lives inside Chat.css. */}
      <Chat />

      {/* ============ BOTTOM INPUT ============ */}
      {/* WHY flex-shrink:0 in CSS: input bar never scrolls away.
          No position:fixed needed — the flex column keeps it anchored. */}
      <div className="bottomSection">
        <div className="chatInput">
          <div className="input-container">
            <button className="add-btn" aria-label="Attach file">
              <i className="fa-solid fa-plus" />
            </button>

            <input
              value={prompt}
              onChange={onchange}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleClick()
              }
              placeholder="Ask anything..."
              aria-label="Chat input"
            />

            <button className="mic-btn" aria-label="Voice input">
              <i className="fa-solid fa-microphone" />
            </button>

            {loading ? (
              <button
                onClick={stopResponse}
                className="stop-btn"
                aria-label="Stop generation"
              >
                <i className="fa-solid fa-stop" />
              </button>
            ) : (
              <button
                onClick={handleClick}
                className="send-btn"
                aria-label="Send message"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            )}
          </div>
        </div>

        <p className="info">
          ChatGPT can make mistakes. Check important info.{" "}
          <a tabIndex={0} role="button">
            Cookie Preferences.
          </a>
        </p>
      </div>
    </section>
  );
}
