import "./ChatWindow.css";
import Chat from "./Chat";
import axios from "axios";
import { MyContext } from "./Mycontext";
import { useContext, useRef, useState, useEffect } from "react";
import { Astroid, CircleUser, Settings, LifeBuoy, LogOut } from "lucide-react";

export default function ChatWindow({
  onOpenSidebar,
  isAuthenticated,
  user,
  onLogout,
  onOpenLogin,
  onOpenSignup,
}) {
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
    stopGeneration,
    setstopGeneration,
  } = useContext(MyContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ===================== Mic / Voice =====================
  const recognitionRef = useRef(null);
  const [isListining, setisListining] = useState(false);
  //===========================Auth Error========================
  const [authError, setauthError] = useState(false);
  //=============================================================

  useEffect(() => {
    const spechreco =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!spechreco) {
      console.log("Speech does not Supported");
      return;
    }
    recognitionRef.current = new spechreco();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => setisListining(true);
    recognitionRef.current.onend = () => setisListining(false);

    recognitionRef.current.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setprompt(transcript);
    };
  }, []);

  const handleMic = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.start();
  };

  // ---- Stop listening from the overlay ------------------
  const handleStopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setisListining(false);
  };
  // =======================================================

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const onchange = (e) => setprompt(e.target.value);
  const controllerRef = useRef(null);

  const handleClick = async () => {
    if (!prompt.trim()) return;
    //===========================================
    if (!isAuthenticated) {
      setauthError(true);
      setTimeout(() => {
        setauthError(false);
      }, 5000);
    }
    //============================================

    setprevChats((prev) => [...prev, { content: prompt, role: "user" }]);
    setloading(true);
    controllerRef.current = new AbortController();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/chat/ai`,
        { threadID: currentID, message: prompt },
        { withCredentials: true, signal: controllerRef.current.signal },
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

  const stopResponse = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setloading(false);
    setstopGeneration(false);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <section className="chatWindow">
      {/* ============ NAVBAR ============ */}
      <div className="navbarr">
        <div className="nav-left">
          <button
            className="hamburger-btn"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <span className="nav-brand">
            ChatGPT <i className="fa-solid fa-chevron-down" />
          </span>
        </div>

        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <button className="share-btn" aria-label="Share conversation">
                <i className="fa-solid fa-arrow-up-from-bracket" />
                <span>Share</span>
              </button>
              <button className="icon-btn" aria-label="More options">
                <i className="fa-solid fa-ellipsis" />
              </button>
              <div className="userIconnDiv">
                <span
                  className="userIcon"
                  onClick={toggleDropdown}
                  role="button"
                  aria-label="User menu"
                  aria-expanded={dropdownOpen}
                >
                  <i className="fa-solid fa-user" />
                </span>
                {dropdownOpen && (
                  <div className="dropdownMenu">
                    <p className="username">
                      {user?.userName || user?.email || "User"}
                    </p>
                    <p>
                      <Astroid size={18} />
                      Upgraded Plan
                    </p>
                    <p>
                      <CircleUser size={18} />
                      Personalization
                    </p>
                    <p>
                      <Settings size={18} />
                      Settings
                    </p>
                    <p>
                      <LifeBuoy size={18} />
                      Help
                    </p>
                    <p className="logout-item" onClick={handleLogout}>
                      <LogOut size={18} />
                      Log out
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-nav-buttons">
              <button
                className="nav-login-btn"
                onClick={onOpenLogin}
                aria-label="Log in"
              >
                Log in
              </button>
              <button
                className="nav-signup-btn"
                onClick={onOpenSignup}
                aria-label="Sign up for free"
              >
                Sign up for free
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============ MESSAGES ============ */}
      <Chat />

      {/* ============ VOICE LISTENING OVERLAY ============
          Renders above the bottom input when mic is active.
          Positioned absolute inside .chatWindow (which has position:relative).
          Only mounts when isListining === true.
      ================================================== */}
      {/* =================== Auth flash error //================= */}
      {authError && (
        <div className="auth-error-toast">
          <div className="auth-error-toast__icon">
            <i className="fa-solid fa-lock" />
          </div>

          <div className="auth-error-toast__content">
            <h4>Login Required</h4>
            <p>You must log in to continue chatting.</p>
          </div>

          <button className="auth-error-toast__btn" onClick={onOpenLogin}>
            Log in
          </button>
        </div>
      )}
      {/* ============================================================= */}
      {isListining && (
        <div
          className="voice-overlay"
          role="dialog"
          aria-label="Voice input active"
        >
          {/* Backdrop blur layer */}
          <div className="voice-overlay__backdrop" />

          <div className="voice-overlay__panel">
            {/* ---- Sound-wave bars ---- */}
            <div className="voice-wave" aria-hidden="true">
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
            </div>

            {/* ---- Pulsing mic orb ---- */}
            <div className="voice-orb" aria-hidden="true">
              <div className="voice-orb__ring voice-orb__ring--1" />
              <div className="voice-orb__ring voice-orb__ring--2" />
              <div className="voice-orb__ring voice-orb__ring--3" />
              <button
                className="voice-orb__core"
                onClick={handleStopListening}
                aria-label="Stop listening"
              >
                <i className="fa-solid fa-microphone" />
              </button>
            </div>

            {/* ---- Status label ---- */}
            <p className="voice-label">
              <span className="voice-label__dot" />
              Listening…
            </p>

            {/* ---- Cancel button ---- */}
            <button
              className="voice-cancel"
              onClick={handleStopListening}
              aria-label="Cancel voice input"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============ BOTTOM INPUT ============ */}
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

            {/* ---- CHANGED: active class added when isListining ---- */}
            <button
              onClick={handleMic}
              className={`mic-btn${isListining ? " mic-btn--active" : ""}`}
              aria-label="Voice input"
              aria-pressed={isListining}
            >
              <i className="fa-solid fa-microphone" />
            </button>

            {stopGeneration ? (
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
