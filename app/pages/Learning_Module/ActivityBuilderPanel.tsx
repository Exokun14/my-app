'use client'

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
export type SegmentType = "accordion" | "flashcard" | "fillblank" | "checklist" | "matching" | "hotspot";
export interface AccordionItem  { q: string; a: string; }
export interface FlashCard      { front: string; back: string; }
export interface FillBlankQ     { sentence: string; blanks: string[]; }
export interface ChecklistItem  { text: string; }
export interface MatchPair      { left: string; right: string; }
export interface Activity {
  id: string; type: SegmentType; title: string;
  items?: AccordionItem[]; cards?: FlashCard[];
  questions?: FillBlankQ[]; checklist?: ChecklistItem[]; pairs?: MatchPair[];
}
interface Props {
  open: boolean; onClose: () => void;
  activities: Activity[]; onSave: (a: Activity[]) => void;
  dropTargetLabel?: string;
}

// ── TS-safe tab type (fixes "Property 'count' does not exist" error) ─────────
type TabKey = "build" | "types" | "templates";
interface TabDef { key: TabKey; label: string; icon: string; count?: number; }

// ─── Meta ─────────────────────────────────────────────────────────────────────
const TYPE_META: Record<SegmentType, { icon:string; label:string; color:string; bg:string; border:string; desc:string; hint:string }> = {
  accordion: { icon:"🗂️", label:"Accordion",     color:"#0284c7", bg:"#e0f2fe", border:"rgba(2,132,199,0.22)",   desc:"Expandable Q&A sections",     hint:"FAQs & glossaries"         },
  flashcard: { icon:"🃏", label:"Flashcards",    color:"#7c3aed", bg:"#ede9fe", border:"rgba(124,58,237,0.22)",  desc:"Flip-card memory drill",       hint:"Key terms & vocabulary"     },
  fillblank: { icon:"✏️", label:"Fill in Blank", color:"#0f766e", bg:"#ccfbf1", border:"rgba(15,118,110,0.22)",  desc:"Sentence completion exercise", hint:"Recall & procedure steps"   },
  checklist: { icon:"☑️", label:"Checklist",     color:"#15803d", bg:"#dcfce7", border:"rgba(21,128,61,0.22)",   desc:"Step-by-step task list",       hint:"SOPs & procedures"          },
  matching:  { icon:"🔗", label:"Matching",      color:"#9333ea", bg:"#f3e8ff", border:"rgba(147,51,234,0.22)",  desc:"Match two-column pairs",       hint:"Definitions & associations" },
  hotspot:   { icon:"🎯", label:"Hotspot Task",  color:"#d97706", bg:"#fef3c7", border:"rgba(217,119,6,0.22)",   desc:"Interactive task checklist",   hint:"Walkthroughs & EOD tasks"   },
};
const ALL_TYPES = Object.keys(TYPE_META) as SegmentType[];

