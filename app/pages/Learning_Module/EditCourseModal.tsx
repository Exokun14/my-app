'use client'

import { useState, useEffect, useRef } from "react";
import constants from "../../Data/test_data.json";
import type { Course, Client } from "../../Data/types";

const { CLIENTS, CC_COLORS } = constants as { CLIENTS: Client[]; CC_COLORS: string[] };

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  "POS Training":"🖥️","Food Safety":"🍽️","Customer Service":"🎯",
  "HR & Compliance":"📋","Sales":"📈","Operations":"⚙️","Finance":"💰","Leadership":"🏆",
};
const DURATION_PRESETS = ["15 Mins","30 Mins","45 Mins","1 Hour","1.5 Hours","2 Hours","3 Hours","Half Day","Full Day"];
const THUMB_GRADS = [
  ["#4c1d95","#0d9488"],["#0c4a6e","#065f46"],["#831843","#4c1d95"],
  ["#1e3a8a","#4c1d95"],["#064e3b","#0c4a6e"],["#78350f","#dc2626"],
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface EditCourseModalProps {
  open:          boolean;
  onClose:       () => void;
  onSave:        (data: Course) => void;
  editCourse:    Course | null;
  categories:    string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toast:         (msg: string) => void;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

.ecm *,.ecm *::before,.ecm *::after { box-sizing:border-box; margin:0; padding:0; }
.ecm { font-family:'Plus Jakarta Sans',sans-serif; }
.ecm * { scrollbar-width:thin; scrollbar-color:rgba(109,40,217,0.15) transparent; }
.ecm ::-webkit-scrollbar { width:4px; }
.ecm ::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.18); border-radius:4px; }

