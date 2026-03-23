'use client'

import { useState } from "react";
import type { Course } from "../../Data/types";
import type { Activity } from "./ActivityBuilderPanel";
import { CARD_STYLES } from "../Logic/CourseCatalogLogic";
import Dashboard from "./ClientDashboard";
import Catalog from "./ClientCatalog";
import ProgressPanel from "./ClientProgress";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface ClientViewProps {
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  categories: string[];
  toast: (msg: string) => void;
  onOpenCourse: (idx: number) => void;
  publishedActivities: Activity[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified token stylesheet — single source of truth for all child components
// ─────────────────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

/* ── Unified design tokens ─────────────────────────────────────────────── */
.lv {
  /* colour */
  --token-vio:   #6c3dd6;
  --token-vio2:  #8b5cf6;
  --token-vio3:  #c4b5fd;
  --token-teal:  #0d9488;
  --token-ink:   #18103a;
  --token-ink2:  #4a3870;
  --token-ink3:  #8e7ec0;
  --token-surf:  #ffffff;
  --token-surf2: #f4f2fb;
  --token-bd:    rgba(108,61,214,0.1);
  --token-shadow: rgba(108,61,214,0.12);
  --token-page:  #f7f6fe;

  /* aliases so child components can use either naming style */
  --vio:   var(--token-vio);
  --vio2:  var(--token-vio2);
  --vio3:  var(--token-vio3);
  --teal:  var(--token-teal);
  --ink:   var(--token-ink);
  --ink2:  var(--token-ink2);
  --ink3:  var(--token-ink3);
  --surf:  var(--token-surf);
  --surf2: var(--token-surf2);
  --bd:    var(--token-bd);

  /* expose as the var names page.tsx / globals.css use */
  --purple:   var(--token-vio);
  --purple-d: #4f1eb8;
  --purple-lt: rgba(108,61,214,0.07);
  --border:   var(--token-bd);
  --surface:  var(--token-surf);
  --surface2: var(--token-surf2);
  --t1:  var(--token-ink);
  --t2:  var(--token-ink2);
  --t3:  var(--token-ink3);
  --t4:  rgba(142,126,192,0.6);
  --bg:  var(--token-page);

  /* spacing */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;

  /* typography */
  font-family: 'DM Sans', system-ui, sans-serif;
}

/* ── Keyframes ──────────────────────────────────────────────────────────── */
@keyframes lvFadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes lvPop     { 0%{opacity:0;transform:scale(.9) translateY(8px)} 60%{transform:scale(1.02)} 100%{opacity:1;transform:none} }
@keyframes lvSlide   { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
@keyframes lvBar     { from{width:0} }
@keyframes lvRing    { from{stroke-dasharray:0 999} }
@keyframes lvPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }

/* ── Shell ──────────────────────────────────────────────────────────────── */
.lv-shell {
  flex: 1 1 0;
  height: 100%;        /* ← FIXED: claim full parent height */
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--token-page);
}

/* ── Tab bar — editorial bottom-border style ────────────────────────────── */
.lv-bar {
  flex:0 0 auto; display:flex; align-items:center; gap:20px;
  padding:0 0 0; min-width:0;
  border-bottom:1.5px solid var(--token-bd);
  margin-bottom:20px;
}

/* Wordmark — display serif, confident */
.lv-wordmark {
  font-family:'DM Serif Display', Georgia, serif;
  font-size:22px; font-weight:400; font-style:italic;
  color:var(--token-ink); letter-spacing:-0.01em; white-space:nowrap;
  padding-bottom:12px;
}
.lv-wordmark span { color:var(--token-vio); font-style:normal; }

.lv-rule { flex:1; height:1px; background:linear-gradient(90deg,var(--token-bd),transparent); }

/* Tabs — editorial magazine section nav, bottom-border active state */
.lv-tabs {
  display:flex; gap:0; align-items:stretch;
}
.lv-tab {
  display:flex; align-items:center; gap:6px;
  padding:0 18px 12px; border:none; cursor:pointer;
  font-size:11.5px; font-weight:600; font-family:'DM Sans',sans-serif;
  white-space:nowrap; color:var(--token-ink3);
  background:transparent; transition:color .16s;
  border-bottom:2px solid transparent;
  margin-bottom:-1.5px;
  position:relative;
}
.lv-tab.on {
  color:var(--token-vio);
  border-bottom-color:var(--token-vio);
  font-weight:700;
}
.lv-tab:not(.on):hover { color:var(--token-ink2); }

/* ── Slide container ────────────────────────────────────────────────────── */
.lv-outer {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}
.lv-track {
  display:flex; width:300%; height:100%;
  transition:transform .42s cubic-bezier(.16,1,.3,1);
  will-change:transform;
}
.lv-panel {
  flex:0 0 33.3333%; min-width:0; height:100%;
  display:flex; flex-direction:column; overflow:hidden;
}

/* ── Scroll region ──────────────────────────────────────────────────────── */
.lv-scroll {
  flex:1 1 0; min-height:0;
  overflow-y:auto; overflow-x:hidden; padding-right:3px;
}
.lv-scroll::-webkit-scrollbar { width:3px; }
.lv-scroll::-webkit-scrollbar-track { background:transparent; }
.lv-scroll::-webkit-scrollbar-thumb { background:var(--token-vio3); border-radius:3px; }

/* ── Section head ───────────────────────────────────────────────────────── */
.lv-sh { display:flex; align-items:baseline; gap:7px; margin-bottom:12px; }
.lv-sh-title { font-size:12.5px; font-weight:800; color:var(--token-ink); letter-spacing:-.015em; }
.lv-sh-sub   { font-size:10px; color:var(--token-ink3); font-weight:600; }
.lv-sh-pip   { flex:1; height:1px; background:linear-gradient(90deg,var(--token-bd),transparent); }

/* ── Card base (grid/catalog cards) ────────────────────────────────────── */
.lv-card {
  border-radius:14px; overflow:hidden; background:var(--token-surf);
  border:1.5px solid var(--token-bd); box-shadow:0 1px 6px rgba(0,0,0,.04);
  cursor:pointer; display:flex; flex-direction:column;
  transition:all .18s; animation:lvFadeUp .28s cubic-bezier(.16,1,.3,1) both;
}
.lv-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(108,61,214,.13); border-color:rgba(108,61,214,.22); }
.lv-card-thumb { height:124px; position:relative; overflow:hidden; flex-shrink:0; }
.lv-card-hover {
  position:absolute; inset:0; background:rgba(0,0,0,.36); backdrop-filter:blur(2px);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  opacity:0; transition:opacity .15s;
}
.lv-card:hover .lv-card-hover { opacity:1; }
.lv-card-play {
  width:34px; height:34px; border-radius:50%;
  border:2px solid rgba(255,255,255,.7); background:rgba(255,255,255,.14);
  display:flex; align-items:center; justify-content:center;
}
.lv-card-badge {
  position:absolute; top:7px; left:7px; padding:2px 7px; border-radius:20px;
  backdrop-filter:blur(6px); font-size:7.5px; font-weight:800;
  letter-spacing:.06em; text-transform:uppercase; border:1px solid rgba(255,255,255,.15);
}
.lv-card-emoji { position:absolute; bottom:7px; left:9px; font-size:30px; line-height:1; filter:drop-shadow(0 2px 6px rgba(0,0,0,.22)); user-select:none; }
.lv-card-pbar  { position:absolute; bottom:0; left:0; right:0; height:2.5px; background:rgba(0,0,0,.14); }
.lv-card-pfill { height:100%; border-radius:0 2px 2px 0; }
.lv-card-body  { padding:10px 11px 11px; flex:1; display:flex; flex-direction:column; }
.lv-card-title { font-family:'DM Serif Display',serif; font-size:14px; font-weight:400; font-style:italic; color:var(--token-ink); line-height:1.3; margin-bottom:3px; }
.lv-card-desc  { font-size:11px; color:var(--token-ink3); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:7px; flex:1; }
.lv-card-meta  { display:flex; align-items:center; gap:4px; margin-bottom:8px; font-size:9px; color:var(--token-ink3); }
.lv-card-prog  { margin-bottom:7px; }
.lv-card-prog-bar  { height:3px; border-radius:3px; background:rgba(108,61,214,.08); overflow:hidden; margin-bottom:3px; }
.lv-card-prog-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--token-vio),var(--token-teal)); animation:lvBar .6s cubic-bezier(.16,1,.3,1) both; }
.lv-card-prog-lbl  { font-size:9px; font-weight:700; color:var(--token-vio); }

