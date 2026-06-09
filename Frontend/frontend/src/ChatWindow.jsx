import "./ChatWindow.css";
import Chat from "./Chat";
import axios from "axios";
import { MyContext } from "./Mycontext";
import { useContext, useRef, useState, useEffect } from "react";
import {
  Astroid,
  CircleUser,
  Settings,
  LifeBuoy,
  LogOut,
  AudioLines,
} from "lucide-react";

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
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const isAISpeakingRef = useRef(false);
  const transcriptRef = useRef("");

  // ===================== File Upload =====================
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleAttachClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };
  // =======================================================

  // ===================== Auth Error ======================
  const [authError, setauthError] = useState(false);

  // ===================== Speech Synthesis ================
  const voicesRef = useRef([]);

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = (text) => {
    if (!voiceModeRef.current) return;
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*#`]/g, "")
      .replace(/\[(.*?)\]/g, "$1")
      .replace(/\(.*?\)/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = voicesRef.current;
    const preferredVoice =
      voices.find((v) => v.name.includes("Google US English")) ||
      voices.find((v) => v.name.includes("Microsoft Aria")) ||
      voices.find((v) => v.name.includes("Microsoft Jenny")) ||
      voices.find((v) => v.name.includes("Samantha")) ||
      voices.find((v) => v.lang === "en-US");

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      isAISpeakingRef.current = true;
    };
    utterance.onend = () => {
      isAISpeakingRef.current = false;
      if (voiceModeRef.current && recognitionRef.current) {
        setTimeout(() => {
          recognitionRef.current.start();
        }, 600);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // =================== Send Voice Message ================
  const sendVoiceMessage = async (message) => {
    if (!message.trim()) return;

    setprompt("");
    setprevChats((prev) => [...prev, { content: message, role: "user" }]);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/chat/ai`,
        { threadID: currentID, message },
        { withCredentials: true },
      );

      const aiReply = res.data.reply;
      setprevChats((prev) => [
        ...prev,
        { content: aiReply, role: "assistant" },
      ]);
      setreply(aiReply);
      speak(aiReply);
    } catch (err) {
      console.log(err);
    }
  };

  // =================== Speech Recognition ================
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
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
      transcriptRef.current = transcript;

      if (!voiceModeRef.current) {
        setprompt(transcript);
        return;
      }

      if (event.results[event.results.length - 1].isFinal) {
        sendVoiceMessage(transcript);
      }
    };

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // =================== Mic / Voice Controls ==============
  const handleMic = () => {
    if (voiceModeRef.current) return;
    setprompt("");
    recognitionRef.current?.start();
  };

  const startVoiceMode = () => {
    voiceModeRef.current = true;
    setVoiceMode(true);
    setprompt("");
    recognitionRef.current?.start();
  };

  const stopVoiceMode = () => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
  };

  const handleStopListening = () => {
    recognitionRef.current?.stop();
    setisListining(false);
  };

  // =======================================================
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const onchange = (e) => setprompt(e.target.value);
  const controllerRef = useRef(null);

  // =================== Handle Click (Send) ===============
  const handleClick = async () => {
    // ✅ Only block if BOTH prompt and file are empty
    // Allows: text only | file only | text + file
    if (!prompt.trim() && !selectedFile) return;

    if (!isAuthenticated) {
      setauthError(true);
      setTimeout(() => setauthError(false), 5000);
      return; // ✅ Stop unauthenticated users from sending
    }

    // ✅ Build FormData — file is optional, appended only when selected
    const formData = new FormData();
    formData.append("message", prompt); // empty string if no text — fine
    formData.append("threadID", currentID);
    if (selectedFile) {
      formData.append("file", selectedFile); // only attached when a file exists
    }

    // Show user message in chat (show filename if no text)
    setprevChats((prev) => [
      ...prev,
      {
        content: prompt.trim() || `📎 ${selectedFile?.name}`,
        role: "user",
      },
    ]);

    setloading(true);
    controllerRef.current = new AbortController();

    try {
      // ✅ axios auto-sets Content-Type: multipart/form-data with correct boundary
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/chat/ai`,
        formData,
        {
          withCredentials: true,
          signal: controllerRef.current.signal,
          // ❌ Do NOT manually set Content-Type here — axios handles the boundary
        },
      );

      const aiReply = res.data.reply;
      setprevChats((prev) => [
        ...prev,
        { content: aiReply, role: "assistant" },
      ]);
      setreply(aiReply);
      speak(aiReply); // no-op in text mode since voiceModeRef.current === false
      setprompt("");
      setSelectedFile(null); // ✅ Clear file after successful send
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
  // =======================================================

  const stopResponse = () => {
    if (controllerRef.current) controllerRef.current.abort();
    setloading(false);
    setstopGeneration(false);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    onLogout();
  };

  // ===================== JSX =====================
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
                      <Astroid size={18} /> Upgraded Plan
                    </p>
                    <p>
                      <CircleUser size={18} /> Personalization
                    </p>
                    <p>
                      <Settings size={18} /> Settings
                    </p>
                    <p>
                      <LifeBuoy size={18} /> Help
                    </p>
                    <p className="logout-item" onClick={handleLogout}>
                      <LogOut size={18} /> Log out
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

      {/* ============ AUTH ERROR TOAST ============ */}
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

      {/* ============ VOICE LISTENING OVERLAY ============ */}
      {isListining && (
        <div
          className="voice-overlay"
          role="dialog"
          aria-label="Voice input active"
        >
          <div className="voice-overlay__backdrop" />
          <div className="voice-overlay__panel">
            <div className="voice-wave" aria-hidden="true">
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
              <span className="voice-wave__bar" />
            </div>
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
            <p className="voice-label">
              <span className="voice-label__dot" />
              Listening…
            </p>
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

      {/* ============ FILE PREVIEW CHIP ============ */}
      {/* ✅ Shows selected filename above the input, with a remove button */}
      {selectedFile && (
        <div className="file-preview-chip">
          <i className="fa-solid fa-paperclip" />
          <span>{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            aria-label="Remove selected file"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* ============ BOTTOM INPUT ============ */}
      <div className="bottomSection">
        <div className="chatInput">
          <div className="input-container">
            {/* ✅ Attach button — triggers the hidden file input */}
            <button
              className="add-btn"
              aria-label="Attach file"
              onClick={handleAttachClick}
            >
              <i className="fa-solid fa-plus" />
            </button>

            {/* ✅ Hidden file input — wired to fileInputRef */}
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            <input
              value={prompt}
              onChange={onchange}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleClick()
              }
              placeholder="Ask anything..."
              aria-label="Chat input"
            />

            <button
              onClick={handleMic}
              className={`mic-btn${isListining ? " mic-btn--active" : ""}`}
              aria-label="Voice input"
              aria-pressed={isListining}
            >
              <i className="fa-solid fa-microphone" />
            </button>

            {voiceMode ? (
              <button onClick={stopVoiceMode} className="voice-end-btn">
                <AudioLines size={18} />
                End
              </button>
            ) : (
              <button onClick={startVoiceMode} className="voice-ai-btn">
                <AudioLines size={20} />
              </button>
            )}

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