@keyframes ecm-in    { from{opacity:0;transform:translateY(16px) scale(.985)} to{opacity:1;transform:none} }
@keyframes ecm-out   { from{opacity:1;transform:none} to{opacity:0;transform:translateY(10px) scale(.985)} }
@keyframes ecm-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes ecm-sd    { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
@keyframes ecm-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.ecm-enter { animation:ecm-in   .44s cubic-bezier(.16,1,.3,1) both; }
.ecm-exit  { animation:ecm-out  .24s ease forwards; }
.ecm-up    { animation:ecm-up   .28s cubic-bezier(.16,1,.3,1) both; }
.ecm-sd    { animation:ecm-sd   .22s cubic-bezier(.16,1,.3,1) both; }
.ecm-pulse { animation:ecm-pulse 2.4s ease infinite; }

/* ── inputs ── */
.ecm input, .ecm textarea, .ecm select {
  width:100%; border:1.5px solid rgba(109,40,217,0.15); border-radius:10px;
  padding:10px 14px; font-size:13.5px; background:#fff; outline:none;
  color:#18103a; font-family:'Plus Jakarta Sans',sans-serif;
  transition:border-color .18s, box-shadow .18s;
}
.ecm input:focus, .ecm textarea:focus, .ecm select:focus {
  border-color:rgba(109,40,217,0.45)!important;
  box-shadow:0 0 0 3px rgba(109,40,217,0.07)!important;
  background:#fff!important;
}
.ecm input::placeholder, .ecm textarea::placeholder { color:rgba(24,16,58,0.3); }
.ecm .dirty { border-color:rgba(245,158,11,0.42)!important; background:#fffcf0!important; }

/* ── sidebar nav ── */
.ecm-nav {
  display:flex; align-items:center; gap:10px; padding:9px 12px;
  border-radius:11px; cursor:pointer; border:1px solid transparent;
  transition:background .14s, border-color .14s, transform .13s;
}
.ecm-nav:hover  { background:rgba(109,40,217,0.05); transform:translateX(3px); }
.ecm-nav.on     { background:#fff; border-color:rgba(109,40,217,0.18); box-shadow:0 2px 10px rgba(109,40,217,0.08); }

/* ── save ── */
.ecm-save {
  position:relative; overflow:hidden; padding:10px 24px; border-radius:11px;
  border:none; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
  font-size:13px; font-weight:700; background:linear-gradient(135deg,#7c3aed,#0d9488);
  color:#fff; box-shadow:0 3px 16px rgba(124,58,237,0.28);
  display:flex; align-items:center; gap:8px;
  transition:transform .14s, box-shadow .14s, filter .14s;
}
.ecm-save:hover { transform:translateY(-2px); box-shadow:0 7px 24px rgba(124,58,237,0.36); filter:brightness(1.06); }
.ecm-save:active { transform:scale(.97); }
.ecm-save::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent); transform:translateX(-100%); transition:transform .5s; }
.ecm-save:hover::after { transform:translateX(100%); }

/* ── ghost ── */
.ecm-ghost {
  padding:9px 18px; border-radius:10px; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:12.5px; font-weight:600;
  border:1.5px solid rgba(109,40,217,0.2); background:#fff; color:#6d28d9;
  transition:background .13s, border-color .13s, transform .12s;
}
.ecm-ghost:hover { background:#f5f3ff; border-color:rgba(109,40,217,0.35); transform:translateY(-1px); }

/* ── discard ── */
.ecm-discard {
  padding:9px 18px; border-radius:10px; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:12.5px; font-weight:600;
  border:1.5px solid rgba(220,38,38,0.22); background:#fff; color:#dc2626;
  transition:background .13s, border-color .13s, transform .12s;
}
.ecm-discard:hover { background:#fef2f2; border-color:rgba(220,38,38,0.42); transform:translateY(-1px); }

/* ── section card ── */
.ecm-card {
  background:#fff; border:1px solid rgba(109,40,217,0.09); border-radius:16px; padding:24px 26px;
  transition:box-shadow .18s, border-color .18s;
}
.ecm-card:hover { box-shadow:0 4px 20px rgba(109,40,217,0.07); border-color:rgba(109,40,217,0.15); }
.ecm-card.has-change { border-color:rgba(245,158,11,0.28); }

/* ── badges ── */
.ecm-badge-changed {
  display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
  border-radius:20px; font-size:10.5px; font-weight:700;
  background:#fef3c7; color:#b45309; border:1px solid rgba(217,119,6,0.2);
  animation:ecm-up .22s ease both;
}
.ecm-badge-ok {
  display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
  border-radius:20px; font-size:10.5px; font-weight:700;
  background:#f0fdf4; color:#15803d; border:1px solid rgba(21,128,61,0.18);
}

/* ── "was" hint ── */
.ecm-was {
  font-size:10.5px; color:#a89dc8; margin-top:5px;
  display:flex; align-items:center; gap:5px; animation:ecm-up .22s ease both;
}
.ecm-was span { color:#b45309; font-weight:600; font-style:italic; }

/* ── duration chips ── */
.ecm-dur {
  padding:7px 14px; border-radius:20px; font-size:12px; font-weight:600;
  cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
  transition:background .13s, border-color .13s, color .13s, transform .12s;
}
.ecm-dur:hover:not(.on) { transform:translateY(-2px); }

/* ── category tags ── */
.ecm-cat {
  padding:7px 16px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer;
  border:1.5px solid rgba(109,40,217,0.12); background:#f8f7ff; color:#7c65a8;
  transition:background .14s, border-color .14s, color .14s, transform .12s, box-shadow .12s;
  font-family:'Plus Jakarta Sans',sans-serif;
}
.ecm-cat:hover { transform:translateY(-2px); background:#ede9fe; border-color:rgba(109,40,217,0.28); color:#6d28d9; box-shadow:0 3px 10px rgba(109,40,217,0.1); }
.ecm-cat.on    { background:#ede9fe; border-color:rgba(109,40,217,0.5); color:#6d28d9; font-weight:700; }

/* ── company row ── */
.ecm-co {
  display:flex; align-items:center; gap:9px; padding:10px 13px;
  border-radius:11px; border:1.5px solid rgba(109,40,217,0.1);
  background:#fff; cursor:pointer;
  transition:border-color .14s, background .14s, transform .13s, box-shadow .13s;
}
.ecm-co:hover { border-color:rgba(109,40,217,0.25); transform:translateX(2px); box-shadow:0 2px 10px rgba(109,40,217,0.07); }
.ecm-co.on    { border-color:rgba(109,40,217,0.42); background:#f5f3ff; }

/* ── cat manager row ── */
.ecm-cat-row {
  display:flex; align-items:center; gap:6px; padding:7px 10px;
  border-radius:8px; background:#f5f3ff; border:1px solid rgba(109,40,217,0.09);
}

/* ── live preview card ── */
.ecm-preview {
  border-radius:14px; overflow:hidden; background:#fff;
  box-shadow:0 4px 20px rgba(109,40,217,0.12); border:1px solid rgba(109,40,217,0.1);
  transition:box-shadow .3s;
}
.ecm-preview:hover { box-shadow:0 6px 26px rgba(109,40,217,0.16); }

/* ── discard guard overlay ── */
.ecm-guard {
  position:absolute; inset:0; background:rgba(15,10,42,0.55);
  backdrop-filter:blur(8px); z-index:10;
  display:flex; align-items:center; justify-content:center;
  animation:ecm-up .2s ease both;
}

/* ── change dot ── */
.ecm-dot { width:7px; height:7px; border-radius:50%; background:#f59e0b; flex-shrink:0; }

/* ── section label ── */
.ecm-lbl {
  display:block; font-size:10.5px; font-weight:700; color:#4a3880;
  letter-spacing:.07em; text-transform:uppercase; margin-bottom:7px;
}
`;

export default function EditCourseModal({
  open, onClose, onSave, editCourse, categories, setCategories, toast,
}: EditCourseModalProps) {

  // ── Form state (mirrors original CreateCourseModal) ───────────────────────
  const [title,             setTitle]             = useState("");
  const [desc,              setDesc]              = useState("");
  const [cat,               setCat]               = useState("");
  const [duration,          setDuration]          = useState("");
  const [thumbUrl,          setThumbUrl]          = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [industryFilter,    setIndustryFilter]    = useState("All");
  const [companySearch,     setCompanySearch]     = useState("");
  const [showCatManager,    setShowCatManager]    = useState(false);
  const [newCatName,        setNewCatName]        = useState("");
  const [renamingCat,       setRenamingCat]       = useState<string | null>(null);
  const [renameVal,         setRenameVal]         = useState("");

  // ── New state for full-screen UX ──────────────────────────────────────────
  const [exiting,       setExiting]       = useState(false);
  const [activeSection, setActiveSection] = useState("identity");
  const [thumbError,    setThumbError]    = useState(false);
  const [showGuard,     setShowGuard]     = useState(false);

  // Snapshot of original values to diff against
  const origRef = useRef<{ title:string; desc:string; cat:string; duration:string; thumbUrl:string } | null>(null);

  // Section scroll refs
  const scrollRef   = useRef<HTMLDivElement>(null);
  const secIdentity = useRef<HTMLDivElement>(null);
  const secDetails  = useRef<HTMLDivElement>(null);
  const secThumb    = useRef<HTMLDivElement>(null);
  const secAudience = useRef<HTMLDivElement>(null);

  // ── Seed on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !editCourse) return;

    setTitle(editCourse.title);
    setDesc(editCourse.desc || "");
    setCat(editCourse.cat);
    setDuration(editCourse.time);
    setThumbUrl(editCourse.thumb || "");

    origRef.current = {
      title:    editCourse.title,
      desc:     editCourse.desc || "",
      cat:      editCourse.cat,
      duration: editCourse.time,
      thumbUrl: editCourse.thumb || "",
    };

    // Pre-select companies already assigned to this course
    const presel = new Set<number>(
      editCourse.companies
        ? CLIENTS.filter(c => editCourse.companies!.includes(c.name)).map(c => c.id)
        : []
    );
    setSelectedCompanies(presel);

    setIndustryFilter("All");
    setCompanySearch("");
    setShowCatManager(false);
    setNewCatName("");
    setRenamingCat(null);
    setExiting(false);
    setActiveSection("identity");
    setThumbError(false);
    setShowGuard(false);
  }, [open, editCourse]);

  if (!open || !editCourse) return null;

  // ── Filtered clients (same logic as original) ────────────────────────────
  const filteredClients = CLIENTS.filter(c => {
    const indOk  = industryFilter === "All" || c.cat === industryFilter;
    const srchOk = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
    return indOk && srchOk;
  });
  const allSelected = filteredClients.length > 0 && filteredClients.every(c => selectedCompanies.has(c.id));

  const toggleCompany = (id: number) => {
    setSelectedCompanies(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = (checked: boolean) => {
    setSelectedCompanies(prev => { const n = new Set(prev); filteredClients.forEach(c => checked ? n.add(c.id) : n.delete(c.id)); return n; });
  };

  // ── Category ops (same as original) ──────────────────────────────────────
  const addCategory = () => {
    const v = newCatName.trim();
    if (!v) { toast("Enter a category name."); return; }
    if (categories.includes(v)) { toast("Category already exists."); return; }
    setCategories(prev => [...prev, v]);
    setNewCatName("");
    toast(`Category "${v}" added!`);
  };
  const deleteCategory = (c: string) => {
    setCategories(prev => prev.filter(x => x !== c));
    if (cat === c) setCat("");
    toast(`Category "${c}" removed.`);
  };
  const saveRename = () => {
    const v = renameVal.trim();
    if (!v) { toast("Category name cannot be empty."); return; }
    if (v !== renamingCat && categories.includes(v)) { toast(`Category "${v}" already exists.`); return; }
    setCategories(prev => prev.map(x => x === renamingCat ? v : x));
    if (cat === renamingCat) setCat(v);
    setRenamingCat(null);
    toast(`Category renamed to "${v}".`);
  };

  // ── Save (same as original handleSubmit) ─────────────────────────────────
  const handleSubmit = () => {
    if (!title.trim())    { toast("Please enter a course title.");        secIdentity.current?.scrollIntoView({ behavior:"smooth", block:"start" }); return; }
    if (!cat)             { toast("Please select a category.");           secDetails.current?.scrollIntoView({ behavior:"smooth", block:"start" }); return; }
    if (!duration.trim()) { toast("Please enter the estimated duration."); secDetails.current?.scrollIntoView({ behavior:"smooth", block:"start" }); return; }
    const companies = CLIENTS.filter(c => selectedCompanies.has(c.id)).map(c => c.name);
    onSave({
      title:     title.trim(),
      desc:      desc || "No description provided.",
      time:      duration.trim(),
      thumb:     thumbUrl || null,
      thumbEmoji: !thumbUrl ? "📚" : null,
      cat,
      enrolled:  false,
      progress:  0,
      active:    true,
      companies: companies.length ? companies : null,
    });
    toast(`"${title.trim()}" updated!`);
    handleClose();
  };

  // ── Close / discard helpers ───────────────────────────────────────────────
  const handleClose    = () => { setExiting(true); setTimeout(() => { setExiting(false); onClose(); }, 260); };
  const attemptClose   = () => { if (isDirty) { setShowGuard(true); } else { handleClose(); } };
  const discardChanges = () => {
    if (!origRef.current) return;
    const o = origRef.current;
    setTitle(o.title); setDesc(o.desc); setCat(o.cat); setDuration(o.duration); setThumbUrl(o.thumbUrl);
    setShowGuard(false);
    toast("Changes discarded.");
  };

  // ── Scroll spy ────────────────────────────────────────────────────────────
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const top = scrollRef.current.scrollTop + 80;
    const secs = [
      { id:"identity", ref:secIdentity },
      { id:"details",  ref:secDetails  },
      { id:"thumb",    ref:secThumb    },
      { id:"audience", ref:secAudience },
    ];
    let active = "identity";
    secs.forEach(s => { if (s.ref.current && s.ref.current.offsetTop <= top) active = s.id; });
    setActiveSection(active);
  };
  const jumpTo = (ref: React.RefObject<HTMLDivElement | null>, id: string) => {
    setActiveSection(id);
    ref.current?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  // ── Change tracking ───────────────────────────────────────────────────────
  const orig = origRef.current;
  const changed = {
    title:    !!(orig && orig.title    !== title.trim()),
    desc:     !!(orig && orig.desc     !== desc.trim()),
    cat:      !!(orig && orig.cat      !== cat),
    duration: !!(orig && orig.duration !== duration.trim()),
    thumbUrl: !!(orig && orig.thumbUrl !== thumbUrl.trim()),
  };
  const changedFields = Object.entries(changed).filter(([, v]) => v).map(([k]) => k);
  const isDirty       = changedFields.length > 0;

  // ── Preview ───────────────────────────────────────────────────────────────
  const gradIdx    = (title.charCodeAt(0) || 0) % THUMB_GRADS.length;
  const [gc1, gc2] = THUMB_GRADS[gradIdx];
  const validOk    = !!(title.trim() && cat && duration.trim());

  const NAV = [
    { id:"identity", icon:"✦", label:"Identity",  ref:secIdentity, dirty: changed.title || changed.desc },
    { id:"details",  icon:"◈", label:"Details",   ref:secDetails,  dirty: changed.cat || changed.duration },
    { id:"thumb",    icon:"◉", label:"Thumbnail", ref:secThumb,    dirty: changed.thumbUrl },
    { id:"audience", icon:"◆", label:"Audience",  ref:secAudience, dirty: false },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      <div className="ecm" style={{ position:"fixed", inset:0, zIndex:600, background:"#faf9ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Ambient orbs */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", top:"-8%", right:"12%", width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,0.055),transparent 68%)" }}/>
          <div style={{ position:"absolute", bottom:"-7%", left:"5%",  width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(13,148,136,0.06),transparent 68%)" }}/>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(109,40,217,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,0.022) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        </div>

        <div className={exiting ? "ecm-exit" : "ecm-enter"} style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden", position:"relative", zIndex:1 }}>

          {/* ══ TOP BAR ════════════════════════════════════════════════════ */}
          <div style={{ display:"flex", alignItems:"center", padding:"0 28px", height:58, flexShrink:0, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(109,40,217,0.09)", boxShadow:"0 1px 0 rgba(109,40,217,0.05)" }}>

            {/* Logo + title */}
            <div style={{ display:"flex", alignItems:"center", gap:11, flexShrink:0 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(124,58,237,0.28)" }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
                  <path d="M10 2L2 6l8 4 8-4-8-4z"/><path d="M2 10l8 4 8-4"/><path d="M2 14l8 4 8-4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#0f0a2a", letterSpacing:"-0.01em" }}>Edit Course</div>
                <div style={{ fontSize:10, color:"#a89dc8", marginTop:1 }}>{editCourse.title}</div>
              </div>
            </div>

            {/* Change pill */}
            <div style={{ marginLeft:18 }}>
              {isDirty && (
                <div className="ecm-badge-changed">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v3l2 1"/></svg>
                  {changedFields.length} unsaved change{changedFields.length !== 1 ? "s" : ""}
                </div>
              )}
              {!isDirty && (
                <div className="ecm-badge-ok">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 6l3 3 5-5"/></svg>
                  No changes
                </div>
              )}
            </div>

            <div style={{ flex:1 }}/>

            {/* Actions */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {isDirty && (
                <button className="ecm-discard" onClick={() => setShowGuard(true)}>Discard Changes</button>
              )}
              <button className="ecm-ghost" onClick={attemptClose}>Cancel</button>
              <button className="ecm-save" onClick={handleSubmit}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7.5l3 3 7-7"/></svg>
                Save Changes
              </button>
            </div>
          </div>

          {/* ══ BODY ═══════════════════════════════════════════════════════ */}
          <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

            {/* ── Discard guard ── */}
            {showGuard && (
              <div className="ecm-guard">
                <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", maxWidth:420, width:"100%", margin:"0 20px", boxShadow:"0 24px 60px rgba(15,10,42,0.25), 0 0 0 1px rgba(109,40,217,0.1)", textAlign:"center" }}>
                  <div style={{ width:56, height:56, borderRadius:16, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26 }}>⚠️</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#0f0a2a", fontFamily:"'Playfair Display',serif", marginBottom:8 }}>Discard changes?</div>
                  <div style={{ fontSize:13, color:"#7c65a8", lineHeight:1.65, marginBottom:24 }}>
                    You've edited <strong style={{ color:"#0f0a2a" }}>{changedFields.join(", ")}</strong>. Discarding will revert to the saved version.
                  </div>
                  <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                    <button onClick={() => setShowGuard(false)}
                      style={{ padding:"10px 22px", borderRadius:10, border:"1.5px solid rgba(109,40,217,0.2)", background:"#fff", color:"#6d28d9", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"background .13s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      Keep editing
                    </button>
                    <button onClick={discardChanges}
                      style={{ padding:"10px 22px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 3px 12px rgba(220,38,38,0.25)", transition:"transform .13s, box-shadow .13s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 5px 18px rgba(220,38,38,0.35)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(220,38,38,0.25)"; }}>
                      Discard &amp; close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
            <div style={{ width:276, flexShrink:0, display:"flex", flexDirection:"column", borderRight:"1px solid rgba(109,40,217,0.09)", background:"#f5f3ff" }}>

              {/* Live preview */}
              <div style={{ padding:"18px 16px 0", flexShrink:0 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:12 }}>Live Preview</div>
                <div className="ecm-preview">
                  <div style={{ height:88, background: thumbUrl && !thumbError ? `url(${thumbUrl}) center/cover no-repeat` : `linear-gradient(135deg,${gc1},${gc2})`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                    {(!thumbUrl || thumbError) && <span style={{ fontSize:36, filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.25))" }}>📚</span>}
                    {thumbUrl && <img src={thumbUrl} alt="" style={{ display:"none" }} onError={() => setThumbError(true)} onLoad={() => setThumbError(false)}/>}
                    {cat && (
                      <div style={{ position:"absolute", top:8, left:8, padding:"3px 8px", borderRadius:8, background:"rgba(0,0,0,0.32)", backdropFilter:"blur(6px)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.92)" }}>
                        {CAT_ICONS[cat] || "📁"} {cat}
                      </div>
                    )}
                  </div>
                  <div style={{ padding:"12px 14px 14px" }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:"#0f0a2a", marginBottom:4, lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
                      {title || <em style={{ color:"#c4bdd8", fontWeight:400, fontSize:12 }}>Course title…</em>}
                    </div>
                    {desc && <div style={{ fontSize:10.5, color:"#7c65a8", lineHeight:1.5, marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>{desc}</div>}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {duration && <span style={{ padding:"2px 8px", borderRadius:6, background:"#f5f3ff", fontSize:10, fontWeight:600, color:"#7c65a8" }}>⏱ {duration}</span>}
                      {selectedCompanies.size > 0 && <span style={{ padding:"2px 8px", borderRadius:6, background:"#f0fdf4", fontSize:10, fontWeight:600, color:"#15803d" }}>🏢 {selectedCompanies.size} co{selectedCompanies.size !== 1 ? "mpanies" : "mpany"}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section nav */}
              <div style={{ padding:"18px 10px 10px", flex:1, overflowY:"auto" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10, paddingLeft:4 }}>Sections</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {NAV.map(n => (
                    <div key={n.id} className={`ecm-nav${activeSection === n.id ? " on" : ""}`} onClick={() => jumpTo(n.ref, n.id)}>
                      <div style={{ width:26, height:26, borderRadius:8, background:activeSection===n.id?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#e5e0f5", color:activeSection===n.id?"#fff":"#7c65a8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, transition:"all .2s", boxShadow:activeSection===n.id?"0 2px 8px rgba(124,58,237,0.28)":"none" }}>
                        {n.icon}
                      </div>
                      <span style={{ fontSize:13, fontWeight:activeSection===n.id?700:500, color:activeSection===n.id?"#18103a":"#7c65a8", flex:1, transition:"color .2s" }}>{n.label}</span>
                      {n.dirty && <div className="ecm-dot"/>}
                      {activeSection === n.id && <div className="ecm-pulse" style={{ width:6, height:6, borderRadius:"50%", background:"#7c3aed", boxShadow:"0 0 6px rgba(124,58,237,0.6)" }}/>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer status */}
              <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(109,40,217,0.08)", flexShrink:0 }}>
                {validOk ? (
                  <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:"#15803d", fontWeight:600 }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#15803d" strokeWidth="2.2"><path d="M2 7.5l3 3 7-7"/></svg>
                    Ready to save
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:"#a89dc8", lineHeight:1.55 }}>
                    Still needed:{" "}
                    <span style={{ color:"#dc2626", fontWeight:600 }}>
                      {[!title.trim() && "title", !cat && "category", !duration.trim() && "duration"].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Scrollable form ──────────────────────────────────── */}
            <div ref={scrollRef} onScroll={handleScroll}
              style={{ flex:1, overflowY:"auto", padding:"28px 44px 60px", display:"flex", flexDirection:"column", gap:20, background:"#faf9ff" }}>

              {/* ══ SECTION 1: Identity ══════════════════════════════════════ */}
              <section ref={secIdentity} style={{ scrollMarginTop:16 }}>
                <div className={`ecm-card ecm-up${changed.title || changed.desc ? " has-change" : ""}`}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(109,40,217,0.05))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>✦</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f0a2a", fontFamily:"'Playfair Display',serif" }}>Course Identity</div>
                      <div style={{ fontSize:11, color:"#a89dc8", marginTop:2 }}>Name and description</div>
                    </div>
                    {(changed.title || changed.desc) && <div className="ecm-badge-changed">edited</div>}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                    {/* Title */}
                    <div>
                      <label className="ecm-lbl">Course Title <span style={{ color:"#dc2626" }}>*</span></label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. POS Advanced Training"
                        className={changed.title ? "dirty" : ""}
                        style={{ fontSize:15, fontWeight:600, padding:"12px 15px" }}/>
                      {changed.title && orig && (
                        <div className="ecm-was">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#a89dc8" strokeWidth="1.8"><path d="M3 9l3-3 3 3M6 6V2"/></svg>
                          Was: <span>"{orig.title}"</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="ecm-lbl">Description</label>
                      <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                        placeholder="Briefly describe what this course covers…"
                        className={changed.desc ? "dirty" : ""}
                        style={{ resize:"vertical", lineHeight:1.65, padding:"11px 15px" }}/>
                      {changed.desc && orig && orig.desc && (
                        <div className="ecm-was">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#a89dc8" strokeWidth="1.8"><path d="M3 9l3-3 3 3M6 6V2"/></svg>
                          Was: <span>"{orig.desc.slice(0, 60)}{orig.desc.length > 60 ? "…" : ""}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ══ SECTION 2: Details ═══════════════════════════════════════ */}
              <section ref={secDetails} style={{ scrollMarginTop:16 }}>
                <div className={`ecm-card ecm-up${changed.cat || changed.duration ? " has-change" : ""}`} style={{ animationDelay:".05s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(13,148,136,0.12),rgba(13,148,136,0.05))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>◈</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f0a2a", fontFamily:"'Playfair Display',serif" }}>Course Details</div>
                      <div style={{ fontSize:11, color:"#a89dc8", marginTop:2 }}>Category and duration</div>
                    </div>
                    {(changed.cat || changed.duration) && <div className="ecm-badge-changed">edited</div>}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    {/* Category */}
                    <div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                        <label className="ecm-lbl" style={{ marginBottom:0 }}>Category <span style={{ color:"#dc2626" }}>*</span></label>
                        <button onClick={() => setShowCatManager(v => !v)}
                          style={{ fontSize:10.5, fontWeight:600, color:"#6d28d9", background:"#ede9fe", border:"1px solid rgba(109,40,217,0.2)", padding:"4px 11px", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:5, transition:"background .13s", fontFamily:"inherit" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#ddd6fe"}
                          onMouseLeave={e => e.currentTarget.style.background = "#ede9fe"}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="5"/><path d="M6 3v6M3 6h6"/></svg>
                          Manage
                        </button>
                      </div>

                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {categories.filter(c => c !== "All").map(c => (
                          <button key={c} className={`ecm-cat${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>
                            {CAT_ICONS[c] || "📁"} {c}
                          </button>
                        ))}
                      </div>
                      {changed.cat && orig && (
                        <div className="ecm-was" style={{ marginTop:8 }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#a89dc8" strokeWidth="1.8"><path d="M3 9l3-3 3 3M6 6V2"/></svg>
                          Was: <span>{CAT_ICONS[orig.cat] || "📁"} {orig.cat}</span>
                        </div>
                      )}

                      {/* Category manager panel */}
                      {showCatManager && (
                        <div className="ecm-sd" style={{ marginTop:14, padding:"16px", borderRadius:13, background:"#f5f3ff", border:"1px solid rgba(109,40,217,0.1)" }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:10 }}>Manage Categories</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12, maxHeight:160, overflowY:"auto" }}>
                            {categories.filter(c => c !== "All").map(c => (
                              <div key={c} className="ecm-cat-row">
                                {renamingCat === c ? (
                                  <>
                                    <input style={{ flex:1, padding:"5px 9px", fontSize:12, height:30, border:"1.5px solid rgba(109,40,217,0.3)", borderRadius:7 }}
                                      value={renameVal} onChange={e => setRenameVal(e.target.value)}
                                      onKeyDown={e => e.key === "Enter" && saveRename()} autoFocus/>
                                    <button onClick={saveRename} style={{ padding:"4px 10px", borderRadius:7, background:"rgba(13,148,136,0.1)", color:"#0d9488", border:"1px solid rgba(13,148,136,0.25)", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>✓</button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ flex:1, fontSize:12, color:"#2d1f5e" }}>{CAT_ICONS[c] || "📁"} {c}</span>
                                    <button onClick={() => { setRenamingCat(c); setRenameVal(c); }} style={{ padding:"3px 8px", borderRadius:6, background:"rgba(109,40,217,0.07)", color:"#7c65a8", border:"none", fontSize:10.5, cursor:"pointer" }}>✏️</button>
                                  </>
                                )}
                                <button onClick={() => deleteCategory(c)} style={{ width:24, height:24, borderRadius:6, background:"rgba(220,38,38,0.07)", color:"#dc2626", border:"1px solid rgba(220,38,38,0.15)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                              </div>
                            ))}
                            {categories.filter(c => c !== "All").length === 0 && (
                              <div style={{ fontSize:11, color:"#a89dc8" }}>No categories yet.</div>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                              placeholder="New category name…"
                              style={{ flex:1, padding:"8px 12px", fontSize:12, border:"1.5px solid rgba(109,40,217,0.14)", borderRadius:9 }}
                              onKeyDown={e => e.key === "Enter" && addCategory()}/>
                            <button onClick={addCategory} style={{ padding:"8px 18px", borderRadius:9, background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", boxShadow:"0 2px 10px rgba(124,58,237,0.22)", fontFamily:"inherit" }}>+ Add</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="ecm-lbl">Estimated Duration <span style={{ color:"#dc2626" }}>*</span></label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
                        {DURATION_PRESETS.map(d => (
                          <button key={d} className={`ecm-dur${duration === d ? " on" : ""}`} onClick={() => setDuration(d)}
                            style={{ border:`1.5px solid ${duration===d?"rgba(13,148,136,0.42)":"rgba(109,40,217,0.14)"}`, background:duration===d?"rgba(13,148,136,0.1)":"#fff", color:duration===d?"#0d9488":"#7c65a8" }}>
                            {d}
                          </button>
                        ))}
                      </div>
                      <input type="text" value={duration} onChange={e => setDuration(e.target.value)}
                        placeholder="Or type a custom duration (e.g. 90 Mins)…"
                        className={changed.duration ? "dirty" : ""}
                        style={{ fontSize:13, padding:"9px 13px" }}/>
                      {changed.duration && orig && (
                        <div className="ecm-was">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#a89dc8" strokeWidth="1.8"><path d="M3 9l3-3 3 3M6 6V2"/></svg>
                          Was: <span>{orig.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ══ SECTION 3: Thumbnail ═════════════════════════════════════ */}
              <section ref={secThumb} style={{ scrollMarginTop:16 }}>
                <div className={`ecm-card ecm-up${changed.thumbUrl ? " has-change" : ""}`} style={{ animationDelay:".1s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(2,132,199,0.12),rgba(2,132,199,0.05))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>◉</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f0a2a", fontFamily:"'Playfair Display',serif" }}>Thumbnail</div>
                      <div style={{ fontSize:11, color:"#a89dc8", marginTop:2 }}>Optional image URL for the course card</div>
                    </div>
                    {changed.thumbUrl && <div className="ecm-badge-changed">edited</div>}
                  </div>

                  <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
                    {/* Swatch preview */}
                    <div style={{ width:148, flexShrink:0 }}>
                      <div style={{ height:88, borderRadius:12, overflow:"hidden", background:thumbUrl&&!thumbError?`url(${thumbUrl}) center/cover no-repeat`:`linear-gradient(135deg,${gc1},${gc2})`, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(109,40,217,0.1)" }}>
                        {(!thumbUrl || thumbError) && <span style={{ fontSize:30 }}>📚</span>}
                      </div>
                      <div style={{ fontSize:9.5, color:"#a89dc8", textAlign:"center", marginTop:5 }}>
                        {thumbUrl && !thumbError ? "Image loaded ✓" : "Using gradient fallback"}
                      </div>
                    </div>

                    <div style={{ flex:1 }}>
                      <label className="ecm-lbl">Image URL</label>
                      <input type="text" value={thumbUrl} onChange={e => { setThumbUrl(e.target.value); setThumbError(false); }}
                        placeholder="https://example.com/image.jpg (optional)"
                        className={changed.thumbUrl ? "dirty" : ""}/>
                      {changed.thumbUrl && orig !== null && (
                        <div className="ecm-was">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#a89dc8" strokeWidth="1.8"><path d="M3 9l3-3 3 3M6 6V2"/></svg>
                          Was: <span>{orig.thumbUrl ? `"${orig.thumbUrl.slice(0, 40)}${orig.thumbUrl.length > 40 ? "…" : ""}"` : "no image"}</span>
                        </div>
                      )}
                      <div style={{ fontSize:11, color:"#a89dc8", marginTop:8, lineHeight:1.55 }}>
                        Leave blank to show the default gradient thumbnail.
                      </div>
                      {thumbUrl && !thumbError && (
                        <button onClick={() => setThumbUrl("")}
                          style={{ marginTop:10, fontSize:11.5, color:"#dc2626", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                          <svg width="10" height="10" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10"/></svg>
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* ══ SECTION 4: Audience ══════════════════════════════════════ */}
              <section ref={secAudience} style={{ scrollMarginTop:16 }}>
                <div className="ecm-card ecm-up" style={{ animationDelay:".15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,rgba(236,72,153,0.12),rgba(236,72,153,0.05))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>◆</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#0f0a2a", fontFamily:"'Playfair Display',serif" }}>Audience</div>
                      <div style={{ fontSize:11, color:"#a89dc8", marginTop:2 }}>Assign to specific companies</div>
                    </div>
                    {selectedCompanies.size > 0 && (
                      <span style={{ padding:"3px 10px", borderRadius:20, background:"#f0fdf4", fontSize:11, fontWeight:700, color:"#15803d" }}>
                        {selectedCompanies.size} selected
                      </span>
                    )}
                  </div>

                  {/* Filter row */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                    <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:600, color:"#4a3880", flexShrink:0 }}>
                      <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} style={{ accentColor:"#7c3aed", width:14, height:14 }}/>
                      Select all
                    </label>
                    <div style={{ width:1, height:18, background:"rgba(109,40,217,0.1)", margin:"0 4px" }}/>
                    {["All","F&B","Retail","Warehouse"].map(ind => (
                      <button key={ind} onClick={() => setIndustryFilter(ind)}
                        style={{ padding:"5px 13px", borderRadius:20, fontSize:11.5, fontWeight:600, cursor:"pointer", border:`1px solid ${industryFilter===ind?"rgba(109,40,217,0.38)":"rgba(109,40,217,0.12)"}`, background:industryFilter===ind?"#ede9fe":"#fff", color:industryFilter===ind?"#6d28d9":"#7c65a8", transition:"all .13s", fontFamily:"inherit" }}>
                        {ind === "All" ? "All Industries" : ind}
                      </button>
                    ))}
                    {/* Search */}
                    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px", borderRadius:10, border:"1.5px solid rgba(109,40,217,0.13)", background:"#fff", marginLeft:"auto" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#a89dc8" strokeWidth="1.8"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
                      <input type="text" placeholder="Search companies…" value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                        style={{ border:"none", outline:"none", background:"transparent", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12.5, color:"#18103a", width:140, padding:0 }}/>
                    </div>
                  </div>

                  {/* Company grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
                    {filteredClients.map((c, i) => (
                      <div key={c.id} className={`ecm-co${selectedCompanies.has(c.id) ? " on" : ""}`} onClick={() => toggleCompany(c.id)}>
                        <input type="checkbox" checked={selectedCompanies.has(c.id)} onChange={() => toggleCompany(c.id)} onClick={e => e.stopPropagation()} style={{ accentColor:"#7c3aed", width:14, height:14, flexShrink:0, cursor:"pointer" }}/>
                        <div style={{ width:30, height:30, borderRadius:8, background:CC_COLORS[i % CC_COLORS.length], color:"#fff", fontSize:10.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12.5, fontWeight:600, color:"#0f0a2a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                          <div style={{ fontSize:10.5, color:"#a89dc8", marginTop:1 }}>{c.cat}</div>
                        </div>
                      </div>
                    ))}
                    {filteredClients.length === 0 && (
                      <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"28px 20px", color:"#c4bdd8", fontSize:13, fontWeight:600 }}>No companies match</div>
                    )}
                  </div>

                  {selectedCompanies.size === 0 && (
                    <div style={{ marginTop:14, padding:"11px 15px", borderRadius:11, background:"#fefce8", border:"1px solid rgba(217,119,6,0.2)", fontSize:12, color:"#92400e", fontWeight:500, lineHeight:1.5 }}>
                      ℹ️ No companies selected — this course will be visible to <strong>all companies</strong>.
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
