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
  status?: "draft" | "published";
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
export const ACT_META: Record<SegmentType, { icon:string; label:string; color:string; bg:string; border:string; desc:string }> = {
  accordion: { icon:"🗂️", label:"Accordion",     color:"#0369a1", bg:"#f0f9ff", border:"rgba(3,105,161,0.18)",  desc:"Expandable Q&A sections" },
  flashcard: { icon:"🃏", label:"Flashcards",    color:"#6d28d9", bg:"#faf5ff", border:"rgba(109,40,217,0.18)", desc:"Flip-card memory drill"   },
  fillblank: { icon:"✏️", label:"Fill in Blank", color:"#0f766e", bg:"#f0fdf9", border:"rgba(15,118,110,0.18)", desc:"Sentence completion"      },
  checklist: { icon:"☑️", label:"Checklist",     color:"#15803d", bg:"#f0fdf4", border:"rgba(21,128,61,0.18)",  desc:"Step-by-step task list"   },
  matching:  { icon:"🔗", label:"Matching",      color:"#7c3aed", bg:"#faf5ff", border:"rgba(124,58,237,0.18)", desc:"Match two columns"        },
  hotspot:   { icon:"🎯", label:"Hotspot",       color:"#b45309", bg:"#fffbeb", border:"rgba(180,83,9,0.18)",   desc:"Interactive task list"    },
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
@keyframes abp-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

.abp-fs {
  position:fixed; inset:0; z-index:1001;
  display:flex; flex-direction:column;
  background:var(--bg,#f8f7ff);
  animation:abp-in .24s cubic-bezier(.16,1,.3,1) both;
}

.abp-hdr {
  height:64px; flex-shrink:0;
  display:flex; align-items:center; gap:14px; padding:0 24px;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 1px 6px rgba(124,58,237,0.04);
}
.abp-hdr-ico {
  width:42px; height:42px; border-radius:12px; flex-shrink:0;
  background:linear-gradient(145deg,#7c3aed 0%,#5b21b6 50%,#0d9488 100%);
  box-shadow:0 0 0 1px rgba(255,255,255,0.12) inset, 0 4px 14px rgba(109,40,217,0.4);
  display:flex; align-items:center; justify-content:center;
}
.abp-hdr-text { flex:1; }
.abp-hdr-title { font-size:16px; font-weight:800; color:var(--t1,#18103a); line-height:1.2; }
.abp-hdr-sub { font-size:12px; color:var(--t3,#8e7ec0); margin-top:2px; }

.abp-body { flex:1; display:flex; overflow:hidden; }
.abp-main { flex:1; display:flex; flex-direction:column; overflow:auto; padding:24px; gap:16px; }

.abp-section {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:20px; flex-shrink:0;
}
.abp-section.grow { flex:1; overflow:auto; }

.abp-sec-hd {
  display:flex; align-items:center; gap:10px; margin-bottom:16px;
}
.abp-sec-ico {
  width:32px; height:32px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:15px;
}
.abp-sec-label {
  flex:1; font-size:13px; font-weight:700; color:var(--t1,#18103a);
  text-transform:uppercase; letter-spacing:.05em;
}

.abp-type-grid {
  display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:12px;
}
.abp-type-card {
  padding:14px; border-radius:10px; cursor:pointer;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  background:var(--bg,#faf9ff); transition:all .15s;
  display:flex; align-items:flex-start; gap:12px;
}
.abp-type-card:hover { border-color:rgba(124,58,237,0.25); background:#f5f3ff; }
.abp-type-card.selected {
  border-color:var(--purple,#7c3aed);
  background:#f0ebff; box-shadow:0 2px 10px rgba(124,58,237,0.15);
}
.abp-type-icon {
  width:42px; height:42px; border-radius:10px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:20px;
}
.abp-type-info { flex:1; min-width:0; }
.abp-type-label { font-size:13px; font-weight:700; color:var(--t1,#18103a); margin-bottom:4px; }
.abp-type-desc  { font-size:11px; color:var(--t3,#a89dc8); line-height:1.4; }
.abp-type-check {
  width:24px; height:24px; border-radius:6px; flex-shrink:0;
  background:var(--purple,#7c3aed); color:#fff;
  display:flex; align-items:center; justify-content:center;
}

.abp-template-list { display:flex; flex-direction:column; gap:10px; }
.abp-template-card {
  padding:12px 14px; border-radius:10px; cursor:pointer;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  background:var(--bg,#faf9ff); transition:all .15s;
  display:flex; align-items:center; gap:12px;
}
.abp-template-card:hover {
  border-color:rgba(124,58,237,0.25);
  background:#f5f3ff; transform:translateX(2px);
}
.abp-template-icon {
  width:38px; height:38px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:18px;
}
.abp-template-name { font-size:12.5px; font-weight:700; color:var(--t1,#18103a); margin-bottom:3px; }
.abp-template-desc { font-size:10.5px; color:var(--t3,#a89dc8); line-height:1.3; }
.abp-template-tags { display:flex; gap:6px; margin-top:6px; }
.abp-template-tag {
  padding:3px 8px; border-radius:5px;
  background:rgba(124,58,237,0.08); color:var(--purple,#7c3aed);
  font-size:9.5px; font-weight:600; text-transform:uppercase; letter-spacing:.04em;
}

.field-g { margin-bottom:14px; }
.f-lbl {
  display:block; font-size:11.5px; font-weight:700;
  color:var(--t2,#4a3870); margin-bottom:6px;
}
.f-in {
  width:100%; padding:10px 12px; border-radius:8px;
  border:1.5px solid var(--border,rgba(109,40,217,0.1));
  background:var(--surface,#fff); color:var(--t1,#18103a);
  font-size:12.5px; font-family:inherit; transition:all .15s;
}
.f-in:focus {
  outline:none; border-color:var(--purple,#7c3aed);
  box-shadow:0 0 0 3px rgba(124,58,237,0.08);
}
textarea.f-in { resize:vertical; min-height:70px; line-height:1.5; }

.abp-item-list { display:flex; flex-direction:column; gap:10px; }
.abp-item-row {
  display:flex; align-items:flex-start; gap:10px;
  padding:12px; border-radius:9px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
}
.abp-item-num {
  width:28px; height:28px; border-radius:7px; flex-shrink:0;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:11px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
}
.abp-item-del {
  width:28px; height:28px; border-radius:7px; flex-shrink:0;
  border:1.5px solid rgba(239,68,68,0.2);
  background:rgba(239,68,68,0.05); color:#dc2626;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .15s;
}
.abp-item-del:hover { background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.3); }

.abp-add-btn {
  width:100%; padding:11px 14px; border-radius:9px;
  border:1.5px dashed var(--border,rgba(124,58,237,0.2));
  background:var(--surface,#fff); color:var(--purple,#7c3aed);
  font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
  display:flex; align-items:center; justify-content:center; gap:7px;
  transition:all .15s;
}
.abp-add-btn:hover { border-color:var(--purple,#7c3aed); background:rgba(124,58,237,0.04); }

.abp-media-zone {
  border:2px dashed var(--border,rgba(124,58,237,0.2));
  border-radius:10px; padding:16px;
  background:var(--bg,#faf9ff);
  display:flex; align-items:center; gap:12px;
  transition:all .15s;
}
.abp-media-zone:hover { border-color:rgba(124,58,237,0.4); background:rgba(124,58,237,0.03); }
.abp-media-zone.has-media {
  border-style:solid; border-color:rgba(124,58,237,0.2);
  background:var(--surface,#fff);
}
.abp-media-preview {
  width:56px; height:56px; border-radius:8px;
  overflow:hidden; flex-shrink:0;
  background:rgba(124,58,237,0.06);
  display:flex; align-items:center; justify-content:center;
}
.abp-media-preview img { width:100%; height:100%; object-fit:cover; }

.abp-foot {
  height:72px; flex-shrink:0;
  display:flex; align-items:center; gap:10px; padding:0 24px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}

/* Activity preview card used inside module/course editors */
.abp-activity-chip {
  display:flex; align-items:center; gap:10px;
  padding:10px 14px; border-radius:10px;
  border:1.5px solid var(--border,rgba(124,58,237,0.12));
  background:var(--surface,#fff);
  transition:all .15s;
}
.abp-activity-chip:hover { border-color:rgba(124,58,237,0.3); box-shadow:0 2px 10px rgba(124,58,237,0.08); }

.btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:10px 18px; border-radius:9px;
  font-size:12.5px; font-weight:700; border:none;
  cursor:pointer; font-family:inherit; transition:all .15s;
}
.btn svg { width:14px; height:14px; }
.btn-s {
  background:transparent; color:var(--t2,#4a3870);
  border:1.5px solid var(--border,rgba(109,40,217,0.12));
}
.btn-s:hover { background:rgba(124,58,237,0.04); border-color:rgba(109,40,217,0.2); }
.btn-p {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; border:none; box-shadow:0 2px 8px rgba(124,58,237,0.25);
}
.btn-p:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.35); }
.btn-p:active { transform:translateY(0); }
.btn-sm { padding:7px 14px; font-size:11.5px; }
.btn-sm svg { width:12px; height:12px; }

/* ── View toggle ── */
.abp-toggle-bar {
  display:flex; align-items:center;
  padding:10px 24px;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  gap:6px;
}
.abp-toggle-track {
  display:flex; align-items:center;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.12));
  border-radius:10px; padding:3px; gap:2px; flex:1;
}
.abp-toggle-btn {
  flex:1; padding:7px 14px; border-radius:7px; border:none;
  font-size:12px; font-weight:600; cursor:pointer;
  font-family:inherit; transition:all .15s;
  display:flex; align-items:center; justify-content:center; gap:7px;
  color:var(--t3,#a89dc8); background:transparent;
}
.abp-toggle-btn.active {
  background:var(--surface,#fff);
  color:var(--t1,#18103a);
  box-shadow:0 1px 6px rgba(124,58,237,0.1), 0 0 0 1px rgba(124,58,237,0.08);
}
.abp-toggle-btn.active.lib { color:var(--purple,#7c3aed); }
.abp-toggle-count {
  padding:1px 7px; border-radius:20px; font-size:10px; font-weight:700;
  background:rgba(124,58,237,0.1); color:var(--purple,#7c3aed);
  transition:all .15s;
}
.abp-toggle-btn.active .abp-toggle-count {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff;
}

/* ── Library header ── */
.abp-lib-hdr {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:18px; flex-shrink:0;
}
.abp-lib-title { font-size:15px; font-weight:800; color:var(--t1,#18103a); letter-spacing:-0.01em; }
.abp-lib-sub   { font-size:11.5px; color:var(--t3,#a89dc8); margin-top:3px; }
.abp-lib-stats { display:flex; align-items:center; gap:6px; }
.abp-lib-stat-pill {
  display:flex; align-items:center; gap:5px;
  padding:4px 10px; border-radius:20px;
  border:1.5px solid var(--border,rgba(124,58,237,0.12));
  background:var(--bg,#faf9ff);
  font-size:11px; font-weight:600; color:var(--t2,#4a3870);
}
.abp-lib-stat-pill.pub {
  border-color:rgba(13,148,136,0.2);
  background:rgba(13,148,136,0.05);
  color:var(--teal,#0d9488);
}
.abp-lib-stat-dot {
  width:6px; height:6px; border-radius:50%;
  background:currentColor; opacity:0.6;
}

/* ── Library filter chips ── */
.abp-lib-filters {
  display:flex; align-items:center; gap:6px;
  margin-bottom:16px; flex-wrap:wrap; flex-shrink:0;
}
.abp-lib-chip {
  padding:4px 12px; border-radius:20px;
  border:1.5px solid var(--border,rgba(124,58,237,0.12));
  background:var(--bg,#faf9ff);
  font-size:11px; font-weight:600; color:var(--t2,#4a3870);
  cursor:pointer; transition:all .15s; font-family:inherit;
}
.abp-lib-chip:hover { border-color:rgba(124,58,237,0.25); color:var(--purple,#7c3aed); }
.abp-lib-chip.on {
  background:var(--purple,#7c3aed); border-color:var(--purple,#7c3aed); color:#fff;
}

/* ── Library grid ── */
.abp-lib-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(190px, 1fr));
  gap:10px;
}

/* ── Library card ── */
.abp-lib-card {
  border-radius:12px; cursor:pointer;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  background:var(--surface,#fff);
  transition:all .18s; overflow:hidden;
  display:flex; flex-direction:column;
}
.abp-lib-card:hover {
  border-color:rgba(124,58,237,0.28);
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(124,58,237,0.11);
}
.abp-lib-card-top {
  padding:14px 14px 10px;
  display:flex; align-items:flex-start; gap:10px;
}
.abp-lib-card-ico {
  width:38px; height:38px; border-radius:10px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:18px;
  border:1.5px solid transparent;
}
.abp-lib-card-body { flex:1; min-width:0; }
.abp-lib-card-title {
  font-size:12.5px; font-weight:700; color:var(--t1,#18103a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  margin-bottom:3px;
}
.abp-lib-card-meta {
  font-size:10px; color:var(--t3,#a89dc8);
  text-transform:uppercase; letter-spacing:.04em; font-weight:600;
}
.abp-lib-card-media {
  padding:0 14px 8px;
  font-size:10px; color:var(--teal,#0d9488); font-weight:600;
  display:flex; align-items:center; gap:4px;
}
.abp-lib-card-foot {
  margin-top:auto;
  padding:8px 14px;
  border-top:1px solid var(--border,rgba(124,58,237,0.07));
  display:flex; align-items:center; justify-content:space-between;
}
.abp-lib-status {
  padding:3px 9px; border-radius:20px;
  font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;
}
.abp-lib-status.pub  { background:rgba(13,148,136,0.1);  color:var(--teal,#0d9488); }
.abp-lib-status.dft  { background:rgba(245,158,11,0.1);   color:#b45309; }
.abp-lib-arrow {
  width:22px; height:22px; border-radius:6px;
  background:rgba(124,58,237,0.07);
  display:flex; align-items:center; justify-content:center;
  color:var(--purple,#7c3aed); transition:all .15s;
}
.abp-lib-card:hover .abp-lib-arrow {
  background:var(--purple,#7c3aed); color:#fff;
}

/* ── Library sub-tabs (Published / Drafts) ── */
.abp-lib-tabs {
  display:flex; align-items:center; gap:0;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  margin-bottom:18px; flex-shrink:0; position:relative;
}
.abp-lib-tab {
  display:flex; align-items:center; gap:7px;
  padding:10px 18px 9px; border:none; background:transparent;
  font-family:inherit; font-size:12px; font-weight:600;
  color:var(--t3,#a89dc8); cursor:pointer;
  border-bottom:2px solid transparent; margin-bottom:-1px;
  transition:all .15s; white-space:nowrap;
}
.abp-lib-tab:hover { color:var(--t2,#4a3870); }
.abp-lib-tab.pub.active { color:var(--teal,#0d9488); border-bottom-color:var(--teal,#0d9488); }
.abp-lib-tab.dft.active { color:#d97706; border-bottom-color:#d97706; }
.abp-lib-tab-count {
  padding:1px 7px; border-radius:20px; font-size:10px; font-weight:700;
  background:rgba(124,58,237,0.08); color:var(--t3,#a89dc8);
  transition:all .2s;
}
.abp-lib-tab.pub.active .abp-lib-tab-count {
  background:rgba(13,148,136,0.12); color:var(--teal,#0d9488);
}
.abp-lib-tab.dft.active .abp-lib-tab-count {
  background:rgba(217,119,6,0.1); color:#d97706;
}

/* ── Page counter pill (matches CourseCatalog) ── */
.abp-page-pill {
  margin-left:auto;
  display:flex; align-items:center; gap:5px;
  padding:4px 10px; border-radius:20px;
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.12));
  font-size:11px; font-weight:600; color:var(--t2,#4a3870);
  user-select:none;
}
.abp-page-pill-dot {
  width:5px; height:5px; border-radius:50%;
}
.abp-page-pill.pub .abp-page-pill-dot { background:var(--teal,#0d9488); box-shadow:0 0 4px var(--teal,#0d9488); }
.abp-page-pill.dft .abp-page-pill-dot { background:#d97706; box-shadow:0 0 4px #d97706; }

/* ── Swipe container ── */
.abp-lib-swipe-wrap {
  flex:1; overflow:hidden; position:relative; min-height:0;
}
.abp-lib-swipe-track {
  display:flex; height:100%;
  transition:transform .3s cubic-bezier(.16,1,.3,1);
  will-change:transform;
}
.abp-lib-swipe-pane {
  min-width:100%; height:100%; overflow-y:auto; padding-right:2px;
}
.abp-lib-swipe-pane::-webkit-scrollbar { width:4px; }
.abp-lib-swipe-pane::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.15); border-radius:4px; }

.abp-lib-empty-section {
  display:flex; flex-direction:column; align-items:center;
  padding:40px 0; gap:8px; text-align:center;
}
.abp-lib-empty-section-ico {
  width:52px; height:52px; border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; margin-bottom:4px;
}
.abp-lib-empty-section-title { font-size:13px; font-weight:700; color:var(--t1,#18103a); }
.abp-lib-empty-section-sub   { font-size:11.5px; color:var(--t3,#a89dc8); line-height:1.5; max-width:220px; }

/* Zero-state (no activities at all) */
.abp-lib-empty {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:64px 24px; text-align:center; gap:10px;
}
.abp-lib-empty-ico {
  width:64px; height:64px; border-radius:18px; background:rgba(124,58,237,0.07);
  display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:4px;
}
.abp-lib-empty-title { font-size:14px; font-weight:700; color:var(--t1,#18103a); }
.abp-lib-empty-sub   { font-size:12px; color:var(--t3,#a89dc8); max-width:260px; line-height:1.5; }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
interface ActivityBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  /**
   * FIX: added `isUpdate` flag so the parent can distinguish
   * between a brand-new activity (push) and an edit (replace by id).
   */
  onSave: (activity: Activity, saveAs: "draft" | "published", isUpdate: boolean) => void;
  editActivity: Activity | null;
  toast: (msg: string) => void;
  allActivities?: Activity[];
}

export default function ActivityBuilderPanel({
  open,
  onClose,
  onSave,
  editActivity,
  toast,
  allActivities = [],
}: ActivityBuilderPanelProps) {
  const isEdit = !!editActivity;

  const [viewMode,      setViewMode]      = useState<"create" | "library">("create");
  const [step,          setStep]          = useState<1 | 2>(1);
  const [activity,      setActivity]      = useState<Activity>(blankActivity("accordion"));
  const [selectedType,  setSelectedType]  = useState<SegmentType | null>(null);
  const [closing,       setClosing]       = useState(false);
  // FIX: track whether we loaded an existing activity (edit prop OR picked from library)
  const [isUpdate,      setIsUpdate]      = useState(false);

  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [libFilter, setLibFilter] = useState("All");
  const [libTab, setLibTab]       = useState<"published" | "draft">("published");

  useEffect(() => {
    if (!open) return;
    if (isEdit && editActivity) {
      setActivity(dc(editActivity));
      setSelectedType(editActivity.type);
      setStep(2);
      setViewMode("create");
      setIsUpdate(true);   // editing existing → update
    } else {
      setActivity(blankActivity("accordion"));
      setSelectedType(null);
      setStep(1);
      setViewMode("create");
      setIsUpdate(false);  // fresh → insert
    }
    setClosing(false);
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
      toast("Media uploaded successfully!");
    } catch (err) {
      toast("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  const removeMedia = () => setActivity(prev => ({ ...prev, media: undefined }));

  const handleTypeSelect = (type: SegmentType) => {
    setSelectedType(type);
    setActivity(blankActivity(type));
    setIsUpdate(false);
  };

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setSelectedType(template.type);
    // Templates always generate a fresh id → insert, not update
    setActivity({ ...dc(template.activity), id: mkId(), status: "draft" });
    setIsUpdate(false);
    setStep(2);
  };

  // FIX: picking from library keeps the original id → this is an update
  const handleLibrarySelect = (act: Activity) => {
    setActivity(dc(act));
    setSelectedType(act.type);
    setStep(2);
    setViewMode("create");
    setIsUpdate(true);
  };

  const handleNext = () => {
    if (!selectedType) { toast("Please select an activity type."); return; }
    setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 150);
  };

  const handleSubmit = (saveAs: "draft" | "published") => {
    if (!activity.title.trim()) { toast("Please enter an activity title."); return; }
    const itemCount = getActivityItemCount(activity);
    if (itemCount === 0) { toast("Please add at least one item to your activity."); return; }
    // FIX: pass isUpdate so parent knows whether to splice-replace or push
    onSave({ ...activity, status: saveAs }, saveAs, isUpdate || isEdit);
    handleClose();
  };

  const footerNote = step === 1
    ? selectedType ? `Click next to build your ${ACT_META[selectedType].label}` : "Select an activity type to continue"
    : !activity.title.trim() ? "Enter a title to continue"
    : getActivityItemCount(activity) === 0 ? "Add at least one item"
    : `${getActivityItemCount(activity)} item${getActivityItemCount(activity) === 1 ? "" : "s"} added`;

  const footerNoteColor =
    (step === 1 && !selectedType) ||
    (step === 2 && (!activity.title.trim() || getActivityItemCount(activity) === 0))
      ? "var(--t3)" : "var(--teal)";

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className={`abp-fs${closing ? " closing" : ""}`}>

        {/* Header */}
        <div className="abp-hdr">
          <div className="abp-hdr-ico">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="6" height="6" rx="1.5"/>
              <rect x="13" y="3" width="6" height="6" rx="1.5"/>
              <rect x="3" y="13" width="6" height="6" rx="1.5"/>
              <path d="M16 13v6M13 16h6"/>
            </svg>
          </div>
          <div className="abp-hdr-text">
            <div className="abp-hdr-title">{isEdit || isUpdate ? "Edit Activity" : "Create New Activity"}</div>
            <div className="abp-hdr-sub">
              {step === 1 ? "Choose an activity type or template" : `Building ${ACT_META[activity.type]?.label}`}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        {!isEdit && (
          <div className="abp-toggle-bar">
            <div className="abp-toggle-track">
              {(["create","library"] as const).map(mode => (
                <button key={mode}
                  className={`abp-toggle-btn${viewMode === mode ? (" active" + (mode === "library" ? " lib" : "")) : ""}`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "create"
                    ? <><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 1v10M1 6h10"/></svg>Create New</>
                    : <><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>Library</>}
                  {mode === "library" && allActivities.length > 0 && (
                    <span className="abp-toggle-count">{allActivities.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="abp-body">
          {/* ── LIBRARY VIEW ── */}
          {viewMode === "library" ? (
            <div className="abp-main" style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>

              {/* Header row */}
              <div className="abp-lib-hdr">
                <div>
                  <div className="abp-lib-title">Activity Library</div>
                  <div className="abp-lib-sub">{allActivities.length} activit{allActivities.length === 1 ? "y" : "ies"}</div>
                </div>
                <div className="abp-lib-stats">
                  <div className="abp-lib-stat-pill">
                    <span className="abp-lib-stat-dot" />
                    {allActivities.length} total
                  </div>
                  {allActivities.filter(a => a.status === "published").length > 0 && (
                    <div className="abp-lib-stat-pill pub">
                      <span className="abp-lib-stat-dot" />
                      {allActivities.filter(a => a.status === "published").length} published
                    </div>
                  )}
                </div>
              </div>

              {/* Type filter chips */}
              {allActivities.length > 0 && (() => {
                const types = ["All", ...Array.from(new Set(allActivities.map(a => ACT_META[a.type].label)))];
                return types.length > 2 ? (
                  <div className="abp-lib-filters">
                    {types.map(t => (
                      <button key={t} className={"abp-lib-chip" + (libFilter === t ? " on" : "")} onClick={() => setLibFilter(t)}>{t}</button>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Published / Drafts sub-tabs with page counter pill */}
              {(() => {
                const pubCount = allActivities.filter(a => (a.status === "published") && (libFilter === "All" || ACT_META[a.type].label === libFilter)).length;
                const dftCount = allActivities.filter(a => (a.status !== "published") && (libFilter === "All" || ACT_META[a.type].label === libFilter)).length;
                return (
                  <div className="abp-lib-tabs">
                    <button className={"abp-lib-tab pub" + (libTab === "published" ? " active" : "")} onClick={() => setLibTab("published")}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5"/></svg>
                      Published
                      <span className="abp-lib-tab-count">{pubCount}</span>
                    </button>
                    <button className={"abp-lib-tab dft" + (libTab === "draft" ? " active" : "")} onClick={() => setLibTab("draft")}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="4.5"/><path d="M6 4v2.5l1.5 1"/></svg>
                      Drafts
                      <span className="abp-lib-tab-count">{dftCount}</span>
                    </button>
                    {/* Page counter pill — matches CourseCatalog admin style */}
                    <div className={"abp-page-pill " + libTab}>
                      <span className="abp-page-pill-dot" />
                      {libTab === "published" ? pubCount : dftCount}
                      {" "}{libTab === "published" ? "published" : "draft"}{(libTab === "published" ? pubCount : dftCount) !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })()}

              {/* Swipe container */}
              {allActivities.length === 0 ? (
                <div className="abp-lib-empty">
                  <div className="abp-lib-empty-ico">🧩</div>
                  <div className="abp-lib-empty-title">No activities yet</div>
                  <div className="abp-lib-empty-sub">Switch to "Create New" to build your first activity</div>
                </div>
              ) : (
                <div className="abp-lib-swipe-wrap">
                  <div className="abp-lib-swipe-track" style={{ transform: `translateX(${libTab === "published" ? "0%" : "-100%"})` }}>

                    {/* ── PANE 1: Published ── */}
                    <div className="abp-lib-swipe-pane">
                      {(() => {
                        const pubs = allActivities.filter(a => a.status === "published" && (libFilter === "All" || ACT_META[a.type].label === libFilter));
                        return pubs.length === 0 ? (
                          <div className="abp-lib-empty-section">
                            <div className="abp-lib-empty-section-ico" style={{ background:"rgba(13,148,136,0.08)" }}>✅</div>
                            <div className="abp-lib-empty-section-title">No published activities</div>
                            <div className="abp-lib-empty-section-sub">Activities you publish will appear here.</div>
                          </div>
                        ) : (
                          <div className="abp-lib-grid">
                            {pubs.map(act => {
                              const meta = ACT_META[act.type];
                              const itemCount = getActivityItemCount(act);
                              return (
                                <div key={act.id} className="abp-lib-card" onClick={() => handleLibrarySelect(act)}>
                                  <div className="abp-lib-card-top">
                                    <div className="abp-lib-card-ico" style={{ background:meta.bg, borderColor:meta.border, color:meta.color }}>{meta.icon}</div>
                                    <div className="abp-lib-card-body">
                                      <div className="abp-lib-card-title">{act.title || "Untitled"}</div>
                                      <div className="abp-lib-card-meta">{meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}</div>
                                    </div>
                                  </div>
                                  {act.media && (
                                    <div className="abp-lib-card-media">
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2H2a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M8 1h3v3M11 1L6 6"/></svg>
                                      {act.media.name}
                                    </div>
                                  )}
                                  <div className="abp-lib-card-foot">
                                    <span className="abp-lib-status pub">published</span>
                                    <div className="abp-lib-arrow">
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 2l4 3-4 3"/></svg>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── PANE 2: Drafts ── */}
                    <div className="abp-lib-swipe-pane">
                      {(() => {
                        const drafts = allActivities.filter(a => a.status !== "published" && (libFilter === "All" || ACT_META[a.type].label === libFilter));
                        return drafts.length === 0 ? (
                          <div className="abp-lib-empty-section">
                            <div className="abp-lib-empty-section-ico" style={{ background:"rgba(217,119,6,0.08)" }}>📝</div>
                            <div className="abp-lib-empty-section-title">No drafts</div>
                            <div className="abp-lib-empty-section-sub">Activities saved as drafts will appear here.</div>
                          </div>
                        ) : (
                          <div className="abp-lib-grid">
                            {drafts.map(act => {
                              const meta = ACT_META[act.type];
                              const itemCount = getActivityItemCount(act);
                              return (
                                <div key={act.id} className="abp-lib-card" onClick={() => handleLibrarySelect(act)}>
                                  <div className="abp-lib-card-top">
                                    <div className="abp-lib-card-ico" style={{ background:meta.bg, borderColor:meta.border, color:meta.color }}>{meta.icon}</div>
                                    <div className="abp-lib-card-body">
                                      <div className="abp-lib-card-title">{act.title || "Untitled"}</div>
                                      <div className="abp-lib-card-meta">{meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}</div>
                                    </div>
                                  </div>
                                  {act.media && (
                                    <div className="abp-lib-card-media">
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2H2a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M8 1h3v3M11 1L6 6"/></svg>
                                      {act.media.name}
                                    </div>
                                  )}
                                  <div className="abp-lib-card-foot">
                                    <span className="abp-lib-status dft">draft</span>
                                    <div className="abp-lib-arrow">
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 2l4 3-4 3"/></svg>
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
                </div>
              )}
            </div>

          ) : (
            /* ── CREATE VIEW ── */
            <div className="abp-main">
              {step === 1 ? (
                <>
                  {/* Type Selection */}
                  <div className="abp-section">
                    <div className="abp-sec-hd">
                      <div className="abp-sec-ico" style={{ background:"rgba(124,58,237,0.08)", color:"var(--purple,#7c3aed)" }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                          <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                        </svg>
                      </div>
                      <span className="abp-sec-label">Activity Type</span>
                    </div>
                    <div className="abp-type-grid">
                      {ALL_TYPES.map(type => {
                        const meta = ACT_META[type];
                        return (
                          <div key={type} className={`abp-type-card${selectedType === type ? " selected" : ""}`} onClick={() => handleTypeSelect(type)}>
                            <div className="abp-type-icon" style={{ background:meta.bg, border:`1.5px solid ${meta.border}`, color:meta.color }}>{meta.icon}</div>
                            <div className="abp-type-info">
                              <div className="abp-type-label">{meta.label}</div>
                              <div className="abp-type-desc">{meta.desc}</div>
                            </div>
                            {selectedType === type && (
                              <div className="abp-type-check">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-6"/></svg>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Templates */}
                  <div className="abp-section">
                    <div className="abp-sec-hd">
                      <div className="abp-sec-ico" style={{ background:"rgba(2,132,199,0.08)", color:"#0284c7" }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 2h10l2 2v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4l2-2z"/>
                          <path d="M5 6h6M5 9h6M5 12h4"/>
                        </svg>
                      </div>
                      <span className="abp-sec-label">Quick Start Templates</span>
                    </div>
                    <div className="abp-template-list">
                      {TEMPLATES.map(template => (
                        <div key={template.id} className="abp-template-card" onClick={() => handleTemplateSelect(template)}>
                          <div className="abp-template-icon" style={{ background:ACT_META[template.type].bg, border:`1.5px solid ${ACT_META[template.type].border}`, color:ACT_META[template.type].color }}>
                            {ACT_META[template.type].icon}
                          </div>
                          <div style={{ flex:1 }}>
                            <div className="abp-template-name">{template.name}</div>
                            <div className="abp-template-desc">{template.desc}</div>
                            <div className="abp-template-tags">
                              {template.tags.map(tag => <span key={tag} className="abp-template-tag">{tag}</span>)}
                            </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="2"><path d="M5 2l5 5-5 5"/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Activity Details */}
                  <div className="abp-section">
                    <div className="abp-sec-hd">
                      <div className="abp-sec-ico" style={{ background:"rgba(124,58,237,0.08)", color:"var(--purple,#7c3aed)" }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 8h6M8 5v6"/>
                        </svg>
                      </div>
                      <span className="abp-sec-label">Activity Details</span>
                    </div>
                    <div className="field-g">
                      <label className="f-lbl">Activity Title <span style={{ color:"#dc2626" }}>*</span></label>
                      <input className="f-in" type="text" value={activity.title}
                        onChange={e => setActivity({ ...activity, title: e.target.value })}
                        placeholder="e.g. POS System Overview"
                      />
                    </div>

                    {/* Media Upload */}
                    <div className="field-g" style={{ marginBottom:0 }}>
                      <label className="f-lbl">Attach Media <span style={{ fontSize:10, fontWeight:500, color:"var(--t3)" }}>(optional)</span></label>
                      <input ref={mediaInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display:"none" }} onChange={handleMediaUpload} />

                      {activity.media ? (
                        <div className="abp-media-zone has-media">
                          <div className="abp-media-preview">
                            {activity.media.type === "image" ? <img src={activity.media.url} alt="preview" /> :
                             activity.media.type === "video" ? <span style={{ fontSize:24 }}>🎬</span> :
                             <span style={{ fontSize:24 }}>📄</span>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"var(--t1)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activity.media.name}</div>
                            <div style={{ fontSize:10, color:"var(--t3)", textTransform:"uppercase", fontWeight:600 }}>{activity.media.type}</div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <button className="btn btn-s btn-sm" onClick={() => mediaInputRef.current?.click()} disabled={mediaUploading}>Replace</button>
                            <button className="btn btn-sm" onClick={removeMedia} style={{ color:"#dc2626", borderColor:"rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)" }}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="abp-media-zone"
                          onClick={() => !mediaUploading && mediaInputRef.current?.click()}
                          style={{ cursor:mediaUploading ? "wait" : "pointer", justifyContent:"center", flexDirection:"column", textAlign:"center", padding:"20px 16px" }}>
                          {mediaUploading ? (
                            <>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth="2" style={{ animation:"spin 1s linear infinite", marginBottom:8 }}>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                              </svg>
                              <div style={{ fontSize:12, fontWeight:600, color:"var(--purple)" }}>Uploading...</div>
                            </>
                          ) : (
                            <>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5" style={{ marginBottom:8 }}>
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              <div style={{ fontSize:12, fontWeight:700, color:"var(--purple)", marginBottom:2 }}>Click to upload media</div>
                              <div style={{ fontSize:10, color:"var(--t3)" }}>Images, videos, PDFs, or documents</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Builder */}
                  <div className="abp-section grow">
                    <div className="abp-sec-hd">
                      <div className="abp-sec-ico" style={{ background:ACT_META[activity.type].bg, color:ACT_META[activity.type].color }}>
                        {ACT_META[activity.type].icon}
                      </div>
                      <span className="abp-sec-label">Content Items</span>
                      <span style={{ marginLeft:"auto", fontSize:10, color:"var(--t3)", fontWeight:500 }}>
                        {getActivityItemCount(activity)} item{getActivityItemCount(activity) === 1 ? "" : "s"}
                      </span>
                    </div>
                    {renderContentBuilder()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="abp-foot">
          <div style={{ fontSize:11, color:footerNoteColor, flex:1, fontWeight:500 }}>{footerNote}</div>
          {step === 2 && viewMode === "create" && (
            <button className="btn btn-s btn-sm" onClick={handleBack}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1L3 5l4 4"/></svg>
              Back
            </button>
          )}
          <button className="btn btn-s btn-sm" onClick={handleClose}>Cancel</button>
          {viewMode === "create" && (step === 1 ? (
            <button className="btn btn-p btn-sm" onClick={handleNext} disabled={!selectedType}>
              Next Step
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 1l4 4-4 4"/></svg>
            </button>
          ) : (
            <>
              <button className="btn btn-s btn-sm" onClick={() => handleSubmit("draft")}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M11 1H3a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 00-2-2z"/><path d="M7 11V7M7 4h.01"/>
                </svg>
                Save as Draft
              </button>
              <button className="btn btn-p btn-sm" onClick={() => handleSubmit("published")}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                Publish Activity
              </button>
            </>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Content builders ────────────────────────────────────────────────────────
  function renderContentBuilder() {
    const type = activity.type;

    if (type === "accordion") return (
      <div className="abp-item-list">
        {activity.items?.map((item, idx) => (
          <div key={idx} className="abp-item-row">
            <div className="abp-item-num">{idx + 1}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
              <input className="f-in" type="text" placeholder="Question" value={item.q}
                onChange={e => { const items = [...(activity.items||[])]; items[idx] = {...item, q:e.target.value}; setActivity({...activity, items}); }} />
              <textarea className="f-in" placeholder="Answer" rows={2} value={item.a}
                onChange={e => { const items = [...(activity.items||[])]; items[idx] = {...item, a:e.target.value}; setActivity({...activity, items}); }} />
            </div>
            {(activity.items?.length ?? 0) > 1 && (
              <button className="abp-item-del" onClick={() => setActivity({...activity, items: activity.items?.filter((_,i) => i !== idx)})}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>
        ))}
        <button className="abp-add-btn" onClick={() => setActivity({...activity, items:[...(activity.items||[]),{q:"",a:""}]})}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
          Add Question
        </button>
      </div>
    );

    if (type === "flashcard") return (
      <div className="abp-item-list">
        {activity.cards?.map((card, idx) => (
          <div key={idx} className="abp-item-row">
            <div className="abp-item-num">{idx + 1}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
              <input className="f-in" type="text" placeholder="Front of card" value={card.front}
                onChange={e => { const cards = [...(activity.cards||[])]; cards[idx] = {...card, front:e.target.value}; setActivity({...activity, cards}); }} />
              <input className="f-in" type="text" placeholder="Back of card" value={card.back}
                onChange={e => { const cards = [...(activity.cards||[])]; cards[idx] = {...card, back:e.target.value}; setActivity({...activity, cards}); }} />
            </div>
            {(activity.cards?.length ?? 0) > 1 && (
              <button className="abp-item-del" onClick={() => setActivity({...activity, cards: activity.cards?.filter((_,i) => i !== idx)})}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>
        ))}
        <button className="abp-add-btn" onClick={() => setActivity({...activity, cards:[...(activity.cards||[]),{front:"",back:""}]})}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
          Add Card
        </button>
      </div>
    );

    if (type === "checklist" || type === "hotspot") return (
      <div className="abp-item-list">
        {activity.checklist?.map((item, idx) => (
          <div key={idx} className="abp-item-row">
            <div className="abp-item-num">{idx + 1}</div>
            <input className="f-in" type="text" placeholder="Task or step description" value={item.text}
              onChange={e => { const checklist = [...(activity.checklist||[])]; checklist[idx] = {text:e.target.value}; setActivity({...activity, checklist}); }}
              style={{ flex:1 }} />
            {(activity.checklist?.length ?? 0) > 1 && (
              <button className="abp-item-del" onClick={() => setActivity({...activity, checklist: activity.checklist?.filter((_,i) => i !== idx)})}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>
        ))}
        <button className="abp-add-btn" onClick={() => setActivity({...activity, checklist:[...(activity.checklist||[]),{text:""}]})}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
          Add Item
        </button>
      </div>
    );

    if (type === "matching") return (
      <div className="abp-item-list">
        {activity.pairs?.map((pair, idx) => (
          <div key={idx} className="abp-item-row">
            <div className="abp-item-num">{idx + 1}</div>
            <div style={{ flex:1, display:"flex", gap:8 }}>
              <input className="f-in" type="text" placeholder="Left column" value={pair.left}
                onChange={e => { const pairs = [...(activity.pairs||[])]; pairs[idx] = {...pair, left:e.target.value}; setActivity({...activity, pairs}); }}
                style={{ flex:1 }} />
              <div style={{ display:"flex", alignItems:"center", color:"var(--t3)", fontSize:14 }}>↔</div>
              <input className="f-in" type="text" placeholder="Right column" value={pair.right}
                onChange={e => { const pairs = [...(activity.pairs||[])]; pairs[idx] = {...pair, right:e.target.value}; setActivity({...activity, pairs}); }}
                style={{ flex:1 }} />
            </div>
            {(activity.pairs?.length ?? 0) > 1 && (
              <button className="abp-item-del" onClick={() => setActivity({...activity, pairs: activity.pairs?.filter((_,i) => i !== idx)})}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>
        ))}
        <button className="abp-add-btn" onClick={() => setActivity({...activity, pairs:[...(activity.pairs||[]),{left:"",right:""}]})}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
          Add Pair
        </button>
      </div>
    );

    if (type === "fillblank") return (
      <div className="abp-item-list">
        {activity.questions?.map((q, idx) => (
          <div key={idx} className="abp-item-row">
            <div className="abp-item-num">{idx + 1}</div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
              <input className="f-in" type="text" placeholder="Sentence with __BLANK__ placeholder" value={q.sentence}
                onChange={e => { const questions = [...(activity.questions||[])]; questions[idx] = {...q, sentence:e.target.value}; setActivity({...activity, questions}); }} />
              <input className="f-in" type="text" placeholder="Correct answer" value={q.blanks[0] || ""}
                onChange={e => { const questions = [...(activity.questions||[])]; questions[idx] = {...q, blanks:[e.target.value]}; setActivity({...activity, questions}); }} />
            </div>
            {(activity.questions?.length ?? 0) > 1 && (
              <button className="abp-item-del" onClick={() => setActivity({...activity, questions: activity.questions?.filter((_,i) => i !== idx)})}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </button>
            )}
          </div>
        ))}
        <button className="abp-add-btn" onClick={() => setActivity({...activity, questions:[...(activity.questions||[]),{sentence:"Type a sentence with __BLANK__ here.",blanks:[""]}]})}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
          Add Question
        </button>
      </div>
    );

    return null;
  }
}

// ─── ActivityInlinePreview ────────────────────────────────────────────────────
/**
 * A compact read-only chip used inside CourseModuleModal / lesson editors
 * to show that an activity is attached to a module or lesson block.
 */
export function ActivityInlinePreview({ activity, onEdit, onRemove }: {
  activity: Activity;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const meta = ACT_META[activity.type];
  const itemCount = getActivityItemCount(activity);
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 14px", borderRadius:10,
      border:`1.5px solid ${meta.border}`,
      background: meta.bg + "66",
      transition:"all .15s",
    }}>
      <div style={{ width:36, height:36, borderRadius:9, background:meta.bg, border:`1.5px solid ${meta.border}`, color:meta.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
        {meta.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {activity.title || "Untitled Activity"}
        </div>
        <div style={{ fontSize:10.5, color:meta.color, fontWeight:600, marginTop:2 }}>
          {meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}
          {activity.status && (
            <span style={{ marginLeft:8, padding:"1px 7px", borderRadius:4, fontSize:9, fontWeight:700, textTransform:"uppercase",
              background: activity.status === "published" ? "#d1fae5" : "#fef3c7",
              color: activity.status === "published" ? "#065f46" : "#92400e",
            }}>
              {activity.status}
            </span>
          )}
        </div>
        {activity.media && (
          <div style={{ fontSize:10, color:"#0d9488", marginTop:2, fontWeight:600 }}>📎 {activity.media.name}</div>
        )}
      </div>
      {onEdit && (
        <button onClick={onEdit} style={{ padding:"5px 10px", borderRadius:7, border:`1.5px solid ${meta.border}`, background:"#fff", color:meta.color, fontSize:11, fontWeight:700, cursor:"pointer" }}>
          Edit
        </button>
      )}
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
    const updated = [...blocks];
    updated[idx] = { ...updated[idx], ...updates };
    onChange(updated);
  };
  const deleteBlock = (idx: number) => onChange(blocks.filter((_, i) => i !== idx));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {blocks.map((block, idx) => (
        <div key={block.id} style={{ padding:14, borderRadius:10, background:"var(--bg,#faf9ff)", border:"1.5px solid var(--border,rgba(124,58,237,0.1))" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background: block.kind === "content" ? "linear-gradient(135deg,#0284c7,#0d9488)" : "linear-gradient(135deg,#7c3aed,#d97706)", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {idx + 1}
            </div>
            <div style={{ fontSize:11.5, fontWeight:700, color:"var(--t2,#4a3870)", textTransform:"uppercase", letterSpacing:".05em", flex:1 }}>
              {block.kind === "content" ? "📝 Content Block" : `🧩 Activity`}
            </div>
            <button onClick={() => deleteBlock(idx)} style={{ width:28, height:28, borderRadius:7, border:"1.5px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          </div>

          {block.kind === "content" ? (
            <textarea value={block.body || ""} onChange={e => updateBlock(idx, { body: e.target.value })} placeholder="Enter content text..."
              style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid var(--border,rgba(109,40,217,0.1))", background:"var(--surface,#fff)", color:"var(--t1,#18103a)", fontSize:12.5, fontFamily:"inherit", resize:"vertical", minHeight:80, lineHeight:1.5 }} />
          ) : block.activity ? (
            // FIX: render the full ActivityInlinePreview instead of a plain text div
            <ActivityInlinePreview
              activity={block.activity}
              onEdit={onEditActivity ? () => onEditActivity(block.activity!, block.id) : undefined}
              onRemove={() => updateBlock(idx, { activity: undefined, kind: "content", body: "" })}
            />
          ) : (
            <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(124,58,237,0.04)", border:"1.5px solid rgba(124,58,237,0.12)", fontSize:12, color:"var(--t3,#a89dc8)" }}>
              No activity attached
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
