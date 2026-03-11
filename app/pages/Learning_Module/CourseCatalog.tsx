'use client'

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import EditCourseModal from "./EditCourseModal";
import CourseModuleModal from "./CourseModuleModal";
import LoadingPopup from "../../Components/LoadingPopup";
import EnrollWizard from "../../Components/EnrollWizard";

import type { CourseCatalogProps } from "../Logic/CourseCatalogLogic";
import {
  useCourseCatalog,
  THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS, CARD_STYLES,
  computeReadiness, getCourseStage, stageBadge,
} from "../Logic/CourseCatalogLogic";

import { usePublishGuard } from "../Logic/CoursePublishLogic";
import api from "../../Services/api.service";

import "../../globals.css";

const DESIGN = `
  /* ── Tab toggle — bold mode cards ─────────────────────────── */
  .vtab-wrap {
    display:flex; gap:4px;
    background:rgba(255,255,255,0.8);
    border:1.5px solid rgba(109,40,217,0.12);
    border-radius:14px; padding:4px;
    backdrop-filter:blur(8px);
    box-shadow:0 2px 12px rgba(109,40,217,0.07);
  }
  .vtab-btn {
    display:flex; flex-direction:column; align-items:center; gap:1px;
    padding:8px 20px; border-radius:10px; border:none;
    font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .2s;
    background:transparent; min-width:88px;
  }
  .vtab-btn .vtab-count { font-size:22px; font-weight:900; color:var(--t4,#c4b9e8); line-height:1.1; letter-spacing:-.04em; transition:all .2s; }
  .vtab-btn .vtab-label { font-size:11px; font-weight:700; color:var(--t3,#8e7ec0); letter-spacing:.02em; transition:color .2s; }
  .vtab-btn .vtab-sub   { font-size:9px; font-weight:600; color:var(--t4,#c4b9e8); text-transform:uppercase; letter-spacing:.08em; transition:color .2s; }
  .vtab-btn:hover:not(.vtab-active):not(.vtab-active-tpl) .vtab-label { color:var(--t2,#4a3870); }
  .vtab-btn:hover:not(.vtab-active):not(.vtab-active-tpl) .vtab-count { color:var(--t2,#4a3870); }
  .vtab-btn.vtab-active { background:linear-gradient(145deg,#7c3aed,#5b21b6); box-shadow:0 4px 16px rgba(109,40,217,0.35); }
  .vtab-btn.vtab-active .vtab-count,
  .vtab-btn.vtab-active .vtab-label,
  .vtab-btn.vtab-active .vtab-sub { color:#fff; }
  .vtab-btn.vtab-active-tpl { background:linear-gradient(145deg,#0ea5e9,#0284c7); box-shadow:0 4px 16px rgba(14,165,233,0.35); }
  .vtab-btn.vtab-active-tpl .vtab-count,
  .vtab-btn.vtab-active-tpl .vtab-label,
  .vtab-btn.vtab-active-tpl .vtab-sub { color:#fff; }
  .vtab-divider { width:1px; background:rgba(109,40,217,0.1); margin:4px 0; align-self:stretch; }

  /* ── Workspace rows — editorial spine ──────────────────────── */
  @keyframes ws-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .ws-row {
    display:flex; align-items:stretch; border-radius:14px;
    overflow:hidden; position:relative;
    border:1.5px solid rgba(109,40,217,0.08);
    box-shadow:0 2px 8px rgba(109,40,217,0.05);
    transition:box-shadow .2s,border-color .2s,transform .2s;
    will-change:transform;
    margin-bottom:0;
  }
  .ws-row:hover {
    border-color:rgba(109,40,217,0.22);
    box-shadow:0 6px 24px rgba(109,40,217,0.14);
    transform:translateY(-2px);
    margin-bottom:-2px;
  }
  .ws-spine {
    width:68px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    position:relative; overflow:hidden; transition:width .2s;
  }
  .ws-row:hover .ws-spine { width:68px; }
  .ws-body { flex:1; min-width:0; display:flex; align-items:center; gap:14px; padding:12px 14px; background:#fff; }

  @keyframes stage-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  .ws-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:9.5px; font-weight:700; letter-spacing:.05em; white-space:nowrap; }
  .ws-badge-dot { width:5px; height:5px; border-radius:50%; animation:stage-pulse 2.5s ease infinite; }

  .ws-segs { display:flex; gap:3px; align-items:center; }
  .ws-seg { width:13px; height:5px; border-radius:3px; transition:all .3s; }

  .ws-btn-mod { padding:5px 11px; border-radius:8px; border:1.5px solid rgba(13,148,136,0.2); background:rgba(13,148,136,0.06); color:#0f766e; font-size:10.5px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; white-space:nowrap; transition:all .15s; }
  .ws-btn-mod:hover { background:rgba(13,148,136,0.13); border-color:rgba(13,148,136,0.35); }
  .ws-btn-promote { padding:5px 13px; border-radius:8px; border:none; background:linear-gradient(135deg,#7c3aed,#0d9488); color:#fff; font-size:10.5px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; display:flex; align-items:center; gap:5px; white-space:nowrap; box-shadow:0 2px 10px rgba(109,40,217,0.28); transition:all .15s; }
  .ws-btn-promote:hover { box-shadow:0 4px 16px rgba(109,40,217,0.42); transform:translateY(-1px); }
  .ws-btn-edit { width:30px; height:30px; border-radius:8px; border:1.5px solid rgba(109,40,217,0.15); background:rgba(109,40,217,0.05); color:#7c3aed; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .ws-btn-edit:hover { background:rgba(109,40,217,0.12); border-color:rgba(109,40,217,0.3); }
  .ws-btn-more { width:30px; height:30px; border-radius:8px; border:1.5px solid rgba(109,40,217,0.1); background:#fff; color:#8e7ec0; cursor:pointer; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .ws-btn-more:hover { background:rgba(109,40,217,0.06); color:#4a3870; }

  /* ── Stage filter chips ──────────────────────────────────────── */
  .sf-bar { display:flex; align-items:center; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
  .sf-chip { display:inline-flex; align-items:center; gap:5px; padding:5px 13px; border-radius:9px; border:1.5px solid rgba(109,40,217,0.1); background:#fff; font-size:11px; font-weight:600; color:#8e7ec0; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; }
  .sf-chip:hover { color:#7c3aed; border-color:rgba(109,40,217,0.25); }
  .sf-chip.on { background:linear-gradient(135deg,#7c3aed,#5b21b6); border-color:transparent; color:#fff; box-shadow:0 2px 10px rgba(109,40,217,0.3); }

  /* ── Catalog cards ─────────────────────────────────────────── */
  @keyframes cc3-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  .hero-card { border-radius:20px; overflow:hidden; background:#fff; border:1.5px solid rgba(109,40,217,0.1); box-shadow:0 4px 24px rgba(109,40,217,0.1); display:flex; cursor:pointer; margin-bottom:22px; min-height:170px; transition:box-shadow .22s,transform .22s; }
  .hero-card:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(109,40,217,0.18); }
  .cc3-card { border-radius:18px; overflow:hidden; background:#fff; border:1.5px solid rgba(109,40,217,0.08); box-shadow:0 2px 12px rgba(109,40,217,0.06); display:flex; flex-direction:column; cursor:pointer; transition:box-shadow .2s,transform .2s; }
  .cc3-card:hover { transform:translateY(-3px); box-shadow:0 12px 36px rgba(109,40,217,0.16); }
  .cc3-overlay { opacity:0; transition:opacity .22s; }
  .cc3-card:hover .cc3-overlay { opacity:1; }
  .cc3-shine { position:absolute; inset:0; pointer-events:none; background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,0.22) 50%,transparent 60%); background-size:200% 100%; background-position:200% 0; transition:background-position .6s ease; }
  .cc3-card:hover .cc3-shine { background-position:-200% 0; }
  .cc3-wm { position:absolute; bottom:-8px; right:6px; font-size:46px; font-weight:900; color:rgba(255,255,255,0.1); letter-spacing:-.04em; text-transform:uppercase; line-height:1; pointer-events:none; user-select:none; font-family:'DM Sans',sans-serif; }
  .cc3-btn { transition:all .15s; font-family:'DM Sans',sans-serif; }
  .cc3-emoji { transition:transform .3s; }
  .cc3-card:hover .cc3-emoji { transform:scale(1.08); }

  /* ── Template cards ────────────────────────────────────────── */
  .cc3-tpl-card { border-radius:18px; overflow:hidden; background:#fff; border:1.5px solid rgba(14,165,233,0.18); box-shadow:0 2px 12px rgba(14,165,233,0.06); display:flex; flex-direction:column; transition:box-shadow .2s,transform .2s; }
  .cc3-tpl-card:hover { transform:translateY(-3px); box-shadow:0 12px 36px rgba(14,165,233,0.18); }
  .tpl-hover-overlay { position:absolute; inset:0; background:rgba(2,100,180,0.88); backdrop-filter:blur(6px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; opacity:0; transition:opacity .22s ease; border-radius:16px 16px 0 0; }
  .cc3-tpl-card:hover .tpl-hover-overlay { opacity:1; }
  @keyframes tpl-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .tpl-cloning { animation:tpl-spin 0.9s linear infinite; display:inline-block; }

  /* ── Overflow menu ─────────────────────────────────────────── */
  @keyframes ov-in-down { from{opacity:0;transform:translateY(4px)}  to{opacity:1;transform:none} }
  @keyframes ov-in-up   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
  .ov-menu {
    position:fixed; background:#fff;
    border:1.5px solid rgba(109,40,217,0.12); border-radius:12px;
    box-shadow:0 8px 32px rgba(109,40,217,0.18);
    min-width:196px; padding:4px; z-index:9999;
  }
  .ov-menu.ov-down { animation:ov-in-down .14s ease both; transform-origin:top right; }
  .ov-menu.ov-up   { animation:ov-in-up   .14s ease both; transform-origin:bottom right; }
  .ov-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:7px; font-size:11.5px; font-weight:500; cursor:pointer; color:#18103a; transition:background .12s; border:none; background:transparent; font-family:'DM Sans',sans-serif; width:100%; text-align:left; white-space:nowrap; }
  .ov-item:hover { background:rgba(109,40,217,0.07); }
  .ov-item.tpl { color:#0369a1; }
  .ov-item.tpl:hover { background:rgba(14,165,233,0.08); }
  .ov-item.danger { color:#dc2626; }
  .ov-item.danger:hover { background:rgba(220,38,38,0.07); }
  .ov-sep { height:1px; background:rgba(109,40,217,0.07); margin:3px 4px; }

  /* ── Search ───────────────────────────────────────────────── */
  .search-box { display:flex; align-items:center; gap:7px; background:#fff; border:1.5px solid rgba(109,40,217,0.12); border-radius:10px; padding:6px 11px; transition:border-color .15s,box-shadow .15s; }
  .search-box:focus-within { border-color:rgba(109,40,217,0.35); box-shadow:0 0 0 3px rgba(109,40,217,0.08); }
  .search-box svg { flex-shrink:0; color:#c4b9e8; width:13px; height:13px; }
  .search-box input { border:none; outline:none; background:transparent; font-size:12px; font-family:'DM Sans',sans-serif; color:#18103a; width:155px; }
  .search-box input::placeholder { color:#c4b9e8; }

  @keyframes sat-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
`;

