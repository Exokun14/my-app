'use client'

/**
 * ActivityManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A full-page Activity Builder, Template Manager, and Activity Library.
 * Separates activity creation from CourseModuleModal entirely.
 *
 * Features:
 *  • Drag-to-build activity workspace
 *  • 6 activity types with rich inline editors
 *  • Pre-built templates (read-only) + custom template creation
 *  • Personal activity library (save/reuse across courses)
 *  • Demo activities pre-seeded
 *  • Preview mode (renders the real student-facing UI)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SegmentType = "accordion" | "flashcard" | "fillblank" | "checklist" | "matching" | "hotspot";

export interface AccordionItem { q: string; a: string; }
export interface FlashCard     { front: string; back: string; }
export interface FillBlankQ    { sentence: string; blanks: string[]; }
export interface ChecklistItem { text: string; }
export interface MatchPair     { left: string; right: string; }

export interface Activity {
  id:          string;
  type:        SegmentType;
  title:       string;
  items?:      AccordionItem[];
  cards?:      FlashCard[];
  questions?:  FillBlankQ[];
  checklist?:  ChecklistItem[];
  pairs?:      MatchPair[];
}

export interface ActivityTemplate {
  id:          string;
  name:        string;
  description: string;
  type:        SegmentType;
  isBuiltIn:   boolean;
  tags:        string[];
  activity:    Activity;   // prefilled demo content
}

interface Props {
  /** Activities already attached to a chapter (optional – standalone page mode if omitted) */
  initialActivities?: Activity[];
  /** Called when user clicks "Done / Add to Chapter" */
  onSave?: (activities: Activity[]) => void;
  onClose?: () => void;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────
const TYPE_META: Record<SegmentType, { icon: string; label: string; color: string; bg: string; desc: string; hint: string }> = {
  accordion: { icon: "🗂️", label: "Accordion",    color: "#0284c7", bg: "#e0f2fe", desc: "Expandable Q&A sections",         hint: "Great for FAQs and glossaries" },
  flashcard: { icon: "🃏", label: "Flashcards",   color: "#7c3aed", bg: "#ede9fe", desc: "Flip-card memory drill",          hint: "Great for vocabulary and key terms" },
  fillblank: { icon: "✏️", label: "Fill in Blank",color: "#0f766e", bg: "#ccfbf1", desc: "Sentence completion exercise",    hint: "Great for recall and procedure steps" },
  checklist: { icon: "☑️", label: "Checklist",    color: "#15803d", bg: "#dcfce7", desc: "Step-by-step checklist",          hint: "Great for procedures and SOPs" },
  matching:  { icon: "🔗", label: "Matching",     color: "#9333ea", bg: "#f3e8ff", desc: "Match two-column pairs",          hint: "Great for definitions and associations" },
  hotspot:   { icon: "🎯", label: "Hotspot Task", color: "#d97706", bg: "#fef3c7", desc: "Interactive task list",           hint: "Great for walkthroughs and checklists" },
};

function mkId() { return Math.random().toString(36).slice(2, 9); }
function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

