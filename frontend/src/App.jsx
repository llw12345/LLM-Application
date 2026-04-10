import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

const tabs = ["Chat", "Agent", "Summarize", "Sentiment", "Run All"];

const icons = {
  Chat: "💬",
  Agent: "🤖",
  Summarize: "📝",
  Sentiment: "🎭",
  "Run All": "⚡",
};

const tabDesc = {
  Chat: "Simple chat with Mistral",
  Agent: "AI Agent with tools (Summarize + Sentiment)",
  Summarize: "Condense any text into key points",
  Sentiment: "Analyze emotional tone of text",
  "Run All": "Summarize + Sentiment at once",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Chat & Agent each have their own message history
  const [chatMessages, setChatMessages] = useState([]);
  const [agentMessages, setAgentMessages] = useState([]);

  // Results for Summarize / Sentiment / Run All
  const [result, setResult] = useState(null);
  const [resultText, setResultText] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, agentMessages]);

  const isConversation = activeTab === "Chat" || activeTab === "Agent";

  const callAPI = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setResultText("");

    const body = { user_id: "u1", text: input };
    const userText = input;
    setInput("");

    try {
      // ── Chat ──────────────────────────────────────────
      if (activeTab === "Chat") {
        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: userText },
        ]);
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const reply = data.reply?.content ?? data.reply ?? "No reply";
        setChatMessages((prev) => [...prev, { role: "ai", content: reply }]);

        // ── Agent ─────────────────────────────────────────
      } else if (activeTab === "Agent") {
        setAgentMessages((prev) => [
          ...prev,
          { role: "user", content: userText },
        ]);
        const res = await fetch(`${API}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const reply = data.result?.output ?? "No reply";
        setAgentMessages((prev) => [...prev, { role: "ai", content: reply }]);

        // ── Summarize ─────────────────────────────────────
      } else if (activeTab === "Summarize") {
        const res = await fetch(`${API}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResultText(
          typeof data.summary === "string"
            ? data.summary
            : (data.summary?.content ?? JSON.stringify(data)),
        );

        // ── Sentiment ─────────────────────────────────────
      } else if (activeTab === "Sentiment") {
        const res = await fetch(`${API}/sentiment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResultText(
          data.sentiment?.content ?? data.sentiment ?? JSON.stringify(data),
        );

        // ── Run All ───────────────────────────────────────
      } else if (activeTab === "Run All") {
        const res = await fetch(`${API}/run-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      const errMsg = "⚠️ Cannot connect to server. Is Docker running?";
      if (activeTab === "Chat")
        setChatMessages((prev) => [
          ...prev,
          { role: "error", content: errMsg },
        ]);
      else if (activeTab === "Agent")
        setAgentMessages((prev) => [
          ...prev,
          { role: "error", content: errMsg },
        ]);
      else setResultText(errMsg);
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      callAPI();
    }
  };

  const messages = activeTab === "Agent" ? agentMessages : chatMessages;

  const clearHistory = () => {
    if (activeTab === "Chat") setChatMessages([]);
    else if (activeTab === "Agent") setAgentMessages([]);
    else {
      setResult(null);
      setResultText("");
    }
  };

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <span style={styles.logoText}>LLM App</span>
        </div>
        <nav style={styles.nav}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
              }}
              style={{
                ...styles.navBtn,
                ...(activeTab === tab ? styles.navBtnActive : {}),
              }}
            >
              <span style={{ fontSize: 16 }}>{icons[tab]}</span>
              {tab}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.statusDot} />
          <span style={{ fontSize: 11, color: "#555" }}>
            Mistral via Ollama
          </span>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h1 style={styles.headerTitle}>
              {icons[activeTab]} {activeTab}
            </h1>
            <button onClick={clearHistory} style={styles.clearBtn}>
              Clear
            </button>
          </div>
          <p style={styles.headerSub}>{tabDesc[activeTab]}</p>
        </div>

        {/* ── Conversation View (Chat & Agent) ── */}
        {isConversation && (
          <div style={styles.chatContainer}>
            <div style={styles.messages}>
              {messages.length === 0 && (
                <div style={styles.emptyState}>
                  <span style={{ fontSize: 40 }}>{icons[activeTab]}</span>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                    Start a conversation...
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.bubble,
                    ...(msg.role === "user"
                      ? styles.bubbleUser
                      : msg.role === "error"
                        ? styles.bubbleError
                        : styles.bubbleAI),
                  }}
                >
                  <span style={styles.bubbleLabel}>
                    {msg.role === "user"
                      ? "You"
                      : msg.role === "error"
                        ? "Error"
                        : "AI"}
                  </span>
                  <p style={styles.bubbleText}>{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.bubble, ...styles.bubbleAI }}>
                  <span style={styles.bubbleLabel}>AI</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    thinking...
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ── Result View (Summarize / Sentiment / Run All) ── */}
        {!isConversation && (
          <div style={styles.resultArea}>
            {/* Summarize & Sentiment */}
            {(activeTab === "Summarize" || activeTab === "Sentiment") && (
              <>
                {resultText && (
                  <div style={styles.resultCard}>
                    <h3 style={styles.resultKey}>
                      {activeTab.toUpperCase()} RESULT
                    </h3>
                    <p style={styles.resultVal}>{resultText}</p>
                  </div>
                )}
                {loading && (
                  <div style={styles.emptyState}>
                    <p style={{ color: "#666", fontStyle: "italic" }}>
                      Processing...
                    </p>
                  </div>
                )}
                {!resultText && !loading && (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: 40 }}>{icons[activeTab]}</span>
                    <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                      Paste text below and press Send
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Run All */}
            {activeTab === "Run All" && (
              <>
                {result && (
                  <div style={styles.resultCard}>
                    {Object.entries(result).map(([key, val]) => (
                      <div key={key} style={{ marginBottom: 20 }}>
                        <h3 style={styles.resultKey}>{key.toUpperCase()}</h3>
                        <p style={styles.resultVal}>
                          {typeof val === "object"
                            ? JSON.stringify(val, null, 2)
                            : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {loading && (
                  <div style={styles.emptyState}>
                    <p style={{ color: "#666", fontStyle: "italic" }}>
                      Processing...
                    </p>
                  </div>
                )}
                {!result && !loading && (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: 40 }}>⚡</span>
                    <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                      Paste text below and press Send
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Input Bar ── */}
        <div style={styles.inputBar}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              isConversation
                ? "Type a message... (Enter to send)"
                : "Paste your text here... (Enter to send)"
            }
            rows={3}
          />
          <button
            style={{ ...styles.sendBtn, opacity: loading ? 0.5 : 1 }}
            onClick={callAPI}
            disabled={loading}
          >
            {loading ? "⏳" : "Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    background: "#0f0f13",
    color: "#e8e8f0",
    fontFamily: "'Courier New', monospace",
    overflow: "hidden",
  },
  sidebar: {
    width: 220,
    background: "#16161e",
    borderRight: "1px solid #2a2a3a",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 20px 24px",
    borderBottom: "1px solid #2a2a3a",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#a78bfa",
    letterSpacing: 1,
  },
  nav: { display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
    transition: "all 0.15s",
  },
  navBtnActive: { background: "#2a2a3a", color: "#a78bfa" },
  sidebarFooter: {
    marginTop: "auto",
    padding: "16px 20px",
    borderTop: "1px solid #2a2a3a",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 6px #4ade80",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: { padding: "24px 32px 16px", borderBottom: "1px solid #2a2a3a" },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    color: "#e8e8f0",
    fontWeight: "bold",
  },
  headerSub: { margin: "4px 0 0", fontSize: 13, color: "#555" },
  clearBtn: {
    background: "#2a2a3a",
    border: "1px solid #3a3a4a",
    borderRadius: 8,
    color: "#888",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    background: "#2d1f6e",
    border: "1px solid #4c35a0",
  },
  bubbleAI: {
    alignSelf: "flex-start",
    background: "#1e1e2e",
    border: "1px solid #2a2a3a",
  },
  bubbleError: {
    alignSelf: "flex-start",
    background: "#2d1515",
    border: "1px solid #5a2020",
  },
  bubbleLabel: {
    fontSize: 10,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bubbleText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  resultArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  resultCard: {
    background: "#1e1e2e",
    border: "1px solid #2a2a3a",
    borderRadius: 12,
    padding: 24,
  },
  resultKey: {
    margin: "0 0 8px",
    fontSize: 11,
    color: "#a78bfa",
    letterSpacing: 2,
  },
  resultVal: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: "#c8c8d8",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    opacity: 0.4,
  },
  inputBar: {
    padding: "16px 32px 24px",
    borderTop: "1px solid #2a2a3a",
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#1e1e2e",
    border: "1px solid #2a2a3a",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#e8e8f0",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "none",
    outline: "none",
    lineHeight: 1.5,
  },
  sendBtn: {
    background: "#4c35a0",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },
};
