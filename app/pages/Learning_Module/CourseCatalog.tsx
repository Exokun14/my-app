'use client'

import { useState, useEffect } from "react";
import CreateCourseModal from "../../Components/CreateCourseModal";
import EditCourseModal from "./EditCourseModal";
import CourseModuleModal from "./CourseModuleModal";
import LoadingPopup from "../../Components/LoadingPopup";
import EnrollWizard from "../../Components/EnrollWizard";

import type { CourseCatalogProps } from "../Logic/CourseCatalogLogic";
import { useCourseCatalog, THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS, CARD_STYLES } from "../Logic/CourseCatalogLogic";
import "../../globals.css";

export default function CourseCatalog({
  courses, setCourses, categories, setCategories, toast, onOpenCourse, publishedActivities,
}: CourseCatalogProps) {
  const {
    search, setSearch,
    activeCat, setActiveCat,
    statusFilter, setStatusFilter,
    filterOn, setFilterOn,
    editOpen, editIdx,
    modOpen, modIdx,
    deleteConfirmOpen, deleteIdx,
    filtered,
    handleEditSave,
    handleDelete,
    confirmDelete,
    cancelDelete,
    handleModSave,
    openViewer,
    handleCourseProgress,
    openEdit,
    openModules,
    closeEdit,
    closeMod,
  } = useCourseCatalog({ courses, setCourses, toast, onOpenCourse });

  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState("Saving...");
  const [enrollWizardOpen, setEnrollWizardOpen] = useState(false);
  const [enrollTargetCourse, setEnrollTargetCourse] = useState<typeof courses[0] | null>(null);

  // ── Add Modules Prompt (shown after course creation OR blocked publish) ──
  const [addModulesPromptIdx, setAddModulesPromptIdx] = useState<number | null>(null);
  const [prevCourseCount, setPrevCourseCount] = useState(courses.length);
  // Full-screen interstitial while transitioning into module editor
  const [moduleLoadingIdx, setModuleLoadingIdx] = useState<number | null>(null);

  // Detect when a brand-new course is added (length increases) → show the prompt
  useEffect(() => {
    if (courses.length > prevCourseCount) {
      const newIdx = courses.length - 1;
      if ((courses[newIdx]?.modules?.length ?? 0) === 0) {
        setAddModulesPromptIdx(newIdx);
      }
    }
    setPrevCourseCount(courses.length);
  }, [courses.length]);

  // ── Launch / Publish flow ──
  // launched = has gone through the rocket ceremony; active = published to catalog
  const [launchedIds, setLaunchedIds] = useState<Set<number>>(new Set());
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [launchIdx, setLaunchIdx] = useState<number | null>(null);
  const [launchPhase, setLaunchPhase] = useState<"idle"|"counting"|"blastoff"|"done">("idle");

  const withLoader = (msg: string, fn: () => void, duration = 1000) => {
    setSavingMsg(msg);
    setSaving(true);
    setTimeout(() => {
      fn();
      setTimeout(() => setSaving(false), duration);
    }, 400); // Show loader for 400ms before executing so it's visible
  };

  // Shows a full-screen loading interstitial, then opens the module editor
  const goToModules = (idx: number) => {
    setAddModulesPromptIdx(null);
    setModuleLoadingIdx(idx);
    setTimeout(() => {
      setModuleLoadingIdx(null);
      openModules(idx);
    }, 1400);
  };

  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{`
        /* ── Sleek filter bar ── */
        .sf-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .sf-bar.hidden { display: none; }

        .sf-section {
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 3px;
        }
        .sf-divider {
          width: 1px; height: 14px;
          background: var(--border);
          margin: 0 2px;
          flex-shrink: 0;
        }
        .sf-label {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--t4);
          padding: 0 6px;
          flex-shrink: 0;
        }
        .sf-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--t2);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all .14s;
          background: transparent;
          border: none;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .sf-chip:hover {
          background: var(--surface2);
          color: var(--t1);
        }
        .sf-chip.on {
          background: linear-gradient(135deg, var(--purple), var(--purple-d));
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(124,58,237,0.25);
        }
        .sf-chip.on-status-pub {
          background: linear-gradient(135deg, #065f46, #0d9488);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(13,148,136,0.25);
        }
        .sf-chip.on-status-dft {
          background: linear-gradient(135deg, #78350f, #d97706);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(217,119,6,0.25);
        }
        .sf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexShrink:0 }}>
        <span style={{ fontSize:15, fontWeight:700, color:"var(--t1)", letterSpacing:"-0.01em" }}>Course Lists</span>
        <div style={{ flex:1 }} />
        <button className={`lc-filter-icon-btn${filterOn?" active":""}`} onClick={() => setFilterOn(v => !v)}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 4h12M4 8h8M6 12h4"/></svg>
        </button>
        <div className="search-box" style={{ width:168, padding:"5px 10px" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize:11.5 }} />
        </div>
      </div>

      {/* ── Sleek filter bar ── */}
      <div className={`sf-bar${filterOn ? "" : " hidden"}`}>
        {/* Category group */}
        <div className="sf-section">
          <span className="sf-label">Category</span>
          <div className="sf-divider" />
          {categories.map(cat => (
            <button
              key={cat}
              className={`sf-chip${activeCat === cat ? " on" : ""}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status group */}
        <div className="sf-section">
          <span className="sf-label">Status</span>
          <div className="sf-divider" />
          <button className={`sf-chip${statusFilter === "All" ? " on" : ""}`} onClick={() => setStatusFilter("All")}>All</button>
          <button
            className={`sf-chip${statusFilter === "Published" ? " on-status-pub" : ""}`}
            onClick={() => setStatusFilter("Published")}
          >
            <span className="sf-dot" style={{ background: statusFilter === "Published" ? "rgba(255,255,255,0.8)" : "#16a34a" }} />
            Published
          </button>
          <button
            className={`sf-chip${statusFilter === "Draft" ? " on-status-dft" : ""}`}
            onClick={() => setStatusFilter("Draft")}
          >
            <span className="sf-dot" style={{ background: statusFilter === "Draft" ? "rgba(255,255,255,0.8)" : "#d97706" }} />
            Draft
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="lc-courses-scroll">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(268px,1fr))", gap:16, padding:"4px 2px 16px" }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn:"span 3", textAlign:"center", padding:32, color:"var(--t3)", fontSize:13 }}>No courses found</div>
          ) : filtered.map((c, i) => {
            const realIdx  = courses.indexOf(c);
            const modCount = c.modules?.length ?? 0;
            const chCount  = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
            const grad     = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
            const pat      = THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length];
            const icon     = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
            const progPct      = typeof c.progress === 'number' ? c.progress : 0;
            const isCompleted  = c.completed === true || progPct >= 100;
            const timeSpentMin = c.time_spent ?? 0;
            const timeLabel    = timeSpentMin > 0
              ? timeSpentMin >= 60
                ? `${Math.floor(timeSpentMin / 60)}h ${timeSpentMin % 60}m spent`
                : `${timeSpentMin}m spent`
              : null;

            return (
              <div key={i} className="cc3-card"
                style={{ animation:`cc3-up .3s ease ${i * 0.05}s both`, opacity:c.active ? 1 : 0.68 }}
                onClick={() => openViewer(realIdx)}
              >
                {/* ── Thumbnail ── */}
                <div style={{ height:172, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, flexShrink:0 }}>
                  <div style={{ position:"absolute", inset:0, backgroundImage:pat, backgroundSize:"20px 20px", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", top:-40, right:-30, width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.14),transparent 70%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:-60, left:-20, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)", pointerEvents:"none" }} />

                  {c.thumb && (
                    <img src={c.thumb} alt={c.title} loading="lazy"
                      style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.35, mixBlendMode:"luminosity" }} />
                  )}

                  <div style={{ position:"absolute", top:12, left:12, padding:"3px 10px", borderRadius:20, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(8px)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.92)", letterSpacing:".06em", textTransform:"uppercase" as const, border:"1px solid rgba(255,255,255,0.14)" }}>
                    {c.cat}
                  </div>
                  <div style={{ position:"absolute", top:12, right:12, padding:"3px 8px", borderRadius:20, background:c.active ? "rgba(21,128,61,0.85)" : "rgba(161,98,7,0.85)", backdropFilter:"blur(6px)", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.85)" }} />
                    {c.active ? "Published" : "Draft"}
                  </div>
                  <div className="cc3-emoji" style={{ position:"absolute", bottom:14, left:16, fontSize:52, lineHeight:1, filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.35))", userSelect:"none" as const }}>
                    {icon}
                  </div>

                  {progPct > 0 && (
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"rgba(0,0,0,0.3)" }}>
                      <div style={{ height:"100%", width:`${progPct}%`, background:"rgba(255,255,255,0.85)", borderRadius:"0 2px 2px 0", transition:"width .5s ease" }} />
                    </div>
                  )}

                  <div className="cc3-overlay" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div className="cc3-shine" />
                    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, position:"relative", zIndex:1 }}>
                      <div style={{ width:48, height:48, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
                      </div>
                      <span style={{ color:"#fff", fontSize:11.5, fontWeight:700, letterSpacing:".05em", textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>
                        {isCompleted ? "Review Course" : progPct > 0 ? `Continue • ${progPct}%` : "Preview Course"}
                      </span>
                      {timeLabel && (
                        <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, fontWeight:600, letterSpacing:".04em" }}>
                          ⏱ {timeLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding:"14px 15px 12px", flex:1, display:"flex", flexDirection:"column" as const }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"#0f0a2a", lineHeight:1.3, marginBottom:5 }}>{c.title}</div>
                  <div style={{ fontSize:11.5, color:"#7c65a8", lineHeight:1.55, display:"-webkit-box" as const, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden", marginBottom:10 }}>{c.desc}</div>

                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:"#a89dc8" }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                      {c.time}
                    </span>
                    {modCount > 0 && <>
                      <span style={{ width:3, height:3, borderRadius:"50%", background:"#d4d0e8" }} />
                      <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:"#0d9488", fontWeight:600 }}>
                        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                        {modCount}m · {chCount}ch
                      </span>
                    </>}
                    {modCount === 0 && <span style={{ fontSize:10, color:"#c4bdd8" }}>Demo content</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:5, marginTop:"auto" }} onClick={e => e.stopPropagation()}>
                    <button className="cc3-btn"
                      style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid rgba(13,148,136,0.18)", background:"#f0fdf9", color:"#0f766e", fontSize:10.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
                      onClick={() => withLoader("Loading modules...", () => openModules(realIdx), 800)}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                      Modules
                    </button>
                    <button className="cc3-btn"
                      style={{ flex:1, padding:"6px 0", borderRadius:8,
                        border: launchedIds.has(realIdx) ? "1px solid rgba(13,148,136,0.25)" : "1px solid rgba(124,58,237,0.22)",
                        background: launchedIds.has(realIdx) ? "rgba(13,148,136,0.08)" : "linear-gradient(135deg,rgba(124,58,237,0.08),rgba(13,148,136,0.08))",
                        color: launchedIds.has(realIdx) ? "#0d9488" : "#6d28d9",
                        fontSize:10.5, fontWeight:700,
                        cursor: launchedIds.has(realIdx) ? "default" : "pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
                      onClick={() => {
                        if (launchedIds.has(realIdx)) return;
                        if ((c.modules?.length ?? 0) === 0) {
                          setAddModulesPromptIdx(realIdx);
                        } else {
                          setReviewIdx(realIdx);
                        }
                      }}>
                      {launchedIds.has(realIdx) ? (
                        <>
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 7L5.5 12 2 8.7"/></svg>
                          Published
                        </>
                      ) : (
                        <>
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v8M4 6l3-5 3 5M3 11h8"/></svg>
                          Publish
                        </>
                      )}
                    </button>
                    <button className="cc3-btn"
                      style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid rgba(109,40,217,0.15)", background:"#f5f3ff", color:"#6d28d9", fontSize:10.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
                      onClick={() => { setEnrollTargetCourse(c); setEnrollWizardOpen(true); }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="5.5" cy="4" r="2.5"/><path d="M1 12c0-2.5 2-4.5 4.5-4.5S10 9.5 10 12"/><path d="M11 5.5v4M13 7.5h-4"/></svg>
                      Enroll
                    </button>
                    <button className="cc3-btn"
                      style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(124,58,237,0.15)", background:"#f5f3ff", color:"#6d28d9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onClick={() => withLoader("Loading editor...", () => openEdit(realIdx), 800)}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                    </button>
                    <button className="cc3-btn"
                      style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(220,38,38,0.15)", background:"#fff5f5", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onClick={() => handleDelete(realIdx)}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EditCourseModal
        open={editOpen}
        onClose={closeEdit}
        onSave={(data) => withLoader("Saving course...", () => handleEditSave(data), 1000)}
        editCourse={editIdx !== null ? courses[editIdx] : null}
        categories={categories}
        setCategories={setCategories}
        toast={toast}
      />
      <CourseModuleModal
        open={modOpen}
        course={modIdx !== null ? courses[modIdx] : null}
        courseIdx={modIdx}
        onClose={closeMod}
        onSave={(idx, data) => withLoader("Saving modules...", () => handleModSave(idx, data), 1200)}
        toast={toast}
        publishedActivities={publishedActivities}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && deleteIdx !== null && (
        <>
          <style>{`
            @keyframes deleteModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes deleteModalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>
          <div
            style={{ position:'fixed', inset:0, zIndex:4000, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'deleteModalFadeIn 0.2s ease' }}
            onClick={cancelDelete}
          >
            <div
              style={{ background:'var(--surface,#fff)', borderRadius:16, border:'1.5px solid rgba(220,38,38,0.2)', boxShadow:'0 20px 60px rgba(220,38,38,0.25)', maxWidth:440, width:'100%', animation:'deleteModalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(220,38,38,0.1)', textAlign:'center' as const }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(220,38,38,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>⚠️</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#dc2626', marginBottom:6, letterSpacing:'-0.02em' }}>Delete Course?</div>
                <div style={{ fontSize:13, color:'var(--t2,#4a3870)', lineHeight:1.5 }}>This action cannot be undone</div>
              </div>
              <div style={{ padding:'20px 24px' }}>
                <div style={{ padding:16, borderRadius:10, background:'rgba(220,38,38,0.05)', border:'1.5px solid rgba(220,38,38,0.15)', marginBottom:20 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#7f1d1d', marginBottom:6 }}>"{courses[deleteIdx].title}"</div>
                  <div style={{ fontSize:12, color:'#991b1b', lineHeight:1.6 }}>All course content, modules, and progress data will be permanently deleted.</div>
                </div>
              </div>
              <div style={{ padding:'16px 24px 20px', display:'flex', gap:10, borderTop:'1px solid rgba(220,38,38,0.1)' }}>
                <button
                  onClick={cancelDelete}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'1.5px solid var(--border,rgba(124,58,237,0.2))', background:'transparent', color:'var(--t2,#4a3870)', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(124,58,237,0.06)'; e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(124,58,237,0.2)'; }}
                >Cancel</button>
                <button
                  onClick={() => withLoader("Deleting course...", confirmDelete, 1000)}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.15s', boxShadow:'0 4px 14px rgba(220,38,38,0.3)', fontFamily:'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(220,38,38,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px rgba(220,38,38,0.3)'; }}
                >Delete Course</button>
              </div>
            </div>
          </div>
        </>
      )}

      <LoadingPopup visible={saving} message={savingMsg} />

      {enrollWizardOpen && enrollTargetCourse && (
        <EnrollWizard
          course={enrollTargetCourse}
          onClose={() => { setEnrollWizardOpen(false); setEnrollTargetCourse(null); }}
          toast={toast}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          ADD MODULES PROMPT — shown after course creation OR blocked launch
      ───────────────────────────────────────────────────────────────────── */}
      {addModulesPromptIdx !== null && (() => {
        const c = courses[addModulesPromptIdx];
        const isLaunchBlock = (c.modules?.length ?? 0) === 0;
        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(18,10,40,0.68)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", animation:"amp-in .22s ease both" }}>
            <style>{`
              @keyframes amp-in { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
              @keyframes amp-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
            `}</style>
            <div style={{ background:"var(--surface,#fff)", borderRadius:20, width:"92%", maxWidth:440, overflow:"hidden", boxShadow:"0 24px 80px rgba(124,58,237,0.38)", border:"1.5px solid rgba(124,58,237,0.15)" }}>
              {/* Top bar */}
              <div style={{ height:5, background: isLaunchBlock ? "linear-gradient(90deg,#dc2626,#d97706,#7c3aed)" : "linear-gradient(90deg,#7c3aed,#0d9488,#7c3aed)", backgroundSize:"200% 100%" }} />
              <div style={{ padding:"28px 28px 26px", textAlign:"center" as const }}>

                {isLaunchBlock ? (
                  <>
                    {/* ── BLOCKED: trying to launch without modules ── */}
                    <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,rgba(220,38,38,0.08),rgba(217,119,6,0.12))", border:"2px solid rgba(220,38,38,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, margin:"0 auto 16px", animation:"amp-bob 2s ease-in-out infinite" }}>🚫</div>
                    <div style={{ fontSize:18, fontWeight:900, color:"var(--t1,#18103a)", letterSpacing:"-.03em", marginBottom:8 }}>
                      Modules Required to Publish
                    </div>
                    <div style={{ fontSize:12.5, color:"var(--t2,#4a3870)", lineHeight:1.65, marginBottom:20 }}>
                      <span style={{ fontWeight:700, color:"#dc2626" }}>"{c?.title}"</span> has no modules yet. You must add at least one module and chapter before this course can be published to learners.
                    </div>
                    {/* Step flow hint */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:22, background:"rgba(124,58,237,0.04)", borderRadius:10, padding:"12px 16px", border:"1.5px solid rgba(124,58,237,0.1)" }}>
                      {[
                        { icon:"📝", label:"Add Modules" },
                        { icon:"→", label:"" },
                        { icon:"📄", label:"Add Chapters" },
                        { icon:"→", label:"" },
                        { icon:"🚀", label:"Publish!" },
                      ].map((s, i) => s.icon === "→" ? (
                        <span key={i} style={{ color:"var(--t3,#c4bdd8)", fontSize:14, fontWeight:300 }}>→</span>
                      ) : (
                        <div key={i} style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3 }}>
                          <span style={{ fontSize:20 }}>{s.icon}</span>
                          <span style={{ fontSize:9, fontWeight:700, color:"var(--t3,#a89dc8)", textTransform:"uppercase" as const, letterSpacing:".05em" }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:9 }}>
                      <button
                        onClick={() => goToModules(addModulesPromptIdx!)}
                        style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13.5, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 18px rgba(124,58,237,0.35)", fontFamily:"inherit", letterSpacing:"-.01em" }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                        Add Modules Now
                      </button>
                      <button
                        onClick={() => setAddModulesPromptIdx(null)}
                        style={{ width:"100%", padding:"10px", borderRadius:10, border:"1.5px solid rgba(124,58,237,0.15)", background:"transparent", color:"var(--t2,#4a3870)", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        Not Now
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── POST-CREATION: new course just saved ── */}
                    <div style={{ fontSize:54, marginBottom:12, animation:"amp-bob 2s ease-in-out infinite" }}>🎉</div>
                    <div style={{ fontSize:20, fontWeight:900, color:"var(--t1,#18103a)", letterSpacing:"-.03em", marginBottom:6 }}>Course Created!</div>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--purple,#7c3aed)", marginBottom:6 }}>{c?.title}</div>
                    <div style={{ fontSize:12.5, color:"var(--t2,#4a3870)", lineHeight:1.6, marginBottom:20 }}>
                      Your course is saved as a <strong>Draft</strong>. Add modules and chapters now, then publish it when it's ready for learners.
                    </div>
                    {/* Mini course card */}
                    <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(13,148,136,0.06))", border:"1.5px solid rgba(124,58,237,0.12)", borderRadius:12, padding:"12px 14px", marginBottom:20, display:"flex", alignItems:"center", gap:12, textAlign:"left" as const }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📚</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12.5, fontWeight:700, color:"var(--t1,#18103a)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c?.title}</div>
                        <div style={{ fontSize:10.5, color:"var(--t3,#a89dc8)", marginTop:2 }}>{c?.cat} · {c?.time} · No modules yet</div>
                      </div>
                      <div style={{ padding:"3px 9px", borderRadius:12, background:"rgba(217,119,6,0.1)", border:"1px solid rgba(217,119,6,0.25)", fontSize:9.5, fontWeight:700, color:"#d97706", textTransform:"uppercase" as const, letterSpacing:".05em", flexShrink:0 }}>Draft</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:9 }}>
                      <button
                        onClick={() => goToModules(addModulesPromptIdx!)}
                        style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13.5, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 18px rgba(124,58,237,0.35)", fontFamily:"inherit", letterSpacing:"-.01em" }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                        Add Modules Now
                      </button>
                      <button
                        onClick={() => setAddModulesPromptIdx(null)}
                        style={{ width:"100%", padding:"10px", borderRadius:10, border:"1.5px solid rgba(124,58,237,0.15)", background:"transparent", color:"var(--t2,#4a3870)", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        I'll do it later
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────────────
          MODULE LOADING INTERSTITIAL — full-screen transition after "Add Modules Now"
      ───────────────────────────────────────────────────────────────────── */}
      {moduleLoadingIdx !== null && (() => {
        const c = courses[moduleLoadingIdx];
        return (
          <div style={{ position:"fixed", inset:0, zIndex:4500, background:"linear-gradient(135deg,#0f0628,#0d2040)", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:0 }}>
            <style>{`
              @keyframes mli-spin { to { transform: rotate(360deg); } }
              @keyframes mli-pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }
              @keyframes mli-slide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
              @keyframes mli-bar { from{width:0%} to{width:100%} }
              @keyframes mli-dot { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }
            `}</style>

            {/* Animated ring */}
            <div style={{ position:"relative", width:88, height:88, marginBottom:28 }}>
              <svg width="88" height="88" viewBox="0 0 88 88" style={{ position:"absolute", inset:0, animation:"mli-spin 1.4s linear infinite" }}>
                <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="6"/>
                <circle cx="44" cy="44" r="38" fill="none" stroke="url(#mli-grad)" strokeWidth="6"
                  strokeDasharray="80 160" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="mli-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed"/>
                    <stop offset="100%" stopColor="#0d9488"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📚</div>
            </div>

            {/* Course name */}
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:".1em", textTransform:"uppercase" as const, marginBottom:10, animation:"mli-slide .3s ease both" }}>
              Opening Editor
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-.03em", marginBottom:6, animation:"mli-slide .35s ease .05s both", maxWidth:320, textAlign:"center" as const }}>
              {c?.title}
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginBottom:36, animation:"mli-slide .4s ease .1s both" }}>
              Setting up the module editor…
            </div>

            {/* Progress bar */}
            <div style={{ width:240, height:3, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden", animation:"mli-slide .4s ease .15s both" }}>
              <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#7c3aed,#0d9488)", animation:"mli-bar 1.3s cubic-bezier(.4,0,.2,1) forwards" }}/>
            </div>

            {/* Dots */}
            <div style={{ display:"flex", gap:6, marginTop:20, animation:"mli-slide .4s ease .2s both" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"rgba(124,58,237,0.7)", animation:`mli-dot 1.2s ease ${i*0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────────────
          PUBLISH REVIEW WIZARD
      ───────────────────────────────────────────────────────────────────── */}
      {reviewIdx !== null && (() => {
        const c = courses[reviewIdx];
        const modCount  = c.modules?.length ?? 0;
        const chCount   = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
        const hasTitle  = !!c.title?.trim();
        const hasDesc   = !!c.desc?.trim();
        const hasCat    = !!c.cat?.trim();
        const hasDur    = !!c.time?.trim();
        const hasMods   = modCount > 0;
        const hasChaps  = chCount > 0;
        const hasCompanies = (c.companies?.length ?? 0) > 0;

        type Check = { label: string; ok: boolean; warn?: boolean; detail: string; fix?: () => void; fixLabel?: string };
        const checks: Check[] = [
          { label:"Course title",       ok: hasTitle,    detail: hasTitle    ? c.title       : "Missing title" },
          { label:"Description",        ok: hasDesc,     warn:true, detail: hasDesc     ? "Provided"    : "No description — students won't know what to expect" },
          { label:"Category",           ok: hasCat,      detail: hasCat      ? c.cat         : "No category assigned" },
          { label:"Duration",           ok: hasDur,      warn:true, detail: hasDur      ? c.time        : "Duration not set" },
          { label:"Modules added",      ok: hasMods,     detail: hasMods     ? `${modCount} module${modCount!==1?"s":""}` : "No modules — course is empty",
            fix: () => { setReviewIdx(null); withLoader("Loading modules...", () => openModules(reviewIdx!), 800); }, fixLabel:"Add Modules" },
          { label:"Chapters added",     ok: hasChaps,    detail: hasChaps    ? `${chCount} chapter${chCount!==1?"s":""}` : "No chapters inside modules",
            fix: () => { setReviewIdx(null); withLoader("Loading modules...", () => openModules(reviewIdx!), 800); }, fixLabel:"Add Chapters" },
          { label:"Assigned companies", ok: hasCompanies, warn:true, detail: hasCompanies ? `${c.companies!.length} compan${c.companies!.length!==1?"ies":"y"}` : "Not assigned to any company yet",
            fix: () => { setReviewIdx(null); withLoader("Loading editor...", () => openEdit(reviewIdx!), 800); }, fixLabel:"Assign Companies" },
        ];

        const blockers  = checks.filter(ch => !ch.ok && !ch.warn);
        const warnings  = checks.filter(ch => !ch.ok && ch.warn);
        const passed    = checks.filter(ch => ch.ok);
        const canPublish = blockers.length === 0;

        const score = Math.round((passed.length / checks.length) * 100);

        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(18,10,40,0.72)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", animation:"rw-in .22s ease both" }}>
            <style>{`
              @keyframes rw-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
              @keyframes rw-spin { to{transform:rotate(360deg)} }
              @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
            `}</style>
            <div style={{ background:"var(--surface,#fff)", borderRadius:20, width:"95%", maxWidth:520, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 28px 90px rgba(124,58,237,0.38)", border:"1.5px solid rgba(124,58,237,0.15)" }}>
              {/* Header */}
              <div style={{ padding:"22px 26px 18px", borderBottom:"1px solid rgba(124,58,237,0.1)", background:"linear-gradient(135deg,rgba(124,58,237,0.04),rgba(13,148,136,0.04))", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🚀</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17, fontWeight:900, color:"var(--t1,#18103a)", letterSpacing:"-.03em" }}>Publish Review</div>
                    <div style={{ fontSize:12, color:"var(--t3,#a89dc8)", marginTop:2 }}>Check everything before going live</div>
                  </div>
                  {/* Score ring */}
                  <div style={{ position:"relative", width:52, height:52, flexShrink:0 }}>
                    <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform:"rotate(-90deg)" }}>
                      <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="5"/>
                      <circle cx="26" cy="26" r="22" fill="none"
                        stroke={canPublish ? "#0d9488" : blockers.length > 2 ? "#dc2626" : "#d97706"}
                        strokeWidth="5"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - score / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color: canPublish ? "#0d9488" : "#d97706" }}>{score}%</div>
                  </div>
                </div>
              </div>

              {/* Course summary strip */}
              <div style={{ padding:"12px 26px", background:"rgba(124,58,237,0.03)", borderBottom:"1px solid rgba(124,58,237,0.07)", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                <div style={{ fontSize:22 }}>📚</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--t1,#18103a)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                  <div style={{ fontSize:10.5, color:"var(--t3,#a89dc8)", marginTop:1 }}>{c.cat}{c.time ? ` · ${c.time}` : ""}{modCount > 0 ? ` · ${modCount}m/${chCount}ch` : ""}</div>
                </div>
              </div>

              {/* Checks list */}
              <div style={{ flex:1, overflowY:"auto", padding:"16px 26px" }}>
                {/* Blockers */}
                {blockers.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", color:"#dc2626", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span>⛔</span> Must Fix ({blockers.length})
                    </div>
                    {blockers.map((ch, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, background:"rgba(220,38,38,0.05)", border:"1.5px solid rgba(220,38,38,0.18)", marginBottom:6 }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(220,38,38,0.12)", color:"#dc2626", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>✕</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"var(--t1,#18103a)" }}>{ch.label}</div>
                          <div style={{ fontSize:10.5, color:"#dc2626", marginTop:1 }}>{ch.detail}</div>
                        </div>
                        {ch.fix && <button onClick={ch.fix} style={{ padding:"4px 10px", borderRadius:6, border:"1.5px solid rgba(220,38,38,0.3)", background:"#fff", color:"#dc2626", fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>{ch.fixLabel}</button>}
                      </div>
                    ))}
                  </div>
                )}
                {/* Warnings */}
                {warnings.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", color:"#d97706", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span>⚠️</span> Recommended ({warnings.length})
                    </div>
                    {warnings.map((ch, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, background:"rgba(217,119,6,0.05)", border:"1.5px solid rgba(217,119,6,0.18)", marginBottom:6 }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(217,119,6,0.12)", color:"#d97706", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>!</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"var(--t1,#18103a)" }}>{ch.label}</div>
                          <div style={{ fontSize:10.5, color:"#d97706", marginTop:1 }}>{ch.detail}</div>
                        </div>
                        {ch.fix && <button onClick={ch.fix} style={{ padding:"4px 10px", borderRadius:6, border:"1.5px solid rgba(217,119,6,0.3)", background:"#fff", color:"#d97706", fontSize:10.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>{ch.fixLabel}</button>}
                      </div>
                    ))}
                  </div>
                )}
                {/* Passed */}
                {passed.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", color:"#0d9488", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span>✅</span> All Good ({passed.length})
                    </div>
                    {passed.map((ch, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, background:"rgba(13,148,136,0.04)", border:"1.5px solid rgba(13,148,136,0.15)", marginBottom:5 }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(13,148,136,0.1)", color:"#0d9488", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0 }}>✓</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"var(--t1,#18103a)" }}>{ch.label}</div>
                        </div>
                        <div style={{ fontSize:11, color:"#0d9488", fontWeight:600 }}>{ch.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:"16px 26px", borderTop:"1px solid rgba(124,58,237,0.1)", display:"flex", alignItems:"center", gap:10, background:"rgba(124,58,237,0.02)", flexShrink:0 }}>
                <button onClick={() => setReviewIdx(null)} style={{ padding:"10px 18px", borderRadius:10, border:"1.5px solid rgba(124,58,237,0.15)", background:"transparent", color:"var(--t2,#4a3870)", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Cancel
                </button>
                <div style={{ flex:1 }} />
                {!canPublish ? (
                  !hasMods ? (
                    /* Modules missing — primary CTA is to add modules */
                    <button
                      onClick={() => { setReviewIdx(null); goToModules(reviewIdx!); }}
                      style={{ padding:"11px 22px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(124,58,237,0.35)", fontFamily:"inherit", letterSpacing:"-.01em" }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                      Add Modules First
                    </button>
                  ) : (
                    /* Other blockers */
                    <div style={{ fontSize:11.5, color:"#dc2626", fontWeight:600, textAlign:"right" as const }}>
                      Fix {blockers.length} issue{blockers.length!==1?"s":""} to publish
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => {
                      const idx = reviewIdx!;
                      setReviewIdx(null);
                      setLaunchIdx(idx);
                      setLaunchPhase("counting");
                      setTimeout(() => setLaunchPhase("blastoff"), 3200);
                      setTimeout(() => {
                        setCourses(prev => prev.map((co, i) => i === idx ? { ...co, active: true } : co));
                        setLaunchedIds(prev => { const s = new Set(prev); s.add(idx); return s; });
                        setLaunchPhase("done");
                      }, 5000);
                      setTimeout(() => { setLaunchIdx(null); setLaunchPhase("idle"); toast("✅ Course published successfully!"); }, 7200);
                    }}
                    style={{ padding:"11px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 18px rgba(124,58,237,0.4)", fontFamily:"inherit", letterSpacing:"-.01em" }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 1v8M4 6l3-5 3 5M3 11h8"/></svg>
                    Publish Course
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────────────
          LAUNCH ANIMATION
      ───────────────────────────────────────────────────────────────────── */}
      {launchIdx !== null && (() => {
        const c = courses[launchIdx];
        const modCount = c.modules?.length ?? 0;
        const chCount  = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
        const isDone   = launchPhase === "done";
        return (
          <div style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(10,5,30,0.92)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
            <style>{`
              @keyframes la-in    { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
              @keyframes la-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-18px) scale(1.04)} }
              @keyframes la-orbit { from{transform:rotate(0deg) translateX(110px)} to{transform:rotate(360deg) translateX(110px)} }
              @keyframes la-burst { 0%{opacity:1;transform:scale(0)} 60%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.4)} }
              @keyframes la-shoot { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-220px) scale(0.3)} }
              @keyframes la-confetti { 0%{opacity:1;transform:translateY(0) rotate(0deg)} 100%{opacity:0;transform:translateY(120px) rotate(720deg)} }
              @keyframes la-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.5)} 50%{box-shadow:0 0 0 22px rgba(124,58,237,0)} }
              @keyframes la-glow { 0%,100%{opacity:.4} 50%{opacity:1} }
              @keyframes la-done-in { from{opacity:0;transform:scale(0.7) translateY(30px)} to{opacity:1;transform:scale(1) translateY(0)} }
              @keyframes la-star-pop { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(10deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
              @keyframes la-bar { from{width:0} to{width:100%} }
            `}</style>

            {launchPhase === "counting" && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:32, animation:"la-in .4s ease both" }}>
                {/* Rocket orbiting */}
                <div style={{ position:"relative", width:240, height:240 }}>
                  {/* Glow core */}
                  <div style={{ position:"absolute", inset:"50%", width:80, height:80, transform:"translate(-50%,-50%)", borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.6),transparent 70%)", animation:"la-glow 1.5s ease infinite" }} />
                  {/* Planet */}
                  <div style={{ position:"absolute", inset:"50%", width:60, height:60, transform:"translate(-50%,-50%)", borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#0d9488)", animation:"la-pulse 2s ease infinite", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, zIndex:2 }}>📚</div>
                  {/* Orbiting rocket */}
                  <div style={{ position:"absolute", inset:"50%", width:0, height:0 }}>
                    <div style={{ animation:"la-orbit 2s linear infinite", display:"inline-block", fontSize:26, transformOrigin:"0 0", position:"absolute" }}>🚀</div>
                  </div>
                  {/* Particles */}
                  {[...Array(8)].map((_, i) => (
                    <div key={i} style={{ position:"absolute", inset:"50%", width:6, height:6, transform:`rotate(${i * 45}deg) translateX(90px)`, borderRadius:"50%", background:i%2===0?"#7c3aed":"#0d9488", opacity:.6, animation:`la-glow ${1 + i*0.15}s ease infinite` }} />
                  ))}
                </div>
                {/* Countdown */}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:8 }}>Publishing Course</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", maxWidth:280 }}>Saving course settings and notifying enrolled companies…</div>
                </div>
                {/* Progress bar */}
                <div style={{ width:260, height:4, borderRadius:4, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#7c3aed,#0d9488)", animation:"la-bar 3s ease forwards" }} />
                </div>
              </div>
            )}

            {launchPhase === "blastoff" && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, animation:"la-in .3s ease both" }}>
                {/* Big rocket */}
                <div style={{ fontSize:90, animation:"la-shoot 2s ease forwards", filter:"drop-shadow(0 0 30px rgba(124,58,237,0.9))" }}>🚀</div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:"-.03em", animation:"la-burst .6s ease both" }}>PUBLISHING! ✨</div>
                </div>
                {/* Confetti burst */}
                <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
                  {["🎊","✨","🌟","💫","🎉","⭐","🎊","✨","💥","🌟"].map((e, i) => (
                    <div key={i} style={{ position:"absolute", left:`${10 + i * 9}%`, top:`${20 + (i%3)*15}%`, fontSize:20+i%3*8, animation:`la-confetti ${1.2 + i*0.15}s ease ${i*0.08}s both` }}>{e}</div>
                  ))}
                </div>
              </div>
            )}

            {isDone && (
              <div style={{ background:"var(--surface,#fff)", borderRadius:22, width:"94%", maxWidth:500, overflow:"hidden", animation:"la-done-in .5s cubic-bezier(.16,1,.3,1) both", boxShadow:"0 32px 100px rgba(124,58,237,0.5)" }}>
                {/* Rainbow top bar */}
                <div style={{ height:5, background:"linear-gradient(90deg,#7c3aed,#0d9488,#0284c7,#d97706,#7c3aed)", backgroundSize:"300% 100%", animation:"shimmer 2s linear infinite" }} />
                {/* Hero section */}
                <div style={{ padding:"32px 28px 24px", textAlign:"center", background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(13,148,136,0.06))" }}>
                  <div style={{ fontSize:64, marginBottom:8, animation:"la-star-pop .5s ease .1s both" }}>🎉</div>
                  <div style={{ fontSize:24, fontWeight:900, color:"var(--t1,#18103a)", letterSpacing:"-.04em", marginBottom:4 }}>Course Published!</div>
                  <div style={{ fontSize:13.5, color:"var(--t2,#4a3870)" }}>Your course is now live and available to enrolled learners</div>
                </div>
                {/* Stats grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"rgba(124,58,237,0.06)" }}>
                  {[
                    { icon:"📚", label:"Modules", val: modCount || "—" },
                    { icon:"📄", label:"Chapters", val: chCount || "—" },
                    { icon:"🏢", label:"Companies", val: c.companies?.length || "—" },
                  ].map((s, i) => (
                    <div key={i} style={{ padding:"16px 12px", background:"var(--surface,#fff)", textAlign:"center" }}>
                      <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:"var(--purple,#7c3aed)" }}>{s.val}</div>
                      <div style={{ fontSize:10, color:"var(--t3,#a89dc8)", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Course overview card */}
                <div style={{ padding:"18px 24px" }}>
                  <div style={{ padding:"14px 16px", borderRadius:12, background:"linear-gradient(135deg,rgba(124,58,237,0.05),rgba(13,148,136,0.05))", border:"1.5px solid rgba(124,58,237,0.12)", display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📚</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:"var(--t1,#18103a)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                      <div style={{ fontSize:11, color:"var(--t3,#a89dc8)", marginTop:3 }}>{c.cat}{c.time ? ` · ${c.time}` : ""}</div>
                    </div>
                    <div style={{ padding:"4px 10px", borderRadius:12, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.25)", fontSize:10, fontWeight:800, color:"#0d9488", textTransform:"uppercase", letterSpacing:".06em", flexShrink:0, display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"#0d9488", display:"inline-block" }} />
                      Live
                    </div>
                  </div>
                  {c.desc && <div style={{ fontSize:12.5, color:"var(--t2,#4a3870)", lineHeight:1.6, marginBottom:16 }}>{c.desc}</div>}
                  {(c.companies?.length ?? 0) > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                      {c.companies!.slice(0, 5).map((co, i) => (
                        <div key={i} style={{ padding:"3px 10px", borderRadius:20, background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.15)", fontSize:10.5, fontWeight:600, color:"var(--purple,#7c3aed)" }}>{co}</div>
                      ))}
                      {c.companies!.length > 5 && <div style={{ padding:"3px 10px", borderRadius:20, background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.15)", fontSize:10.5, fontWeight:600, color:"var(--purple,#7c3aed)" }}>+{c.companies!.length - 5} more</div>}
                    </div>
                  )}
                  <button
                    onClick={() => { setLaunchIdx(null); setLaunchPhase("idle"); }}
                    style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px rgba(124,58,237,0.35)", letterSpacing:"-.01em" }}>
                    🎊 Awesome — Back to Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
