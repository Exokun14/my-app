'use client'

import { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Design tokens + global styles ───────────────────────────────────────────
const S = `
/* ── Design tokens — extend globals.css vars ────────────────────────── */
/* We piggyback on the existing --purple, --t1, --t2, --t3, --bg etc.    */
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

/* ── Keyframes ───────────────────────────────────────────────────────── */
@keyframes lvFadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes lvPop     { 0%{opacity:0;transform:scale(.9) translateY(8px)} 60%{transform:scale(1.02)} 100%{opacity:1;transform:none} }
@keyframes lvSlide   { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
@keyframes lvBar     { from{width:0} }
@keyframes lvRing    { from{stroke-dasharray:0 999} }
@keyframes lvPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
@keyframes lvShift   { 0%,100%{transform:translate(0,0)} 33%{transform:translate(14px,-18px)} 66%{transform:translate(-10px,8px)} }
@keyframes lvCarIn   { from{opacity:0;transform:translateX(16px) scale(.97)} to{opacity:1;transform:none} }

/* ── SHELL — mirrors .swipe-container inside .lc-page ──────────────────── */
/* .lc-page: display:flex; flex-direction:column; height:100vh; overflow:hidden */
/* .swipe-container uses flex:1 — we do the exact same thing.                   */
.lv-shell {
  flex:1; min-height:0;          /* fill leftover height, never exceed it     */
  display:flex; flex-direction:column;
  overflow:hidden;
  background:var(--bg,#f8f7ff);  /* matches globals --bg                      */
}

/* ── Tab bar ──────────────────────────────────────────────────────────── */
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

/* ── Slide container — NEVER expands ─────────────────────────────────── */
.lv-outer {
  flex:1 1 0; min-height:0; min-width:0;  /* fills leftover, NEVER more */
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

/* ── Scroll region inside each panel ─────────────────────────────────── */
.lv-scroll {
  flex:1 1 0; min-height:0;
  overflow-y:auto; overflow-x:hidden; padding-right:3px;
}
.lv-scroll::-webkit-scrollbar { width:3px; }
.lv-scroll::-webkit-scrollbar-track { background:transparent; }
.lv-scroll::-webkit-scrollbar-thumb { background:var(--vio3); border-radius:3px; }

/* ── Section head ─────────────────────────────────────────────────────── */
.lv-sh { display:flex; align-items:baseline; gap:7px; margin-bottom:12px; }
.lv-sh-title { font-size:12.5px; font-weight:800; color:var(--ink); letter-spacing:-.015em; }
.lv-sh-sub   { font-size:10px; color:var(--ink3); font-weight:600; }
.lv-sh-pip   { flex:1; height:1px; background:linear-gradient(90deg,var(--bd),transparent); }

/* ═══════════════════════════════════════════════════════════════════════
   AI BANNER — light, editorial, sophisticated
   ═══════════════════════════════════════════════════════════════════════ */
.lv-ai {
  border-radius:20px; overflow:hidden; position:relative;
  margin-bottom:18px; display:flex;
  background:var(--surf);
  border:1.5px solid var(--bd);
  box-shadow:0 4px 28px rgba(108,61,214,.08), 0 1px 4px rgba(0,0,0,.04);
  animation:lvFadeUp .5s cubic-bezier(.16,1,.3,1) both;
  min-height:0;
}
/* coloured sidebar */
.lv-ai-side {
  flex-shrink:0; width:5px;
  background:linear-gradient(to bottom,var(--vio),var(--teal));
  border-radius:20px 0 0 20px;
}
/* pastel tint fills */
.lv-ai-tint {
  position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(ellipse 55% 60% at 90% 10%, rgba(139,92,246,.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 50% at 5% 90%,  rgba(13,148,136,.05) 0%, transparent 70%);
}
.lv-ai-body { position:relative; z-index:1; flex:1; padding:20px 22px 20px 18px; }
/* pill badge */
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

/* stat chips row */
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

/* recommended row */
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

/* ═══════════════════════════════════════════════════════════════════════
   STATS ROW
   ═══════════════════════════════════════════════════════════════════════ */
.lv-stats { display:flex; gap:9px; margin-bottom:18px; }
.lv-stat {
  flex:1; padding:13px 14px; border-radius:14px;
  background:var(--surf); border:1.5px solid var(--bd);
  box-shadow:0 1px 6px rgba(0,0,0,.04);
  position:relative; overflow:hidden;
  animation:lvPop .42s cubic-bezier(.16,1,.3,1) both;
  cursor:default;
}
/* top colour bar */
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

/* ═══════════════════════════════════════════════════════════════════════
   CONTINUE LEARNING STRIP
   ═══════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════
   CAROUSEL — light editorial hero
   ═══════════════════════════════════════════════════════════════════════ */
.lv-car { margin-bottom:22px; }

.lv-car-window {
  position:relative; border-radius:20px; overflow:hidden;
  height:224px;                         /* fixed — never grows */
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
/* gradient bg — vivid but light-friendly (left side saturated, right fades to near-white) */
.lv-car-bg { position:absolute; inset:0; transition:transform .65s cubic-bezier(.16,1,.3,1); }
.lv-car-slide:hover .lv-car-bg { transform:scale(1.035); }

/* WHITE fade scrim — creates a "torn page" editorial split */
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
/* top accent line */
.lv-car-accent { position:absolute; top:0; left:0; right:0; height:3px; z-index:3; }

/* two-column content layout */
.lv-car-content { position:absolute; inset:0; z-index:4; display:flex; }

/* LEFT — title + meta lives over the colour */
.lv-car-l {
  flex:1; display:flex; flex-direction:column;
  justify-content:flex-end; padding:20px 24px;
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

/* RIGHT — white panel with emoji + CTA */
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

/* arrow buttons */
.lv-car-btn {
  position:absolute; top:50%; transform:translateY(-50%); z-index:10;
  width:33px; height:33px; border-radius:50%; border:1.5px solid rgba(255,255,255,.5);
  background:rgba(255,255,255,.22); backdrop-filter:blur(10px);
  color:#fff; font-size:16px; font-family:sans-serif;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .16s;
}
.lv-car-btn:hover { background:rgba(255,255,255,.42); transform:translateY(-50%) scale(1.08); }
.lv-car-btn.l { left:12px; } .lv-car-btn.r { right:220px; }

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

/* ═══════════════════════════════════════════════════════════════════════
   COURSE GRID (catalog)
   ═══════════════════════════════════════════════════════════════════════ */
.lv-filters { display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:10px; flex-shrink:0; }
.lv-chip {
  display:inline-flex; align-items:center; gap:3px;
  font-size:10.5px; font-weight:700; color:var(--ink2);
  padding:4px 10px; border-radius:20px; cursor:pointer; white-space:nowrap;
  background:var(--surf); border:1.5px solid var(--bd);
  transition:all .13s; font-family:'Sora',sans-serif;
}
.lv-chip:hover { border-color:rgba(108,61,214,.24); color:var(--vio); }
.lv-chip.on { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(108,61,214,.26); }
.lv-chip.on-t { background:linear-gradient(135deg,var(--teal),#0f766e); color:#fff; border-color:transparent; }
.lv-chip-sep { width:1px; height:13px; background:var(--bd); flex-shrink:0; }
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

/* course card */
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

/* ═══════════════════════════════════════════════════════════════════════
   PROGRESS TAB
   ═══════════════════════════════════════════════════════════════════════ */
.lv-prog { display:flex; flex-direction:column; height:100%; min-height:0; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function MiniRing({ pct, size=44, stroke=4 }:{pct:number;size?:number;stroke?:number}) {
  const r=(size-stroke)/2, circ=2*Math.PI*r, dash=(pct/100)*circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <defs><linearGradient id="lvRG" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6c3dd6"/><stop offset="100%" stopColor="#0d9488"/>
      </linearGradient></defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(108,61,214,.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#lvRG)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{animation:"lvRing .9s cubic-bezier(.16,1,.3,1) .2s both"}}/>
    </svg>
  );
}

// ─── AI Banner (fully light) ──────────────────────────────────────────────────
function AIBanner({courses,onOpenCourse,onGoToCatalog}:{
  courses:Course[];onOpenCourse:(i:number)=>void;onGoToCatalog:()=>void;
}) {
  const enrolled   = courses.filter(c=>c.enrolled||(c.progress??0)>0);
  const completed  = courses.filter(c=>c.completed||(c.progress??0)>=100);
  const inProg     = enrolled.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100);
  const notStarted = courses.filter(c=>!(c.enrolled||(c.progress??0)>0));
  const avg = enrolled.length?Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length):0;
  const rec    = inProg.length>0?inProg.reduce((b,c)=>((c.progress??0)>(b.progress??0)?c:b),inProg[0]):notStarted[0]??null;
  const recIdx = rec?courses.indexOf(rec):-1;
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const summary = !enrolled.length
    ?"You haven't started any courses yet. Explore the catalog — your journey begins with one click."
    :completed.length===enrolled.length
    ?`Incredible — all ${completed.length} enrolled course${completed.length!==1?"s":""} complete! Discover what's next.`
    :inProg.length&&avg>=70
    ?`You're nearly there — ${avg}% average across ${inProg.length} active course${inProg.length!==1?"s":""}. Push to the finish!`
    :inProg.length
    ?`${inProg.length} course${inProg.length!==1?"s":""} in progress at ${avg}% avg. Consistency is the secret.`
    :`Enrolled in ${enrolled.length} course${enrolled.length!==1?"s":""}. Pick one and start your streak today.`;
  const chips=[
    enrolled.length>0  &&{ico:"📈",txt:<><strong>{avg}% avg progress</strong> across {enrolled.length} course{enrolled.length!==1?"s":""}</>},
    completed.length>0 &&{ico:"🏆",txt:<><strong>{completed.length} completed</strong> — great work!</>},
    inProg.length>0    &&{ico:"⚡",txt:<><strong>{inProg.length} in progress</strong> right now</>},
    !enrolled.length   &&{ico:"🚀",txt:<><strong>{courses.length} courses</strong> ready to explore</>},
  ].filter(Boolean).slice(0,3) as {ico:string;txt:React.ReactNode}[];
  return (
    <div className="lv-ai">
      <div className="lv-ai-side"/>
      <div className="lv-ai-tint"/>
      <div className="lv-ai-body">
        <div className="lv-ai-pill"><div className="lv-ai-dot"/>AI Learning Companion</div>
        <div className="lv-ai-hello">{greet}, <b>learner</b> 👋</div>
        <div className="lv-ai-text">{summary}</div>
        {chips.length>0&&(
          <div className="lv-ai-chips">
            {chips.map((c,i)=>(
              <div key={i} className="lv-ai-chip">
                <span className="lv-ai-chip-ico">{c.ico}</span>
                <div className="lv-ai-chip-txt">{c.txt}</div>
              </div>
            ))}
          </div>
        )}
        {rec&&recIdx>=0
          ?<div className="lv-ai-rec" onClick={()=>onOpenCourse(recIdx)}>
              <span className="lv-ai-rec-ico">{inProg.includes(rec)?"▶️":"🎯"}</span>
              <div>
                <div className="lv-ai-rec-lbl">{inProg.includes(rec)?"Continue where you left off":"Recommended for you"}</div>
                <div className="lv-ai-rec-name">{rec.title}</div>
              </div>
              <div className="lv-ai-rec-arr">→</div>
            </div>
          :notStarted.length>0&&
            <button onClick={onGoToCatalog} style={{width:"100%",padding:"10px 14px",borderRadius:11,background:"rgba(108,61,214,.07)",border:"1.5px solid rgba(108,61,214,.14)",color:"#6c3dd6",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .16s"}}>
              🗂️ Browse Course Catalog →
            </button>
        }
      </div>
    </div>
  );
}

// ─── Carousel (light editorial split layout) ──────────────────────────────────
// Each slide: left coloured area with text, right white panel with emoji+CTA
const SLIDE_GRADS=[
  ["#4c1d95","#7c3aed"],["#0c4a6e","#0369a1"],["#064e3b","#0d9488"],
  ["#78350f","#b45309"],["#7f1d1d","#b91c1c"],["#1e1b4b","#4338ca"],
  ["#134e4a","#0f766e"],["#3b0764","#7e22ce"],
];
const ACCENTS=["#a78bfa","#67e8f9","#6ee7b7","#fcd34d","#fca5a5","#c4b5fd","#7dd3fc","#86efac"];

function Carousel({courses,onOpenCourse,onGoToCatalog}:{
  courses:Course[];onOpenCourse:(i:number)=>void;onGoToCatalog:()=>void;
}) {
  const [active,setActive]=useState(0);
  const timer=useRef<ReturnType<typeof setTimeout>>();
  const featured=[
    ...courses.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100),
    ...courses.filter(c=>!(c.enrolled||(c.progress??0)>0)),
    ...courses.filter(c=>c.completed||(c.progress??0)>=100),
  ].slice(0,8);
  const go=useCallback((n:number)=>setActive(((n%featured.length)+featured.length)%featured.length),[featured.length]);
  useEffect(()=>{timer.current=setTimeout(()=>go(active+1),5500);return()=>clearTimeout(timer.current);},[active,go]);
  if(!featured.length) return null;
  return (
    <div className="lv-car">
      <div className="lv-sh">
        <div style={{width:3,height:14,borderRadius:2,background:"linear-gradient(#6c3dd6,#0d9488)",flexShrink:0}}/>
        <span className="lv-sh-title">Featured Courses</span>
        <span className="lv-sh-sub">· {featured.length} picks</span>
        <div className="lv-sh-pip"/>
      </div>
      <div className="lv-car-window">
        <div className="lv-car-track" style={{transform:`translateX(-${active*100}%)`}}>
          {featured.map((c,i)=>{
            const ri=courses.indexOf(c), pct=c.progress??0;
            const done=c.completed===true||pct>=100, enr=c.enrolled===true||pct>0;
            const g=SLIDE_GRADS[i%SLIDE_GRADS.length];
            const pat=THUMB_PATTERNS[ri%THUMB_PATTERNS.length];
            const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
            const accent=ACCENTS[i%ACCENTS.length];
            const mc=c.modules?.length??0;
            return (
              <div key={i} className="lv-car-slide" onClick={()=>onOpenCourse(ri)}>
                {/* colourful background only covers the left ~60% visually */}
                <div className="lv-car-bg" style={{background:`linear-gradient(140deg,${g[0]},${g[1]})`}}>
                  <div style={{position:"absolute",inset:0,backgroundImage:pat,backgroundSize:"20px 20px",opacity:0.12}}/>
                  {/* big watermark emoji */}
                  <div style={{position:"absolute",right:"38%",bottom:"-10%",fontSize:160,opacity:0.06,userSelect:"none",lineHeight:1,filter:"blur(1px)",transform:"rotate(-8deg)"}}>{ic}</div>
                  {/* soft glow orb */}
                  <div style={{position:"absolute",right:"40%",top:"-20%",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${accent}22 0%,transparent 65%)`,pointerEvents:"none"}}/>
                </div>
                {/* white-fade scrim to let right panel feel native */}
                <div className="lv-car-scrim"/>
                {/* top accent */}
                <div className="lv-car-accent" style={{background:`linear-gradient(90deg,${accent},transparent 55%)`}}/>
                {/* content split */}
                <div className="lv-car-content">
                  {/* LEFT */}
                  <div className="lv-car-l">
                    <div className="lv-car-eyebrow">
                      <div className="lv-car-eyebrow-dot"/>
                      {c.cat||"General"}
                      {mc>0&&<><div className="lv-car-eyebrow-dot"/>{mc} module{mc!==1?"s":""}</>}
                    </div>
                    <div className="lv-car-title">{c.title}</div>
                    {c.desc&&<div className="lv-car-desc">{c.desc}</div>}
                    <div className="lv-car-pills">
                      {c.time&&(
                        <div className="lv-car-pill">
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                          {c.time}
                        </div>
                      )}
                      {enr&&pct>0&&(
                        <div className="lv-car-prog-pill">
                          <div className="lv-car-prog-bar">
                            <div className="lv-car-prog-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${accent},#34d399)`}}/>
                          </div>
                          <span style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,.8)"}}>{pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* RIGHT white panel */}
                  <div className="lv-car-r">
                    <div className="lv-car-emoji">{ic}</div>
                    {enr&&(
                      <div className="lv-car-status-badge" style={{background:done?"rgba(22,163,74,.12)":"rgba(108,61,214,.1)",color:done?"#15803d":"#6c3dd6"}}>
                        {done?"✓ Completed":`${pct}% done`}
                      </div>
                    )}
                    <button
                      className={`lv-car-cta${done?" done":enr?" enr":" new"}`}
                      onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}
                    >
                      {done?"✓ Review":enr?"▶ Continue":"+ Enroll"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* arrows sit over the colour side, not the white panel */}
        <button className="lv-car-btn l" onClick={e=>{e.stopPropagation();go(active-1);}}>‹</button>
        <button className="lv-car-btn r" onClick={e=>{e.stopPropagation();go(active+1);}}>›</button>
      </div>
      <div className="lv-car-ctrl">
        <div className="lv-car-dots">{featured.map((_,i)=><div key={i} className={`lv-car-dot${active===i?" on":""}`} onClick={()=>go(i)}/>)}</div>
        <span className="lv-car-count">{active+1} / {featured.length}</span>
        <button className="lv-car-all" onClick={onGoToCatalog}>All courses →</button>
      </div>
    </div>
  );
}

// ─── Progress tab ─────────────────────────────────────────────────────────────
const BAR_C: Record<string,string>={Completed:"#16a34a","In Progress":"#6c3dd6","Not Started":"#e5e7eb"};
const PILL_C:Record<string,string>={Completed:"completed","In Progress":"started","Not Started":"notstarted"};
const DOT_C: Record<string,string>={Completed:"dot-g","In Progress":"dot-y","Not Started":"dot-r"};

function ProgressPanel({toast}:{toast:(m:string)=>void}) {
  const [data,setData]=useState<ProgressRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("All");
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{const r=await api.progress.getAll();if(r.success&&r.data)setData(r.data as ProgressRecord[]);}
      catch(e){console.error(e);}finally{setLoading(false);}
    })();
  },[]);
  const safe=data||[];
  const rows=safe.filter(r=>(filter==="All"||r.status===filter)&&(!search||r.course.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="lv-prog">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexShrink:0}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"var(--ink)",letterSpacing:"-.02em"}}>My Progress</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginTop:1}}>{safe.length} record{safe.length!==1?"s":""}</div>
        </div>
        <div style={{flex:1}}/>
        <div className="lv-search">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <button className="btn btn-s btn-sm" onClick={()=>toast("Exporting…")}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg>
          Export
        </button>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:12,flexShrink:0,flexWrap:"wrap"}}>
        {["All","In Progress","Completed","Not Started"].map(f=>(
          <button key={f} className={`lv-chip${filter===f?" on":""}`} onClick={()=>setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="surf" style={{flex:1,display:"flex",flexDirection:"column",padding:0,overflow:"hidden"}}>
        <div className="tbl-wrap">
          {loading?<div style={{textAlign:"center",padding:40,color:"var(--ink3)",fontSize:13}}>Loading…</div>:(
            <table className="dt">
              <thead><tr><th>Course</th><th>Progress</th><th>Started</th><th>Completed</th><th>Status</th></tr></thead>
              <tbody>
                {rows.length===0
                  ?<tr><td colSpan={5} style={{textAlign:"center",padding:24,color:"var(--ink3)",fontSize:12}}>{safe.length===0?"No progress yet — start a course!":"No records found"}</td></tr>
                  :rows.map((r,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:12.5,fontWeight:600,color:"var(--ink)"}}>{r.course}</td>
                      <td><div className="lc-bar-wrap"><div className="lc-prog-bar"><div className="lc-prog-fill" style={{width:`${r.progress}%`,background:BAR_C[r.status]}}/></div><span style={{fontSize:10.5,fontWeight:700,color:"var(--ink2)",minWidth:28,textAlign:"right"}}>{r.progress}%</span></div></td>
                      <td style={{fontSize:11,color:"var(--ink3)"}}>{r.started||"—"}</td>
                      <td style={{fontSize:11,color:"var(--ink3)"}}>{r.completed||"—"}</td>
                      <td><span className={`lc-prog-pill ${PILL_C[r.status]}`}><span className={`dot ${DOT_C[r.status]}`} style={{width:5,height:5}}/>{r.status}</span></td>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({courses,onOpenCourse,onGoToCatalog}:{
  courses:Course[];onOpenCourse:(i:number)=>void;onGoToCatalog:()=>void;
}) {
  const enrolled  =courses.filter(c=>c.enrolled||(c.progress??0)>0);
  const completed =courses.filter(c=>c.completed||(c.progress??0)>=100);
  const inProg    =enrolled.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100);
  const avg       =enrolled.length?Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length):0;
  const totalTime =courses.reduce((s,c)=>s+(c.time_spent??0),0);
  return (
    <div className="lv-scroll">
      <AIBanner courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>

      {/* Stats */}
      <div className="lv-stats">
        {([
          {n:enrolled.length,  l:"Enrolled",  e:"📚",cls:"sv",d:"0s"},
          {n:inProg.length,    l:"In Progress",e:"⚡",cls:"sa",d:".06s"},
          {n:completed.length, l:"Completed", e:"✅",cls:"sg",d:".12s"},
          {n:courses.filter(c=>!(c.enrolled||(c.progress??0)>0)).length,l:"Available",e:"🔓",cls:"sb",d:".18s"},
        ] as const).map((s,i)=>(
          <div key={i} className={`lv-stat ${s.cls}`} style={{animationDelay:s.d}}>
            <div className="lv-stat-inner">
              <div className="lv-stat-ico">{s.e}</div>
              <div>
                <div className="lv-stat-num">{s.n}</div>
                <div className="lv-stat-lbl">{s.l}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="lv-ring-stat">
          <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <MiniRing pct={avg}/>
            <div style={{position:"absolute",fontSize:10,fontWeight:900,color:"#6c3dd6",lineHeight:1}}>{avg}%</div>
          </div>
          <div>
            <div className="lv-ring-val">{fmtTime(totalTime)}</div>
            <div className="lv-ring-lbl">Time · avg</div>
          </div>
        </div>
      </div>

      {/* Continue learning */}
      {inProg.length>0&&(
        <>
          <div className="lv-sh" style={{marginBottom:9}}>
            <div style={{width:3,height:14,borderRadius:2,background:"linear-gradient(#6c3dd6,#0d9488)",flexShrink:0}}/>
            <span className="lv-sh-title">Continue Learning</span>
            <span className="lv-sh-sub">{inProg.length} in progress</span>
            <div className="lv-sh-pip"/>
          </div>
          <div className="lv-continue" style={{marginBottom:20}}>
            {inProg.slice(0,4).map((c,i)=>{
              const ri=courses.indexOf(c),pct=c.progress??0;
              const g=THUMB_GRADIENTS[ri%THUMB_GRADIENTS.length];
              const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
              return (
                <div key={i} className="lv-cont" style={{animationDelay:`${i*.07}s`}} onClick={()=>onOpenCourse(ri)}>
                  <div className="lv-cont-thumb" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                    <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 30%,rgba(255,255,255,.18),transparent 65%)"}}/>
                    <span style={{position:"relative",zIndex:1}}>{ic}</span>
                  </div>
                  <div className="lv-cont-body">
                    <div className="lv-cont-name">{c.title}</div>
                    <div className="lv-cont-pct">{pct}% complete</div>
                    <div className="lv-cont-bar"><div className="lv-cont-fill" style={{width:`${pct}%`,animationDelay:`${.22+i*.07}s`}}/></div>
                  </div>
                  <button className="lv-cont-btn" onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}>
                    <svg width="7" height="7" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
                    Resume
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Carousel courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>
    </div>
  );
}

// ─── Catalog ──────────────────────────────────────────────────────────────────
function Catalog({courses,onOpenCourse}:{courses:Course[];onOpenCourse:(i:number)=>void}) {
  const [search,setSearch]=useState(""),
        [cat,setCat]=useState("All"),
        [status,setStatus]=useState("All");
  const cats=["All",...Array.from(new Set(courses.map(c=>c.cat).filter(Boolean)))];
  const filtered=courses.filter(c=>{
    const pct=c.progress??0,done=c.completed||pct>=100,enr=c.enrolled||pct>0;
    const cOk=cat==="All"||c.cat===cat;
    const sOk=!search||c.title?.toLowerCase().includes(search.toLowerCase())||c.desc?.toLowerCase().includes(search.toLowerCase());
    let stOk=true;
    if(status==="In Progress")stOk=enr&&!done;
    if(status==="Completed")  stOk=done;
    if(status==="New")        stOk=!enr;
    return cOk&&sOk&&stOk;
  });
  return (
    <>
      <div style={{flexShrink:0}}>
        <div className="lv-sh" style={{marginBottom:8}}>
          <div style={{width:3,height:14,borderRadius:2,background:"linear-gradient(#6366f1,#0d9488)",flexShrink:0}}/>
          <span className="lv-sh-title">Course Catalog</span>
          <span className="lv-sh-sub">· {filtered.length} shown</span>
          <div className="lv-sh-pip"/>
          <div className="lv-search">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
            <input placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div className="lv-filters">
          {[{k:"All",l:"All"},{k:"New",l:"🆕 New"},{k:"In Progress",l:"📖 In Progress"},{k:"Completed",l:"✅ Done"}].map(f=>(
            <button key={f.k} className={`lv-chip${status===f.k?(f.k==="In Progress"?" on-t":" on"):""}`} onClick={()=>setStatus(f.k)}>{f.l}</button>
          ))}
          <div className="lv-chip-sep"/>
          {cats.map(c=><button key={c} className={`lv-chip${cat===c?" on":""}`} onClick={()=>setCat(c)}>{c}</button>)}
        </div>
      </div>
      <div className="lv-grid-scroll">
        {filtered.length===0
          ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px",gap:8}}>
              <div style={{fontSize:30}}>🔍</div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--ink)"}}>No courses match</div>
              <div style={{fontSize:11.5,color:"var(--ink3)",maxWidth:200,lineHeight:1.5,textAlign:"center"}}>Try a different filter.</div>
            </div>
          :<div className="lv-grid">
              {filtered.map((c,i)=>{
                const ri=courses.indexOf(c),pct=typeof c.progress==="number"?c.progress:0;
                const done=c.completed===true||pct>=100,enr=c.enrolled===true||pct>0;
                const mc=c.modules?.length??0,chc=c.modules?.reduce((s:number,m:any)=>s+m.chapters.length,0)??0;
                const g=THUMB_GRADIENTS[ri%THUMB_GRADIENTS.length];
                const pat=THUMB_PATTERNS[ri%THUMB_PATTERNS.length];
                const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
                const tl=(c.time_spent??0)>0?fmtTime(c.time_spent??0):null;
                return (
                  <div key={i} className="lv-card" style={{animationDelay:`${Math.min(i*.04,.4)}s`}} onClick={()=>onOpenCourse(ri)}>
                    <div className="lv-card-thumb" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                      <div style={{position:"absolute",inset:0,backgroundImage:pat,backgroundSize:"20px 20px",opacity:0.28}}/>
                      {enr
                        ?<div className="lv-card-badge" style={{background:done?"rgba(22,163,74,.88)":"rgba(108,61,214,.88)",color:"#fff"}}>{done?"✓ Done":`${pct}%`}</div>
                        :<div className="lv-card-badge" style={{background:"rgba(0,0,0,.26)",color:"rgba(255,255,255,.9)"}}>{c.cat}</div>
                      }
                      <div className="lv-card-emoji">{ic}</div>
                      {pct>0&&<div className="lv-card-pbar"><div className="lv-card-pfill" style={{width:`${pct}%`,background:done?"rgba(34,197,94,.9)":"rgba(255,255,255,.85)"}}/></div>}
                      <div className="lv-card-hover">
                        <div className="lv-card-play"><svg width="10" height="10" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg></div>
                        <span style={{color:"#fff",fontSize:9.5,fontWeight:700,textShadow:"0 1px 3px rgba(0,0,0,.4)"}}>{done?"Review":enr?`Continue · ${pct}%`:"Enroll Now"}</span>
                        {tl&&<span style={{color:"rgba(255,255,255,.6)",fontSize:9}}>⏱ {tl}</span>}
                      </div>
                    </div>
                    <div className="lv-card-body">
                      <div className="lv-card-title">{c.title}</div>
                      <div className="lv-card-desc">{c.desc}</div>
                      {enr&&!done&&pct>0&&(
                        <div className="lv-card-prog">
                          <div className="lv-card-prog-bar"><div className="lv-card-prog-fill" style={{width:`${pct}%`}}/></div>
                          <div className="lv-card-prog-lbl">{pct}% complete</div>
                        </div>
                      )}
                      <div className="lv-card-meta">
                        <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                        {c.time}
                        {mc>0&&<><span style={{width:2,height:2,borderRadius:"50%",background:"#d4d0e8",display:"inline-block"}}/><svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="#0d9488" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg><span style={{color:"#0d9488",fontWeight:600}}>{mc}m · {chc}ch</span></>}
                      </div>
                      <button className={`lv-cta${done?" done":enr?" enr":" new"}`} onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}>
                        {done?<><svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7l4 4 6-6"/></svg>Review</>
                          :enr?<><svg width="8" height="8" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>Continue</>
                          :<><svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 2v10M2 7h10"/></svg>Enroll</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function ClientView({courses,setCourses,categories,toast,onOpenCourse,publishedActivities}:ClientViewProps) {
  const [tab,setTab]=useState(0);
  const TABS=[
    {l:"Dashboard", i:<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="1.5" y="1.5" width="4" height="4" rx="1"/><rect x="8.5" y="1.5" width="4" height="4" rx="1"/><rect x="1.5" y="8.5" width="4" height="4" rx="1"/><rect x="8.5" y="8.5" width="4" height="4" rx="1"/></svg>},
    {l:"Catalog",   i:<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 3.5h10M2 7h10M2 10.5h6"/></svg>},
    {l:"Progress",  i:<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/></svg>},
  ];
  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{S}</style>
      <div className="lv lv-shell">

        {/* ── top bar ── */}
        <div className="lv-bar">
          <span className="lv-wordmark">My <span>Learning</span></span>
          <div className="lv-rule"/>
          <div className="lv-tabs">
            {TABS.map((t,i)=>(
              <button key={i} className={`lv-tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>
                {t.i}{t.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── panels ── */}
        <div className="lv-outer">
          {/*
            track = 300% wide (3 panels).
            We shift by (tab * 33.3333%) to reveal the correct panel.
            Each panel is 33.3333% of track = 100% of outer.
            height:100% on track + panels means they NEVER escape lv-outer.
          */}
          <div className="lv-track" style={{transform:`translateX(-${tab*33.3333}%)`}}>

            <div className="lv-panel">
              <Dashboard courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={()=>setTab(1)}/>
            </div>

            <div className="lv-panel">
              <Catalog courses={courses} onOpenCourse={onOpenCourse}/>
            </div>

            <div className="lv-panel">
              <ProgressPanel toast={toast}/>
            </div>

          </div>
        </div>
      </div>{/* lv-shell */}
    </>
  );
}
