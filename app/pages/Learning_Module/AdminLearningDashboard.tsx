'use client'

// ============================================================
//  AdminLearningDashboard.tsx
//  Full admin view — course catalog, activity builder,
//  course creation wizard, progress tracking.
//  Extracted from LearningCenter/page.tsx.
// ============================================================

import { useState, useEffect } from "react";
import { useToast } from "../../Hooks/useToast";
import Toast from "../../Components/Toast";
import ActivityBuilderPanel, { type Activity } from "./ActivityBuilderPanel";
import CourseCatalog from "./CourseCatalog";
import ClientProgress from "./ClientProgress";
import CourseViewer from "./CourseViewer";
import CourseOverview from "./CourseOverview";
import CourseCompletionStats from "./CourseCompletionStats";
import CourseCreationWizard from "../../Components/CourseCreationWizard";
import InitialLoader from "../../Components/InitialLoader";
import LoadingPopup from "../../Components/LoadingPopup";
import type { Course } from "../../Data/types";
import constants from "../../Data/test_data.json";
import api from "../../Services/api.service";
import "../../globals.css";

type ProgressRole = "admin" | "manager" | "client";

const PANELS            = ["Course Catalog", "Client Progress"];
const INITIAL_COURSES   = constants.COURSES   as Course[];
const INITIAL_ACTIVITIES= constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES= constants.DEFAULT_CATEGORIES;