/* CTA buttons — unified token colors */
.lv-cta { width:100%; padding:7px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:4px; transition:all .15s; }
.lv-cta:hover { transform:translateY(-1px); filter:brightness(1.06); }
.lv-cta.new  { background:rgba(108,61,214,.08); color:var(--token-vio); border:1.5px solid rgba(108,61,214,.14); }
.lv-cta.new:hover { background:rgba(108,61,214,.13); }
.lv-cta.enr  { background:linear-gradient(135deg,var(--token-vio),#4f1eb8); color:#fff; box-shadow:0 2px 8px rgba(108,61,214,.26); }
.lv-cta.done { background:linear-gradient(135deg,#065f46,var(--token-teal)); color:#fff; }

/* ── Progress tab ───────────────────────────────────────────────────────── */
.lv-prog { display:flex; flex-direction:column; height:100%; min-height:0; }

/* ── Catalog grid/scroll ────────────────────────────────────────────────── */
.lv-grid-scroll { flex:1 1 0; min-height:0; overflow-y:auto; }
.lv-grid-scroll::-webkit-scrollbar { width:3px; }
.lv-grid-scroll::-webkit-scrollbar-thumb { background:var(--token-vio3); border-radius:3px; }
.lv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(218px,1fr)); gap:11px; padding-bottom:20px; }

/* ── Filters ────────────────────────────────────────────────────────────── */
.lv-filters { display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:10px; flex-shrink:0; }
.lv-chip {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10.5px; font-weight:600; color:var(--token-ink2);
  padding:5px 11px; border-radius:20px; cursor:pointer; white-space:nowrap;
  background:var(--token-surf); border:1.5px solid var(--token-bd);
  transition:all .13s; font-family:'DM Sans',sans-serif;
}
.lv-chip:hover { border-color:rgba(108,61,214,.24); color:var(--token-vio); }
.lv-chip.on   { background:linear-gradient(135deg,var(--token-vio),#4f1eb8); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(108,61,214,.26); }
.lv-chip.on-t { background:linear-gradient(135deg,var(--token-teal),#0f766e); color:#fff; border-color:transparent; }
.lv-chip-sep  { width:1px; height:13px; background:var(--token-bd); flex-shrink:0; }
.lv-search {
  display:flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:9px; background:var(--token-surf);
  border:1.5px solid var(--token-bd); transition:border-color .14s;
}
.lv-search:focus-within { border-color:rgba(108,61,214,.3); }
.lv-search input { border:none; outline:none; background:transparent; font-size:11px; color:var(--token-ink); width:130px; font-family:'DM Sans',sans-serif; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Root export — thin orchestrator
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientView({
  courses, setCourses, categories, toast, onOpenCourse, publishedActivities
}: ClientViewProps) {
  const [tab, setTab] = useState(0);

  const TABS = [
    {
      l: "Dashboard",
      i: <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="1.5" y="1.5" width="4" height="4" rx="1" />
        <rect x="8.5" y="1.5" width="4" height="4" rx="1" />
        <rect x="1.5" y="8.5" width="4" height="4" rx="1" />
        <rect x="8.5" y="8.5" width="4" height="4" rx="1" />
      </svg>
    },
    {
      l: "Catalog",
      i: <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M2 3.5h10M2 7h10M2 10.5h6" />
      </svg>
    },
    {
      l: "Progress",
      i: <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.5" />
      </svg>
    },
  ];

  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{S}</style>
      <div className="lv lv-shell">

        {/* ── Top bar — editorial ── */}
        <div className="lv-bar">
          <span className="lv-wordmark">My <span>Learning</span></span>
          <div className="lv-rule" />
          <div className="lv-tabs">
            {TABS.map((t, i) => (
              <button key={i} className={`lv-tab${tab === i ? " on" : ""}`} onClick={() => setTab(i)}>
                {t.i}{t.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="lv-outer">
          <div className="lv-track" style={{ transform: `translateX(-${tab * 33.3333}%)` }}>

            <div className="lv-panel">
              <Dashboard
                courses={courses}
                onOpenCourse={onOpenCourse}
                onGoToCatalog={() => setTab(1)}
              />
            </div>

            <div className="lv-panel">
              <Catalog
                courses={courses}
                onOpenCourse={onOpenCourse}
              />
            </div>

            <div className="lv-panel">
              <ProgressPanel toast={toast} courses={courses} onOpenCourse={onOpenCourse} />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
