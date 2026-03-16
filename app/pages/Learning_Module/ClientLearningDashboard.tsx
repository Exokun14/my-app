'use client'

// ============================================================
//  ClientLearningDashboard.tsx
//  CHANGE: Replaced static "My Learning" text in the top bar
//  with a live UserMenu dropdown that fetches the authenticated
//  user from GET /api/user (Laravel Fortify + Sanctum).
//
//  Displays: avatar initials, name, role (formatted),
//  company name (from companies table), and Sign Out button.
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
import type { AuthUser } from "../../Services/api.service";
import { formatRole } from "../../Services/api.service";
import constants from "../../Data/test_data.json";
import api from "../../Services/api.service";
import "../../globals.css";

const INITIAL_COURSES    = constants.COURSES    as Course[];
const INITIAL_ACTIVITIES = constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES = constants.DEFAULT_CATEGORIES;

// ─────────────────────────────────────────────────────────────────────────────
// Derive two-letter initials from a full name  ("John Doe" → "JD")
// ─────────────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// UserMenu — mirrors the OverviewPage header dropdown
// Props:
//   user     — AuthUser from GET /api/user, or null while loading
//   onLogout — called when user clicks Sign Out
// ─────────────────────────────────────────────────────────────────────────────
interface UserMenuProps {
  user: AuthUser | null;
  onLogout?: () => void;
}

