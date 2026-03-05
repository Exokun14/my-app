'use client'

import CreateCourseModal from "../../Components/CreateCourseModal";
import EditCourseModal from "./EditCourseModal";
import CourseModuleModal from "./CourseModuleModal";

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
    openEdit,
    openModules,
    closeEdit,
    closeMod,
  } = useCourseCatalog({ courses, setCourses, toast, onOpenCourse });

  return (
    <>
      <style>{CARD_STYLES}</style>

      {/* Toolbar */}
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

      {/* Filters */}
      <div className={`lc-filter-bar${filterOn ? "" : " hidden"}`}>
        <span className="fl">Filter</span>
        <div className="filter-divider" />
        {categories.map(cat => (
          <button key={cat} className={`lc-cat${activeCat === cat ? " on" : ""}`} onClick={() => setActiveCat(cat)}>{cat}</button>
        ))}
        <div className="filter-divider" style={{ margin:"0 2px" }} />
        {["All", "Published", "Draft"].map(sf => (
          <button key={sf} className={`lc-status-chip${statusFilter === sf ? " on" : ""}`} onClick={() => setStatusFilter(sf)}>
            {sf === "Published" && <span className="dot" style={{ background:"#16a34a" }} />}
            {sf === "Draft"     && <span className="dot" style={{ background:"#d97706" }} />}
            {sf}
          </button>
        ))}
      </div>

      {/* Grid */}
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
            const progPct  = c.enrolled ? (c.progress ?? 0) : 0;

            return (
              <div key={i} className="cc3-card"
                style={{ animation:`cc3-up .3s ease ${i * 0.05}s both`, opacity:c.active ? 1 : 0.68 }}
                onClick={() => openViewer(realIdx)}
              >
                {/* ── Thumbnail ── */}
                <div style={{ height:172, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, flexShrink:0 }}>
                  <div style={{ position:"absolute", inset:0, backgroundImage:pat, backgroundSize:"20px 20px", pointerEvents:"none" }} />

                  {/* Glow orbs */}
                  <div style={{ position:"absolute", top:-40, right:-30, width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.14),transparent 70%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:-60, left:-20, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)", pointerEvents:"none" }} />

                  {c.thumb && (
                    <img src={c.thumb} alt={c.title} loading="lazy"
                      style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.35, mixBlendMode:"luminosity" }} />
                  )}

                  {/* Category pill */}
                  <div style={{ position:"absolute", top:12, left:12, padding:"3px 10px", borderRadius:20, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(8px)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.92)", letterSpacing:".06em", textTransform:"uppercase" as const, border:"1px solid rgba(255,255,255,0.14)" }}>
                    {c.cat}
                  </div>

                  {/* Status */}
                  <div style={{ position:"absolute", top:12, right:12, padding:"3px 8px", borderRadius:20, background:c.active ? "rgba(21,128,61,0.85)" : "rgba(161,98,7,0.85)", backdropFilter:"blur(6px)", fontSize:9, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:"rgba(255,255,255,0.85)" }} />
                    {c.active ? "Published" : "Draft"}
                  </div>

                  {/* Big emoji */}
                  <div className="cc3-emoji" style={{ position:"absolute", bottom:14, left:16, fontSize:52, lineHeight:1, filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.35))", userSelect:"none" as const }}>
                    {icon}
                  </div>

                  {/* Progress bar */}
                  {progPct > 0 && (
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"rgba(0,0,0,0.3)" }}>
                      <div style={{ height:"100%", width:`${progPct}%`, background:"rgba(255,255,255,0.85)", borderRadius:"0 2px 2px 0", transition:"width .5s ease" }} />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="cc3-overlay" style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(3px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div className="cc3-shine" />
                    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, position:"relative", zIndex:1 }}>
                      <div style={{ width:48, height:48, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
                      </div>
                      <span style={{ color:"#fff", fontSize:11.5, fontWeight:700, letterSpacing:".05em", textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>
                        {progPct > 0 ? `Continue • ${progPct}%` : "Open Course"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding:"14px 15px 12px", flex:1, display:"flex", flexDirection:"column" as const }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:"#0f0a2a", lineHeight:1.3, marginBottom:5 }}>{c.title}</div>
                  <div style={{ fontSize:11.5, color:"#7c65a8", lineHeight:1.55, display:"-webkit-box" as const, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden", marginBottom:10 }}>{c.desc}</div>

                  {/* Meta */}
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
                      onClick={() => openModules(realIdx)}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
                      Modules
                    </button>
                    <button className="cc3-btn"
                      style={{ flex:1, padding:"6px 0", borderRadius:8, border:"1px solid rgba(109,40,217,0.15)", background:"#f5f3ff", color:"#6d28d9", fontSize:10.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
                      onClick={() => openEdit(realIdx)}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                      Edit
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
        onSave={handleEditSave}
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
        onSave={handleModSave}
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
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 4000,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              animation: 'deleteModalFadeIn 0.2s ease'
            }}
            onClick={cancelDelete}
          >
            <div 
              style={{
                background: 'var(--surface, #fff)',
                borderRadius: 16,
                border: '1.5px solid rgba(220, 38, 38, 0.2)',
                boxShadow: '0 20px 60px rgba(220, 38, 38, 0.25)',
                maxWidth: 440,
                width: '100%',
                animation: 'deleteModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: '24px 24px 20px',
                borderBottom: '1px solid rgba(220, 38, 38, 0.1)',
                textAlign: 'center' as const
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(220, 38, 38, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 28
                }}>
                  ⚠️
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#dc2626',
                  marginBottom: 6,
                  letterSpacing: '-0.02em'
                }}>
                  Delete Course?
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--t2, #4a3870)',
                  lineHeight: 1.5
                }}>
                  This action cannot be undone
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'rgba(220, 38, 38, 0.05)',
                  border: '1.5px solid rgba(220, 38, 38, 0.15)',
                  marginBottom: 20
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#7f1d1d',
                    marginBottom: 6
                  }}>
                    "{courses[deleteIdx].title}"
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#991b1b',
                    lineHeight: 1.6
                  }}>
                    All course content, modules, and progress data will be permanently deleted.
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px 20px',
                display: 'flex',
                gap: 10,
                borderTop: '1px solid rgba(220, 38, 38, 0.1)'
              }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 9,
                    border: '1.5px solid var(--border, rgba(124, 58, 237, 0.2))',
                    background: 'transparent',
                    color: 'var(--t2, #4a3870)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 9,
                    border: 'none',
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.3)';
                  }}
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}