'use client'

import { useState, useRef, useEffect, useCallback } from "react";
import THINKING_JSON from "./thinking_messages.json";

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

interface ThinkingEntry {
  text: string;
  after_seconds: number;
}

const API_BASE = 'http://localhost/api';

// ─────────────────────────────────────────────────────────────────────────────
// Thinking messages — loaded from thinking_messages.json, time-based sequencing
// ─────────────────────────────────────────────────────────────────────────────
type ThinkingMessagesMap = Record<string, ThinkingEntry[]>;

// Strip metadata keys (prefixed with _) from the JSON
const THINKING_MESSAGES = Object.fromEntries(
  Object.entries(THINKING_JSON as Record<string, unknown>)
    .filter(([k]) => !k.startsWith('_'))
) as ThinkingMessagesMap;

function getThinkingIntent(message: string): string {
  const m = message.toLowerCase();
  let intent = 'default';
  if (m.includes('full report') || m.includes('overview') || m.includes('everything') || m.includes('all data')) intent = 'full_report';
  else if (m.includes('top item') || m.includes('best sell') || m.includes('most sold')) intent = 'top_items';
  else if (m.includes('my sales') || m.includes('my performance') || m.includes('how am i doing')) intent = 'cashier_self';
  else if (m.includes('cashier') || m.includes('staff') || m.includes('performer') || m.includes('ranking')) intent = 'cashier_perf';
  else if (m.includes('branch') || m.includes('store') || m.includes('location') || m.includes('compar')) {
    if (m.includes('name') || m.includes('list') || m.includes('all') || m.includes('how many') || m.includes('which') || m.includes('what')) intent = 'store_list';
    else intent = 'store_compare';
  }
  else if (m.includes('return') || m.includes('refund') || m.includes('discount')) intent = 'returns';
  else if (m.includes('hour') || m.includes('peak')) intent = 'hourly';
  else if (m.includes('trend') || m.includes('daily') || m.includes('last few days')) intent = 'trend';
  else if (m.includes('this year') || m.includes('annual') || m.includes('yearly')) intent = 'yearly';
  else if (m.includes('this month') || m.includes('monthly')) intent = 'monthly';
  else if (m.includes('this week') || m.includes('weekly') || m.includes('last 7')) intent = 'weekly';
  else if (m.includes('today') || m.includes('sales') || m.includes('revenue') || m.includes('transaction')) intent = 'today_summary';
  else if (m.includes('course') || m.includes('learn') || m.includes('training') || m.includes('lesson')) intent = 'learning';
  else if (m.includes('hello') || m.includes('hi ') || m.includes('hey') || m.includes('good morning') || m.includes('good afternoon')) intent = 'greeting';
  else if (m.includes('what can you') || m.includes('help me') || m.includes('what do you')) intent = 'capability';

  console.log(
    `%c[Aria Intent] %c"${message.slice(0, 60)}${message.length > 60 ? '…' : ''}" %c→ ${intent}`,
    'color:#7c3aed;font-weight:bold',
    'color:#2d2555',
    'color:#0d9488;font-weight:bold',
  );
  return intent;
}