// ─── Demo Templates (built-in) ────────────────────────────────────────────────
const BUILTIN_TEMPLATES: ActivityTemplate[] = [
  {
    id: "tpl-acc-1", name: "POS Key Terms",
    description: "Expandable glossary of common POS terminology",
    type: "accordion", isBuiltIn: true, tags: ["POS","Glossary","Beginner"],
    activity: {
      id: mkId(), type: "accordion", title: "POS Key Terms",
      items: [
        { q: "What is a POS System?", a: "A Point of Sale system is hardware + software used to process customer transactions where a sale is made." },
        { q: "What is a PED?", a: "A PIN Entry Device — the card reader customers use to enter their PIN for debit/credit transactions." },
        { q: "What is an EOD Report?", a: "End-of-Day report — a summary of all transactions processed during a shift, used for cash reconciliation." },
        { q: "What is a void transaction?", a: "A cancelled transaction before it is finalised. Requires supervisor approval in most systems." },
      ],
    },
  },
  {
    id: "tpl-flash-1", name: "Hardware Flashcards",
    description: "Flip-cards for memorising POS hardware components",
    type: "flashcard", isBuiltIn: true, tags: ["POS","Hardware","Memory"],
    activity: {
      id: mkId(), type: "flashcard", title: "POS Hardware Flashcards",
      cards: [
        { front: "Touchscreen Terminal",     back: "The primary cashier interface — all orders are entered by tapping the screen." },
        { front: "Thermal Receipt Printer",  back: "Uses heat (not ink) to print receipts. Faster and lower maintenance than inkjet." },
        { front: "Cash Drawer",              back: "Locked drawer connected to the POS. Opens automatically only on cash transactions." },
        { front: "Barcode Scanner",          back: "Reads product barcodes to auto-populate item price and description." },
      ],
    },
  },
  {
    id: "tpl-fill-1", name: "Transaction Fill-in-Blank",
    description: "Test recall of transaction processing steps",
    type: "fillblank", isBuiltIn: true, tags: ["Transactions","Recall","Assessment"],
    activity: {
      id: mkId(), type: "fillblank", title: "Transaction Procedures",
      questions: [
        { sentence: "For cash payments, enter the __BLANK__ amount and the system calculates change.", blanks: ["tendered"] },
        { sentence: "Always obtain __BLANK__ approval before voiding any transaction.", blanks: ["supervisor","manager"] },
        { sentence: "A refund must be issued to the customer's __BLANK__ payment method.", blanks: ["original"] },
      ],
    },
  },
  {
    id: "tpl-check-1", name: "Opening Shift Checklist",
    description: "Step-by-step morning opening procedure",
    type: "checklist", isBuiltIn: true, tags: ["Operations","SOP","Checklist"],
    activity: {
      id: mkId(), type: "checklist", title: "Opening Shift Checklist",
      checklist: [
        { text: "Verify cash float matches the opening amount" },
        { text: "Power on POS terminal and confirm it connects to the server" },
        { text: "Test the barcode scanner and receipt printer" },
        { text: "Check that the card reader (PED) is online and responsive" },
        { text: "Confirm the date and time are correct on the terminal" },
        { text: "Log in with your personal employee credentials" },
      ],
    },
  },
  {
    id: "tpl-match-1", name: "Hardware Matching",
    description: "Match hardware names to their functions",
    type: "matching", isBuiltIn: true, tags: ["POS","Hardware","Quiz"],
    activity: {
      id: mkId(), type: "matching", title: "Match the Hardware",
      pairs: [
        { left: "Touchscreen", right: "Main cashier input interface" },
        { left: "Barcode Scanner", right: "Reads product codes" },
        { left: "PED / Card Reader", right: "Processes card payments" },
        { left: "Cash Drawer", right: "Stores physical currency" },
        { left: "Receipt Printer", right: "Outputs customer receipts" },
      ],
    },
  },
  {
    id: "tpl-hot-1", name: "End-of-Day Procedure",
    description: "Interactive walkthrough of EOD closing steps",
    type: "hotspot", isBuiltIn: true, tags: ["Operations","EOD","Closing"],
    activity: {
      id: mkId(), type: "hotspot", title: "End-of-Day Procedure",
      checklist: [
        { text: "Run the End-of-Day (EOD) report from the manager dashboard" },
        { text: "Count physical cash and compare to the POS total" },
        { text: "Investigate and document any discrepancies" },
        { text: "Secure cash in the safe and note the amount" },
        { text: "Log out all cashier sessions" },
        { text: "Back up the day's transaction data if required" },
        { text: "Power down terminals and peripherals" },
      ],
    },
  },
  {
    id: "tpl-fill-2", name: "Security Fill-in-Blank",
    description: "Test knowledge of cybersecurity best practices",
    type: "fillblank", isBuiltIn: true, tags: ["Security","Recall"],
    activity: {
      id: mkId(), type: "fillblank", title: "Security Best Practices",
      questions: [
        { sentence: "You should never share your __BLANK__ with colleagues.", blanks: ["password","credentials"] },
        { sentence: "Always lock your workstation when stepping __BLANK__ from your desk.", blanks: ["away"] },
        { sentence: "Suspicious emails asking for credentials are called __BLANK__ attempts.", blanks: ["phishing"] },
      ],
    },
  },
  {
    id: "tpl-match-2", name: "Customer Service Matching",
    description: "Match customer situations to the correct response",
    type: "matching", isBuiltIn: true, tags: ["Customer Service","Management"],
    activity: {
      id: mkId(), type: "matching", title: "Customer Situation Responses",
      pairs: [
        { left: "Customer requests a refund",         right: "Verify original receipt, process to original payment" },
        { left: "Customer complains about wait time",  right: "Acknowledge, apologise, and offer resolution" },
        { left: "Item is out of stock",                right: "Offer alternative or check other branches" },
        { left: "Customer disputes charge",            right: "Review transaction history with manager" },
      ],
    },
  },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.am-root {
  font-family: 'DM Sans', sans-serif;
  --c-purple: #6d28d9;
  --c-teal: #0d9488;
  --c-ink: #0f0a2a;
  --c-muted: #7c65a8;
  --c-border: rgba(109,40,217,0.1);
  --c-bg: #f6f4ff;
  --c-white: #ffffff;
  --c-card: #ffffff;
}

.am-root * { font-family: 'DM Sans', sans-serif; }

.am-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
.am-scroll::-webkit-scrollbar-track { background: transparent; }
.am-scroll::-webkit-scrollbar-thumb { background: rgba(109,40,217,0.18); border-radius: 10px; }

/* Type card in picker */
.am-type-card {
  border-radius: 14px;
  border: 2px solid transparent;
  padding: 16px 14px;
  cursor: pointer;
  transition: all .18s cubic-bezier(0.16,1,0.3,1);
  user-select: none;
  position: relative;
  overflow: hidden;
}
.am-type-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity .18s;
  background: linear-gradient(135deg, rgba(109,40,217,0.06), rgba(13,148,136,0.06));
}
.am-type-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(109,40,217,0.14); }
.am-type-card:hover::before { opacity: 1; }
.am-type-card.selected { border-color: var(--c-purple) !important; box-shadow: 0 0 0 4px rgba(109,40,217,0.1); }

/* Template card */
.am-tpl-card {
  border-radius: 14px; border: 1px solid var(--c-border);
  background: #fff; cursor: pointer;
  transition: all .18s cubic-bezier(0.16,1,0.3,1);
  overflow: hidden;
}
.am-tpl-card:hover { transform: translateY(-4px); box-shadow: 0 14px 40px rgba(109,40,217,0.14); border-color: rgba(109,40,217,0.3); }
.am-tpl-card.selected { border-color: var(--c-purple); box-shadow: 0 0 0 3px rgba(109,40,217,0.15), 0 10px 30px rgba(109,40,217,0.15); }

