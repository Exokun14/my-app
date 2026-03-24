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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api';

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
// Markdown renderer — bold uses teal on light bg
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#0d9488">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[\*\-] (.+)/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="margin:4px 0 6px 0;padding-left:16px;list-style:disc">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 6px 0">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p style="margin:0 0 6px 0">$1</p>');
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      style={{ fontSize: 13, lineHeight: 1.6, color: '#2d2555', wordBreak: 'break-word' }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyframe animations
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes ai-pop-in {
  0%   { opacity:0; transform:scale(0.88) translateY(18px); }
  60%  { transform:scale(1.02) translateY(-2px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes ai-fade-up {
  from { opacity:0; transform:translateY(7px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes ai-typing {
  0%,80%,100% { transform:scale(0); opacity:0.3; }
  40%         { transform:scale(1); opacity:1; }
}
@keyframes ai-expand {
  from { width:370px; max-height:calc(100vh - 120px); border-radius:20px; }
  to   { width:min(680px,calc(100vw - 48px)); max-height:calc(100vh - 80px); border-radius:24px; }
}
@keyframes ai-banner-in {
  from { opacity:0; transform:translateY(-8px); }
  to   { opacity:1; transform:translateY(0); }
}
.aria-pop { animation: ai-pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
.aria-msg { animation: ai-fade-up 0.22s ease both; }
.aria-dot { width:7px;height:7px;border-radius:50%;background:#7c3aed;animation:ai-typing 1.2s ease infinite;display:inline-block; }
.aria-dot:nth-child(2) { animation-delay:0.2s; }
.aria-dot:nth-child(3) { animation-delay:0.4s; }
.aria-btn-bubble:hover { transform:translateY(-3px) scale(1.05) !important; box-shadow:0 0 28px rgba(124,58,237,0.35),0 8px 24px rgba(124,58,237,0.18) !important; }
.aria-suggestion:hover { background:rgba(124,58,237,0.07) !important; border-color:rgba(124,58,237,0.35) !important; }
.aria-icon-btn:hover   { background:rgba(255,255,255,0.28) !important; }
.aria-send:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 16px rgba(124,58,237,0.45) !important; }
.aria-scroll::-webkit-scrollbar { width:4px; }
.aria-scroll::-webkit-scrollbar-track { background:transparent; }
.aria-scroll::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.2);border-radius:4px; }
.aria-panel-normal  { width:370px; max-height:calc(100vh - 120px); border-radius:20px; transition: width 0.32s cubic-bezier(0.16,1,0.3,1), max-height 0.32s cubic-bezier(0.16,1,0.3,1), border-radius 0.32s ease, right 0.32s cubic-bezier(0.16,1,0.3,1), bottom 0.32s cubic-bezier(0.16,1,0.3,1); }
.aria-panel-expanded { width:min(700px,calc(100vw - 48px)); max-height:calc(100vh - 80px); border-radius:24px; transition: width 0.32s cubic-bezier(0.16,1,0.3,1), max-height 0.32s cubic-bezier(0.16,1,0.3,1), border-radius 0.32s ease, right 0.32s cubic-bezier(0.16,1,0.3,1), bottom 0.32s cubic-bezier(0.16,1,0.3,1); }
.aria-banner-in { animation: ai-banner-in 0.3s ease 0.1s both; }
.aria-expand-btn:hover { background:rgba(255,255,255,0.28) !important; }
.aria-banner-chip:hover { background:rgba(124,58,237,0.1) !important; border-color:rgba(124,58,237,0.4) !important; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — light theme
// ─────────────────────────────────────────────────────────────────────────────
const BG        = '#f3f0ff';   // soft lavender message area
const PANEL_BG  = '#ffffff';   // white panel / footer
const MSG_BG    = '#ffffff';   // white assistant bubble
const PURPLE    = '#7c3aed';
const PURPLE2   = '#5b21b6';
const TEAL      = '#0d9488';
const WHITE     = '#ffffff';
const TEXT_MAIN = '#2d2555';   // deep indigo
const TEXT_DIM  = '#a89cc8';   // muted lavender
const BORDER    = 'rgba(124,58,237,0.15)';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChat({ userId, accessLevel, userName }: AIChatProps) {
  const [open,             setOpen]             = useState(false);
  const [expanded,         setExpanded]         = useState(false);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [historyLoaded,    setHistoryLoaded]    = useState(false);
  const [unread,           setUnread]           = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing,         setClearing]         = useState(false);
  const [lastFailedMsg,    setLastFailedMsg]    = useState<string | null>(null);
  const [suggestions,      setSuggestions]      = useState<string[]>([
    "What courses should I focus on?",
    "How am I doing with my progress?",
    "What's available for me to learn?",
  ]);

  const sessionId = useRef<string>(crypto.randomUUID());
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const initials   = userName
    ? userName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Load history once on mount — not tied to open so messages survive panel toggling
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    apiCall('/ai/chat/history').then(r => {
      if (r.success && Array.isArray(r.data)) setMessages(r.data);
    }).catch(() => {});
    // Fetch dynamic suggestions
    apiCall('/ai/chat/suggestions').then(r => {
      if (r.success && Array.isArray(r.data) && r.data.length > 0) {
        setSuggestions(r.data.slice(0, 3));
      }
    }).catch(() => {}); // silently fall back to defaults
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!open && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && !last.failed) setUnread(u => u + 1);
    }
  }, [messages]);

  const handleOpen = () => { setOpen(o => !o); setUnread(0); };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed, created_at: new Date().toISOString() }]);
    setInput('');
    setLoading(true);
    setLastFailedMsg(null);

    const startTs = Date.now();
    const thinkingInterval = setInterval(() => {
      console.log(`%c[AIChat] 🦙 Still thinking... ${((Date.now() - startTs) / 1000).toFixed(1)}s`, 'color:#f59e0b;font-style:italic');
    }, 3000);

    try {
      const r = await apiCall('/ai/chat', 'POST', { message: trimmed, session_id: sessionId.current });
      clearInterval(thinkingInterval);
      if (r.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: r.reply, created_at: new Date().toISOString() }]);
      } else {
        throw new Error(r.error ?? 'No reply received');
      }
    } catch (err) {
      clearInterval(thinkingInterval);
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
    setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    sendMessage(lastFailedMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
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

      {/* ── Floating bubble button ── */}
      <button
        className="aria-btn-bubble"
        onClick={handleOpen}
        title="Chat with Aria"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9998,
          width: 60, height: 60, borderRadius: 18,
          border: `2px solid rgba(124,58,237,0.35)`,
          cursor: 'pointer', background: 'transparent',
          boxShadow: '0 0 20px rgba(124,58,237,0.18), 0 4px 16px rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
          padding: 0, overflow: 'hidden',
        }}
      >
        <img src="/Aria-Icon.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', border: `2px solid ${WHITE}`,
            fontSize: 9, fontWeight: 800, color: WHITE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* ── Chat panel — always mounted, hidden via CSS so messages survive open/close/expand ── */}
      <div
        className={expanded ? 'aria-panel-expanded' : 'aria-panel-normal'}
        style={{
          position: 'fixed',
          bottom: expanded ? 24 : 96,
          right: expanded ? 24 : 28,
          zIndex: 9999,
          background: PANEL_BG,
          boxShadow: expanded
            ? '0 24px 72px rgba(124,58,237,0.18), 0 0 0 1.5px rgba(124,58,237,0.14)'
            : '0 16px 48px rgba(124,58,237,0.13), 0 0 0 1.5px rgba(124,58,237,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
          transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >

          {/* ── Clear confirm overlay ── */}
          {showClearConfirm && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 24, textAlign: 'center', borderRadius: 20,
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗑️</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_MAIN, marginBottom: 6 }}>Clear chat history?</div>
              <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5, marginBottom: 20 }}>
                Your messages will be archived for compliance.<br />Your chat will start fresh.
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${BORDER}`, background: 'rgba(124,58,237,0.06)', color: PURPLE, fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: `linear-gradient(135deg,${PURPLE},${TEAL})`, color: WHITE, boxShadow: '0 2px 8px rgba(124,58,237,0.3)', fontFamily: 'inherit' }}
                >
                  {clearing ? 'Clearing...' : 'Yes, clear it'}
                </button>
              </div>
            </div>
          )}

          {/* ── Header ── */}
          <div style={{
            padding: '14px 16px 12px',
            background: `linear-gradient(135deg, ${PURPLE} 0%, ${TEAL} 100%)`,
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <img src="/Aria-Icon.png" alt="Aria" style={{
                width: 42, height: 42, borderRadius: '50%',
                objectFit: 'cover', display: 'block',
                border: '2px solid rgba(255,255,255,0.6)',
              }} />
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                background: '#4ade80', border: '2px solid white',
              }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: '2.5px', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 1 }}>GenieX</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, letterSpacing: '0.3px', lineHeight: 1.1 }}>Aria</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                {loading ? '✦ Thinking...' : 'Your Learning Assistant'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {messages.length > 0 && (
                <button
                  className="aria-icon-btn"
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear chat"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s', padding: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="3 6 4 14 12 14 13 6"/><path d="M1 6h14"/><path d="M6 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
              {/* Expand / collapse button */}
              <button
                className="aria-icon-btn aria-expand-btn"
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Collapse' : 'Expand'}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s', padding: 0,
                }}
              >
                {expanded ? (
                  /* Collapse — inward arrows */
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v5H3M21 3l-7 7M16 21v-5h5M3 21l7-7"/>
                  </svg>
                ) : (
                  /* Expand — outward arrows */
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                )}
              </button>
              <button
                className="aria-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s', padding: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Banner (expanded mode only) ── */}
          {expanded && (
            <div
              className="aria-banner-in"
              style={{
                flexShrink: 0,
                background: 'linear-gradient(135deg, #f3f0ff 0%, #e8f4ff 100%)',
                borderBottom: `1.5px solid ${BORDER}`,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 200,
              }}
            >
              {/* Subtle sparkle dots */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none', background: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 30%, rgba(13,148,136,0.1) 0%, transparent 50%)' }} />

              {/* Left: text + chips */}
              <div style={{ padding: '20px 20px 18px', maxWidth: '58%', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 9, letterSpacing: '2px', color: PURPLE, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, opacity: 0.7 }}>GenieX Learning</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_MAIN, lineHeight: 1.3, marginBottom: 4 }}>
                  {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}! I'm <span style={{ color: PURPLE }}>Aria</span>,
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_MAIN, marginBottom: 10, opacity: 0.8 }}>your learning assistant.</div>
                <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.5, marginBottom: 12 }}>
                  Ask me anything about your courses or progress.
                </div>
                {/* Quick chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="aria-banner-chip"
                      onClick={() => sendMessage(s)}
                      style={{
                        padding: '5px 10px', borderRadius: 20,
                        border: `1.5px solid ${i === 1 ? 'rgba(13,148,136,0.3)' : BORDER}`,
                        background: WHITE, fontSize: 10.5,
                        color: i === 1 ? TEAL : PURPLE,
                        fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Right: Aria image */}
              <img
                src="/Aria.png"
                alt="Aria"
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  height: 200,
                  width: 'auto',
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  zIndex: 2,
                  filter: 'drop-shadow(-4px 0 12px rgba(124,58,237,0.12))',
                }}
              />
            </div>
          )}

          {/* ── Messages ── */}
          <div
            className="aria-scroll"
            style={{
              flex: 1, overflowY: 'auto',
              padding: '16px 14px 8px',
              display: 'flex', flexDirection: 'column', gap: 12,
              minHeight: 0, background: BG,
            }}
          >
            {messages.length === 0 && !loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 18,
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, marginBottom: 14,
                }}>✨</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN, marginBottom: 6 }}>
                  {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: TEXT_DIM, maxWidth: 220 }}>
                  I'm Aria, your learning assistant.<br />Ask me anything about your courses or progress.
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className="aria-msg"
                  style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...(m.role === 'assistant'
                      ? { background: `linear-gradient(135deg,${PURPLE},${TEAL})` }
                      : { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }
                    ),
                  }}>
                    {m.role === 'assistant' ? (
                      <img src="/Aria-Icon.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7, display: 'block' }} />
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 800, color: PURPLE }}>{initials}</span>
                    )}
                  </div>

                  {/* Bubble + meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '80%', gap: 4 }}>
                    <div style={{
                      padding: '10px 13px',
                      borderRadius: m.role === 'assistant' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      wordBreak: 'break-word',
                      ...(m.role === 'assistant'
                        ? m.failed
                          ? { background: '#fff5f5', border: '1.5px solid rgba(239,68,68,0.2)', color: '#b91c1c' }
                          : { background: MSG_BG, border: `1.5px solid ${BORDER}`, color: TEXT_MAIN, boxShadow: '0 1px 4px rgba(124,58,237,0.07)' }
                        : { background: `linear-gradient(135deg,${PURPLE},${PURPLE2})`, color: WHITE }
                      ),
                    }}>
                      {m.role === 'assistant' && !m.failed
                        ? <MarkdownMessage content={m.content} />
                        : <span style={{ fontSize: 13, lineHeight: 1.6 }}>{m.content}</span>
                      }
                    </div>

                    {m.failed && lastFailedMsg && (
                      <button
                        onClick={handleRetry}
                        style={{
                          padding: '4px 10px', fontSize: 11, fontWeight: 600,
                          background: 'rgba(124,58,237,0.08)',
                          border: '1.5px solid rgba(124,58,237,0.2)',
                          borderRadius: 8, color: PURPLE, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontFamily: 'inherit', alignSelf: 'flex-start',
                        }}
                      >↻ Retry</button>
                    )}

                    {m.created_at && (
                      <div style={{
                        fontSize: 10, color: TEXT_DIM,
                        textAlign: m.role === 'user' ? 'right' : 'left',
                        paddingLeft: m.role === 'assistant' ? 2 : 0,
                        paddingRight: m.role === 'user' ? 2 : 0,
                      }}>
                        {formatTime(m.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="aria-msg" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9, flexShrink: 0, marginTop: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <img src="/Aria-Icon.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{
                  background: MSG_BG,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: '4px 14px 14px 14px',
                  padding: '11px 15px',
                  display: 'flex', gap: 5, alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(124,58,237,0.07)',
                }}>
                  <div className="aria-dot"/>
                  <div className="aria-dot"/>
                  <div className="aria-dot"/>
                </div>
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* ── Suggestions (empty state only) ── */}
          {messages.length === 0 && !loading && (
            <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 7, background: BG }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="aria-suggestion"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: i === 1 ? 'rgba(13,148,136,0.06)' : WHITE,
                    border: `1.5px solid ${i === 1 ? 'rgba(13,148,136,0.28)' : BORDER}`,
                    fontSize: 12.5,
                    color: i === 1 ? TEAL : PURPLE,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(124,58,237,0.06)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input footer ── */}
          <div style={{
            padding: '10px 12px 14px',
            borderTop: `1.5px solid ${BORDER}`,
            background: PANEL_BG,
            display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
          }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'flex-end',
              background: WHITE,
              border: `1.5px solid rgba(124,58,237,0.18)`,
              borderRadius: 12, padding: '9px 12px',
            }}>
              <textarea
                ref={inputRef}
                placeholder="Ask Aria anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent',
                  fontSize: 13, color: TEXT_MAIN,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  resize: 'none', maxHeight: 80, lineHeight: 1.5,
                  width: '100%', display: 'block', padding: 0, margin: 0,
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              title="Send"
              className="aria-send"
              style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `linear-gradient(135deg,${PURPLE},${TEAL})`,
                border: 'none', cursor: 'pointer', color: WHITE,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
                opacity: (!input.trim() || loading) ? 0.4 : 1,
                transition: 'all 0.15s', padding: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2L2 8l4 2 2 4 6-12z"/>
              </svg>
            </button>
          </div>

        </div>
    </>
  );
}
