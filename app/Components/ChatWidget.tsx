'use client'

// ============================================================
// ChatWidget.tsx
// Floating AI chat assistant powered by Ollama (llama3.2).
// Mounts as a fixed overlay — works on every page.
//
// Features:
//  - Floating button (bottom-right)
//  - Slide-up chat panel
//  - Message history persisted per session
//  - Typing indicator while waiting for Ollama
//  - Clear history button
//  - Markdown-lite: bold, bullets rendered cleanly
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import type { AuthUser } from "../pages/Login/logUser";

interface Message {
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
}

interface ChatWidgetProps {
  user: AuthUser;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCsrf(): string {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function refreshCsrf(): Promise<void> {
  try {
    await fetch("/sanctum/csrf-cookie", { credentials: "include" });
  } catch {
    // ignore
  }
}

/** Very light markdown: **bold**, bullet lines */
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    // Bullet
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("• ");
    return (
      <div key={i} style={{
        display: "flex", gap: isBullet ? 6 : 0,
        marginBottom: line.trim() === "" ? 6 : 2,
      }}>
        {isBullet && <span style={{ color: "#7c3aed", fontWeight: 700, flexShrink: 0 }}>•</span>}
        <span>{isBullet ? parts.map((p, j) => typeof p === "string" ? p.replace(/^[-•]\s*/, "") : p) : parts}</span>
      </div>
    );
  });
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatWidget({ user }: ChatWidgetProps) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unread,   setUnread]   = useState(0);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // ── Load history on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadHistory();
  }, []);

  // ── Scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/chat/history", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data.map((m: any) => ({
            role:      m.role,
            content:   m.content,
            timestamp: new Date(m.created_at),
          })));
        } else {
          // First time — show a welcome message
          setMessages([{
            role:      "assistant",
            content:   `Hi ${user.name?.split(" ")[0] || "there"}! 👋 I'm GeniX Assistant. I can help you with courses, company info, learning progress, and more. What would you like to know?`,
            timestamp: new Date(),
          }]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages
      .filter(m => m.content !== messages[0]?.content || messages.length > 1)
      .map(m => ({ role: m.role, content: m.content }));

    const payload = { message: text, history };
    // Refresh CSRF token before every request to prevent 419s
    await refreshCsrf();
    console.group("[Chat] sendMessage");
    console.log("[Chat] 🔵 POST /api/chat");
    console.log("[Chat] payload:", payload);
    console.log("[Chat] CSRF token:", getCsrf() ? "present" : "MISSING");

    // Helper: single attempt
    const doFetch = async () => {
      await refreshCsrf();
      return fetch("/api/chat", {
        method:      "POST",
        credentials: "include",
        headers: {
          "Content-Type":  "application/json",
          "Accept":        "application/json",
          "X-XSRF-TOKEN":  getCsrf(),
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let res = await doFetch();

      // Silent retry once on 500 or 419
      if (res.status === 500 || res.status === 419) {
        console.warn("[Chat] ⚠️ Got", res.status, "— retrying once after CSRF refresh...");
        await new Promise(r => setTimeout(r, 600));
        res = await doFetch();
      }

      console.log("[Chat] 📥 HTTP status:", res.status, res.statusText);
      const rawText = await res.text();
      console.log("[Chat] 📥 Raw response body:", rawText.substring(0, 300));

      let data: any = {};
      try { data = JSON.parse(rawText); } catch { console.error("[Chat] ❌ Response is not JSON"); }

      console.log("[Chat] 📥 Parsed data:", data);
      console.groupEnd();

      if (res.ok && data.reply) {
        setMessages(prev => [...prev, {
          role:      "assistant",
          content:   data.reply,
          timestamp: new Date(),
        }]);
        if (!open) setUnread(u => u + 1);
      } else {
        setMessages(prev => [...prev, {
          role:      "assistant",
          content:   data.error || "Something went wrong. Please try again.",
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error("[Chat] ❌ Fetch exception:", err);
      console.groupEnd();
      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   "Could not reach the AI service. Make sure Ollama is running.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = async () => {
    if (!confirm("Clear all chat history?")) return;
    try {
      await fetch("/api/chat/history", {
        method:      "DELETE",
        credentials: "include",
        headers: { "X-XSRF-TOKEN": getCsrf(), Accept: "application/json" },
      });
      setMessages([{
        role:      "assistant",
        content:   "Chat history cleared. How can I help you?",
        timestamp: new Date(),
      }]);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating button ── */}
      <button
        className="chat-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="chat-badge">{unread}</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      <div className={`chat-panel${open ? " open" : ""}`} ref={panelRef}>

        {/* Header */}
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chat-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#18103a", letterSpacing: "-.01em" }}>GeniX Assistant</div>
              <div style={{ fontSize: 10, color: "#0d9488", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d9488", display: "inline-block" }} />
                Powered by Ollama · llama3.2
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="chat-icon-btn" onClick={clearHistory} title="Clear history">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/>
              </svg>
            </button>
            <button className="chat-icon-btn" onClick={() => setOpen(false)} title="Close">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: 24, color: "#a89dc8", fontSize: 12 }}>
              <span className="chat-spinner" style={{ borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`chat-row ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="chat-bot-dot" />
                  )}
                  <div className={`chat-bubble ${msg.role}`}>
                    <div className="chat-bubble-content">
                      {renderContent(msg.content)}
                    </div>
                    <div className="chat-time">{timeLabel(msg.timestamp)}</div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="chat-row assistant">
                  <div className="chat-bot-dot" />
                  <div className="chat-bubble assistant">
                    <div className="chat-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Suggested prompts — shown when only welcome message */}
        {messages.length <= 1 && !loading && (
          <div className="chat-suggestions">
            {[
              "What courses are published?",
              "Show me my learning progress",
              "How many active companies?",
              "What's the most popular course category?",
            ].map((s, i) => (
              <button key={i} className="chat-suggestion" onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about courses, companies, progress…"
            rows={1}
            disabled={loading}
          />
          <button
            className="chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            title="Send (Enter)"
          >
            {loading ? (
              <span className="chat-spinner" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="chat-footer">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes chat-slide-up { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes chat-pop       { 0%{transform:scale(0.8)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
@keyframes chat-dot       { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
@keyframes chat-spin      { to{transform:rotate(360deg)} }
@keyframes chat-pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4)} 50%{box-shadow:0 0 0 8px rgba(124,58,237,0)} }

/* Floating button */
.chat-fab {
  position: fixed;
  bottom: 28px; right: 28px;
  width: 54px; height: 54px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 24px rgba(124,58,237,0.38);
  z-index: 9000;
  transition: transform 0.2s, box-shadow 0.2s;
  animation: chat-pop 0.4s cubic-bezier(0.16,1,0.3,1) both;
}
.chat-fab:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 10px 32px rgba(124,58,237,0.48);
  animation: chat-pulse 2s ease infinite;
}

.chat-badge {
  position: absolute; top: -3px; right: -3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff;
  font-family: 'DM Sans', sans-serif;
}

/* Panel */
.chat-panel {
  position: fixed;
  bottom: 94px; right: 28px;
  width: 370px;
  max-height: 580px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(124,58,237,0.1);
  display: flex; flex-direction: column;
  z-index: 8999;
  overflow: hidden;
  opacity: 0; pointer-events: none;
  transform: translateY(16px) scale(0.97);
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1);
  font-family: 'DM Sans', sans-serif;
}
.chat-panel.open {
  opacity: 1; pointer-events: all;
  transform: translateY(0) scale(1);
  animation: chat-slide-up 0.28s cubic-bezier(0.16,1,0.3,1) both;
}

/* Header */
.chat-header {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(124,58,237,0.08);
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(124,58,237,0.04), rgba(13,148,136,0.03));
  flex-shrink: 0;
}
.chat-avatar {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(124,58,237,0.28);
  flex-shrink: 0;
}
.chat-icon-btn {
  width: 28px; height: 28px; border-radius: 7px;
  border: 1.5px solid rgba(124,58,237,0.15); background: #f5f3ff;
  color: #8e7ec0; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: background 0.14s, color 0.14s;
}
.chat-icon-btn:hover { background: rgba(124,58,237,0.12); color: #4a3870; }

/* Messages scroll area */
.chat-messages {
  flex: 1; overflow-y: auto; padding: 14px 14px 8px;
  display: flex; flex-direction: column; gap: 10px;
  scrollbar-width: thin; scrollbar-color: rgba(124,58,237,0.12) transparent;
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.15); border-radius: 3px; }

.chat-row {
  display: flex; align-items: flex-end; gap: 7px;
}
.chat-row.user   { flex-direction: row-reverse; }
.chat-row.assistant { flex-direction: row; }

.chat-bot-dot {
  width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  box-shadow: 0 2px 8px rgba(124,58,237,0.25);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
}

.chat-bubble {
  max-width: 82%;
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 12.5px;
  line-height: 1.55;
  position: relative;
}
.chat-bubble.user {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 10px rgba(124,58,237,0.25);
}
.chat-bubble.assistant {
  background: #f5f3ff;
  color: #18103a;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(124,58,237,0.1);
}
.chat-bubble-content { font-weight: 450; }
.chat-time {
  font-size: 9px; margin-top: 4px; opacity: 0.55; font-weight: 600; letter-spacing: .02em;
}
.chat-bubble.user .chat-time { text-align: right; color: rgba(255,255,255,0.7); }
.chat-bubble.assistant .chat-time { color: #a89dc8; }

/* Typing indicator */
.chat-typing {
  display: flex; align-items: center; gap: 4px; padding: 2px 4px;
}
.chat-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: #7c3aed; opacity: 0.5;
  animation: chat-dot 1.2s ease infinite;
}
.chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.chat-typing span:nth-child(3) { animation-delay: 0.4s; }

/* Suggestions */
.chat-suggestions {
  padding: 0 12px 8px;
  display: flex; flex-wrap: wrap; gap: 6px;
  flex-shrink: 0;
}
.chat-suggestion {
  padding: 5px 10px; border-radius: 20px;
  border: 1.5px solid rgba(124,58,237,0.18);
  background: #f5f3ff; color: #6d28d9;
  font-size: 10.5px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: all 0.14s;
}
.chat-suggestion:hover { background: #ede9fe; border-color: rgba(124,58,237,0.35); }

/* Input area */
.chat-input-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid rgba(124,58,237,0.08);
  background: #faf9ff;
  flex-shrink: 0;
}
.chat-input {
  flex: 1; resize: none; border: 1.5px solid rgba(124,58,237,0.15);
  border-radius: 10px; padding: 9px 12px;
  font-size: 12.5px; font-family: 'DM Sans', sans-serif;
  color: #18103a; background: #fff;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  max-height: 100px; line-height: 1.5;
}
.chat-input:focus { border-color: rgba(124,58,237,0.4); box-shadow: 0 0 0 3px rgba(124,58,237,0.07); }
.chat-input::placeholder { color: rgba(24,16,58,0.3); }
.chat-input:disabled { opacity: 0.6; cursor: not-allowed; }

.chat-send {
  width: 36px; height: 36px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  color: #fff; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; box-shadow: 0 2px 10px rgba(124,58,237,0.28);
}
.chat-send:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.4); }
.chat-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

.chat-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  display: inline-block;
  animation: chat-spin 0.7s linear infinite;
}

.chat-footer {
  padding: 5px 14px 8px;
  font-size: 9.5px; color: #c4b9e8;
  text-align: center; letter-spacing: .02em;
  flex-shrink: 0;
}
.chat-footer kbd {
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 3px; padding: 1px 4px; font-size: 9px; font-family: inherit;
  color: #7c3aed;
}

@media (max-width: 480px) {
  .chat-panel { width: calc(100vw - 24px); right: 12px; bottom: 80px; max-height: 65vh; }
  .chat-fab   { bottom: 18px; right: 16px; }
}
`;
