'use client'

import { useState, useEffect } from "react";

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
  width:40px; height:40px; border-radius:12px; flex-shrink:0;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  display:flex; align-items:center; justify-content:center; font-size:20px;
}
.abp-hdr-text { flex:1; }
.abp-hdr-title { font-size:16px; font-weight:800; color:var(--t1,#18103a); line-height:1.2; }
.abp-hdr-sub { font-size:12px; color:var(--t3,#8e7ec0); margin-top:2px; }

.abp-body { flex:1; display:flex; overflow:hidden; }

.abp-main { flex:1; display:flex; flex-direction:column; overflow:hidden; padding:24px; }

.abp-section {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:20px; margin-bottom:16px;
}
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
.abp-type-label {
  font-size:13px; font-weight:700; color:var(--t1,#18103a); margin-bottom:4px;
}
.abp-type-desc {
  font-size:11px; color:var(--t3,#a89dc8); line-height:1.4;
}
.abp-type-check {
  width:24px; height:24px; border-radius:6px; flex-shrink:0;
  background:var(--purple,#7c3aed); color:#fff;
  display:flex; align-items:center; justify-content:center;
}

.abp-template-list {
  display:flex; flex-direction:column; gap:10px;
}
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
.abp-template-name {
  font-size:12.5px; font-weight:700; color:var(--t1,#18103a); margin-bottom:3px;
}
.abp-template-desc {
  font-size:10.5px; color:var(--t3,#a89dc8); line-height:1.3;
}
.abp-template-tags {
  display:flex; gap:6px; margin-top:6px;
}
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

.abp-item-list {
  display:flex; flex-direction:column; gap:10px;
}
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
.abp-item-del:hover {
  background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.3);
}

.abp-add-btn {
  width:100%; padding:11px 14px; border-radius:9px;
  border:1.5px dashed var(--border,rgba(124,58,237,0.2));
  background:var(--surface,#fff); color:var(--purple,#7c3aed);
  font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
  display:flex; align-items:center; justify-content:center; gap:7px;
  transition:all .15s;
}
.abp-add-btn:hover {
  border-color:var(--purple,#7c3aed);
  background:rgba(124,58,237,0.04);
}

.abp-foot {
  height:72px; flex-shrink:0;
  display:flex; align-items:center; gap:10px; padding:0 24px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}

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
.btn-s:hover {
  background:rgba(124,58,237,0.04); border-color:rgba(109,40,217,0.2);
}
.btn-p {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; border:none; box-shadow:0 2px 8px rgba(124,58,237,0.25);
}
.btn-p:hover {
  transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.35);
}
.btn-p:active { transform:translateY(0); }
.btn-sm { padding:7px 14px; font-size:11.5px; }
.btn-sm svg { width:12px; height:12px; }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
interface ActivityBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  onSave: (activity: Activity, saveAs: "draft" | "published") => void;
  editActivity: Activity | null;
  toast: (msg: string) => void;
  allActivities?: Activity[]; // NEW: To show existing activities
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

  const [viewMode, setViewMode] = useState<"create" | "library">("create"); // NEW: Toggle between create and library
  const [step, setStep] = useState<1 | 2>(1);
  const [activity, setActivity] = useState<Activity>(blankActivity("accordion"));
  const [selectedType, setSelectedType] = useState<SegmentType | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && editActivity) {
      setActivity(dc(editActivity));
      setSelectedType(editActivity.type);
      setStep(2);
      setViewMode("create");
    } else {
      setActivity(blankActivity("accordion"));
      setSelectedType(null);
      setStep(1);
      setViewMode("create");
    }
    setClosing(false);
  }, [open, isEdit, editActivity]);

  const handleTypeSelect = (type: SegmentType) => {
    setSelectedType(type);
    setActivity(blankActivity(type));
  };

  const handleTemplateSelect = (template: typeof TEMPLATES[0]) => {
    setSelectedType(template.type);
    setActivity(dc(template.activity));
    setStep(2);
  };

  const handleNext = () => {
    if (step === 1 && !selectedType) {
      toast("Please select an activity type.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = (saveAs: "draft" | "published") => {
    if (!activity.title.trim()) {
      toast("Please enter an activity title.");
      return;
    }

    const itemCount = getActivityItemCount(activity);
    if (itemCount === 0) {
      toast("Please add at least one item to your activity.");
      return;
    }

    onSave({ ...activity, status: saveAs }, saveAs);
    handleClose();
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 150);
  };

  const getActivityItemCount = (act: Activity): number => {
    if (act.items) return act.items.length;
    if (act.cards) return act.cards.length;
    if (act.questions) return act.questions.length;
    if (act.checklist) return act.checklist.length;
    if (act.pairs) return act.pairs.length;
    return 0;
  };

  const footerNote = step === 1
    ? selectedType ? `Click next to build your ${ACT_META[selectedType].label}` : "Select an activity type to continue"
    : !activity.title.trim()
      ? "Enter a title to continue"
      : getActivityItemCount(activity) === 0
        ? "Add at least one item"
        : `${getActivityItemCount(activity)} item${getActivityItemCount(activity) === 1 ? "" : "s"} added`;

  const footerNoteColor = (step === 1 && !selectedType) || (step === 2 && (!activity.title.trim() || getActivityItemCount(activity) === 0))
    ? "var(--t3)"
    : "var(--teal)";

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className={`abp-fs${closing ? " closing" : ""}`}>
        
        {/* Header */}
        <div className="abp-hdr">
          <div className="abp-hdr-ico">🧩</div>
          <div className="abp-hdr-text">
            <div className="abp-hdr-title">
              {isEdit ? "Edit Activity" : "Create New Activity"}
            </div>
            <div className="abp-hdr-sub">
              {step === 1 ? "Choose an activity type or template" : `Building ${ACT_META[activity.type]?.label}`}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        {!isEdit && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "12px 24px",
            background: "var(--bg,#f8f7ff)",
            borderBottom: "1px solid var(--border,rgba(124,58,237,0.1))",
          }}>
            <button
              onClick={() => setViewMode("create")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: viewMode === "create" ? "var(--purple,#7c3aed)" : "transparent",
                color: viewMode === "create" ? "#fff" : "var(--t2,#4a3870)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Create New
            </button>
            <button
              onClick={() => setViewMode("library")}
              style={{
                flex: 1,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: viewMode === "library" ? "var(--purple,#7c3aed)" : "transparent",
                color: viewMode === "library" ? "#fff" : "var(--t2,#4a3870)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              Library
              {allActivities.length > 0 && (
                <span style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: viewMode === "library" ? "rgba(255,255,255,0.2)" : "rgba(124,58,237,0.1)",
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {allActivities.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="abp-body">
          {viewMode === "library" ? (
            /* Library View */
            <div className="abp-main" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1,#18103a)", marginBottom: 4 }}>
                  Activity Library
                </div>
                <div style={{ fontSize: 11.5, color: "var(--t3,#a89dc8)" }}>
                  {allActivities.length} activit{allActivities.length === 1 ? "y" : "ies"} · 
                  {' '}{allActivities.filter(a => a.status === "published").length} published
                </div>
              </div>

              {allActivities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--t3,#a89dc8)" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🧩</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No activities yet</div>
                  <div style={{ fontSize: 12 }}>Switch to "Create New" to build your first activity</div>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 12,
                  overflowY: "auto",
                  flex: 1,
                }}>
                  {allActivities.map(act => {
                    const meta = ACT_META[act.type];
                    const itemCount = getActivityItemCount(act);
                    return (
                      <div
                        key={act.id}
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          border: "1.5px solid var(--border,rgba(124,58,237,0.1))",
                          background: "var(--bg,#faf9ff)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(124,58,237,0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(124,58,237,0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        onClick={() => {
                          setActivity(dc(act));
                          setSelectedType(act.type);
                          setStep(2);
                          setViewMode("create");
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 9,
                            background: meta.bg,
                            color: meta.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                          }}>
                            {meta.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "var(--t1,#18103a)",
                              marginBottom: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}>
                              {act.title || "Untitled"}
                            </div>
                            <div style={{
                              fontSize: 10,
                              color: "var(--t3,#a89dc8)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              fontWeight: 600,
                            }}>
                              {meta.label} · {itemCount} items
                            </div>
                          </div>
                        </div>
                        <div style={{
                          padding: "4px 8px",
                          borderRadius: 5,
                          fontSize: 9.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background: act.status === "published" ? "#d1fae5" : "#fef3c7",
                          color: act.status === "published" ? "#065f46" : "#92400e",
                          textAlign: "center",
                        }}>
                          {act.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Create View */
          <div className="abp-main">{step === 1 ? (
              <>
                {/* Step 1: Type Selection */}
                <div className="abp-section">
                  <div className="abp-sec-hd">
                    <div className="abp-sec-ico" style={{ background: "var(--purple-lt)", color: "var(--purple)" }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="5" height="5" rx="1"/>
                        <rect x="9" y="2" width="5" height="5" rx="1"/>
                        <rect x="2" y="9" width="5" height="5" rx="1"/>
                        <rect x="9" y="9" width="5" height="5" rx="1"/>
                      </svg>
                    </div>
                    <span className="abp-sec-label">Activity Type</span>
                  </div>
                  <div className="abp-type-grid">
                    {ALL_TYPES.map(type => {
                      const meta = ACT_META[type];
                      return (
                        <div
                          key={type}
                          className={`abp-type-card${selectedType === type ? " selected" : ""}`}
                          onClick={() => handleTypeSelect(type)}
                        >
                          <div className="abp-type-icon" style={{ background: meta.bg, border: `1.5px solid ${meta.border}`, color: meta.color }}>
                            {meta.icon}
                          </div>
                          <div className="abp-type-info">
                            <div className="abp-type-label">{meta.label}</div>
                            <div className="abp-type-desc">{meta.desc}</div>
                          </div>
                          {selectedType === type && (
                            <div className="abp-type-check">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M2 6l3 3 5-6"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Templates */}
                <div className="abp-section" style={{ borderBottom: "none" }}>
                  <div className="abp-sec-hd">
                    <div className="abp-sec-ico" style={{ background: "var(--sky-lt)", color: "var(--sky)" }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 2h10l2 2v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4l2-2z"/>
                        <path d="M5 6h6M5 9h6M5 12h4"/>
                      </svg>
                    </div>
                    <span className="abp-sec-label">Quick Start Templates</span>
                  </div>
                  <div className="abp-template-list">
                    {TEMPLATES.map(template => (
                      <div
                        key={template.id}
                        className="abp-template-card"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="abp-template-icon" style={{ 
                          background: ACT_META[template.type].bg, 
                          border: `1.5px solid ${ACT_META[template.type].border}`,
                          color: ACT_META[template.type].color 
                        }}>
                          {ACT_META[template.type].icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="abp-template-name">{template.name}</div>
                          <div className="abp-template-desc">{template.desc}</div>
                          <div className="abp-template-tags">
                            {template.tags.map(tag => (
                              <span key={tag} className="abp-template-tag">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="2">
                          <path d="M5 2l5 5-5 5"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Content Building */}
                <div className="abp-section">
                  <div className="abp-sec-hd">
                    <div className="abp-sec-ico" style={{ background: "var(--purple-lt)", color: "var(--purple)" }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="12" height="12" rx="1.5"/>
                        <path d="M5 8h6M8 5v6"/>
                      </svg>
                    </div>
                    <span className="abp-sec-label">Activity Details</span>
                  </div>
                  <div className="field-g">
                    <label className="f-lbl">Activity Title <span style={{ color: "var(--red)" }}>*</span></label>
                    <input
                      className="f-in"
                      type="text"
                      value={activity.title}
                      onChange={e => setActivity({...activity, title: e.target.value})}
                      placeholder="e.g. POS System Overview"
                    />
                  </div>
                </div>

                <div className="abp-section" style={{ borderBottom: "none", flex: 1, overflow: "auto" }}>
                  <div className="abp-sec-hd">
                    <div className="abp-sec-ico" style={{ 
                      background: ACT_META[activity.type].bg, 
                      color: ACT_META[activity.type].color 
                    }}>
                      {ACT_META[activity.type].icon}
                    </div>
                    <span className="abp-sec-label">Content Items</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--t3)", fontWeight: 500 }}>
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
          <div style={{ fontSize: 11, color: footerNoteColor, flex: 1, fontWeight: 500 }}>{footerNote}</div>
          {step === 2 && (
            <button className="btn btn-s btn-sm" onClick={handleBack}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1L3 5l4 4"/>
              </svg>
              Back
            </button>
          )}
          <button className="btn btn-s btn-sm" onClick={handleClose}>Cancel</button>
          {step === 1 ? (
            <button 
              className="btn btn-p btn-sm" 
              onClick={handleNext}
              disabled={!selectedType}
            >
              Next Step
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 1l4 4-4 4"/>
              </svg>
            </button>
          ) : (
            <>
              <button 
                className="btn btn-s btn-sm" 
                onClick={() => handleSubmit("draft")}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M11 1H3a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V3a2 2 0 00-2-2z"/>
                  <path d="M7 11V7M7 4h.01"/>
                </svg>
                Save as Draft
              </button>
              <button 
                className="btn btn-p btn-sm" 
                onClick={() => handleSubmit("published")}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M2 7.5l3.5 3.5 6.5-7"/>
                </svg>
                Publish Activity
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  function renderContentBuilder() {
    if (activity.type === "accordion") {
      return (
        <div className="abp-item-list">
          {activity.items?.map((item, idx) => (
            <div key={idx} className="abp-item-row">
              <div className="abp-item-num">{idx + 1}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  className="f-in"
                  type="text"
                  placeholder="Question"
                  value={item.q}
                  onChange={e => {
                    const items = [...(activity.items || [])];
                    items[idx] = {...item, q: e.target.value};
                    setActivity({...activity, items});
                  }}
                />
                <textarea
                  className="f-in"
                  placeholder="Answer"
                  rows={2}
                  value={item.a}
                  onChange={e => {
                    const items = [...(activity.items || [])];
                    items[idx] = {...item, a: e.target.value};
                    setActivity({...activity, items});
                  }}
                />
              </div>
              {activity.items && activity.items.length > 1 && (
                <button
                  className="abp-item-del"
                  onClick={() => {
                    const items = activity.items?.filter((_, i) => i !== idx);
                    setActivity({...activity, items});
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            className="abp-add-btn"
            onClick={() => setActivity({...activity, items: [...(activity.items || []), {q:"", a:""}]})}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Add Question
          </button>
        </div>
      );
    }

    if (activity.type === "flashcard") {
      return (
        <div className="abp-item-list">
          {activity.cards?.map((card, idx) => (
            <div key={idx} className="abp-item-row">
              <div className="abp-item-num">{idx + 1}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  className="f-in"
                  type="text"
                  placeholder="Front of card"
                  value={card.front}
                  onChange={e => {
                    const cards = [...(activity.cards || [])];
                    cards[idx] = {...card, front: e.target.value};
                    setActivity({...activity, cards});
                  }}
                />
                <input
                  className="f-in"
                  type="text"
                  placeholder="Back of card"
                  value={card.back}
                  onChange={e => {
                    const cards = [...(activity.cards || [])];
                    cards[idx] = {...card, back: e.target.value};
                    setActivity({...activity, cards});
                  }}
                />
              </div>
              {activity.cards && activity.cards.length > 1 && (
                <button
                  className="abp-item-del"
                  onClick={() => {
                    const cards = activity.cards?.filter((_, i) => i !== idx);
                    setActivity({...activity, cards});
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            className="abp-add-btn"
            onClick={() => setActivity({...activity, cards: [...(activity.cards || []), {front:"", back:""}]})}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Add Card
          </button>
        </div>
      );
    }

    if (activity.type === "checklist" || activity.type === "hotspot") {
      return (
        <div className="abp-item-list">
          {activity.checklist?.map((item, idx) => (
            <div key={idx} className="abp-item-row">
              <div className="abp-item-num">{idx + 1}</div>
              <input
                className="f-in"
                type="text"
                placeholder="Task or step description"
                value={item.text}
                onChange={e => {
                  const checklist = [...(activity.checklist || [])];
                  checklist[idx] = {text: e.target.value};
                  setActivity({...activity, checklist});
                }}
                style={{ flex: 1 }}
              />
              {activity.checklist && activity.checklist.length > 1 && (
                <button
                  className="abp-item-del"
                  onClick={() => {
                    const checklist = activity.checklist?.filter((_, i) => i !== idx);
                    setActivity({...activity, checklist});
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            className="abp-add-btn"
            onClick={() => setActivity({...activity, checklist: [...(activity.checklist || []), {text:""}]})}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Add Item
          </button>
        </div>
      );
    }

    if (activity.type === "matching") {
      return (
        <div className="abp-item-list">
          {activity.pairs?.map((pair, idx) => (
            <div key={idx} className="abp-item-row">
              <div className="abp-item-num">{idx + 1}</div>
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <input
                  className="f-in"
                  type="text"
                  placeholder="Left column"
                  value={pair.left}
                  onChange={e => {
                    const pairs = [...(activity.pairs || [])];
                    pairs[idx] = {...pair, left: e.target.value};
                    setActivity({...activity, pairs});
                  }}
                  style={{ flex: 1 }}
                />
                <div style={{ display: "flex", alignItems: "center", color: "var(--t3)", fontSize: 14 }}>↔</div>
                <input
                  className="f-in"
                  type="text"
                  placeholder="Right column"
                  value={pair.right}
                  onChange={e => {
                    const pairs = [...(activity.pairs || [])];
                    pairs[idx] = {...pair, right: e.target.value};
                    setActivity({...activity, pairs});
                  }}
                  style={{ flex: 1 }}
                />
              </div>
              {activity.pairs && activity.pairs.length > 1 && (
                <button
                  className="abp-item-del"
                  onClick={() => {
                    const pairs = activity.pairs?.filter((_, i) => i !== idx);
                    setActivity({...activity, pairs});
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            className="abp-add-btn"
            onClick={() => setActivity({...activity, pairs: [...(activity.pairs || []), {left:"", right:""}]})}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Add Pair
          </button>
        </div>
      );
    }

    if (activity.type === "fillblank") {
      return (
        <div className="abp-item-list">
          {activity.questions?.map((q, idx) => (
            <div key={idx} className="abp-item-row">
              <div className="abp-item-num">{idx + 1}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  className="f-in"
                  type="text"
                  placeholder="Sentence with __BLANK__ placeholder"
                  value={q.sentence}
                  onChange={e => {
                    const questions = [...(activity.questions || [])];
                    questions[idx] = {...q, sentence: e.target.value};
                    setActivity({...activity, questions});
                  }}
                />
                <input
                  className="f-in"
                  type="text"
                  placeholder="Correct answer"
                  value={q.blanks[0] || ""}
                  onChange={e => {
                    const questions = [...(activity.questions || [])];
                    questions[idx] = {...q, blanks: [e.target.value]};
                    setActivity({...activity, questions});
                  }}
                />
              </div>
              {activity.questions && activity.questions.length > 1 && (
                <button
                  className="abp-item-del"
                  onClick={() => {
                    const questions = activity.questions?.filter((_, i) => i !== idx);
                    setActivity({...activity, questions});
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l8 8M9 1L1 9"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            className="abp-add-btn"
            onClick={() => setActivity({...activity, questions: [...(activity.questions || []), {sentence:"Type a sentence with __BLANK__ here.", blanks:[""]}]})}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 1v10M1 6h10"/>
            </svg>
            Add Question
          </button>
        </div>
      );
    }

    return null;
  }
}

// ─── Export LessonBlocks Component ───────────────────────────────────────────
export function LessonBlocks({ 
  blocks, 
  onChange 
}: { 
  blocks: LessonBlock[]; 
  onChange: (blocks: LessonBlock[]) => void;
}) {
  const updateBlock = (idx: number, updates: Partial<LessonBlock>) => {
    const updated = [...blocks];
    updated[idx] = { ...updated[idx], ...updates };
    onChange(updated);
  };

  const deleteBlock = (idx: number) => {
    onChange(blocks.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {blocks.map((block, idx) => (
        <div 
          key={block.id}
          style={{
            padding: 14,
            borderRadius: 10,
            background: "var(--bg,#faf9ff)",
            border: "1.5px solid var(--border,rgba(124,58,237,0.1))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: block.kind === "content" 
                ? "linear-gradient(135deg,#0284c7,#0d9488)"
                : "linear-gradient(135deg,#7c3aed,#d97706)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {idx + 1}
            </div>
            <div style={{ 
              fontSize: 11.5, 
              fontWeight: 700, 
              color: "var(--t2,#4a3870)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              flex: 1,
            }}>
              {block.kind === "content" ? "📝 Content Block" : `🧩 ${block.activity?.title || "Activity"}`}
            </div>
            <button
              onClick={() => deleteBlock(idx)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: "1.5px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.05)",
                color: "#dc2626",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l8 8M9 1L1 9"/>
              </svg>
            </button>
          </div>
          
          {block.kind === "content" ? (
            <textarea
              value={block.body || ""}
              onChange={(e) => updateBlock(idx, { body: e.target.value })}
              placeholder="Enter content text..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1.5px solid var(--border,rgba(109,40,217,0.1))",
                background: "var(--surface,#fff)",
                color: "var(--t1,#18103a)",
                fontSize: 12.5,
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: 80,
                lineHeight: 1.5,
              }}
            />
          ) : (
            <div style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(124,58,237,0.04)",
              border: "1.5px solid rgba(124,58,237,0.12)",
              fontSize: 11.5,
              color: "var(--t2,#4a3870)",
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {block.activity?.type && ACT_META[block.activity.type]?.icon} {block.activity?.title}
              </div>
              <div style={{ fontSize: 10, color: "var(--t3,#a89dc8)" }}>
                {block.activity?.type && ACT_META[block.activity.type]?.label} • 
                {block.activity?.items?.length || 
                 block.activity?.cards?.length || 
                 block.activity?.questions?.length || 
                 block.activity?.checklist?.length || 
                 block.activity?.pairs?.length || 0} items
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