function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open,       setOpen]       = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    setLoggingOut(true);
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn("[UserMenu] logout API call failed:", e);
    } finally {
      setLoggingOut(false);
    }
    onLogout?.();
    if (!onLogout) window.location.href = "/";
  };
  const ref             = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derived display values — safe to render while user is still null (loading)
  const initials    = user ? getInitials(user.name) : "··";
  const displayName = user?.name         ?? "Loading...";
  const displayRole = formatRole(user?.role);         // 'admin' → 'System Admin'
  const company     = user?.company_name ?? "";       // from companies.name

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 10px 4px 4px",
          borderRadius: 10,
          border: `1px solid ${open ? "rgba(108,61,214,0.35)" : "rgba(108,61,214,0.18)"}`,
          background: open ? "rgba(108,61,214,0.07)" : "#fff",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all .18s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(108,61,214,0.05)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = open ? "rgba(108,61,214,0.07)" : "#fff"; }}
      >
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, #6c3dd6, #4a3870)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: ".02em" }}>
            {initials}
          </span>
        </div>

        {/* Name + role */}
        <div style={{ textAlign: "left", lineHeight: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#18103a", marginBottom: 2 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 10, color: "#7c6b9e", fontWeight: 500 }}>
            {displayRole}
          </div>
        </div>

        {/* Chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="#9b7fd4" strokeWidth="1.8" strokeLinecap="round"
          style={{ marginLeft: 2, flexShrink: 0, transition: "transform .18s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 9999,
          background: "#fff",
          borderRadius: 14,
          border: "1px solid rgba(108,61,214,0.13)",
          boxShadow: "0 8px 32px rgba(108,61,214,0.18)",
          minWidth: 224,
          paddingBottom: 6,
          animation: "ldFadeDown .15s ease",
        }}>

          {/* Header row */}
          <div style={{
            padding: "12px 16px 14px",
            borderBottom: "1px solid rgba(108,61,214,0.08)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #6c3dd6, #4a3870)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{initials}</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#18103a", lineHeight: 1.3 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10.5, color: "#9b7fd4", fontWeight: 500 }}>
                {displayRole}
              </div>
            </div>
          </div>

          {/* Company + Role rows */}
          <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid rgba(108,61,214,0.07)" }}>
            {company && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Company</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#18103a" }}>{company}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 500 }}>Role</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#18103a" }}>{displayRole}</span>
            </div>
          </div>

          {/* Sign Out */}
          <div style={{ padding: "6px 8px 0" }}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 9,
                border: "1px solid rgba(220,38,38,0.15)",
                background: "rgba(254,242,242,0.7)",
                color: "#dc2626", fontSize: 12, fontWeight: 600,
                cursor: loggingOut ? "not-allowed" : "pointer",
                opacity: loggingOut ? 0.6 : 1,
                fontFamily: "inherit", transition: "background .15s",
              }}
              onMouseEnter={e => { if (!loggingOut) e.currentTarget.style.background = "rgba(220,38,38,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(254,242,242,0.7)"; }}
            >
              {/* Sign-out icon */}
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M10 8H3M6 5l-3 3 3 3" />
                <path d="M6 3h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6" />
              </svg>
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      )}

      {/* Dropdown animation */}
      <style>{`
        @keyframes ldFadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ClientLearningDashboardProps {
  onBack?:    () => void;
  onLogout?:  () => void;   // wired to Sign Out in UserMenu
}

export default function ClientLearningDashboard({ onBack, onLogout }: ClientLearningDashboardProps) {
  const [courses, setCourses]       = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // ── Authenticated user (fetched from GET /api/user) ────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [loadStage, setLoadStage]   = useState<'courses'|'activities'|'categories'|'done'>('courses');
  const [loaderDone, setLoaderDone] = useState(false);

  const [serverLoading, setServerLoading]       = useState(false);
  const [serverLoadingMsg, setServerLoadingMsg] = useState("Loading...");

  const { msg, visible, toast } = useToast();

  const [viewerIdx, setViewerIdx]                     = useState<number | null>(null);
  const [viewerOpen, setViewerOpen]                   = useState(false);
  const [viewerExiting, setViewerExiting]             = useState(false);
  const [showOverview, setShowOverview]               = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [fullCourse, setFullCourse]                   = useState<Course | null>(null);

  const [courseProgress, setCourseProgress] = useState<Record<number, {
    progress: number; timeSpent: number; lastAccessed: string;
    enrolled: boolean; completed: boolean; completedDate?: string;
    quizScores: number[];
    assessmentScores: Array<{ score: number; passed: boolean; passingScore: number }>;
  }>>({});

  const hasFetched = useRef(false);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[LOADER] useEffect fired, hasFetched:', hasFetched.current);
    if (hasFetched.current) { console.log('[LOADER] blocked by hasFetched guard'); return; }
    hasFetched.current = true;

    const loaderTimeout = setTimeout(() => setLoaderDone(true), 6000);
    const cancelledRef  = { current: false };

    (async () => {
      try {
        // ── Fetch authenticated user (parallel, non-blocking) ─────────────
        // GET /api/user returns:
        //   { id, name, email, role, industry, company_id, company_name }
        // company_name comes from the companies table via eager-load.
        // See api_routes_snippet.php for the updated route.
        api.auth.getUser().then(ur => {
          if (ur.success && ur.data) {
            setAuthUser(ur.data);
            console.log('[AUTH] user loaded:', ur.data.name, '/', ur.data.company_name);
          } else {
            console.warn('[AUTH] Could not fetch auth user:', ur.error);
          }
        });

        // ── Courses ──────────────────────────────────────────────────────────
        setLoadStage('courses');
        const cr = await api.courses.getUserCourses();
        if (cancelledRef.current) return;

        let loadedCourses: Course[] = [];
        if (cr.success && Array.isArray(cr.data) && cr.data.length > 0) {
          loadedCourses = cr.data;
        } else if (cr.success && Array.isArray(cr.data) && cr.data.length === 0) {
          loadedCourses = [];
        } else {
          console.warn('[LOADER] Course fetch failed, using test data:', cr.error);
          loadedCourses = INITIAL_COURSES;
        }

        // FIX: The courses table stores progress/completed/time_spent as shared
        // columns — not per-user. Fetch the authenticated user's own progress
        // rows from user_course_progress and overwrite those fields on each
        // course so the dashboard reflects only this user's actual progress.
        try {
          const pr = await api.progress.getAll();
          if (pr.success && pr.data && pr.data.length > 0) {
            const progressByTitle: Record<string, typeof pr.data[0]> = {};
            pr.data.forEach(row => { progressByTitle[row.course] = row; });

            loadedCourses = loadedCourses.map(c => {
              const userRow = progressByTitle[c.title];
              if (!userRow) {
                // No progress row → this user has not started this course
                return { ...c, progress: 0, enrolled: false, completed: false, time_spent: 0 };
              }
              return {
                ...c,
                progress:   userRow.progress,
                enrolled:   true,
                completed:  userRow.status === "Completed",
                time_spent: userRow.time_spent ?? 0,
              };
            });
            console.log('[LOADER] ✅ Per-user progress merged onto', loadedCourses.length, 'courses');
          } else {
            // No progress rows at all → zero out all courses for this user
            loadedCourses = loadedCourses.map(c => ({
              ...c, progress: 0, enrolled: false, completed: false, time_spent: 0,
            }));
            console.log('[LOADER] No progress rows found — courses zeroed for this user');
          }
        } catch (progressErr) {
          // Non-fatal: fall back to shared table values rather than crashing
          console.warn('[LOADER] Could not fetch per-user progress, using course table values:', progressErr);
        }

        setCourses(loadedCourses);

        // ── Activities ───────────────────────────────────────────────────────
        setLoadStage('activities');
        const ar = await api.activities.getAll();
        if (cancelledRef.current) return;
        setActivities(ar.success && Array.isArray(ar.data) && ar.data.length > 0
          ? ar.data : INITIAL_ACTIVITIES);

        // ── Categories ───────────────────────────────────────────────────────
        setLoadStage('categories');
        const cat = await api.settings.getCategories();
        if (cancelledRef.current) return;
        setCategories(cat.success && Array.isArray(cat.data) && cat.data.length > 0
          ? cat.data : DEFAULT_CATEGORIES);

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

    return () => { clearTimeout(loaderTimeout); };
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

    // Update local courses state immediately so dashboard reflects changes
    // without requiring a page refresh
    setCourses(p => p.map((c,i) => i===idx ? {
      ...c,
      progress:   safeProgress,
      enrolled:   true,
      completed:  isCompleted,
      time_spent: (c.time_spent ?? 0) + safeTimeSpent,
    } : c));
    setCourseProgress(p => ({ ...p, [idx]: {
      progress: safeProgress, timeSpent: (cur.timeSpent||0)+safeTimeSpent,
      lastAccessed: new Date().toISOString(), enrolled: true, completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString() : cur.completedDate,
      quizScores: cur.quizScores||[], assessmentScores: updatedScores,
    }}));
    setFullCourse(p => p ? {...p,progress:safeProgress,enrolled:true,completed:isCompleted,time_spent:(p.time_spent??0)+safeTimeSpent} : p);

    if (isCompleted && !cur.completed) {
      setTimeout(() => setShowCompletionStats(true), 300);
      setTimeout(async () => {
        // Re-fetch courses then re-merge per-user progress so the dashboard
        // doesn't revert to shared table values after completion
        const [cr, pr] = await Promise.all([
          api.courses.getUserCourses(),
          api.progress.getAll(),
        ]);
        if (cr.success && cr.data) {
          const progressByTitle: Record<string, typeof pr.data[0]> = {};
          if (pr.success && pr.data) pr.data.forEach(row => { progressByTitle[row.course] = row; });
          setCourses(cr.data.map(c => {
            const userRow = progressByTitle[c.title];
            if (!userRow) return { ...c, progress: 0, enrolled: false, completed: false, time_spent: 0 };
            return { ...c, progress: userRow.progress, enrolled: true, completed: userRow.status === 'Completed', time_spent: userRow.time_spent ?? 0 };
          }));
        }
      }, 1000);
    }
    try {
      if (course.id) {
        const r = await api.courses.updateProgress(course.id, {
          progress: parseInt(String(safeProgress),10),
          enrolled: 1,
          time_spent: parseInt(String(safeTimeSpent),10),
          completed: isCompleted ? 1 : 0,
        });
        if (!r.success) console.error('[handleProgress] ❌ updateProgress failed:', r.error);
        else console.log('[handleProgress] ✅ progress saved:', safeProgress, '% time:', safeTimeSpent, 'min');
      }
    } catch (e) { console.error('[handleProgress] ❌ exception:', e); }
  };

  // ── Viewer helpers ─────────────────────────────────────────────────────────
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
        // FIX: getFullCourse returns the shared courses row which still carries
        // stale progress/completed/time_spent from whoever last wrote to it.
        // Override those fields with the per-user values we already merged
        // into courses[idx] during mount (sourced from user_course_progress).
        const userCourse = courses[idx];
        setFullCourse({
          ...r.data,
          progress:   userCourse.progress   ?? 0,
          completed:  userCourse.completed  ?? false,
          enrolled:   userCourse.enrolled   ?? false,
          time_spent: userCourse.time_spent ?? 0,
        });
        setViewerIdx(idx); setShowOverview(true); setViewerOpen(false);
      } else toast(`Error: ${r.error || 'Unknown error'}`);
    } catch { toast('Failed to load course'); }
    finally { setServerLoading(false); }
  };

  const startCourse = async () => {
    // FIX: Create a user_course_progress enrollment row when the user first
    // starts a course. Without this, progress: 0 is never written to the DB,
    // so on next load the course appears un-enrolled (no row found).
    if (viewerIdx !== null) {
      const course = fullCourse || courses[viewerIdx];
      if (course?.id) {
        // Check if a row already exists — only insert on first start
        const existing = await api.progress.getAll();
        const alreadyEnrolled = existing.success && existing.data?.some(
          r => r.course === course.title
        );
        if (!alreadyEnrolled) {
          try {
            await api.courses.updateProgress(course.id, {
              progress: 0, enrolled: 1, time_spent: 0, completed: 0,
            });
            // Update local state so the dashboard reflects enrolled immediately
            setCourses(p => p.map((c, i) => i === viewerIdx ? { ...c, enrolled: true } : c));
          } catch { /* non-fatal */ }
        }
      }
    }
    setShowOverview(false);
    setViewerOpen(true);
  };
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
              completedChapters: courseProgress[viewerIdx]?.progress != null
                ? Math.round((courseProgress[viewerIdx].progress / 100) * (fullCourse.modules?.reduce((s,m)=>s+m.chapters.length,0)||0))
                : 0,
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

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <>
      {!loaderDone && (
        <InitialLoader stage={loadStage} onComplete={() => setLoaderDone(true)} />
      )}

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", flexDirection:"column", background:"#f7f6fe" }}>

        {/* ── Top bar ── */}
        {onBack && (
          <div style={{
            display: "flex", alignItems: "center",
            padding: "8px 16px",
            borderBottom: "1.5px solid rgba(108,61,214,0.1)",
            background: "#fff",
            flexShrink: 0,
            gap: 12,
          }}>
            {/* Back to Dashboard */}
            <button
              onClick={onBack}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"5px 12px 5px 9px", borderRadius:8,
                border:"1px solid rgba(108,61,214,0.18)", background:"#fff",
                color:"#4a3870", fontSize:11, fontWeight:600,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .18s",
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(108,61,214,0.07)"; e.currentTarget.style.color="#6c3dd6"; }}
              onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#4a3870"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L4 6l4 4"/>
              </svg>
              Dashboard
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── User menu (replaces "My Learning" text) ── */}
            {/* Fetches from GET /api/user → { id, name, email, role, industry, company_id, company_name } */}
            <UserMenu user={authUser} onLogout={onLogout} />
          </div>
        )}

        {/* ── Content ── */}
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
