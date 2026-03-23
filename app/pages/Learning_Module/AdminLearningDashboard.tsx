'use client'

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

// ─── DEBUG LOGGER ────────────────────────────────────────────────────────────
const DEBUG = true; // set false to silence in production
const log = (section: string, msg: string, data?: any) => {
  if (!DEBUG) return;
  const style = 'background:#1e1245;color:#a78bfa;padding:2px 6px;border-radius:3px;font-weight:700';
  if (data !== undefined) {
    console.log(`%c[${section}]%c ${msg}`, style, '', data);
  } else {
    console.log(`%c[${section}]%c ${msg}`, style, '');
  }
};
const logError = (section: string, msg: string, data?: any) => {
  const style = 'background:#7f1d1d;color:#fca5a5;padding:2px 6px;border-radius:3px;font-weight:700';
  if (data !== undefined) {
    console.error(`%c[${section}]%c ${msg}`, style, '', data);
  } else {
    console.error(`%c[${section}]%c ${msg}`, style, '');
  }
};
const logWarn = (section: string, msg: string, data?: any) => {
  const style = 'background:#78350f;color:#fcd34d;padding:2px 6px;border-radius:3px;font-weight:700';
  if (data !== undefined) {
    console.warn(`%c[${section}]%c ${msg}`, style, '', data);
  } else {
    console.warn(`%c[${section}]%c ${msg}`, style, '');
  }
};
// ─────────────────────────────────────────────────────────────────────────────

