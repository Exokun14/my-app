'use client'

import { useState, useEffect, useRef } from "react";
import constants from "../Data/test_data.json";
import type { Course, Client } from "../Data/types";

const { CLIENTS, CC_COLORS, DEFAULT_CATEGORIES } = constants as {
  CLIENTS: Client[];
  CC_COLORS: string[];
  DEFAULT_CATEGORIES: string[];
};

const THUMB_GRADIENTS = [
  ["#4c1d95","#0d9488"],["#0c4a6e","#065f46"],["#831843","#4c1d95"],
  ["#78350f","#dc2626"],["#064e3b","#0c4a6e"],["#1e3a8a","#4c1d95"],
];

const EMOJI_OPTIONS = [
  "📚","🎯","🖥️","🍽️","📋","📈","⚙️","💰","🏆","🔬","🧠","💡",
  "🎓","🌟","🔧","📊","🤝","🚀","🧩","🎨","📝","🌐","🔑","⚡",
];

const CAT_ICONS: Record<string, string> = {
  "POS Training":"🖥️","Food Safety":"🍽️","Customer Service":"🎯",
  "HR & Compliance":"📋","Sales":"📈","Operations":"⚙️","Finance":"💰","Leadership":"🏆",
};

const STEPS = [
  { id: 1, label: "Identity",  icon: "✦", desc: "Name & describe your course" },
  { id: 2, label: "Details",   icon: "◈", desc: "Category, duration & media" },
  { id: 3, label: "Audience",  icon: "◉", desc: "Assign to companies" },
  { id: 4, label: "Launch",    icon: "◆", desc: "Review & publish" },
];

const WIZARD_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

.wiz-wrap *, .wiz-wrap *::before, .wiz-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
.wiz-wrap { font-family: 'Plus Jakarta Sans', sans-serif; }

/* Scrollbar */
.wiz-wrap * { scrollbar-width: thin; scrollbar-color: rgba(109,40,217,0.15) transparent; }
.wiz-wrap ::-webkit-scrollbar { width: 4px; }
.wiz-wrap ::-webkit-scrollbar-thumb { background: rgba(109,40,217,0.18); border-radius: 4px; }

