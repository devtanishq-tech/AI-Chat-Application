import "./ChatWindow.css";
import Chat from "./Chat";
import axios from "axios";
import { MyContext } from "./Mycontext";
import { useContext, useRef, useState } from "react";
import { Astroid, CircleUser, Settings, LifeBuoy, LogOut } from "lucide-react";

// ===================== ChatWindow Component =====================
// Receives auth state + handlers as props from App so the navbar
// can conditionally render auth buttons vs user avatar.
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
    setstopGeneration,
  } = useContext(MyContext);

  // ---- Dropdown state -------------------------------------
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const controllerRef = useRef(null);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  // ---- Input change ---------------------------------------
  const onchange = (e) => setprompt(e.target.value);

  // ---- Send message ---------------------------------------
  const handleClick = async () => {
    if (!prompt.trim()) return;

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

  // ---- Stop generation ------------------------------------
  const stopResponse = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setloading(false);
    setstopGeneration(true);
  };

  // ---- Logout handler -------------------------------------
  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <section className="chatWindow">
      {/* ============ NAVBAR ============ */}
      {/* WHY flex-shrink:0: navbar never compresses regardless of
          content height below it. */}
      <div className="navbarr">
        {/* Left side: hamburger + brand name */}
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

        {/* Right side: conditional on auth state */}
        <div className="nav-right">
          {isAuthenticated ? (
            /* ---- AUTHENTICATED NAV ---- */
            <>
              <button className="share-btn" aria-label="Share conversation">
                <i className="fa-solid fa-arrow-up-from-bracket" />
                <span>Share</span>
              </button>

              <button className="icon-btn" aria-label="More options">
                <i className="fa-solid fa-ellipsis" />
              </button>

              {/* User avatar + dropdown */}
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
            /* ---- UNAUTHENTICATED NAV ---- */
            /* WHY: shows "Log in" + "Sign up for free" matching
               the reference Image 3 exactly. */
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
      {/* Chat fills all space between navbar and input.
          The scroll region lives inside Chat component. */}
      <Chat />

      {/* ============ BOTTOM INPUT ============ */}
      {/* flex-shrink:0 keeps input anchored — no position:fixed needed */}
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
