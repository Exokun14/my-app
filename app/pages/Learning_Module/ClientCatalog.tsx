'use client'

import { useState } from "react";
import type { Course } from "../../Data/types";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS, CARD_STYLES } from "../Logic/CourseCatalogLogic";

interface CatalogProps {
  courses: Course[];
  onOpenCourse: (idx: number) => void;
}

function fmtTime(mins: number) {
  if (!mins || mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── AI Course Coach banner ───────────────────────────────────────────────────
function AICourseCoach({ onGetOverview }: { onGetOverview: () => void }) {
  return (
    <div className="cl-ai-coach">
      <div className="cl-ai-orb cl-ai-orb-1" />
      <div className="cl-ai-orb cl-ai-orb-2" />
      <div className="cl-ai-coach-inner">
        <div className="cl-ai-coach-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" opacity="0.95">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
          </svg>
          <span className="cl-ai-badge">AI</span>
        </div>
        <div className="cl-ai-coach-title">AI Learning Coach</div>
        <div className="cl-ai-coach-sub">Get a personalized analysis of where you stand and exactly what to focus on next.</div>
        <button className="cl-ai-coach-btn" onClick={onGetOverview}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
          </svg>
          Get My Overview
        </button>
      </div>
    </div>
  );
}



export default function Catalog({ courses, onOpenCourse }: CatalogProps) {
  const [search, setSearch] = useState(""),
    [cat, setCat] = useState("All"),
    [status, setStatus] = useState("All");

  const cats = ["All", ...Array.from(new Set(courses.map(c => c.cat).filter(Boolean)))];

  const filtered = courses.filter(c => {
    const pct = c.progress ?? 0, done = c.completed || pct >= 100, enr = c.enrolled || pct > 0;
    const cOk = cat === "All" || c.cat === cat;
    const sOk = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.desc?.toLowerCase().includes(search.toLowerCase());
    let stOk = true;
    if (status === "In Progress") stOk = enr && !done;
    if (status === "Completed") stOk = done;
    if (status === "New") stOk = !enr;
    return cOk && sOk && stOk;
  });

  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{CATALOG_CSS}</style>

      <div className="cl-shell">
        {/* ── Toolbar ── */}
        <div className="cl-toolbar">
          <span className="cl-heading">Course Catalog</span>
          <div style={{ flex: 1 }} />
          <div className="cl-search-box">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 13, height: 13, color: "#8e7ec0", flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
            </svg>
            <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="cl-sf-bar">
          <div className="cl-sf-section">
            <span className="cl-sf-label">Status</span>
            <div className="cl-sf-divider" />
            {["All","New","In Progress","Completed"].map(s => (
              <button key={s} className={`cl-sf-chip${status === s ? " on" : ""}`} onClick={() => setStatus(s)}>
                {s !== "All" && <span className="cl-sf-dot" style={{ background: status === s ? "rgba(255,255,255,0.85)" : s === "New" ? "#6c3dd6" : s === "In Progress" ? "#4f46e5" : "#16a34a" }} />}
                {s}
              </button>
            ))}
          </div>
          <div className="cl-sf-section">
            <span className="cl-sf-label">Category</span>
            <div className="cl-sf-divider" />
            {cats.map(c => (
              <button key={c} className={`cl-sf-chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="cl-scroll-area">

          {/* AI Coach — only when no filters */}
          {status === "All" && cat === "All" && !search && (
            <AICourseCoach onGetOverview={() => {/* hook up your handler here */}} />
          )}

          {filtered.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-ico">📭</div>
              <div className="cl-empty-title">Nothing found</div>
              <div className="cl-empty-sub">Try a different filter or search term</div>
            </div>
          ) : (
            <>
              {status === "All" && cat === "All" && !search && (
                <div className="cl-all-label">
                  <span>All Courses</span>
                  <div className="cl-spotlight-rule" />
                  <span className="cl-all-count">{filtered.length}</span>
                </div>
              )}
              <div className="cl-grid">
                {filtered.map((c, i) => {
                  const realIdx = courses.indexOf(c);
                  const modCount = c.modules?.length ?? 0;
                  const chCount = c.modules?.reduce((s: number, m: any) => s + m.chapters.length, 0) ?? 0;
                  const grad = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
                  const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
                  const progPct = typeof c.progress === "number" ? c.progress : 0;
                  const isCompleted = c.completed === true || progPct >= 100;
                  const isEnrolled = c.enrolled === true || progPct > 0;
                  const timeSpentMin = c.time_spent ?? 0;
                  const timeLabel = timeSpentMin > 0 ? fmtTime(timeSpentMin) : null;
                  return (
                    <div key={i} className="cl-card" style={{ animationDelay:`${i*0.03}s` }} onClick={() => onOpenCourse(realIdx)}>
                      <div className="cl-thumb" style={{ background:`linear-gradient(145deg,${grad[0]} 0%,${grad[1]} 100%)` }}>
                        <div className="cl-thumb-noise" />
                        <div className="cl-thumb-highlight" />
                        <div className="cl-thumb-emoji">{icon}</div>
                        <div className="cl-thumb-cat">{c.cat}</div>
                        <div className={`cl-thumb-status${isCompleted?" done":isEnrolled?" progress":" new"}`}>
                          <span className="cl-status-dot" />
                          {isCompleted?"Completed":isEnrolled?`${progPct}%`:"New"}
                        </div>
                        {progPct > 0 && (
                          <div className="cl-thumb-pbar">
                            <div className="cl-thumb-pfill" style={{ width:`${progPct}%`, background:isCompleted?"rgba(110,231,183,0.9)":"rgba(255,255,255,0.85)" }} />
                          </div>
                        )}
                        <div className="cl-thumb-overlay">
                          <div className="cl-play-btn">
                            <svg width="16" height="16" viewBox="0 0 18 18" fill="white"><path d="M5.5 3.5l10 5.5-10 5.5V3.5z"/></svg>
                          </div>
                          <span className="cl-play-label">{isCompleted?"Review":isEnrolled?`Continue · ${progPct}%`:"Start Course"}</span>
                          {timeLabel && <span className="cl-play-time">⏱ {timeLabel} spent</span>}
                        </div>
                      </div>
                      <div className="cl-body">
                        <div className="cl-title">{c.title}</div>
                        <div className="cl-desc">{c.desc}</div>
                        {isEnrolled && !isCompleted && progPct > 0 && (
                          <div className="cl-prog-wrap">
                            <div className="cl-prog-bar"><div className="cl-prog-fill" style={{ width:`${progPct}%` }}/></div>
                            <span className="cl-prog-lbl">{progPct}%</span>
                          </div>
                        )}
                        <div className="cl-meta">
                          {c.time && (
                            <span className="cl-meta-item">
                              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                              {c.time}
                            </span>
                          )}
                          {modCount > 0 && (
                            <span className="cl-meta-item cl-meta-teal">
                              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                              {modCount}m · {chCount}ch
                            </span>
                          )}
                          {modCount === 0 && <span className="cl-meta-item">Demo content</span>}
                        </div>
                        <button className={`cl-cta${isCompleted?" done":isEnrolled?" enr":" new"}`}
                          onClick={e=>{e.stopPropagation();onOpenCourse(realIdx);}}>
                          {isCompleted?"✓ Review Course":isEnrolled?"▶ Continue":"+ Enroll Now"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const CATALOG_CSS = `
/* ── Shell ───────────────────────────────────────────────────────────────── */
.cl-shell {
  display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden;
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.cl-toolbar {
  display:flex; align-items:center; gap:10px;
  margin-bottom:14px; flex-shrink:0;
}
.cl-heading {
  font-family:'DM Serif Display',Georgia,serif;
  font-size:20px; font-weight:400; font-style:italic;
  color:#18103a; letter-spacing:-0.02em;
}

/* ── Search ──────────────────────────────────────────────────────────────── */
.cl-search-box {
  display:flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:10px;
  background:#fff; border:1.5px solid rgba(108,61,214,.12);
  transition:border-color .14s, box-shadow .14s; width:180px;
}
.cl-search-box:focus-within {
  border-color:rgba(108,61,214,.35);
  box-shadow:0 0 0 3px rgba(108,61,214,.07);
}
.cl-search-box input {
  border:none; outline:none; background:transparent;
  font-size:12px; color:#18103a; flex:1;
  font-family:'DM Sans',sans-serif;
}
.cl-search-box input::placeholder { color:#b0a8cc; }

/* ── Filter bar ──────────────────────────────────────────────────────────── */
.cl-sf-bar {
  display:flex; align-items:center; gap:8px;
  margin-bottom:16px; flex-shrink:0; flex-wrap:wrap;
}
.cl-sf-section {
  display:flex; align-items:center; gap:2px;
  background:#fff; border:1.5px solid rgba(108,61,214,.1);
  border-radius:10px; padding:3px 4px;
}
.cl-sf-divider {
  width:1px; height:14px; background:rgba(108,61,214,.1);
  margin:0 3px; flex-shrink:0;
}
.cl-sf-label {
  font-size:9px; font-weight:800; letter-spacing:.12em; text-transform:uppercase;
  color:#b0a8cc; padding:0 7px; flex-shrink:0;
}
.cl-sf-chip {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11.5px; font-weight:500; color:#4a3870;
  padding:5px 11px; border-radius:7px; cursor:pointer;
  transition:all .14s; background:transparent; border:none;
  font-family:'DM Sans',sans-serif; white-space:nowrap;
}
.cl-sf-chip:hover { background:#f4f2fb; color:#18103a; }
.cl-sf-chip.on {
  background:linear-gradient(135deg,#6c3dd6,#4f1eb8);
  color:#fff; font-weight:700;
  box-shadow:0 2px 8px rgba(108,61,214,.3);
}
.cl-sf-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

/* ── Scroll area — KEY FIX: replaces cl-masonry-scroll ──────────────────── */
.cl-scroll-area {
  flex:1 1 0; min-height:0; overflow-y:auto; overflow-x:hidden;
  padding:2px 1px 28px;
}
.cl-scroll-area::-webkit-scrollbar { width:3px; }
.cl-scroll-area::-webkit-scrollbar-thumb { background:rgba(108,61,214,.2); border-radius:3px; }

/* ── CSS Grid — replaces broken masonry columns layout ───────────────────── */
.cl-grid {
  display:grid;
  grid-template-columns: repeat(4, 1fr);
  gap:14px;
  align-items:start;        /* ← CRITICAL: cards align to top of each row */
}
@media (max-width:960px)  { .cl-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:600px)  { .cl-grid { grid-template-columns:1fr; } }

/* ── Section labels ──────────────────────────────────────────────────────── */
.cl-all-label {
  display:flex; align-items:center; gap:8px;
  margin-bottom:12px; margin-top:4px;
}
.cl-all-label span:first-child {
  font-size:10px; font-weight:800; color:#b0a8cc;
  text-transform:uppercase; letter-spacing:.1em; white-space:nowrap;
}
.cl-spotlight-rule { flex:1; height:1px; background:linear-gradient(90deg,rgba(108,61,214,.1),transparent); }
.cl-all-count {
  font-size:10px; font-weight:700; color:#b0a8cc;
  background:rgba(108,61,214,.07); padding:2px 7px; border-radius:20px;
}

/* ── AI Course Coach ─────────────────────────────────────────────────────── */
.cl-ai-coach {
  position:relative; overflow:hidden;
  border-radius:18px; margin-bottom:22px; flex-shrink:0;
  background:linear-gradient(135deg,#3b1d8a 0%,#5b2fd4 45%,#4f46e5 100%);
  box-shadow:0 8px 32px rgba(108,61,214,.35), 0 2px 8px rgba(0,0,0,.1);
  cursor:default;
}
/* Decorative orbs */
.cl-ai-orb {
  position:absolute; border-radius:50%; pointer-events:none;
}
.cl-ai-orb-1 {
  width:280px; height:280px; top:-80px; right:-40px;
  background:radial-gradient(circle, rgba(192,132,252,.25) 0%, transparent 65%);
}
.cl-ai-orb-2 {
  width:200px; height:200px; bottom:-60px; left:60px;
  background:radial-gradient(circle, rgba(99,102,241,.3) 0%, transparent 65%);
}
.cl-ai-coach-inner {
  position:relative; z-index:1;
  display:flex; flex-direction:column; align-items:center;
  padding:32px 24px 28px; text-align:center; gap:10px;
}
.cl-ai-coach-icon-wrap {
  width:56px; height:56px; border-radius:18px; flex-shrink:0;
  background:rgba(255,255,255,.15); backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; position:relative;
  border:1.5px solid rgba(255,255,255,.25);
  box-shadow:0 4px 16px rgba(0,0,0,.15);
  margin-bottom:2px;
}
.cl-ai-badge {
  position:absolute; top:-7px; right:-7px;
  font-size:8px; font-weight:900; letter-spacing:.05em;
  background:linear-gradient(135deg,#f0abfc,#a5b4fc);
  color:#2e1065; padding:2px 5px; border-radius:5px;
  border:2px solid rgba(255,255,255,.4);
}
.cl-ai-coach-title {
  font-family:'DM Serif Display',Georgia,serif;
  font-size:20px; font-weight:400; font-style:italic;
  color:#fff; line-height:1.2; letter-spacing:-0.01em;
}
.cl-ai-coach-sub {
  font-size:13px; color:rgba(255,255,255,.7); font-weight:400;
  line-height:1.55; max-width:380px;
}
.cl-ai-coach-btn {
  display:inline-flex; align-items:center; gap:8px;
  padding:11px 24px; border-radius:12px; border:none; cursor:pointer;
  font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700;
  background:rgba(255,255,255,.18); color:#fff;
  backdrop-filter:blur(8px);
  border:1.5px solid rgba(255,255,255,.3);
  box-shadow:0 2px 12px rgba(0,0,0,.15);
  transition:all .18s; white-space:nowrap; margin-top:4px;
}
.cl-ai-coach-btn:hover {
  background:rgba(255,255,255,.28);
  border-color:rgba(255,255,255,.5);
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(0,0,0,.2);
}



/* ── Card ────────────────────────────────────────────────────────────────── */
.cl-card {
  display:flex; flex-direction:column;
  border-radius:14px; overflow:hidden; background:#fff;
  border:1.5px solid rgba(108,61,214,.08);
  box-shadow:0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04);
  cursor:pointer;
  transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s, border-color .2s;
  animation:cl-up .32s cubic-bezier(.16,1,.3,1) both;
}
.cl-card:hover {
  transform:translateY(-4px);
  box-shadow:0 12px 32px rgba(108,61,214,.15), 0 2px 8px rgba(0,0,0,.06);
  border-color:rgba(108,61,214,.2);
}
@keyframes cl-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

/* ── Thumbnail ───────────────────────────────────────────────────────────── */
.cl-thumb {
  position:relative; height:148px; overflow:hidden; flex-shrink:0;
}
.cl-thumb-noise {
  position:absolute; inset:0; pointer-events:none; opacity:.05;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:150px 150px;
}
.cl-thumb-highlight {
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 90% 55% at 50% -10%, rgba(255,255,255,0.28) 0%, transparent 65%);
}
.cl-thumb-emoji {
  position:absolute; top:50%; left:50%;
  transform:translate(-50%, -56%);
  font-size:56px; line-height:1;
  filter:drop-shadow(0 6px 18px rgba(0,0,0,.32));
  user-select:none;
  transition:transform .24s cubic-bezier(.16,1,.3,1);
}
.cl-card:hover .cl-thumb-emoji { transform:translate(-50%, -64%) scale(1.1); }
.cl-thumb-cat {
  position:absolute; top:9px; left:9px;
  padding:3px 9px; border-radius:20px;
  background:rgba(0,0,0,.3); backdrop-filter:blur(8px);
  font-size:8.5px; font-weight:800; color:rgba(255,255,255,.92);
  letter-spacing:.09em; text-transform:uppercase;
  border:1px solid rgba(255,255,255,.14);
}
.cl-thumb-status {
  position:absolute; top:9px; right:9px;
  padding:3px 8px; border-radius:20px; backdrop-filter:blur(6px);
  font-size:9px; font-weight:700; color:#fff;
  display:flex; align-items:center; gap:4px;
  border:1px solid rgba(255,255,255,.18);
}
.cl-thumb-status.new      { background:rgba(0,0,0,.28); }
.cl-thumb-status.progress { background:rgba(79,70,229,.72); }
.cl-thumb-status.done     { background:rgba(5,150,105,.72); }
.cl-status-dot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,.85); }
.cl-thumb-pbar { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(0,0,0,.2); }
.cl-thumb-pfill { height:100%; border-radius:0 2px 2px 0; transition:width .5s ease; }
.cl-thumb-overlay {
  position:absolute; inset:0;
  background:rgba(10,6,30,.5); backdrop-filter:blur(3px);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
  opacity:0; transition:opacity .18s;
}
.cl-card:hover .cl-thumb-overlay { opacity:1; }
.cl-play-btn {
  width:42px; height:42px; border-radius:50%;
  border:2px solid rgba(255,255,255,.65); background:rgba(255,255,255,.12);
  display:flex; align-items:center; justify-content:center;
  transition:transform .15s, background .15s;
}
.cl-card:hover .cl-play-btn { transform:scale(1.08); background:rgba(255,255,255,.2); }
.cl-play-label { color:#fff; font-size:11px; font-weight:700; letter-spacing:.03em; }
.cl-play-time  { color:rgba(255,255,255,.55); font-size:10px; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.cl-body { padding:11px 12px 12px; flex:1; display:flex; flex-direction:column; gap:5px; }
.cl-title {
  font-family:'DM Serif Display',Georgia,serif;
  font-size:14px; font-weight:400; font-style:italic;
  color:#18103a; line-height:1.3;
}
.cl-desc {
  font-size:11.5px; color:#8e7ec0; line-height:1.55;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; flex:1;
}
.cl-prog-wrap { display:flex; align-items:center; gap:7px; }
.cl-prog-bar  { flex:1; height:3px; border-radius:3px; background:rgba(108,61,214,.1); overflow:hidden; }
.cl-prog-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#6c3dd6,#8b5cf6); transition:width .5s; }
.cl-prog-lbl  { font-size:9.5px; font-weight:700; color:#6c3dd6; flex-shrink:0; }
.cl-meta { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.cl-meta-item { display:flex; align-items:center; gap:4px; font-size:10.5px; color:#b0a8cc; font-weight:500; }
.cl-meta-teal { color:#0d9488 !important; font-weight:600; }

/* ── CTA ─────────────────────────────────────────────────────────────────── */
.cl-cta {
  display:flex; align-items:center; justify-content:center; gap:5px;
  width:100%; padding:8px 0; border-radius:9px; border:none;
  font-size:11.5px; font-weight:700; cursor:pointer;
  transition:all .15s; font-family:'DM Sans',sans-serif;
  margin-top:2px; letter-spacing:.01em;
}
.cl-cta:hover { transform:translateY(-1px); filter:brightness(1.07); }
.cl-cta.new  { background:linear-gradient(135deg,#6c3dd6,#4f1eb8); color:#fff; box-shadow:0 3px 12px rgba(108,61,214,.3); }
.cl-cta.new:hover { box-shadow:0 5px 18px rgba(108,61,214,.42); }
.cl-cta.enr  { background:linear-gradient(135deg,#1d4ed8,#4f46e5); color:#fff; box-shadow:0 3px 10px rgba(79,70,229,.3); }
.cl-cta.done { background:linear-gradient(135deg,#065f46,#0d9488); color:#fff; box-shadow:0 3px 10px rgba(13,148,136,.3); }

/* ── Empty ───────────────────────────────────────────────────────────────── */
.cl-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 32px; text-align:center; }
.cl-empty-ico { font-size:52px; margin-bottom:16px; }
.cl-empty-title { font-family:'DM Serif Display',serif; font-size:20px; font-weight:400; font-style:italic; color:#18103a; margin-bottom:6px; }
.cl-empty-sub { font-size:12.5px; color:#8e7ec0; line-height:1.6; }
`;
