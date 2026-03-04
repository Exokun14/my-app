'use client'

import { useState, useRef, useEffect } from "react";

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
}
export type LessonBlockKind = "content" | "activity";
export interface LessonBlock { id: string; kind: LessonBlockKind; body?: string; activity?: Activity; }

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
export function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
export function blankActivity(type: SegmentType): Activity {
  const b = { id: mkId(), type, title: "" };
  switch (type) {
    case "accordion": return { ...b, items:     [{ q:"", a:"" }] };
    case "flashcard": return { ...b, cards:     [{ front:"", back:"" }] };
    case "fillblank": return { ...b, questions: [{ sentence:"Type a sentence with __BLANK__ here.", blanks:[""] }] };
    case "checklist":
    case "hotspot":   return { ...b, checklist: [{ text:"" }] };
    case "matching":  return { ...b, pairs:     [{ left:"", right:"" }] };
  }
}
export function blankContentBlock(): LessonBlock { return { id: mkId(), kind: "content", body: "" }; }

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES: Array<{id:string;name:string;type:SegmentType;tags:string[];desc:string;activity:Activity}> = [
  { id:"t1", name:"POS Key Terms",      type:"accordion", tags:["Glossary"], desc:"Expandable glossary of key terms",
    activity:{ id:mkId(),type:"accordion",title:"POS Key Terms",items:[{q:"What is a POS System?",a:"Hardware + software for transactions."},{q:"What is a PED?",a:"PIN Entry Device — the card reader."},{q:"What is an EOD Report?",a:"End-of-Day report for cash reconciliation."}] } },
  { id:"t2", name:"Hardware Flashcards",type:"flashcard", tags:["Memory"],   desc:"Flip-cards for hardware recall",
    activity:{ id:mkId(),type:"flashcard",title:"POS Hardware",cards:[{front:"Touchscreen Terminal",back:"Primary cashier interface."},{front:"Thermal Printer",back:"Uses heat, not ink."},{front:"Cash Drawer",back:"Opens automatically on cash transactions."}] } },
  { id:"t3", name:"Opening Checklist",  type:"checklist", tags:["SOP"],      desc:"Morning opening procedure steps",
    activity:{ id:mkId(),type:"checklist",title:"Opening Shift",checklist:[{text:"Verify cash float"},{text:"Power on POS"},{text:"Test barcode scanner"},{text:"Log in with credentials"}] } },
  { id:"t4", name:"Hardware Matching",  type:"matching",  tags:["Quiz"],     desc:"Match hardware to functions",
    activity:{ id:mkId(),type:"matching",title:"Match the Hardware",pairs:[{left:"Touchscreen",right:"Main cashier input"},{left:"Barcode Scanner",right:"Reads product codes"},{left:"Cash Drawer",right:"Stores physical currency"}] } },
  { id:"t5", name:"Fill-in-Blank",      type:"fillblank", tags:["Recall"],   desc:"Test recall of transaction steps",
    activity:{ id:mkId(),type:"fillblank",title:"Transaction Procedures",questions:[{sentence:"For cash payments enter the __BLANK__ amount first.",blanks:["tendered"]},{sentence:"Always obtain __BLANK__ before voiding.",blanks:["supervisor approval"]}] } },
  { id:"t6", name:"EOD Procedure",      type:"hotspot",   tags:["Closing"],  desc:"End-of-day walkthrough",
    activity:{ id:mkId(),type:"hotspot",title:"End-of-Day Procedure",checklist:[{text:"Run EOD report"},{text:"Count cash"},{text:"Secure cash in safe"},{text:"Log out all sessions"},{text:"Power down terminals"}] } },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
export const BUILDER_CSS = `
.ab-r,.ab-r *,.ab-r *::before,.ab-r *::after{box-sizing:border-box;margin:0;padding:0;}
.ab-r{font-family:'Plus Jakarta Sans',sans-serif;}
.ab-r *{scrollbar-width:thin;scrollbar-color:rgba(109,40,217,0.12) transparent;}
.ab-r ::-webkit-scrollbar{width:4px;}
.ab-r ::-webkit-scrollbar-thumb{background:rgba(109,40,217,0.14);border-radius:4px;}
@keyframes ab-back{from{opacity:0}to{opacity:1}}
@keyframes ab-in  {from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ab-out {from{opacity:1;transform:none}to{opacity:0;transform:translateY(5px) scale(.98)}}
@keyframes ab-up  {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes ab-dz  {0%,100%{border-color:rgba(109,40,217,0.22)}50%{border-color:rgba(109,40,217,0.45)}}
@keyframes ab-stp {from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
.ab-backdrop{position:fixed;inset:0;z-index:900;background:rgba(15,10,40,0.3);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;animation:ab-back .18s ease both;padding:24px;}
.ab-backdrop.ab-out{animation:ab-back .14s ease reverse both;}
.ab-panel{width:100%;max-width:480px;max-height:82vh;background:#fff;border-radius:14px;border:1px solid var(--border,rgba(109,40,217,0.1));box-shadow:0 20px 56px rgba(15,10,40,0.14),0 4px 14px rgba(0,0,0,0.06);display:flex;flex-direction:column;overflow:hidden;animation:ab-in .22s cubic-bezier(.16,1,.3,1) both;}
.ab-panel.ab-out{animation:ab-out .15s ease both;}
.ab-panel.ab-floating{position:fixed;}
.ab-hd{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border,#ede9f6);background:#fff;flex-shrink:0;}
.ab-hd-ico{width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;background:var(--purple-lt,#f0ebff);}
.ab-hd-title{font-size:13.5px;font-weight:700;color:var(--t1,#18103a);line-height:1.2;}
.ab-hd-sub{font-size:10px;color:var(--t3,#8e7ec0);margin-top:1px;}
.ab-close{width:28px;height:28px;border-radius:7px;border:none;background:transparent;cursor:pointer;margin-left:auto;display:flex;align-items:center;justify-content:center;color:var(--t3,#a89dc8);flex-shrink:0;transition:all .12s;}
.ab-close:hover{background:#f5f0ff;color:var(--t2,#4a3870);}
.ab-body{flex:1;overflow-y:auto;padding:14px 16px;}
.ab-stp{margin-bottom:16px;animation:ab-stp .3s cubic-bezier(.16,1,.3,1) both;}
.ab-stp:nth-child(1){animation-delay:0s;}
.ab-stp:nth-child(2){animation-delay:.04s;}
.ab-stp:nth-child(3){animation-delay:.08s;}
.ab-stp:nth-child(4){animation-delay:.12s;}
.ab-stp:nth-child(5){animation-delay:.16s;}
.ab-lbl{display:block;font-size:11.5px;font-weight:700;color:var(--t2,#4a3870);margin-bottom:6px;}
.ab-in,.ab-ta,.ab-sel{width:100%;padding:9px 11px;border-radius:8px;border:1.5px solid var(--border,#e8e3f3);background:#fff;color:var(--t1,#18103a);font-size:12px;font-family:inherit;transition:all .15s;}
.ab-in:focus,.ab-ta:focus,.ab-sel:focus{outline:none;border-color:var(--purple,#6d28d9);box-shadow:0 0 0 3px rgba(109,40,217,0.06);}
.ab-in::placeholder,.ab-ta::placeholder{color:#c5bdd9;}
.ab-ta{resize:vertical;min-height:70px;line-height:1.5;}
.ab-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px;}
.ab-type{padding:9px;border-radius:9px;border:1.5px solid var(--border,#ede9f6);background:#fff;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;}
.ab-type:hover{border-color:rgba(109,40,217,0.25);background:rgba(109,40,217,0.02);transform:translateY(-1px);}
.ab-type.sel{border-color:var(--purple,#6d28d9);background:#f5f0ff;box-shadow:0 2px 8px rgba(109,40,217,0.12);}
.ab-type-ico{font-size:20px;line-height:1;}
.ab-type-lbl{font-size:10.5px;font-weight:700;color:var(--t2,#4a3870);}
.ab-type-desc{font-size:9px;color:var(--t3,#a89dc8);line-height:1.3;}
.ab-items{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.ab-item{background:#faf9ff;border:1.5px solid var(--border,#ede9f6);border-radius:9px;padding:10px;display:flex;flex-direction:column;gap:7px;animation:ab-up .2s cubic-bezier(.16,1,.3,1) both;}
.ab-item-hdr{display:flex;align-items:center;gap:7px;}
.ab-item-n{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ab-item-del{width:22px;height:22px;border-radius:6px;border:1.5px solid rgba(239,68,68,0.18);background:rgba(239,68,68,0.04);color:#dc2626;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-left:auto;transition:all .12s;}
.ab-item-del:hover{background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.35);}
.ab-add{width:100%;padding:9px;border-radius:9px;border:1.5px dashed var(--border,#e8e3f3);background:transparent;color:var(--purple,#6d28d9);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;margin-top:8px;}
.ab-add:hover{border-color:var(--purple,#6d28d9);background:rgba(109,40,217,0.03);}
.ab-tmpl{margin-top:10px;}
.ab-tmpl-title{font-size:10px;font-weight:700;color:var(--t3,#a89dc8);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.ab-tmpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.ab-tmpl-card{padding:8px 10px;border-radius:8px;border:1.5px solid var(--border,#ede9f6);background:#fff;cursor:pointer;transition:all .15s;}
.ab-tmpl-card:hover{border-color:rgba(109,40,217,0.25);background:rgba(109,40,217,0.02);transform:translateY(-1px);}
.ab-tmpl-name{font-size:11px;font-weight:700;color:var(--t1,#18103a);margin-bottom:2px;}
.ab-tmpl-desc{font-size:9px;color:var(--t3,#a89dc8);line-height:1.3;}
.ab-foot{padding:12px 16px;border-top:1px solid var(--border,#ede9f6);display:flex;gap:8px;background:#fff;flex-shrink:0;}
.ab-btn{flex:1;padding:9px 14px;border-radius:9px;font-size:12.5px;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;}
.ab-btn-c{background:transparent;border:1.5px solid var(--border,#e8e3f3);color:var(--t2,#4a3870);}
.ab-btn-c:hover{background:#faf9ff;border-color:rgba(109,40,217,0.2);}
.ab-btn-p{background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));color:#fff;box-shadow:0 3px 10px rgba(124,58,237,0.25);}
.ab-btn-p:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(124,58,237,0.35);}
.ab-btn-p:active{transform:translateY(0);}

/* ── LessonBlocks CSS ── */
.lb-empty{padding:32px;text-align:center;border-radius:10px;border:1.5px dashed var(--border,#e8e3f3);background:#fefeff;}
.lb-add{display:flex;align-items:center;gap:8px;margin-top:12px;padding:10px 0;}
.lb-add-sep{width:1px;height:20px;background:var(--border,#e8e3f3);}
.lb-add-btn{flex:1;padding:9px 12px;border-radius:9px;border:1.5px solid var(--border,#e8e3f3);background:#fff;color:var(--t2,#4a3870);font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}
.lb-add-btn:hover{border-color:rgba(109,40,217,0.22);background:#faf9ff;transform:translateY(-1px);}
.lb-add-btn.content{color:#0369a1;}
.lb-add-btn.activity{color:var(--purple,#6d28d9);}
.lb-block{background:var(--surface,#fff);border:1.5px solid var(--border,#ede9f6);border-radius:10px;margin-bottom:10px;transition:all .15s;}
.lb-block:hover{border-color:rgba(109,40,217,0.18);}
.lb-block.dragging{opacity:.5;border-style:dashed;}
.lb-block.over{border-color:var(--purple,#6d28d9);box-shadow:0 2px 8px rgba(109,40,217,0.15);}
.lb-hdr{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:move;}
.lb-hdr-grip{width:16px;height:16px;flex-shrink:0;opacity:.3;display:flex;align-items:center;justify-content:center;}
.lb-hdr-ico{width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;}
.lb-hdr-title{flex:1;font-size:12px;font-weight:700;color:var(--t1,#18103a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lb-hdr-lbl{font-size:9px;color:var(--t3,#a89dc8);padding:2px 6px;border-radius:4px;background:rgba(109,40,217,0.06);font-weight:700;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0;}
.lb-hdr-del{width:24px;height:24px;border-radius:6px;border:none;background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--t3,#a89dc8);transition:all .12s;}
.lb-hdr-del:hover{background:rgba(239,68,68,0.1);color:#dc2626;}
.lb-body{padding:0 12px 12px 12px;}
.ab-ta{width:100%;padding:9px 11px;border-radius:8px;border:1.5px solid var(--border,#e8e3f3);background:#fff;color:var(--t1,#18103a);font-size:12px;font-family:inherit;resize:vertical;min-height:70px;line-height:1.5;}
.lb-prev-row{font-size:11px;color:var(--t2,#4a3870);line-height:1.6;padding:4px 0;}
.lb-dz{height:32px;border-radius:8px;border:2px dashed transparent;margin:6px 0;transition:all .18s;}
.lb-dz.on{border-color:var(--purple,#6d28d9);background:rgba(109,40,217,0.05);animation:ab-dz 1.2s ease-in-out infinite;}
`;

// ─── ActivityBuilderPanel ─────────────────────────────────────────────────────
export interface ActivityBuilderPanelProps {
  open: boolean;
  editingAct: Activity | null;
  insertAtIdx?: number;
  onSave: (act: Activity, atIdx?: number) => void;
  onClose: () => void;
}

export default function ActivityBuilderPanel({ open, editingAct, insertAtIdx, onSave, onClose }: ActivityBuilderPanelProps) {
  const [step,    setStep]    = useState(1);
  const [type,    setType]    = useState<SegmentType>("accordion");
  const [title,   setTitle]   = useState("");
  const [items,   setItems]   = useState<any[]>([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingAct) {
        setStep(2);
        setType(editingAct.type);
        setTitle(editingAct.title);
        switch (editingAct.type) {
          case "accordion": setItems(editingAct.items ?? []); break;
          case "flashcard": setItems(editingAct.cards ?? []); break;
          case "fillblank": setItems(editingAct.questions ?? []); break;
          case "checklist":
          case "hotspot":   setItems(editingAct.checklist ?? []); break;
          case "matching":  setItems(editingAct.pairs ?? []); break;
        }
      } else {
        setStep(1);
        setType("accordion");
        setTitle("");
        setItems([]);
      }
      setClosing(false);
    }
  }, [open, editingAct]);

  if (!open) return null;

  const meta = ACT_META[type];

  const selectType = (t: SegmentType) => {
    setType(t);
    setStep(2);
    setTitle("");
    switch (t) {
      case "accordion": setItems([{ q:"", a:"" }]); break;
      case "flashcard": setItems([{ front:"", back:"" }]); break;
      case "fillblank": setItems([{ sentence:"Type a sentence with __BLANK__ here.", blanks:[""] }]); break;
      case "checklist":
      case "hotspot":   setItems([{ text:"" }]); break;
      case "matching":  setItems([{ left:"", right:"" }]); break;
    }
  };

  const loadTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setType(tmpl.type);
    setTitle(tmpl.activity.title);
    setStep(2);
    switch (tmpl.type) {
      case "accordion": setItems(dc(tmpl.activity.items ?? [])); break;
      case "flashcard": setItems(dc(tmpl.activity.cards ?? [])); break;
      case "fillblank": setItems(dc(tmpl.activity.questions ?? [])); break;
      case "checklist":
      case "hotspot":   setItems(dc(tmpl.activity.checklist ?? [])); break;
      case "matching":  setItems(dc(tmpl.activity.pairs ?? [])); break;
    }
  };

  const addItem = () => {
    switch (type) {
      case "accordion": setItems([...items, { q:"", a:"" }]); break;
      case "flashcard": setItems([...items, { front:"", back:"" }]); break;
      case "fillblank": setItems([...items, { sentence:"Type a sentence with __BLANK__ here.", blanks:[""] }]); break;
      case "checklist":
      case "hotspot":   setItems([...items, { text:"" }]); break;
      case "matching":  setItems([...items, { left:"", right:"" }]); break;
    }
  };

  const delItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updItem = (idx: number, k: string, v: any) => setItems(items.map((x, i) => i === idx ? { ...x, [k]: v } : x));

  const handleSave = () => {
    const act: Activity = { id: editingAct?.id ?? mkId(), type, title };
    switch (type) {
      case "accordion": act.items = items; break;
      case "flashcard": act.cards = items; break;
      case "fillblank": act.questions = items; break;
      case "checklist":
      case "hotspot":   act.checklist = items; break;
      case "matching":  act.pairs = items; break;
    }
    onSave(act, insertAtIdx);
    handleClose();
  };

  const handleClose = () => { setClosing(true); setTimeout(onClose, 150); };

  return (
    <>
      <style>{BUILDER_CSS}</style>
      <div className={`ab-r ab-backdrop${closing?" ab-out":""}`} onClick={handleClose}>
        <div className={`ab-panel${closing?" ab-out":""}`} onClick={e=>e.stopPropagation()}>
          <div className="ab-hd">
            <div className="ab-hd-ico">🧩</div>
            <div style={{flex:1}}>
              <div className="ab-hd-title">{editingAct?"Edit Activity":"New Activity"}</div>
              <div className="ab-hd-sub">{editingAct?"Update existing activity":"Choose a type and build"}</div>
            </div>
            <button className="ab-close" onClick={handleClose}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
            </button>
          </div>

          <div className="ab-body">
            {/* Step 1: Type selection */}
            {step===1 && (
              <>
                <div className="ab-stp">
                  <label className="ab-lbl">Activity Type</label>
                  <div className="ab-grid">
                    {ALL_TYPES.map(t => {
                      const m = ACT_META[t];
                      return (
                        <div key={t} className={`ab-type${type===t?" sel":""}`} onClick={()=>setType(t)}>
                          <div className="ab-type-ico">{m.icon}</div>
                          <div className="ab-type-lbl">{m.label}</div>
                          <div className="ab-type-desc">{m.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ab-tmpl">
                  <div className="ab-tmpl-title">Or pick a template</div>
                  <div className="ab-tmpl-grid">
                    {TEMPLATES.map(tmpl => (
                      <div key={tmpl.id} className="ab-tmpl-card" onClick={()=>loadTemplate(tmpl)}>
                        <div className="ab-tmpl-name">{ACT_META[tmpl.type].icon} {tmpl.name}</div>
                        <div className="ab-tmpl-desc">{tmpl.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Content editing */}
            {step===2 && (
              <>
                <div className="ab-stp">
                  <label className="ab-lbl">Activity Title</label>
                  <input className="ab-in" value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${meta.label} title...`}/>
                </div>

                <div className="ab-stp">
                  <label className="ab-lbl">{meta.icon} {meta.label} Items</label>
                  <div className="ab-items">
                    {items.map((item, idx) => (
                      <div key={idx} className="ab-item">
                        <div className="ab-item-hdr">
                          <div className="ab-item-n">{idx+1}</div>
                          <button className="ab-item-del" onClick={()=>delItem(idx)}>×</button>
                        </div>
                        {type==="accordion" && (
                          <>
                            <input className="ab-in" value={item.q} onChange={e=>updItem(idx,"q",e.target.value)} placeholder="Question..."/>
                            <textarea className="ab-ta" value={item.a} onChange={e=>updItem(idx,"a",e.target.value)} placeholder="Answer..."/>
                          </>
                        )}
                        {type==="flashcard" && (
                          <>
                            <input className="ab-in" value={item.front} onChange={e=>updItem(idx,"front",e.target.value)} placeholder="Front..."/>
                            <textarea className="ab-ta" value={item.back} onChange={e=>updItem(idx,"back",e.target.value)} placeholder="Back..."/>
                          </>
                        )}
                        {type==="fillblank" && (
                          <>
                            <input className="ab-in" value={item.sentence} onChange={e=>updItem(idx,"sentence",e.target.value)} placeholder="Type sentence with __BLANK__..."/>
                            <input className="ab-in" value={item.blanks[0]??""} onChange={e=>updItem(idx,"blanks",[e.target.value])} placeholder="Correct answer..."/>
                          </>
                        )}
                        {(type==="checklist"||type==="hotspot") && (
                          <input className="ab-in" value={item.text} onChange={e=>updItem(idx,"text",e.target.value)} placeholder="Task item..."/>
                        )}
                        {type==="matching" && (
                          <>
                            <input className="ab-in" value={item.left} onChange={e=>updItem(idx,"left",e.target.value)} placeholder="Left side..."/>
                            <input className="ab-in" value={item.right} onChange={e=>updItem(idx,"right",e.target.value)} placeholder="Right side..."/>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="ab-add" onClick={addItem}>+ Add Item</button>
                </div>
              </>
            )}
          </div>

          <div className="ab-foot">
            {step===2 && !editingAct && (
              <button className="ab-btn ab-btn-c" onClick={()=>setStep(1)}>← Back</button>
            )}
            <button className="ab-btn ab-btn-c" onClick={handleClose}>Cancel</button>
            {step===1 ? (
              <button className="ab-btn ab-btn-p" onClick={()=>selectType(type)}>Continue →</button>
            ) : (
              <button className="ab-btn ab-btn-p" onClick={handleSave}>
                {editingAct?"Save Changes":"Add Activity"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── BlockItem (structure-only view) ───────────────────────────────────────────
function BlockItem({ block, expanded, onToggle, onChange, onDelete, onEdit, isDragging, isDragOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }: {
  block:LessonBlock; expanded:boolean; onToggle:()=>void; onChange:(b:LessonBlock)=>void; onDelete:()=>void; onEdit:()=>void;
  isDragging:boolean; isDragOver:boolean; onDragStart:(e:React.DragEvent)=>void; onDragEnd:()=>void; onDragOver:(e:React.DragEvent)=>void; onDragLeave:(e:React.DragEvent)=>void; onDrop:(e:React.DragEvent)=>void;
}) {
  const isContent = block.kind==="content";
  const act = block.activity;
  const m = act ? ACT_META[act.type] : null;
  const itemCount = act ? (act.items?.length ?? act.cards?.length ?? act.questions?.length ?? act.checklist?.length ?? act.pairs?.length ?? 0) : 0;

  return (
    <div className={`lb-block${isDragging?" dragging":""}${isDragOver?" over":""}`}
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className="lb-hdr" onClick={onToggle}>
        <div className="lb-hdr-grip">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/><circle cx="10" cy="2" r="1.5"/><circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/><circle cx="10" cy="6" r="1.5"/></svg>
        </div>
        <div className="lb-hdr-ico" style={{background:isContent?"#e0f2fe":"#f0ebff"}}>
          {isContent ? "📄" : m?.icon}
        </div>
        <div className="lb-hdr-title">
          {isContent ? "Content Block" : (act?.title || <em style={{opacity:.4}}>Untitled Activity</em>)}
        </div>
        <div className="lb-hdr-lbl">{isContent ? "Content" : m?.label}</div>
        <button className="lb-hdr-del" onClick={e=>{e.stopPropagation();onDelete();}}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
        </button>
        <svg width="9" height="6" viewBox="0 0 10 7" fill="none" style={{transform:expanded?"rotate(180deg)":"none",transition:"transform .18s",flexShrink:0,opacity:.4}}><path d="M1 1l4 4 4-4" stroke="#7c3aed" fill="none" strokeWidth="2"/></svg>
      </div>
      {expanded&&(
        <div className="lb-body">
          {isContent ? (
            <div style={{padding:"10px 12px",borderRadius:8,background:"#faf9ff",border:"1.5px solid #ede9f6"}}>
              <div style={{fontSize:11,color:"#8e7ec0",lineHeight:1.5}}>
                {block.body ? (
                  <>{block.body.slice(0,120)}{block.body.length>120&&"..."}</>
                ) : (
                  <em style={{opacity:.5}}>No content yet — edit in Content tab</em>
                )}
              </div>
            </div>
          ) : act&&m ? (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,paddingBottom:7,borderBottom:"1px solid #f0ebfa"}}>
                <span style={{fontSize:14}}>{m.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:m.color}}>{act.title||<em style={{opacity:.4}}>Untitled</em>}</span>
                <span style={{fontSize:10,color:"#c5bdd9",marginLeft:"auto"}}>{itemCount} item{itemCount!==1?"s":""}</span>
              </div>
              {act.items?.slice(0,2).map((x,i)=><div key={i} className="lb-prev-row">• {x.q||<em style={{opacity:.4}}>empty</em>}</div>)}
              {act.cards?.slice(0,2).map((x,i)=><div key={i} className="lb-prev-row">• {x.front} <span style={{color:"#c5bdd9"}}>→</span> {x.back||"…"}</div>)}
              {act.checklist?.slice(0,3).map((x,i)=><div key={i} className="lb-prev-row" style={{display:"flex",alignItems:"center",gap:5}}><svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{color:"#15803d",flexShrink:0}}><rect x="1" y="1" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3.5 7l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>{x.text||<em style={{opacity:.4}}>empty</em>}</div>)}
              {act.pairs?.slice(0,2).map((x,i)=><div key={i} className="lb-prev-row">• {x.left} <span style={{color:"#c5bdd9"}}>↔</span> {x.right}</div>)}
              {act.questions?.slice(0,2).map((x,i)=><div key={i} className="lb-prev-row">• {x.sentence.replace("__BLANK__","___")}</div>)}
              {itemCount>3&&<div style={{fontSize:10,color:"#c5bdd9",marginTop:4}}>…and {itemCount-3} more</div>}
              <button onClick={onEdit} style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:"1.5px solid var(--border,#e8e3f3)",background:"#fff",color:"var(--purple,#6d28d9)",fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.background="#f5f0ff";}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";}}>✏️ Edit Activity</button>
            </div>
          ):null}
        </div>
      )}
    </div>
  );
}

function DropZone({ active, onOver, onLeave, onDrop }: {active:boolean;onOver:()=>void;onLeave:()=>void;onDrop:(e:React.DragEvent)=>void}) {
  return <div className={"ab-r lb-dz"+(active?" on":"")} onDragOver={e=>{e.preventDefault();onOver();}} onDragLeave={onLeave} onDrop={e=>{e.preventDefault();onDrop(e);}}/>;
}

// ── LessonBlocks (now structure-focused) ──────────────────────────────────────
export interface LessonBlocksProps { blocks: LessonBlock[]; onChange: (blocks:LessonBlock[]) => void; chapterTitle?: string; }

export function LessonBlocks({ blocks, onChange }: LessonBlocksProps) {
  const [expanded,    setExpanded]    = useState<Set<string>>(()=>new Set(blocks.slice(0,1).map(b=>b.id)));
  const [dragSrc,     setDragSrc]     = useState<number|null>(null);
  const [dragOver,    setDragOver]    = useState<number|null>(null);
  const [dzOver,      setDzOver]      = useState<number|null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAct,  setEditingAct]  = useState<Activity|null>(null);
  const [editingId,   setEditingId]   = useState<string|null>(null);
  const [insertIdx,   setInsertIdx]   = useState<number|undefined>(undefined);
  const toggle=(id:string)=>setExpanded(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});
  const openEdit=(blockId:string)=>{const bl=blocks.find(b=>b.id===blockId);if(!bl?.activity)return;setEditingAct(bl.activity);setEditingId(blockId);setInsertIdx(undefined);setBuilderOpen(true);};
  const handleSave=(act:Activity,atIdx?:number)=>{
    if(editingId){onChange(blocks.map(b=>b.id===editingId?{...b,activity:act}:b));}
    else{const nb:LessonBlock={id:mkId(),kind:"activity",activity:act};const u=[...blocks];if(atIdx!==undefined)u.splice(atIdx,0,nb);else u.push(nb);onChange(u);setExpanded(p=>new Set([...p,nb.id]));}
  };
  const del=(id:string)=>{onChange(blocks.filter(b=>b.id!==id));setExpanded(p=>{const s=new Set(p);s.delete(id);return s;});};
  const onDS=(e:React.DragEvent,i:number)=>{setDragSrc(i);e.dataTransfer.effectAllowed="move";};
  const onDE=()=>{setDragSrc(null);setDragOver(null);setDzOver(null);};
  const onDO=(e:React.DragEvent,i:number)=>{e.preventDefault();setDragOver(i);setDzOver(null);};
  const onDL=(e:React.DragEvent)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragOver(null);};
  const onDD=(e:React.DragEvent,to:number)=>{e.preventDefault();if(dragSrc===null||dragSrc===to){setDragSrc(null);setDragOver(null);return;}const u=dc(blocks)as LessonBlock[];const[mv]=u.splice(dragSrc,1);u.splice(to,0,mv);onChange(u);setDragSrc(null);setDragOver(null);};
  const onZO=(g:number)=>{setDzOver(g);setDragOver(null);};
  const onZL=()=>setDzOver(null);
  const onZD=(e:React.DragEvent,g:number)=>{e.preventDefault();if(dragSrc===null)return;const u=dc(blocks)as LessonBlock[];const[mv]=u.splice(dragSrc,1);u.splice(g>dragSrc?g-1:g,0,mv);onChange(u);setDragSrc(null);setDzOver(null);};
  return (
    <div className="ab-r" style={{display:"flex",flexDirection:"column"}}>
      {blocks.length===0&&(<div className="lb-empty"><div style={{fontSize:22,opacity:.28}}>✦</div><div style={{fontSize:12.5,fontWeight:600,color:"#8b7cb4"}}>No content yet</div><div style={{fontSize:11,color:"#c5bdd9",lineHeight:1.6,maxWidth:200}}>Use the top buttons to add content blocks or activities.</div></div>)}
      {dragSrc!==null&&<DropZone active={dzOver===0} onOver={()=>onZO(0)} onLeave={onZL} onDrop={e=>onZD(e,0)}/>}
      {blocks.map((block,idx)=>(
        <div key={block.id}>
          <BlockItem block={block} expanded={expanded.has(block.id)} onToggle={()=>toggle(block.id)} onChange={b=>onChange(blocks.map((x,i)=>i===idx?b:x))} onDelete={()=>del(block.id)} onEdit={()=>openEdit(block.id)} isDragging={dragSrc===idx} isDragOver={dragOver===idx} onDragStart={e=>onDS(e,idx)} onDragEnd={onDE} onDragOver={e=>onDO(e,idx)} onDragLeave={onDL} onDrop={e=>onDD(e,idx)}/>
          {dragSrc!==null&&<DropZone active={dzOver===idx+1} onOver={()=>onZO(idx+1)} onLeave={onZL} onDrop={e=>onZD(e,idx+1)}/>}
        </div>
      ))}
      {builderOpen&&<ActivityBuilderPanel open={builderOpen} editingAct={editingAct} insertAtIdx={insertIdx} onSave={handleSave} onClose={()=>setBuilderOpen(false)}/>}
    </div>
  );
}

export function ChapterActivities({ activities, onSave, chapterLabel }: { activities:Activity[]; onSave:(updated:Activity[])=>void; chapterLabel?:string; }) {
  const blocks:LessonBlock[]=activities.map(a=>({id:a.id,kind:"activity" as LessonBlockKind,activity:a}));
  return <LessonBlocks blocks={blocks} onChange={bs=>onSave(bs.filter(b=>b.activity).map(b=>b.activity!))} chapterTitle={chapterLabel}/>;
}
export function ActivityBuilderTrigger() { return null; }