async function loadDataFromAPI() {
  try {
    const coursesResponse = await api.courses.getAll();
    const courses = coursesResponse.success && coursesResponse.data?.length
      ? coursesResponse.data : INITIAL_COURSES;

    const activitiesResponse = await api.activities.getAll();
    const activities = activitiesResponse.success && activitiesResponse.data?.length
      ? activitiesResponse.data : INITIAL_ACTIVITIES;

    const categoriesResponse = await api.settings.getCategories();
    const categories = categoriesResponse.success && categoriesResponse.data?.length
      ? categoriesResponse.data : DEFAULT_CATEGORIES;

    return { courses, categories, activities };
  } catch {
    return { courses: INITIAL_COURSES, categories: DEFAULT_CATEGORIES, activities: INITIAL_ACTIVITIES };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface AdminLearningDashboardProps {
  onBack?: () => void;
}

export default function AdminLearningDashboard({ onBack }: AdminLearningDashboardProps) {
  const [progressRole, setProgressRole] = useState<ProgressRole>("admin");
  const [panel, setPanel]               = useState(0);
  const [courses, setCourses]           = useState<Course[]>([]);
  const [categories, setCategories]     = useState<string[]>([]);
  const [activities, setActivities]     = useState<Activity[]>([]);

  const [loadStage, setLoadStage]   = useState<'courses'|'activities'|'categories'|'done'>('courses');
  const [loaderDone, setLoaderDone] = useState(false);

  const [serverLoading, setServerLoading]   = useState(false);
  const [serverLoadingMsg, setServerLoadingMsg] = useState("Loading...");

  const { msg, visible, toast } = useToast();

  const [activityBuilderOpen, setActivityBuilderOpen] = useState(false);
  const [editingActivity, setEditingActivity]         = useState<Activity | null>(null);
  const [wizardOpen, setWizardOpen]                   = useState(false);

  const [viewerIdx, setViewerIdx]             = useState<number | null>(null);
  const [viewerOpen, setViewerOpen]           = useState(false);
  const [viewerExiting, setViewerExiting]     = useState(false);
  const [showOverview, setShowOverview]       = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [fullCourse, setFullCourse]           = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse]     = useState(false);

  const [courseProgress, setCourseProgress] = useState<Record<number, {
    progress: number; timeSpent: number; lastAccessed: string;
    enrolled: boolean; completed: boolean; completedDate?: string;
    quizScores: number[];
    assessmentScores: Array<{ score: number; passed: boolean; passingScore: number }>;
  }>>({});

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadStage('courses');
        const cr = await api.courses.getAll();
        setCourses(cr.success && cr.data?.length ? cr.data : INITIAL_COURSES);

        setLoadStage('activities');
        const ar = await api.activities.getAll();
        setActivities(ar.success && ar.data?.length ? ar.data : INITIAL_ACTIVITIES);

        setLoadStage('categories');
        const cat = await api.settings.getCategories();
        setCategories(cat.success && cat.data?.length ? cat.data : DEFAULT_CATEGORIES);

        setLoadStage('done');
      } catch {
        setCourses(INITIAL_COURSES);
        setActivities(INITIAL_ACTIVITIES);
        setCategories(DEFAULT_CATEGORIES);
        setLoadStage('done');
      }
    })();
  }, []);

  const publishedActivities = activities.filter(a => a.status === "published");

  // ── Activity handlers ──────────────────────────────────────────────────────
  const handleActivitySave = async (activity: Activity, saveAs: "draft" | "published") => {
    const updated = { ...activity, status: saveAs };
    try {
      if (editingActivity) {
        setServerLoading(true); setServerLoadingMsg("Saving activity...");
        const r = await api.activities.update(activity.id, updated);
        setServerLoading(false);
        if (r.success) { setActivities(p => p.map(a => a.id === activity.id ? updated : a)); toast(`Activity ${saveAs === "published" ? "published" : "saved as draft"}!`); }
        else { toast(`Error: ${r.error || 'Failed to update activity'}`); return; }
      } else {
        setServerLoading(true); setServerLoadingMsg("Creating activity...");
        const r = await api.activities.create(updated);
        setServerLoading(false);
        if (r.success && r.data) { setActivities(p => [...p, { ...updated, id: r.data!.activity_id }]); toast(`Activity ${saveAs === "published" ? "published" : "created as draft"}!`); }
        else { toast(`Error: ${r.error || 'Failed to create activity'}`); return; }
      }
      setActivityBuilderOpen(false); setEditingActivity(null);
    } catch { setServerLoading(false); toast('Failed to save activity to server'); }
  };

  // ── Course handlers ────────────────────────────────────────────────────────
  const handleWizardSave = async (data: Course) => {
    const draft: Course = { ...data, active: false, stage: "draft" as any };
    try {
      setServerLoading(true); setServerLoadingMsg("Creating course...");
      const r = await api.courses.create(draft);
      setServerLoading(false);
      if (r.success && r.data) { setCourses(p => [...p, { ...draft, id: r.data!.id }]); toast('Course saved as Draft.'); }
      else toast(`Error: ${r.error || 'Failed to create course'}`);
    } catch { setServerLoading(false); toast('Failed to create course on server'); }
  };

  // ── Progress handler ───────────────────────────────────────────────────────
  const handleProgress = async (idx: number, progress: number, timeSpent?: number, assessmentScore?: number) => {
    const safeProgress  = Math.min(100, Math.max(0, Math.floor(progress ?? 0)));
    const safeTimeSpent = Math.max(0, Math.floor(timeSpent ?? 0));
    const isCompleted   = safeProgress >= 100;
    const cur  = courseProgress[idx] || { quizScores: [], assessmentScores: [], timeSpent: 0 };
    const course = fullCourse || courses[idx];

    let updatedScores = cur.assessmentScores || [];
    if (assessmentScore !== undefined) {
      let passingScore = 70;
      course.modules?.forEach((mod: any) => mod.chapters.forEach((ch: any) => { if (ch.type === 'assessment' && ch.content?.passingScore) passingScore = ch.content.passingScore; }));
      updatedScores = [...updatedScores, { score: assessmentScore, passed: assessmentScore >= passingScore, passingScore }];
    }

    setCourses(p => p.map((c, i) => i === idx ? { ...c, progress: safeProgress, enrolled: true } : c));
    setCourseProgress(p => ({ ...p, [idx]: { progress: safeProgress, timeSpent: (cur.timeSpent||0)+safeTimeSpent, lastAccessed: new Date().toISOString(), enrolled: true, completed: isCompleted, completedDate: isCompleted ? new Date().toISOString() : cur.completedDate, quizScores: cur.quizScores||[], assessmentScores: updatedScores } }));
    if (isCompleted) setCourses(p => p.map((c,i) => i===idx ? {...c,progress:100,enrolled:true,completed:true} : c));
    setFullCourse(p => p ? {...p,progress:safeProgress,enrolled:true,completed:isCompleted,time_spent:(p.time_spent??0)+safeTimeSpent} : p);
    if (isCompleted && !cur.completed) {
      setTimeout(() => setShowCompletionStats(true), 300);
      setTimeout(async () => { const r = await api.courses.getAll(); if (r.success && r.data) setCourses(r.data); }, 1000);
    }
    try {
      if (course.id) await api.courses.updateProgress(course.id, { progress: parseInt(String(safeProgress),10), enrolled:1, time_spent: parseInt(String(safeTimeSpent),10), completed: isCompleted?1:0 });
    } catch { /* silent */ }
  };

  const handleResetData = async () => {
    setServerLoading(true); setServerLoadingMsg("Reloading from server...");
    const data = await loadDataFromAPI();
    setCourses(data.courses); setCategories(data.categories); setActivities(data.activities); setCourseProgress({});
    setServerLoading(false); toast('Data reloaded from server');
  };

  const openViewer = async (idx: number) => {
    const course = courses[idx];
    if (!course.id) {
      if (!course.modules?.length) { toast('⚠️ No modules yet.'); return; }
      setViewerIdx(idx); setFullCourse(course); setShowOverview(true); setViewerOpen(false); return;
    }
    setLoadingCourse(true); setServerLoading(true); setServerLoadingMsg("Opening course...");
    try {
      const r = await api.courses.getFullCourse(course.id);
      if (r.success && r.data) {
        if (!r.data.modules?.length) { toast('⚠️ No modules yet.'); return; }
        setFullCourse(r.data); setViewerIdx(idx); setShowOverview(true); setViewerOpen(false);
      } else toast(`Error: ${r.error || 'Unknown error'}`);
    } catch { toast('Failed to load course'); }
    finally { setLoadingCourse(false); setServerLoading(false); }
  };

  const startCourse  = () => { setShowOverview(false); setViewerOpen(true); };
  const closeViewer  = () => { setViewerExiting(true); setTimeout(() => { setViewerOpen(false); setViewerExiting(false); setViewerIdx(null); setShowOverview(false); setFullCourse(null); }, 280); };
  const closeStats   = () => { setShowCompletionStats(false); setViewerOpen(false); setViewerExiting(false); setViewerIdx(null); setShowOverview(false); setFullCourse(null); };

  // ── Course Overview screen ─────────────────────────────────────────────────
  if (showOverview && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseOverview course={fullCourse} onStart={startCourse} onClose={() => { setShowOverview(false); setViewerIdx(null); setFullCourse(null); }} toast={toast}
          progress={fullCourse.progress ?? courseProgress[viewerIdx]?.progress ?? 0}
          timeSpent={fullCourse.time_spent ?? courseProgress[viewerIdx]?.timeSpent ?? 0}
          enrolled={fullCourse.enrolled ?? courseProgress[viewerIdx]?.enrolled ?? false}
          completed={fullCourse.completed ?? courseProgress[viewerIdx]?.completed ?? false}
          lastAccessed={courseProgress[viewerIdx]?.lastAccessed}
          completedDate={courseProgress[viewerIdx]?.completedDate}
        />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
      </>
    );
  }

  // ── Course Viewer screen ───────────────────────────────────────────────────
  if (viewerOpen && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseViewer course={fullCourse} onClose={closeViewer}
          onProgress={(p,t,a) => handleProgress(viewerIdx,p,t,a)} toast={toast} />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
        {showCompletionStats && (
          <CourseCompletionStats open onClose={closeStats} courseName={fullCourse.title}
            stats={{
              totalChapters:     fullCourse.modules?.reduce((s,m)=>s+m.chapters.length,0)||0,
              completedChapters: fullCourse.modules?.reduce((s,m)=>s+m.chapters.filter((c:any)=>c.done).length,0)||0,
              totalQuizzes:      fullCourse.modules?.reduce((s,m)=>s+m.chapters.filter((c:any)=>c.type==='quiz').length,0)||0,
              quizScores:        courseProgress[viewerIdx]?.quizScores||[],
              totalAssessments:  fullCourse.modules?.reduce((s,m)=>s+m.chapters.filter((c:any)=>c.type==='assessment').length,0)||0,
              assessmentScores:  courseProgress[viewerIdx]?.assessmentScores||[],
              timeSpent:         fullCourse.time_spent||courseProgress[viewerIdx]?.timeSpent||0,
              completionDate:    courseProgress[viewerIdx]?.completedDate||new Date().toISOString(),
            }}
          />
        )}
      </>
    );
  }

  // ── Course Creation Wizard ─────────────────────────────────────────────────
  if (wizardOpen) {
    return (
      <>
        <CourseCreationWizard categories={categories} setCategories={setCategories} onSave={handleWizardSave} onCancel={() => setWizardOpen(false)} toast={toast} />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
      </>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <>
      {!loaderDone && <InitialLoader stage={loadStage} onComplete={() => setLoaderDone(true)} />}

      <div style={{ position:'relative', zIndex:0, background:'#fafaf9', minHeight:'100vh' }}>
      <style>{`
        :root, .lc-page {
          --purple: #6c3dd6; --purple-d: #4f1eb8; --purple-lt: rgba(108,61,214,0.07);
          --teal: #0d9488; --border: rgba(108,61,214,0.1);
          --surface: #ffffff; --surface2: #f4f2fb;
          --t1: #18103a; --t2: #4a3870; --t3: #8e7ec0;
          --t4: rgba(142,126,192,0.6); --bg: #f7f6fe;
        }
        @keyframes lc-fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .lc-main-enter { animation: lc-fadeIn 0.35s ease both; }
        .mode-toggle { display:flex; align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:3px; gap:2px; }
        .mode-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:6px; border:none; font-size:11px; font-weight:600; cursor:pointer; transition:all .18s; background:transparent; color:var(--t3); font-family:'DM Sans',sans-serif; }
        .mode-btn.active { background:linear-gradient(135deg,var(--purple),var(--purple-d)); color:#fff; box-shadow:0 2px 8px rgba(124,58,237,0.3); }
        .mode-btn:not(.active):hover { color:var(--purple); background:var(--purple-lt); }
        .role-toggle { display:flex; align-items:center; background:var(--surface2); border:1px solid var(--border); border-radius:7px; padding:2px; gap:1px; }
        .role-btn { padding:3px 9px; border-radius:5px; border:none; font-size:10px; font-weight:600; cursor:pointer; transition:all .15s; background:transparent; color:var(--t3); font-family:'DM Sans',sans-serif; }
        .role-btn.active { background:var(--purple); color:#fff; }
        .role-btn:not(.active):hover { color:var(--purple); }
        .lc-back-btn { display:flex; align-items:center; gap:6px; padding:5px 12px 5px 9px; border-radius:8px; border:1px solid rgba(108,61,214,0.18); background:var(--surface); color:var(--t2); font-size:11px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .18s; flex-shrink:0; white-space:nowrap; }
        .lc-back-btn:hover { background:var(--purple-lt); color:var(--purple); border-color:rgba(108,61,214,0.35); }
      `}</style>

      <div className="amb" />
      <div className="lc-page lc-main-enter">
        <div className="ph">
          {/* Panel dots */}
          <h1 className="ph-title">Learning <em>Center</em></h1>
          <div className="tab-dots">
            <span className="tab-label">{PANELS[panel]}</span>
            {PANELS.map((_,i) => (
              <button key={i} className={`tab-dot${panel===i?" active":""}`} onClick={() => setPanel(i)} />
            ))}
          </div>

          <div className="ph-rule" />

          <div className="ph-actions">
            {/* Role switcher on progress panel */}
            {panel === 1 && (
              <div className="role-toggle">
                {(["admin","manager","client"] as ProgressRole[]).map(r => (
                  <button key={r} className={`role-btn${progressRole===r?" active":""}`} onClick={() => setProgressRole(r)}>{r}</button>
                ))}
              </div>
            )}

            <button className="btn btn-p btn-sm" onClick={() => setWizardOpen(true)}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/></svg>
              Create New Course
            </button>
            <button className="btn btn-s btn-sm" onClick={() => { setEditingActivity(null); setActivityBuilderOpen(true); }} style={{ background:'var(--surface)', borderColor:'rgba(124,58,237,0.2)' }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3"/></svg>
              Activity Builder
              {activities.length > 0 && (
                <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:18, height:18, padding:'0 5px', borderRadius:9, background:'var(--purple)', color:'#fff', fontSize:10, fontWeight:700, marginLeft:4 }}>
                  {activities.length}
                </div>
              )}
            </button>
            <div style={{ padding:"6px 12px", borderRadius:8, background:"var(--surface)", border:"1.5px solid var(--border)", fontSize:11, fontWeight:600, color:"var(--t2)", display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--purple)' }} />
                <span style={{ color:"var(--purple)" }}>{activities.length}</span>
                <span style={{ fontSize:10, opacity:0.7 }}>Total</span>
              </div>
              <span style={{ width:1, height:12, background:"var(--border)" }} />
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)' }} />
                <span style={{ color:"var(--teal)" }}>{publishedActivities.length}</span>
                <span style={{ fontSize:10, opacity:0.7 }}>Published</span>
              </div>
            </div>

            {/* ← Dashboard */}
            {onBack && (
              <button className="lc-back-btn" onClick={onBack}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2L4 6l4 4"/>
                </svg>
                Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Swipe panels */}
        <div className="swipe-container">
          <div className="swipe-track" style={{ transform:`translateX(-${panel*100}%)` }}>
            <div className="swipe-panel" style={{ width:"100%" }}>
              <CourseCatalog courses={courses} setCourses={setCourses} categories={categories} setCategories={setCategories} toast={toast} onOpenCourse={openViewer} publishedActivities={publishedActivities} />
            </div>
            <div className="swipe-panel" style={{ width:"100%" }}>
              <ClientProgress toast={toast} role={progressRole} />
            </div>
          </div>
        </div>
      </div>

      <ActivityBuilderPanel open={activityBuilderOpen} onClose={() => { setActivityBuilderOpen(false); setEditingActivity(null); }} onSave={handleActivitySave} editActivity={editingActivity} toast={toast} allActivities={activities} />
      <Toast msg={msg} visible={visible} />
      <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
      </div>
    </>
  );
}
