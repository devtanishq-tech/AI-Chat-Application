import "./SidebarMain.css";
import { useContext, useEffect } from "react";
import axios from "axios";
import { MyContext } from "./Mycontext";
import { v4 as uuidv4 } from "uuid";

export default function SidebarMain({ isOpen, onClose, isAuthenticated }) {
  const {
    allthread,
    setallthread,
    currentID,
    setcurrentID,
    setprompt,
    setreply,
    setnewChat,
    setprevChats,
  } = useContext(MyContext);

  // ---- Open a specific thread --------------------------------
  const openSpecificData = async (threadID) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/chat/thread/${threadID},`,
        { withCredentials: true },
      );
      const specificChat = res.data.messages;
      setreply(null);
      setprevChats(specificChat);
      setnewChat(false);
      setcurrentID(threadID);
      // Close mobile sidebar after selecting a thread
      if (onClose) onClose();
    } catch (err) {
      console.log("Error loading thread:", err);
    }
  };

  // ---- Start a new chat --------------------------------------
  const newChatFunction = () => {
    setnewChat(true);
    setprompt("");
    setreply(null);
    setcurrentID(uuidv4());
    setprevChats([]);
    if (onClose) onClose();
  };

  // ---- Fetch all threads when currentID changes --------------
  const getAllthread = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/chat/thread`,
        { withCredentials: true },
      );
      const dataneeded = response.data.map((t) => ({
        threadId: t.threadId,
        title: t.title,
      }));
      setallthread(dataneeded);
    } catch (err) {
      console.log("Error fetching threads:", err);
    }
  };
  //=============================Delete Function //=========================
  const handleDelete = async (threadId) => {
    let dThread = await axios.delete(
      `${import.meta.env.VITE_BACKEND_URL}/chat/thread/${threadId}`,
      { withCredentials: true },
    );
    setallthread((prev) =>
      prev.filter((thread) => thread.threadId !== threadId),
    );
    //current id will keep track of current thread session id
    if (threadId === currentID) {
      newChatFunction();
    }
    console.log(dThread);
  };
  //=========================================================================
  useEffect(
    () => {
      if (isAuthenticated) {
        getAllthread();
      } else {
        setallthread([]);
      }
    },
    [currentID],
    isAuthenticated,
  );
  //=============================================================================
  return (
    <>
      {/* ---- Overlay for mobile (tap outside to close) ---- */}
      {/* WHY: a separate overlay div lets us darken the rest of the
          app when the sidebar is open on mobile without disrupting
          the flex layout of .app */}
      <div
        className={`sidebar-overlay ${isOpen ? "overlay-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <section className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        {/* ============ TOP: Logo + New Chat ============ */}
        {/* WHY flex-shrink:0 (in CSS): this section never compresses */}
        <div className="sidebar-top">
          <button className="sidebar-logo-btn" aria-label="ChatGPT home">
            <img src="blacklogo.png" alt="logo" className="logo" />
            <span>ChatGPT</span>
          </button>

          <button
            className="new-chat-btn"
            onClick={newChatFunction}
            title="New Chat"
            aria-label="Start new chat"
          >
            <i className="fa-solid fa-pen-to-square" />
          </button>
        </div>

        {/* ============ MIDDLE: Scrollable Threads ============ */}
        {/* WHY: this is THE fix. flex:1 + min-height:0 in CSS means
            this zone absorbs all remaining height between top and bottom,
            and overflow-y:auto activates scrolling when threads exceed it.
            The bottom .sidebar-bottom section can NEVER be pushed out. */}
        <div
          className="sidebar-threads"
          role="navigation"
          aria-label="Chat history"
        >
          {allthread.length === 0 ? (
            <p
              style={{
                padding: "16px 12px",
                fontSize: "13px",
                color: "rgba(255,255,255,0.25)",
                textAlign: "center",
              }}
            >
              No conversations yet
            </p>
          ) : (
            <>
              <div className="thread-section-label">Conversations</div>
              <ul className="history">
                {allthread.map((current, idx) => (
                  <li
                    key={idx}
                    onClick={() => openSpecificData(current.threadId)}
                    className={currentID === current.threadId ? "active" : ""}
                    title={current.title}
                  >
                    {current.title}
                    <i
                      onClick={() => handleDelete(current.threadId)}
                      className="fa-solid fa-trash"
                    ></i>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ============ BOTTOM: User Profile ============ */}
        {/* WHY flex-shrink:0 (in CSS): this is what was escaping
            the viewport. Now it is permanently anchored at the bottom
            of the flex column regardless of how many threads exist. */}
        <div className="sidebar-bottom">
          <div
            className="sign"
            role="button"
            tabIndex={0}
            aria-label="User profile"
          >
            <div className="sign-avatar">
              <i className="fa-solid fa-user" />
            </div>
            <p>Tanishq ♥</p>
          </div>
        </div>
      </section>
    </>
  );
}
