'use client'

// ============================================================
//  ClientLearningDashboard.tsx
//  Client-facing learning portal — Dashboard, Catalog,
//  Progress. No course creation or admin tools.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useToast } from "../../Hooks/useToast";
import Toast from "../../Components/Toast";
import CourseViewer from "./CourseViewer";
import CourseOverview from "./CourseOverview";
import CourseCompletionStats from "./CourseCompletionStats";
import InitialLoader from "../../Components/InitialLoader";
import LoadingPopup from "../../Components/LoadingPopup";
import ClientView from "./ClientView";
import type { Course } from "../../Data/types";
import type { Activity } from "./ActivityBuilderPanel";
import constants from "../../Data/test_data.json";
import api from "../../Services/api.service";
import "../../globals.css";

const INITIAL_COURSES    = constants.COURSES    as Course[];
const INITIAL_ACTIVITIES = constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES = constants.DEFAULT_CATEGORIES;

// ─────────────────────────────────────────────────────────────────────────────

interface ClientLearningDashboardProps {
  onBack?: () => void;
}

export default function ClientLearningDashboard({ onBack }: ClientLearningDashboardProps) {
  const [courses, setCourses]       = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loadStage, setLoadStage]   = useState<'courses'|'activities'|'categories'|'done'>('courses');
  const [loaderDone, setLoaderDone] = useState(false);

  const [serverLoading, setServerLoading]       = useState(false);
  const [serverLoadingMsg, setServerLoadingMsg] = useState("Loading...");

  const { msg, visible, toast } = useToast();

  const [viewerIdx, setViewerIdx]                 = useState<number | null>(null);
  const [viewerOpen, setViewerOpen]               = useState(false);
  const [viewerExiting, setViewerExiting]         = useState(false);
  const [showOverview, setShowOverview]           = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [fullCourse, setFullCourse]               = useState<Course | null>(null);

  const [courseProgress, setCourseProgress] = useState<Record<number, {
    progress: number; timeSpent: number; lastAccessed: string;
    enrolled: boolean; completed: boolean; completedDate?: string;
    quizScores: number[];
    assessmentScores: Array<{ score: number; passed: boolean; passingScore: number }>;
  }>>({});

  // ── Guard against double-invocation from SSR hydration remount ────────────
  const hasFetched = useRef(false);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Prevent double-fetch from SSR hydration remount.
    // NOTE: we do NOT set cancelled=true in cleanup when the second mount is
    // blocked — otherwise the cleanup from mount #1 cancels the in-flight fetch.
    console.log('[LOADER] useEffect fired, hasFetched:', hasFetched.current);
    if (hasFetched.current) { console.log('[LOADER] blocked by hasFetched guard'); return; }
    hasFetched.current = true;
    console.log('[LOADER] mount — starting data fetch sequence');

    // Safety net: if the loader animation never calls onComplete (e.g. due to
    // a shatter animation bug), force-dismiss the loader after 6 seconds so
    // the user is never permanently stuck on the loading screen.
    const loaderTimeout = setTimeout(() => setLoaderDone(true), 6000);

    // Use an object ref for cancelled so the cleanup from mount #1 (which fires
    // before mount #2 is blocked) does NOT cancel the still-running fetch.
    const cancelledRef = { current: false };
    (async () => {
      try {
        // ── Courses ──────────────────────────────────────────────────────────
        console.log('[LOADER] 1/4 — fetching courses...');
        setLoadStage('courses');
        const cr = await api.courses.getUserCourses();
        console.log('[LOADER] 1/4 — courses response:', { success: cr.success, count: Array.isArray(cr.data) ? cr.data.length : 'not array', error: cr.error });
        if (cancelledRef.current) { console.log('[LOADER] cancelled after courses'); return; }

        if (cr.success && Array.isArray(cr.data) && cr.data.length > 0) {
          setCourses(cr.data);
        } else if (cr.success && Array.isArray(cr.data) && cr.data.length === 0) {
          console.warn('[LOADER] No courses assigned to this company yet.');
          setCourses([]);
        } else {
          console.warn('[LOADER] Course fetch failed, using test data:', cr.error);
          setCourses(INITIAL_COURSES);
        }

        // ── Activities ───────────────────────────────────────────────────────
        console.log('[LOADER] 2/4 — fetching activities...');
        setLoadStage('activities');
        const ar = await api.activities.getAll();
        console.log('[LOADER] 2/4 — activities response:', { success: ar.success, count: Array.isArray(ar.data) ? ar.data.length : 'not array', error: ar.error });
        if (cancelledRef.current) { console.log('[LOADER] cancelled after activities'); return; }
        setActivities(ar.success && Array.isArray(ar.data) && ar.data.length > 0
          ? ar.data
          : INITIAL_ACTIVITIES
        );

        // ── Categories ───────────────────────────────────────────────────────
        console.log('[LOADER] 3/4 — fetching categories...');
        setLoadStage('categories');
        const cat = await api.settings.getCategories();
        console.log('[LOADER] 3/4 — categories response:', { success: cat.success, data: cat.data, error: cat.error });
        if (cancelledRef.current) { console.log('[LOADER] cancelled after categories'); return; }
        setCategories(cat.success && Array.isArray(cat.data) && cat.data.length > 0
          ? cat.data
          : DEFAULT_CATEGORIES
        );

        // ── All done — advance loader to 100% and let it animate out ─────────
        console.log('[LOADER] 4/4 — all done, setting stage to done');
        setLoadStage('done');
        clearTimeout(loaderTimeout);

      } catch (err) {
        if (cancelledRef.current) return;
        console.error('[LOADER] CAUGHT ERROR:', err);
        setCourses(INITIAL_COURSES);
        setActivities(INITIAL_ACTIVITIES);
        setCategories(DEFAULT_CATEGORIES);
        setLoadStage('done');
        clearTimeout(loaderTimeout);
      }
    })();

    return () => {
      // Do NOT set cancelledRef.current = true here — the fetch must keep
      // running even after React's cleanup fires during the hydration remount.
      clearTimeout(loaderTimeout);
    };
  }, []);

  const publishedActivities = activities.filter(a => a.status === "published");

  // ── Progress handler ───────────────────────────────────────────────────────
  const handleProgress = async (idx: number, progress: number, timeSpent?: number, assessmentScore?: number) => {
    const safeProgress  = Math.min(100, Math.max(0, Math.floor(progress ?? 0)));
    const safeTimeSpent = Math.max(0, Math.floor(timeSpent ?? 0));
    const isCompleted   = safeProgress >= 100;
    const cur    = courseProgress[idx] || { quizScores: [], assessmentScores: [], timeSpent: 0 };
    const course = fullCourse || courses[idx];

    let updatedScores = cur.assessmentScores || [];
    if (assessmentScore !== undefined) {
      let passingScore = 70;
      course.modules?.forEach((mod: any) => mod.chapters.forEach((ch: any) => {
        if (ch.type === 'assessment' && ch.content?.passingScore) passingScore = ch.content.passingScore;
      }));
      updatedScores = [...updatedScores, { score: assessmentScore, passed: assessmentScore >= passingScore, passingScore }];
    }

    setCourses(p => p.map((c,i) => i===idx ? {...c,progress:safeProgress,enrolled:true} : c));
    setCourseProgress(p => ({ ...p, [idx]: {
      progress: safeProgress, timeSpent: (cur.timeSpent||0)+safeTimeSpent,
      lastAccessed: new Date().toISOString(), enrolled: true, completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString() : cur.completedDate,
      quizScores: cur.quizScores||[], assessmentScores: updatedScores,
    }}));
    if (isCompleted) setCourses(p => p.map((c,i) => i===idx ? {...c,progress:100,enrolled:true,completed:true} : c));
    setFullCourse(p => p ? {...p,progress:safeProgress,enrolled:true,completed:isCompleted,time_spent:(p.time_spent??0)+safeTimeSpent} : p);

    if (isCompleted && !cur.completed) {
      setTimeout(() => setShowCompletionStats(true), 300);
      setTimeout(async () => {
        const r = await api.courses.getUserCourses();
        if (r.success && r.data) setCourses(r.data);
      }, 1000);
    }
    try {
      if (course.id) await api.courses.updateProgress(course.id, {
        progress: parseInt(String(safeProgress),10), enrolled:1,
        time_spent: parseInt(String(safeTimeSpent),10), completed: isCompleted?1:0,
      });
    } catch { /* silent */ }
  };

  // ── Viewer ─────────────────────────────────────────────────────────────────
  const openViewer = async (idx: number) => {
    const course = courses[idx];
    if (!course.id) {
      if (!course.modules?.length) { toast('⚠️ This course has no modules yet.'); return; }
      setViewerIdx(idx); setFullCourse(course); setShowOverview(true); setViewerOpen(false); return;
    }
    setServerLoading(true); setServerLoadingMsg("Opening course...");
    try {
      const r = await api.courses.getFullCourse(course.id);
      if (r.success && r.data) {
        if (!r.data.modules?.length) { toast('⚠️ This course has no modules yet.'); return; }
        setFullCourse(r.data); setViewerIdx(idx); setShowOverview(true); setViewerOpen(false);
      } else toast(`Error: ${r.error || 'Unknown error'}`);
    } catch { toast('Failed to load course'); }
    finally { setServerLoading(false); }
  };

  const startCourse = () => { setShowOverview(false); setViewerOpen(true); };
  const closeViewer = () => {
    setViewerExiting(true);
    setTimeout(() => { setViewerOpen(false); setViewerExiting(false); setViewerIdx(null); setShowOverview(false); setFullCourse(null); }, 280);
  };
  const closeStats = () => {
    setShowCompletionStats(false); setViewerOpen(false); setViewerExiting(false);
    setViewerIdx(null); setShowOverview(false); setFullCourse(null);
  };

  // ── Course Overview screen ─────────────────────────────────────────────────
  if (showOverview && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseOverview course={fullCourse} onStart={startCourse}
          onClose={() => { setShowOverview(false); setViewerIdx(null); setFullCourse(null); }}
          toast={toast}
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

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <>
      {!loaderDone && (
        <InitialLoader
          stage={loadStage}
          onComplete={() => setLoaderDone(true)}
        />
      )}

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", flexDirection:"column", background:"#f7f6fe" }}>
        {onBack && (
          <div style={{ display:"flex", alignItems:"center", padding:"10px 20px", borderBottom:"1.5px solid rgba(108,61,214,0.1)", background:"#fff", flexShrink:0 }}>
            <button
              onClick={onBack}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px 5px 9px", borderRadius:8, border:"1px solid rgba(108,61,214,0.18)", background:"#fff", color:"#4a3870", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,61,214,0.07)"; e.currentTarget.style.color = "#6c3dd6"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4a3870"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L4 6l4 4"/>
              </svg>
              Dashboard
            </button>
            <div style={{ flex:1 }} />
            <span style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:16, fontStyle:"italic", color:"#18103a" }}>
              My <span style={{ color:"#6c3dd6", fontStyle:"normal" }}>Learning</span>
            </span>
          </div>
        )}

        <div style={{ flex:1, minHeight:0, overflow:"hidden", padding:"0 20px 20px" }}>
          <ClientView
            courses={courses}
            setCourses={setCourses}
            categories={categories}
            toast={toast}
            onOpenCourse={openViewer}
            publishedActivities={publishedActivities}
          />
        </div>

        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
      </div>
    </>
  );
}
