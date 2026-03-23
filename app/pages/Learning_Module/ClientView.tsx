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
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = `
/* ── Design tokens ─────────────────────────────────────────────────────── */
.lv {
  --vio:  var(--purple, #7c3aed);
  --vio2: #8b5cf6;
  --vio3: #c4b5fd;
  --bd:   var(--border, rgba(124,58,237,0.1));
  --surf: var(--surface, #fff);
  --surf2:var(--surface2, #f2f0fb);
  --ink:  var(--t1, #18103a);
  --ink2: var(--t2, #4a3870);
  --ink3: var(--t3, #8e7ec0);
  --page: var(--bg, #f8f7ff);
  font-family:'Sora', 'DM Sans', sans-serif;
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
  flex:1; min-height:0;
  display:flex; flex-direction:column;
  overflow:hidden;
  background:var(--bg,#f8f7ff);
}

/* ── Tab bar ────────────────────────────────────────────────────────────── */
.lv-bar {
  flex:0 0 auto; display:flex; align-items:center; gap:14px;
  padding:0 0 14px; min-width:0;
  border-bottom:1.5px solid var(--bd);
  margin-bottom:18px;
}
.lv-wordmark {
  font-family:'Playfair Display',serif;
  font-size:20px; font-weight:700; font-style:italic;
  color:var(--ink); letter-spacing:-0.02em; white-space:nowrap;
}
.lv-wordmark span { color:var(--vio); }
.lv-rule { flex:1; height:1px; background:linear-gradient(90deg,var(--bd),transparent); }
.lv-tabs {
  display:flex; gap:2px; padding:3px;
  background:var(--surf2);
  border:1.5px solid var(--bd);
  border-radius:12px;
}
.lv-tab {
  display:flex; align-items:center; gap:5px;
  padding:6px 15px; border-radius:9px; border:none; cursor:pointer;
  font-size:11.5px; font-weight:700; font-family:'Sora',sans-serif;
  white-space:nowrap; color:var(--ink3);
  background:transparent; transition:all .16s;
}
.lv-tab.on {
  background:linear-gradient(135deg,var(--vio),#4f1eb8);
  color:#fff; box-shadow:0 3px 12px rgba(108,61,214,.35);
}
.lv-tab:not(.on):hover { color:var(--vio); background:rgba(108,61,214,.07); }

/* ── Slide container ────────────────────────────────────────────────────── */
.lv-outer {
  flex:1 1 0; min-height:0; min-width:0;
  overflow:hidden; position:relative;
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
.lv-scroll::-webkit-scrollbar-thumb { background:var(--vio3); border-radius:3px; }

/* ── Section head ───────────────────────────────────────────────────────── */
.lv-sh { display:flex; align-items:baseline; gap:7px; margin-bottom:12px; }
.lv-sh-title { font-size:12.5px; font-weight:800; color:var(--ink); letter-spacing:-.015em; }
.lv-sh-sub   { font-size:10px; color:var(--ink3); font-weight:600; }
.lv-sh-pip   { flex:1; height:1px; background:linear-gradient(90deg,var(--bd),transparent); }

/* ══════════════════════════════════════════════════════════════════════════
   AI BANNER
   ══════════════════════════════════════════════════════════════════════════ */
.lv-ai {
  border-radius:20px; overflow:hidden; position:relative;
  margin-bottom:18px; display:flex;
  background:var(--surf);
  border:1.5px solid var(--bd);
  box-shadow:0 4px 28px rgba(108,61,214,.08), 0 1px 4px rgba(0,0,0,.04);
  animation:lvFadeUp .5s cubic-bezier(.16,1,.3,1) both;
  min-height:0;
}
.lv-ai-side {
  flex-shrink:0; width:5px;
  background:linear-gradient(to bottom,var(--vio),var(--teal));
  border-radius:20px 0 0 20px;
}
.lv-ai-tint {
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(ellipse 55% 60% at 90% 10%, rgba(139,92,246,.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 50% at 5% 90%,  rgba(13,148,136,.05) 0%, transparent 70%);
}
.lv-ai-body { position:relative; z-index:1; flex:1; padding:20px 22px 20px 18px; }
.lv-ai-pill {
  display:inline-flex; align-items:center; gap:5px; margin-bottom:10px;
  padding:3px 10px; border-radius:20px;
  background:rgba(108,61,214,.08); border:1px solid rgba(108,61,214,.18);
  font-size:8.5px; font-weight:800; color:var(--vio); letter-spacing:.09em; text-transform:uppercase;
}
.lv-ai-dot { width:5px; height:5px; border-radius:50%; background:var(--vio); animation:lvPulse 1.8s infinite; }
.lv-ai-hello {
  font-family:'Playfair Display',serif; font-size:18px; font-weight:700; font-style:italic;
  color:var(--ink); letter-spacing:-.02em; margin-bottom:6px; line-height:1.25;
}
.lv-ai-hello b { font-style:normal; color:var(--vio); font-family:'Sora',sans-serif; font-size:16px; font-weight:800; }
.lv-ai-text { font-size:12px; color:var(--ink2); line-height:1.7; margin-bottom:14px; max-width:620px; }
.lv-ai-chips { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:14px; }
.lv-ai-chip {
  display:flex; align-items:center; gap:6px;
  padding:7px 11px; border-radius:10px;
  background:var(--surf2); border:1.5px solid var(--bd);
  flex:1; min-width:140px; max-width:240px;
}
.lv-ai-chip-ico { font-size:14px; flex-shrink:0; }
.lv-ai-chip-txt { font-size:11px; color:var(--ink2); font-weight:500; line-height:1.4; }
.lv-ai-chip-txt strong { color:var(--ink); font-weight:800; }
.lv-ai-rec {
  display:flex; align-items:center; gap:11px;
  padding:11px 14px; border-radius:12px; cursor:pointer;
  background:linear-gradient(135deg,rgba(108,61,214,.07),rgba(13,148,136,.05));
  border:1.5px solid rgba(108,61,214,.14); transition:all .18s;
}
.lv-ai-rec:hover { background:linear-gradient(135deg,rgba(108,61,214,.12),rgba(13,148,136,.08)); border-color:rgba(108,61,214,.26); transform:translateX(3px); }
.lv-ai-rec-ico  { font-size:18px; flex-shrink:0; }
.lv-ai-rec-lbl  { font-size:8.5px; font-weight:800; color:var(--vio); letter-spacing:.07em; text-transform:uppercase; margin-bottom:2px; }
.lv-ai-rec-name { font-size:12.5px; font-weight:700; color:var(--ink); }
.lv-ai-rec-arr  { margin-left:auto; color:var(--vio); font-size:17px; transition:transform .18s; }
.lv-ai-rec:hover .lv-ai-rec-arr { transform:translateX(4px); }

/* ══════════════════════════════════════════════════════════════════════════
   STATS ROW
   ══════════════════════════════════════════════════════════════════════════ */
.lv-stats { display:flex; gap:9px; margin-bottom:18px; }
.lv-stat {
  flex:1; padding:13px 14px; border-radius:14px;
  background:var(--surf); border:1.5px solid var(--bd);
  box-shadow:0 1px 6px rgba(0,0,0,.04);
  position:relative; overflow:hidden;
  animation:lvPop .42s cubic-bezier(.16,1,.3,1) both;
  cursor:default;
}
.lv-stat::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2.5px; border-radius:14px 14px 0 0;
}
.lv-stat.sv::before { background:linear-gradient(90deg,#6c3dd6,#a78bfa); }
.lv-stat.sa::before { background:linear-gradient(90deg,#d97706,#fbbf24); }
.lv-stat.sg::before { background:linear-gradient(90deg,#059669,#34d399); }
.lv-stat.sb::before { background:linear-gradient(90deg,#2563eb,#60a5fa); }
.lv-stat-inner { display:flex; align-items:center; gap:10px; }
.lv-stat-ico {
  width:34px; height:34px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:16px;
}
.lv-stat.sv .lv-stat-ico { background:rgba(108,61,214,.09); }
.lv-stat.sa .lv-stat-ico { background:rgba(217,119,6,.09); }
.lv-stat.sg .lv-stat-ico { background:rgba(5,150,105,.09); }
.lv-stat.sb .lv-stat-ico { background:rgba(37,99,235,.09); }
.lv-stat-num { font-size:22px; font-weight:900; color:var(--ink); line-height:1; letter-spacing:-.04em; }
.lv-stat-lbl { font-size:9px; font-weight:700; color:var(--ink3); margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
.lv-ring-stat {
  display:flex; align-items:center; gap:10px;
  padding:13px 15px; border-radius:14px;
  background:linear-gradient(135deg,#f5f0ff,#f0fdf9);
  border:1.5px solid var(--bd);
  animation:lvPop .42s cubic-bezier(.16,1,.3,1) .2s both;
  flex-shrink:0;
}
.lv-ring-val { font-size:17px; font-weight:900; color:var(--vio); line-height:1; letter-spacing:-.03em; }
.lv-ring-lbl { font-size:8.5px; font-weight:700; color:var(--ink3); margin-top:2px; text-transform:uppercase; letter-spacing:.05em; }

/* ══════════════════════════════════════════════════════════════════════════
   CONTINUE LEARNING STRIP
   ══════════════════════════════════════════════════════════════════════════ */
.lv-continue { display:grid; grid-template-columns:repeat(auto-fill,minmax(255px,1fr)); gap:9px; margin-bottom:20px; }
.lv-cont {
  display:flex; align-items:center; gap:12px;
  padding:11px 13px; border-radius:13px;
  background:var(--surf); border:1.5px solid var(--bd);
  cursor:pointer; transition:all .18s;
  animation:lvSlide .3s cubic-bezier(.16,1,.3,1) both;
}
.lv-cont:hover { border-color:rgba(108,61,214,.24); transform:translateY(-2px); box-shadow:0 6px 20px rgba(108,61,214,.1); }
.lv-cont-thumb {
  width:46px; height:46px; border-radius:11px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; position:relative; overflow:hidden;
}
.lv-cont-body { flex:1; min-width:0; }
.lv-cont-name { font-size:11.5px; font-weight:800; color:var(--ink); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lv-cont-pct  { font-size:9.5px; font-weight:700; color:var(--vio); margin-bottom:4px; }
.lv-cont-bar  { height:3px; border-radius:3px; background:rgba(108,61,214,.1); overflow:hidden; }
.lv-cont-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--vio),var(--teal)); animation:lvBar .7s cubic-bezier(.16,1,.3,1) both; }
.lv-cont-btn {
  flex-shrink:0; padding:6px 11px; border-radius:8px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff;
  font-size:10px; font-weight:700; font-family:'Sora',sans-serif;
  display:flex; align-items:center; gap:3px;
  transition:all .16s; box-shadow:0 2px 8px rgba(108,61,214,.28);
}
.lv-cont-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(108,61,214,.38); }

/* ══════════════════════════════════════════════════════════════════════════
   CAROUSEL
   ══════════════════════════════════════════════════════════════════════════ */
.lv-car { margin-bottom:22px; }
.lv-car-window {
  position:relative; border-radius:20px; overflow:hidden;
  height:224px;
  border:1.5px solid var(--bd);
  box-shadow:0 8px 36px rgba(108,61,214,.1), 0 2px 8px rgba(0,0,0,.05);
}
.lv-car-track {
  display:flex; height:100%;
  transition:transform .52s cubic-bezier(.16,1,.3,1);
  will-change:transform;
}
.lv-car-slide {
  flex:0 0 100%; height:100%; position:relative; overflow:hidden; cursor:pointer;
}
.lv-car-bg { position:absolute; inset:0; transition:transform .65s cubic-bezier(.16,1,.3,1); }
.lv-car-slide:hover .lv-car-bg { transform:scale(1.035); }
.lv-car-scrim {
  position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(
    100deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0) 38%,
    rgba(255,255,255,0.72) 62%,
    rgba(255,255,255,0.97) 100%
  );
}
.lv-car-accent { position:absolute; top:0; left:0; right:0; height:3px; z-index:3; }
.lv-car-content { position:absolute; inset:0; z-index:4; display:flex; }
.lv-car-l {
  flex:1; display:flex; flex-direction:column;
  justify-content:flex-end; padding:20px 24px 20px 58px;
  /* left 58px = 12px edge + 33px arrow + 13px gap so title never clips */
}
.lv-car-eyebrow {
  font-size:8.5px; font-weight:800; text-transform:uppercase; letter-spacing:.1em;
  color:rgba(255,255,255,.7); margin-bottom:5px;
  display:flex; align-items:center; gap:5px;
}
.lv-car-eyebrow-dot { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.5); }
.lv-car-title {
  font-family:'Playfair Display',serif;
  font-size:22px; font-weight:700; font-style:italic;
  color:#fff; letter-spacing:-.02em; line-height:1.2; margin-bottom:8px;
  text-shadow:0 2px 12px rgba(0,0,0,.22);
}
.lv-car-desc {
  font-size:11.5px; color:rgba(255,255,255,.65); line-height:1.55;
  margin-bottom:14px; max-width:340px;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.lv-car-pills { display:flex; gap:7px; flex-wrap:wrap; }
.lv-car-pill {
  display:flex; align-items:center; gap:4px;
  padding:4px 9px; border-radius:20px; font-size:9.5px; font-weight:600;
  background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.28);
  backdrop-filter:blur(6px); color:rgba(255,255,255,.9);
}
.lv-car-prog-pill {
  display:flex; align-items:center; gap:6px;
  padding:4px 9px; border-radius:20px;
  background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.22);
  backdrop-filter:blur(6px);
}
.lv-car-prog-bar  { width:56px; height:2.5px; background:rgba(255,255,255,.25); border-radius:3px; overflow:hidden; }
.lv-car-prog-fill { height:100%; border-radius:3px; animation:lvBar .8s cubic-bezier(.16,1,.3,1) both; }
.lv-car-r {
  flex-shrink:0; width:196px; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:14px;
  padding:20px 18px;
  background:rgba(255,255,255,.82); backdrop-filter:blur(12px);
  border-left:1.5px solid rgba(255,255,255,.6);
}
.lv-car-emoji { font-size:46px; line-height:1; filter:drop-shadow(0 4px 12px rgba(0,0,0,.15)); }
.lv-car-status-badge {
  font-size:8px; font-weight:800; letter-spacing:.07em; text-transform:uppercase;
  padding:3px 9px; border-radius:20px;
}
.lv-car-cta {
  width:100%; padding:9px 14px; border-radius:10px; border:none; cursor:pointer;
  font-size:11.5px; font-weight:800; font-family:'Sora',sans-serif;
  display:flex; align-items:center; justify-content:center; gap:6px;
  transition:all .18s; letter-spacing:-.01em;
}
.lv-car-cta:hover { transform:translateY(-2px); }
.lv-car-cta.new  { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; box-shadow:0 4px 14px rgba(108,61,214,.38); }
.lv-car-cta.enr  { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; box-shadow:0 4px 14px rgba(108,61,214,.38); }
.lv-car-cta.done { background:linear-gradient(135deg,#065f46,var(--teal)); color:#fff; box-shadow:0 4px 14px rgba(13,148,136,.38); }

/*
  FIX: Carousel arrow buttons
  - Left arrow: 12px from left (sits in the coloured area)
  - Right arrow: calc(196px + 12px) = 208px from right (just outside the white panel)
  Both are vertically centred and never overlap the content panel.
*/
.lv-car-btn {
  position:absolute; top:50%; transform:translateY(-50%); z-index:10;
  width:33px; height:33px; border-radius:50%; border:1.5px solid rgba(255,255,255,.5);
  background:rgba(255,255,255,.22); backdrop-filter:blur(10px);
  color:#fff; font-size:16px; font-family:sans-serif;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .16s;
}
.lv-car-btn:hover { background:rgba(255,255,255,.42); transform:translateY(-50%) scale(1.08); }
.lv-car-btn.l { left:12px; }
/* RIGHT arrow cleared past the 196px white panel + a 12px gap */
.lv-car-btn.r { right:208px; }

/* controls strip */
.lv-car-ctrl { display:flex; align-items:center; gap:8px; margin-top:11px; }
.lv-car-dots { display:flex; gap:5px; align-items:center; }
.lv-car-dot  { height:5px; width:5px; border-radius:3px; cursor:pointer; background:rgba(108,61,214,.16); transition:all .25s cubic-bezier(.16,1,.3,1); }
.lv-car-dot.on { width:20px; background:linear-gradient(90deg,var(--vio),var(--teal)); box-shadow:0 1px 6px rgba(108,61,214,.35); }
.lv-car-count { font-size:10px; font-weight:700; color:var(--ink3); font-variant-numeric:tabular-nums; }
.lv-car-all {
  margin-left:auto; padding:5px 12px; border-radius:8px; border:none; cursor:pointer;
  background:rgba(108,61,214,.07); border:1.5px solid rgba(108,61,214,.13);
  color:var(--vio); font-size:10.5px; font-weight:700; font-family:'Sora',sans-serif;
  transition:all .15s; display:flex; align-items:center; gap:4px;
}
.lv-car-all:hover { background:rgba(108,61,214,.12); transform:translateX(2px); }

/* ══════════════════════════════════════════════════════════════════════════
   COURSE GRID
   ══════════════════════════════════════════════════════════════════════════ */
.lv-filters { display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:10px; flex-shrink:0; }
.lv-chip {
  display:inline-flex; align-items:center; gap:3px;
  font-size:10.5px; font-weight:700; color:var(--ink2);
  padding:4px 10px; border-radius:20px; cursor:pointer; white-space:nowrap;
  background:var(--surf); border:1.5px solid var(--bd);
  transition:all .13s; font-family:'Sora',sans-serif;
}
.lv-chip:hover { border-color:rgba(108,61,214,.24); color:var(--vio); }
.lv-chip.on   { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(108,61,214,.26); }
.lv-chip.on-t { background:linear-gradient(135deg,var(--teal),#0f766e); color:#fff; border-color:transparent; }
.lv-chip-sep  { width:1px; height:13px; background:var(--bd); flex-shrink:0; }
.lv-search {
  display:flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:9px; background:var(--surf);
  border:1.5px solid var(--bd); transition:border-color .14s;
}
.lv-search:focus-within { border-color:rgba(108,61,214,.3); }
.lv-search input { border:none; outline:none; background:transparent; font-size:11px; color:var(--ink); width:130px; font-family:'Sora',sans-serif; }
.lv-grid-scroll { flex:1 1 0; min-height:0; overflow-y:auto; }
.lv-grid-scroll::-webkit-scrollbar { width:3px; }
.lv-grid-scroll::-webkit-scrollbar-thumb { background:var(--vio3); border-radius:3px; }
.lv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(218px,1fr)); gap:11px; padding-bottom:20px; }

/* ── Course card ──────────────────────────────────────────────────────────── */
.lv-card {
  border-radius:14px; overflow:hidden; background:var(--surf);
  border:1.5px solid var(--bd); box-shadow:0 1px 6px rgba(0,0,0,.04);
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
.lv-card-title { font-size:12px; font-weight:800; color:var(--ink); line-height:1.3; margin-bottom:3px; }
.lv-card-desc  { font-size:10.5px; color:var(--ink3); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:7px; flex:1; }
.lv-card-meta  { display:flex; align-items:center; gap:4px; margin-bottom:8px; font-size:9px; color:var(--ink3); }
.lv-card-prog  { margin-bottom:7px; }
.lv-card-prog-bar  { height:3px; border-radius:3px; background:rgba(108,61,214,.08); overflow:hidden; margin-bottom:3px; }
.lv-card-prog-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--vio),var(--teal)); animation:lvBar .6s cubic-bezier(.16,1,.3,1) both; }
.lv-card-prog-lbl  { font-size:9px; font-weight:700; color:var(--vio); }
.lv-cta { width:100%; padding:6px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-weight:700; font-family:'Sora',sans-serif; display:flex; align-items:center; justify-content:center; gap:4px; transition:all .15s; }
.lv-cta:hover { transform:translateY(-1px); filter:brightness(1.06); }
.lv-cta.new  { background:rgba(108,61,214,.08); color:var(--vio); border:1.5px solid rgba(108,61,214,.14); }
.lv-cta.new:hover { background:rgba(108,61,214,.13); }
.lv-cta.enr  { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; box-shadow:0 2px 8px rgba(108,61,214,.26); }
.lv-cta.done { background:linear-gradient(135deg,#065f46,var(--teal)); color:#fff; }

/* ══════════════════════════════════════════════════════════════════════════
   PROGRESS TAB
   ══════════════════════════════════════════════════════════════════════════ */
.lv-prog { display:flex; flex-direction:column; height:100%; min-height:0; }
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

        {/* ── Top bar ── */}
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
              <ProgressPanel toast={toast} />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