// FIX: add modulesHydrated to props so usePublishGuard can be gated
interface CourseCatalogExtendedProps extends CourseCatalogProps {
  modulesHydrated?: boolean;
}

export default function CourseCatalog({
  courses, setCourses, categories, setCategories, toast, onOpenCourse,
  publishedActivities,
  modulesHydrated = false,
}: CourseCatalogExtendedProps) {
  const {
    activeView, setActiveView,
    search, setSearch,
    activeCat, setActiveCat,
    workspaceStageFilter, setWorkspaceStageFilter,
    editOpen, editIdx,
    modOpen, modIdx,
    deleteConfirmOpen, deleteIdx, deleteTyped, setDeleteTyped,
    promoteIdx, unpublishIdx, cloningIdx,
    workspaceCourses, catalogCourses, templateCourses,
    handleEditSave, handleDelete, confirmDelete, cancelDelete,
    handleModSave, openViewer, handleCourseProgress,
    openEdit, openModules, closeEdit, closeMod,
    openPromote, cancelPromote, confirmPromote,
    openUnpublish, cancelUnpublish, confirmUnpublish,
    cloneTemplate,
  } = useCourseCatalog({ courses, setCourses, toast, onOpenCourse });

  // FIX: pass modulesHydrated so the guard doesn't fire before modules are loaded
  usePublishGuard(courses, setCourses, toast, modulesHydrated);

  const [saving,             setSaving]             = useState(false);
  const [savingMsg,          setSavingMsg]           = useState("Saving...");
  const [enrollWizardOpen,   setEnrollWizardOpen]   = useState(false);
  const [enrollTargetCourse, setEnrollTargetCourse] = useState<typeof courses[0] | null>(null);
  const [overflowOpenIdx,    setOverflowOpenIdx]    = useState<number | null>(null);
  const [overflowPos,        setOverflowPos]        = useState<{top:number;left:number;openAbove?:boolean} | null>(null);
  const [moduleLoadingIdx,   setModuleLoadingIdx]   = useState<number | null>(null);
  const [saveAsTplIdx,       setSaveAsTplIdx]       = useState<number | null>(null);
  const [savingAsTpl,        setSavingAsTpl]        = useState(false);

  const withLoader = (msg: string, fn: () => Promise<void> | void, duration = 1000) => {
    console.log("[withLoader] 🔵 Starting:", msg);
    setSavingMsg(msg); setSaving(true);
    setTimeout(async () => {
      try {
        await fn();
        console.log("[withLoader] ✅ Done:", msg);
      } catch (err) {
        console.error("[withLoader] ❌ Unhandled error in:", msg, err);
      }
      setTimeout(() => setSaving(false), duration);
    }, 400);
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>, idx: number) => {
    e.stopPropagation();
    if (overflowOpenIdx === idx) { setOverflowOpenIdx(null); setOverflowPos(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth  = 196;
    const menuHeight = 200;
    const left = Math.max(8, rect.right - menuWidth);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove  = spaceBelow < menuHeight + 8;
    const top = openAbove ? rect.top - 6 : rect.bottom + 6;
    setOverflowPos({ top, left, openAbove });
    setOverflowOpenIdx(idx);
  };

  const closeMenu = () => { setOverflowOpenIdx(null); setOverflowPos(null); };

  const handleSaveAsTemplate = (idx: number) => {
    console.log("[SaveAsTemplate] 🖱 Menu clicked — idx:", idx, "| course:", courses[idx]?.title, "| id:", courses[idx]?.id, "| stage:", courses[idx]?.stage);
    setSaveAsTplIdx(idx);
    closeMenu();
  };

  const confirmSaveAsTemplate = async () => {
    console.group("[SaveAsTemplate] ── confirmSaveAsTemplate");

    if (saveAsTplIdx === null) {
      console.warn("[SaveAsTemplate] ❌ Aborted — saveAsTplIdx is null");
      console.groupEnd();
      return;
    }

    const c = courses[saveAsTplIdx];
    console.log("[SaveAsTemplate] 📋 Course object:", c);
    console.log("[SaveAsTemplate] 📋 saveAsTplIdx:", saveAsTplIdx);
    console.log("[SaveAsTemplate] 📋 course.id:", c?.id);
    console.log("[SaveAsTemplate] 📋 course.stage (before):", c?.stage);

    if (!c.id) {
      console.error("[SaveAsTemplate] ❌ course.id is missing — cannot call API.");
      toast("Cannot save as template: course has no server ID.");
      console.groupEnd();
      return;
    }

    setSavingAsTpl(true);
    console.log("[SaveAsTemplate] 🔵 Calling api.courses.update(", c.id, ", { stage: 'template', active: false })");

    try {
      const r = await api.courses.update(c.id, { stage: "template", active: false });
      console.log("[SaveAsTemplate] 📥 API response:", r);

      if (r.success) {
        console.log("[SaveAsTemplate] ✅ API success — updating local state");
        setCourses((prev: typeof courses) => prev.map((cur, i) =>
          i === saveAsTplIdx ? { ...cur, stage: "template" as any, active: false } : cur
        ));
        toast("Course saved as Template — find it in the Templates tab.");
      } else {
        console.error("[SaveAsTemplate] ❌ API returned success:false —", r.error);
        toast(`Error: ${r.error || "Failed to save as template"}`);
      }
    } catch (err) {
      console.error("[SaveAsTemplate] ❌ Exception thrown during API call:", err);
      toast("Failed to save as template — server error.");
    } finally {
      setSavingAsTpl(false);
      setSaveAsTplIdx(null);
      console.groupEnd();
    }
  };

  const heroIdx = (() => {
    for (let i = courses.length - 1; i >= 0; i--) {
      if (getCourseStage(courses[i]) === "published") return i;
    }
    return null;
  })();

  const handleBackdropClick = () => closeMenu();

  const viewCounts = {
    workspace: courses.filter(c => { const s = getCourseStage(c); return s==="draft"||s==="review_ready"||s==="unpublished"; }).length,
    catalog:   courses.filter(c => getCourseStage(c) === "published").length,
    templates: courses.filter(c => getCourseStage(c) === "template").length,
  };

  const ReadinessRing = ({ score, color, size = 50 }: { score: number; color: string; size?: number }) => {
    const r = (size - 7) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    return (
      <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.85)"
            strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
        </svg>
      </div>
    );
  };

  const ReadinessSegs = ({ score, color }: { score: number; color: string }) => {
    const total = 7;
    const filled = Math.round((score / 100) * total);
    return (
      <div className="ws-segs">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="ws-seg" style={{ background: i < filled ? color : "rgba(109,40,217,0.08)" }} />
        ))}
      </div>
    );
  };

  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{DESIGN}</style>

      {/* ── Toolbar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexShrink:0 }}>
        <div className="vtab-wrap">
          <button className={`vtab-btn${activeView==="workspace"?" vtab-active":""}`} onClick={() => setActiveView("workspace")}>
            <span className="vtab-count">{viewCounts.workspace}</span>
            <span className="vtab-label">Workspace</span>
            <span className="vtab-sub">In progress</span>
          </button>
          <div className="vtab-divider" />
          <button className={`vtab-btn${activeView==="catalog"?" vtab-active":""}`} onClick={() => setActiveView("catalog")}>
            <span className="vtab-count">{viewCounts.catalog}</span>
            <span className="vtab-label">Catalog</span>
            <span className="vtab-sub">Published</span>
          </button>
          <div className="vtab-divider" />
          <button className={`vtab-btn${activeView==="templates"?" vtab-active-tpl":""}`} onClick={() => setActiveView("templates")}>
            <span className="vtab-count">{viewCounts.templates}</span>
            <span className="vtab-label">Templates</span>
            <span className="vtab-sub">Blueprints</span>
          </button>
        </div>
        <div style={{ flex:1 }} />
        <div className="search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder={`Search ${activeView}…`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ════ WORKSPACE VIEW ════ */}
      {activeView === "workspace" && (
        <>
          <div className="sf-bar">
            {(["All","draft","review_ready","unpublished"] as const).map(f => {
              const label = f==="All"?"All Stages": f==="draft"?"Drafts": f==="review_ready"?"Review Ready":"Unpublished";
              const count = f==="All" ? viewCounts.workspace : courses.filter(c => getCourseStage(c)===f).length;
              return (
                <button key={f} className={`sf-chip${workspaceStageFilter===f?" on":""}`} onClick={() => setWorkspaceStageFilter(f)}>
                  {label}
                  {count > 0 && <span style={{ fontSize:9.5, opacity:0.75 }}>({count})</span>}
                </button>
              );
            })}
          </div>

          <div className="lc-courses-scroll" onClick={handleBackdropClick}>
            <div style={{ display:"flex", flexDirection:"column", gap:9, padding:"2px 2px 16px" }}>
              {workspaceCourses.length === 0 ? (
                <div style={{ textAlign:"center", padding:48, color:"#8e7ec0", fontSize:13 }}>
                  {workspaceStageFilter==="All" ? "No courses in Workspace — create one to get started." : `No "${workspaceStageFilter}" courses.`}
                </div>
              ) : workspaceCourses.map((c, rowI) => {
                const realIdx = courses.indexOf(c);
                const stage   = getCourseStage(c);
                const badge   = stageBadge(stage);
                const { score, canPublish, checks } = computeReadiness(c);
                const modCount    = c.modules?.length ?? 0;
                const chCount     = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
                const missingHard = checks.filter(ch => !ch.ok && !ch.warn).map(ch => ch.label);
                const grad        = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
                const icon        = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
                const barColor    = score>=100?"#0d9488": score>=60?"#7c3aed": score>=30?"#d97706":"#dc2626";

                return (
                  <div key={realIdx} className="ws-row"
                    style={{
                      animation:`ws-in .25s ease ${rowI*0.04}s both`,
                      background:`linear-gradient(90deg,${grad[0]}10 0%,#fff 36%)`,
                    }}>

                    {/* Book spine */}
                    <div className="ws-spine" style={{ background:`linear-gradient(160deg,${grad[0]},${grad[1]})` }}>
                      <div style={{ position:"absolute", inset:0, backgroundImage:THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length], backgroundSize:"16px 16px", opacity:0.25 }} />
                      <div style={{ position:"relative", zIndex:1 }}>
                        <ReadinessRing score={score} color={barColor} size={50} />
                        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</div>
                      </div>
                    </div>

                    {/* Row body */}
                    <div className="ws-body">
                      {/* Title + badge */}
                      <div style={{ minWidth:0, flex:"0 0 200px" }}>
                        <div style={{ fontSize:13, fontWeight:800, color:"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>{c.title}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                          <span className="ws-badge" style={{ background:badge.bg, color:badge.color }}>
                            <span className="ws-badge-dot" style={{ background:badge.dot }} />
                            {badge.label}
                          </span>
                          {c.cat && <span style={{ fontSize:10, color:"#c4b9e8", fontWeight:500 }}>{c.cat}</span>}
                        </div>
                      </div>

                      {/* Readiness */}
                      <div style={{ flex:1, minWidth:80 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                          <ReadinessSegs score={score} color={barColor} />
                          <span style={{ fontSize:10, fontWeight:800, color:barColor, flexShrink:0 }}>{score}%</span>
                        </div>
                        {missingHard.length > 0
                          ? <div style={{ fontSize:10, color:"#dc2626", fontWeight:500 }}>Missing: {missingHard.slice(0,2).join(", ")}{missingHard.length>2?` +${missingHard.length-2}`:""}</div>
                          : <div style={{ fontSize:10, color:"#c4b9e8" }}>{modCount}m · {chCount}ch{c.companies?.length ? ` · ${c.companies.length} co.` : ""}</div>
                        }
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex", gap:5, alignItems:"center", flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        {canPublish && (
                          <button className="ws-btn-promote" onClick={() => openPromote(realIdx)}>
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 1v8M4 6l3-5 3 5M3 11h8"/></svg>
                            Publish
                          </button>
                        )}

                        <button className="ws-btn-mod" onClick={() => withLoader("Loading modules...", () => openModules(realIdx), 800)}>
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                          Modules
                        </button>

                        <button className="ws-btn-edit" onClick={() => withLoader("Loading editor...", () => openEdit(realIdx), 800)}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                        </button>

                        <button className="ws-btn-more" onClick={e => openMenu(e, realIdx)}>⋯</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ════ CATALOG VIEW ════ */}
      {activeView === "catalog" && (
        <>
          <div className="sf-bar">
            {categories.map(cat => (
              <button key={cat} className={`sf-chip${activeCat===cat?" on":""}`} onClick={() => setActiveCat(cat)}>{cat}</button>
            ))}
          </div>

          <div className="lc-courses-scroll">
            {heroIdx !== null && catalogCourses.some(c => courses.indexOf(c) === heroIdx) && (() => {
              const c    = courses[heroIdx];
              const grad = THUMB_GRADIENTS[heroIdx % THUMB_GRADIENTS.length];
              const pat  = THUMB_PATTERNS[heroIdx % THUMB_PATTERNS.length];
              const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              const modCount = c.modules?.length ?? 0;
              const chCount  = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
              return (
                <div className="hero-card" onClick={() => openViewer(heroIdx)}>
                  <div style={{ width:"40%", flexShrink:0, position:"relative", background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, overflow:"hidden" }}>
                    <div style={{ position:"absolute", inset:0, backgroundImage:pat, backgroundSize:"20px 20px" }} />
                    <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.18),transparent 70%)" }} />
                    <div style={{ position:"absolute", bottom:-10, left:-4, fontSize:54, fontWeight:900, color:"rgba(255,255,255,0.1)", textTransform:"uppercase", letterSpacing:"-.04em", lineHeight:1, userSelect:"none" as const }}>{c.cat}</div>
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:68, filter:"drop-shadow(0 10px 24px rgba(0,0,0,0.32))" }}>{icon}</div>
                    <div style={{ position:"absolute", top:12, left:12, padding:"4px 11px", borderRadius:20, background:"rgba(0,0,0,0.28)", backdropFilter:"blur(6px)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.95)", letterSpacing:".06em", textTransform:"uppercase" as const }}>⭐ Featured</div>
                  </div>
                  <div style={{ flex:1, padding:"22px 24px", display:"flex", flexDirection:"column" as const, justifyContent:"center" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#8e7ec0", textTransform:"uppercase" as const, letterSpacing:".1em", marginBottom:6 }}>{c.cat}</div>
                    <div style={{ fontSize:20, fontWeight:900, color:"#18103a", lineHeight:1.2, letterSpacing:"-.03em", marginBottom:8 }}>{c.title}</div>
                    <div style={{ fontSize:12.5, color:"#4a3870", lineHeight:1.6, display:"-webkit-box" as const, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden", marginBottom:14 }}>{c.desc}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {c.time && <span style={{ fontSize:10.5, color:"#8e7ec0" }}>⏱ {c.time}</span>}
                      {modCount > 0 && <span style={{ fontSize:10.5, color:"#0d9488", fontWeight:700 }}>{modCount}m · {chCount}ch</span>}
                      <div style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:8, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.2)", fontSize:10, fontWeight:700, color:"#0d9488", display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:"#0d9488", display:"inline-block" }} />Live
                      </div>
                    </div>
                    <div style={{ marginTop:10 }} onClick={e => e.stopPropagation()}>
                      <button style={{ fontSize:10.5, color:"#8e7ec0", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }} onClick={() => openUnpublish(heroIdx)}>Unpublish →</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(272px,1fr))", gap:16, padding:"4px 2px 16px" }}>
              {catalogCourses.length === 0 ? (
                <div style={{ gridColumn:"span 3", textAlign:"center", padding:32, color:"#8e7ec0", fontSize:13 }}>No published courses — promote one from the Workspace.</div>
              ) : catalogCourses.map((c, i) => {
                const realIdx  = courses.indexOf(c);
                if (realIdx === heroIdx) return null;
                const modCount = c.modules?.length ?? 0;
                const chCount  = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
                const grad     = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
                const pat      = THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length];
                const icon     = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
                const progPct  = typeof c.progress === 'number' ? c.progress : 0;
                const isCompleted = c.completed === true || progPct >= 100;
                return (
                  <div key={i} className="cc3-card" style={{ animation:`cc3-up .3s ease ${i*0.05}s both` }} onClick={() => openViewer(realIdx)}>
                    <div style={{ height:178, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, flexShrink:0 }}>
                      <div style={{ position:"absolute", inset:0, backgroundImage:pat, backgroundSize:"20px 20px", pointerEvents:"none" }} />
                      <div className="cc3-wm">{c.cat?.slice(0,8)}</div>
                      {c.thumb && <img src={c.thumb} alt={c.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.35, mixBlendMode:"luminosity" }} />}
                      <div style={{ position:"absolute", top:12, left:12, padding:"3px 10px", borderRadius:20, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(8px)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.92)", letterSpacing:".06em", textTransform:"uppercase" as const }}>{c.cat}</div>
                      <div style={{ position:"absolute", top:12, right:12, padding:"3px 8px", borderRadius:20, background:"rgba(21,128,61,0.85)", backdropFilter:"blur(6px)", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.85)" }} />Published
                      </div>
                      <div className="cc3-emoji" style={{ position:"absolute", bottom:14, left:16, fontSize:54, lineHeight:1, filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.35))", userSelect:"none" as const }}>{icon}</div>
                      {progPct > 0 && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"rgba(0,0,0,0.3)" }}>
                          <div style={{ height:"100%", width:`${progPct}%`, background:"rgba(255,255,255,0.85)", borderRadius:"0 2px 2px 0" }} />
                        </div>
                      )}
                      <div className="cc3-overlay" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.44)", backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <div className="cc3-shine" />
                        <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, position:"relative", zIndex:1 }}>
                          <div style={{ width:50, height:50, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
                          </div>
                          <span style={{ color:"#fff", fontSize:12, fontWeight:700, letterSpacing:".05em" }}>{isCompleted ? "Review" : progPct > 0 ? `Continue · ${progPct}%` : "Preview"}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding:"15px 16px 13px", flex:1, display:"flex", flexDirection:"column" as const }}>
                      <div style={{ fontSize:14, fontWeight:800, color:"#18103a", lineHeight:1.25, marginBottom:5, letterSpacing:"-.01em" }}>{c.title}</div>
                      <div style={{ fontSize:11.5, color:"#8e7ec0", lineHeight:1.55, display:"-webkit-box" as const, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden", marginBottom:11 }}>{c.desc}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        {c.time && <span style={{ fontSize:10.5, color:"#c4b9e8" }}>⏱ {c.time}</span>}
                        {modCount > 0 && <span style={{ fontSize:10.5, color:"#0d9488", fontWeight:700 }}>{modCount}m · {chCount}ch</span>}
                      </div>
                      <div style={{ display:"flex", gap:6, marginTop:"auto" }} onClick={e => e.stopPropagation()}>
                        <button className="cc3-btn"
                          style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1.5px solid rgba(13,148,136,0.2)", background:"rgba(13,148,136,0.06)", color:"#0f766e", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}
                          onClick={() => { setEnrollTargetCourse(c); setEnrollWizardOpen(true); }}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5.5" cy="4" r="2.5"/><path d="M1 12c0-2.5 2-4.5 4.5-4.5S10 9.5 10 12"/><path d="M11 5.5v4M13 7.5h-4"/></svg>
                          Enroll
                        </button>
                        <button className="cc3-btn"
                          style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1.5px solid rgba(100,116,139,0.15)", background:"rgba(100,116,139,0.05)", color:"#64748b", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
                          onClick={() => openUnpublish(realIdx)}>
                          Unpublish
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ════ TEMPLATES VIEW ════ */}
      {activeView === "templates" && (
        <>
          <div style={{ padding:"11px 16px", borderRadius:12, background:"rgba(14,165,233,0.06)", border:"1.5px solid rgba(14,165,233,0.18)", marginBottom:16, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#0ea5e9,#0284c7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>📋</div>
            <div style={{ fontSize:12, color:"#0369a1", lineHeight:1.5 }}>
              <strong>Templates</strong> are reusable blueprints. Clone one to create a new Draft in Workspace — the original stays unchanged.
            </div>
          </div>

          <div className="lc-courses-scroll">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(252px,1fr))", gap:16, padding:"4px 2px 16px" }}>
              {templateCourses.length === 0 ? (
                <div style={{ gridColumn:"span 3", textAlign:"center", padding:48, color:"#8e7ec0", fontSize:13 }}>
                  No templates yet. Save a course as a Template from the Workspace using the ⋯ menu.
                </div>
              ) : templateCourses.map((c, i) => {
                const realIdx  = courses.indexOf(c);
                const modCount = c.modules?.length ?? 0;
                const chCount  = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
                const grad     = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
                const pat      = THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length];
                const icon     = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
                const isCloning = cloningIdx === realIdx;
                return (
                  <div key={i} className="cc3-tpl-card" style={{ animation:`cc3-up .3s ease ${i*0.05}s both` }}>
                    <div style={{ height:164, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${grad[0]}cc,${grad[1]}cc)`, flexShrink:0, borderRadius:"16px 16px 0 0" }}>
                      <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,rgba(14,165,233,0.1) 0,rgba(14,165,233,0.1) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(14,165,233,0.1) 0,rgba(14,165,233,0.1) 1px,transparent 1px,transparent 28px)" }} />
                      <div style={{ position:"absolute", inset:0, backgroundImage:pat, backgroundSize:"20px 20px", opacity:0.35 }} />
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", transform:"rotate(-22deg)", fontSize:28, fontWeight:900, color:"rgba(255,255,255,0.12)", letterSpacing:".2em", textTransform:"uppercase" as const, userSelect:"none" as const, pointerEvents:"none" }}>TEMPLATE</div>
                      <div style={{ position:"absolute", top:10, left:10, padding:"3px 10px", borderRadius:20, background:"rgba(14,165,233,0.9)", backdropFilter:"blur(6px)", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:5, letterSpacing:".04em" }}>
                        <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1.5" y="1.5" width="11" height="11" rx="2"/><path d="M4 5h6M4 7h6M4 9h4"/></svg>
                        Blueprint
                      </div>
                      <div style={{ position:"absolute", top:8, right:8, zIndex:10 }} onClick={e => e.stopPropagation()}>
                        <button
                          style={{ width:28, height:28, borderRadius:7, border:"1px solid rgba(255,255,255,0.3)", background:"rgba(0,0,0,0.25)", backdropFilter:"blur(6px)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700 }}
                          onClick={e => openMenu(e, realIdx)}>⋯</button>
                      </div>
                      <div className="cc3-emoji" style={{ position:"absolute", bottom:12, left:14, fontSize:50, lineHeight:1, filter:"drop-shadow(0 4px 14px rgba(0,0,0,0.3))", userSelect:"none" as const, opacity:0.88 }}>{icon}</div>
                      <div className="tpl-hover-overlay">
                        <div style={{ fontSize:30 }}>📋</div>
                        <div style={{ fontSize:13.5, fontWeight:900, color:"#fff", letterSpacing:"-.01em" }}>{isCloning ? "Cloning…" : "Clone to Workspace"}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.78)" }}>Creates a new Draft course</div>
                        <button
                          onClick={e => { e.stopPropagation(); cloneTemplate(realIdx); }}
                          disabled={isCloning}
                          style={{ padding:"8px 22px", borderRadius:10, border:"2px solid rgba(255,255,255,0.85)", background:"rgba(255,255,255,0.18)", color:"#fff", fontSize:12.5, fontWeight:700, cursor:isCloning?"wait":"pointer", fontFamily:"inherit", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", gap:7, marginTop:4 }}>
                          {isCloning ? <><span className="tpl-cloning">⟳</span> Cloning…</> : <><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 10V2h8"/></svg> Clone</>}
                        </button>
                      </div>
                    </div>
                    <div style={{ padding:"14px 15px 15px", flex:1, display:"flex", flexDirection:"column" as const }}>
                      <div style={{ fontSize:13.5, fontWeight:800, color:"#18103a", lineHeight:1.25, marginBottom:5, letterSpacing:"-.01em" }}>{c.title}</div>
                      {c.desc && <div style={{ fontSize:11, color:"#8e7ec0", lineHeight:1.55, display:"-webkit-box" as const, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden", marginBottom:10 }}>{c.desc}</div>}
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:13 }}>
                        {c.cat && <span style={{ padding:"2px 9px", borderRadius:8, background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.2)", fontSize:10, fontWeight:600, color:"#0369a1" }}>{c.cat}</span>}
                        {c.time && <span style={{ fontSize:10, color:"#c4b9e8" }}>⏱ {c.time}</span>}
                        {modCount > 0 && <span style={{ fontSize:10, color:"#c4b9e8", fontWeight:500 }}>{modCount}m · {chCount}ch</span>}
                      </div>
                      <button className="cc3-btn"
                        onClick={() => cloneTemplate(realIdx)} disabled={isCloning}
                        style={{ width:"100%", padding:"9px", borderRadius:10, border:"1.5px solid rgba(14,165,233,0.3)", background:isCloning?"rgba(14,165,233,0.06)":"rgba(14,165,233,0.07)", color:"#0369a1", fontSize:12, fontWeight:700, cursor:isCloning?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", marginTop:"auto", transition:"all .15s" }}>
                        {isCloning
                          ? <><span className="tpl-cloning">⟳</span> Cloning to Workspace…</>
                          : <><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 10V2h8"/></svg> Clone to Workspace</>
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ════ PROMOTE MODAL ════ */}
      {promoteIdx !== null && (() => {
        const c = courses[promoteIdx];
        const { score, checks, blocking, warnings, canPublish } = computeReadiness(c);
        const passed = checks.filter(ch => ch.ok);
        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(18,10,40,0.72)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <style>{`@keyframes pm-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }`}</style>
            <div style={{ background:"#fff", borderRadius:20, width:"min(520px,94vw)", maxHeight:"80vh", overflow:"auto", animation:"pm-in .2s ease both", boxShadow:"0 32px 80px rgba(18,10,40,0.35)" }}>
              <div style={{ background:"linear-gradient(135deg,#1e1245,#4c1d95 60%,#064e3b)", padding:"22px 26px 20px", borderRadius:"18px 18px 0 0" }}>
                <div style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-.02em" }}>Publish to Catalog</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:4 }}>{c?.title}</div>
              </div>
              <div style={{ padding:"22px 26px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, padding:"14px 16px", borderRadius:12, background:`${canPublish ? "rgba(13,148,136,0.07)" : "rgba(220,38,38,0.06)"}`, border:`1.5px solid ${canPublish ? "rgba(13,148,136,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                  <div style={{ fontSize:28, fontWeight:900, color:canPublish ? "#0d9488" : "#dc2626", letterSpacing:"-.04em" }}>{score}%</div>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:"#18103a" }}>{canPublish ? "Ready to publish!" : "Not ready to publish"}</div>
                    <div style={{ fontSize:11, color:"#8e7ec0", marginTop:2 }}>{passed.length}/{checks.length} requirements met</div>
                  </div>
                </div>
                {blocking.length > 0 && (
                  <div style={{ marginBottom:16, padding:"12px 14px", borderRadius:10, background:"rgba(220,38,38,0.05)", border:"1.5px solid rgba(220,38,38,0.18)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Required before publishing</div>
                    {blocking.map((ch, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom: i < blocking.length - 1 ? "1px solid rgba(220,38,38,0.08)" : "none" }}>
                        <span style={{ color:"#dc2626", fontSize:13, flexShrink:0 }}>✕</span>
                        <span style={{ fontSize:12, color:"#4a3870", fontWeight:600 }}>{ch.label}</span>
                        <span style={{ fontSize:11, color:"#dc2626", marginLeft:"auto" }}>{ch.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {warnings.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#92400e", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Warnings</div>
                    {warnings.map((ch, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid rgba(109,40,217,0.06)" }}>
                        <span style={{ color:"#d97706", fontSize:12 }}>⚠</span>
                        <span style={{ fontSize:12, color:"#4a3870" }}>{ch.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
                  <button onClick={cancelPromote} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid rgba(109,40,217,0.15)", background:"transparent", color:"#4a3870", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button
                    onClick={confirmPromote}
                    disabled={!canPublish}
                    title={!canPublish ? `Fix required fields first: ${blocking.map(b => b.label).join(", ")}` : undefined}
                    style={{ padding:"9px 22px", borderRadius:9, border:"none", background: canPublish ? "linear-gradient(135deg,#7c3aed,#0d9488)" : "rgba(109,40,217,0.2)", color: canPublish ? "#fff" : "#a594d4", fontSize:12.5, fontWeight:700, cursor: canPublish ? "pointer" : "not-allowed", fontFamily:"inherit", boxShadow: canPublish ? "0 4px 16px rgba(124,58,237,0.35)" : "none", transition:"all .15s" }}>
                    {canPublish ? "Publish to Catalog →" : "Complete required fields first"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ UNPUBLISH MODAL ════ */}
      {unpublishIdx !== null && (() => {
        const c = courses[unpublishIdx];
        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(18,10,40,0.72)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <style>{`@keyframes pm-in2 { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }`}</style>
            <div style={{ background:"#fff", borderRadius:20, width:"min(420px,94vw)", animation:"pm-in2 .2s ease both", boxShadow:"0 32px 80px rgba(18,10,40,0.35)", overflow:"hidden" }}>
              <div style={{ padding:"22px 26px 18px", background:"rgba(245,158,11,0.06)", borderBottom:"1.5px solid rgba(245,158,11,0.15)" }}>
                <div style={{ fontSize:16, fontWeight:800, color:"#18103a" }}>Unpublish Course</div>
                <div style={{ fontSize:12, color:"#8e7ec0", marginTop:3 }}>{c?.title}</div>
              </div>
              <div style={{ padding:"20px 26px" }}>
                <div style={{ fontSize:13, color:"#4a3870", lineHeight:1.6, marginBottom:20 }}>This will remove the course from the public catalog and return it to Workspace as Unpublished.</div>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button onClick={cancelUnpublish} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid rgba(109,40,217,0.15)", background:"transparent", color:"#4a3870", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button onClick={confirmUnpublish} style={{ padding:"9px 22px", borderRadius:9, border:"none", background:"#dc2626", color:"#fff", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Unpublish</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ DELETE CONFIRM ════ */}
      {deleteConfirmOpen && deleteIdx !== null && (() => {
        const c = courses[deleteIdx];
        const isTemplate = getCourseStage(c) === "template";
        const nameMatch = deleteTyped.trim().toLowerCase() === c?.title?.trim().toLowerCase();
        return (
          <div style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(18,10,40,0.78)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <style>{`@keyframes pm-in3 { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }`}</style>
            <div style={{ background:"#fff", borderRadius:20, width:"min(420px,94vw)", animation:"pm-in3 .2s ease both", boxShadow:"0 32px 80px rgba(18,10,40,0.4)", overflow:"hidden" }}>
              <div style={{ padding:"22px 26px 18px", background:"rgba(220,38,38,0.05)", borderBottom:"1.5px solid rgba(220,38,38,0.12)" }}>
                <div style={{ fontSize:16, fontWeight:800, color:"#dc2626" }}>Delete {isTemplate ? "Template" : "Course"}</div>
                <div style={{ fontSize:12, color:"#8e7ec0", marginTop:3 }}>{c?.title}</div>
              </div>
              <div style={{ padding:"20px 26px" }}>
                <div style={{ fontSize:13, color:"#4a3870", lineHeight:1.6, marginBottom:16 }}>This cannot be undone. Type the name to confirm.</div>
                <input type="text" value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} placeholder={`Type "${c?.title}" to confirm`}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:9, border:"1.5px solid rgba(220,38,38,0.3)", background:"rgba(220,38,38,0.03)", fontSize:12.5, fontFamily:"inherit", color:"#18103a", outline:"none", boxSizing:"border-box" as const }} />
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:18 }}>
                  <button onClick={cancelDelete} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid rgba(109,40,217,0.15)", background:"transparent", color:"#4a3870", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button onClick={confirmDelete} disabled={!nameMatch}
                    style={{ padding:"9px 22px", borderRadius:9, border:"none", background:nameMatch?"#dc2626":"rgba(220,38,38,0.3)", color:"#fff", fontSize:12.5, fontWeight:700, cursor:nameMatch?"pointer":"not-allowed", fontFamily:"inherit" }}>
                    Delete {isTemplate ? "Template" : "Course"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ SAVE AS TEMPLATE CONFIRM ════ */}
      {saveAsTplIdx !== null && (() => {
        const c = courses[saveAsTplIdx];
        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(18,10,40,0.72)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <style>{`@keyframes sat-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }`}</style>
            <div style={{ background:"#fff", borderRadius:20, width:"min(440px,94vw)", animation:"sat-in .2s ease both", boxShadow:"0 32px 80px rgba(18,10,40,0.35)", overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(135deg,#0c4a6e,#0ea5e9 70%,#0369a1)", padding:"22px 26px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📋</div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-.02em" }}>Save as Template</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{c?.title}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding:"22px 26px" }}>
                <div style={{ padding:"13px 15px", borderRadius:12, background:"rgba(14,165,233,0.06)", border:"1.5px solid rgba(14,165,233,0.18)", marginBottom:18 }}>
                  <div style={{ fontSize:12.5, color:"#0369a1", lineHeight:1.6 }}>
                    This course will be moved to <strong>Templates</strong> and will no longer appear in the Workspace. You can clone it any time to create a new Draft.
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, padding:"11px 13px", borderRadius:10, background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.18)", marginBottom:20 }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>⚠️</span>
                  <span style={{ fontSize:11.5, color:"#92400e", lineHeight:1.5 }}>
                    Any enrolled learners or progress data on this course will be unaffected — only the course stage changes.
                  </span>
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button onClick={() => setSaveAsTplIdx(null)} style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid rgba(109,40,217,0.15)", background:"transparent", color:"#4a3870", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                  <button onClick={confirmSaveAsTemplate} disabled={savingAsTpl}
                    style={{ padding:"9px 22px", borderRadius:9, border:"none", background: savingAsTpl ? "rgba(14,165,233,0.4)" : "linear-gradient(135deg,#0ea5e9,#0284c7)", color:"#fff", fontSize:12.5, fontWeight:700, cursor: savingAsTpl ? "wait" : "pointer", fontFamily:"inherit", boxShadow:"0 4px 16px rgba(14,165,233,0.3)", display:"flex", alignItems:"center", gap:6 }}>
                    {savingAsTpl
                      ? <><span style={{ display:"inline-block", animation:"tpl-spin .8s linear infinite" }}>⟳</span> Saving…</>
                      : <><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="1.5" y="1.5" width="11" height="11" rx="2"/><path d="M4 5h6M4 7h6M4 9h4"/></svg> Save as Template</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════ MODULE LOADING INTERSTITIAL ════ */}
      {moduleLoadingIdx !== null && (() => {
        const c = courses[moduleLoadingIdx];
        return (
          <div style={{ position:"fixed", inset:0, zIndex:4500, background:"linear-gradient(135deg,#0f0628,#0d2040)", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center" }}>
            <style>{`@keyframes mli-spin{to{transform:rotate(360deg)}} @keyframes mli-slide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}} @keyframes mli-bar{from{width:0%}to{width:100%}} @keyframes mli-dot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
            <div style={{ position:"relative", width:88, height:88, marginBottom:28 }}>
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ position:"absolute", inset:0, animation:"mli-spin 1.4s linear infinite" }}>
                <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="6"/>
                <circle cx="44" cy="44" r="38" fill="none" stroke="url(#mli-g)" strokeWidth="6" strokeDasharray="80 160" strokeLinecap="round"/>
                <defs><linearGradient id="mli-g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#0d9488"/></linearGradient></defs>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📚</div>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:10, animation:"mli-slide .3s ease both" }}>Opening Editor</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-.03em", marginBottom:6, animation:"mli-slide .35s ease .05s both", maxWidth:320, textAlign:"center" as const }}>{c?.title}</div>
            <div style={{ width:240, height:3, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden", marginTop:28 }}>
              <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#7c3aed,#0d9488)", animation:"mli-bar 1.3s cubic-bezier(.4,0,.2,1) forwards" }}/>
            </div>
            <div style={{ display:"flex", gap:6, marginTop:18 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"rgba(124,58,237,0.7)", animation:`mli-dot 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        );
      })()}

      {/* ── Overflow menu portal ── */}
      {overflowOpenIdx !== null && overflowPos !== null && typeof document !== "undefined" && createPortal((() => {
        const menuIdx = overflowOpenIdx;
        const c = courses[menuIdx];
        const stage = getCourseStage(c);
        const isWs = stage==="draft"||stage==="review_ready"||stage==="unpublished";
        const isTemplate = stage==="template";
        const { canPublish } = computeReadiness(c);
        return (
          <>
            <div style={{ position:"fixed", inset:0, zIndex:9998 }} onClick={closeMenu} />
            <div className={`ov-menu ${overflowPos.openAbove ? "ov-up" : "ov-down"}`}
              style={{
                top: overflowPos.openAbove ? undefined : overflowPos.top,
                bottom: overflowPos.openAbove ? window.innerHeight - overflowPos.top : undefined,
                left: overflowPos.left,
              }}
              onClick={e => e.stopPropagation()}>
              {isWs && <>
                <button className="ov-item" onClick={() => { closeMenu(); withLoader("Loading editor...", () => openEdit(menuIdx), 800); }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                  Edit details
                </button>
                <button className="ov-item" onClick={() => { closeMenu(); withLoader("Loading modules...", () => openModules(menuIdx), 800); }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                  Edit modules
                </button>
                {canPublish && (
                  <button className="ov-item" style={{ color:"#7c3aed", fontWeight:700 }} onClick={() => { closeMenu(); openPromote(menuIdx); }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 1v8M4 6l3-5 3 5M3 11h8"/></svg>
                    Publish to Catalog
                  </button>
                )}
                <button className="ov-item" onClick={() => { closeMenu(); cloneTemplate(menuIdx); }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 10V2h8"/></svg>
                  Clone course
                </button>
                <button className="ov-item tpl" onClick={() => handleSaveAsTemplate(menuIdx)}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1.5" y="1.5" width="11" height="11" rx="2"/><path d="M4 5h6M4 7h6M4 9h4"/></svg>
                  Save as Template
                </button>
              </>}
              {isTemplate && <>
                <button className="ov-item" onClick={() => { closeMenu(); withLoader("Loading editor...", () => openEdit(menuIdx), 800); }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                  Edit template
                </button>
                <button className="ov-item" onClick={() => { closeMenu(); cloneTemplate(menuIdx); }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 10V2h8"/></svg>
                  Clone to Workspace
                </button>
              </>}
              <div className="ov-sep" />
              <button className="ov-item danger" onClick={() => { closeMenu(); handleDelete(menuIdx); }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"/></svg>
                Delete {isTemplate ? "template" : "course"}
              </button>
            </div>
          </>
        );
      })(), document.body)}

      {/* Modals */}
      <EditCourseModal open={editOpen} onClose={closeEdit}
        onSave={data => withLoader("Saving...", () => handleEditSave(data), 1000)}
        editCourse={editIdx !== null ? courses[editIdx] : null}
        categories={categories} setCategories={setCategories} toast={toast} />
      <CourseModuleModal open={modOpen} course={modIdx !== null ? courses[modIdx] : null} courseIdx={modIdx}
        onClose={closeMod}
        onSave={(idx, data) => withLoader("Saving modules...", () => handleModSave(idx, data), 1200)}
        toast={toast} publishedActivities={publishedActivities} />
      <LoadingPopup visible={saving} message={savingMsg} />
      {enrollWizardOpen && enrollTargetCourse && (
        <EnrollWizard course={enrollTargetCourse} onClose={() => { setEnrollWizardOpen(false); setEnrollTargetCourse(null); }} toast={toast} />
      )}
    </>
  );
}