/* Library card */
.am-lib-card { border-radius: 12px; border: 1px solid var(--c-border); background: #fff; transition: all .14s; }
.am-lib-card:hover { border-color: rgba(109,40,217,0.25); box-shadow: 0 4px 18px rgba(109,40,217,0.09); }

/* Workspace */
.am-activity-block { border-radius: 14px; border: 1.5px solid rgba(109,40,217,0.1); overflow: hidden; transition: box-shadow .14s; }
.am-activity-block:hover { box-shadow: 0 4px 20px rgba(109,40,217,0.1); }

/* Buttons */
.am-btn-primary {
  padding: 10px 22px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #6d28d9, #0d9488);
  color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform .13s, box-shadow .13s, filter .13s;
  font-family: 'DM Sans', sans-serif;
}
.am-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(109,40,217,0.35); filter: brightness(1.07); }
.am-btn-primary:active { transform: scale(0.97); }
.am-btn-primary:disabled { background: #e2dff5; color: #a89dc8; cursor: not-allowed; transform: none; box-shadow: none; filter: none; }

.am-btn-ghost {
  padding: 8px 18px; border-radius: 9px;
  border: 1.5px solid rgba(109,40,217,0.18); background: #fff;
  color: #6d28d9; font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: all .13s; font-family: 'DM Sans', sans-serif;
}
.am-btn-ghost:hover { background: #f5f3ff; border-color: rgba(109,40,217,0.4); }

.am-btn-danger {
  width: 28px; height: 28px; border-radius: 8px;
  border: none; background: #fee2e2; color: #dc2626;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .12s;
}
.am-btn-danger:hover { background: #fca5a5; transform: scale(1.08); }

/* Input */
.am-input {
  width: 100%; border: 1.5px solid rgba(109,40,217,0.14); border-radius: 9px;
  padding: 8px 12px; font-size: 13px; background: #faf9ff; outline: none;
  color: #0f0a2a; font-family: 'DM Sans', sans-serif; transition: border-color .14s;
}
.am-input:focus { border-color: rgba(109,40,217,0.45); background: #fff; }
.am-input::placeholder { color: #b8afd4; }

.am-label {
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: #8e7ec0; display: block; margin-bottom: 5px;
}

/* Tabs */
.am-tab {
  padding: 10px 18px; background: transparent; border: none;
  border-bottom: 2.5px solid transparent;
  color: #a89dc8; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all .14s; display: flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; white-space: nowrap;
}
.am-tab.active { color: #6d28d9; border-bottom-color: #6d28d9; font-weight: 700; }
.am-tab:hover:not(.active) { color: #6d28d9; background: rgba(109,40,217,0.04); }

/* Tag pill */
.am-tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600;
  background: rgba(109,40,217,0.08); color: #6d28d9; cursor: pointer;
  border: 1px solid transparent; transition: all .12s; user-select: none;
}
.am-tag.on { background: #6d28d9; color: #fff; }
.am-tag:hover:not(.on) { border-color: rgba(109,40,217,0.3); }

/* Drag row */
.am-drag-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 9px; background: #fff;
  border: 1px solid rgba(109,40,217,0.09); transition: box-shadow .12s;
}
.am-drag-row:hover { box-shadow: 0 2px 12px rgba(109,40,217,0.1); }

/* Preview */
.am-preview-card { background: #fff; border: 1px solid rgba(109,40,217,0.12); border-radius: 14px; overflow: hidden; }

/* Animations */
@keyframes am-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes am-slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
@keyframes am-popIn { 0%{opacity:0;transform:scale(0.8)} 60%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
@keyframes am-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }

.am-fade-up { animation: am-fadeUp .28s cubic-bezier(0.16,1,0.3,1) both; }
.am-slide-in { animation: am-slideIn .22s ease both; }

/* Flip card */
.am-card-scene { perspective: 800px; }
.am-card-inner { position:relative;width:100%;height:100%;transition:transform .55s cubic-bezier(0.4,0.2,0.2,1);transform-style:preserve-3d; }
.am-card-inner.flipped { transform:rotateY(180deg); }
.am-card-face { position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:12px;display:flex;align-items:center;justify-content:center;padding:20px; }
.am-card-back { transform:rotateY(180deg); }

/* Match button */
.am-match-btn { transition: all .14s; }
.am-match-btn:hover:not(:disabled) { transform: scale(1.03); }

/* Checklist item */
.am-check-item { transition: all .14s; cursor: pointer; }
.am-check-item:hover { background: rgba(21,128,61,0.04) !important; }

/* Tooltip */
.am-tooltip { position: relative; }
.am-tooltip::after {
  content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%); background: rgba(15,10,42,0.88); color: #fff;
  font-size: 10.5px; padding: 5px 10px; border-radius: 7px; white-space: nowrap;
  pointer-events: none; opacity: 0; transition: opacity .14s; font-family: 'DM Sans', sans-serif;
}
.am-tooltip:hover::after { opacity: 1; }

/* Badge */
.am-badge {
  display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px;
  font-size: 9.5px; font-weight: 700; letter-spacing: .05em;
}

/* Drop zone */
.am-drop-zone {
  border: 2px dashed rgba(109,40,217,0.2); border-radius: 14px;
  padding: 32px 20px; text-align: center; background: rgba(109,40,217,0.02);
  transition: all .18s;
}
.am-drop-zone.over { border-color: rgba(109,40,217,0.5); background: rgba(109,40,217,0.06); }

.am-section-title {
  font-family: 'Syne', sans-serif;
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: #8e7ec0; margin-bottom: 12px;
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function blankActivity(type: SegmentType): Activity {
  const base = { id: mkId(), type, title: "" };
  switch (type) {
    case "accordion": return { ...base, items:     [{ q: "", a: "" }] };
    case "flashcard": return { ...base, cards:     [{ front: "", back: "" }] };
    case "fillblank": return { ...base, questions: [{ sentence: "Type sentence with __BLANK__ here.", blanks: [""] }] };
    case "checklist":
    case "hotspot":   return { ...base, checklist: [{ text: "" }] };
    case "matching":  return { ...base, pairs:     [{ left: "", right: "" }] };
  }
}

// ─── Small shared input ───────────────────────────────────────────────────────
const IN: React.CSSProperties = {
  width: "100%", border: "1.5px solid rgba(109,40,217,0.14)", borderRadius: 9,
  padding: "8px 12px", fontSize: 13, background: "#faf9ff", outline: "none",
  color: "#0f0a2a", fontFamily: "inherit",
};

// ══════════════════════════════════════════════════════════════════════════════
// EDITOR COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function AccordionEditor({ act, onChange }: { act: Activity; onChange: (a: Activity) => void }) {
  const items = act.items ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid rgba(2,132,199,0.12)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "#e0f2fe", color: "#0284c7", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>Q{i+1}</div>
            <input value={item.q} onChange={e => { const u = dc(items); u[i].q = e.target.value; onChange({ ...act, items: u }); }}
              placeholder="Question / heading text…" className="am-input" style={{ flex: 1 }} />
            <button className="am-btn-danger" onClick={() => onChange({ ...act, items: items.filter((_, j) => j !== i) })}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
            </button>
          </div>
          <textarea value={item.a} onChange={e => { const u = dc(items); u[i].a = e.target.value; onChange({ ...act, items: u }); }}
            placeholder="Answer / content shown when expanded…" rows={2}
            style={{ ...IN, resize: "vertical", fontSize: 12.5, lineHeight: 1.55 }} />
        </div>
      ))}
      <button onClick={() => onChange({ ...act, items: [...items, { q: "", a: "" }] })}
        style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px dashed rgba(2,132,199,0.3)", background: "#f0f9ff", color: "#0284c7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        + Add Item
      </button>
    </div>
  );
}

function FlashcardEditor({ act, onChange }: { act: Activity; onChange: (a: Activity) => void }) {
  const cards = act.cards ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.1)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="am-label" style={{ color: "#7c3aed" }}>Front</label>
            <input value={c.front} onChange={e => { const u = dc(cards); u[i].front = e.target.value; onChange({ ...act, cards: u }); }}
              placeholder="Front of card…" className="am-input" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="am-label" style={{ color: "#0d9488" }}>Back</label>
            <input value={c.back} onChange={e => { const u = dc(cards); u[i].back = e.target.value; onChange({ ...act, cards: u }); }}
              placeholder="Back of card…" className="am-input" />
          </div>
          <button className="am-btn-danger" style={{ alignSelf: "flex-end", marginBottom: 2 }}
            onClick={() => onChange({ ...act, cards: cards.filter((_, j) => j !== i) })}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => onChange({ ...act, cards: [...cards, { front: "", back: "" }] })}
        style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px dashed rgba(124,58,237,0.3)", background: "#f5f3ff", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        + Add Card
      </button>
    </div>
  );
}

