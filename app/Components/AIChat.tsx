'use client'

import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  failed?: boolean;
}

interface AIChatProps {
  userId: number;
  accessLevel: string;
  userName?: string;
}

const API_BASE = 'http://localhost/api';

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function apiCall(endpoint: string, method = 'GET', body?: object) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const raw = sessionStorage.getItem('gx_user_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.id)          headers['X-User-Id']      = String(p.id);
      if (p?.accessLevel) headers['X-Access-Level'] = p.accessLevel;
    }
  } catch {}

  const csrf = getCsrfToken();
  if (csrf && method !== 'GET') headers['X-XSRF-TOKEN'] = csrf;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer (no external lib needed)
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet points: lines starting with * or -
    .replace(/^[\*\-] (.+)/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>|$)/g, (m) => m)
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Line breaks (double newline = paragraph, single = <br>)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph
    .replace(/^(.+)$/, '<p>$1</p>');
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      className="ai-bubble-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes ai-pop-in {
  0%   { opacity:0; transform:scale(0.85) translateY(20px); }
  60%  { transform:scale(1.03) translateY(-3px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes ai-fade-up {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes ai-pulse {
  0%,100% { opacity:1; } 50% { opacity:0.4; }
}
@keyframes ai-typing {
  0%,80%,100% { transform:scale(0); opacity:0.3; }
  40%         { transform:scale(1); opacity:1; }
}

.ai-bubble-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9998;
  width: 56px; height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  box-shadow: 0 4px 20px rgba(124,58,237,0.45);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}
.ai-bubble-btn:hover {
  transform: translateY(-3px) scale(1.07);
  box-shadow: 0 8px 28px rgba(124,58,237,0.55);
}
.ai-bubble-btn:active { transform: scale(0.95); }

.ai-unread {
  position: absolute;
  top: -2px; right: -2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
  font-size: 9px; font-weight: 800;
  color: #fff;
  display: flex; align-items: center; justify-content: center;
}

.ai-panel {
  position: fixed;
  bottom: 96px; right: 28px;
  z-index: 9999;
  width: 370px;
  max-height: calc(100vh - 120px);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(124,58,237,0.22), 0 0 0 1.5px rgba(124,58,237,0.1);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: ai-pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .ai-panel {
    width: calc(100vw - 20px);
    right: 10px;
    bottom: 90px;
    max-height: calc(100vh - 110px);
    border-radius: 16px;
  }
  .ai-bubble-btn {
    bottom: 18px;
    right: 18px;
  }
}

.ai-header {
  padding: 14px 16px 12px;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  display: flex; align-items: center; gap: 10px;
  flex-shrink: 0;
}
.ai-header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.ai-header-info { flex: 1; min-width: 0; }
.ai-header-title {
  font-size: 13.5px; font-weight: 800; color: #fff;
  line-height: 1; margin-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ai-header-brand {
  font-size: 9px; color: rgba(255,255,255,0.55);
  font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
  margin-bottom: 1px;
}
.ai-header-sub   { font-size: 10px; color: rgba(255,255,255,0.75); font-weight: 500; }
.ai-header-actions { display: flex; gap: 6px; flex-shrink: 0; }
.ai-icon-btn {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.9);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s; font-size: 13px;
}
.ai-icon-btn:hover { background: rgba(255,255,255,0.28); }

.ai-messages {
  flex: 1; overflow-y: auto; padding: 14px 14px 8px;
  display: flex; flex-direction: column; gap: 10px;
  min-height: 0;
}
.ai-messages::-webkit-scrollbar { width: 3px; }
.ai-messages::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.2); border-radius: 3px; }

.ai-msg {
  display: flex; gap: 7px; animation: ai-fade-up 0.22s ease both;
}
.ai-msg.user  { flex-direction: row-reverse; }

