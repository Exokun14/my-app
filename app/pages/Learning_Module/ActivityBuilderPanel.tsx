'use client'

import { useState, useEffect, useRef } from "react";
import { uploadFile } from "../../Services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SegmentType = "accordion" | "flashcard" | "fillblank" | "checklist" | "matching" | "hotspot";
export interface AccordionItem  { q: string; a: string; }
export interface FlashCard      { front: string; back: string; }
export interface FillBlankQ     { sentence: string; blanks: string[]; }
export interface ChecklistItem  { text: string; }
export interface MatchPair      { left: string; right: string; }
export interface Activity {
  id: string; type: SegmentType; title: string;
  items?: AccordionItem[]; cards?: FlashCard[]; questions?: FillBlankQ[];
  checklist?: ChecklistItem[]; pairs?: MatchPair[];
  status?: "draft" | "published" | "template";
  media?: { url: string; type: "image" | "video" | "file"; name: string; };
}

export type LessonBlockKind = "content" | "activity";
export interface LessonBlock {
  id: string;
  kind: LessonBlockKind;
  body?: string;
  activity?: Activity;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────
export const ACT_META: Record<SegmentType, {
  icon: string; label: string; color: string; bg: string; border: string; desc: string;
  darkColor: string; gradient: string;
}> = {
  accordion: { icon:"🗂️", label:"Accordion",     color:"#0369a1", bg:"#f0f9ff", border:"rgba(3,105,161,0.18)",   desc:"Expandable Q&A sections",    darkColor:"#38bdf8", gradient:"linear-gradient(135deg,#0c4a6e,#0369a1)" },
  flashcard: { icon:"🃏", label:"Flashcards",    color:"#6d28d9", bg:"#faf5ff", border:"rgba(109,40,217,0.18)",  desc:"Flip-card memory drill",     darkColor:"#a78bfa", gradient:"linear-gradient(135deg,#2e1065,#6d28d9)" },
  fillblank: { icon:"✏️", label:"Fill in Blank", color:"#0f766e", bg:"#f0fdf9", border:"rgba(15,118,110,0.18)",  desc:"Sentence completion",        darkColor:"#2dd4bf", gradient:"linear-gradient(135deg,#042f2e,#0f766e)" },
  checklist: { icon:"☑️", label:"Checklist",     color:"#15803d", bg:"#f0fdf4", border:"rgba(21,128,61,0.18)",   desc:"Step-by-step task list",     darkColor:"#4ade80", gradient:"linear-gradient(135deg,#052e16,#15803d)" },
  matching:  { icon:"🔗", label:"Matching",      color:"#7c3aed", bg:"#faf5ff", border:"rgba(124,58,237,0.18)",  desc:"Match two columns",          darkColor:"#c084fc", gradient:"linear-gradient(135deg,#1e1245,#7c3aed)" },
  hotspot:   { icon:"🎯", label:"Hotspot",       color:"#b45309", bg:"#fffbeb", border:"rgba(180,83,9,0.18)",    desc:"Interactive task list",      darkColor:"#fbbf24", gradient:"linear-gradient(135deg,#451a03,#b45309)" },
};
export const ALL_TYPES = Object.keys(ACT_META) as SegmentType[];

// ─── Utils ────────────────────────────────────────────────────────────────────
export function mkId(): string { return Math.random().toString(36).slice(2, 9); }
function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

export function blankActivity(type: SegmentType): Activity {
  const b = { id: mkId(), type, title: "", status: "draft" as const };
  switch (type) {
    case "accordion": return { ...b, items:     [{ q:"", a:"" }] };
    case "flashcard": return { ...b, cards:     [{ front:"", back:"" }] };
    case "fillblank": return { ...b, questions: [{ sentence:"Type a sentence with __BLANK__ here.", blanks:[""] }] };
    case "checklist":
    case "hotspot":   return { ...b, checklist: [{ text:"" }] };
    case "matching":  return { ...b, pairs:     [{ left:"", right:"" }] };
  }
}

export function blankContentBlock(): LessonBlock {
  return { id: mkId(), kind: "content", body: "" };
}

export function getActivityItemCount(act: Activity): number {
  if (act.items)     return act.items.length;
  if (act.cards)     return act.cards.length;
  if (act.questions) return act.questions.length;
  if (act.checklist) return act.checklist.length;
  if (act.pairs)     return act.pairs.length;
  return 0;
}

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES: Array<{id:string;name:string;type:SegmentType;tags:string[];desc:string;activity:Activity}> = [
  { id:"t1", name:"POS Key Terms",      type:"accordion", tags:["Glossary"], desc:"Expandable glossary of key terms",
    activity:{ id:mkId(),type:"accordion",title:"POS Key Terms",status:"published",items:[{q:"What is a POS System?",a:"Hardware + software for transactions."},{q:"What is a PED?",a:"PIN Entry Device — the card reader."},{q:"What is an EOD Report?",a:"End-of-Day report for cash reconciliation."}] } },
  { id:"t2", name:"Hardware Flashcards",type:"flashcard", tags:["Memory"],   desc:"Flip-cards for hardware recall",
    activity:{ id:mkId(),type:"flashcard",title:"POS Hardware",status:"published",cards:[{front:"Touchscreen Terminal",back:"Primary cashier interface."},{front:"Thermal Printer",back:"Uses heat, not ink."},{front:"Cash Drawer",back:"Opens automatically on cash transactions."}] } },
  { id:"t3", name:"Opening Checklist",  type:"checklist", tags:["SOP"],      desc:"Morning opening procedure steps",
    activity:{ id:mkId(),type:"checklist",title:"Opening Shift",status:"published",checklist:[{text:"Verify cash float"},{text:"Power on POS"},{text:"Test barcode scanner"},{text:"Log in with credentials"}] } },
  { id:"t4", name:"Hardware Matching",  type:"matching",  tags:["Quiz"],     desc:"Match hardware to functions",
    activity:{ id:mkId(),type:"matching",title:"Match the Hardware",status:"published",pairs:[{left:"Touchscreen",right:"Main cashier input"},{left:"Barcode Scanner",right:"Reads product codes"},{left:"Cash Drawer",right:"Stores physical currency"}] } },
  { id:"t5", name:"Fill-in-Blank",      type:"fillblank", tags:["Recall"],   desc:"Test recall of transaction steps",
    activity:{ id:mkId(),type:"fillblank",title:"Transaction Procedures",status:"published",questions:[{sentence:"For cash payments enter the __BLANK__ amount first.",blanks:["tendered"]},{sentence:"Always obtain __BLANK__ before voiding.",blanks:["supervisor approval"]}] } },
  { id:"t6", name:"EOD Procedure",      type:"hotspot",   tags:["Closing"],  desc:"End-of-day walkthrough",
    activity:{ id:mkId(),type:"hotspot",title:"End-of-Day Procedure",status:"published",checklist:[{text:"Run EOD report"},{text:"Count cash"},{text:"Secure cash in safe"},{text:"Log out all sessions"},{text:"Power down terminals"}] } },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
/* ── Animations ── */
@keyframes abp-in      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes abp-slide-r { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
@keyframes abp-slide-l { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:none} }
@keyframes abp-tile-in { from{opacity:0;transform:translateY(14px) scale(0.97)} to{opacity:1;transform:none} }
@keyframes abp-item-in { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:none} }
@keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes pulse-ring  { 0%{box-shadow:0 0 0 0 rgba(124,58,237,0.35)} 70%{box-shadow:0 0 0 8px rgba(124,58,237,0)} 100%{box-shadow:0 0 0 0 rgba(124,58,237,0)} }

/* ── Shell ── */
.abp-fs { position:fixed; inset:0; z-index:1001; display:flex; flex-direction:column; background:#f4f3fb; animation:abp-in .22s cubic-bezier(.16,1,.3,1) both; font-family:'DM Sans',sans-serif; }

/* ── Header stays dark as the one strong contrast anchor ── */
.abp-hdr { height:58px; flex-shrink:0; display:flex; align-items:center; gap:14px; padding:0 24px; background:#fff; border-bottom:1.5px solid rgba(109,40,217,0.1); box-shadow:0 1px 8px rgba(109,40,217,0.06); position:relative; }
.abp-hdr-ico { width:36px; height:36px; border-radius:10px; flex-shrink:0; background:linear-gradient(145deg,#7c3aed,#0d9488); box-shadow:0 4px 12px rgba(109,40,217,0.3); display:flex; align-items:center; justify-content:center; font-size:16px; }
.abp-hdr-text  { flex:1; }
.abp-hdr-title { font-size:14px; font-weight:900; color:#18103a; line-height:1.2; letter-spacing:-.02em; }
.abp-hdr-sub   { font-size:10.5px; color:#8e7ec0; margin-top:2px; font-weight:500; }

/* Step indicator */
.abp-steps { display:flex; align-items:center; gap:8px; }
.abp-step  { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#c4b9e8; transition:color .25s; }
.abp-step.done   { color:#8e7ec0; }
.abp-step.active { color:#4a3870; }
.abp-step-num { width:22px; height:22px; border-radius:50%; border:1.5px solid rgba(109,40,217,0.2); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; transition:all .25s; color:#8e7ec0; }
.abp-step.active .abp-step-num { background:linear-gradient(135deg,#7c3aed,#0d9488); border-color:transparent; color:#fff; box-shadow:0 2px 8px rgba(124,58,237,0.4); }
.abp-step.done   .abp-step-num { background:#f5f3ff; border-color:rgba(109,40,217,0.15); color:#7c3aed; }
.abp-step-connector { width:20px; height:1px; background:rgba(109,40,217,0.12); }

/* Body */
.abp-body { flex:1; display:flex; overflow:hidden; background:#f4f3fb; }

/* ═══ STEP 1 — TYPE SELECTION ═══ */
.abp-studio { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#f4f3fb; }
.abp-studio-atmo    { padding:28px 32px 0; flex-shrink:0; }
.abp-studio-eyebrow { font-size:10px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#8e7ec0; margin-bottom:10px; }
.abp-studio-headline{ font-size:22px; font-weight:900; color:#18103a; letter-spacing:-.03em; line-height:1.15; margin-bottom:6px; }
.abp-studio-sub     { font-size:12.5px; color:#8e7ec0; font-weight:400; line-height:1.5; }

.abp-tile-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:24px 32px; flex:1; overflow-y:auto; }
@media (max-width:760px) { .abp-tile-grid { grid-template-columns:repeat(2,1fr); } }

.abp-tile { border-radius:16px; cursor:pointer; overflow:hidden; background:#fff; border:1.5px solid rgba(109,40,217,0.09); box-shadow:0 2px 8px rgba(109,40,217,0.05); transition:all .22s cubic-bezier(.16,1,.3,1); position:relative; padding:20px 18px 16px; display:flex; flex-direction:column; gap:10px; animation:abp-tile-in .3s ease both; }
.abp-tile::before { content:''; position:absolute; inset:0; background:var(--tile-grad,transparent); opacity:0; transition:opacity .25s; border-radius:inherit; }
.abp-tile:hover { border-color:rgba(109,40,217,0.2); transform:translateY(-2px); box-shadow:0 8px 24px rgba(109,40,217,0.12); }
.abp-tile:hover::before { opacity:0.05; }
.abp-tile.selected { border-color:rgba(109,40,217,0.35); transform:translateY(-3px); box-shadow:0 10px 28px rgba(109,40,217,0.16); }
.abp-tile.selected::before { opacity:0.07; }
.abp-tile.dimmed { opacity:0.4; transform:scale(0.97); }

.abp-tile-icon { width:48px; height:48px; border-radius:13px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:24px; border:1.5px solid rgba(109,40,217,0.1); background:#f5f3ff; transition:transform .2s; }
.abp-tile:hover .abp-tile-icon,.abp-tile.selected .abp-tile-icon { transform:scale(1.07); }
.abp-tile.selected .abp-tile-icon { border-color:transparent; }
.abp-tile-label { font-size:14px; font-weight:800; color:#18103a; letter-spacing:-.01em; }
.abp-tile-desc  { font-size:11px; color:#8e7ec0; line-height:1.45; font-weight:400; }
.abp-tile-selected-badge { position:absolute; top:10px; right:10px; width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#7c3aed,#0d9488); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(124,58,237,0.4); animation:pulse-ring .6s ease; }

/* Templates drawer */
.abp-tpl-drawer { flex-shrink:0; padding:0 32px 24px; }
.abp-tpl-toggle { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; color:#8e7ec0; letter-spacing:.05em; text-transform:uppercase; cursor:pointer; padding:10px 0; border:none; background:transparent; font-family:'DM Sans',sans-serif; transition:color .15s; width:100%; }
.abp-tpl-toggle:hover { color:#4a3870; }
.abp-tpl-toggle svg { transition:transform .25s; }
.abp-tpl-toggle.open svg { transform:rotate(180deg); }
.abp-tpl-toggle-line { flex:1; height:1px; background:rgba(109,40,217,0.1); }

.abp-tpl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:9px; margin-top:10px; }
.abp-tpl-card { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:11px; cursor:pointer; border:1.5px solid rgba(109,40,217,0.09); background:#fff; box-shadow:0 1px 4px rgba(109,40,217,0.04); transition:all .18s; }
.abp-tpl-card:hover { border-color:rgba(109,40,217,0.22); background:#faf9ff; transform:translateX(2px); box-shadow:0 4px 12px rgba(109,40,217,0.1); }
.abp-tpl-card-icon { width:34px; height:34px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:17px; background:#f5f3ff; border:1.5px solid rgba(109,40,217,0.1); }
.abp-tpl-card-name { font-size:12px; font-weight:700; color:#18103a; margin-bottom:2px; }
.abp-tpl-card-desc { font-size:10px; color:#8e7ec0; line-height:1.3; }
.abp-tpl-card-tags { display:flex; gap:5px; margin-top:5px; }
.abp-tpl-card-tag  { padding:2px 7px; border-radius:20px; font-size:8.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; background:rgba(124,58,237,0.1); color:#7c3aed; }

/* ═══ STEP 2 — SPLIT BUILD CANVAS ═══ */
.abp-canvas-wrap { flex:1; display:flex; overflow:hidden; animation:abp-slide-r .3s cubic-bezier(.16,1,.3,1) both; }

/* Inspector */
.abp-inspector { width:260px; flex-shrink:0; display:flex; flex-direction:column; background:#fff; border-right:1.5px solid rgba(109,40,217,0.08); overflow-y:auto; padding:24px 20px; gap:20px; box-shadow:2px 0 12px rgba(109,40,217,0.04); }
.abp-type-badge { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; border:1.5px solid rgba(109,40,217,0.12); background:#f5f3ff; cursor:pointer; transition:all .15s; flex-shrink:0; }
.abp-type-badge:hover { background:#ede9fe; border-color:rgba(109,40,217,0.25); }
.abp-type-badge-icon   { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:18px; background:#fff; border:1.5px solid rgba(109,40,217,0.1); }
.abp-type-badge-label  { font-size:12.5px; font-weight:800; color:#18103a; letter-spacing:-.01em; }
.abp-type-badge-change { font-size:10px; color:#8e7ec0; margin-top:2px; }
.abp-insp-section { display:flex; flex-direction:column; gap:8px; }
.abp-insp-label   { font-size:9.5px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:#8e7ec0; }

/* Light inputs */
.abp-dark-input { width:100%; padding:10px 12px; border-radius:9px; border:1.5px solid rgba(109,40,217,0.14); background:#faf9ff; color:#18103a; font-size:12.5px; font-family:'DM Sans',sans-serif; transition:all .15s; box-sizing:border-box; }
.abp-dark-input::placeholder { color:#c4b9e8; }
.abp-dark-input:focus { outline:none; border-color:rgba(124,58,237,0.5); background:#fff; box-shadow:0 0 0 3px rgba(124,58,237,0.1); }

/* Media zone */
.abp-dark-media { border:1.5px dashed rgba(109,40,217,0.18); border-radius:10px; padding:14px; background:#faf9ff; display:flex; align-items:center; gap:10px; cursor:pointer; transition:all .15s; }
.abp-dark-media:hover { border-color:rgba(109,40,217,0.35); background:#f5f3ff; }
.abp-dark-media.has   { border-style:solid; border-color:rgba(109,40,217,0.3); background:#f5f3ff; }

/* Right canvas */
.abp-canvas { flex:1; display:flex; flex-direction:column; overflow:hidden; background:#f4f3fb; position:relative; }
.abp-canvas-bg { position:absolute; inset:0; pointer-events:none; opacity:0.035; transition:opacity .4s; background:var(--canvas-grad,transparent); }
.abp-canvas-inner { flex:1; overflow-y:auto; padding:24px 28px; position:relative; z-index:1; display:flex; flex-direction:column; gap:10px; }
.abp-canvas-inner::-webkit-scrollbar { width:4px; }
.abp-canvas-inner::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.15); border-radius:4px; }
.abp-canvas-hdr { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-shrink:0; }
.abp-canvas-hdr-label { font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; color:#8e7ec0; }
.abp-canvas-hdr-count { margin-left:auto; font-size:11px; font-weight:700; color:#c4b9e8; }

/* Item rows */
.abp-item-row { display:flex; align-items:flex-start; gap:10px; padding:14px; border-radius:12px; background:#fff; border:1.5px solid rgba(109,40,217,0.09); box-shadow:0 1px 4px rgba(109,40,217,0.04); transition:border-color .15s,box-shadow .15s; animation:abp-item-in .22s ease both; }
.abp-item-row:hover { border-color:rgba(109,40,217,0.2); box-shadow:0 4px 14px rgba(109,40,217,0.09); }
.abp-item-num { width:26px; height:26px; border-radius:7px; flex-shrink:0; background:linear-gradient(135deg,#7c3aed,#0d9488); color:#fff; font-size:10.5px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.abp-item-del { width:26px; height:26px; border-radius:7px; flex-shrink:0; border:1.5px solid rgba(220,38,38,0.18); background:rgba(220,38,38,0.05); color:#dc2626; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.abp-item-del:hover { background:rgba(220,38,38,0.1); border-color:rgba(220,38,38,0.35); }
.abp-pair-connector { display:flex; align-items:center; color:#c4b9e8; font-size:13px; flex-shrink:0; }
.abp-add-btn { width:100%; padding:12px 14px; border-radius:11px; border:1.5px dashed rgba(109,40,217,0.18); background:#fff; color:#8e7ec0; font-size:12px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:7px; transition:all .15s; }
.abp-add-btn:hover { border-color:rgba(109,40,217,0.4); background:#f5f3ff; color:#7c3aed; }

/* ── Library ── */
.abp-lib-wrap  { flex:1; display:flex; flex-direction:column; overflow:hidden; animation:abp-slide-l .3s ease both; }
.abp-lib-inner { flex:1; overflow-y:auto; padding:24px 28px; }
.abp-lib-inner::-webkit-scrollbar { width:4px; }
.abp-lib-inner::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.15); border-radius:4px; }
.abp-lib-hdr   { margin-bottom:20px; }
.abp-lib-title { font-size:18px; font-weight:900; color:#18103a; letter-spacing:-.02em; }
.abp-lib-sub   { font-size:11.5px; color:#8e7ec0; margin-top:4px; }
.abp-lib-tabs  { display:flex; border-bottom:1.5px solid rgba(109,40,217,0.1); margin-bottom:18px; }
.abp-lib-tab   { padding:9px 18px 8px; border:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; color:#8e7ec0; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1.5px; transition:all .15s; display:flex; align-items:center; gap:6px; }
.abp-lib-tab:hover { color:#4a3870; }
.abp-lib-tab.pub.active { color:#0d9488; border-bottom-color:#0d9488; }
.abp-lib-tab.dft.active { color:#d97706; border-bottom-color:#d97706; }
.abp-lib-tab-count { padding:1px 7px; border-radius:20px; font-size:9.5px; font-weight:700; background:rgba(109,40,217,0.08); color:#8e7ec0; }
.abp-lib-tab.pub.active .abp-lib-tab-count { background:rgba(13,148,136,0.1); color:#0d9488; }
.abp-lib-tab.dft.active .abp-lib-tab-count { background:rgba(217,119,6,0.1);  color:#d97706; }
.abp-lib-filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
.abp-lib-chip { padding:4px 12px; border-radius:20px; border:1.5px solid rgba(109,40,217,0.1); background:#fff; color:#8e7ec0; font-size:10.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; }
.abp-lib-chip:hover { border-color:rgba(109,40,217,0.25); color:#4a3870; }
.abp-lib-chip.on { background:linear-gradient(135deg,#7c3aed,#5b21b6); border-color:transparent; color:#fff; box-shadow:0 2px 8px rgba(109,40,217,0.3); }
.abp-lib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
.abp-lib-card { border-radius:12px; cursor:pointer; overflow:hidden; border:1.5px solid rgba(109,40,217,0.09); background:#fff; box-shadow:0 1px 4px rgba(109,40,217,0.04); transition:all .18s; display:flex; flex-direction:column; }
.abp-lib-card:hover { border-color:rgba(109,40,217,0.2); transform:translateY(-2px); box-shadow:0 8px 22px rgba(109,40,217,0.1); }
.abp-lib-card-top  { padding:12px 14px 10px; display:flex; align-items:flex-start; gap:10px; }
.abp-lib-card-ico  { width:36px; height:36px; border-radius:9px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:17px; background:#f5f3ff; border:1.5px solid rgba(109,40,217,0.1); }
.abp-lib-card-title{ font-size:12px; font-weight:700; color:#18103a; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.abp-lib-card-meta { font-size:10px; color:#8e7ec0; letter-spacing:.04em; text-transform:uppercase; font-weight:600; }
.abp-lib-card-foot { margin-top:auto; padding:8px 14px; border-top:1px solid rgba(109,40,217,0.07); display:flex; align-items:center; justify-content:space-between; background:#faf9ff; }
.abp-lib-status    { padding:2px 8px; border-radius:20px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
.abp-lib-status.pub{ background:rgba(13,148,136,0.1); color:#0d9488; }
.abp-lib-status.dft{ background:rgba(217,119,6,0.1);  color:#d97706; }
.abp-lib-arrow { width:20px; height:20px; border-radius:5px; background:rgba(109,40,217,0.07); display:flex; align-items:center; justify-content:center; color:#8e7ec0; transition:all .15s; }
.abp-lib-card:hover .abp-lib-arrow { background:rgba(124,58,237,0.15); color:#7c3aed; }
.abp-lib-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 24px; text-align:center; gap:10px; }
.abp-lib-empty-ico   { width:60px; height:60px; border-radius:16px; background:#f5f3ff; border:1.5px solid rgba(109,40,217,0.1); display:flex; align-items:center; justify-content:center; font-size:26px; margin-bottom:6px; }
.abp-lib-empty-title { font-size:14px; font-weight:800; color:#18103a; }
.abp-lib-empty-sub   { font-size:12px; color:#8e7ec0; max-width:240px; line-height:1.5; }

/* ── View toggle ── */
.abp-toggle-bar { display:flex; align-items:center; gap:3px; padding:8px 24px; background:#fff; border-bottom:1.5px solid rgba(109,40,217,0.08); }
.abp-toggle-btn { flex:1; padding:7px 12px; border-radius:8px; border:none; font-size:11.5px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:6px; color:#8e7ec0; background:transparent; }
.abp-toggle-btn:hover:not(.active) { color:#4a3870; background:rgba(109,40,217,0.05); }
.abp-toggle-btn.active { background:#f5f3ff; color:#4a3870; box-shadow:inset 0 0 0 1.5px rgba(109,40,217,0.15); }
.abp-toggle-count { padding:1px 7px; border-radius:20px; font-size:10px; font-weight:700; background:rgba(109,40,217,0.08); color:#8e7ec0; }
.abp-toggle-btn.active .abp-toggle-count { background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(13,148,136,0.15)); color:#7c3aed; }

/* ── Footer ── */
.abp-foot { height:66px; flex-shrink:0; display:flex; align-items:center; gap:10px; padding:0 24px; background:#fff; border-top:1.5px solid rgba(109,40,217,0.08); box-shadow:0 -2px 12px rgba(109,40,217,0.05); }
.abp-foot-note       { font-size:11px; color:#8e7ec0; flex:1; font-weight:500; }
.abp-foot-note.ready { color:#0d9488; font-weight:700; }

/* ── Buttons ── */
.btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; }
.btn-ghost   { background:transparent; color:#8e7ec0; border:1.5px solid rgba(109,40,217,0.18); }
.btn-ghost:hover { background:#f5f3ff; color:#4a3870; border-color:rgba(109,40,217,0.3); }
.btn-outline { background:transparent; color:#4a3870; border:1.5px solid rgba(109,40,217,0.2); }
.btn-outline:hover { background:#f5f3ff; color:#7c3aed; border-color:rgba(109,40,217,0.35); }
.btn-primary { background:linear-gradient(135deg,#7c3aed,#0d9488); color:#fff; border:none; box-shadow:0 2px 12px rgba(124,58,237,0.35); }
.btn-primary:hover { box-shadow:0 4px 18px rgba(124,58,237,0.5); transform:translateY(-1px); }
.btn-primary:disabled { opacity:0.45; cursor:not-allowed; transform:none; box-shadow:none; }
.btn-outline:disabled { opacity:0.45; cursor:not-allowed; }
.btn-sm { padding:7px 13px; font-size:11px; }

.f-lbl { display:block; font-size:10px; font-weight:800; color:#8e7ec0; margin-bottom:5px; letter-spacing:.1em; text-transform:uppercase; }
/* Template tab */
.abp-lib-tab.tpl.active { color:#7c3aed; border-bottom-color:#7c3aed; }
.abp-lib-tab.tpl.active .abp-lib-tab-count { background:rgba(124,58,237,0.1); color:#7c3aed; }

`;

// ─── Main Component ───────────────────────────────────────────────────────────
interface ActivityBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (activity: Activity, saveAs: "draft" | "published" | "template", isUpdate: boolean) => void;
  editActivity: Activity | null;
  toast: (msg: string) => void;
  allActivities?: Activity[];
}

export default function ActivityBuilderPanel({
  open, onClose, onSave, editActivity, toast, allActivities = [],
}: ActivityBuilderPanelProps) {
  const isEdit = !!editActivity;

  const [viewMode,     setViewMode]     = useState<"create" | "library">("create");
  const [step,         setStep]         = useState<1 | 2>(1);
  const [activity,     setActivity]     = useState<Activity>(blankActivity("accordion"));
  const [selectedType, setSelectedType] = useState<SegmentType | null>(null);
  const [closing,      setClosing]      = useState(false);
  const [isUpdate,     setIsUpdate]     = useState(false);
  const [tplOpen,      setTplOpen]      = useState(false);
  const [isTemplateEdit, setIsTemplateEdit] = useState(false);
  const [libFilter,    setLibFilter]    = useState("All");
  const [libTab,       setLibTab]       = useState<"published" | "draft" | "template">("published");

  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (isEdit && editActivity) {
      setActivity(dc(editActivity));
      setSelectedType(editActivity.type);
      setStep(2);
      setViewMode("create");
      setIsUpdate(true);
      setIsTemplateEdit(editActivity.status === "template");
    } else {
      setActivity(blankActivity("accordion"));
      setSelectedType(null);
      setStep(1);
      setViewMode("create");
      setIsUpdate(false);
      setIsTemplateEdit(false);
    }
    setClosing(false);
    setTplOpen(false);
  }, [open, isEdit, editActivity]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploading(true);
    try {
      const data = await uploadFile(file);
      const fullUrl = `http://localhost${data.url}`;
      const mediaType: "image" | "video" | "file" =
        file.type.startsWith("image/") ? "image" :
        file.type.startsWith("video/") ? "video" : "file";
      setActivity(prev => ({ ...prev, media: { url: fullUrl, type: mediaType, name: file.name } }));
      toast("Media uploaded!");
    } catch { toast("Upload failed."); }
    finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  // Auto-advance on type select
  const handleTypeSelect = (type: SegmentType) => {
    setSelectedType(type);
    setActivity(blankActivity(type));
    setIsUpdate(false);
    // Small delay for the animation to feel intentional
    setTimeout(() => setStep(2), 260);
  };

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setSelectedType(template.type);
    setActivity({ ...dc(template.activity), id: mkId(), status: "draft" });
    setIsUpdate(false);
    setTimeout(() => setStep(2), 260);
  };

  const handleLibrarySelect = (act: Activity) => {
    setActivity(dc(act));
    setSelectedType(act.type);
    setStep(2);
    setViewMode("create");
    setIsUpdate(true);
  };

  const handleClose = () => { setClosing(true); setTimeout(onClose, 150); };

  const handleSubmit = (saveAs: "draft" | "published" | "template") => {
    if (!activity.title.trim()) { toast("Please enter an activity title."); return; }
    if (getActivityItemCount(activity) === 0) { toast("Add at least one item."); return; }
    onSave({ ...activity, status: saveAs }, saveAs, isUpdate || isEdit);
    handleClose();
  };

  const itemCount    = getActivityItemCount(activity);
  const canPublish   = activity.title.trim().length > 0 && itemCount > 0;
  const meta         = selectedType ? ACT_META[selectedType] : null;

  const footNote = step === 1
    ? (selectedType ? `Select ${ACT_META[selectedType].label} — advancing…` : "Choose an activity type to begin")
    : !activity.title.trim() ? "Enter a title to continue"
    : itemCount === 0 ? "Add at least one item"
    : `${itemCount} item${itemCount === 1 ? "" : "s"} — ready to save`;

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className={`abp-fs${closing ? " closing" : ""}`}>

        {/* ── Header ── */}
        <div className="abp-hdr">
          <div className="abp-hdr-ico">🧩</div>
          <div className="abp-hdr-text">
            <div className="abp-hdr-title">{isTemplateEdit ? "Edit Template" : isEdit ? "Edit Activity" : "Activity Studio"}</div>
            <div className="abp-hdr-sub">
              {isTemplateEdit ? "Editing template — changes update the blueprint" : step === 1 ? "Choose your activity type" : meta ? `Building · ${meta.label}` : ""}
            </div>
          </div>

          {/* Step indicator */}
          <div className="abp-steps">
            <div className={`abp-step ${step === 1 ? "active" : "done"}`}>
              <div className="abp-step-num">
                {step > 1 ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4l3 3 5-6"/></svg> : "1"}
              </div>
              Type
            </div>
            <div className="abp-step-connector" />
            <div className={`abp-step ${step === 2 ? "active" : ""}`}>
              <div className="abp-step-num">2</div>
              Build
            </div>
          </div>

          <div style={{ width:16 }} />
          <button className="btn btn-ghost btn-sm" onClick={handleClose} style={{ position:"relative", zIndex:1 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            Close
          </button>
        </div>

        {/* ── View toggle (only when not in edit mode) ── */}
        {!isEdit && (
          <div className="abp-toggle-bar">
            {(["create", "library"] as const).map(mode => (
              <button key={mode}
                className={`abp-toggle-btn${viewMode === mode ? " active" : ""}`}
                onClick={() => setViewMode(mode)}>
                {mode === "create"
                  ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 1v10M1 6h10"/></svg>Create New</>
                  : <><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>Library</>
                }
                {mode === "library" && allActivities.length > 0 && (
                  <span className="abp-toggle-count">{allActivities.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="abp-body">

          {/* ══ LIBRARY VIEW ══ */}
          {viewMode === "library" ? (
            <div className="abp-lib-wrap">
              <div className="abp-lib-inner">
                <div className="abp-lib-hdr">
                  <div className="abp-lib-title">Activity Library</div>
                  <div className="abp-lib-sub">{allActivities.length} saved activit{allActivities.length === 1 ? "y" : "ies"} — click to edit</div>
                </div>

                {/* Sub-tabs */}
                {(() => {
                  const pubCount = allActivities.filter(a => a.status === "published" && (libFilter === "All" || ACT_META[a.type].label === libFilter)).length;
                  const dftCount = allActivities.filter(a => a.status === "draft" && (libFilter === "All" || ACT_META[a.type].label === libFilter)).length;
                  const tplCount = allActivities.filter(a => a.status === "template" && (libFilter === "All" || ACT_META[a.type].label === libFilter)).length;
                  return (
                    <div className="abp-lib-tabs">
                      <button className={`abp-lib-tab pub${libTab === "published" ? " active" : ""}`} onClick={() => setLibTab("published")}>
                        Published <span className="abp-lib-tab-count">{pubCount}</span>
                      </button>
                      <button className={`abp-lib-tab dft${libTab === "draft" ? " active" : ""}`} onClick={() => setLibTab("draft")}>
                        Drafts <span className="abp-lib-tab-count">{dftCount}</span>
                      </button>
                      <button className={`abp-lib-tab tpl${libTab === "template" ? " active" : ""}`} onClick={() => setLibTab("template" as any)}>
                        📐 Templates <span className="abp-lib-tab-count">{tplCount}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Type filters */}
                {allActivities.length > 0 && libTab !== "template" && (() => {
                  const nonTpl = allActivities.filter(a => a.status !== "template");
                  const types = ["All", ...Array.from(new Set(nonTpl.map(a => ACT_META[a.type].label)))];
                  return types.length > 2 ? (
                    <div className="abp-lib-filters">
                      {types.map(t => (
                        <button key={t} className={`abp-lib-chip${libFilter === t ? " on" : ""}`} onClick={() => setLibFilter(t)}>{t}</button>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Grid */}
                {libTab === "template" ? (
                  /* ── Template tab ── */
                  (() => {
                    const templates = allActivities.filter(a => a.status === "template");
                    const handleUseTemplate = (act: Activity) => {
                      setActivity({ ...dc(act), id: mkId(), status: "draft", title: act.title + " (copy)" });
                      setSelectedType(act.type);
                      setStep(2);
                      setViewMode("create");
                      setIsUpdate(false);
                      setIsTemplateEdit(false);
                    };
                    const handleEditTemplate = (act: Activity) => {
                      setActivity(dc(act));
                      setSelectedType(act.type);
                      setStep(2);
                      setViewMode("create");
                      setIsUpdate(true);
                      setIsTemplateEdit(true);
                    };
                    return templates.length === 0 ? (
                      <div className="abp-lib-empty">
                        <div className="abp-lib-empty-ico">📐</div>
                        <div className="abp-lib-empty-title">No templates yet</div>
                        <div className="abp-lib-empty-sub">Build an activity and click "Save as Template" to create a reusable blueprint</div>
                      </div>
                    ) : (
                      <div className="abp-lib-grid">
                        {templates.map(act => {
                          const m = ACT_META[act.type];
                          const ic = getActivityItemCount(act);
                          return (
                            <div key={act.id} className="abp-lib-card abp-tpl-lib-card"
                              style={{ borderColor:"rgba(109,40,217,0.15)", background:"#faf9ff", position:"relative", overflow:"hidden" }}>
                              {/* Blueprint grid texture */}
                              <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,rgba(109,40,217,0.04) 0,rgba(109,40,217,0.04) 1px,transparent 1px,transparent 18px),repeating-linear-gradient(90deg,rgba(109,40,217,0.04) 0,rgba(109,40,217,0.04) 1px,transparent 1px,transparent 18px)", pointerEvents:"none" }} />
                              <div className="abp-lib-card-top" style={{ position:"relative" }}>
                                <div className="abp-lib-card-ico" style={{ background:"linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>{m.icon}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div className="abp-lib-card-title">{act.title || "Untitled Template"}</div>
                                  <div className="abp-lib-card-meta">{m.label} · {ic} item{ic === 1 ? "" : "s"}</div>
                                </div>
                                <div style={{ flexShrink:0, padding:"2px 7px", borderRadius:20, fontSize:8.5, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", background:"rgba(109,40,217,0.1)", color:"#7c3aed", border:"1px solid rgba(109,40,217,0.2)" }}>TEMPLATE</div>
                              </div>
                              <div className="abp-lib-card-foot" style={{ position:"relative", background:"transparent", gap:6 }}>
                                <button onClick={() => handleEditTemplate(act)}
                                  style={{ flex:1, padding:"5px 0", borderRadius:7, border:"1.5px solid rgba(109,40,217,0.2)", background:"transparent", color:"#7c3aed", fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}
                                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f3ff"; }}
                                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                                  Edit
                                </button>
                                <button onClick={() => handleUseTemplate(act)}
                                  style={{ flex:2, padding:"5px 0", borderRadius:7, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 2px 8px rgba(124,58,237,0.25)", transition:"all .15s" }}
                                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.4)"; }}
                                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(124,58,237,0.25)"; }}>
                                  📐 Use Template
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : allActivities.length === 0 ? (
                  <div className="abp-lib-empty">
                    <div className="abp-lib-empty-ico">🧩</div>
                    <div className="abp-lib-empty-title">No activities yet</div>
                    <div className="abp-lib-empty-sub">Switch to Create New to build your first activity</div>
                  </div>
                ) : (() => {
                  const filtered = allActivities.filter(a =>
                    a.status !== "template" &&
                    (libTab === "published" ? a.status === "published" : a.status === "draft") &&
                    (libFilter === "All" || ACT_META[a.type].label === libFilter)
                  );
                  return filtered.length === 0 ? (
                    <div className="abp-lib-empty">
                      <div className="abp-lib-empty-ico" style={{ fontSize:20 }}>{libTab === "published" ? "✅" : "📝"}</div>
                      <div className="abp-lib-empty-title">No {libTab} activities</div>
                      <div className="abp-lib-empty-sub">Activities you {libTab === "published" ? "publish" : "save as drafts"} will appear here</div>
                    </div>
                  ) : (
                    <div className="abp-lib-grid">
                      {filtered.map(act => {
                        const m = ACT_META[act.type];
                        const ic = getActivityItemCount(act);
                        return (
                          <div key={act.id} className="abp-lib-card" onClick={() => handleLibrarySelect(act)}>
                            <div className="abp-lib-card-top">
                              <div className="abp-lib-card-ico">{m.icon}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div className="abp-lib-card-title">{act.title || "Untitled"}</div>
                                <div className="abp-lib-card-meta">{m.label} · {ic} item{ic === 1 ? "" : "s"}</div>
                              </div>
                            </div>
                            {act.media && (
                              <div style={{ padding:"0 14px 8px", fontSize:10, color:"#0d9488", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2H2a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M8 1h3v3M11 1L6 6"/></svg>
                                {act.media.name}
                              </div>
                            )}
                            <div className="abp-lib-card-foot">
                              <span className={`abp-lib-status ${act.status === "published" ? "pub" : "dft"}`}>
                                {act.status ?? "draft"}
                              </span>
                              <div className="abp-lib-arrow">
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 2l4 3-4 3"/></svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

          ) : (
            /* ══ CREATE VIEW ══ */
            <>
              {/* ── STEP 1: Type selection studio ── */}
              {step === 1 && (
                <div className="abp-studio">
                  <div className="abp-studio-atmo">
                    <div className="abp-studio-eyebrow">Activity Studio</div>
                    <div className="abp-studio-headline">What are you building?</div>
                    <div className="abp-studio-sub">Each type creates a different interactive experience for your learners.</div>
                  </div>

                  {/* Type tiles */}
                  <div className="abp-tile-grid">
                    {ALL_TYPES.map((type, i) => {
                      const m   = ACT_META[type];
                      const sel = selectedType === type;
                      const dim = selectedType !== null && !sel;
                      return (
                        <div key={type}
                          className={`abp-tile${sel ? " selected" : ""}${dim ? " dimmed" : ""}`}
                          style={{
                            "--tile-grad": m.gradient,
                            animationDelay: `${i * 0.06}s`,
                          } as React.CSSProperties}
                          onClick={() => handleTypeSelect(type)}>
                          {sel && (
                            <div className="abp-tile-selected-badge">
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2.2"><path d="M1 4l3 3 5-6"/></svg>
                            </div>
                          )}
                          <div className="abp-tile-icon"
                            style={{ background: sel ? `${m.gradient}` : "#f5f3ff" }}>
                            {m.icon}
                          </div>
                          <div>
                            <div className="abp-tile-label">{m.label}</div>
                            <div className="abp-tile-desc">{m.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Templates drawer */}
                  <div className="abp-tpl-drawer">
                    <button className={`abp-tpl-toggle${tplOpen ? " open" : ""}`} onClick={() => setTplOpen(v => !v)}>
                      <span>Quick-start from a template</span>
                      <div className="abp-tpl-toggle-line" />
                      <svg width="10" height="6" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l4 4 4-4"/></svg>
                    </button>
                    {tplOpen && (
                      <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:10 }}>
                        {/* My Templates section — user-saved */}
                        {allActivities.filter(a => a.status === "template").length > 0 && (
                          <div>
                            <div style={{ fontSize:9, fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"#7c3aed", marginBottom:7, display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:11 }}>⭐</span> My Templates
                            </div>
                            <div className="abp-tpl-grid" style={{ margin:0 }}>
                              {allActivities.filter(a => a.status === "template").map((act, i) => {
                                const m = ACT_META[act.type];
                                return (
                                  <div key={act.id} className="abp-tpl-card"
                                    style={{ animationDelay: `${i * 0.04}s`, animation:"abp-item-in .2s ease both", borderColor:"rgba(109,40,217,0.18)", background:"#f5f3ff" }}
                                    onClick={() => { setActivity({ ...dc(act), id: mkId(), status: "draft", title: act.title + " (copy)" }); setSelectedType(act.type); setIsUpdate(false); setIsTemplateEdit(false); setTimeout(() => setStep(2), 260); }}>
                                    <div className="abp-tpl-card-icon" style={{ background:"linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>{m.icon}</div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div className="abp-tpl-card-name">{act.title}</div>
                                      <div className="abp-tpl-card-desc">{m.label} · {getActivityItemCount(act)} items</div>
                                    </div>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(109,40,217,0.4)" strokeWidth="1.8"><path d="M4 2l4 4-4 4"/></svg>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Built-in templates */}
                        <div>
                          {allActivities.filter(a => a.status === "template").length > 0 && (
                            <div style={{ fontSize:9, fontWeight:800, letterSpacing:".14em", textTransform:"uppercase", color:"#8e7ec0", marginBottom:7 }}>
                              Built-in
                            </div>
                          )}
                          <div className="abp-tpl-grid" style={{ margin:0 }}>
                            {TEMPLATES.map((tpl, i) => {
                              const m = ACT_META[tpl.type];
                              return (
                                <div key={tpl.id} className="abp-tpl-card"
                                  style={{ animationDelay: `${i * 0.04}s`, animation:"abp-item-in .2s ease both" }}
                                  onClick={() => handleTemplateSelect(tpl)}>
                                  <div className="abp-tpl-card-icon">{m.icon}</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div className="abp-tpl-card-name">{tpl.name}</div>
                                    <div className="abp-tpl-card-desc">{tpl.desc}</div>
                                    <div className="abp-tpl-card-tags">
                                      {tpl.tags.map(tag => <span key={tag} className="abp-tpl-card-tag">{tag}</span>)}
                                    </div>
                                  </div>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(109,40,217,0.3)" strokeWidth="1.8"><path d="M4 2l4 4-4 4"/></svg>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Split build canvas ── */}
              {step === 2 && meta && (
                <div className="abp-canvas-wrap">
                  {/* Canvas atmosphere */}
                  <div className="abp-canvas-bg" style={{ "--canvas-grad": meta.gradient } as React.CSSProperties} />

                  {/* Left inspector */}
                  <div className="abp-inspector">
                    {/* Type badge — click to go back */}
                    <div className="abp-type-badge" onClick={() => { setStep(1); setSelectedType(null); }}>
                      <div className="abp-type-badge-icon" style={{ background: meta.gradient }}>{meta.icon}</div>
                      <div>
                        <div className="abp-type-badge-label">{meta.label}</div>
                        <div className="abp-type-badge-change">← Change type</div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="abp-insp-section">
                      <div className="abp-insp-label">Activity Title *</div>
                      <input className="abp-dark-input" type="text" value={activity.title}
                        onChange={e => setActivity({ ...activity, title: e.target.value })}
                        placeholder="e.g. POS System Overview" />
                    </div>

                    {/* Media */}
                    <div className="abp-insp-section">
                      <div className="abp-insp-label">Attach Media <span style={{ color:"rgba(255,255,255,0.2)", fontWeight:400, textTransform:"none", letterSpacing:0 }}>optional</span></div>
                      <input ref={mediaInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display:"none" }} onChange={handleMediaUpload} />

                      {activity.media ? (
                        <div className="abp-dark-media has">
                          <div style={{ width:44, height:44, borderRadius:8, overflow:"hidden", background:"#f5f3ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                            {activity.media.type === "image" ? <img src={activity.media.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> :
                             activity.media.type === "video" ? "🎬" : "📄"}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11.5, fontWeight:700, color:"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activity.media.name}</div>
                            <div style={{ fontSize:9.5, color:meta.darkColor, fontWeight:700, textTransform:"uppercase", marginTop:2 }}>{activity.media.type}</div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:"4px 9px" }} onClick={() => mediaInputRef.current?.click()}>Replace</button>
                            <button onClick={() => setActivity(prev => ({ ...prev, media: undefined }))}
                              style={{ fontSize:10, padding:"4px 9px", borderRadius:6, border:"none", background:"rgba(239,68,68,0.1)", color:"#f87171", cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="abp-dark-media"
                          onClick={() => !mediaUploading && mediaInputRef.current?.click()}
                          style={{ justifyContent:"center", flexDirection:"column", textAlign:"center", padding:"16px 12px", cursor: mediaUploading ? "wait" : "pointer" }}>
                          {mediaUploading ? (
                            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(109,40,217,0.4)" strokeWidth="2" style={{ animation:"spin 1s linear infinite", marginBottom:6 }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg><div style={{ fontSize:11, color:"#8e7ec0" }}>Uploading…</div></>
                          ) : (
                            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ marginBottom:6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style={{ fontSize:11, fontWeight:700, color:"#8e7ec0", marginBottom:2 }}>Upload media</div><div style={{ fontSize:9.5, color:"#c4b9e8" }}>Image · Video · PDF · Doc</div></>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Item count summary */}
                    <div style={{ marginTop:"auto", padding:"12px 14px", borderRadius:10, background:"#f5f3ff", border:"1.5px solid rgba(109,40,217,0.1)" }}>
                      <div style={{ fontSize:9.5, fontWeight:800, letterSpacing:".12em", textTransform:"uppercase", color:"#8e7ec0", marginBottom:6 }}>Summary</div>
                      <div style={{ fontSize:22, fontWeight:900, color: canPublish ? meta.color : "#c4b9e8", letterSpacing:"-.04em", lineHeight:1 }}>{itemCount}</div>
                      <div style={{ fontSize:11, color:"#8e7ec0", marginTop:3 }}>item{itemCount === 1 ? "" : "s"} added</div>
                    </div>
                  </div>

                  {/* Right canvas */}
                  <div className="abp-canvas">
                    <div className="abp-canvas-bg" style={{ background: meta.gradient }} />

                    <div className="abp-canvas-inner">
                      <div className="abp-canvas-hdr">
                        <div style={{ width:6, height:6, borderRadius:"50%", background:meta.darkColor, boxShadow:`0 0 8px ${meta.darkColor}` }} />
                        <div className="abp-canvas-hdr-label">Content Items</div>
                        <div className="abp-canvas-hdr-count">{itemCount} item{itemCount === 1 ? "" : "s"}</div>
                      </div>

                      {renderContentBuilder(activity, setActivity, meta)}

                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="abp-foot">
          <div className={`abp-foot-note${canPublish && step === 2 ? " ready" : ""}`}>{footNote}</div>

          {step === 2 && viewMode === "create" && (
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1L3 5l4 4"/></svg>
              Back
            </button>
          )}

          <button className="btn btn-ghost btn-sm" onClick={handleClose}>Cancel</button>

          {viewMode === "create" && step === 2 && (
            <>
              {isTemplateEdit ? (
                /* ── Template Edit Mode: Update Template + Use as Draft ── */
                <>
                  <button className="btn btn-sm" onClick={() => { handleSubmit("draft"); }}
                    disabled={!activity.title.trim()}
                    style={{ background:"rgba(109,40,217,0.08)", color:"#7c3aed", border:"1.5px solid rgba(109,40,217,0.2)" }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width:11, height:11 }}><path d="M2 2h10v1L7 9 2 3z"/><path d="M7 9v4"/></svg>
                    Use as Draft
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSubmit("template")}
                    disabled={!canPublish}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width:11, height:11 }}><path d="M2 2h10v10H2z"/><path d="M5 5h4M5 8h2"/></svg>
                    Update Template
                  </button>
                </>
              ) : (
                /* ── Normal Mode: Draft + Template + Publish ── */
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => handleSubmit("draft")}
                    disabled={!activity.title.trim()}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width:11, height:11 }}><path d="M11 1H3a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 00-2-2z"/><path d="M7 11V7M7 4h.01"/></svg>
                    Save Draft
                  </button>
                  <button className="btn btn-sm" onClick={() => handleSubmit("template")}
                    disabled={!activity.title.trim()}
                    style={{ background:"rgba(109,40,217,0.08)", color:"#7c3aed", border:"1.5px solid rgba(109,40,217,0.2)" }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width:11, height:11 }}><path d="M2 1h7l3 3v9H2z"/><path d="M9 1v3h3"/><path d="M5 7h4M5 10h2"/></svg>
                    Save as Template
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSubmit("published")}
                    disabled={!canPublish}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width:11, height:11 }}><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                    Publish Activity
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Content builder (extracted for clarity) ─────────────────────────────────
function renderContentBuilder(
  activity: Activity,
  setActivity: React.Dispatch<React.SetStateAction<Activity>>,
  meta: typeof ACT_META[SegmentType],
) {
  const type = activity.type;

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"9px 11px", borderRadius:8,
    border:"1.5px solid rgba(109,40,217,0.14)",
    background:"#faf9ff", color:"#18103a",
    fontSize:12.5, fontFamily:"'DM Sans',sans-serif",
    transition:"all .15s", boxSizing:"border-box",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = "rgba(124,58,237,0.5)";
    e.target.style.background  = "#fff";
    e.target.style.outline     = "none";
    e.target.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.1)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    e.target.style.borderColor = "rgba(109,40,217,0.14)";
    e.target.style.background  = "#faf9ff";
    e.target.style.boxShadow   = "none";
  };

  if (type === "accordion") return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {activity.items?.map((item, idx) => (
        <div key={idx} className="abp-item-row" style={{ animationDelay:`${idx*0.05}s` }}>
          <div className="abp-item-num">{idx + 1}</div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
            <input style={inputStyle} type="text" placeholder="Question" value={item.q}
              onFocus={inputFocus} onBlur={inputBlur}
              onChange={e => { const items = [...(activity.items||[])]; items[idx] = {...item, q:e.target.value}; setActivity({...activity, items}); }} />
            <textarea style={{ ...inputStyle, minHeight:60, resize:"vertical", lineHeight:1.5 } as React.CSSProperties}
              placeholder="Answer" value={item.a}
              onFocus={inputFocus} onBlur={inputBlur}
              onChange={e => { const items = [...(activity.items||[])]; items[idx] = {...item, a:e.target.value}; setActivity({...activity, items}); }} />
          </div>
          {(activity.items?.length ?? 0) > 1 && (
            <button className="abp-item-del" onClick={() => setActivity({...activity, items: activity.items?.filter((_,i) => i !== idx)})}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      ))}
      <button className="abp-add-btn" onClick={() => setActivity({...activity, items:[...(activity.items||[]),{q:"",a:""}]})}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Question
      </button>
    </div>
  );

  if (type === "flashcard") return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {activity.cards?.map((card, idx) => (
        <div key={idx} className="abp-item-row" style={{ animationDelay:`${idx*0.05}s` }}>
          <div className="abp-item-num">{idx + 1}</div>
          <div style={{ flex:1, display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9.5, color:"#8e7ec0", fontWeight:700, letterSpacing:".1em", marginBottom:5, textTransform:"uppercase" }}>Front</div>
              <input style={inputStyle} type="text" placeholder="Front of card" value={card.front}
                onFocus={inputFocus} onBlur={inputBlur}
                onChange={e => { const cards = [...(activity.cards||[])]; cards[idx] = {...card, front:e.target.value}; setActivity({...activity, cards}); }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", color:"#c4b9e8", fontSize:16, paddingTop:20 }}>↔</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9.5, color:"#8e7ec0", fontWeight:700, letterSpacing:".1em", marginBottom:5, textTransform:"uppercase" }}>Back</div>
              <input style={inputStyle} type="text" placeholder="Back of card" value={card.back}
                onFocus={inputFocus} onBlur={inputBlur}
                onChange={e => { const cards = [...(activity.cards||[])]; cards[idx] = {...card, back:e.target.value}; setActivity({...activity, cards}); }} />
            </div>
          </div>
          {(activity.cards?.length ?? 0) > 1 && (
            <button className="abp-item-del" onClick={() => setActivity({...activity, cards: activity.cards?.filter((_,i) => i !== idx)})}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      ))}
      <button className="abp-add-btn" onClick={() => setActivity({...activity, cards:[...(activity.cards||[]),{front:"",back:""}]})}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Card
      </button>
    </div>
  );

  if (type === "checklist" || type === "hotspot") return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {activity.checklist?.map((item, idx) => (
        <div key={idx} className="abp-item-row" style={{ animationDelay:`${idx*0.05}s` }}>
          <div className="abp-item-num">{idx + 1}</div>
          <input style={{ ...inputStyle, flex:1 }} type="text" placeholder="Task or step description" value={item.text}
            onFocus={inputFocus} onBlur={inputBlur}
            onChange={e => { const checklist = [...(activity.checklist||[])]; checklist[idx] = {text:e.target.value}; setActivity({...activity, checklist}); }} />
          {(activity.checklist?.length ?? 0) > 1 && (
            <button className="abp-item-del" onClick={() => setActivity({...activity, checklist: activity.checklist?.filter((_,i) => i !== idx)})}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      ))}
      <button className="abp-add-btn" onClick={() => setActivity({...activity, checklist:[...(activity.checklist||[]),{text:""}]})}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Item
      </button>
    </div>
  );

  if (type === "matching") return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {activity.pairs?.map((pair, idx) => (
        <div key={idx} className="abp-item-row" style={{ animationDelay:`${idx*0.05}s` }}>
          <div className="abp-item-num">{idx + 1}</div>
          <div style={{ flex:1, display:"flex", gap:8, alignItems:"center" }}>
            <input style={{ ...inputStyle, flex:1 }} type="text" placeholder="Left column" value={pair.left}
              onFocus={inputFocus} onBlur={inputBlur}
              onChange={e => { const pairs = [...(activity.pairs||[])]; pairs[idx] = {...pair, left:e.target.value}; setActivity({...activity, pairs}); }} />
            <span style={{ color:"#c4b9e8", fontSize:13, flexShrink:0 }}>↔</span>
            <input style={{ ...inputStyle, flex:1 }} type="text" placeholder="Right column" value={pair.right}
              onFocus={inputFocus} onBlur={inputBlur}
              onChange={e => { const pairs = [...(activity.pairs||[])]; pairs[idx] = {...pair, right:e.target.value}; setActivity({...activity, pairs}); }} />
          </div>
          {(activity.pairs?.length ?? 0) > 1 && (
            <button className="abp-item-del" onClick={() => setActivity({...activity, pairs: activity.pairs?.filter((_,i) => i !== idx)})}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      ))}
      <button className="abp-add-btn" onClick={() => setActivity({...activity, pairs:[...(activity.pairs||[]),{left:"",right:""}]})}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Pair
      </button>
    </div>
  );

  if (type === "fillblank") return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {activity.questions?.map((q, idx) => (
        <div key={idx} className="abp-item-row" style={{ animationDelay:`${idx*0.05}s` }}>
          <div className="abp-item-num">{idx + 1}</div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
            <div>
              <div style={{ fontSize:9.5, color:"rgba(255,255,255,0.3)", fontWeight:700, letterSpacing:".1em", marginBottom:4, textTransform:"uppercase" }}>Sentence <span style={{ color:"#c4b9e8", fontWeight:400, letterSpacing:0, textTransform:"none" }}>use __BLANK__</span></div>
              <input style={inputStyle} type="text" placeholder="Type a sentence with __BLANK__ here" value={q.sentence}
                onFocus={inputFocus} onBlur={inputBlur}
                onChange={e => { const questions = [...(activity.questions||[])]; questions[idx] = {...q, sentence:e.target.value}; setActivity({...activity, questions}); }} />
            </div>
            <div>
              <div style={{ fontSize:9.5, color:"rgba(255,255,255,0.3)", fontWeight:700, letterSpacing:".1em", marginBottom:4, textTransform:"uppercase" }}>Correct Answer</div>
              <input style={inputStyle} type="text" placeholder="Correct answer" value={q.blanks[0] || ""}
                onFocus={inputFocus} onBlur={inputBlur}
                onChange={e => { const questions = [...(activity.questions||[])]; questions[idx] = {...q, blanks:[e.target.value]}; setActivity({...activity, questions}); }} />
            </div>
          </div>
          {(activity.questions?.length ?? 0) > 1 && (
            <button className="abp-item-del" onClick={() => setActivity({...activity, questions: activity.questions?.filter((_,i) => i !== idx)})}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}
        </div>
      ))}
      <button className="abp-add-btn" onClick={() => setActivity({...activity, questions:[...(activity.questions||[]),{sentence:"Type a sentence with __BLANK__ here.",blanks:[""]}]})}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Question
      </button>
    </div>
  );

  return null;
}

// ─── ActivityInlinePreview ────────────────────────────────────────────────────
export function ActivityInlinePreview({ activity, onEdit, onRemove }: {
  activity: Activity; onEdit?: () => void; onRemove?: () => void;
}) {
  const meta      = ACT_META[activity.type];
  const itemCount = getActivityItemCount(activity);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, border:`1.5px solid ${meta.border}`, background:`${meta.bg}66`, transition:"all .15s" }}>
      <div style={{ width:36, height:36, borderRadius:9, background:meta.bg, border:`1.5px solid ${meta.border}`, color:meta.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{meta.icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activity.title || "Untitled Activity"}</div>
        <div style={{ fontSize:10.5, color:meta.color, fontWeight:600, marginTop:2 }}>
          {meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}
          {activity.status && (
            <span style={{ marginLeft:8, padding:"1px 7px", borderRadius:4, fontSize:9, fontWeight:700, textTransform:"uppercase", background: activity.status === "published" ? "#d1fae5" : "#fef3c7", color: activity.status === "published" ? "#065f46" : "#92400e" }}>
              {activity.status}
            </span>
          )}
        </div>
        {activity.media && <div style={{ fontSize:10, color:"#0d9488", marginTop:2, fontWeight:600 }}>📎 {activity.media.name}</div>}
      </div>
      {onEdit && <button onClick={onEdit} style={{ padding:"5px 10px", borderRadius:7, border:`1.5px solid ${meta.border}`, background:"#fff", color:meta.color, fontSize:11, fontWeight:700, cursor:"pointer" }}>Edit</button>}
      {onRemove && (
        <button onClick={onRemove} style={{ width:28, height:28, borderRadius:7, border:"1.5px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── LessonBlocks ─────────────────────────────────────────────────────────────
export function LessonBlocks({ blocks, onChange, onEditActivity }: {
  blocks: LessonBlock[];
  onChange: (blocks: LessonBlock[]) => void;
  onEditActivity?: (activity: Activity, blockId: string) => void;
}) {
  const updateBlock = (idx: number, updates: Partial<LessonBlock>) => {
    const updated = [...blocks]; updated[idx] = { ...updated[idx], ...updates }; onChange(updated);
  };
  const deleteBlock = (idx: number) => onChange(blocks.filter((_, i) => i !== idx));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {blocks.map((block, idx) => (
        <div key={block.id} style={{ padding:14, borderRadius:10, background:"var(--bg,#faf9ff)", border:"1.5px solid var(--border,rgba(124,58,237,0.1))" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background: block.kind === "content" ? "linear-gradient(135deg,#0284c7,#0d9488)" : "linear-gradient(135deg,#7c3aed,#d97706)", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx + 1}</div>
            <div style={{ fontSize:11.5, fontWeight:700, color:"var(--t2,#4a3870)", textTransform:"uppercase", letterSpacing:".05em", flex:1 }}>{block.kind === "content" ? "📝 Content Block" : "🧩 Activity"}</div>
            <button onClick={() => deleteBlock(idx)} style={{ width:28, height:28, borderRadius:7, border:"1.5px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          </div>
          {block.kind === "content" ? (
            <textarea value={block.body || ""} onChange={e => updateBlock(idx, { body: e.target.value })} placeholder="Enter content text..."
              style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid var(--border,rgba(109,40,217,0.1))", background:"var(--surface,#fff)", color:"var(--t1,#18103a)", fontSize:12.5, fontFamily:"inherit", resize:"vertical", minHeight:80, lineHeight:1.5 }} />
          ) : block.activity ? (
            <ActivityInlinePreview activity={block.activity} onEdit={onEditActivity ? () => onEditActivity(block.activity!, block.id) : undefined} onRemove={() => updateBlock(idx, { activity: undefined, kind: "content", body: "" })} />
          ) : (
            <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(124,58,237,0.04)", border:"1.5px solid rgba(124,58,237,0.12)", fontSize:12, color:"var(--t3,#a89dc8)" }}>No activity attached</div>
          )}
        </div>
      ))}
    </div>
  );
}
