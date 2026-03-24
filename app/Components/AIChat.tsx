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
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#7c3aed">$1</strong>')
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
      style={{fontSize:12.5,lineHeight:1.6,color:'#3b2f6e',wordBreak:'break-word'}}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyframe animations (minimal — only what can't be inlined)
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
@keyframes ai-typing {
  0%,80%,100% { transform:scale(0); opacity:0.3; }
  40%         { transform:scale(1); opacity:1; }
}
.aria-pop    { animation: ai-pop-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
.aria-msg    { animation: ai-fade-up 0.22s ease both; }
.aria-dot    { width:6px;height:6px;border-radius:50%;background:#a78bfa;animation:ai-typing 1.2s ease infinite;display:inline-block; }
.aria-dot:nth-child(2) { animation-delay:0.2s; }
.aria-dot:nth-child(3) { animation-delay:0.4s; }
.aria-btn-bubble:hover { transform:translateY(-3px) scale(1.05) !important; border-color:rgba(124,58,237,0.7) !important; box-shadow:0 0 28px rgba(124,58,237,0.35),0 8px 24px rgba(124,58,237,0.18) !important; }
.aria-suggestion:hover { background:rgba(124,58,237,0.06) !important; border-color:rgba(124,58,237,0.4) !important; }
.aria-icon-btn:hover   { background:rgba(255,255,255,0.28) !important; }
.aria-send:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.4) !important; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    ? userName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  useEffect(() => {
    if (!open || historyLoaded) return;
    setHistoryLoaded(true);
    apiCall('/ai/chat/history').then(r => {
      if (r.success && Array.isArray(r.data)) setMessages(r.data);
    }).catch(() => {});
  }, [open, historyLoaded]);

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

  const handleOpen = () => { setOpen(true); setUnread(0); };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed, created_at: new Date().toISOString() }]);
    setInput('');
    setLoading(true);
    setLastFailedMsg(null);

    const startTs = Date.now();
    const thinkingInterval = setInterval(() => {
      console.log(`%c[AIChat] 🦙 Still thinking... ${((Date.now()-startTs)/1000).toFixed(1)}s`, 'color:#f59e0b;font-style:italic');
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

  // ── Design tokens (matching aria_design_mix light)
  const BG      = '#f3f0ff';   // lavender area background
  const WHITE   = '#ffffff';
  const PURPLE  = '#7c3aed';
  const PURPLE2 = '#5b21b6';
  const TEAL    = '#0d9488';
  const T1      = '#3b2f6e';   // dark text
  const T3      = '#a89cc8';   // muted text

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating bubble button ── */}
      <button
        className="aria-btn-bubble"
        onClick={handleOpen}
        title="Chat with Aria"
        style={{
          position:'fixed', bottom:28, right:28, zIndex:9998,
          width:56, height:56, borderRadius:16,
          border:`2px solid rgba(124,58,237,0.45)`,
          cursor:'pointer', background:WHITE,
          boxShadow:'0 0 20px rgba(124,58,237,0.22),0 4px 16px rgba(124,58,237,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform 0.2s,box-shadow 0.2s,border-color 0.2s',
          padding:0,
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={PURPLE} strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 5L5 15M5 5l10 10"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5.19-1.45L2 22l1.45-4.81A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <div style={{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:'50%',background:'#ef4444',border:`2px solid ${WHITE}`,fontSize:9,fontWeight:800,color:WHITE,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="aria-pop"
          style={{
            position:'fixed', bottom:96, right:28, zIndex:9999,
            width:370, maxHeight:'calc(100vh - 120px)',
            background:WHITE, borderRadius:20,
            boxShadow:`0 16px 48px rgba(124,58,237,0.14),0 0 0 1.5px rgba(124,58,237,0.15)`,
            display:'flex', flexDirection:'column', overflow:'hidden',
          }}
        >

          {/* ── Clear confirm overlay ── */}
          {showClearConfirm && (
            <div style={{position:'absolute',inset:0,zIndex:10,background:'rgba(255,255,255,0.96)',backdropFilter:'blur(6px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,textAlign:'center',borderRadius:20}}>
              <div style={{fontSize:32,marginBottom:10}}>🗑️</div>
              <div style={{fontSize:15,fontWeight:800,color:'#18103a',marginBottom:6}}>Clear chat history?</div>
              <div style={{fontSize:12,color:T3,lineHeight:1.5,marginBottom:20}}>
                Your messages will be archived for compliance.<br/>Your chat will start fresh.
              </div>
              <div style={{display:'flex',gap:10,width:'100%'}}>
                <button onClick={() => setShowClearConfirm(false)} style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:`rgba(124,58,237,0.08)`,color:PURPLE,fontFamily:'inherit'}}>Cancel</button>
                <button onClick={handleClear} disabled={clearing} style={{flex:1,padding:10,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:`linear-gradient(135deg,${PURPLE},${TEAL})`,color:WHITE,boxShadow:'0 2px 8px rgba(124,58,237,0.3)',fontFamily:'inherit'}}>
                  {clearing ? 'Clearing...' : 'Yes, clear it'}
                </button>
              </div>
            </div>
          )}

          {/* ── Header ── */}
          <div style={{padding:'14px 16px 12px',background:`linear-gradient(135deg,${PURPLE},${TEAL})`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            {/* Avatar icon */}
            <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.18)',border:'1px solid rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <div style={{position:'absolute',top:-2,right:-2,width:7,height:7,borderRadius:'50%',background:'#5eead4',border:`1.5px solid ${WHITE}`}}/>
            </div>
            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:9,letterSpacing:'2.5px',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',fontWeight:600,marginBottom:1}}>GenieX</div>
              <div style={{fontSize:15,fontWeight:800,color:WHITE,letterSpacing:'0.5px',lineHeight:1}}>Aria</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',marginTop:1}}>
                {loading ? '✦ Thinking...' : '✦ Your Learning Assistant'}
              </div>
            </div>
            {/* Actions */}
            <div style={{display:'flex',gap:5,flexShrink:0}}>
              {messages.length > 0 && (
                <button
                  className="aria-icon-btn"
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear chat"
                  style={{width:26,height:26,borderRadius:7,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.9)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.15s',padding:0}}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="3 6 4 14 12 14 13 6"/><path d="M1 6h14"/><path d="M6 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
              <button
                className="aria-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
                style={{width:26,height:26,borderRadius:7,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.9)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.15s',padding:0}}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l10 10M11 1L1 11"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          <div style={{flex:1,overflowY:'auto',padding:'14px 14px 8px',display:'flex',flexDirection:'column',gap:10,minHeight:0,background:BG}}>

            {messages.length === 0 && !loading ? (
              /* Empty state */
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',textAlign:'center'}}>
                <div style={{width:56,height:56,borderRadius:16,background:`rgba(124,58,237,0.1)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,marginBottom:12}}>✨</div>
                <div style={{fontSize:14,fontWeight:700,color:T1,marginBottom:6}}>
                  Hey{userName ? `, ${userName.split(' ')[0]}` : ''}!
                </div>
                <div style={{fontSize:12,lineHeight:1.6,color:T3,maxWidth:220}}>
                  I'm Aria, your learning assistant.<br/>Ask me anything about your courses or progress.
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="aria-msg" style={{display:'flex',gap:7,flexDirection:m.role==='user'?'row-reverse':'row'}}>
                  {/* Avatar */}
                  <div style={{
                    width:26, height:26, borderRadius:8, flexShrink:0, marginTop:2,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    ...(m.role === 'assistant'
                      ? {background:`linear-gradient(135deg,${PURPLE},${TEAL})`}
                      : {background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)'}
                    ),
                  }}>
                    {m.role === 'assistant' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                    ) : (
                      <span style={{fontSize:9,fontWeight:800,color:PURPLE}}>{initials}</span>
                    )}
                  </div>
                  {/* Bubble */}
                  <div>
                    <div style={{
                      maxWidth:'82%', padding:'9px 12px',
                      borderRadius: m.role==='assistant' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      fontSize:12.5, lineHeight:1.6, wordBreak:'break-word',
                      ...(m.role === 'assistant'
                        ? m.failed
                          ? {background:'#fff5f5',border:'1.5px solid rgba(239,68,68,0.2)',color:'#b91c1c'}
                          : {background:WHITE,border:'1.5px solid rgba(124,58,237,0.15)',color:T1,boxShadow:'0 1px 4px rgba(124,58,237,0.07)'}
                        : {background:`linear-gradient(135deg,${PURPLE},${PURPLE2})`,color:WHITE,whiteSpace:'pre-wrap'}
                      ),
                    }}>
                      {m.role === 'assistant' && !m.failed
                        ? <MarkdownMessage content={m.content} />
                        : <span style={{fontSize:12.5,lineHeight:1.6}}>{m.content}</span>
                      }
                    </div>
                    {m.failed && lastFailedMsg && (
                      <button
                        onClick={handleRetry}
                        style={{marginTop:6,padding:'4px 10px',fontSize:11,fontWeight:600,background:'rgba(124,58,237,0.08)',border:'1.5px solid rgba(124,58,237,0.2)',borderRadius:8,color:PURPLE,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4,fontFamily:'inherit'}}
                      >↻ Retry</button>
                    )}
                    {m.created_at && (
                      <div style={{fontSize:9.5,color:'rgba(0,0,0,0.3)',marginTop:3,textAlign:m.role==='user'?'left':'right'}}>
                        {formatTime(m.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="aria-msg" style={{display:'flex',gap:7}}>
                <div style={{width:26,height:26,borderRadius:8,flexShrink:0,marginTop:2,display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(135deg,${PURPLE},${TEAL})`}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <div style={{background:WHITE,border:'1.5px solid rgba(124,58,237,0.15)',borderRadius:'4px 14px 14px 14px',padding:'10px 14px',display:'flex',gap:4,alignItems:'center',boxShadow:'0 1px 4px rgba(124,58,237,0.07)'}}>
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
            <div style={{padding:'0 14px 12px',display:'flex',flexDirection:'column',gap:7,background:BG}}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="aria-suggestion"
                  onClick={() => sendMessage(s)}
                  style={{padding:'9px 14px',borderRadius:999,background:WHITE,border:'1.5px solid rgba(124,58,237,0.2)',fontSize:12,color:PURPLE,fontWeight:500,cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(124,58,237,0.08)',transition:'all 0.15s',fontFamily:'inherit',width:'100%'}}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input footer ── */}
          <div style={{padding:'10px 12px 12px',borderTop:'1.5px solid rgba(124,58,237,0.1)',background:BG,display:'flex',gap:8,alignItems:'flex-end',flexShrink:0}}>
            <div style={{flex:1,display:'flex',alignItems:'flex-end',background:WHITE,border:'1.5px solid rgba(124,58,237,0.2)',borderRadius:12,padding:'8px 12px'}}>
              <textarea
                ref={inputRef}
                placeholder="Ask Aria anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
                style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:12.5,color:'#18103a',fontFamily:"'DM Sans',system-ui,sans-serif",resize:'none',maxHeight:80,lineHeight:1.5,width:'100%',display:'block',padding:0,margin:0}}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              title="Send"
              className="aria-send"
              style={{width:36,height:36,borderRadius:10,flexShrink:0,background:`linear-gradient(135deg,${PURPLE},${TEAL})`,border:'none',cursor:'pointer',color:WHITE,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(124,58,237,0.3)',opacity:(!input.trim()||loading)?0.45:1,transition:'all 0.15s',padding:0}}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2L2 8l4 2 2 4 6-12z"/>
              </svg>
            </button>
          </div>

        </div>
      )}
    </>
  );
}