async function loadDataFromAPI() {
  log('loadDataFromAPI', '▶ Starting full data load');
  try {
    log('loadDataFromAPI', '📡 Calling api.courses.getAll({ include_templates: true })');
    const coursesResponse = await api.courses.getAll({ include_templates: true });
    log('loadDataFromAPI', '📥 Raw courses response:', coursesResponse);

    const courses = coursesResponse.success && coursesResponse.data?.length
      ? coursesResponse.data : INITIAL_COURSES;

    if (!coursesResponse.success) {
      logError('loadDataFromAPI', '❌ courses.getAll() returned success:false', coursesResponse);
    } else if (!coursesResponse.data?.length) {
      logWarn('loadDataFromAPI', '⚠️ courses.getAll() returned empty array — falling back to INITIAL_COURSES');
    } else {
      const byStage = coursesResponse.data.reduce((acc: any, c: any) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1; return acc;
      }, {});
      log('loadDataFromAPI', `✅ Loaded ${coursesResponse.data.length} courses. Stage breakdown:`, byStage);
    }

    log('loadDataFromAPI', '📡 Calling api.activities.getAll()');
    const activitiesResponse = await api.activities.getAll();
    log('loadDataFromAPI', '📥 Raw activities response:', activitiesResponse);
    const activities = activitiesResponse.success && activitiesResponse.data?.length
      ? activitiesResponse.data : INITIAL_ACTIVITIES;

    log('loadDataFromAPI', '📡 Calling api.settings.getCategories()');
    const categoriesResponse = await api.settings.getCategories();
    log('loadDataFromAPI', '📥 Raw categories response:', categoriesResponse);
    const categories = categoriesResponse.success && categoriesResponse.data?.length
      ? categoriesResponse.data : DEFAULT_CATEGORIES;

    log('loadDataFromAPI', '✅ loadDataFromAPI complete', { courseCount: courses.length, activityCount: activities.length, categories });
    return { courses, categories, activities };
  } catch (err) {
    logError('loadDataFromAPI', '❌ Exception thrown', err);
    return { courses: INITIAL_COURSES, categories: DEFAULT_CATEGORIES, activities: INITIAL_ACTIVITIES };
  }
}

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

  // FIX: track whether module hydration has completed so usePublishGuard
  // does not run (and auto-unpublish published courses) before modules are loaded.
  const [modulesHydrated, setModulesHydrated] = useState(false);

  const [serverLoading, setServerLoading]       = useState(false);
  const [serverLoadingMsg, setServerLoadingMsg] = useState("Loading...");

  const { msg, visible, toast } = useToast();

  const [activityBuilderOpen, setActivityBuilderOpen] = useState(false);
  const [editingActivity, setEditingActivity]         = useState<Activity | null>(null);
  const [wizardOpen, setWizardOpen]                   = useState(false);

  const [viewerIdx, setViewerIdx]                     = useState<number | null>(null);
  const [viewerOpen, setViewerOpen]                   = useState(false);
  const [viewerExiting, setViewerExiting]             = useState(false);
  const [showOverview, setShowOverview]               = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  const [fullCourse, setFullCourse]                   = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse]             = useState(false);

  const [courseProgress, setCourseProgress] = useState<Record<number, {
    progress: number; timeSpent: number; lastAccessed: string;
    enrolled: boolean; completed: boolean; completedDate?: string;
    quizScores: number[];
    assessmentScores: Array<{ score: number; passed: boolean; passingScore: number }>;
  }>>({});

  // ── Log every time courses state changes ──────────────────────────────────
  useEffect(() => {
    if (courses.length === 0) {
      logWarn('STATE', '⚠️ courses state is now EMPTY []');
      return;
    }
    const byStage = courses.reduce((acc: any, c: any) => {
      acc[c.stage || 'undefined'] = (acc[c.stage || 'undefined'] || 0) + 1; return acc;
    }, {});
    log('STATE', `courses state updated → ${courses.length} total. Stage breakdown:`, byStage);
    log('STATE', 'Full courses list (id, title, stage, modules):', courses.map((c: any) => ({
      id: c.id,
      title: c.title,
      stage: c.stage,
      moduleCount: c.modules?.length ?? 0,
    })));
  }, [courses]);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    log('MOUNT', '▶ Component mounted — starting data load');
    (async () => {
      try {
        setLoadStage('courses');
        log('MOUNT', '📡 Calling api.courses.getAll({ include_templates: true })');
        log('MOUNT', '🔍 api.courses object keys:', Object.keys(api.courses));

        const cr = await api.courses.getAll({ include_templates: true });
        log('MOUNT', '📥 Raw getAll response:', cr);
        log('MOUNT', '📥 response.success:', cr.success);
        log('MOUNT', '📥 response.data type:', typeof cr.data);
        log('MOUNT', '📥 response.data length:', cr.data?.length ?? 'undefined');

        let rawCourses: Course[] = INITIAL_COURSES;

        if (cr.success && cr.data?.length) {
          const byStage = cr.data.reduce((acc: any, c: any) => {
            acc[c.stage || 'NO_STAGE'] = (acc[c.stage || 'NO_STAGE'] || 0) + 1; return acc;
          }, {});
          log('MOUNT', `✅ Got ${cr.data.length} courses from server. Stage breakdown:`, byStage);

          const templates = cr.data.filter((c: any) => c.stage === 'template');
          if (templates.length === 0) {
            logWarn('MOUNT', '⚠️ NO templates found in server response!');
            logWarn('MOUNT', '💡 Check Network tab → GET /api/courses — does the URL include ?include_templates=true ?');
          } else {
            log('MOUNT', `✅ Found ${templates.length} template(s):`, templates.map((t: any) => t.title));
          }

          rawCourses = cr.data;
        } else {
          logWarn('MOUNT', '⚠️ Falling back to INITIAL_COURSES. Reason:');
          if (!cr.success) logError('MOUNT', '  → success was false. Full response:', cr);
          if (!cr.data?.length) logWarn('MOUNT', '  → data array was empty or undefined');
        }

        // FIX: Set courses immediately so UI renders, but DON'T let usePublishGuard
        // fire yet — modulesHydrated stays false until hydration is complete.
        setCourses(rawCourses);

        // ── Hydrate modules for all courses in parallel ──────────────────────
        // getAll() intentionally omits modules for performance. We fetch them
        // now so readiness scores (modules/chapters checks) are correct from
        // first render, and so usePublishGuard doesn't incorrectly demote
        // published courses that have modules in the DB.
        log('MOUNT', `📡 Hydrating modules for ${rawCourses.length} courses in parallel…`);
        try {
          const hydrated = await Promise.all(
            rawCourses.map(async (c: Course) => {
              if (!c.id) return c;
              try {
                const r = await api.courses.getById(c.id);
                if (r.success && r.data) {
                  return { ...c, modules: r.data.modules ?? [] };
                }
              } catch (err) {
                logWarn('MOUNT', `⚠️ getById(${c.id}) failed — keeping empty modules`, err);
              }
              return c;
            })
          );
          log('MOUNT', '✅ Module hydration complete', hydrated.map((c: Course) => ({
            id: c.id, title: c.title, modules: c.modules?.length ?? 0,
          })));
          setCourses(hydrated);
        } catch (err) {
          logError('MOUNT', '❌ Module hydration failed — courses will have empty modules', err);
        }

        // FIX: Only NOW allow usePublishGuard to run. Modules are populated so
        // the guard won't incorrectly auto-unpublish courses with real content.
        setModulesHydrated(true);
        log('MOUNT', '✅ modulesHydrated = true — PublishGuard is now active');

        setLoadStage('activities');
        const ar = await api.activities.getAll();
        log('MOUNT', '📥 activities response:', ar);
        setActivities(ar.success && ar.data?.length ? ar.data : INITIAL_ACTIVITIES);

        setLoadStage('categories');
        const cat = await api.settings.getCategories();
        log('MOUNT', '📥 categories response:', cat);
        setCategories(cat.success && cat.data?.length ? cat.data : DEFAULT_CATEGORIES);

        setLoadStage('done');
        log('MOUNT', '✅ All data loaded successfully');
      } catch (err) {
        logError('MOUNT', '❌ Exception during load:', err);
        setCourses(INITIAL_COURSES);
        setActivities(INITIAL_ACTIVITIES);
        setCategories(DEFAULT_CATEGORIES);
        setModulesHydrated(true); // unblock guard even on error
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
    } catch (err) {
      logError('ACTIVITY', '❌ Exception saving activity:', err);
      setServerLoading(false);
      toast('Failed to save activity to server');
    }
  };

  // ── Course handlers ────────────────────────────────────────────────────────
  const handleWizardSave = async (data: Course) => {
    const draft: Course = { ...data, active: false, stage: "draft" as any };
    log('WIZARD_SAVE', '▶ handleWizardSave called');
    log('WIZARD_SAVE', '📤 Full draft payload:', draft);
    log('WIZARD_SAVE', '📦 modules in payload:', draft.modules?.length ?? 0, draft.modules);

    try {
      setServerLoading(true); setServerLoadingMsg("Creating course...");
      log('WIZARD_SAVE', '📡 Calling api.courses.create(draft)');
      const r = await api.courses.create(draft);
      log('WIZARD_SAVE', '📥 create() response:', r);
      setServerLoading(false);

      if (r.success && r.data) {
        const courseId = r.data.id;
        log('WIZARD_SAVE', `✅ Course created with id: ${courseId}`);

        if (draft.modules && draft.modules.length > 0) {
          log('WIZARD_SAVE', `📡 Calling api.courses.updateModules(${courseId}, [${draft.modules.length} modules])`);
          log('WIZARD_SAVE', '📦 Modules being sent:', draft.modules);
          setServerLoading(true); setServerLoadingMsg("Saving modules...");
          try {
            const mr = await api.courses.updateModules(courseId, draft.modules);
            log('WIZARD_SAVE', '📥 updateModules() response:', mr);
            if (!mr.success) {
              logError('WIZARD_SAVE', '❌ updateModules failed:', mr);
            }
          } catch (modErr) {
            logError('WIZARD_SAVE', '❌ updateModules() threw exception (modules will not persist!):', modErr);
          }
          setServerLoading(false);
        } else {
          logWarn('WIZARD_SAVE', '⚠️ No modules in draft — skipping updateModules call');
        }

        log('WIZARD_SAVE', `📡 Calling api.courses.getById(${courseId}) to confirm save`);
        const full = await api.courses.getById(courseId);
        log('WIZARD_SAVE', '📥 getById() response:', full);

        if (full.success && full.data) {
          log('WIZARD_SAVE', `✅ Server confirms: modules saved = ${full.data.modules?.length ?? 0}`);
          if ((full.data.modules?.length ?? 0) === 0 && (draft.modules?.length ?? 0) > 0) {
            logError('WIZARD_SAVE', '❌ MISMATCH: sent modules but server returned none! Check updateModules endpoint and route.');
          }
        } else {
          logError('WIZARD_SAVE', '❌ getById() failed after create — storing local draft instead');
        }

        const saved = full.success && full.data ? full.data : { ...draft, id: courseId };
        log('WIZARD_SAVE', '💾 Adding to courses state:', saved);
        setCourses(p => [...p, saved]);
        toast('Course saved as Draft.');
      } else {
        logError('WIZARD_SAVE', '❌ create() failed:', r.error);
        toast(`Error: ${r.error || 'Failed to create course'}`);
      }
    } catch (err) {
      logError('WIZARD_SAVE', '❌ Exception in handleWizardSave:', err);
      setServerLoading(false);
      toast('Failed to create course on server');
    }
  };

  // ── Progress handler ───────────────────────────────────────────────────────
  const handleProgress = async (idx: number, progress: number, timeSpent?: number, assessmentScore?: number) => {
    const safeProgress  = Math.min(100, Math.max(0, Math.floor(progress ?? 0)));
    const safeTimeSpent = Math.max(0, Math.floor(timeSpent ?? 0));
    const isCompleted   = safeProgress >= 100;
    const cur     = courseProgress[idx] || { quizScores: [], assessmentScores: [], timeSpent: 0 };
    const course  = fullCourse || courses[idx];

    log('PROGRESS', `▶ handleProgress idx=${idx} progress=${safeProgress}% timeSpent=${safeTimeSpent}s completed=${isCompleted}`);

    let updatedScores = cur.assessmentScores || [];
    if (assessmentScore !== undefined) {
      let passingScore = 70;
      course.modules?.forEach((mod: any) => mod.chapters.forEach((ch: any) => {
        if (ch.type === 'assessment' && ch.content?.passingScore) passingScore = ch.content.passingScore;
      }));
      updatedScores = [...updatedScores, { score: assessmentScore, passed: assessmentScore >= passingScore, passingScore }];
    }

    setCourses(p => p.map((c, i) => i === idx ? { ...c, progress: safeProgress, enrolled: true } : c));
    setCourseProgress(p => ({ ...p, [idx]: {
      progress: safeProgress,
      timeSpent: (cur.timeSpent || 0) + safeTimeSpent,
      lastAccessed: new Date().toISOString(),
      enrolled: true, completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString() : cur.completedDate,
      quizScores: cur.quizScores || [],
      assessmentScores: updatedScores,
    }}));

    if (isCompleted) setCourses(p => p.map((c, i) => i === idx ? { ...c, progress: 100, enrolled: true, completed: true } : c));
    setFullCourse(p => p ? { ...p, progress: safeProgress, enrolled: true, completed: isCompleted, time_spent: (p.time_spent ?? 0) + safeTimeSpent } : p);

    if (isCompleted && !cur.completed) {
      setTimeout(() => setShowCompletionStats(true), 300);
      setTimeout(async () => {
        log('PROGRESS', '📡 Post-completion refresh: calling getAll({ include_templates: true })');
        const r = await api.courses.getAll({ include_templates: true });
        log('PROGRESS', '📥 Post-completion getAll response:', r);
        if (r.success && r.data) {
          // Re-hydrate modules after refresh so PublishGuard doesn't see
          // empty modules and incorrectly auto-unpublish published courses.
          log('PROGRESS', '📡 Re-hydrating modules after completion refresh...');
          const hydrated = await Promise.all(
            r.data.map(async (c: Course) => {
              if (!c.id) return c;
              try {
                const mr = await api.courses.getById(c.id);
                if (mr.success && mr.data) return { ...c, modules: mr.data.modules ?? [] };
              } catch {}
              return c;
            })
          );
          log('PROGRESS', '✅ Post-completion hydration done');
          setCourses(hydrated);
        }
      }, 1000);
    }

    try {
      if (course.id) {
        log('PROGRESS', `📡 Calling updateProgress(${course.id}, { progress: ${safeProgress}, ... })`);
        await api.courses.updateProgress(course.id, {
          progress: parseInt(String(safeProgress), 10),
          enrolled: 1,
          time_spent: parseInt(String(safeTimeSpent), 10),
          completed: isCompleted ? 1 : 0,
        });
        log('PROGRESS', '✅ updateProgress sent');
      } else {
        logWarn('PROGRESS', '⚠️ course.id is missing — updateProgress NOT sent to server');
      }
    } catch (err) {
      logError('PROGRESS', '❌ updateProgress threw exception:', err);
    }
  };

  const handleResetData = async () => {
    log('RESET', '▶ handleResetData called — reloading from server');
    setServerLoading(true); setServerLoadingMsg("Reloading from server...");
    const data = await loadDataFromAPI();
    log('RESET', '📥 Reload result:', {
      courseCount: data.courses.length,
      stages: data.courses.reduce((a: any, c: any) => { a[c.stage] = (a[c.stage]||0)+1; return a; }, {}),
    });
    setCourses(data.courses);
    setCategories(data.categories);
    setActivities(data.activities);
    setCourseProgress({});
    setServerLoading(false);
    toast('Data reloaded from server');
  };

  const openViewer = async (idx: number) => {
    const course = courses[idx];
    log('VIEWER', `▶ openViewer idx=${idx} course.id=${course.id} course.title="${course.title}"`);

    if (!course.id) {
      logWarn('VIEWER', '⚠️ course has no id — using local state modules');
      if (!course.modules?.length) { toast('⚠️ No modules yet.'); return; }
      setViewerIdx(idx); setFullCourse(course); setShowOverview(true); setViewerOpen(false);
      return;
    }

    setLoadingCourse(true); setServerLoading(true); setServerLoadingMsg("Opening course...");
    try {
      log('VIEWER', `📡 Calling api.courses.getFullCourse(${course.id})`);
      const r = await api.courses.getFullCourse(course.id);
      log('VIEWER', '📥 getFullCourse response:', r);
      if (r.success && r.data) {
        log('VIEWER', `✅ Full course loaded. modules: ${r.data.modules?.length ?? 0}`);
        if (!r.data.modules?.length) {
          logWarn('VIEWER', '⚠️ Course has no modules on server');
          toast('⚠️ No modules yet.');
          return;
        }
        setFullCourse(r.data);
        setViewerIdx(idx);
        setShowOverview(true);
        setViewerOpen(false);
      } else {
        logError('VIEWER', '❌ getFullCourse failed:', r.error);
        toast(`Error: ${r.error || 'Unknown error'}`);
      }
    } catch (err) {
      logError('VIEWER', '❌ Exception in openViewer:', err);
      toast('Failed to load course');
    } finally {
      setLoadingCourse(false);
      setServerLoading(false);
    }
  };

  const startCourse  = () => { setShowOverview(false); setViewerOpen(true); };
  const closeViewer  = () => {
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
          onProgress={(p, t, a) => handleProgress(viewerIdx, p, t, a)} toast={toast} />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
        {showCompletionStats && (
          <CourseCompletionStats open onClose={closeStats} courseName={fullCourse.title}
            stats={{
              totalChapters:     fullCourse.modules?.reduce((s, m) => s + m.chapters.length, 0) || 0,
              completedChapters: fullCourse.modules?.reduce((s, m) => s + m.chapters.filter((c: any) => c.done).length, 0) || 0,
              totalQuizzes:      fullCourse.modules?.reduce((s, m) => s + m.chapters.filter((c: any) => c.type === 'quiz').length, 0) || 0,
              quizScores:        courseProgress[viewerIdx]?.quizScores || [],
              totalAssessments:  fullCourse.modules?.reduce((s, m) => s + m.chapters.filter((c: any) => c.type === 'assessment').length, 0) || 0,
              assessmentScores:  courseProgress[viewerIdx]?.assessmentScores || [],
              timeSpent:         fullCourse.time_spent || courseProgress[viewerIdx]?.timeSpent || 0,
              completionDate:    courseProgress[viewerIdx]?.completedDate || new Date().toISOString(),
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

      <div style={{ position:'fixed', inset:0, background:'#fafaf9', zIndex:800, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        :root, .lc-page {
          --purple: #6c3dd6; --purple-d: #4f1eb8; --purple-lt: rgba(108,61,214,0.07);
          --teal: #0d9488; --border: rgba(108,61,214,0.1);
          --surface: #ffffff; --surface2: #f4f2fb;
          --t1: #18103a; --t2: #4a3870; --t3: #8e7ec0;
          --t4: rgba(142,126,192,0.6); --bg: #f7f6fe;
        }
        @keyframes lc-slideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .lc-main-enter { animation: lc-slideIn 0.32s cubic-bezier(0.16,1,0.3,1) both; }
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
          <h1 className="ph-title">Learning <em>Center</em></h1>
          <div className="tab-dots">
            <span className="tab-label">{PANELS[panel]}</span>
            {PANELS.map((_, i) => (
              <button key={i} className={`tab-dot${panel === i ? " active" : ""}`} onClick={() => setPanel(i)} />
            ))}
          </div>

          <div className="ph-rule" />

          <div className="ph-actions">
            {panel === 1 && (
              <div className="role-toggle">
                {(["admin", "manager", "client"] as ProgressRole[]).map(r => (
                  <button key={r} className={`role-btn${progressRole === r ? " active" : ""}`} onClick={() => setProgressRole(r)}>{r}</button>
                ))}
              </div>
            )}

            <button className="btn btn-p btn-sm" onClick={() => setWizardOpen(true)}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/></svg>
              Create New Course
            </button>
            <button className="btn btn-s btn-sm" onClick={() => { setEditingActivity(null); setActivityBuilderOpen(true); }}
              style={{ background: 'var(--surface)', borderColor: 'rgba(124,58,237,0.2)' }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3"/></svg>
              Activity Builder
              {activities.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--purple)', color: '#fff', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                  {activities.length}
                </div>
              )}
            </button>
            <div style={{ padding: "6px 12px", borderRadius: 8, background: "var(--surface)", border: "1.5px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)' }} />
                <span style={{ color: "var(--purple)" }}>{activities.length}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>Total</span>
              </div>
              <span style={{ width: 1, height: 12, background: "var(--border)" }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
                <span style={{ color: "var(--teal)" }}>{publishedActivities.length}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>Published</span>
              </div>
            </div>

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

        <div className="swipe-container">
          <div className="swipe-track" style={{ transform: `translateX(-${panel * 100}%)` }}>
            <div className="swipe-panel" style={{ width: "100%" }}>
              <CourseCatalog
                courses={courses}
                setCourses={setCourses}
                categories={categories}
                setCategories={setCategories}
                toast={toast}
                onOpenCourse={openViewer}
                publishedActivities={publishedActivities}
                modulesHydrated={modulesHydrated}
              />
            </div>
            <div className="swipe-panel" style={{ width: "100%" }}>
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
