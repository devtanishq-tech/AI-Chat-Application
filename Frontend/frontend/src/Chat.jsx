import "./Chat.css";
import { MyContext } from "./Mycontext";
import { useContext, useState, useEffect, useRef } from "react";

import "@fontsource/fira-code";

// ---- Markdown rendering
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ---- Syntax highlighting
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
// import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ===================== CodeBlock Component =====================
// WHY: Extracted as its own component so it can manage its own
// "copied" state without re-rendering the entire chat.
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match?.[1] || "text";

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang-label">
          <span className="code-icon">{"</>"}</span>
          {lang}
        </span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={atomDark}
        language={lang}
        customStyle={{
          margin: 0,
          borderRadius: "0 0 12px 12px",
          padding: "18px",
          background: "#161b22",
          fontSize: "13px",
          lineHeight: "1.75",
          overflowX: "auto", // WHY: wide code scrolls horizontally inside the block
          maxWidth: "100%",
        }}
        wrapLongLines={false}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}

// ===================== Chat Component =====================
export default function Chat() {
  const {
    prevChats,
    loading,
    newChat,
    reply,
    stopGeneration,
    setstopGeneration,
    currentID,
  } = useContext(MyContext);

  const [lastReply, setlastReply] = useState("");
  const intervalRef = useRef(null);
  const bottomRef = useRef(null);

  // ---- Animated word-by-word reply reveal ------------------
  useEffect(() => {
    if (!reply) return;
    if (!prevChats?.length) return;

    let idx = 0;
    const content = reply.split(" ");

    intervalRef.current = setInterval(() => {
      setlastReply(content.slice(0, idx + 1).join(" "));
      idx++;

      if (idx >= content.length) {
        clearInterval(intervalRef.current);
        setstopGeneration(false);
      }
    }, 40);

    return () => clearInterval(intervalRef.current);
  }, [prevChats, reply]);

  // ---- Clear animation when switching threads --------------
  useEffect(() => {
    setlastReply("");
  }, [currentID]);

  // ---- Auto-scroll to bottom as reply streams --------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastReply]);

  // ---- Stop generation on demand --------------------------
  useEffect(() => {
    if (stopGeneration) {
      clearInterval(intervalRef.current);
    }
  }, [stopGeneration]);

  return (
    /* WHY: chat-wrapper is flex:1 + min-height:0 in CSS, which lets it
       fill the space between navbar and bottomSection without overflowing.
       The actual scrollbar lives on .chat-messages inside. */
    <div className="chat-wrapper">
      <div className="chat-container">
        {/* Empty state */}
        {newChat && <h1 className="chat-title">What can I help with?</h1>}

        {/* ---- Message list (independently scrollable) ---- */}
        <div className="chat-messages">
          {prevChats?.map((chat, idx) => (
            <div
              key={idx}
              className={`chat-row ${chat.role === "user" ? "user" : "assistant"}`}
            >
              <div className="chat-bubble">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children }) {
                      // WHY: only render CodeBlock for fenced/block code;
                      // inline backticks use the simpler .inline-code span.
                      return !inline ? (
                        <CodeBlock className={className}>{children}</CodeBlock>
                      ) : (
                        <code className="inline-code">{children}</code>
                      );
                    },
                  }}
                >
                  {/* WHY: show animated lastReply only for the last
                      assistant message while it's streaming in */}
                  {idx === prevChats.length - 1 &&
                  chat.role === "assistant" &&
                  lastReply
                    ? lastReply
                    : chat.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="chat-row assistant">
              <div className="chat-bubble loader">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {/* Scroll anchor — scrollIntoView targets this */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
