'use client'

/**
 * ActivityManager.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Hosts the full Activity Builder workflow AND exposes
 * <ActivityRenderer> for rendering activities inside course/module editors.
 *
 * KEY FIXES vs original:
 *  1. handleSave now receives `isUpdate` flag and upserts (splice-replace) instead
 *     of always pushing — fixes "activities not showing / disappearing" bug.
 *  2. ActivityBuilderPanel receives `allActivities` so the Library tab is populated.
 *  3. New <ActivityRenderer> component renders any Activity inline for
 *     course editors, module modals, lesson block lists, etc.
 *  4. New <ModuleActivityList> renders the list of activities attached to a
 *     module, with edit/delete/add buttons wired to ActivityBuilderPanel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";
import ActivityBuilderPanel, {
  ACT_META,
  ALL_TYPES,
  blankActivity,
  getActivityItemCount,
  ActivityInlinePreview,
  type Activity,
  type SegmentType,
  type LessonBlock,
} from "./ActivityBuilderPanel";
import ActivitiesPanel from "./ActivitiesPanel";

// ─── re-export types so consumers can import from one place ───────────────────
export type { Activity, SegmentType, LessonBlock };

// ─── helpers ─────────────────────────────────────────────────────────────────
function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function mkId(): string  { return Math.random().toString(36).slice(2, 9); }

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY RENDERER
// A fully interactive student-facing widget for any activity type.
// Use this anywhere in the course / module editor to show a live preview.
// ══════════════════════════════════════════════════════════════════════════════

function PreviewAccordion({ act }: { act: Activity }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = act.items ?? [];
  const meta  = ACT_META.accordion;
  return (
    <div style={{ border:`1px solid ${meta.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", background:meta.bg, display:"flex", alignItems:"center", gap:8, borderBottom:`1px solid ${meta.border}` }}>
        <span>{meta.icon}</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:meta.color }}>{act.title || "Accordion"}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"#a89dc8" }}>{items.length} items</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${meta.border}` : "none" }}>
          <div onClick={() => setOpen(open === i ? null : i)}
            style={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", background: open === i ? meta.bg : "transparent" }}>
            <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#0c4a6e" }}>{item.q || "Question…"}</span>
            <svg width="9" height="6" viewBox="0 0 10 7" fill={meta.color} style={{ transform: open === i ? "rotate(180deg)" : "none", transition:"transform .2s" }}><path d="M1 1l4 4 4-4"/></svg>
          </div>
          {open === i && <div style={{ padding:"0 14px 12px 28px", fontSize:13, color:"#2d4a6a", lineHeight:1.7 }}>{item.a || "Answer…"}</div>}
        </div>
      ))}
    </div>
  );
}

function PreviewFlashcards({ act }: { act: Activity }) {
  const cards = act.cards ?? [];
  const [cur,     setCur]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return null;
  const card = cards[cur];
  const next = () => { setFlipped(false); setTimeout(() => setCur(i => (i + 1) % cards.length), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setCur(i => (i - 1 + cards.length) % cards.length), 150); };
  return (
    <div style={{ border:"1px solid rgba(109,40,217,0.15)", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", background:"#f5f3ff", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid rgba(109,40,217,0.1)" }}>
        <span>🃏</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:"#6d28d9" }}>{act.title || "Flashcards"}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:"#a89dc8" }}>{cur+1} / {cards.length}</span>
      </div>
      <div style={{ padding:18 }}>
        {/* Card flip */}
        <div style={{ perspective:800, height:120, marginBottom:14, cursor:"pointer" }} onClick={() => setFlipped(v => !v)}>
          <div style={{ position:"relative", width:"100%", height:"100%", transition:"transform .5s", transformStyle:"preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}>
            {/* Front */}
            <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", borderRadius:10, background:"linear-gradient(135deg,#6d28d9,#5b21b6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6 }}>Front — tap to flip</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{card.front || "Front…"}</div>
              </div>
            </div>
            {/* Back */}
            <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", borderRadius:10, background:"linear-gradient(135deg,#0d9488,#0f766e)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6 }}>Back</div>
                <div style={{ fontSize:13, color:"#fff" }}>{card.back || "Back…"}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={prev} style={{ padding:"5px 12px", borderRadius:8, border:"1px solid rgba(109,40,217,0.2)", background:"#fff", color:"#6d28d9", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>← Prev</button>
          <div style={{ flex:1, height:3, background:"#e9e6f8", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${((cur+1)/cards.length)*100}%`, background:"linear-gradient(90deg,#6d28d9,#0d9488)", borderRadius:3, transition:"width .3s" }} />
          </div>
          <button onClick={next} style={{ padding:"5px 12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#6d28d9,#0d9488)", color:"#fff", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function PreviewFillBlank({ act }: { act: Activity }) {
  const qs = act.questions ?? [];
  const [inputs,    setInputs]    = useState<string[]>(qs.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const check = (qi: number) => qs[qi]?.blanks?.some(b => b.trim().toLowerCase() === inputs[qi]?.trim().toLowerCase()) ?? false;
  return (
    <div style={{ border:"1px solid rgba(15,118,110,0.15)", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", background:"#f0fdf9", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid rgba(15,118,110,0.1)" }}>
        <span>✏️</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:"#0f766e" }}>{act.title || "Fill in the Blanks"}</span>
      </div>
      <div style={{ padding:16 }}>
        {qs.map((q, qi) => {
          const parts   = q.sentence.split("__BLANK__");
          const correct = submitted ? check(qi) : null;
          return (
            <div key={qi} style={{ marginBottom: qi < qs.length - 1 ? 14 : 0 }}>
              <div style={{ fontSize:13.5, color:"#0c4a6e", lineHeight:1.7, display:"flex", flexWrap:"wrap", alignItems:"center", gap:4 }}>
                {parts.map((part, pi) => (
                  <span key={pi} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                    {part}
                    {pi < parts.length - 1 && (
                      <input value={inputs[qi] ?? ""} onChange={e => { const u = [...inputs]; u[qi] = e.target.value; setInputs(u); }}
                        disabled={submitted} placeholder="___"
                        style={{ width:110, border:`2px solid ${submitted ? (correct ? "rgba(22,163,74,0.6)" : "rgba(220,38,38,0.6)") : "rgba(15,118,110,0.3)"}`, borderRadius:7, padding:"3px 8px", fontSize:13, background: submitted ? (correct ? "#f0fdf4" : "#fff5f5") : "#fff", outline:"none", color:"#0c4a6e", fontFamily:"inherit", textAlign:"center" }} />
                    )}
                  </span>
                ))}
                {submitted && <span style={{ fontSize:11.5, fontWeight:700, color: correct ? "#15803d" : "#dc2626" }}>{correct ? "✓" : `✗ ${q.blanks[0]}`}</span>}
              </div>
            </div>
          );
        })}
        {!submitted
          ? <button onClick={() => setSubmitted(true)} style={{ marginTop:12, padding:"7px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#0f766e,#0284c7)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Check Answers →</button>
          : <button onClick={() => { setInputs(qs.map(() => "")); setSubmitted(false); }} style={{ marginTop:12, padding:"7px 18px", borderRadius:9, border:"1px solid rgba(15,118,110,0.25)", background:"#f0fdf9", color:"#0f766e", fontSize:12, fontWeight:700, cursor:"pointer" }}>Try Again</button>
        }
      </div>
    </div>
  );
}

function PreviewChecklist({ act }: { act: Activity }) {
  const items   = act.checklist ?? [];
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const done    = checked.filter(Boolean).length;
  return (
    <div style={{ border:"1px solid rgba(21,128,61,0.15)", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", background:"#f0fdf4", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid rgba(21,128,61,0.1)" }}>
        <span>☑️</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:"#15803d" }}>{act.title || "Checklist"}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color: done === items.length && items.length > 0 ? "#15803d" : "#a89dc8", fontWeight: done === items.length && items.length > 0 ? 700 : 400 }}>
          {done === items.length && items.length > 0 ? "✅ All done!" : `${done}/${items.length}`}
        </span>
      </div>
      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
        {items.map((item, i) => (
          <div key={i} onClick={() => { const u = [...checked]; u[i] = !u[i]; setChecked(u); }}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, cursor:"pointer", background: checked[i] ? "#f0fdf4" : "#faf9ff", border:`1px solid ${checked[i] ? "rgba(21,128,61,0.2)" : "rgba(109,40,217,0.08)"}`, transition:"all .14s" }}>
            <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${checked[i] ? "#15803d" : "rgba(109,40,217,0.25)"}`, background: checked[i] ? "#15803d" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .18s" }}>
              {checked[i] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2"><path d="M1 4l3 3 5-6"/></svg>}
            </div>
            <span style={{ fontSize:13, color: checked[i] ? "#15803d" : "#18103a", textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.7 : 1, transition:"all .15s" }}>{item.text || "Step…"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewMatching({ act }: { act: Activity }) {
  const pairs = act.pairs ?? [];
  const [selected, setSelected] = useState<{ side:"left"|"right"; idx:number } | null>(null);
  const [matched,  setMatched]  = useState<[number,number][]>([]);
  const [wrong,    setWrong]    = useState<[number,number] | null>(null);
  const rightOrder = useRef([...Array(pairs.length).keys()].sort(() => Math.random() - 0.5)).current;
  const isML = (i: number) => matched.some(([l])   => l === i);
  const isMR = (i: number) => matched.some(([, r]) => r === i);
  const allDone = matched.length === pairs.length && pairs.length > 0;

  const handleLeft = (i: number) => {
    if (isML(i)) return;
    if (selected?.side === "right") {
      const ri = selected.idx;
      if (rightOrder[ri] === i) setMatched(m => [...m, [i, ri]]);
      else { setWrong([i, ri]); setTimeout(() => setWrong(null), 700); }
      setSelected(null);
    } else { setSelected({ side:"left", idx:i }); }
  };
  const handleRight = (i: number) => {
    if (isMR(i)) return;
    if (selected?.side === "left") {
      const li = selected.idx;
      if (rightOrder[i] === li) setMatched(m => [...m, [li, i]]);
      else { setWrong([li, i]); setTimeout(() => setWrong(null), 700); }
      setSelected(null);
    } else { setSelected({ side:"right", idx:i }); }
  };
  const btnStyle = (side:"left"|"right", idx: number): React.CSSProperties => {
    const matched_  = side==="left" ? isML(idx) : isMR(idx);
    const sel       = selected?.side === side && selected?.idx === idx;
    const bad       = wrong && ((side==="left" && wrong[0]===idx)||(side==="right" && wrong[1]===idx));
    return { padding:"8px 12px", borderRadius:10, border:`2px solid ${matched_?"rgba(21,128,61,0.4)":bad?"rgba(220,38,38,0.5)":sel?"rgba(109,40,217,0.5)":"rgba(109,40,217,0.12)"}`, background: matched_?"#dcfce7":bad?"#fee2e2":sel?"#ede9fe":"#fff", color: matched_?"#15803d":bad?"#dc2626":sel?"#6d28d9":"#18103a", fontSize:12.5, fontWeight:600, cursor: matched_?"default":"pointer", textAlign:"left", opacity: matched_?0.7:1, transition:"all .15s", width:"100%", fontFamily:"inherit" };
  };
  return (
    <div style={{ border:"1px solid rgba(147,51,234,0.15)", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", background:"#faf5ff", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid rgba(147,51,234,0.1)" }}>
        <span>🔗</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:"#7c3aed" }}>{act.title || "Matching"}</span>
        <span style={{ marginLeft:"auto", fontSize:10, color: allDone?"#15803d":"#a89dc8", fontWeight: allDone?700:400 }}>{allDone ? "🎉 Done!" : `${matched.length}/${pairs.length}`}</span>
      </div>
      <div style={{ padding:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {pairs.map((p, i) => <button key={i} onClick={() => handleLeft(i)} disabled={isML(i)} style={btnStyle("left", i)}>{p.left||"Left…"}</button>)}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {rightOrder.map((origIdx, ri) => <button key={ri} onClick={() => handleRight(ri)} disabled={isMR(ri)} style={btnStyle("right", ri)}>{pairs[origIdx].right||"Right…"}</button>)}
          </div>
        </div>
        {allDone && <div style={{ marginTop:10, fontSize:13, fontWeight:700, color:"#15803d" }}>✅ All pairs matched!</div>}
      </div>
    </div>
  );
}

/**
 * ActivityRenderer
 * Drop this anywhere in a course editor, module modal, or lesson block
 * to render the live interactive student widget for any activity.
 */
export function ActivityRenderer({ activity }: { activity: Activity }) {
  switch (activity.type) {
    case "accordion": return <PreviewAccordion  act={activity} />;
    case "flashcard": return <PreviewFlashcards act={activity} />;
    case "fillblank": return <PreviewFillBlank  act={activity} />;
    case "checklist":
    case "hotspot":   return <PreviewChecklist  act={activity} />;
    case "matching":  return <PreviewMatching   act={activity} />;
    default:          return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE ACTIVITY LIST
// Use inside any CourseModuleModal or lesson editor to show, add, edit,
// and remove activities that are attached to a module / lesson.
// ══════════════════════════════════════════════════════════════════════════════

interface ModuleActivityListProps {
  /** Activities already attached to this module / lesson */
  activities: Activity[];
  onChange: (activities: Activity[]) => void;
  /** Show interactive student previews inline (default: false) */
  showPreview?: boolean;
}

export function ModuleActivityList({ activities, onChange, showPreview = false }: ModuleActivityListProps) {
  const [builderOpen,   setBuilderOpen]   = useState(false);
  const [editTarget,    setEditTarget]    = useState<Activity | null>(null);
  const [toastMsg,      setToastMsg]      = useState("");

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2500); };

  // FIX: upsert logic — replace by id if isUpdate, otherwise push
  const handleSave = (saved: Activity, _saveAs: "draft" | "published", isUpdate: boolean) => {
    if (isUpdate) {
      // Replace existing activity with matching id
      const idx = activities.findIndex(a => a.id === saved.id);
      if (idx !== -1) {
        const next = [...activities];
        next[idx] = saved;
        onChange(next);
      } else {
        // id not found in this list — treat as new (e.g. edited a library copy)
        onChange([...activities, saved]);
      }
    } else {
      onChange([...activities, saved]);
    }
    toast(isUpdate ? "Activity updated!" : "Activity added!");
  };

  const handleDelete = (id: string) => {
    onChange(activities.filter(a => a.id !== id));
    toast("Activity removed");
  };

  const handleEdit = (activity: Activity) => {
    setEditTarget(activity);
    setBuilderOpen(true);
  };

  const openNew = () => {
    setEditTarget(null);
    setBuilderOpen(true);
  };

  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1e1245", color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)" }}>
          {toastMsg}
        </div>
      )}

      {/* List */}
      {activities.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 16px", color:"#a89dc8" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🧩</div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>No activities attached</div>
          <div style={{ fontSize:11.5 }}>Click "Add Activity" below to attach one to this module.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
          {activities.map((act) => (
            <div key={act.id}>
              <ActivityInlinePreview
                activity={act}
                onEdit={() => handleEdit(act)}
                onRemove={() => handleDelete(act.id)}
              />
              {/* Optional live interactive preview */}
              {showPreview && (
                <div style={{ marginTop:8, marginLeft:4 }}>
                  <ActivityRenderer activity={act} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button onClick={openNew} style={{
        width:"100%", padding:"10px 14px", borderRadius:10,
        border:"1.5px dashed rgba(124,58,237,0.25)",
        background:"rgba(124,58,237,0.03)", color:"#7c3aed",
        fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        transition:"all .15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.background = "rgba(124,58,237,0.06)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.background = "rgba(124,58,237,0.03)"; }}
      >
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
        Add Activity
      </button>

      {/* Builder panel */}
      <ActivityBuilderPanel
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        editActivity={editTarget}
        toast={toast}
        allActivities={activities}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY MANAGER (standalone full-screen page)
// ══════════════════════════════════════════════════════════════════════════════

interface ActivityManagerProps {
  initialActivities?: Activity[];
  onSave?:  (activities: Activity[]) => void;
  onClose?: () => void;
}

export default function ActivityManager({ initialActivities = [], onSave, onClose }: ActivityManagerProps) {
  const [activities,    setActivities]    = useState<Activity[]>(dc(initialActivities));
  const [builderOpen,   setBuilderOpen]   = useState(false);
  const [editTarget,    setEditTarget]    = useState<Activity | null>(null);
  const [tab,           setTab]           = useState<"library" | "builder">("library");
  const [toastMsg,      setToastMsg]      = useState("");

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2500); };

  // FIX: upsert — splice-replace when editing, push when creating
  const handleSave = useCallback((saved: Activity, _saveAs: "draft" | "published", isUpdate: boolean) => {
    setActivities(prev => {
      if (isUpdate) {
        const idx = prev.findIndex(a => a.id === saved.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        // id not in list (e.g. library copy) — push as new
        return [...prev, saved];
      }
      return [...prev, saved];
    });
    toast(isUpdate ? "Activity updated!" : "Activity saved!");
  }, []);

  const handleDelete = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    toast("Activity deleted");
  };

  const openNew = () => {
    setEditTarget(null);
    setBuilderOpen(true);
    setTab("builder");
  };

  const openEdit = (activity: Activity) => {
    setEditTarget(activity);
    setBuilderOpen(true);
    setTab("builder");
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100%", minHeight:0,
      background:"var(--bg,#f8f7ff)", fontFamily:"DM Sans, sans-serif",
    }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#1e1245", color:"#fff", padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)" }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{
        background:"linear-gradient(135deg,#1e1245,#4c1d95 60%,#064e3b)",
        padding:"14px 22px", display:"flex", alignItems:"center", gap:14, flexShrink:0,
      }}>
        {onClose && (
          <button onClick={onClose} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.85)", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1L3 6l5 5"/></svg>
            Back
          </button>
        )}
        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧩</div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:"#fff", letterSpacing:"-0.01em" }}>Activity Manager</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:1 }}>Build and manage interactive activities</div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>
            {activities.length} activit{activities.length === 1 ? "y" : "ies"}
          </span>
          <button onClick={openNew} style={{ padding:"8px 16px", borderRadius:9, border:"1.5px solid rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 1v10M1 6h10"/></svg>
            New Activity
          </button>
          {onSave && (
            <button onClick={() => onSave(activities)} style={{ padding:"8px 18px", borderRadius:9, border:"none", background:"rgba(255,255,255,0.95)", color:"#4c1d95", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
              ✓ Done
            </button>
          )}
        </div>
      </div>

      {/* Body — Activity Library */}
      <div style={{ flex:1, overflow:"auto", padding:24 }}>
        <ActivitiesPanel
          activities={activities}
          onEdit={openEdit}
          onDelete={handleDelete}
          toast={toast}
        />
      </div>

      {/* Builder Panel (full-screen overlay) */}
      <ActivityBuilderPanel
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        editActivity={editTarget}
        toast={toast}
        allActivities={activities}  // FIX: always pass current list so Library tab is populated
      />
    </div>
  );
}