function mkId(): string { return Math.random().toString(36).slice(2, 9); }
function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function blankActivity(type: SegmentType): Activity {
  const base = { id: mkId(), type, title: "" };
  switch (type) {
    case "accordion": return { ...base, items:     [{ q: "", a: "" }] };
    case "flashcard": return { ...base, cards:     [{ front: "", back: "" }] };
    case "fillblank": return { ...base, questions: [{ sentence: "Type your sentence with __BLANK__ here.", blanks: [""] }] };
    case "checklist":
    case "hotspot":   return { ...base, checklist: [{ text: "" }] };
    case "matching":  return { ...base, pairs:     [{ left: "", right: "" }] };
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES: Array<{ id:string; name:string; type:SegmentType; tags:string[]; desc:string; activity:Activity }> = [
  { id:"t1", name:"POS Key Terms",             type:"accordion", tags:["POS","Glossary"],  desc:"Expandable glossary of POS terms",
    activity:{ id:mkId(),type:"accordion",title:"POS Key Terms",items:[{q:"What is a POS System?",a:"Hardware + software used to process transactions at the point of sale."},{q:"What is a PED?",a:"A PIN Entry Device — the card reader customers use for card payments."},{q:"What is an EOD Report?",a:"End-of-Day report summarising all transactions for cash reconciliation."}] } },
  { id:"t2", name:"Hardware Flashcards",       type:"flashcard",  tags:["POS","Memory"],   desc:"Flip-cards for hardware components",
    activity:{ id:mkId(),type:"flashcard",title:"POS Hardware",cards:[{front:"Touchscreen Terminal",back:"Primary cashier interface — all orders entered here."},{front:"Thermal Receipt Printer",back:"Uses heat (not ink) — faster and lower maintenance."},{front:"Cash Drawer",back:"Locked drawer, opens automatically on cash transactions."}] } },
  { id:"t3", name:"Opening Shift Checklist",   type:"checklist",  tags:["SOP","Opening"],  desc:"Morning opening procedure steps",
    activity:{ id:mkId(),type:"checklist",title:"Opening Shift",checklist:[{text:"Verify cash float matches opening amount"},{text:"Power on POS and confirm server connection"},{text:"Test barcode scanner and receipt printer"},{text:"Confirm card reader (PED) is online"},{text:"Log in with personal employee credentials"}] } },
  { id:"t4", name:"Hardware Matching",         type:"matching",   tags:["POS","Quiz"],     desc:"Match hardware names to functions",
    activity:{ id:mkId(),type:"matching",title:"Match the Hardware",pairs:[{left:"Touchscreen",right:"Main cashier input"},{left:"Barcode Scanner",right:"Reads product codes"},{left:"PED / Card Reader",right:"Processes card payments"},{left:"Cash Drawer",right:"Stores physical currency"}] } },
  { id:"t5", name:"Transaction Fill-in-Blank", type:"fillblank",  tags:["Recall","Quiz"],  desc:"Test recall of transaction procedures",
    activity:{ id:mkId(),type:"fillblank",title:"Transaction Procedures",questions:[{sentence:"For cash payments, enter the __BLANK__ amount and the system calculates change.",blanks:["tendered"]},{sentence:"Always obtain __BLANK__ approval before voiding any transaction.",blanks:["supervisor","manager"]}] } },
  { id:"t6", name:"EOD Procedure",             type:"hotspot",    tags:["EOD","Closing"],  desc:"Interactive end-of-day walkthrough",
    activity:{ id:mkId(),type:"hotspot",title:"End-of-Day Procedure",checklist:[{text:"Run EOD report from manager dashboard"},{text:"Count cash and compare to POS total"},{text:"Investigate any discrepancies"},{text:"Secure cash in the safe"},{text:"Log out all cashier sessions"},{text:"Power down terminals and peripherals"}] } },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

.abp { font-family:'DM Sans',sans-serif; color:#0f0a2a; }
.abp *, .abp *::before, .abp *::after { box-sizing:border-box; margin:0; padding:0; }
.abp * { scrollbar-width:thin; scrollbar-color:rgba(109,40,217,0.12) transparent; }
.abp ::-webkit-scrollbar { width:3px; }
.abp ::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.18); border-radius:6px; }

@keyframes abp-in  { from{opacity:0;transform:scale(.96) translateY(14px)} to{opacity:1;transform:none} }
@keyframes abp-out { from{opacity:1;transform:none} to{opacity:0;transform:scale(.96) translateY(10px)} }
@keyframes abp-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes abp-glow{ 0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,0.3)} 50%{box-shadow:0 0 0 6px rgba(109,40,217,0)} }

.abp-enter { animation:abp-in  .4s cubic-bezier(0.16,1,0.3,1) both; }
.abp-exit  { animation:abp-out .26s ease forwards; }
.abp-up    { animation:abp-up  .24s cubic-bezier(0.16,1,0.3,1) both; }

.abp-panel {
  position:fixed; display:flex; flex-direction:column; background:#f8f7ff;
  border-radius:18px; overflow:hidden;
  box-shadow:0 40px 100px rgba(10,6,30,0.22), 0 0 0 1px rgba(109,40,217,0.1);
  min-width:500px; min-height:380px; z-index:900;
}
.abp-panel.fs { border-radius:0; top:0!important; left:0!important; width:100%!important; height:100%!important; }