function FillBlankEditor({ act, onChange }: { act: Activity; onChange: (a: Activity) => void }) {
  const qs = act.questions ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11.5, color: "#7c65a8", background: "#f0f9ff", borderRadius: 10, padding: "8px 12px", lineHeight: 1.6 }}>
        💡 Use <code style={{ background: "rgba(15,118,110,0.12)", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>__BLANK__</code> in your sentence where students type. Separate multiple correct answers with <strong>|</strong>
      </div>
      {qs.map((q, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid rgba(15,118,110,0.12)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "#ccfbf1", color: "#0f766e", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>Q{i+1}</div>
            <input value={q.sentence} onChange={e => { const u = dc(qs); u[i].sentence = e.target.value; onChange({ ...act, questions: u }); }}
              placeholder='e.g. "The cash drawer opens __BLANK__ automatically."' className="am-input" style={{ flex: 1 }} />
            <button className="am-btn-danger" onClick={() => onChange({ ...act, questions: qs.filter((_, j) => j !== i) })}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
            </button>
          </div>
          <div>
            <label className="am-label">Correct answer(s) — separate with |</label>
            <input value={q.blanks.join("|")} onChange={e => { const u = dc(qs); u[i].blanks = e.target.value.split("|").map(s => s.trim()); onChange({ ...act, questions: u }); }}
              placeholder='e.g. "only | automatically"' className="am-input" />
          </div>
        </div>
      ))}
      <button onClick={() => onChange({ ...act, questions: [...qs, { sentence: "__BLANK__", blanks: [""] }] })}
        style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px dashed rgba(15,118,110,0.3)", background: "#f0fdf9", color: "#0f766e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        + Add Question
      </button>
    </div>
  );
}

function ChecklistEditor({ act, onChange }: { act: Activity; onChange: (a: Activity) => void }) {
  const items = act.checklist ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} className="am-drag-row">
          <span style={{ fontSize: 13, color: "#15803d", flexShrink: 0 }}>☑</span>
          <input value={item.text} onChange={e => { const u = dc(items); u[i].text = e.target.value; onChange({ ...act, checklist: u }); }}
            placeholder={`Step ${i+1}…`} className="am-input" style={{ flex: 1, padding: "5px 10px" }} />
          <button className="am-btn-danger" style={{ width: 24, height: 24 }}
            onClick={() => onChange({ ...act, checklist: items.filter((_, j) => j !== i) })}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => onChange({ ...act, checklist: [...items, { text: "" }] })}
        style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px dashed rgba(21,128,61,0.3)", background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        + Add Item
      </button>
    </div>
  );
}

function MatchingEditor({ act, onChange }: { act: Activity; onChange: (a: Activity) => void }) {
  const pairs = act.pairs ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, fontSize: 10, fontWeight: 700, color: "#8e7ec0", letterSpacing: ".08em", textTransform: "uppercase" as const, padding: "0 4px 4px" }}>
        <span>Left side</span><span>Right side</span><span/>
      </div>
      {pairs.map((p, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
          <input value={p.left} onChange={e => { const u = dc(pairs); u[i].left = e.target.value; onChange({ ...act, pairs: u }); }}
            placeholder="Left item…" className="am-input" />
          <input value={p.right} onChange={e => { const u = dc(pairs); u[i].right = e.target.value; onChange({ ...act, pairs: u }); }}
            placeholder="Right match…" className="am-input" />
          <button className="am-btn-danger"
            onClick={() => onChange({ ...act, pairs: pairs.filter((_, j) => j !== i) })}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => onChange({ ...act, pairs: [...pairs, { left: "", right: "" }] })}
        style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px dashed rgba(147,51,234,0.3)", background: "#faf5ff", color: "#9333ea", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        + Add Pair
      </button>
    </div>
  );
}

