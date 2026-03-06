'use client'

import { useState, useEffect } from "react";
import type { Course } from "../../Data/types";
import type { Activity } from "./ActivityBuilderPanel";
import type { ProgressRecord } from "../../Data/types";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS, CARD_STYLES } from "../Logic/CourseCatalogLogic";
import api from "../../Services/api.service";

interface ClientViewProps {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  categories: string[];
  toast: (msg: string) => void;
  onOpenCourse: (idx: number) => void;
  publishedActivities: Activity[];
}

function fmtTime(mins: number) {
  if (!mins || mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const S = `
@keyframes cdvUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes cdvIn    { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
@keyframes cdvSlide { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes cdvBar   { from{width:0} }
@keyframes cdvPop   { 0%{opacity:0;transform:scale(0.8) translateY(6px)} 65%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
@keyframes cdvRing  { from{stroke-dasharray:0 999} }
@keyframes cdvShim  { 0%{left:-100%} 100%{left:200%} }

.cdv-wrap { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; }

/* ── Top stat row ── */
.cdv-stats-row {
  flex-shrink:0; display:flex; align-items:stretch; gap:10px;
  margin-bottom:18px;
}
.cdv-stat-card {
  flex:1; display:flex; align-items:center; gap:12px;
  padding:14px 16px; border-radius:14px;
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 2px 8px rgba(124,58,237,0.04);
  animation:cdvPop .4s cubic-bezier(0.16,1,0.3,1) both;
  position:relative; overflow:hidden;
}
.cdv-stat-card::after {
  content:''; position:absolute; top:0; left:0; right:0; height:3px; border-radius:14px 14px 0 0;
}
.cdv-stat-card.s-purple::after { background:linear-gradient(90deg,#7c3aed,#a78bfa); }
.cdv-stat-card.s-amber::after  { background:linear-gradient(90deg,#d97706,#fbbf24); }
.cdv-stat-card.s-green::after  { background:linear-gradient(90deg,#059669,#34d399); }
.cdv-stat-card.s-blue::after   { background:linear-gradient(90deg,#2563eb,#60a5fa); }
.cdv-stat-icon {
  width:38px; height:38px; border-radius:11px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:18px;
}
.cdv-stat-card.s-purple .cdv-stat-icon { background:rgba(124,58,237,0.1); }
.cdv-stat-card.s-amber  .cdv-stat-icon { background:rgba(217,119,6,0.1); }
.cdv-stat-card.s-green  .cdv-stat-icon { background:rgba(5,150,105,0.1); }
.cdv-stat-card.s-blue   .cdv-stat-icon { background:rgba(37,99,235,0.1); }
.cdv-stat-num  { font-size:22px; font-weight:900; color:var(--t1,#18103a); line-height:1; letter-spacing:-0.03em; }
.cdv-stat-lbl  { font-size:10px; font-weight:600; color:var(--t3,#a89dc8); margin-top:2px; letter-spacing:.01em; }

/* Ring stat card */
.cdv-ring-card {
  flex-shrink:0; display:flex; align-items:center; gap:12px;
  padding:14px 18px; border-radius:14px;
  background:linear-gradient(135deg,#f5f0ff 0%,#eef9f7 100%);
  border:1.5px solid rgba(124,58,237,0.12);
  box-shadow:0 2px 8px rgba(124,58,237,0.06);
  animation:cdvPop .4s cubic-bezier(0.16,1,0.3,1) .15s both;
}
.cdv-ring-num  { font-size:18px; font-weight:900; color:var(--purple,#7c3aed); line-height:1; letter-spacing:-0.03em; }
.cdv-ring-sub  { font-size:9.5px; font-weight:600; color:var(--t3,#a89dc8); margin-top:2px; text-transform:uppercase; letter-spacing:.06em; }

/* ── Continue Learning section ── */
.cdv-section-head {
  display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-shrink:0;
}
.cdv-section-title { font-size:13.5px; font-weight:800; color:var(--t1,#18103a); letter-spacing:-0.02em; }
.cdv-section-count { font-size:11px; color:var(--t3,#a89dc8); font-weight:600; }
.cdv-section-line  { flex:1; height:1px; background:linear-gradient(to right,rgba(124,58,237,0.12),transparent); margin-left:4px; }

/* Large continue cards */
.cdv-continue-grid {
  flex-shrink:0; display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:10px; margin-bottom:20px;
}
.cdv-cont-card {
  display:flex; align-items:center; gap:14px;
  padding:14px 16px; border-radius:14px;
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  cursor:pointer; transition:all .18s;
  animation:cdvSlide .3s cubic-bezier(0.16,1,0.3,1) both;
  position:relative; overflow:hidden;
}
.cdv-cont-card::before {
  content:''; position:absolute; inset:0; opacity:0; transition:opacity .18s;
  background:linear-gradient(135deg,rgba(124,58,237,0.03),rgba(13,148,136,0.03));
}
.cdv-cont-card:hover { border-color:rgba(124,58,237,0.22); transform:translateY(-2px); box-shadow:0 8px 24px rgba(124,58,237,0.1); }
.cdv-cont-card:hover::before { opacity:1; }

.cdv-cont-thumb {
  width:56px; height:56px; border-radius:13px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:26px;
  position:relative; overflow:hidden;
}
.cdv-cont-body  { flex:1; min-width:0; }
.cdv-cont-title { font-size:12.5px; font-weight:800; color:var(--t1,#18103a); line-height:1.3; margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cdv-cont-pct   { font-size:10.5px; font-weight:700; color:var(--purple,#7c3aed); margin-bottom:5px; }
.cdv-cont-track { height:5px; border-radius:5px; background:rgba(124,58,237,0.1); overflow:hidden; }
.cdv-cont-fill  {
  height:100%; border-radius:5px;
  background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  animation:cdvBar .7s cubic-bezier(0.16,1,0.3,1) both;
  box-shadow:0 0 6px rgba(124,58,237,0.3);
}
.cdv-cont-resume {
  flex-shrink:0; padding:7px 13px; border-radius:9px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--purple,#7c3aed),#5b21b6);
  color:#fff; font-size:11px; font-weight:700; transition:all .18s;
  display:flex; align-items:center; gap:4px;
  box-shadow:0 2px 8px rgba(124,58,237,0.25);
}
.cdv-cont-resume:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.35); }

/* ── Catalog section ── */
.cdv-cat-wrap { flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; }
.cdv-filters  { flex-shrink:0; display:flex; align-items:center; gap:5px; margin-bottom:10px; flex-wrap:wrap; }

.cdv-chip {
  display:inline-flex; align-items:center; gap:3px;
  font-size:11px; font-weight:600; color:var(--t2,#4a3870);
  padding:4px 11px; border-radius:20px; cursor:pointer; transition:all .14s;
  background:var(--surface,#fff); border:1.5px solid var(--border,rgba(124,58,237,0.1));
  white-space:nowrap; font-family:'DM Sans',sans-serif;
}
.cdv-chip:hover { border-color:rgba(124,58,237,0.25); color:var(--purple,#7c3aed); }
.cdv-chip.on { background:linear-gradient(135deg,var(--purple,#7c3aed),#5b21b6); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(124,58,237,0.28); }
.cdv-chip.on-teal { background:linear-gradient(135deg,#0d9488,#0f766e); color:#fff; border-color:transparent; }
.cdv-chip-sep { width:1px; height:14px; background:var(--border,rgba(124,58,237,0.1)); flex-shrink:0; margin:0 2px; }

.cdv-search {
  margin-left:auto; display:flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:9px; background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1)); transition:border-color .15s;
}
.cdv-search:focus-within { border-color:rgba(124,58,237,0.3); }
.cdv-search input { border:none; outline:none; background:transparent; font-size:11.5px; color:var(--t1,#18103a); width:140px; font-family:'DM Sans',sans-serif; }

.cdv-grid-scroll { flex:1; overflow-y:auto; padding-bottom:16px; }
.cdv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }

/* ── Course card — light, clean ── */
.cdv-card {
  border-radius:14px; overflow:hidden; background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 2px 8px rgba(124,58,237,0.04);
  cursor:pointer; transition:all .2s; display:flex; flex-direction:column;
  animation:cdvIn .28s cubic-bezier(0.16,1,0.3,1) both;
}
.cdv-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(124,58,237,0.12); border-color:rgba(124,58,237,0.2); }
.cdv-thumb { height:136px; position:relative; overflow:hidden; flex-shrink:0; }
.cdv-overlay {
  position:absolute; inset:0; background:rgba(0,0,0,0.38); backdrop-filter:blur(2px);
  display:flex; align-items:center; justify-content:center; flex-direction:column; gap:5px;
  opacity:0; transition:opacity .18s;
}
.cdv-card:hover .cdv-overlay { opacity:1; }
.cdv-play { width:38px; height:38px; border-radius:50%; border:2px solid rgba(255,255,255,0.75); background:rgba(255,255,255,0.15); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
.cdv-badge { position:absolute; top:8px; left:8px; padding:2px 8px; border-radius:20px; backdrop-filter:blur(8px); font-size:8px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; border:1px solid rgba(255,255,255,0.18); }
.cdv-emoji { position:absolute; bottom:9px; left:11px; font-size:34px; line-height:1; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.25)); user-select:none; }
.cdv-prog-bar  { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(0,0,0,0.18); }
.cdv-prog-fill { height:100%; border-radius:0 2px 2px 0; }

.cdv-body   { padding:11px 12px 12px; flex:1; display:flex; flex-direction:column; }
.cdv-title  { font-size:12.5px; font-weight:800; color:var(--t1,#18103a); line-height:1.3; margin-bottom:3px; letter-spacing:-0.01em; }
.cdv-desc   { font-size:11px; color:var(--t3,#a89dc8); line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:8px; flex:1; }
.cdv-meta   { display:flex; align-items:center; gap:5px; margin-bottom:9px; font-size:9.5px; color:var(--t3,#a89dc8); }
.cdv-dot    { width:2px; height:2px; border-radius:50%; background:#d4d0e8; }

/* CTA — clean light style for non-enrolled, gradient for enrolled */
.cdv-cta { width:100%; padding:7px 0; border-radius:9px; border:none; cursor:pointer; font-size:11.5px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px; transition:all .18s; }
.cdv-cta:hover { transform:translateY(-1px); filter:brightness(1.07); }
.cdv-cta.new   { background:rgba(124,58,237,0.07); color:var(--purple,#7c3aed); border:1.5px solid rgba(124,58,237,0.15); }
.cdv-cta.new:hover { background:rgba(124,58,237,0.12); border-color:rgba(124,58,237,0.3); }
.cdv-cta.enr   { background:linear-gradient(135deg,var(--purple,#7c3aed),#5b21b6); color:#fff; box-shadow:0 3px 10px rgba(124,58,237,0.28); }
.cdv-cta.done  { background:linear-gradient(135deg,#065f46,#0d9488); color:#fff; box-shadow:0 3px 10px rgba(13,148,136,0.25); }

/* Progress bar on enrolled cards in body */
.cdv-card-prog { margin-bottom:8px; }
.cdv-card-prog-bar { height:4px; border-radius:4px; background:rgba(124,58,237,0.1); overflow:hidden; margin-bottom:3px; }
.cdv-card-prog-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488)); animation:cdvBar .6s cubic-bezier(0.16,1,0.3,1) both; }
.cdv-card-prog-lbl { font-size:9.5px; font-weight:700; color:var(--purple,#7c3aed); }

/* ── Progress tab ── */
.cdv-prog-wrap { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; }

/* Tab switcher */
.cdv-tabs { display:flex; gap:3px; padding:3px; background:var(--bg,#faf9ff); border:1.5px solid var(--border,rgba(124,58,237,0.1)); border-radius:11px; flex-shrink:0; margin-bottom:14px; width:fit-content; }
.cdv-tab  { padding:6px 15px; border-radius:8px; border:none; font-size:11.5px; font-weight:700; cursor:pointer; transition:all .18s; background:transparent; color:var(--t3,#a89dc8); font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; }
.cdv-tab.on { background:linear-gradient(135deg,var(--purple,#7c3aed),#5b21b6); color:#fff; box-shadow:0 2px 8px rgba(124,58,237,0.3); }
.cdv-tab:not(.on):hover { color:var(--purple,#7c3aed); background:rgba(124,58,237,0.06); }

/* Swipe panels */
.swipe-container { flex:1; min-height:0; overflow:hidden; position:relative; }
.swipe-track     { display:flex; height:100%; transition:transform 0.38s cubic-bezier(0.16,1,0.3,1); }
.swipe-panel     { flex-shrink:0; height:100%; overflow:hidden; display:flex; flex-direction:column; }
`;

// ─── Mini ring SVG ────────────────────────────────────────────────────────────
function MiniRing({ pct, size = 44, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <defs>
        <linearGradient id="cdvRingG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#0d9488"/>
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#cdvRingG)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ animation:"cdvRing .9s cubic-bezier(0.16,1,0.3,1) .2s both" }}/>
    </svg>
  );
}

// ─── Progress Panel ───────────────────────────────────────────────────────────
const BAR_C: Record<string,string> = { Completed:"#16a34a","In Progress":"var(--purple)","Not Started":"#e5e7eb" };
const PILL_C: Record<string,string> = { Completed:"completed","In Progress":"started","Not Started":"notstarted" };
const DOT_C:  Record<string,string> = { Completed:"dot-g","In Progress":"dot-y","Not Started":"dot-r" };

function ProgressPanel({ toast }: { toast:(m:string)=>void }) {
  const [data, setData]       = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await api.progress.getAll(); if (r.success && r.data) setData(r.data as ProgressRecord[]); }
      catch(e){ console.error(e); } finally { setLoading(false); }
    })();
  }, []);
  const safe = data || [];
  const rows = safe.filter(r => (filter==="All"||r.status===filter) && (!search||r.course.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="cdv-prog-wrap">
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,flexShrink:0 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:800,color:"var(--t1)",letterSpacing:"-0.02em" }}>My Learning Progress</div>
          <div style={{ fontSize:11,color:"var(--t3)",marginTop:1 }}>{safe.length} record{safe.length!==1?"s":""}</div>
        </div>
        <div style={{ flex:1 }}/>
        <div className="cdv-search">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <button className="btn btn-s btn-sm" onClick={()=>toast("Exporting…")}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg>
          Export
        </button>
      </div>
      <div style={{ display:"flex",gap:5,marginBottom:12,flexShrink:0,flexWrap:"wrap" }}>
        {["All","In Progress","Completed","Not Started"].map(f=>(
          <button key={f} className={`cdv-chip${filter===f?" on":""}`} onClick={()=>setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="surf" style={{ flex:1,display:"flex",flexDirection:"column",padding:0,overflow:"hidden" }}>
        <div className="tbl-wrap">
          {loading ? <div style={{ textAlign:"center",padding:40,color:"var(--t3)",fontSize:13 }}>Loading…</div> : (
            <table className="dt">
              <thead><tr><th>Course</th><th>Progress</th><th>Started</th><th>Completed</th><th>Status</th></tr></thead>
              <tbody>
                {rows.length===0
                  ? <tr><td colSpan={5} style={{ textAlign:"center",padding:24,color:"var(--t3)",fontSize:12 }}>{safe.length===0?"No progress yet — start a course!":"No records found"}</td></tr>
                  : rows.map((r,i)=>(
                    <tr key={i}>
                      <td style={{ fontSize:12.5,fontWeight:600,color:"var(--t1)" }}>{r.course}</td>
                      <td><div className="lc-bar-wrap"><div className="lc-prog-bar"><div className="lc-prog-fill" style={{ width:`${r.progress}%`,background:BAR_C[r.status] }}/></div><span style={{ fontSize:10.5,fontWeight:700,color:"var(--t2)",minWidth:28,textAlign:"right" }}>{r.progress}%</span></div></td>
                      <td style={{ fontSize:11,color:"var(--t3)" }}>{r.started||"—"}</td>
                      <td style={{ fontSize:11,color:"var(--t3)" }}>{r.completed||"—"}</td>
                      <td><span className={`lc-prog-pill ${PILL_C[r.status]}`}><span className={`dot ${DOT_C[r.status]}`} style={{ width:5,height:5 }}/>{r.status}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Panel ──────────────────────────────────────────────────────────
function DashboardPanel({ courses, categories, onOpenCourse, toast }:{
  courses:Course[]; categories:string[]; onOpenCourse:(i:number)=>void; toast:(m:string)=>void;
}) {
  const [search, setSearch]             = useState("");
  const [activeCat, setActiveCat]       = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");

  const enrolled   = courses.filter(c => c.enrolled||(c.progress??0)>0);
  const completed  = courses.filter(c => c.completed||(c.progress??0)>=100);
  const inProgress = enrolled.filter(c => !c.completed&&(c.progress??0)>0&&(c.progress??0)<100);
  const avgProg    = enrolled.length ? Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length) : 0;
  const totalTime  = courses.reduce((s,c)=>s+(c.time_spent??0),0);
  const cats = ["All",...Array.from(new Set(courses.map(c=>c.cat).filter(Boolean)))];

  const filtered = courses.filter(c => {
    const catOk  = activeCat==="All"||c.cat===activeCat;
    const srOk   = !search||c.title?.toLowerCase().includes(search.toLowerCase())||c.desc?.toLowerCase().includes(search.toLowerCase());
    const pct    = c.progress??0;
    const isDone = c.completed||pct>=100;
    const isEnr  = c.enrolled||pct>0;
    let stOk = true;
    if (activeStatus==="In Progress") stOk=isEnr&&!isDone;
    if (activeStatus==="Completed")   stOk=isDone;
    if (activeStatus==="New")         stOk=!isEnr;
    return catOk&&srOk&&stOk;
  });

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",minHeight:0,overflow:"hidden" }}>

      {/* ── Stats row ── */}
      <div className="cdv-stats-row">
        {[
          { n:enrolled.length,   l:"Enrolled",    e:"📚", cls:"s-purple", d:"0s" },
          { n:inProgress.length, l:"In Progress",  e:"⚡", cls:"s-amber",  d:"0.06s" },
          { n:completed.length,  l:"Completed",    e:"✅", cls:"s-green",  d:"0.12s" },
          { n:courses.filter(c=>!(c.enrolled||(c.progress??0)>0)).length, l:"Not Started", e:"🔓", cls:"s-blue", d:"0.18s" },
        ].map((s,i)=>(
          <div key={i} className={`cdv-stat-card ${s.cls}`} style={{ animationDelay:s.d }}>
            <div className="cdv-stat-icon">{s.e}</div>
            <div>
              <div className="cdv-stat-num">{s.n}</div>
              <div className="cdv-stat-lbl">{s.l}</div>
            </div>
          </div>
        ))}

        {/* Avg progress ring */}
        <div className="cdv-ring-card">
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <MiniRing pct={avgProg}/>
            <div style={{ position:"absolute", textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:900, color:"var(--purple,#7c3aed)", lineHeight:1 }}>{avgProg}%</div>
            </div>
          </div>
          <div>
            <div className="cdv-ring-num">{fmtTime(totalTime)}</div>
            <div className="cdv-ring-sub">Total time · avg progress</div>
          </div>
        </div>
      </div>

      {/* ── Continue Learning ── */}
      {inProgress.length > 0 && (
        <>
          <div className="cdv-section-head">
            <div style={{ width:3, height:14, borderRadius:2, background:"linear-gradient(#7c3aed,#0d9488)", flexShrink:0 }}/>
            <span className="cdv-section-title">Continue Learning</span>
            <span className="cdv-section-count">{inProgress.length} course{inProgress.length!==1?"s":""} in progress</span>
            <div className="cdv-section-line"/>
          </div>

          <div className="cdv-continue-grid">
            {inProgress.slice(0, 4).map((c,i) => {
              const ri   = courses.indexOf(c);
              const pct  = c.progress ?? 0;
              const grad = THUMB_GRADIENTS[ri % THUMB_GRADIENTS.length];
              const ic   = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              return (
                <div key={i} className="cdv-cont-card"
                  style={{ animationDelay:`${i*0.07}s` }}
                  onClick={() => onOpenCourse(ri)}
                >
                  <div className="cdv-cont-thumb"
                    style={{ background:`linear-gradient(135deg,${grad[0]},${grad[1]})` }}>
                    <div style={{ position:"absolute",inset:0,background:"radial-gradient(circle at 30% 30%,rgba(255,255,255,0.2),transparent 60%)" }}/>
                    <span style={{ position:"relative",zIndex:1 }}>{ic}</span>
                  </div>
                  <div className="cdv-cont-body">
                    <div className="cdv-cont-title">{c.title}</div>
                    <div className="cdv-cont-pct">{pct}% complete</div>
                    <div className="cdv-cont-track">
                      <div className="cdv-cont-fill"
                        style={{ width:`${pct}%`, animationDelay:`${0.25+i*0.08}s` }}/>
                    </div>
                  </div>
                  <button className="cdv-cont-resume" onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}>
                    <svg width="9" height="9" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
                    Resume
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Course Catalog ── */}
      <div className="cdv-cat-wrap">
        <div className="cdv-section-head" style={{ marginBottom:8 }}>
          <div style={{ width:3, height:14, borderRadius:2, background:"linear-gradient(#6366f1,#0d9488)", flexShrink:0 }}/>
          <span className="cdv-section-title">Course Catalog</span>
          <span className="cdv-section-count">· {filtered.length} shown</span>
          <div className="cdv-section-line"/>
          <div className="cdv-search" style={{ marginLeft:0 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
            <input type="text" placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="cdv-filters">
          {[{k:"All",l:"All"},{k:"New",l:"🆕 New"},{k:"In Progress",l:"📖 In Progress"},{k:"Completed",l:"✅ Done"}].map(f=>(
            <button key={f.k}
              className={`cdv-chip${activeStatus===f.k?(f.k==="In Progress"?" on-teal":" on"):""}`}
              onClick={()=>setActiveStatus(f.k)}>{f.l}</button>
          ))}
          <div className="cdv-chip-sep"/>
          {cats.map(cat=>(
            <button key={cat} className={`cdv-chip${activeCat===cat?" on":""}`} onClick={()=>setActiveCat(cat)}>{cat}</button>
          ))}
        </div>

        <div className="cdv-grid-scroll">
          {filtered.length===0
            ? <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px",gap:8 }}>
                <div style={{ fontSize:32 }}>🔍</div>
                <div style={{ fontSize:14,fontWeight:700,color:"var(--t2)" }}>No courses match</div>
                <div style={{ fontSize:12,color:"var(--t3)",textAlign:"center",maxWidth:200,lineHeight:1.5 }}>Try a different filter or search term.</div>
              </div>
            : <div className="cdv-grid">
                {filtered.map((c,i) => {
                  const ri   = courses.indexOf(c);
                  const mc   = c.modules?.length ?? 0;
                  const chc  = c.modules?.reduce((s:number,m:any)=>s+m.chapters.length,0) ?? 0;
                  const grad = THUMB_GRADIENTS[ri % THUMB_GRADIENTS.length];
                  const pat  = THUMB_PATTERNS[ri % THUMB_PATTERNS.length];
                  const ic   = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
                  const pct  = typeof c.progress==="number" ? c.progress : 0;
                  const done = c.completed===true || pct>=100;
                  const enr  = c.enrolled===true || pct>0;
                  const tl   = (c.time_spent??0)>0 ? fmtTime(c.time_spent??0) : null;
                  return (
                    <div key={i} className="cdv-card"
                      style={{ animationDelay:`${Math.min(i*0.04,0.4)}s` }}
                      onClick={() => onOpenCourse(ri)}>
                      {/* Thumb */}
                      <div className="cdv-thumb" style={{ background:`linear-gradient(135deg,${grad[0]},${grad[1]})` }}>
                        <div style={{ position:"absolute",inset:0,backgroundImage:pat,backgroundSize:"20px 20px",opacity:0.4 }}/>
                        <div style={{ position:"absolute",top:-20,right:-12,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.16),transparent 70%)" }}/>
                        {enr
                          ? <div className="cdv-badge" style={{ background:done?"rgba(22,163,74,0.88)":"rgba(124,58,237,0.88)",color:"#fff" }}>{done?"✓ Done":`${pct}%`}</div>
                          : <div className="cdv-badge" style={{ background:"rgba(0,0,0,0.28)",color:"rgba(255,255,255,0.92)" }}>{c.cat}</div>
                        }
                        <div className="cdv-emoji">{ic}</div>
                        {pct>0 && (
                          <div className="cdv-prog-bar">
                            <div className="cdv-prog-fill" style={{ width:`${pct}%`,background:done?"rgba(34,197,94,0.9)":"rgba(255,255,255,0.88)" }}/>
                          </div>
                        )}
                        <div className="cdv-overlay">
                          <div className="cdv-play"><svg width="12" height="12" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg></div>
                          <span style={{ color:"#fff",fontSize:10,fontWeight:700,textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{done?"Review":enr?`Continue · ${pct}%`:"Enroll Now"}</span>
                          {tl && <span style={{ color:"rgba(255,255,255,0.65)",fontSize:9,fontWeight:600 }}>⏱ {tl}</span>}
                        </div>
                      </div>
                      {/* Body */}
                      <div className="cdv-body">
                        <div className="cdv-title">{c.title}</div>
                        <div className="cdv-desc">{c.desc}</div>
                        {enr && !done && pct>0 && (
                          <div className="cdv-card-prog">
                            <div className="cdv-card-prog-bar">
                              <div className="cdv-card-prog-fill" style={{ width:`${pct}%` }}/>
                            </div>
                            <div className="cdv-card-prog-lbl">{pct}% complete</div>
                          </div>
                        )}
                        <div className="cdv-meta">
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                          {c.time}
                          {mc>0 && <>
                            <div className="cdv-dot"/>
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#0d9488" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                            <span style={{ color:"#0d9488",fontWeight:600 }}>{mc}m · {chc}ch</span>
                          </>}
                        </div>
                        <button
                          className={`cdv-cta${done?" done":enr?" enr":" new"}`}
                          onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}>
                          {done
                            ? <><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l4 4 6-6"/></svg>Review</>
                            : enr
                            ? <><svg width="9" height="9" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>Continue</>
                            : <><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>Enroll</>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ClientView({ courses, setCourses, categories, toast, onOpenCourse, publishedActivities }: ClientViewProps) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{S}</style>
      <div className="cdv-wrap">
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,flexShrink:0 }}>
          <span style={{ fontFamily:"'DM Serif Display',serif",fontSize:21,fontWeight:400,color:"var(--t1)" }}>
            My <em style={{ fontStyle:"italic",color:"var(--purple)" }}>Dashboard</em>
          </span>
          <div style={{ flex:1,height:1,background:"linear-gradient(to right,rgba(124,58,237,0.12),transparent)",marginLeft:8 }}/>
          <div className="cdv-tabs">
            {[
              { l:"Dashboard", i:<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1.5" y="1.5" width="4" height="4" rx="1"/><rect x="8.5" y="1.5" width="4" height="4" rx="1"/><rect x="1.5" y="8.5" width="4" height="4" rx="1"/><rect x="8.5" y="8.5" width="4" height="4" rx="1"/></svg> },
              { l:"My Progress", i:<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/></svg> },
            ].map((t,i) => (
              <button key={i} className={`cdv-tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>{t.i}{t.l}</button>
            ))}
          </div>
        </div>

        {/* Panels */}
        <div className="swipe-container">
          <div className="swipe-track" style={{ transform:`translateX(-${tab*100}%)` }}>
            <div className="swipe-panel" style={{ width:"100%" }}>
              <DashboardPanel courses={courses} categories={categories} onOpenCourse={onOpenCourse} toast={toast}/>
            </div>
            <div className="swipe-panel" style={{ width:"100%" }}>
              <ProgressPanel toast={toast}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