.abp-bar {
  height:48px; padding:0 14px; flex-shrink:0;
  display:flex; align-items:center; gap:10px;
  background:linear-gradient(110deg,#160a3a 0%,#082830 100%);
  cursor:grab; user-select:none; border-radius:18px 18px 0 0;
  position:relative; overflow:hidden;
}
.abp-bar::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(110deg,rgba(124,58,237,0.15),transparent 50%,rgba(13,148,136,0.12));
}
.abp-panel.fs .abp-bar { border-radius:0; cursor:default; }
.abp-bar:active { cursor:grabbing; }
.abp-bar-logo { width:30px; height:30px; border-radius:9px; flex-shrink:0; background:linear-gradient(135deg,rgba(124,58,237,0.6),rgba(13,148,136,0.55)); display:flex; align-items:center; justify-content:center; font-size:14px; position:relative; z-index:1; }
.abp-bar-name { font-family:'Syne',sans-serif; font-size:12.5px; font-weight:800; color:#fff; letter-spacing:.02em; line-height:1; position:relative; z-index:1; }
.abp-bar-sub  { font-size:9.5px; color:rgba(255,255,255,0.38); letter-spacing:.04em; position:relative; z-index:1; }
.abp-wbtn { width:22px; height:22px; border-radius:6px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; position:relative; z-index:1; transition:transform .12s,filter .12s; }
.abp-wbtn:hover { transform:scale(1.14); filter:brightness(1.2); }

.abp-nav { display:flex; align-items:center; gap:2px; padding:10px 16px 0; flex-shrink:0; }
.abp-navbtn { padding:7px 13px; border-radius:9px; border:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:11.5px; font-weight:500; color:#9585c0; cursor:pointer; display:flex; align-items:center; gap:5px; white-space:nowrap; transition:color .13s, background .13s; }
.abp-navbtn.on { color:#160a3a; font-weight:700; background:#fff; box-shadow:0 1px 8px rgba(109,40,217,0.1); }
.abp-navbtn:hover:not(.on) { color:#6d28d9; background:rgba(109,40,217,0.05); }
.abp-navpill { padding:1px 6px; border-radius:20px; font-size:9px; font-weight:700; background:rgba(109,40,217,0.1); color:#6d28d9; }
.abp-navbtn.on .abp-navpill { background:rgba(109,40,217,0.12); }

.abp-body { flex:1; overflow-y:auto; padding:14px 16px 16px; display:flex; flex-direction:column; gap:10px; }

.abp-block { border-radius:13px; overflow:hidden; border:1.5px solid rgba(109,40,217,0.1); background:#fff; transition:box-shadow .15s,border-color .15s; }
.abp-block:hover { border-color:rgba(109,40,217,0.2); box-shadow:0 4px 20px rgba(109,40,217,0.09); }
.abp-bhead { display:flex; align-items:center; gap:9px; padding:10px 12px; cursor:pointer; transition:background .12s; user-select:none; }
.abp-bhead:hover { background:rgba(109,40,217,0.025); }

.abp-tcard { border-radius:12px; padding:14px 14px 12px; border:1.5px solid transparent; cursor:pointer; display:flex; flex-direction:column; gap:5px; transition:transform .18s cubic-bezier(0.16,1,0.3,1),box-shadow .18s,border-color .14s; user-select:none; position:relative; overflow:hidden; }
.abp-tcard:hover { transform:translateY(-3px) scale(1.01); box-shadow:0 8px 24px rgba(109,40,217,0.14); }
.abp-tcard:active { transform:scale(.98); }

.abp-tpl { border-radius:12px; overflow:hidden; border:1px solid rgba(109,40,217,0.1); background:#fff; transition:transform .18s,box-shadow .18s,border-color .14s; }
.abp-tpl:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(109,40,217,0.12); border-color:rgba(109,40,217,0.24); }

.abp-dz { border:2px dashed rgba(109,40,217,0.16); border-radius:13px; padding:22px 18px; text-align:center; background:rgba(109,40,217,0.015); transition:all .18s; cursor:pointer; }
.abp-dz:hover { border-color:rgba(109,40,217,0.3); background:rgba(109,40,217,0.04); }
.abp-dz.over { border-color:#7c3aed; background:rgba(109,40,217,0.07); animation:abp-glow .7s ease-out; }

.abp-footer { padding:10px 16px; border-top:1px solid rgba(109,40,217,0.08); background:#fff; display:flex; align-items:center; gap:10px; flex-shrink:0; }

.abp-save { padding:9px 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#6d28d9,#0d9488); color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:7px; transition:transform .13s,box-shadow .13s,filter .13s; position:relative; overflow:hidden; }
.abp-save:hover { transform:translateY(-2px); box-shadow:0 6px 22px rgba(109,40,217,0.35); filter:brightness(1.06); }
.abp-save:active { transform:scale(.97); }
.abp-save:disabled { background:#e2dff5; color:#a89dc8; cursor:not-allowed; transform:none; box-shadow:none; filter:none; }
.abp-save::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent); transform:translateX(-100%); transition:transform .5s; }
.abp-save:hover::after { transform:translateX(100%); }

.abp-ghost-btn { padding:7px 14px; border-radius:9px; border:1.5px solid rgba(109,40,217,0.18); background:#fff; color:#6d28d9; font-size:11.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; transition:all .13s; }
.abp-ghost-btn:hover { background:#f5f3ff; border-color:rgba(109,40,217,0.38); }

.abp-del { width:26px; height:26px; border-radius:7px; border:none; background:#fee2e2; color:#dc2626; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .12s,transform .12s; flex-shrink:0; }
.abp-del:hover { background:#fca5a5; transform:scale(1.1); }

.abp-in { width:100%; border:1.5px solid rgba(109,40,217,0.13); border-radius:9px; padding:8px 11px; font-size:13px; background:#faf9ff; outline:none; color:#0f0a2a; font-family:'DM Sans',sans-serif; transition:border-color .14s,box-shadow .14s; }
.abp-in:focus { border-color:rgba(109,40,217,0.42); background:#fff; box-shadow:0 0 0 3px rgba(109,40,217,0.06); }
.abp-in::placeholder { color:#b8afd4; }
.abp-lbl { font-size:9.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#8e7ec0; display:block; margin-bottom:4px; }

.abp-rh { position:absolute; background:transparent; }
.abp-rh.e  { top:18px; right:0; width:5px; height:calc(100% - 36px); cursor:ew-resize; }
.abp-rh.s  { bottom:0; left:18px; height:5px; width:calc(100% - 36px); cursor:ns-resize; }
.abp-rh.se { bottom:0; right:0; width:14px; height:14px; cursor:se-resize; }
.abp-rh.w  { top:18px; left:0; width:5px; height:calc(100% - 36px); cursor:ew-resize; }
.abp-rh.n  { top:0; left:18px; height:5px; width:calc(100% - 36px); cursor:ns-resize; }
.abp-rh.sw { bottom:0; left:0; width:14px; height:14px; cursor:sw-resize; }
.abp-rh.ne { top:0; right:0; width:14px; height:14px; cursor:ne-resize; }
.abp-rh.nw { top:0; left:0; width:14px; height:14px; cursor:nw-resize; }

.abp-ghost-chip { position:fixed; pointer-events:none; z-index:9999; border-radius:10px; padding:8px 13px; display:flex; align-items:center; gap:7px; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700; box-shadow:0 18px 48px rgba(0,0,0,0.2); transform:rotate(-2deg); border:2px solid; backdrop-filter:blur(10px); }
`;

// Shared inline input style
const SI: React.CSSProperties = { width:"100%", border:"1.5px solid rgba(109,40,217,0.13)", borderRadius:9, padding:"8px 11px", fontSize:13, background:"#faf9ff", outline:"none", color:"#0f0a2a", fontFamily:"'DM Sans',sans-serif" };

// ══════════════════════════════════════════════════════════════════════════════
// EDITORS
// ══════════════════════════════════════════════════════════════════════════════

function AccordionEditor({ act, onChange }: { act:Activity; onChange:(a:Activity)=>void }) {
  const items = act.items ?? [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map((item,i) => (
        <div key={i} style={{background:"#fff",border:"1px solid rgba(2,132,199,0.12)",borderRadius:11,padding:"11px 13px"}}>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{width:22,height:22,borderRadius:6,background:"#e0f2fe",color:"#0284c7",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>Q{i+1}</div>
            <input value={item.q} onChange={e=>{const u=dc(items);u[i].q=e.target.value;onChange({...act,items:u});}} placeholder="Question / heading…" className="abp-in" style={{flex:1}} />
            <button className="abp-del" onClick={()=>onChange({...act,items:items.filter((_,j)=>j!==i)})}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
          </div>
          <textarea value={item.a} onChange={e=>{const u=dc(items);u[i].a=e.target.value;onChange({...act,items:u});}} placeholder="Answer shown when expanded…" rows={2} style={{...SI,resize:"vertical",fontSize:12.5,lineHeight:1.55}} />
        </div>
      ))}
      <button onClick={()=>onChange({...act,items:[...items,{q:"",a:""}]})} style={{padding:"7px",borderRadius:9,border:"1.5px dashed rgba(2,132,199,0.3)",background:"#f0f9ff",color:"#0284c7",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Item</button>
    </div>
  );
}

function FlashcardEditor({ act, onChange }: { act:Activity; onChange:(a:Activity)=>void }) {
  const cards = act.cards ?? [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {cards.map((c,i) => (
        <div key={i} style={{background:"#fff",border:"1px solid rgba(124,58,237,0.1)",borderRadius:11,padding:"11px 13px",display:"flex",gap:10}}>
          <div style={{flex:1}}><label className="abp-lbl" style={{color:"#7c3aed"}}>Front</label><input value={c.front} onChange={e=>{const u=dc(cards);u[i].front=e.target.value;onChange({...act,cards:u});}} placeholder="Front…" className="abp-in" /></div>
          <div style={{flex:1}}><label className="abp-lbl" style={{color:"#0d9488"}}>Back</label><input value={c.back} onChange={e=>{const u=dc(cards);u[i].back=e.target.value;onChange({...act,cards:u});}} placeholder="Back…" className="abp-in" /></div>
          <button className="abp-del" style={{alignSelf:"flex-end",marginBottom:1}} onClick={()=>onChange({...act,cards:cards.filter((_,j)=>j!==i)})}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
        </div>
      ))}
      <button onClick={()=>onChange({...act,cards:[...cards,{front:"",back:""}]})} style={{padding:"7px",borderRadius:9,border:"1.5px dashed rgba(124,58,237,0.3)",background:"#f5f3ff",color:"#7c3aed",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Card</button>
    </div>
  );
}

function FillBlankEditor({ act, onChange }: { act:Activity; onChange:(a:Activity)=>void }) {
  const qs = act.questions ?? [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:11,color:"#7c65a8",background:"#f0f9ff",borderRadius:9,padding:"7px 11px",lineHeight:1.6}}>
        💡 Use <code style={{background:"rgba(15,118,110,0.12)",padding:"1px 5px",borderRadius:4,fontSize:10.5}}>__BLANK__</code> where students type. Separate correct answers with <strong>|</strong>
      </div>
      {qs.map((q,i) => (
        <div key={i} style={{background:"#fff",border:"1px solid rgba(15,118,110,0.12)",borderRadius:11,padding:"11px 13px"}}>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{width:22,height:22,borderRadius:6,background:"#ccfbf1",color:"#0f766e",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>Q{i+1}</div>
            <input value={q.sentence} onChange={e=>{const u=dc(qs);u[i].sentence=e.target.value;onChange({...act,questions:u});}} placeholder='e.g. "The cash drawer opens __BLANK__ automatically."' className="abp-in" style={{flex:1}} />
            <button className="abp-del" onClick={()=>onChange({...act,questions:qs.filter((_,j)=>j!==i)})}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
          </div>
          <label className="abp-lbl">Correct answer(s) — separate with |</label>
          <input value={q.blanks.join("|")} onChange={e=>{const u=dc(qs);u[i].blanks=e.target.value.split("|").map(s=>s.trim());onChange({...act,questions:u});}} placeholder='e.g. "only | automatically"' className="abp-in" />
        </div>
      ))}
      <button onClick={()=>onChange({...act,questions:[...qs,{sentence:"__BLANK__",blanks:[""]}]})} style={{padding:"7px",borderRadius:9,border:"1.5px dashed rgba(15,118,110,0.3)",background:"#f0fdf9",color:"#0f766e",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Question</button>
    </div>
  );
}

function ChecklistEditor({ act, onChange }: { act:Activity; onChange:(a:Activity)=>void }) {
  const items = act.checklist ?? [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:9,background:"#fff",border:"1px solid rgba(21,128,61,0.1)"}}>
          <span style={{fontSize:13,color:"#15803d",flexShrink:0}}>☑</span>
          <input value={item.text} onChange={e=>{const u=dc(items);u[i].text=e.target.value;onChange({...act,checklist:u});}} placeholder={`Step ${i+1}…`} className="abp-in" style={{flex:1,padding:"5px 9px"}} />
          <button className="abp-del" style={{width:23,height:23}} onClick={()=>onChange({...act,checklist:items.filter((_,j)=>j!==i)})}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
        </div>
      ))}
      <button onClick={()=>onChange({...act,checklist:[...items,{text:""}]})} style={{padding:"7px",borderRadius:9,border:"1.5px dashed rgba(21,128,61,0.3)",background:"#f0fdf4",color:"#15803d",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Item</button>
    </div>
  );
}

function MatchingEditor({ act, onChange }: { act:Activity; onChange:(a:Activity)=>void }) {
  const pairs = act.pairs ?? [];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      {pairs.map((p,i) => (
        <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={p.left}  onChange={e=>{const u=dc(pairs);u[i].left=e.target.value;onChange({...act,pairs:u});}}  placeholder="Left…"  className="abp-in" style={{flex:1}} />
          <span style={{color:"#c4bdd8",fontSize:14,flexShrink:0}}>↔</span>
          <input value={p.right} onChange={e=>{const u=dc(pairs);u[i].right=e.target.value;onChange({...act,pairs:u});}} placeholder="Right…" className="abp-in" style={{flex:1}} />
          <button className="abp-del" onClick={()=>onChange({...act,pairs:pairs.filter((_,j)=>j!==i)})}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
        </div>
      ))}
      <button onClick={()=>onChange({...act,pairs:[...pairs,{left:"",right:""}]})} style={{padding:"7px",borderRadius:9,border:"1.5px dashed rgba(147,51,234,0.3)",background:"#f3e8ff",color:"#9333ea",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Pair</button>
    </div>
  );
}

function ActivityBlock({ act, idx, open, onToggle, onChange, onDelete }: {
  act:Activity; idx:number; open:boolean;
  onToggle:()=>void; onChange:(a:Activity)=>void; onDelete:()=>void;
}) {
  const m = TYPE_META[act.type];
  return (
    <div className="abp-block abp-up" style={{animationDelay:`${idx*0.04}s`}}>
      <div className="abp-bhead" onClick={onToggle} style={{background:open?`${m.bg}99`:"#fff"}}>
        <div style={{width:32,height:32,borderRadius:9,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,border:`1px solid ${m.border}`}}>{m.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <input value={act.title} onChange={e=>{e.stopPropagation();onChange({...act,title:e.target.value});}} onClick={e=>e.stopPropagation()}
            placeholder={`${m.label} title…`} className="abp-in"
            style={{border:"none",background:"transparent",padding:"2px 0",fontSize:13,fontWeight:700,color:"#0f0a2a",width:"100%",outline:"none"}} />
          <span style={{fontSize:10,color:m.color,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{m.label}</span>
        </div>
        <button className="abp-del" style={{width:24,height:24}} onClick={e=>{e.stopPropagation();onDelete();}}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg></button>
        <svg width="9" height="6" viewBox="0 0 10 7" fill={m.color} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0,marginLeft:2}}><path d="M1 1l4 4 4-4"/></svg>
      </div>
      {open && (
        <div style={{padding:"12px 14px",background:"#faf9ff",borderTop:`1px solid ${m.border}`}}>
          {act.type==="accordion" && <AccordionEditor act={act} onChange={onChange} />}
          {act.type==="flashcard" && <FlashcardEditor act={act} onChange={onChange} />}
          {act.type==="fillblank" && <FillBlankEditor act={act} onChange={onChange} />}
          {(act.type==="checklist"||act.type==="hotspot") && <ChecklistEditor act={act} onChange={onChange} />}
          {act.type==="matching"  && <MatchingEditor  act={act} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════════════════
export default function ActivityBuilderPanel({ open, onClose, activities: initActs, onSave, dropTargetLabel }: Props) {
  const [acts,       setActs]       = useState<Activity[]>([]);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());
  const [tab,        setTab]        = useState<TabKey>("build");
  const [dropping,   setDropping]   = useState(false);
  const [exiting,    setExiting]    = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tplSearch,  setTplSearch]  = useState("");
  const [ghostType,  setGhostType]  = useState<SegmentType|null>(null);
  const [ghostPos,   setGhostPos]   = useState({x:0,y:0});
  const isDragging = ghostType !== null;

  const [pos,  setPos]  = useState({x:100, y:80});
  const [size, setSize] = useState({w:660, h:560});
  const dragRef   = useRef<{mx:number;my:number;ox:number;oy:number}|null>(null);
  const resizeRef = useRef<{edge:string;mx:number;my:number;x:number;y:number;w:number;h:number}|null>(null);

  useEffect(() => {
    if (open) {
      setActs(dc(initActs));
      setExpanded(initActs[0]?.id ? new Set([initActs[0].id]) : new Set());
      setTab("build");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = useCallback(() => { setExiting(true); setTimeout(()=>{setExiting(false);onClose();},260); }, [onClose]);
  const handleSave  = () => { onSave(acts); handleClose(); };

  const addAct = (type: SegmentType) => {
    const a = blankActivity(type);
    setActs(prev => [...prev, a]);
    setExpanded(prev => new Set([...prev, a.id]));
    setTab("build");
  };

  // Chip drag
  const startChipDrag = (e: React.MouseEvent, type: SegmentType) => {
    e.preventDefault();
    setGhostType(type);
    setGhostPos({x:e.clientX-44, y:e.clientY-22});
  };
  useEffect(() => {
    if (!isDragging) return;
    const mv = (e:MouseEvent) => { setGhostPos({x:e.clientX-44,y:e.clientY-22}); setDropping(!!document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-dz]")); };
    const up = (e:MouseEvent) => { if (document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-dz]")&&ghostType) addAct(ghostType); setGhostType(null); setDropping(false); };
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return ()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, ghostType]);

  // Panel drag
  const startPanelDrag = (e: React.MouseEvent) => {
    if (fullscreen) return; e.preventDefault();
    dragRef.current = {mx:e.clientX,my:e.clientY,ox:pos.x,oy:pos.y};
    const mv = (ev:MouseEvent) => { if (!dragRef.current) return; setPos({x:dragRef.current.ox+ev.clientX-dragRef.current.mx,y:dragRef.current.oy+ev.clientY-dragRef.current.my}); };
    const up = () => { dragRef.current=null; window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
  };

  // Resize
  const startResize = (e: React.MouseEvent, edge: string) => {
    if (fullscreen) return; e.preventDefault(); e.stopPropagation();
    resizeRef.current = {edge,mx:e.clientX,my:e.clientY,x:pos.x,y:pos.y,w:size.w,h:size.h};
    const mv = (ev:MouseEvent) => {
      const r=resizeRef.current; if (!r) return;
      const dx=ev.clientX-r.mx, dy=ev.clientY-r.my;
      let nx=r.x,ny=r.y,nw=r.w,nh=r.h;
      if (r.edge.includes("e")) nw=Math.max(500,r.w+dx);
      if (r.edge.includes("s")) nh=Math.max(380,r.h+dy);
      if (r.edge.includes("w")) { nw=Math.max(500,r.w-dx); nx=r.x+(r.w-nw); }
      if (r.edge.includes("n")) { nh=Math.max(380,r.h-dy); ny=r.y+(r.h-nh); }
      setSize({w:nw,h:nh}); setPos({x:nx,y:ny});
    };
    const up = ()=>{resizeRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
  };

  if (!open && !exiting) return null;

  // ── Tab definitions (explicit interface avoids TS union narrowing error) ──
  const TABS: TabDef[] = [
    { key:"build",     label:"Build",          icon:"◈", count: acts.length || undefined },
    { key:"types",     label:"Activity Types", icon:"⊞" },
    { key:"templates", label:"Templates",      icon:"⊟", count: TEMPLATES.length },
  ];

  const filteredTpls = TEMPLATES.filter(t =>
    !tplSearch || t.name.toLowerCase().includes(tplSearch.toLowerCase()) || t.tags.some(g=>g.toLowerCase().includes(tplSearch.toLowerCase()))
  );

  const panelStyle: React.CSSProperties = fullscreen
    ? {top:0,left:0,width:"100%",height:"100%"}
    : {top:pos.y,left:pos.x,width:size.w,height:size.h};

  return createPortal(
    <>
      <style>{CSS}</style>

      {/* Ghost chip */}
      {isDragging && ghostType && (
        <div className="abp-ghost-chip" style={{top:ghostPos.y,left:ghostPos.x,background:`${TYPE_META[ghostType].bg}ee`,borderColor:TYPE_META[ghostType].color,color:TYPE_META[ghostType].color}}>
          <span style={{fontSize:17}}>{TYPE_META[ghostType].icon}</span>
          <span>{TYPE_META[ghostType].label}</span>
        </div>
      )}

      <div style={{position:"fixed",inset:0,zIndex:899,pointerEvents:isDragging?"auto":"none"}} />

      <div className={`abp abp-panel${fullscreen?" fs":""}${exiting?" abp-exit":" abp-enter"}`} style={panelStyle}>
        {!fullscreen && (["e","s","se","w","n","sw","ne","nw"] as const).map(e=>(
          <div key={e} className={`abp-rh ${e}`} onMouseDown={ev=>startResize(ev,e)} />
        ))}

        {/* Titlebar */}
        <div className="abp-bar" onMouseDown={startPanelDrag}>
          <div className="abp-bar-logo">🧩</div>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:1,position:"relative",zIndex:1}}>
            <span className="abp-bar-name">Activity Builder</span>
            {dropTargetLabel && <span className="abp-bar-sub">→ {dropTargetLabel}</span>}
          </div>
          <div style={{display:"flex",gap:5,position:"relative",zIndex:1}}>
            <button className="abp-wbtn" style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)"}} onClick={()=>setFullscreen(v=>!v)} title={fullscreen?"Exit fullscreen":"Fullscreen"}>
              {fullscreen
                ? <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 5V1h4M9 1h4v4M13 9v4h-4M5 13H1V9"/></svg>
                : <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 1H1v4M9 1h4v4M9 13h4V9M5 13H1V9"/></svg>
              }
            </button>
            <button className="abp-wbtn" style={{background:"rgba(220,38,38,0.25)",color:"rgba(255,180,180,0.9)"}} onClick={handleClose}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l8 8M8 1L1 9"/></svg>
            </button>
          </div>
        </div>

        {/* Nav pills */}
        <div className="abp-nav">
          {TABS.map((t: TabDef) => (
            <button key={t.key} className={`abp-navbtn${tab===t.key?" on":""}`} onClick={()=>setTab(t.key)}>
              <span style={{fontSize:12}}>{t.icon}</span>
              {t.label}
              {t.count !== undefined && <span className="abp-navpill">{t.count}</span>}
            </button>
          ))}
          <div style={{marginLeft:"auto",paddingRight:2}}>
            <span style={{fontSize:10.5,color:"#9585c0",fontWeight:600}}>{acts.length} item{acts.length===1?"":"s"}</span>
          </div>
        </div>

        {/* Body */}
        <div className="abp-body">

          {/* BUILD */}
          {tab==="build" && (
            <>
              <div data-dz="true" className={`abp-dz${dropping?" over":""}`}
                onMouseEnter={()=>isDragging&&setDropping(true)}
                onMouseLeave={()=>setDropping(false)}>
                {acts.length===0 ? (
                  <div style={{pointerEvents:"none"}}>
                    <div style={{fontSize:28,marginBottom:8}}>🎯</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#a89dc8",marginBottom:4}}>Drop an activity type here</div>
                    <div style={{fontSize:11.5,color:"#c4bdd8",lineHeight:1.65,marginBottom:14}}>Drag from <strong>Activity Types</strong> tab, or quick-add:</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                      {ALL_TYPES.map(type=>{const m=TYPE_META[type];return(
                        <button key={type} onClick={()=>addAct(type)} style={{padding:"5px 11px",borderRadius:9,border:`1.5px solid ${m.border}`,background:m.bg,color:m.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,transition:"transform .13s"}} onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-2px)")} onMouseLeave={e=>(e.currentTarget.style.transform="none")}><span>{m.icon}</span>{m.label}</button>
                      );})}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:11.5,color:dropping?"#7c3aed":"#c4bdd8",fontWeight:dropping?700:400,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                    {isDragging ? <><span style={{fontSize:17}}>{ghostType?TYPE_META[ghostType].icon:"+"}</span>Drop to add {ghostType?TYPE_META[ghostType].label:"activity"}</> : <><svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v12M1 7h12"/></svg>Drop or click to add activity</>}
                  </div>
                )}
              </div>

              {acts.map((act,i)=>(
                <ActivityBlock key={act.id} act={act} idx={i}
                  open={expanded.has(act.id)}
                  onToggle={()=>{setExpanded(prev=>{const s=new Set(prev);s.has(act.id)?s.delete(act.id):s.add(act.id);return s;});}}
                  onChange={u=>setActs(prev=>prev.map(a=>a.id===act.id?u:a))}
                  onDelete={()=>{setActs(prev=>prev.filter(a=>a.id!==act.id));setExpanded(prev=>{const s=new Set(prev);s.delete(act.id);return s;});}}
                />
              ))}

              {acts.length>0 && (
                <div data-dz="true" className={`abp-dz${dropping?" over":""}`} style={{padding:"14px 18px"}}
                  onMouseEnter={()=>isDragging&&setDropping(true)}
                  onMouseLeave={()=>setDropping(false)}>
                  <div style={{fontSize:11.5,color:dropping?"#7c3aed":"#c4bdd8",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                    {isDragging?<><span>{ghostType?TYPE_META[ghostType].icon:"+"}</span>Drop to add {ghostType?TYPE_META[ghostType].label:""}</>:<><svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v12M1 7h12"/></svg>Add another activity</>}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ACTIVITY TYPES */}
          {tab==="types" && (
            <>
              <div style={{padding:"4px 2px 8px",fontSize:11.5,color:"#9585c0",lineHeight:1.6}}>
                <strong style={{color:"#0f0a2a"}}>Drag</strong> any type onto the Build drop zone — or <strong style={{color:"#0f0a2a"}}>click</strong> to add instantly.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:9}}>
                {ALL_TYPES.map(type=>{const m=TYPE_META[type];return(
                  <div key={type} className="abp-tcard" style={{background:m.bg,border:`1.5px solid ${m.border}`}}
                    onMouseDown={e=>startChipDrag(e,type)} onClick={()=>{addAct(type);setTab("build");}}>
                    <div style={{position:"absolute",top:9,right:9,display:"grid",gridTemplateColumns:"repeat(2,3px)",gap:2.5,opacity:0.28}}>
                      {[...Array(6)].map((_,i)=><div key={i} style={{width:3,height:3,borderRadius:"50%",background:m.color}}/>)}
                    </div>
                    <span style={{fontSize:26}}>{m.icon}</span>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:12.5,fontWeight:700,color:m.color}}>{m.label}</div>
                    <div style={{fontSize:11,color:`${m.color}bb`,lineHeight:1.45}}>{m.desc}</div>
                    <div style={{fontSize:10,color:`${m.color}88`,fontWeight:600,marginTop:1}}>💡 {m.hint}</div>
                  </div>
                );})}
              </div>
            </>
          )}

          {/* TEMPLATES */}
          {tab==="templates" && (
            <>
              <input value={tplSearch} onChange={e=>setTplSearch(e.target.value)} placeholder="Search templates…" className="abp-in" style={{marginBottom:4}} />
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
                {filteredTpls.map((tpl,i)=>{const m=TYPE_META[tpl.type];return(
                  <div key={tpl.id} className="abp-tpl abp-up" style={{animationDelay:`${i*0.04}s`}}>
                    <div style={{background:`linear-gradient(135deg,${m.bg},${m.bg}cc)`,padding:"13px 14px 10px",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                        <span style={{fontSize:24}}>{m.icon}</span>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:12.5,fontWeight:700,color:"#0f0a2a",lineHeight:1.2,marginBottom:4}}>{tpl.name}</div>
                          <span style={{display:"inline-block",padding:"1px 7px",borderRadius:10,background:`${m.color}18`,color:m.color,fontSize:9.5,fontWeight:700}}>{m.label}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{padding:"10px 14px"}}>
                      <p style={{fontSize:11.5,color:"#7c65a8",margin:"0 0 9px",lineHeight:1.55}}>{tpl.desc}</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                        {tpl.tags.map(tag=><span key={tag} style={{padding:"2px 7px",borderRadius:20,background:"rgba(109,40,217,0.07)",color:"#6d28d9",fontSize:9.5,fontWeight:600}}>{tag}</span>)}
                      </div>
                      <button className="abp-save" style={{width:"100%",padding:"8px",fontSize:12,justifyContent:"center"}}
                        onClick={()=>{const a={...dc(tpl.activity),id:mkId()};setActs(prev=>[...prev,a]);setExpanded(prev=>new Set([...prev,a.id]));setTab("build");}}>
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12"/></svg>
                        Insert into Build
                      </button>
                    </div>
                  </div>
                );})}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="abp-footer">
          <div style={{flex:1,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {Array.from(new Set(acts.map(a=>a.type))).map(type=>{
              const m=TYPE_META[type]; const count=acts.filter(a=>a.type===type).length;
              return <span key={type} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,background:m.bg,color:m.color,fontSize:10,fontWeight:700,border:`1px solid ${m.border}`}}>{m.icon} {count}</span>;
            })}
          </div>
          <button className="abp-ghost-btn" onClick={handleClose}>Cancel</button>
          <button className="abp-save" onClick={handleSave} disabled={acts.length===0}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M2 7l4 4 6-6"/></svg>
            Save {acts.length>0 ? `${acts.length} activit${acts.length===1?"y":"ies"}` : "to Chapter"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRIGGER BUTTON — compact pill for the chapter editor header
// ══════════════════════════════════════════════════════════════════════════════
export function ActivityBuilderTrigger({ activities, onSave, chapterLabel }: {
  activities: Activity[]; onSave:(a:Activity[])=>void; chapterLabel?:string;
}) {
  const [open, setOpen] = useState(false);
  const count = activities.length;
  return (
    <>
      <button
        onClick={()=>setOpen(true)}
        style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:9,border:`1.5px solid ${count>0?"rgba(109,40,217,0.3)":"rgba(109,40,217,0.16)"}`,background:count>0?"#ede9fe":"#f5f3ff",color:"#6d28d9",fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .14s",flexShrink:0}}
        onMouseEnter={e=>{e.currentTarget.style.background="#e0d9ff";e.currentTarget.style.borderColor="rgba(109,40,217,0.45)";e.currentTarget.style.transform="translateY(-1px)";}}
        onMouseLeave={e=>{e.currentTarget.style.background=count>0?"#ede9fe":"#f5f3ff";e.currentTarget.style.borderColor=count>0?"rgba(109,40,217,0.3)":"rgba(109,40,217,0.16)";e.currentTarget.style.transform="none";}}
      >
        <span style={{fontSize:13}}>🧩</span>
        Activities
        {count>0 && <span style={{padding:"1px 6px",borderRadius:20,background:"rgba(109,40,217,0.15)",fontSize:9.5,fontWeight:700}}>{count}</span>}
      </button>
      <ActivityBuilderPanel
        open={open} onClose={()=>setOpen(false)}
        activities={activities}
        onSave={a=>{onSave(a);setOpen(false);}}
        dropTargetLabel={chapterLabel}
      />
    </>
  );
}