function ActivityEditor({ act, onChange, onDelete, onSaveAsTemplate }: {
  act: Activity;
  onChange: (a: Activity) => void;
  onDelete: () => void;
  onSaveAsTemplate: (a: Activity) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = TYPE_META[act.type];
  return (
    <div className="am-activity-block am-fade-up" style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{ background: meta.bg, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        onClick={() => setExpanded(v => !v)}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <input value={act.title}
          onChange={e => { e.stopPropagation(); onChange({ ...act, title: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder={`${meta.label} title…`}
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: meta.color, outline: "none", fontFamily: "inherit" }}
        />
        <span className="am-badge" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
        <button className="am-tooltip" data-tip="Save as template"
          onClick={e => { e.stopPropagation(); onSaveAsTemplate(act); }}
          style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.7)", color: meta.color, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          💾
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(220,38,38,0.12)", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M8 1L1 9"/></svg>
        </button>
        <svg width="10" height="7" viewBox="0 0 10 7" fill={meta.color} style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </div>
      {/* Body */}
      {expanded && (
        <div style={{ padding: "16px 16px", background: "#faf9ff" }}>
          {act.type === "accordion" && <AccordionEditor act={act} onChange={onChange} />}
          {act.type === "flashcard" && <FlashcardEditor act={act} onChange={onChange} />}
          {act.type === "fillblank" && <FillBlankEditor act={act} onChange={onChange} />}
          {(act.type === "checklist" || act.type === "hotspot") && <ChecklistEditor act={act} onChange={onChange} />}
          {act.type === "matching"  && <MatchingEditor  act={act} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREVIEW COMPONENTS (student-facing)
// ══════════════════════════════════════════════════════════════════════════════

function PreviewAccordion({ act }: { act: Activity }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = act.items ?? [];
  const meta = TYPE_META.accordion;
  return (
    <div className="am-preview-card">
      <div style={{ padding: "12px 16px", background: meta.bg, borderBottom: `1px solid ${meta.color}18`, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{meta.icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: meta.color }}>{act.title || "Accordion"}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#a89dc8" }}>{items.length} items</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${meta.color}10` : "none" }}>
          <div onClick={() => setOpen(open === i ? null : i)}
            style={{ padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: open === i ? meta.bg : "transparent" }}>
            <span style={{ fontSize: 11 }}>❓</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0c4a6e" }}>{item.q || "Question…"}</span>
            <svg width="9" height="6" viewBox="0 0 10 7" fill={meta.color} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M1 1l4 4 4-4"/></svg>
          </div>
          {open === i && <div style={{ padding: "0 16px 14px 40px", fontSize: 13, color: "#2d4a6a", lineHeight: 1.7 }}>{item.a || "Answer…"}</div>}
        </div>
      ))}
    </div>
  );
}

function PreviewFlashcards({ act }: { act: Activity }) {
  const cards = act.cards ?? [];
  const [cur, setCur] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return null;
  const card = cards[cur];
  const next = () => { setFlipped(false); setTimeout(() => setCur(i => (i + 1) % cards.length), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setCur(i => (i - 1 + cards.length) % cards.length), 150); };
  return (
    <div className="am-preview-card">
      <div style={{ padding: "12px 16px", background: "#f5f3ff", borderBottom: "1px solid rgba(124,58,237,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>🃏</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#7c3aed" }}>{act.title || "Flashcards"}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#a89dc8" }}>{cur+1} / {cards.length}</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div className="am-card-scene" style={{ height: 130, marginBottom: 14 }} onClick={() => setFlipped(v => !v)}>
          <div className={`am-card-inner${flipped ? " flipped" : ""}`} style={{ height: "100%", cursor: "pointer" }}>
            <div className="am-card-face" style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", borderRadius: 12, boxShadow: "0 4px 18px rgba(124,58,237,0.28)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Front — tap to flip</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>{card.front || "Front…"}</div>
              </div>
            </div>
            <div className="am-card-face am-card-back" style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)", borderRadius: 12, boxShadow: "0 4px 18px rgba(13,148,136,0.28)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 6 }}>Back</div>
                <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.55 }}>{card.back || "Back…"}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prev} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.2)", background: "#fff", color: "#7c3aed", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>← Prev</button>
          <div style={{ flex: 1, height: 3, background: "#e9e6f8", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((cur+1)/cards.length)*100}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius: 3, transition: "width .3s" }} />
          </div>
          <button onClick={next} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function PreviewFillBlank({ act }: { act: Activity }) {
  const qs = act.questions ?? [];
  const [inputs, setInputs] = useState<string[]>(qs.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const check = (qi: number) => qs[qi]?.blanks?.some(b => b.trim().toLowerCase() === inputs[qi]?.trim().toLowerCase()) ?? false;
  return (
    <div className="am-preview-card">
      <div style={{ padding: "12px 16px", background: "#f0fdf9", borderBottom: "1px solid rgba(15,118,110,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>✏️</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f766e" }}>{act.title || "Fill in the Blanks"}</span>
      </div>
      <div style={{ padding: "16px" }}>
        {qs.map((q, qi) => {
          const parts = q.sentence.split("__BLANK__");
          const correct = submitted ? check(qi) : null;
          return (
            <div key={qi} style={{ marginBottom: qi < qs.length - 1 ? 14 : 0 }}>
              <div style={{ fontSize: 13.5, color: "#0c4a6e", lineHeight: 1.7, display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 4 }}>
                {parts.map((part, pi) => (
                  <span key={pi} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {part}
                    {pi < parts.length - 1 && (
                      <input value={inputs[qi] ?? ""} onChange={e => { const u = [...inputs]; u[qi] = e.target.value; setInputs(u); }}
                        disabled={submitted} placeholder="___"
                        style={{ width: 110, border: `2px solid ${submitted ? (correct ? "rgba(22,163,74,0.6)" : "rgba(220,38,38,0.6)") : "rgba(15,118,110,0.3)"}`, borderRadius: 7, padding: "3px 8px", fontSize: 13, background: submitted ? (correct ? "#f0fdf4" : "#fff5f5") : "#fff", outline: "none", color: "#0c4a6e", fontFamily: "inherit", textAlign: "center" as const }} />
                    )}
                  </span>
                ))}
                {submitted && <span style={{ fontSize: 11.5, fontWeight: 700, color: correct ? "#15803d" : "#dc2626" }}>{correct ? "✓" : `✗ ${q.blanks[0]}`}</span>}
              </div>
            </div>
          );
        })}
        {!submitted
          ? <button onClick={() => setSubmitted(true)} style={{ marginTop: 12, padding: "7px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0f766e,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Check Answers →</button>
          : <button onClick={() => { setInputs(qs.map(() => "")); setSubmitted(false); }} style={{ marginTop: 12, padding: "7px 18px", borderRadius: 9, border: "1px solid rgba(15,118,110,0.25)", background: "#f0fdf9", color: "#0f766e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Try Again</button>
        }
      </div>
    </div>
  );
}

function PreviewChecklist({ act }: { act: Activity }) {
  const items = act.checklist ?? [];
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const done = checked.filter(Boolean).length;
  return (
    <div className="am-preview-card">
      <div style={{ padding: "12px 16px", background: "#f0fdf4", borderBottom: "1px solid rgba(21,128,61,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>☑️</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>{act.title || "Checklist"}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: done === items.length ? "#15803d" : "#a89dc8", fontWeight: done === items.length ? 700 : 400 }}>{done === items.length ? "✅ All done!" : `${done}/${items.length}`}</span>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} className="am-check-item"
            onClick={() => { const u = [...checked]; u[i] = !u[i]; setChecked(u); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: checked[i] ? "#f0fdf4" : "#faf9ff", border: `1px solid ${checked[i] ? "rgba(21,128,61,0.2)" : "rgba(109,40,217,0.08)"}` }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked[i] ? "#15803d" : "rgba(109,40,217,0.25)"}`, background: checked[i] ? "#15803d" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .18s" }}>
              {checked[i] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2"><path d="M1 4l3 3 5-6"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: checked[i] ? "#15803d" : "#18103a", textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.7 : 1, transition: "all .15s" }}>{item.text || "Step…"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewMatching({ act }: { act: Activity }) {
  const pairs = act.pairs ?? [];
  const [selected, setSelected] = useState<{ side: "left"|"right"; idx: number } | null>(null);
  const [matched, setMatched] = useState<[number,number][]>([]);
  const [wrong, setWrong] = useState<[number,number] | null>(null);
  const rightOrder = useRef([...Array(pairs.length).keys()].sort(() => Math.random() - 0.5)).current;
  const isML = (i: number) => matched.some(([l]) => l === i);
  const isMR = (i: number) => matched.some(([,r]) => r === i);
  const allDone = matched.length === pairs.length && pairs.length > 0;
  const handleLeft = (i: number) => {
    if (isML(i)) return;
    if (selected?.side === "right") { const ri = selected.idx; if (rightOrder[ri] === i) setMatched(m => [...m, [i, ri]]); else { setWrong([i, ri]); setTimeout(() => setWrong(null), 700); } setSelected(null); }
    else setSelected({ side: "left", idx: i });
  };
  const handleRight = (i: number) => {
    if (isMR(i)) return;
    if (selected?.side === "left") { const li = selected.idx; if (rightOrder[i] === li) setMatched(m => [...m, [li, i]]); else { setWrong([li, i]); setTimeout(() => setWrong(null), 700); } setSelected(null); }
    else setSelected({ side: "right", idx: i });
  };
  const btnS = (side: "left"|"right", idx: number): React.CSSProperties => {
    const ml = side==="left"&&isML(idx), mr = side==="right"&&isMR(idx);
    const sel = selected?.side===side&&selected?.idx===idx;
    const bad = wrong && ((side==="left"&&wrong[0]===idx)||(side==="right"&&wrong[1]===idx));
    return { padding: "8px 12px", borderRadius: 10, border: `2px solid ${ml||mr?"rgba(21,128,61,0.4)":bad?"rgba(220,38,38,0.5)":sel?"rgba(124,58,237,0.5)":"rgba(109,40,217,0.12)"}`, background: ml||mr?"#dcfce7":bad?"#fee2e2":sel?"#ede9fe":"#fff", color: ml||mr?"#15803d":bad?"#dc2626":sel?"#6d28d9":"#18103a", fontSize: 12.5, fontWeight: 600, cursor: ml||mr?"default":"pointer", textAlign: "left" as const, opacity: ml||mr?0.7:1, transition: "all .15s", width: "100%", fontFamily: "inherit" };
  };
  return (
    <div className="am-preview-card">
      <div style={{ padding: "12px 16px", background: "#faf5ff", borderBottom: "1px solid rgba(147,51,234,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>🔗</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9333ea" }}>{act.title || "Matching"}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: allDone ? "#15803d" : "#a89dc8", fontWeight: allDone ? 700 : 400 }}>{allDone ? "🎉 Done!" : `${matched.length}/${pairs.length}`}</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pairs.map((p, i) => <button key={i} className="am-match-btn" onClick={() => handleLeft(i)} disabled={isML(i)} style={btnS("left", i)}>{p.left||"Left…"}</button>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rightOrder.map((origIdx, ri) => <button key={ri} className="am-match-btn" onClick={() => handleRight(ri)} disabled={isMR(ri)} style={btnS("right", ri)}>{pairs[origIdx].right||"Right…"}</button>)}
          </div>
        </div>
        {allDone && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: "#15803d" }}>✅ All pairs matched!</div>}
      </div>
    </div>
  );
}

function ActivityPreview({ act }: { act: Activity }) {
  switch (act.type) {
    case "accordion": return <PreviewAccordion act={act} />;
    case "flashcard": return <PreviewFlashcards act={act} />;
    case "fillblank": return <PreviewFillBlank act={act} />;
    case "checklist":
    case "hotspot":   return <PreviewChecklist act={act} />;
    case "matching":  return <PreviewMatching act={act} />;
    default: return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SAVE AS TEMPLATE MODAL
// ══════════════════════════════════════════════════════════════════════════════

function SaveTemplateModal({ act, onSave, onClose }: {
  act: Activity;
  onSave: (tpl: ActivityTemplate) => void;
  onClose: () => void;
}) {
  const meta = TYPE_META[act.type];
  const [name, setName] = useState(act.title || "");
  const [desc, setDesc] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([act.type.charAt(0).toUpperCase() + act.type.slice(1)]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: mkId(), name: name.trim(), description: desc.trim(),
      type: act.type, isBuiltIn: false, tags,
      activity: { ...dc(act), id: mkId() },
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,4,24,0.6)", backdropFilter: "blur(10px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "min(100%,480px)", padding: 28, boxShadow: "0 32px 80px rgba(8,4,24,0.25)", animation: "am-popIn .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{meta.icon}</div>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#0f0a2a" }}>Save as Template</div>
            <div style={{ fontSize: 11.5, color: "#7c65a8" }}>Reuse this activity across any course</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 8, border: "none", background: "#f5f3ff", color: "#6d28d9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="am-label">Template Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. POS Key Terms" className="am-input" />
          </div>
          <div>
            <label className="am-label">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of this template…" className="am-input" />
          </div>
          <div>
            <label className="am-label">Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 8 }}>
              {tags.map(t => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#ede9fe", color: "#6d28d9", fontSize: 11, fontWeight: 600 }}>
                  {t}
                  <button onClick={() => setTags(prev => prev.filter(x => x !== t))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7c3aed", fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Add tag + Enter" className="am-input" style={{ flex: 1 }} />
              <button onClick={addTag} className="am-btn-ghost" style={{ padding: "8px 14px" }}>Add</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="am-btn-ghost">Cancel</button>
          <button onClick={save} className="am-btn-primary" disabled={!name.trim()}>💾 Save Template</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ActivityManager({ initialActivities = [], onSave, onClose }: Props) {
  const [tab, setTab] = useState<"build"|"templates"|"library">("build");
  const [activities, setActivities] = useState<Activity[]>(dc(initialActivities));
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [saveTemplateFor, setSaveTemplateFor] = useState<Activity | null>(null);
  const [templates, setTemplates] = useState<ActivityTemplate[]>(BUILTIN_TEMPLATES);
  const [library, setLibrary] = useState<Activity[]>([]);
  const [tplSearch, setTplSearch] = useState("");
  const [tplTypeFilter, setTplTypeFilter] = useState<SegmentType | "all">("all");
  const [libSearch, setLibSearch] = useState("");

  // Inject styles once
  useEffect(() => {
    if (document.getElementById("am-styles")) return;
    const el = document.createElement("style");
    el.id = "am-styles"; el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  const addActivity = (type: SegmentType) => {
    const a = blankActivity(type);
    setActivities(prev => [...prev, a]);
    setTab("build");
    setTimeout(() => {
      document.getElementById(`act-${a.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const insertFromTemplate = (tpl: ActivityTemplate) => {
    const copy = { ...dc(tpl.activity), id: mkId() };
    setActivities(prev => [...prev, copy]);
    setTab("build");
  };

  const insertFromLibrary = (act: Activity) => {
    const copy = { ...dc(act), id: mkId() };
    setActivities(prev => [...prev, copy]);
    setTab("build");
  };

  const saveToLibrary = (act: Activity) => {
    setLibrary(prev => {
      const exists = prev.some(a => a.id === act.id);
      if (exists) return prev.map(a => a.id === act.id ? act : a);
      return [...prev, dc(act)];
    });
  };

  const saveAsTemplate = (tpl: ActivityTemplate) => {
    setTemplates(prev => [...prev, tpl]);
    saveToLibrary(tpl.activity);
  };

  const filteredTemplates = templates.filter(tpl => {
    const matchType = tplTypeFilter === "all" || tpl.type === tplTypeFilter;
    const matchSearch = !tplSearch || tpl.name.toLowerCase().includes(tplSearch.toLowerCase()) || tpl.tags.some(t => t.toLowerCase().includes(tplSearch.toLowerCase()));
    return matchType && matchSearch;
  });

  const filteredLibrary = library.filter(a =>
    !libSearch || a.title.toLowerCase().includes(libSearch.toLowerCase()) || a.type.includes(libSearch.toLowerCase())
  );

  const allTypes: SegmentType[] = ["accordion","flashcard","fillblank","checklist","matching","hotspot"];

  return (
    <div className="am-root" style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", background: "#f6f4ff" }}>
      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg,#1e1245 0%,#4c1d95 55%,#064e3b 100%)", padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {onClose && (
          <button onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "all .14s", flexShrink: 0 }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1L3 6l5 5"/></svg>
            Back
          </button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧩</div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Activity Builder</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Build, template, and manage interactive activities</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{activities.length} activit{activities.length === 1 ? "y" : "ies"}</span>
          {onSave && (
            <button className="am-btn-primary" onClick={() => onSave(activities)}
              style={{ padding: "8px 20px", fontSize: 12.5 }}>
              ✓ Done — Add to Chapter
            </button>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(109,40,217,0.09)", display: "flex", padding: "0 18px", flexShrink: 0 }}>
        {([
          { key: "build",     label: "Build",     icon: "🔨", count: activities.length },
          { key: "templates", label: "Templates", icon: "📐", count: templates.length },
          { key: "library",   label: "My Library",icon: "📚", count: library.length },
        ] as const).map(({ key, label, icon, count }) => (
          <button key={key} className={`am-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
            {icon} {label}
            {count > 0 && <span style={{ padding: "2px 7px", borderRadius: 10, background: tab===key?"rgba(109,40,217,0.12)":"#f0eeff", color: "#6d28d9", fontSize: 9.5, fontWeight: 700 }}>{count}</span>}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ══ BUILD TAB ══ */}
        {tab === "build" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* LEFT: Type picker */}
            <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(109,40,217,0.08)", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 14px 8px" }}>
                <div className="am-section-title">Add Activity</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {allTypes.map(type => {
                    const meta = TYPE_META[type];
                    return (
                      <button key={type} onClick={() => addActivity(type)}
                        style={{ padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${meta.color}22`, background: meta.bg + "55", color: meta.color, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" as const, transition: "all .15s", width: "100%", fontFamily: "inherit" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = meta.bg; (e.currentTarget as HTMLElement).style.borderColor = meta.color + "55"; (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = meta.bg + "55"; (e.currentTarget as HTMLElement).style.borderColor = meta.color + "22"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                        <span style={{ fontSize: 20 }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</div>
                          <div style={{ fontSize: 9.5, color: meta.color + "aa", fontWeight: 400 }}>{meta.hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(109,40,217,0.08)", marginTop: "auto" }}>
                <button onClick={() => setTab("templates")} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1.5px dashed rgba(109,40,217,0.25)", background: "#f5f3ff", color: "#6d28d9", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  📐 Browse Templates →
                </button>
              </div>
            </div>

            {/* CENTER: Workspace */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="am-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
                {activities.length === 0 ? (
                  <div className="am-drop-zone" style={{ marginTop: 40 }}>
                    <div style={{ fontSize: 42, marginBottom: 12 }}>🧩</div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "#6d28d9", marginBottom: 6 }}>Start building activities</div>
                    <div style={{ fontSize: 12.5, color: "#a89dc8", lineHeight: 1.65 }}>
                      Pick an activity type from the left panel,<br/>or browse and insert from <strong>Templates</strong>
                    </div>
                  </div>
                ) : (
                  activities.map((act, i) => (
                    <div key={act.id} id={`act-${act.id}`}>
                      <ActivityEditor
                        act={act}
                        onChange={updated => setActivities(prev => prev.map((a, j) => j === i ? updated : a))}
                        onDelete={() => setActivities(prev => prev.filter((_, j) => j !== i))}
                        onSaveAsTemplate={a => setSaveTemplateFor(a)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Preview */}
            <div style={{ width: 320, flexShrink: 0, borderLeft: "1px solid rgba(109,40,217,0.08)", background: "#f8f7ff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px 6px", flexShrink: 0 }}>
                <div className="am-section-title">Student Preview</div>
                {activities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 8 }}>
                    {activities.map((a, i) => {
                      const meta = TYPE_META[a.type];
                      return (
                        <button key={a.id} onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                          style={{ padding: "3px 10px", borderRadius: 20, border: `1.5px solid ${previewIdx===i?meta.color:"rgba(109,40,217,0.15)"}`, background: previewIdx===i?meta.bg:"#fff", color: previewIdx===i?meta.color:"#8e7ec0", fontSize: 10.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "all .13s" }}>
                          <span style={{ fontSize: 12 }}>{meta.icon}</span>
                          {a.title ? (a.title.length > 12 ? a.title.slice(0, 12) + "…" : a.title) : meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="am-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
                {previewIdx !== null && activities[previewIdx] ? (
                  <div className="am-fade-up">
                    <div style={{ fontSize: 10, color: "#a89dc8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>👁️</span> Preview — student view
                    </div>
                    <ActivityPreview act={activities[previewIdx]} />
                  </div>
                ) : (
                  <div style={{ padding: "40px 16px", textAlign: "center", color: "#c4bdd8" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👁️</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>Click an activity above<br/>to preview the student view</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ TEMPLATES TAB ══ */}
        {tab === "templates" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ padding: "14px 20px 10px", background: "#fff", borderBottom: "1px solid rgba(109,40,217,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <input value={tplSearch} onChange={e => setTplSearch(e.target.value)}
                  placeholder="Search templates…" className="am-input" style={{ maxWidth: 280 }} />
                <span style={{ fontSize: 12, color: "#a89dc8" }}>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#7c65a8", alignSelf: "center", fontWeight: 600 }}>Filter:</span>
                  {(["all", ...allTypes] as const).map(type => (
                    <button key={type} className={`am-tag${tplTypeFilter === type ? " on" : ""}`}
                      onClick={() => setTplTypeFilter(type)}>
                      {type === "all" ? "All" : TYPE_META[type].icon + " " + TYPE_META[type].label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="am-badge" style={{ background: "#ede9fe", color: "#6d28d9" }}>📦 Built-in: {templates.filter(t => t.isBuiltIn).length}</span>
                <span className="am-badge" style={{ background: "#dcfce7", color: "#15803d" }}>✨ Custom: {templates.filter(t => !t.isBuiltIn).length}</span>
              </div>
            </div>
            <div className="am-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
              {filteredTemplates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#c4bdd8" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📐</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No templates found</div>
                  <div style={{ fontSize: 12 }}>Try a different search or filter</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                  {filteredTemplates.map((tpl, i) => {
                    const meta = TYPE_META[tpl.type];
                    return (
                      <div key={tpl.id} className="am-tpl-card" style={{ animationDelay: `${i * 0.04}s` }}>
                        {/* Card top */}
                        <div style={{ background: `linear-gradient(135deg,${meta.bg},${meta.bg}cc)`, padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span style={{ fontSize: 28 }}>{meta.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13.5, fontWeight: 700, color: "#0f0a2a", lineHeight: 1.2 }}>{tpl.name}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                <span className="am-badge" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
                                {!tpl.isBuiltIn && <span className="am-badge" style={{ background: "#dcfce7", color: "#15803d" }}>✨ Custom</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Card body */}
                        <div style={{ padding: "12px 16px" }}>
                          <p style={{ fontSize: 12, color: "#7c65a8", margin: "0 0 10px", lineHeight: 1.55 }}>{tpl.description || meta.desc}</p>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 12 }}>
                            {tpl.tags.map(tag => (
                              <span key={tag} style={{ padding: "2px 9px", borderRadius: 20, background: "rgba(109,40,217,0.06)", color: "#6d28d9", fontSize: 10, fontWeight: 600 }}>{tag}</span>
                            ))}
                          </div>
                          {/* Preview snippet */}
                          <div style={{ background: "#f8f7ff", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 11.5, color: "#7c65a8", lineHeight: 1.6 }}>
                            {tpl.type === "accordion" && `${tpl.activity.items?.length ?? 0} expandable items`}
                            {tpl.type === "flashcard" && `${tpl.activity.cards?.length ?? 0} flip cards`}
                            {tpl.type === "fillblank" && `${tpl.activity.questions?.length ?? 0} fill-in questions`}
                            {(tpl.type === "checklist" || tpl.type === "hotspot") && `${tpl.activity.checklist?.length ?? 0} checklist steps`}
                            {tpl.type === "matching" && `${tpl.activity.pairs?.length ?? 0} matching pairs`}
                          </div>
                          <button onClick={() => insertFromTemplate(tpl)} className="am-btn-primary" style={{ width: "100%", padding: "9px" }}>
                            + Insert into Build
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ LIBRARY TAB ══ */}
        {tab === "library" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: "#fff", borderBottom: "1px solid rgba(109,40,217,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input value={libSearch} onChange={e => setLibSearch(e.target.value)}
                  placeholder="Search your library…" className="am-input" style={{ maxWidth: 280 }} />
                <span style={{ fontSize: 12, color: "#a89dc8" }}>{filteredLibrary.length} saved</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: "#a89dc8", lineHeight: 1.55 }}>
                💾 Click the save icon (💾) on any activity in Build tab to save it here for reuse across courses.
              </div>
            </div>
            <div className="am-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
              {filteredLibrary.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#c4bdd8" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Your library is empty</div>
                  <div style={{ fontSize: 12, lineHeight: 1.65 }}>Click 💾 on any activity in the Build tab,<br/>or save a template to add it here.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredLibrary.map((act, i) => {
                    const meta = TYPE_META[act.type];
                    return (
                      <div key={act.id} className="am-lib-card am-fade-up" style={{ animationDelay: `${i * 0.04}s`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f0a2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title || meta.label}</div>
                          <div style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setPreviewIdx(null); setTab("build"); insertFromLibrary(act); }}
                            className="am-btn-ghost" style={{ padding: "6px 14px", fontSize: 11.5 }}>
                            + Insert
                          </button>
                          <button onClick={() => setLibrary(prev => prev.filter(a => a.id !== act.id))}
                            className="am-btn-danger">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l8 8M8 1L1 9"/></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SAVE AS TEMPLATE MODAL ── */}
      {saveTemplateFor && (
        <SaveTemplateModal
          act={saveTemplateFor}
          onSave={saveAsTemplate}
          onClose={() => setSaveTemplateFor(null)}
        />
      )}
    </div>
  );
}