.ai-avatar {
  width: 26px; height: 26px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; flex-shrink: 0; margin-top: 2px;
}
.ai-msg.assistant .ai-avatar { background: linear-gradient(135deg,#7c3aed,#0d9488); color: #fff; }
.ai-msg.user      .ai-avatar { background: rgba(124,58,237,0.1); color: #7c3aed; }

.ai-bubble {
  max-width: 82%; padding: 9px 12px; border-radius: 14px;
  font-size: 12.5px; line-height: 1.6; color: #18103a;
  word-break: break-word;
}
.ai-msg.assistant .ai-bubble {
  background: #f4f2fb;
  border: 1.5px solid rgba(124,58,237,0.1);
  border-bottom-left-radius: 4px;
}
.ai-msg.user .ai-bubble {
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: #fff;
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}

/* Markdown styles inside assistant bubble */
.ai-bubble-content p {
  margin: 0 0 6px 0;
}
.ai-bubble-content p:last-child { margin-bottom: 0; }
.ai-bubble-content ul {
  margin: 4px 0 6px 0;
  padding-left: 16px;
  list-style: disc;
}
.ai-bubble-content li {
  margin-bottom: 3px;
  line-height: 1.5;
}
.ai-bubble-content strong { font-weight: 700; color: #4a3870; }
.ai-bubble-content em { font-style: italic; }

/* Failed message style */
.ai-msg.assistant .ai-bubble.failed {
  background: #fff5f5;
  border-color: rgba(239,68,68,0.2);
  color: #b91c1c;
}
.ai-retry-btn {
  margin-top: 6px;
  padding: 4px 10px;
  font-size: 11px; font-weight: 600;
  background: rgba(124,58,237,0.08);
  border: 1.5px solid rgba(124,58,237,0.2);
  border-radius: 8px;
  color: #7c3aed;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex; align-items: center; gap: 4px;
}
.ai-retry-btn:hover {
  background: rgba(124,58,237,0.15);
  border-color: rgba(124,58,237,0.35);
}

.ai-ts {
  font-size: 9.5px; color: #b0a8cc; margin-top: 3px;
  text-align: right;
}
.ai-msg.user .ai-ts { text-align: left; }

.ai-typing-indicator {
  display: flex; gap: 4px; padding: 10px 12px;
  background: #f4f2fb;
  border: 1.5px solid rgba(124,58,237,0.1);
  border-radius: 14px; border-bottom-left-radius: 4px;
  width: fit-content;
}
.ai-typing-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #7c3aed;
  animation: ai-typing 1.2s ease infinite;
}
.ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }

.ai-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px 16px; text-align: center;
  color: #b0a8cc;
}
.ai-empty-icon {
  width: 52px; height: 52px; border-radius: 16px;
  background: linear-gradient(135deg,rgba(124,58,237,0.1),rgba(13,148,136,0.1));
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; margin-bottom: 10px;
}
.ai-empty-title { font-size: 13px; font-weight: 700; color: #4a3870; margin-bottom: 4px; }
.ai-empty-sub   { font-size: 11px; line-height: 1.5; }

.ai-suggestions {
  padding: 0 14px 10px;
  display: flex; flex-direction: column; gap: 5px;
  flex-shrink: 0;
}
.ai-suggestion {
  padding: 7px 11px; border-radius: 10px;
  background: rgba(124,58,237,0.05);
  border: 1.5px solid rgba(124,58,237,0.12);
  font-size: 11.5px; color: #4a3870; font-weight: 500;
  cursor: pointer; text-align: left; transition: all 0.15s;
}
.ai-suggestion:hover {
  background: rgba(124,58,237,0.1);
  border-color: rgba(124,58,237,0.25);
  color: #7c3aed;
}

.ai-footer {
  padding: 10px 12px;
  border-top: 1.5px solid rgba(124,58,237,0.08);
  background: #faf9ff;
  display: flex; gap: 8px; align-items: flex-end;
  flex-shrink: 0;
}
.ai-input-wrap {
  flex: 1; display: flex; align-items: flex-end;
  background: #fff;
  border: 1.5px solid rgba(124,58,237,0.18);
  border-radius: 12px; padding: 8px 12px;
  transition: border-color 0.15s;
}
.ai-input-wrap:focus-within { border-color: rgba(124,58,237,0.45); }
.ai-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 12.5px; color: #18103a;
  font-family: 'DM Sans', system-ui, sans-serif;
  resize: none; max-height: 80px; line-height: 1.5;
}
.ai-input::placeholder { color: #b0a8cc; }
.ai-send {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  border: none; cursor: pointer; color: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; box-shadow: 0 2px 8px rgba(124,58,237,0.3);
}
.ai-send:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(124,58,237,0.4); }
.ai-send:disabled { opacity: 0.45; cursor: not-allowed; }

.ai-clear-confirm {
  position: absolute; inset: 0; z-index: 10;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(6px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px; text-align: center;
  border-radius: 20px;
  animation: ai-fade-up 0.2s ease both;
}
.ai-clear-title { font-size: 15px; font-weight: 800; color: #18103a; margin-bottom: 6px; }
.ai-clear-sub   { font-size: 12px; color: #8e7ec0; line-height: 1.5; margin-bottom: 20px; }
.ai-clear-btns  { display: flex; gap: 10px; width: 100%; }
.ai-clear-btn   { flex: 1; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; }
.ai-clear-cancel { background: rgba(124,58,237,0.08); color: #7c3aed; }
.ai-clear-cancel:hover { background: rgba(124,58,237,0.15); }
.ai-clear-ok    { background: linear-gradient(135deg,#7c3aed,#0d9488); color: #fff; box-shadow: 0 2px 8px rgba(124,58,237,0.3); }
.ai-clear-ok:hover { transform: translateY(-1px); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SUGGESTIONS = [
  "What courses should I focus on?",
  "How am I doing with my progress?",
  "What's available for me to learn?",
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChat({ userId, accessLevel, userName }: AIChatProps) {
  const [open,             setOpen]             = useState(false);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [historyLoaded,    setHistoryLoaded]    = useState(false);
  const [unread,           setUnread]           = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing,         setClearing]         = useState(false);
  const [lastFailedMsg,    setLastFailedMsg]    = useState<string | null>(null);

  const sessionId = useRef<string>(crypto.randomUUID());
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const initials   = userName
    ? userName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Load history on first open
  useEffect(() => {
    if (!open || historyLoaded) return;
    setHistoryLoaded(true);
    apiCall('/ai/chat/history').then(r => {
      if (r.success && Array.isArray(r.data)) {
        setMessages(r.data);
      }
    }).catch(() => {});
  }, [open, historyLoaded]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && !last.failed) setUnread(u => u + 1);
    }
  }, [messages]);

  const handleOpen = () => { setOpen(true); setUnread(0); };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setLastFailedMsg(null);

    console.group('%c[AIChat] 📤 Sending message', 'color:#a78bfa;font-weight:bold');
    console.log('%c💬 Message:', 'color:#60a5fa', trimmed);
    console.log('%c🔑 Session ID:', 'color:#60a5fa', sessionId.current);
    console.log('%c⏱ Started at:', 'color:#60a5fa', new Date().toLocaleTimeString());
    console.groupEnd();

    const startTs = Date.now();

    const thinkingInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
      console.log(`%c[AIChat] 🦙 Still thinking... ${elapsed}s elapsed`, 'color:#f59e0b;font-style:italic');
    }, 3000);

    try {
      console.log('%c[AIChat] 🌐 Calling /api/ai/chat...', 'color:#60a5fa');
      const r = await apiCall('/ai/chat', 'POST', { message: trimmed, session_id: sessionId.current });
      clearInterval(thinkingInterval);

      const totalElapsed = ((Date.now() - startTs) / 1000).toFixed(2);

      if (r._debug) {
        console.group('%c[AIChat] ✅ Response received', 'color:#34d399;font-weight:bold');
        console.log('%c⏱  Total elapsed:',    'color:#34d399', totalElapsed + 's');
        console.log('%c🦙  Ollama time:',      'color:#34d399', r._debug.elapsed_seconds + 's');
        console.log('%c📝  Reply chars:',      'color:#60a5fa', r._debug.reply_chars);
        console.log('%c📜  History msgs:',     'color:#60a5fa', r._debug.history_messages);
        console.log('%c👤  Context type:',     'color:#f59e0b', r._debug.context_type);
        console.log('%c📂  Training data:',    'color:#f59e0b', r._debug.training_chars + ' chars loaded');
        console.log('%c📋  Prompt size:',      'color:#f59e0b', r._debug.prompt_chars + ' chars');
        console.log('%c🤖  Model:',            'color:#a78bfa', r._debug.model);
        console.groupEnd();
      } else {
        console.log('%c[AIChat] ✅ Response in ' + totalElapsed + 's (no debug info)', 'color:#34d399');
      }

      if (r.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: r.reply,
          created_at: new Date().toISOString(),
        }]);
      } else {
        throw new Error(r.error ?? 'No reply received');
      }
    } catch (err) {
      clearInterval(thinkingInterval);
      const totalElapsed = ((Date.now() - startTs) / 1000).toFixed(2);
      console.group('%c[AIChat] ❌ Request failed', 'color:#f87171;font-weight:bold');
      console.log('%c⏱ Failed after:', 'color:#f87171', totalElapsed + 's');
      console.error('%c🔴 Error:', 'color:#f87171', err);
      console.groupEnd();

      setLastFailedMsg(trimmed);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Could not reach Aria. Please check your connection.',
        created_at: new Date().toISOString(),
        failed: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleRetry = () => {
    if (!lastFailedMsg) return;
    // Remove the last failed assistant message
    setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    sendMessage(lastFailedMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await apiCall('/ai/chat/clear', 'POST');
      setMessages([]);
      setLastFailedMsg(null);
      setShowClearConfirm(false);
    } catch {}
    setClearing(false);
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* Floating bubble button */}
      <button className="ai-bubble-btn" onClick={handleOpen} title="Chat with Aria">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 5L5 15M5 5l10 10"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5.19-1.45L2 22l1.45-4.81A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <div className="ai-unread">{unread > 9 ? '9+' : unread}</div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-panel">

          {/* Clear confirm overlay */}
          {showClearConfirm && (
            <div className="ai-clear-confirm">
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗑️</div>
              <div className="ai-clear-title">Clear chat history?</div>
              <div className="ai-clear-sub">
                Your messages will be archived for compliance.<br/>Your chat will start fresh.
              </div>
              <div className="ai-clear-btns">
                <button className="ai-clear-btn ai-clear-cancel" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                <button className="ai-clear-btn ai-clear-ok" onClick={handleClear} disabled={clearing}>
                  {clearing ? 'Clearing...' : 'Yes, clear it'}
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-icon">🤖</div>
            <div className="ai-header-info">
              <div className="ai-header-brand">GenieX</div>
              <div className="ai-header-title">Aria</div>
              <div className="ai-header-sub">
                {loading ? '✦ Thinking...' : '✦ Your Learning Assistant'}
              </div>
            </div>
            <div className="ai-header-actions">
              {messages.length > 0 && (
                <button className="ai-icon-btn" onClick={() => setShowClearConfirm(true)} title="Clear chat">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="3 6 4 14 12 14 13 6"/><path d="M1 6h14"/><path d="M6 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
              <button className="ai-icon-btn" onClick={() => setOpen(false)} title="Close">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.length === 0 && !loading ? (
              <div className="ai-empty">
                <div className="ai-empty-icon">✨</div>
                <div className="ai-empty-title">Hey{userName ? `, ${userName.split(' ')[0]}` : ''}!</div>
                <div className="ai-empty-sub">I'm Aria, your learning assistant.<br/>Ask me anything about your courses or progress.</div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`ai-msg ${m.role}`}>
                  <div className="ai-avatar">
                    {m.role === 'assistant' ? '🤖' : initials}
                  </div>
                  <div>
                    <div className={`ai-bubble${m.failed ? ' failed' : ''}`}>
                      {m.role === 'assistant' && !m.failed
                        ? <MarkdownMessage content={m.content} />
                        : m.content
                      }
                    </div>
                    {/* Retry button on failed messages */}
                    {m.failed && lastFailedMsg && (
                      <button className="ai-retry-btn" onClick={handleRetry}>
                        ↻ Retry
                      </button>
                    )}
                    {m.created_at && <div className="ai-ts">{formatTime(m.created_at)}</div>}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="ai-msg assistant">
                <div className="ai-avatar">🤖</div>
                <div className="ai-typing-indicator">
                  <div className="ai-typing-dot"/>
                  <div className="ai-typing-dot"/>
                  <div className="ai-typing-dot"/>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when empty) */}
          {messages.length === 0 && !loading && (
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="ai-suggestion" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input footer */}
          <div className="ai-footer">
            <div className="ai-input-wrap">
              <textarea
                ref={inputRef}
                className="ai-input"
                placeholder="Ask Aria anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
              />
            </div>
            <button
              className="ai-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              title="Send"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2L2 8l4 2 2 4 6-12z"/>
              </svg>
            </button>
          </div>

        </div>
      )}
    </>
  );
}