/* ── Keyframes ── */
@keyframes wiz-in      { from{opacity:0;transform:translateY(18px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes wiz-out     { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-12px) scale(0.98)} }
@keyframes wiz-stepFwd { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
@keyframes wiz-stepBck { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
@keyframes wiz-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes wiz-pop     { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes wiz-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes wiz-cardIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

.wiz-page-enter { animation: wiz-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.wiz-page-exit  { animation: wiz-out 0.28s ease forwards; }
.wiz-step-fwd   { animation: wiz-stepFwd 0.36s cubic-bezier(0.16,1,0.3,1) both; }
.wiz-step-bck   { animation: wiz-stepBck 0.36s cubic-bezier(0.16,1,0.3,1) both; }

/* ── Sidebar step items ── */
.wiz-step-item { transition: background 0.18s, transform 0.18s; cursor: default; }
.wiz-step-item:hover:not(.active):not(.done) { background: rgba(109,40,217,0.05) !important; transform: translateX(3px); }
.wiz-step-item.done { cursor: pointer; }
.wiz-step-item.done:hover { background: rgba(109,40,217,0.06) !important; transform: translateX(3px); }

/* ── Input fields — matches existing .f-in style ── */
.wiz-input {
  width: 100%; padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid rgba(109,40,217,0.15);
  background: #fff; color: #18103a;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 500;
  transition: border-color 0.18s, box-shadow 0.18s;
  outline: none;
}
.wiz-input:focus { border-color: rgba(109,40,217,0.5); box-shadow: 0 0 0 3px rgba(109,40,217,0.07); }
.wiz-input::placeholder { color: rgba(24,16,58,0.3); }

.wiz-textarea {
  width: 100%; padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid rgba(109,40,217,0.15);
  background: #fff; color: #18103a;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 500;
  transition: border-color 0.18s, box-shadow 0.18s; outline: none; resize: vertical; min-height: 84px;
}
.wiz-textarea:focus { border-color: rgba(109,40,217,0.5); box-shadow: 0 0 0 3px rgba(109,40,217,0.07); }
.wiz-textarea::placeholder { color: rgba(24,16,58,0.3); }

/* ── Emoji picker ── */
.wiz-emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.wiz-emoji-btn {
  aspect-ratio: 1; border-radius: 10px; border: 1.5px solid rgba(109,40,217,0.09);
  background: #fff; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: transform 0.14s, background 0.14s, border-color 0.14s, box-shadow 0.14s;
}
.wiz-emoji-btn:hover { transform: scale(1.14); background: #f5f3ff; border-color: rgba(109,40,217,0.2); box-shadow: 0 2px 10px rgba(109,40,217,0.1); }
.wiz-emoji-btn.selected { border-color: rgba(109,40,217,0.45); background: #ede9fe; transform: scale(1.08); box-shadow: 0 2px 12px rgba(109,40,217,0.15); }

/* ── Company chips ── */
.wiz-company-item {
  display: flex; align-items: center; gap: 9px; padding: 9px 12px;
  border-radius: 11px; border: 1.5px solid rgba(109,40,217,0.1);
  background: #fff; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.14s, box-shadow 0.14s;
}
.wiz-company-item:hover { border-color: rgba(109,40,217,0.25); transform: translateX(2px); box-shadow: 0 2px 10px rgba(109,40,217,0.07); }
.wiz-company-item.selected { border-color: rgba(109,40,217,0.4); background: #f5f3ff; }

/* ── CTA next button — matches existing .btn.btn-p style ── */
.wiz-btn-next {
  position: relative; overflow: hidden;
  padding: 11px 24px; border-radius: 11px; border: none; cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  color: #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.28);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  display: flex; align-items: center; gap: 8px;
}
.wiz-btn-next:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124,58,237,0.38); filter: brightness(1.05); }
.wiz-btn-next:active { transform: scale(0.97); }
.wiz-btn-next::after {
  content:''; position:absolute; inset:0;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent);
  transform: translateX(-100%); transition: transform 0.5s;
}
.wiz-btn-next:hover::after { transform: translateX(100%); }

/* ── Back button — matches existing .btn.btn-s style ── */
.wiz-btn-back {
  padding: 11px 18px; border-radius: 11px; cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12.5px; font-weight: 600;
  border: 1.5px solid rgba(109,40,217,0.18); background: #fff;
  color: #6d28d9; transition: background 0.14s, transform 0.14s, border-color 0.14s;
  display: flex; align-items: center; gap: 6px;
}
.wiz-btn-back:hover { background: #f5f3ff; transform: translateX(-2px); border-color: rgba(109,40,217,0.3); }

/* ── Launch action cards ── */
.wiz-launch-card {
  border-radius: 14px; padding: 16px 18px; cursor: pointer;
  border: 1.5px solid rgba(109,40,217,0.1); background: #fff;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
  display: flex; align-items: flex-start; gap: 14px;
}
.wiz-launch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(109,40,217,0.1); border-color: rgba(109,40,217,0.2); }

/* ── Category tag ── */
.wiz-cat-tag {
  padding: 6px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 600;
  cursor: pointer; border: 1.5px solid rgba(109,40,217,0.12);
  background: #f8f7ff; color: #7c65a8;
  transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.12s;
}
.wiz-cat-tag:hover { transform: translateY(-1px); background: #ede9fe; border-color: rgba(109,40,217,0.25); color: #6d28d9; }
.wiz-cat-tag.on { background: #ede9fe; border-color: rgba(109,40,217,0.45); color: #6d28d9; font-weight: 700; }

/* ── Live preview card ── */
.wiz-preview-card {
  border-radius: 16px; overflow: hidden; background: #fff;
  box-shadow: 0 4px 22px rgba(109,40,217,0.12);
  border: 1px solid rgba(109,40,217,0.1);
  animation: wiz-cardIn 0.4s ease both;
}

/* ── Cat manager row ── */
.wiz-cat-manager-row {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px;
  border-radius: 8px; background: #f8f7ff;
  border: 1px solid rgba(109,40,217,0.09);
}

/* ── Search box ── */
.wiz-search {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 11px; border-radius: 10px;
  border: 1.5px solid rgba(109,40,217,0.13);
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wiz-search:focus-within { border-color: rgba(109,40,217,0.4); box-shadow: 0 0 0 3px rgba(109,40,217,0.06); }
.wiz-search input { border: none; outline: none; background: transparent; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #18103a; width: 100%; }
.wiz-search input::placeholder { color: rgba(24,16,58,0.32); }
`;

interface CourseCreationWizardProps {
  categories:    string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onSave:        (data: Course) => void;
  onCancel:      () => void;
  toast:         (msg: string) => void;
}

type LaunchMode = "draft" | "template" | "publish";

export default function CourseCreationWizard({
  categories, setCategories, onSave, onCancel, toast,
}: CourseCreationWizardProps) {
  const [step,    setStep]    = useState(1);
  const [dir,     setDir]     = useState<"fwd"|"bck">("fwd");
  const [exiting, setExiting] = useState(false);
  const [key,     setKey]     = useState(0);

  // Step 1 — Identity
  const [title,       setTitle]       = useState("");
  const [desc,        setDesc]        = useState("");
  const [thumbEmoji,  setThumbEmoji]  = useState("📚");

  // Step 2 — Details
  const [cat,         setCat]         = useState("");
  const [duration,    setDuration]    = useState("");
  const [thumbUrl,    setThumbUrl]    = useState("");
  const [showCatMgr,  setShowCatMgr]  = useState(false);
  const [newCatName,  setNewCatName]  = useState("");
  const [renameCat,   setRenameCat]   = useState<string|null>(null);
  const [renameVal,   setRenameVal]   = useState("");

  // Step 3 — Audience
  const [selectedCos, setSelectedCos] = useState<Set<number>>(new Set());
  const [indFilter,   setIndFilter]   = useState("All");
  const [coSearch,    setCoSearch]    = useState("");

  // Step 4 — Launch
  const [launchMode,  setLaunchMode]  = useState<LaunchMode>("publish");
  const [launched,    setLaunched]    = useState(false);

  const confettiRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  const filteredClients = CLIENTS.filter(c => {
    const indOk  = indFilter === "All" || c.cat === indFilter;
    const srchOk = !coSearch || c.name.toLowerCase().includes(coSearch.toLowerCase());
    return indOk && srchOk;
  });

  const allSelected = filteredClients.length > 0 && filteredClients.every(c => selectedCos.has(c.id));

  const toggleCo = (id: number) => {
    setSelectedCos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedCos(prev => {
      const n = new Set(prev);
      filteredClients.forEach(c => checked ? n.add(c.id) : n.delete(c.id));
      return n;
    });
  };

  const addCategory = () => {
    const v = newCatName.trim();
    if (!v) { toast("Enter a category name."); return; }
    if (categories.includes(v)) { toast("Category already exists."); return; }
    setCategories(prev => [...prev, v]);
    setNewCatName("");
    toast(`"${v}" added!`);
  };

  const deleteCategory = (c: string) => {
    setCategories(prev => prev.filter(x => x !== c));
    if (cat === c) setCat("");
    toast(`Category removed.`);
  };

  const saveRename = () => {
    const v = renameVal.trim();
    if (!v) { toast("Name cannot be empty."); return; }
    if (v !== renameCat && categories.includes(v)) { toast("Already exists."); return; }
    setCategories(prev => prev.map(x => x === renameCat ? v : x));
    if (cat === renameCat) setCat(v);
    setRenameCat(null);
    toast(`Renamed to "${v}".`);
  };

  const goStep = (next: number) => {
    setDir(next > step ? "fwd" : "bck");
    setExiting(true);
    setTimeout(() => { setStep(next); setKey(k => k + 1); setExiting(false); }, 220);
  };

  const canNext = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return !!cat && !!duration.trim();
    return true;
  };

  const handleNext = () => {
    if (!canNext()) {
      if (step === 1) toast("Please enter a course title.");
      if (step === 2) toast("Category and duration are required.");
      return;
    }
    if (step < 4) goStep(step + 1);
  };

  const handleLaunch = () => {
    const companies = CLIENTS.filter(c => selectedCos.has(c.id)).map(c => c.name);
    const isActive = launchMode === "publish";
    onSave({
      title: title.trim(),
      desc: desc.trim() || "No description provided.",
      time: duration.trim(),
      thumb: thumbUrl || null,
      thumbEmoji: !thumbUrl ? thumbEmoji : null,
      cat,
      enrolled: false,
      progress: 0,
      active: isActive,
      companies: companies.length ? companies : null,
    } as Course);
    setLaunched(true);
    const msgs: Record<LaunchMode, string> = {
      draft:    "Saved as Draft",
      template: "Saved as Template",
      publish:  "Course Published! 🎉",
    };
    toast(msgs[launchMode]);
  };

  // Completion redirect after animation
  useEffect(() => {
    if (launched) {
      const t = setTimeout(onCancel, 1400);
      return () => clearTimeout(t);
    }
  }, [launched]);

  const grad = THUMB_GRADIENTS[0];
  const previewIcon = CAT_ICONS[cat] || thumbEmoji;

  const progressPct = ((step - 1) / 3) * 100;

  return (
    <div className="wiz-wrap" style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "#faf9ff",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{WIZARD_STYLES}</style>

      {/* ── Subtle ambient orbs (light, airy) ── */}
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"-8%", right:"12%", width:440, height:440, borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,0.06),transparent 68%)" }} />
        <div style={{ position:"absolute", bottom:"-6%", left:"6%", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(13,148,136,0.07),transparent 68%)" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(109,40,217,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,0.025) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
      </div>

      {/* ── Top bar — matches existing nav style ── */}
      <div style={{
        display:"flex", alignItems:"center", padding:"14px 28px", flexShrink:0, position:"relative", zIndex:2,
        borderBottom:"1px solid rgba(109,40,217,0.09)",
        background:"rgba(255,255,255,0.95)", backdropFilter:"blur(16px)",
        boxShadow:"0 1px 0 rgba(109,40,217,0.06)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(124,58,237,0.3)" }}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.7">
              <path d="M10 2L2 6l8 4 8-4-8-4z"/><path d="M2 10l8 4 8-4"/><path d="M2 14l8 4 8-4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#0f0a2a", letterSpacing:"-0.01em" }}>Course Creation Studio</div>
            <div style={{ fontSize:10.5, color:"#7c65a8", marginTop:1 }}>Build your learning experience</div>
          </div>
        </div>

        {/* ── Linear progress bar ── */}
        <div style={{ flex:1, margin:"0 36px" }}>
          <div style={{ height:5, borderRadius:4, background:"#e9e6f8", overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#7c3aed,#0d9488)", width:`${progressPct}%`, transition:"width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
            {STEPS.map(s => (
              <span key={s.id} style={{ fontSize:9.5, fontWeight:600, color: step >= s.id ? "#7c3aed" : "#c4bdd8", letterSpacing:".05em", textTransform:"uppercase", transition:"color 0.3s" }}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onCancel}
          style={{ width:32, height:32, borderRadius:8, border:"1.5px solid rgba(109,40,217,0.15)", background:"#f5f3ff", color:"#7c65a8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.14s, border-color 0.14s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#ede9fe"; e.currentTarget.style.borderColor = "rgba(109,40,217,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.borderColor = "rgba(109,40,217,0.15)"; }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M1 1l9 9M10 1L1 10"/>
          </svg>
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative", zIndex:2 }}>

        {/* ── Left sidebar — matches #f8f7ff sidebar pattern ── */}
        <div style={{ width:248, flexShrink:0, padding:"28px 18px 28px", display:"flex", flexDirection:"column", borderRight:"1px solid rgba(109,40,217,0.09)", background:"#f5f3ff" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#a89dc8", letterSpacing:".12em", textTransform:"uppercase", marginBottom:18, paddingLeft:8 }}>Steps</div>

          <div style={{ display:"flex", flexDirection:"column", gap:3, position:"relative" }}>
            {/* connector line */}
            <div style={{ position:"absolute", left:21, top:34, width:2, height:`calc(100% - 34px)`, background:"#e5e0f5", borderRadius:2 }}>
              <div style={{ width:"100%", background:"linear-gradient(180deg,#7c3aed,#0d9488)", borderRadius:2, height:`${Math.min(100,((step-1)/3)*100)}%`, transition:"height 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>

            {STEPS.map(s => {
              const isActive = step === s.id;
              const isDone   = step > s.id;
              return (
                <div
                  key={s.id}
                  className={`wiz-step-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                  onClick={() => isDone ? goStep(s.id) : undefined}
                  style={{
                    display:"flex", alignItems:"center", gap:11, padding:"10px 10px 10px 8px",
                    borderRadius:11, position:"relative",
                    background: isActive ? "#fff" : "transparent",
                    border: isActive ? "1px solid rgba(109,40,217,0.18)" : "1px solid transparent",
                    boxShadow: isActive ? "0 2px 12px rgba(109,40,217,0.08)" : "none",
                  }}
                >
                  {/* Circle indicator */}
                  <div style={{
                    width:26, height:26, borderRadius:"50%", flexShrink:0, zIndex:1,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: isDone ? "linear-gradient(135deg,#7c3aed,#0d9488)" : isActive ? "#7c3aed" : "#e5e0f5",
                    boxShadow: isActive ? "0 2px 10px rgba(124,58,237,0.35)" : isDone ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
                    transition:"all 0.3s",
                  }}>
                    {isDone
                      ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.4"><path d="M2 6l3 3 5-5"/></svg>
                      : <span style={{ color: isActive ? "#fff" : "#a89dc8", fontSize:10, fontWeight:700 }}>{s.id}</span>
                    }
                  </div>

                  <div>
                    <div style={{ fontSize:12.5, fontWeight:700, color: isActive ? "#0f0a2a" : isDone ? "#6d28d9" : "#a89dc8", transition:"color 0.2s" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize:10, color: isActive ? "#7c65a8" : "#c4bdd8", marginTop:1, lineHeight:1.3 }}>{s.desc}</div>
                  </div>

                  {isActive && (
                    <div style={{ position:"absolute", right:10, width:6, height:6, borderRadius:"50%", background:"#7c3aed", animation:"wiz-pulse 2s ease infinite", boxShadow:"0 0 6px rgba(124,58,237,0.6)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Live preview card at bottom of sidebar */}
          {(title || cat) && (
            <div style={{ marginTop:"auto", paddingTop:20 }}>
              <div style={{ fontSize:9.5, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10, paddingLeft:2 }}>Live Preview</div>
              <div className="wiz-preview-card" style={{ borderRadius:14 }}>
                <div style={{ height:72, background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, display:"flex", alignItems:"flex-end", padding:"8px 10px", position:"relative" }}>
                  <div style={{ position:"absolute", top:6, right:8, padding:"2px 7px", borderRadius:10, background:"rgba(0,0,0,0.3)", fontSize:8, fontWeight:700, color:"#fff" }}>
                    {launchMode === "publish" ? "Published" : launchMode === "draft" ? "Draft" : "Template"}
                  </div>
                  <span style={{ fontSize:28 }}>{previewIcon}</span>
                </div>
                <div style={{ padding:"10px 11px 12px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#0f0a2a", lineHeight:1.3, marginBottom:3 }}>{title || "Course Title"}</div>
                  <div style={{ fontSize:9.5, color:"#a89dc8", marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{desc || "Add a description…"}</div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                    {cat && <span style={{ padding:"2px 7px", borderRadius:8, background:"rgba(109,40,217,0.08)", fontSize:9, fontWeight:600, color:"#7c3aed" }}>{cat}</span>}
                    {duration && <span style={{ fontSize:9, color:"#a89dc8" }}>⏱ {duration}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right — step content ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"40px 48px 40px", background:"#faf9ff" }}>
          <div key={key} className={exiting ? (dir === "fwd" ? "wiz-step-bck" : "wiz-step-fwd") : (dir === "fwd" ? "wiz-step-fwd" : "wiz-step-bck")} style={{ maxWidth:640, margin:"0 auto" }}>

            {/* ─── STEP 1: Identity ─── */}
            {step === 1 && (
              <div>
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(124,58,237,0.7)", marginBottom:8 }}>Step 1 of 4</div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"#0f0a2a", lineHeight:1.2, marginBottom:10 }}>
                    Give it an <em style={{ color:"#7c3aed" }}>identity</em>
                  </h2>
                  <p style={{ fontSize:13.5, color:"#7c65a8", lineHeight:1.6 }}>
                    A great course starts with a clear title and purpose. This is what your learners will see first.
                  </p>
                </div>

                {/* Title */}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:8, letterSpacing:".02em" }}>
                    Course Title <span style={{ color:"#dc2626" }}>*</span>
                  </label>
                  <input
                    className="wiz-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. POS Advanced Training"
                    autoFocus
                    style={{ fontSize:15, fontWeight:600, padding:"14px 16px" }}
                  />
                  <div style={{ fontSize:11, color:"#a89dc8", marginTop:6 }}>Make it descriptive and specific</div>
                </div>

                {/* Description */}
                <div style={{ marginBottom:28 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:8 }}>Description</label>
                  <textarea
                    className="wiz-textarea"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Briefly describe what this course covers and what learners will take away…"
                    rows={3}
                  />
                </div>

                {/* Emoji picker */}
                <div style={{ marginBottom:36 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:8 }}>
                    Course Icon
                    <span style={{ fontSize:10.5, fontWeight:500, color:"#a89dc8", marginLeft:8 }}>Choose an emoji that represents this course</span>
                  </label>
                  <div style={{ padding:"16px", borderRadius:14, background:"#f5f3ff", border:"1px solid rgba(109,40,217,0.1)" }}>
                    <div style={{ fontSize:32, textAlign:"center", marginBottom:12 }}>{thumbEmoji}</div>
                    <div className="wiz-emoji-grid">
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} className={`wiz-emoji-btn${thumbEmoji === e ? " selected" : ""}`} onClick={() => setThumbEmoji(e)}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button className="wiz-btn-next" onClick={handleNext}>
                    Continue to Details
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Details ─── */}
            {step === 2 && (
              <div>
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(13,148,136,0.8)", marginBottom:8 }}>Step 2 of 4</div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"#0f0a2a", lineHeight:1.2, marginBottom:10 }}>
                    Set the <em style={{ color:"#0d9488" }}>details</em>
                  </h2>
                  <p style={{ fontSize:13.5, color:"#7c65a8", lineHeight:1.6 }}>
                    Categorize your course and give learners a sense of what to expect.
                  </p>
                </div>

                {/* Category */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:"#4a3880" }}>
                      Category <span style={{ color:"#dc2626" }}>*</span>
                    </label>
                    <button
                      onClick={() => setShowCatMgr(v => !v)}
                      style={{ fontSize:10.5, fontWeight:600, color:"#6d28d9", background:"#ede9fe", border:"1px solid rgba(109,40,217,0.2)", padding:"4px 10px", borderRadius:8, cursor:"pointer" }}
                    >
                      {showCatMgr ? "Close Manager" : "Manage Categories"}
                    </button>
                  </div>

                  {/* Category tags */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                    {categories.filter(c => c !== "All").map(c => (
                      <button
                        key={c}
                        className={`wiz-cat-tag${cat === c ? " on" : ""}`}
                        onClick={() => setCat(c)}
                        style={{
                          background: cat === c ? "rgba(109,40,217,0.18)" : "rgba(255,255,255,0.06)",
                          color: cat === c ? "#6d28d9" : "#7c65a8",
                          borderColor: cat === c ? "rgba(109,40,217,0.5)" : "rgba(255,255,255,0.1)",
                        }}
                      >
                        {CAT_ICONS[c] || "📁"} {c}
                      </button>
                    ))}
                  </div>

                  {/* Category manager */}
                  {showCatMgr && (
                    <div style={{ padding:"14px", borderRadius:14, background:"#f5f3ff", border:"1px solid rgba(109,40,217,0.1)", marginBottom:12, animation:"wiz-in 0.25s ease both" }}>
                      <div style={{ fontSize:10.5, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10 }}>Manage Categories</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10, maxHeight:160, overflowY:"auto" }}>
                        {categories.filter(c => c !== "All").map(c => (
                          <div key={c} className="wiz-cat-manager-row">
                            {renameCat === c ? (
                              <>
                                <input className="wiz-input" style={{ flex:1, padding:"5px 9px", fontSize:12, height:30 }} value={renameVal} onChange={e => setRenameVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveRename()} autoFocus />
                                <button onClick={saveRename} style={{ padding:"4px 10px", borderRadius:7, background:"rgba(13,148,136,0.2)", color:"#0d9488", border:"1px solid rgba(13,148,136,0.3)", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>✓</button>
                              </>
                            ) : (
                              <>
                                <span style={{ flex:1, fontSize:12, color:"#2d1f5e" }}>{CAT_ICONS[c] || "📁"} {c}</span>
                                <button onClick={() => { setRenameCat(c); setRenameVal(c); }} style={{ padding:"3px 8px", borderRadius:6, background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)", border:"none", fontSize:10.5, cursor:"pointer" }}>✏️</button>
                              </>
                            )}
                            <button onClick={() => deleteCategory(c)} style={{ width:24, height:24, borderRadius:6, background:"rgba(220,38,38,0.07)", color:"#dc2626", border:"1px solid rgba(220,38,38,0.15)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <input className="wiz-input" type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category name…" style={{ padding:"8px 12px", fontSize:12 }} onKeyDown={e => e.key === "Enter" && addCategory()} />
                        <button onClick={addCategory} style={{ padding:"8px 16px", borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", border:"none", boxShadow:"0 2px 10px rgba(124,58,237,0.2)", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>+ Add</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:8 }}>
                    Estimated Duration <span style={{ color:"#dc2626" }}>*</span>
                  </label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                    {["15 Mins","30 Mins","45 Mins","1 Hour","1.5 Hours","2 Hours"].map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        style={{
                          padding:"7px 14px", borderRadius:10, fontSize:11.5, fontWeight:600, cursor:"pointer",
                          background: duration === d ? "rgba(13,148,136,0.1)" : "#f5f3ff",
                          color: duration === d ? "#0d9488" : "#7c65a8",
                          border: duration === d ? "1.5px solid rgba(13,148,136,0.35)" : "1.5px solid rgba(109,40,217,0.12)",
                          transition:"all 0.15s",
                        }}
                      >{d}</button>
                    ))}
                  </div>
                  <input
                    className="wiz-input"
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="Or type custom duration…"
                  />
                </div>

                {/* Thumbnail URL */}
                <div style={{ marginBottom:36 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:8 }}>
                    Thumbnail Image
                    <span style={{ fontSize:10.5, fontWeight:500, color:"#a89dc8", marginLeft:8 }}>Optional</span>
                  </label>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:64, height:48, borderRadius:10, flexShrink:0, overflow:"hidden", background:"linear-gradient(135deg,#4c1d95,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {thumbUrl
                        ? <img src={thumbUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={() => setThumbUrl("")} />
                        : <span style={{ fontSize:22 }}>{previewIcon}</span>
                      }
                    </div>
                    <input
                      className="wiz-input"
                      type="text"
                      value={thumbUrl}
                      onChange={e => setThumbUrl(e.target.value)}
                      placeholder="Paste image URL (optional)…"
                      style={{ flex:1 }}
                    />
                  </div>
                </div>

                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button className="wiz-btn-back" onClick={() => goStep(1)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 7H3M6 4l-3 3 3 3"/></svg>
                    Back
                  </button>
                  <button className="wiz-btn-next" onClick={handleNext}>
                    Continue to Audience
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Audience ─── */}
            {step === 3 && (
              <div>
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(14,165,233,0.8)", marginBottom:8 }}>Step 3 of 4</div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"#0f0a2a", lineHeight:1.2, marginBottom:10 }}>
                    Who's your <em style={{ color:"#0ea5e9" }}>audience?</em>
                  </h2>
                  <p style={{ fontSize:13.5, color:"#7c65a8", lineHeight:1.6 }}>
                    Assign this course to specific client companies, or leave unselected to make it available to all.
                  </p>
                </div>

                {/* Filters row */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:600, color:"#4a3880" }}>
                    <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} style={{ width:13, height:13, accentColor:"#7c3aed" }} />
                    All
                  </label>
                  <div style={{ width:1, height:18, background:"rgba(255,255,255,0.1)" }} />
                  {["All","F&B","Retail","Warehouse"].map(ind => (
                    <button key={ind}
                      onClick={() => setIndFilter(ind)}
                      style={{
                        padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer",
                        background: indFilter === ind ? "#ede9fe" : "#f5f3ff",
                        color: indFilter === ind ? "#6d28d9" : "#7c65a8",
                        border: indFilter === ind ? "1px solid rgba(109,40,217,0.35)" : "1px solid rgba(109,40,217,0.12)",
                        transition:"all 0.14s",
                      }}
                    >{ind === "All" ? "All Industries" : ind}</button>
                  ))}
                  <div className="wiz-search" style={{ marginLeft:"auto", width:180 }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#a89dc8" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
                    <input placeholder="Search companies…" value={coSearch} onChange={e => setCoSearch(e.target.value)} style={{ color:"#2d1f5e" }} />
                  </div>
                </div>

                {/* Selected count */}
                <div style={{ fontSize:11.5, color:"#a89dc8", marginBottom:12 }}>
                  {selectedCos.size === 0
                    ? "No companies selected — course will be visible to all"
                    : `${selectedCos.size} compan${selectedCos.size === 1 ? "y" : "ies"} selected`
                  }
                </div>

                {/* Company grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:8, marginBottom:36, maxHeight:360, overflowY:"auto", paddingRight:4 }}>
                  {filteredClients.map((c, i) => (
                    <div
                      key={c.id}
                      className={`wiz-company-item${selectedCos.has(c.id) ? " selected" : ""}`}
                      onClick={() => toggleCo(c.id)}
                    >
                      <input type="checkbox" checked={selectedCos.has(c.id)} onChange={() => toggleCo(c.id)} onClick={e => e.stopPropagation()} style={{ accentColor:"#7c3aed", width:13, height:13 }} />
                      <div style={{ width:30, height:30, borderRadius:8, background:CC_COLORS[i % CC_COLORS.length], display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"white", flexShrink:0 }}>
                        {c.name.split(" ").map((w:string) => w[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#0f0a2a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                        <div style={{ fontSize:10, color:"#7c65a8" }}>{c.cat}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button className="wiz-btn-back" onClick={() => goStep(2)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 7H3M6 4l-3 3 3 3"/></svg>
                    Back
                  </button>
                  <button className="wiz-btn-next" onClick={() => goStep(4)}>
                    Review & Launch
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: Launch ─── */}
            {step === 4 && !launched && (
              <div>
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(236,72,153,0.8)", marginBottom:8 }}>Step 4 of 4</div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:"#0f0a2a", lineHeight:1.2, marginBottom:10 }}>
                    Ready to <em style={{ color:"#ec4899" }}>launch?</em>
                  </h2>
                  <p style={{ fontSize:13.5, color:"#7c65a8", lineHeight:1.6 }}>
                    Review your course and choose how you'd like to save it.
                  </p>
                </div>

                {/* Summary card */}
                <div style={{ padding:"20px 22px", borderRadius:16, background:"#f5f3ff", border:"1px solid rgba(109,40,217,0.1)", marginBottom:28 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:14 }}>Course Summary</div>
                  <div style={{ display:"flex", gap:18, alignItems:"flex-start" }}>
                    {/* Mini thumbnail */}
                    <div style={{ width:80, height:60, borderRadius:12, overflow:"hidden", background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, position:"relative" }}>
                      {thumbUrl ? <img src={thumbUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.4 }} /> : null}
                      <span style={{ position:"relative", zIndex:1 }}>{previewIcon}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f0a2a", marginBottom:5 }}>{title}</div>
                      {desc && <div style={{ fontSize:12, color:"#7c65a8", lineHeight:1.5, marginBottom:8 }}>{desc}</div>}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {cat && <span style={{ padding:"3px 10px", borderRadius:8, background:"#ede9fe", fontSize:11, fontWeight:600, color:"#6d28d9" }}>{cat}</span>}
                        {duration && <span style={{ padding:"3px 10px", borderRadius:8, background:"rgba(13,148,136,0.15)", fontSize:11, fontWeight:600, color:"rgba(45,212,191,0.8)" }}>⏱ {duration}</span>}
                        {selectedCos.size > 0 && <span style={{ padding:"3px 10px", borderRadius:8, background:"rgba(14,165,233,0.12)", fontSize:11, fontWeight:600, color:"rgba(125,211,252,0.8)" }}>👥 {selectedCos.size} compan{selectedCos.size===1?"y":"ies"}</span>}
                        {selectedCos.size === 0 && <span style={{ padding:"3px 10px", borderRadius:8, background:"#f5f3ff", fontSize:11, color:"#a89dc8" }}>All companies</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Launch mode selector */}
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#4a3880", marginBottom:14 }}>How would you like to save this course?</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                    {/* Draft */}
                    <div
                      className="wiz-launch-card"
                      onClick={() => setLaunchMode("draft")}
                      style={{
                        background: launchMode === "draft" ? "#fffbeb" : "#fff",
                        borderColor: launchMode === "draft" ? "rgba(217,119,6,0.45)" : "rgba(109,40,217,0.1)",
                        "--card-accent": "rgba(217,119,6,0.45)",
                      } as React.CSSProperties}
                    >
                      <div style={{ width:40, height:40, borderRadius:12, background:"rgba(217,119,6,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#d97706" strokeWidth="1.7"><path d="M9 2v9M6 8l3 3 3-3M3 13v3h12v-3"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f0a2a", marginBottom:3 }}>Save as Draft</div>
                        <div style={{ fontSize:11.5, color:"#7c65a8", lineHeight:1.5 }}>Not visible to learners. Continue editing before publishing.</div>
                      </div>
                      <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", border:`2px solid ${launchMode==="draft" ? "#d97706" : "rgba(109,40,217,0.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {launchMode === "draft" && <div style={{ width:10, height:10, borderRadius:"50%", background:"#d97706" }} />}
                      </div>
                    </div>

                    {/* Template */}
                    <div
                      className="wiz-launch-card"
                      onClick={() => setLaunchMode("template")}
                      style={{
                        background: launchMode === "template" ? "#f0f9ff" : "#fff",
                        borderColor: launchMode === "template" ? "rgba(14,165,233,0.45)" : "rgba(109,40,217,0.1)",
                        "--card-accent": "rgba(14,165,233,0.45)",
                      } as React.CSSProperties}
                    >
                      <div style={{ width:40, height:40, borderRadius:12, background:"rgba(14,165,233,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#0ea5e9" strokeWidth="1.7"><rect x="2" y="2" width="14" height="14" rx="2"/><path d="M5 6h8M5 9h8M5 12h5"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f0a2a", marginBottom:3 }}>Save as Template</div>
                        <div style={{ fontSize:11.5, color:"#7c65a8", lineHeight:1.5 }}>Reusable blueprint. Clone it later to create new courses quickly.</div>
                      </div>
                      <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", border:`2px solid ${launchMode==="template" ? "#0ea5e9" : "rgba(109,40,217,0.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {launchMode === "template" && <div style={{ width:10, height:10, borderRadius:"50%", background:"#0ea5e9" }} />}
                      </div>
                    </div>

                    {/* Publish */}
                    <div
                      className="wiz-launch-card"
                      onClick={() => setLaunchMode("publish")}
                      style={{
                        background: launchMode === "publish" ? "#f0fdf9" : "#fff",
                        borderColor: launchMode === "publish" ? "rgba(16,185,129,0.45)" : "rgba(109,40,217,0.1)",
                        "--card-accent": "rgba(16,185,129,0.45)",
                      } as React.CSSProperties}
                    >
                      <div style={{ width:40, height:40, borderRadius:12, background:"rgba(16,185,129,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#10b981" strokeWidth="1.7"><path d="M9 2l7 4v6c0 3-3 5-7 6-4-1-7-3-7-6V6l7-4z"/><path d="M6 9l2.5 2.5 4-4"/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f0a2a", marginBottom:3 }}>Publish Now</div>
                        <div style={{ fontSize:11.5, color:"#7c65a8", lineHeight:1.5 }}>Make it live immediately. Assigned companies can start learning right away.</div>
                      </div>
                      <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", border:`2px solid ${launchMode==="publish" ? "#10b981" : "rgba(109,40,217,0.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {launchMode === "publish" && <div style={{ width:10, height:10, borderRadius:"50%", background:"#10b981" }} />}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button className="wiz-btn-back" onClick={() => goStep(3)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 7H3M6 4l-3 3 3 3"/></svg>
                    Back
                  </button>
                  <button
                    className="wiz-btn-next"
                    onClick={handleLaunch}
                    style={{
                      background: launchMode === "publish" ? "linear-gradient(135deg,#10b981,#059669)" : launchMode === "template" ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "linear-gradient(135deg,#d97706,#b45309)",
                      boxShadow: launchMode === "publish" ? "0 4px 18px rgba(16,185,129,0.35)" : launchMode === "template" ? "0 4px 18px rgba(14,165,233,0.35)" : "0 4px 18px rgba(217,119,6,0.35)",
                    }}
                  >
                    {launchMode === "publish" ? "🚀 Publish Course" : launchMode === "template" ? "📋 Save Template" : "💾 Save Draft"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── SUCCESS ─── */}
            {launched && (
              <div style={{ textAlign:"center", paddingTop:40, animation:"wiz-pop 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", boxShadow:"0 12px 40px rgba(124,58,237,0.4)", animation:"wiz-pop 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 18l8 8 16-16"/></svg>
                </div>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, color:"#0f0a2a", marginBottom:10 }}>
                  {launchMode === "publish" ? "Course Published!" : launchMode === "template" ? "Template Saved!" : "Draft Saved!"}
                </h2>
                <p style={{ fontSize:13.5, color:"#7c65a8" }}>Returning to your catalog…</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