function getThinkingEntries(message: string): ThinkingEntry[] {
  const intent = getThinkingIntent(message);
  return THINKING_MESSAGES[intent] ?? THINKING_MESSAGES['default'];
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────
function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// makeApiCall is the core fetcher. userId/accessLevel are passed explicitly
// so the component props are always used as the primary source of truth.
// sessionStorage is only used as a fallback (e.g. if called outside the component).
async function makeApiCall(
  endpoint: string,
  method = 'GET',
  body?: object,
  timeoutMs = 600000,
  authOverride?: { userId: number; accessLevel: string },
) {
  const _s  = 'color:#7c3aed;font-weight:bold';
  const _ok = 'color:#0d9488;font-weight:bold';
  const _w  = 'color:#f59e0b;font-weight:bold';
  const _e  = 'color:#ef4444;font-weight:bold';
  const _d  = 'color:#a89cc8';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Primary: use explicitly passed auth values
  let authSource = 'none';
  if (authOverride?.userId) {
    headers['X-User-Id']      = String(authOverride.userId);
    headers['X-Access-Level'] = authOverride.accessLevel ?? 'user';
    authSource = 'prop';
  } else {
    // Fallback: try sessionStorage (legacy path)
    try {
      const raw = sessionStorage.getItem('gx_user_profile');
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.id)          headers['X-User-Id']      = String(p.id);
        if (p?.accessLevel) headers['X-Access-Level'] = p.accessLevel;
        authSource = 'sessionStorage';
      }
    } catch {}
  }

  const csrf = getCsrfToken();
  const hasCsrf = !!(csrf && method !== 'GET');
  if (hasCsrf) headers['X-XSRF-TOKEN'] = csrf;

  // ── Verbose request log ──────────────────────────────────────────────────
  console.group(`%c[Aria API] %c${method} ${endpoint}`, _s, _ok);
  console.log('%cAuth source:', _d, authSource,
    '| User-Id:', headers['X-User-Id'] ?? '—',
    '| Access-Level:', headers['X-Access-Level'] ?? '—');
  console.log('%cCSRF:', _d, hasCsrf ? '✅ attached' : '⚠️ none (GET or missing cookie)');
  console.log('%cTimeout:', _d, `${(timeoutMs / 1000).toFixed(0)}s`);
  if (body) console.log('%cPayload:', _d, body);
  console.groupEnd();

  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`%c[Aria API] ⏱ Timeout after ${timeoutMs / 1000}s — aborting ${method} ${endpoint}`, _w);
    controller.abort();
  }, timeoutMs);

  const t0 = Date.now();
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

    if (!res.ok) {
      console.group(`%c[Aria API] ❌ HTTP ${res.status} — ${method} ${endpoint}  (+${elapsed}s)`, _e);
      console.log('%cStatus text:', _d, res.statusText);
      console.log('%cHeaders:', _d, Object.fromEntries(res.headers.entries()));
      console.groupEnd();
    } else {
      console.log(`%c[Aria API] ✅ ${res.status} — ${method} ${endpoint}  (+${elapsed}s)`, _ok);
    }

    const json = await res.json();

    if (json?.error || json?.message) {
      console.warn(`%c[Aria API] ⚠️ Server message on ${endpoint}:`, _w, json.error ?? json.message);
    }

    return json;
  } catch (err: any) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (err?.name === 'AbortError') {
      console.error(`%c[Aria API] 🚫 Request aborted (timeout) — ${method} ${endpoint}  (+${elapsed}s)`, _e);
    } else {
      console.error(`%c[Aria API] 💥 Fetch error — ${method} ${endpoint}  (+${elapsed}s)`, _e, err?.message ?? err);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#0d9488">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^[\*\-] (.+)/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="margin:4px 0 6px 0;padding-left:16px;list-style:disc">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 6px 0">')
    .replace(/\n/g,   '<br/>')
    .replace(/^(.+)/gm, (match) => match.startsWith('<') ? match : `<p style="margin:0 0 6px 0">${match}</p>`);
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
// Styles
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
@keyframes ai-thinking-fade {
  0%   { opacity:0; transform:translateY(4px); }
  15%  { opacity:1; transform:translateY(0); }
  85%  { opacity:1; transform:translateY(0); }
  100% { opacity:0; transform:translateY(-4px); }
}
@keyframes ai-banner-in {
  from { opacity:0; transform:translateY(-8px); }
  to   { opacity:1; transform:translateY(0); }
}
.aria-pop          { animation: ai-pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
.aria-msg          { animation: ai-fade-up 0.22s ease both; }
.aria-dot          { width:7px;height:7px;border-radius:50%;background:#7c3aed;animation:ai-typing 1.2s ease infinite;display:inline-block; }
.aria-dot:nth-child(2) { animation-delay:0.2s; }
.aria-dot:nth-child(3) { animation-delay:0.4s; }
.aria-thinking-txt { animation: ai-thinking-fade 5s ease infinite; font-size:11px; color:#7c3aed; font-style:italic; font-weight:500; }
.aria-btn-bubble:hover { transform:translateY(-3px) scale(1.05) !important; box-shadow:0 0 28px rgba(124,58,237,0.35),0 8px 24px rgba(124,58,237,0.18) !important; }
.aria-suggestion:hover { background:rgba(124,58,237,0.07) !important; border-color:rgba(124,58,237,0.35) !important; }
.aria-icon-btn:hover   { background:rgba(255,255,255,0.28) !important; }
.aria-send:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 16px rgba(124,58,237,0.45) !important; }
.aria-scroll::-webkit-scrollbar { width:4px; }
.aria-scroll::-webkit-scrollbar-track { background:transparent; }
.aria-scroll::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.2);border-radius:4px; }
.aria-panel-normal  { width:370px; max-height:calc(100vh - 120px); border-radius:20px; transition: width 0.32s cubic-bezier(0.16,1,0.3,1), max-height 0.32s cubic-bezier(0.16,1,0.3,1), border-radius 0.32s ease, right 0.32s, bottom 0.32s; }
.aria-panel-expanded { width:min(700px,calc(100vw - 48px)); max-height:calc(100vh - 80px); border-radius:24px; transition: width 0.32s cubic-bezier(0.16,1,0.3,1), max-height 0.32s cubic-bezier(0.16,1,0.3,1), border-radius 0.32s ease, right 0.32s, bottom 0.32s; }
.aria-banner-in    { animation: ai-banner-in 0.3s ease 0.1s both; }
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

// Design tokens
const BG        = '#f3f0ff';
const PANEL_BG  = '#ffffff';
const MSG_BG    = '#ffffff';
const PURPLE    = '#7c3aed';
const PURPLE2   = '#5b21b6';
const TEAL      = '#0d9488';
const WHITE     = '#ffffff';
const TEXT_MAIN = '#2d2555';
const TEXT_DIM  = '#a89cc8';
const BORDER    = 'rgba(124,58,237,0.15)';

// ─────────────────────────────────────────────────────────────────────────────
// Animated thinking indicator — time-based sequencing via after_seconds
// ─────────────────────────────────────────────────────────────────────────────
function ThinkingIndicator({ entries }: { entries: ThinkingEntry[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setIdx(0);
    setVisible(true);
  }, [entries]);

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      // Find the last entry whose after_seconds <= elapsed
      let next = 0;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (elapsed >= entries[i].after_seconds) { next = i; break; }
      }
      if (next !== idx) {
        setVisible(false);
        setTimeout(() => { setIdx(next); setVisible(true); }, 350);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [entries, idx]);

  return (
    <div className="aria-msg" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0, marginTop: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <img src="/Aria-Icon.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{
        background: MSG_BG, border: `1.5px solid ${BORDER}`,
        borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: '0 1px 4px rgba(124,58,237,0.07)', minWidth: 140,
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <div className="aria-dot"/>
          <div className="aria-dot"/>
          <div className="aria-dot"/>
        </div>
        {/* Animated status text */}
        <div style={{
          fontSize: 11, color: PURPLE, fontStyle: 'italic', fontWeight: 500,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          whiteSpace: 'nowrap',
        }}>
          {entries[idx]?.text}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function AIChat({ userId, accessLevel, userName }: AIChatProps) {
  const [open,             setOpen]             = useState(false);
  const [expanded,         setExpanded]         = useState(false);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [currentMsg,       setCurrentMsg]       = useState('');
  const [historyLoaded,    setHistoryLoaded]    = useState(false);
  const [unread,           setUnread]           = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing,         setClearing]         = useState(false);
  const [lastFailedMsg,    setLastFailedMsg]    = useState<string | null>(null);
  const [suggestions,      setSuggestions]      = useState<string[]>([
    "How are we doing with sales today?",
    "What are the top selling items?",
    "Show me the cashier rankings",
  ]);

  const sessionId = useRef<string>(
    (() => {
      try {
        const existing = sessionStorage.getItem('aria_session_id');
        if (existing) return existing;
        const fresh = crypto.randomUUID();
        sessionStorage.setItem('aria_session_id', fresh);
        return fresh;
      } catch {
        return crypto.randomUUID();
      }
    })()
  );
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const initials   = userName
    ? userName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Convenience wrapper — always injects the component's own userId/accessLevel
  const apiCall = useCallback(
    (endpoint: string, method = 'GET', body?: object, timeoutMs = 600000) =>
      makeApiCall(endpoint, method, body, timeoutMs, { userId, accessLevel }),
    [userId, accessLevel],
  );

  // Load history + suggestions on mount
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);

    const _s = 'color:#7c3aed;font-weight:bold';
    const _ok = 'color:#0d9488;font-weight:bold';
    const _w = 'color:#f59e0b;font-weight:bold';

    console.log('%c[Aria Init] Loading history + suggestions…', _s,
      '| userId:', userId, '| accessLevel:', accessLevel);

    apiCall('/ai/chat/history').then(r => {
      if (r.success && Array.isArray(r.data)) {
        console.log(`%c[Aria Init] ✅ History loaded — ${r.data.length} message(s)`, _ok);
        setMessages(r.data);
      } else {
        console.warn('%c[Aria Init] ⚠️ History response unexpected:', _w, r);
      }
    }).catch((e) => {
      console.error('%c[Aria Init] ❌ Failed to load history:', 'color:#ef4444;font-weight:bold', e?.message ?? e);
    });

    apiCall('/ai/chat/suggestions').then(r => {
      if (r.success && Array.isArray(r.data) && r.data.length > 0) {
        console.log(`%c[Aria Init] ✅ Suggestions loaded — ${r.data.length} item(s):`, _ok, r.data);
        setSuggestions(r.data.slice(0, 3));
      } else {
        console.warn('%c[Aria Init] ⚠️ Suggestions response unexpected (using defaults):', _w, r);
      }
    }).catch((e) => {
      console.warn('%c[Aria Init] ⚠️ Failed to load suggestions (using defaults):', _w, e?.message ?? e);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (!open && messages.length > prev) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && !last.failed) setUnread(u => u + 1);
    }
  }, [messages, open]);

  const handleOpen = () => { setOpen(o => { if (!o) setUnread(0); return !o; }); };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed, created_at: new Date().toISOString() }]);
    setInput('');
    setLoading(true);
    setCurrentMsg(trimmed);
    setLastFailedMsg(null);

    const startTs    = Date.now();
    const sid        = sessionId.current;
    const style      = 'color:#7c3aed;font-weight:bold';
    const styleStage = 'color:#0d9488;font-weight:bold';
    const styleTime  = 'color:#f59e0b';
    const styleErr   = 'color:#ef4444;font-weight:bold';

    const isFullReport = /full report|overview|everything|all data/i.test(trimmed);
    const timeoutMs    = isFullReport ? 600000 : 300000;

    console.group(`%c[Aria Send] New message`, style);
    console.log('%cText:', styleStage, trimmed);
    console.log('%cSession:', styleStage, sid);
    console.log('%cUser ID:', styleStage, userId, '| Access Level:', accessLevel);
    console.log('%cDetected full-report:', styleTime, isFullReport ? '⚡ Yes — 600s timeout' : 'No — 300s timeout');
    console.groupEnd();

    // ── Open SSE stream for console-only stage logging ──────────────────────
    let sseSource: EventSource | null = null;
    try {
      const sseUrl = `${API_BASE}/ai/chat/stream?session_id=${sid}&user_id=${userId}&access_level=${accessLevel}`;
      console.log('%c[Aria SSE] Opening stream…', style, sseUrl);

      sseSource = new EventSource(sseUrl);

      sseSource.addEventListener('connected', () => {
        console.group('%c[Aria SSE] ✅ Stream connected', style);
        console.log('%cSession:', styleStage, sid);
        console.log('%cMessage:', styleStage, trimmed.slice(0, 80));
        console.groupEnd();
      });

      sseSource.addEventListener('stage', (e: MessageEvent) => {
        try {
          const d       = JSON.parse(e.data);
          const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
          console.log(
            `%c[Aria SSE] %c${d.label}%c  (+${elapsed}s)  [${d.intent_label ?? d.intent ?? '?'}]`,
            style, styleStage, styleTime,
          );
          if (d.detail) console.log('%c  ↳ detail:', styleTime, d.detail);
        } catch {
          console.warn('%c[Aria SSE] ⚠️ Could not parse stage event:', styleTime, e.data);
        }
      });

      sseSource.addEventListener('heartbeat', () => {
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
        console.log(`%c[Aria SSE] ♡ heartbeat  +${elapsed}s`, 'color:#a89cc8;font-style:italic');
      });

      sseSource.addEventListener('close', () => {
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
        console.log(`%c[Aria SSE] ✅ Stream closed  total: ${elapsed}s`, style);
        sseSource?.close();
      });

      sseSource.addEventListener('timeout', () => {
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
        console.warn(`%c[Aria SSE] ⏱ Stream timed out  +${elapsed}s`, styleErr);
        sseSource?.close();
      });

      sseSource.addEventListener('error_event', (e: MessageEvent) => {
        console.error('%c[Aria SSE] 🔴 Server error event:', styleErr, e.data);
      });

      sseSource.onerror = (e) => {
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
        console.warn(`%c[Aria SSE] ⚠️ SSE connection error (non-fatal)  +${elapsed}s`, styleTime, e);
        sseSource?.close();
      };
    } catch (sseErr: any) {
      console.warn('%c[Aria SSE] ⚠️ Failed to open SSE stream (non-fatal):', styleTime, sseErr?.message ?? sseErr);
    }

    try {
      console.log(`%c[Aria API] ➡ POST /ai/chat — waiting for response…`, style);
      const r = await apiCall('/ai/chat', 'POST', { message: trimmed, session_id: sid }, timeoutMs);
      const total = ((Date.now() - startTs) / 1000).toFixed(1);

      // Close SSE stream
      sseSource?.close();

      // Log full raw response (collapsed)
      console.groupCollapsed(`%c[Aria Debug] Raw response  (+${total}s)`, style);
      console.log(r);
      console.groupEnd();

      // Log debug info to console
      if (r._debug) {
        const d = r._debug;
        console.group('%c[Aria Debug] Performance breakdown', style);
        console.log('%cIntent:',         styleStage, d.intent_label ?? d.intent ?? '—');
        console.log('%cData Sources:',   styleStage, d.data_sources ?? 'n/a');
        console.log('%cQueries Run:',    styleStage, d.queries_run ?? 0);
        console.log('%cModel:',          styleStage, d.model ?? '—');
        console.log('%cOllama Time:',    styleTime,  `${d.elapsed_s ?? '?'}s`);
        console.log('%cTotal Time:',     styleTime,  `${total}s`);
        console.log('%cPrompt Size:',    styleStage, `${d.prompt_chars ?? '?'} chars`);
        console.log('%cInstant reply:',  styleStage, d.is_instant ? '⚡ Yes' : 'No');
        console.log('%cCache hit:',      styleStage, d.cache_hit ? '✅ Yes' : 'No');
        console.groupEnd();
      } else {
        console.warn('%c[Aria Debug] ⚠️ No _debug block in response — backend may not be sending it', styleTime);
      }

      if (r.reply) {
        console.log(`%c[Aria Debug] ✅ Reply received — ${r.reply.length} chars`, styleStage);
        setMessages(prev => [...prev, { role: 'assistant', content: r.reply, created_at: new Date().toISOString() }]);
      } else {
        console.error('%c[Aria Debug] ❌ No reply field in response:', styleErr, r);
        throw new Error(r.error ?? 'No reply received');
      }
    } catch (err: any) {
      sseSource?.close();
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
      const isTimeout = err?.name === 'AbortError';
      setLastFailedMsg(trimmed);
      console.group(`%c[Aria Debug] ❌ ${isTimeout ? 'Timeout' : 'Error'}  (+${elapsed}s)`, styleErr);
      console.error('Name:', err?.name);
      console.error('Message:', err?.message ?? err);
      if (err?.stack) console.error('Stack:', err.stack);
      console.groupEnd();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isTimeout
          ? 'That one took a bit too long on my end — sorry about that! Try asking something more specific, or tap Retry to try again.'
          : 'Could not reach Aria. Please check your connection and try again.',
        created_at: new Date().toISOString(),
        failed: true,
      }]);
    } finally {
      setLoading(false);
      setCurrentMsg('');
    }
  }, [loading, apiCall, userId, accessLevel]);

  const handleRetry = () => {
    if (!lastFailedMsg) return;
    console.log('%c[Aria Retry] Retrying last failed message:', 'color:#7c3aed;font-weight:bold', lastFailedMsg);
    setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    sendMessage(lastFailedMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleClear = async () => {
    console.log('%c[Aria Clear] Clearing chat history…', 'color:#7c3aed;font-weight:bold');
    setClearing(true);
    try {
      await apiCall('/ai/chat/clear', 'POST');
      console.log('%c[Aria Clear] ✅ History cleared', 'color:#0d9488;font-weight:bold');
      setMessages([]);
      setLastFailedMsg(null);
      setShowClearConfirm(false);
    } catch (e: any) {
      console.error('%c[Aria Clear] ❌ Failed to clear history:', 'color:#ef4444;font-weight:bold', e?.message ?? e);
    }
    setClearing(false);
  };

  // Get thinking entries for current user message
  const thinkingEntries = getThinkingEntries(currentMsg);

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating bubble ── */}
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

      {/* ── Chat panel ── */}
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
              >Cancel</button>
              <button
                onClick={handleClear}
                disabled={clearing}
                style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: `linear-gradient(135deg,${PURPLE},${TEAL})`, color: WHITE, boxShadow: '0 2px 8px rgba(124,58,237,0.3)', fontFamily: 'inherit' }}
              >{clearing ? 'Clearing...' : 'Yes, clear it'}</button>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{
          padding: '14px 16px 12px',
          background: `linear-gradient(135deg, ${PURPLE} 0%, ${TEAL} 100%)`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)' }}>
              <img src="/Aria-Icon.png" alt="Aria" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#4ade80', border: '2px solid white' }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '2.5px', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 1 }}>GenieX</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: WHITE, letterSpacing: '0.3px', lineHeight: 1.1 }}>Aria</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', animation: 'ai-typing 1.2s ease infinite' }}/>
                  {thinkingEntries[0]?.text}
                </span>
              ) : 'Your Sales & Learning Assistant'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {messages.length > 0 && (
              <button
                className="aria-icon-btn"
                onClick={() => setShowClearConfirm(true)}
                title="Clear chat"
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', padding: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="3 6 4 14 12 14 13 6"/><path d="M1 6h14"/><path d="M6 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
            <button
              className="aria-icon-btn aria-expand-btn"
              onClick={() => setExpanded(e => !e)}
              title={expanded ? 'Collapse' : 'Expand'}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', padding: 0 }}
            >
              {expanded ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v5H3M21 3l-7 7M16 21v-5h5M3 21l7-7"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              )}
            </button>
            <button
              className="aria-icon-btn"
              onClick={() => setOpen(false)}
              title="Close"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Banner (expanded only) ── */}
        {expanded && (
          <div className="aria-banner-in" style={{ flexShrink: 0, background: 'linear-gradient(135deg, #f3f0ff 0%, #e8f4ff 100%)', borderBottom: `1.5px solid ${BORDER}`, position: 'relative', overflow: 'hidden', minHeight: 200 }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none', background: 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 30%, rgba(13,148,136,0.1) 0%, transparent 50%)' }} />
            <div style={{ padding: '20px 20px 18px', maxWidth: '58%', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: '2px', color: PURPLE, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, opacity: 0.7 }}>GenieX</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_MAIN, lineHeight: 1.3, marginBottom: 4 }}>
                {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}! I'm <span style={{ color: PURPLE }}>Aria</span>,
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_MAIN, marginBottom: 10, opacity: 0.8 }}>your sales & learning assistant.</div>
              <div style={{ fontSize: 11, color: TEXT_DIM, lineHeight: 1.5, marginBottom: 12 }}>
                Ask me about sales, top items, cashier performance, or your courses.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="aria-banner-chip"
                    onClick={() => sendMessage(s)}
                    style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${i === 1 ? 'rgba(13,148,136,0.3)' : BORDER}`, background: WHITE, fontSize: 10.5, color: i === 1 ? TEAL : PURPLE, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                  >{s}</button>
                ))}
              </div>
            </div>
            <img src="/Aria.png" alt="Aria" style={{ position: 'absolute', right: 0, bottom: 0, height: 200, width: 'auto', objectFit: 'contain', objectPosition: 'bottom', zIndex: 2, filter: 'drop-shadow(-4px 0 12px rgba(124,58,237,0.12))' }} />
          </div>
        )}

        {/* ── Messages ── */}
        <div
          className="aria-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, background: BG }}
        >
          {messages.length === 0 && !loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN, marginBottom: 6 }}>
                {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: TEXT_DIM, maxWidth: 220 }}>
                I'm Aria, your sales & learning assistant.<br />Ask me about sales, top items, or your courses.
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

                {/* Bubble */}
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
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.2)', borderRadius: 8, color: PURPLE, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', alignSelf: 'flex-start' }}
                    >↻ Retry</button>
                  )}

                  {m.created_at && (
                    <div style={{ fontSize: 10, color: TEXT_DIM, textAlign: m.role === 'user' ? 'right' : 'left', paddingLeft: m.role === 'assistant' ? 2 : 0, paddingRight: m.role === 'user' ? 2 : 0 }}>
                      {formatTime(m.created_at)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Animated thinking indicator */}
          {loading && <ThinkingIndicator entries={thinkingEntries} />}

          <div ref={bottomRef}/>
        </div>

        {/* ── Suggestions (empty state) ── */}
        {messages.length === 0 && !loading && (
          <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 7, background: BG }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="aria-suggestion"
                onClick={() => sendMessage(s)}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: i === 1 ? 'rgba(13,148,136,0.06)' : WHITE,
                  border: `1.5px solid ${i === 1 ? 'rgba(13,148,136,0.28)' : BORDER}`,
                  fontSize: 12.5,
                  color: i === 1 ? TEAL : PURPLE,
                  fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s', fontFamily: 'inherit', width: '100%',
                  boxShadow: '0 1px 3px rgba(124,58,237,0.06)',
                }}
              >{s}</button>
            ))}
          </div>
        )}

        {/* ── Input footer ── */}
        <div style={{ padding: '10px 12px 14px', borderTop: `1.5px solid ${BORDER}`, background: PANEL_BG, display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', background: WHITE, border: `1.5px solid rgba(124,58,237,0.18)`, borderRadius: 12, padding: '9px 12px' }}>
            <textarea
              ref={inputRef}
              placeholder="Ask Aria anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: TEXT_MAIN, fontFamily: "'DM Sans', system-ui, sans-serif", resize: 'none', maxHeight: 80, lineHeight: 1.5, width: '100%', display: 'block', padding: 0, margin: 0 }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            title="Send"
            className="aria-send"
            style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `linear-gradient(135deg,${PURPLE},${TEAL})`, border: 'none', cursor: 'pointer', color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(124,58,237,0.3)', opacity: (!input.trim() || loading) ? 0.4 : 1, transition: 'all 0.15s', padding: 0 }}
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
