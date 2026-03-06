'use client'

import { useState, useEffect } from "react";
import { useToast } from "../../Hooks/useToast";
import Toast from "../../Components/Toast";
import ActivityBuilderPanel, { type Activity } from "./ActivityBuilderPanel";
import ActivityManager from "./ActivityManager";
import ActivitiesPanel from "./ActivitiesPanel";
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

const PANELS = ["Course Catalog", "Activities", "Client Progress"];
const INITIAL_COURSES = constants.COURSES as Course[];
const INITIAL_ACTIVITIES = constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES = constants.DEFAULT_CATEGORIES;

// ─────────────────────────────────────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────────────────────────────────────

async function loadDataFromAPI() {
  try {
    const coursesResponse = await api.courses.getAll();
    const courses = coursesResponse.success && coursesResponse.data && coursesResponse.data.length > 0
      ? coursesResponse.data : INITIAL_COURSES;

    const activitiesResponse = await api.activities.getAll();
    const activities = activitiesResponse.success && activitiesResponse.data && activitiesResponse.data.length > 0
      ? activitiesResponse.data : INITIAL_ACTIVITIES;

    const categoriesResponse = await api.settings.getCategories();
    const categories = categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0
      ? categoriesResponse.data : DEFAULT_CATEGORIES;

    return { courses, categories, activities, courseProgress: {} };
  } catch (error) {
    console.error('Failed to load data from API:', error);
    return { courses: INITIAL_COURSES, categories: DEFAULT_CATEGORIES, activities: INITIAL_ACTIVITIES, courseProgress: {} };
  }
}

export default function LearningCenter() {
  const [panel, setPanel] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // 'courses' | 'activities' | 'categories' | 'done' — drives InitialLoader progress
  const [loadStage, setLoadStage] = useState<'courses' | 'activities' | 'categories' | 'done'>('courses');
  // True once the loader animation has finished its exit
  const [loaderDone, setLoaderDone] = useState(false);

  // Server loading popup state
  const [serverLoading, setServerLoading] = useState(false);
  const [serverLoadingMsg, setServerLoadingMsg] = useState("Loading...");

  const { msg, visible, toast } = useToast();

  const [activityBuilderOpen, setActivityBuilderOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);

  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerExiting, setViewerExiting] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);

  const [fullCourse, setFullCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  const [courseProgress, setCourseProgress] = useState<Record<number, {
    progress: number;
    timeSpent: number;
    lastAccessed: string;
    enrolled: boolean;
    completed: boolean;
    completedDate?: string;
    quizScores: number[];
    assessmentScores: Array<{ score: number; passed: boolean; passingScore: number }>;
  }>>({});

  // ── LOAD DATA ON MOUNT — each step updates the stage so the loader bar syncs ─
  useEffect(() => {
    const loadData = async () => {
      try {
        // Step 1: Courses
        setLoadStage('courses');
        const coursesResponse = await api.courses.getAll();
        const courses = coursesResponse.success && coursesResponse.data && coursesResponse.data.length > 0
          ? coursesResponse.data : INITIAL_COURSES;
        setCourses(courses);
        console.log('Loaded from API - Courses:', courses.length);

        // Step 2: Activities
        setLoadStage('activities');
        const activitiesResponse = await api.activities.getAll();
        const activities = activitiesResponse.success && activitiesResponse.data && activitiesResponse.data.length > 0
          ? activitiesResponse.data : INITIAL_ACTIVITIES;
        setActivities(activities);
        console.log('Loaded from API - Activities:', activities.length);

        // Step 3: Categories
        setLoadStage('categories');
        const categoriesResponse = await api.settings.getCategories();
        const categories = categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0
          ? categoriesResponse.data : DEFAULT_CATEGORIES;
        setCategories(categories);

        // Step 4: Done — triggers loader exit animation
        setLoadStage('done');
      } catch (error) {
        console.error('Failed to load data from API:', error);
        setCourses(INITIAL_COURSES);
        setActivities(INITIAL_ACTIVITIES);
        setCategories(DEFAULT_CATEGORIES);
        setLoadStage('done');
      }
    };
    loadData();
  }, []);

  const publishedActivities = activities.filter(a => a.status === "published");

  // ── ACTIVITY HANDLERS ────────────────────────────────────────────────────────
  const handleActivitySave = async (activity: Activity, saveAs: "draft" | "published") => {
    const updatedActivity = { ...activity, status: saveAs };
    try {
      if (editingActivity) {
        setServerLoading(true); setServerLoadingMsg("Saving activity...");
        const response = await api.activities.update(activity.id, updatedActivity);
        setServerLoading(false);
        if (response.success) {
          setActivities(prev => prev.map(a => a.id === activity.id ? updatedActivity : a));
          toast(`Activity ${saveAs === "published" ? "published" : "saved as draft"} successfully!`);
        } else {
          toast(`Error: ${response.error || 'Failed to update activity'}`);
          return;
        }
      } else {
        setServerLoading(true); setServerLoadingMsg("Creating activity...");
        const response = await api.activities.create(updatedActivity);
        setServerLoading(false);
        if (response.success && response.data) {
          const savedActivity = { ...updatedActivity, id: response.data.activity_id };
          setActivities(prev => [...prev, savedActivity]);
          toast(`Activity ${saveAs === "published" ? "published" : "created as draft"}!`);
        } else {
          toast(`Error: ${response.error || 'Failed to create activity'}`);
          return;
        }
      }
      setActivityBuilderOpen(false);
      setEditingActivity(null);
    } catch (error) {
      setServerLoading(false);
      console.error('Error saving activity:', error);
      toast('Failed to save activity to server');
    }
  };

  // ── COURSE HANDLERS ──────────────────────────────────────────────────────────
  const handleWizardSave = async (data: Course) => {
    try {
      setServerLoading(true); setServerLoadingMsg("Creating course...");
      const response = await api.courses.create(data);
      setServerLoading(false);
      if (response.success && response.data) {
        const newCourse = { ...data, id: response.data.id };
        setCourses(prev => [...prev, newCourse]);
        toast('Course created successfully!');
      } else {
        toast(`Error: ${response.error || 'Failed to create course'}`);
      }
    } catch (error) {
      setServerLoading(false);
      console.error('Error creating course:', error);
      toast('Failed to create course on server');
    }
  };

  // ── PROGRESS HANDLER ─────────────────────────────────────────────────────────
  const handleProgress = async (idx: number, progress: number, timeSpent?: number, assessmentScore?: number) => {
    const safeProgress = Math.min(100, Math.max(0, Math.floor(progress ?? 0)));
    const safeTimeSpent = Math.max(0, Math.floor(timeSpent ?? 0));
    const isCompleted = safeProgress >= 100;
    const currentProgress = courseProgress[idx] || { quizScores: [], assessmentScores: [], timeSpent: 0 };
    const course = fullCourse || courses[idx];

    let updatedAssessmentScores = currentProgress.assessmentScores || [];
    if (assessmentScore !== undefined) {
      const modules = course.modules || [];
      let passingScore = 70;
      modules.forEach(mod => {
        mod.chapters.forEach(ch => {
          if (ch.type === 'assessment' && (ch.content as any).passingScore) {
            passingScore = (ch.content as any).passingScore;
          }
        });
      });
      updatedAssessmentScores = [
        ...updatedAssessmentScores,
        { score: assessmentScore, passed: assessmentScore >= passingScore, passingScore }
      ];
    }

    setCourses(prev =>
      prev.map((c, i) => i === idx ? { ...c, progress: safeProgress, enrolled: true } : c)
    );

    const newProgressData = {
      progress: safeProgress,
      timeSpent: (currentProgress?.timeSpent || 0) + safeTimeSpent,
      lastAccessed: new Date().toISOString(),
      enrolled: true,
      completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString() : currentProgress?.completedDate,
      quizScores: currentProgress?.quizScores || [],
      assessmentScores: updatedAssessmentScores,
    };

    setCourseProgress(prev => ({ ...prev, [idx]: newProgressData }));

    if (isCompleted) {
      setCourses(prev =>
        prev.map((c, i) => i === idx ? { ...c, progress: 100, enrolled: true, completed: true } : c)
      );
    }

    setFullCourse(prev => prev
      ? { ...prev, progress: safeProgress, enrolled: true, completed: isCompleted, time_spent: (prev.time_spent ?? 0) + safeTimeSpent }
      : prev
    );

    if (isCompleted && !currentProgress.completed) {
      // Show completion stats — keep viewerIdx/fullCourse alive so the popup can read them
      setTimeout(() => setShowCompletionStats(true), 300);
      // Refresh courses list in background
      setTimeout(async () => {
        const coursesResponse = await api.courses.getAll();
        if (coursesResponse.success && coursesResponse.data) { setCourses(coursesResponse.data); }
      }, 1000);
    }

    try {
      const courseId = course.id;
      if (courseId) {
        const payload = {
          progress:   parseInt(String(safeProgress), 10),
          enrolled:   1,
          time_spent: parseInt(String(safeTimeSpent), 10),
          completed:  isCompleted ? 1 : 0,
        };
        console.log('📤 Sending progress payload:', JSON.stringify(payload), 'to course ID:', courseId);
        const response = await api.courses.updateProgress(courseId, payload);
        if (!response.success) { console.error('Failed to update progress:', response.error); }
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleResetData = async () => {
    setServerLoading(true); setServerLoadingMsg("Reloading from server...");
    const data = await loadDataFromAPI();
    setCourses(data.courses);
    setCategories(data.categories);
    setActivities(data.activities);
    setCourseProgress({});
    setServerLoading(false);
    toast('Data reloaded from server');
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      setServerLoading(true); setServerLoadingMsg("Deleting activity...");
      const response = await api.activities.delete(id);
      setServerLoading(false);
      if (response.success) {
        setActivities(prev => prev.filter(a => a.id !== id));
        toast('Activity deleted successfully');
      } else {
        toast(`Error: ${response.error || 'Failed to delete activity'}`);
      }
    } catch (error) {
      setServerLoading(false);
      console.error('Error deleting activity:', error);
      toast('Failed to delete activity from server');
    }
  };

  // ── OPEN VIEWER ──────────────────────────────────────────────────────────────
  const openViewer = async (idx: number) => {
    const course = courses[idx];

    if (!course.id) {
      console.warn('Course has no ID, using cached data');
      if (!course.modules || course.modules.length === 0) {
        toast('⚠️ This course has no modules yet. Please add content first.');
        return;
      }
      setViewerIdx(idx);
      setFullCourse(course);
      setShowOverview(true);
      setViewerOpen(false);
      return;
    }

    setLoadingCourse(true);
    setServerLoading(true); setServerLoadingMsg("Opening course...");
    try {
      console.log('🔵 Loading full course data for course ID:', course.id);
      const response = await api.courses.getFullCourse(course.id);

      if (response.success && response.data) {
        console.log('✅ Loaded full course:', response.data);
        console.log('📦 Modules:', response.data.modules?.length || 0);
        response.data.modules?.forEach((mod: any, i: number) => {
          console.log(`   Module ${i + 1}: ${mod.title} (${mod.chapters?.length || 0} chapters)`);
        });

        if (!response.data.modules || response.data.modules.length === 0) {
          toast('⚠️ This course has no modules yet. Please add content first.');
          return;
        }

        setFullCourse(response.data);
        setViewerIdx(idx);
        setShowOverview(true);
        setViewerOpen(false);
      } else {
        console.error('❌ Failed to load course:', response.error);
        toast(`Error loading course: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Exception loading course:', error);
      toast('Failed to load course from server');
    } finally {
      setLoadingCourse(false);
      setServerLoading(false);
    }
  };

  const startCourse = () => { setShowOverview(false); setViewerOpen(true); };

  const closeViewer = () => {
    setViewerExiting(true);
    setTimeout(() => {
      setViewerOpen(false);
      setViewerExiting(false);
      setViewerIdx(null);
      setShowOverview(false);
      setFullCourse(null);
    }, 280);
  };

  const handleCloseCompletionStats = () => {
    setShowCompletionStats(false);
    setViewerOpen(false);
    setViewerExiting(false);
    setViewerIdx(null);
    setShowOverview(false);
    setFullCourse(null);
  };

  const handleOpenActivityBuilder = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setActivityBuilderOpen(true);
  };

  const handleCompleteCourse = (idx: number) => {
    handleProgress(idx, 100);
    const currentProgress = courseProgress[idx];
    if (currentProgress) { setShowCompletionStats(true); }
  };

  // ── INITIAL LOADER ───────────────────────────────────────────────────────────
  // The loader renders on top (z-index 99999). The dashboard renders underneath
  // it the whole time — hidden but fully painted. When onComplete fires the
  // dashboard is already ready so there is zero flash on reveal.
  const showLoader = !loaderDone;

  // ── Course Overview ──────────────────────────────────────────────────────────
  if (loaderDone && showOverview && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseOverview
          course={fullCourse}
          onStart={startCourse}
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

  // ── Course Viewer ────────────────────────────────────────────────────────────
  if (loaderDone && viewerOpen && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseViewer
          course={fullCourse}
          onClose={closeViewer}
          onProgress={(progress, timeSpent, assessmentScore) => handleProgress(viewerIdx, progress, timeSpent, assessmentScore)}
          toast={toast}
        />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
        {showCompletionStats && viewerIdx !== null && (
          <CourseCompletionStats
            open={showCompletionStats}
            onClose={handleCloseCompletionStats}
            courseName={fullCourse.title}
            stats={{
              totalChapters: fullCourse.modules?.reduce((sum, m) => sum + m.chapters.length, 0) || 0,
              completedChapters: fullCourse.modules?.reduce((sum, m) => sum + m.chapters.filter(c => c.done).length, 0) || 0,
              totalQuizzes: fullCourse.modules?.reduce((sum, m) => sum + m.chapters.filter(c => c.type === 'quiz').length, 0) || 0,
              quizScores: courseProgress[viewerIdx]?.quizScores || [],
              totalAssessments: fullCourse.modules?.reduce((sum, m) => sum + m.chapters.filter(c => c.type === 'assessment').length, 0) || 0,
              assessmentScores: courseProgress[viewerIdx]?.assessmentScores || [],
              timeSpent: fullCourse.time_spent || courseProgress[viewerIdx]?.timeSpent || 0,
              completionDate: courseProgress[viewerIdx]?.completedDate || new Date().toISOString()
            }}
          />
        )}
      </>
    );
  }

  // ── Course Creation Wizard ───────────────────────────────────────────────────
  if (loaderDone && wizardOpen) {
    return (
      <>
        <CourseCreationWizard
          categories={categories}
          setCategories={setCategories}
          onSave={handleWizardSave}
          onCancel={() => setWizardOpen(false)}
          toast={toast}
        />
        <Toast msg={msg} visible={visible} />
        <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
      </>
    );
  }

  // ── Main Learning Center ─────────────────────────────────────────────────────
  return (
    <>
      {/* Loader sits on top. Dashboard renders underneath it fully painted
          so when the loader exits there is nothing left to load. */}
      {showLoader && (
        <InitialLoader
          stage={loadStage}
          onComplete={() => setLoaderDone(true)}
        />
      )}

      <div style={{ visibility: showLoader ? 'hidden' : 'visible' }}>
      <style>{`
        @keyframes lc-fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .lc-main-enter { animation: lc-fadeIn 0.35s ease both; }
      `}</style>

      <div className="amb" />
      <div className="lc-page lc-main-enter">

        {/* Page Header */}
        <div className="ph">
          <h1 className="ph-title">Learning <em>Center</em></h1>
          <div className="tab-dots">
            <span className="tab-label">{PANELS[panel]}</span>
            {PANELS.map((_, i) => (
              <button
                key={i}
                className={`tab-dot${panel === i ? " active" : ""}`}
                onClick={() => setPanel(i)}
              />
            ))}
          </div>
          <div className="ph-rule" />
          <div className="ph-actions">
            <button className="btn btn-p btn-sm" onClick={() => setWizardOpen(true)}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/>
              </svg>
              Create New Course
            </button>

            <button
              className="btn btn-s btn-sm"
              onClick={() => handleOpenActivityBuilder()}
              style={{ background: 'var(--surface)', borderColor: 'rgba(124,58,237,0.2)' }}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="10" height="10" rx="2"/>
                <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3"/>
              </svg>
              <span style={{ fontWeight: 600 }}>Activity Builder</span>
              {activities.length > 0 && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '18px', height: '18px', padding: '0 5px',
                  borderRadius: '9px', background: 'var(--purple)', color: '#fff',
                  fontSize: '10px', fontWeight: 700, marginLeft: '4px'
                }}>
                  {activities.length}
                </div>
              )}
            </button>

            <div style={{
              padding: "6px 12px", borderRadius: 8,
              background: "var(--surface)", border: "1.5px solid var(--border)",
              fontSize: 11, fontWeight: 600, color: "var(--t2)",
              display: "flex", alignItems: "center", gap: 6
            }}>
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

            <button className="btn btn-s btn-sm" onClick={handleResetData} style={{ opacity: 0.6 }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 7a5 5 0 11-10 0 5 5 0 0110 0z"/>
                <path d="M7 3v4l2 2"/>
              </svg>
              Reload
            </button>
          </div>
        </div>

        {/* Swipe Panels */}
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
              />
            </div>
            <div className="swipe-panel" style={{ width: "100%" }}>
              <ActivitiesPanel
                activities={activities}
                onEdit={handleOpenActivityBuilder}
                onDelete={handleDeleteActivity}
                toast={toast}
              />
            </div>
            <div className="swipe-panel" style={{ width: "100%" }}>
              <ClientProgress toast={toast} />
            </div>
          </div>
        </div>
      </div>

      <ActivityBuilderPanel
        open={activityBuilderOpen}
        onClose={() => { setActivityBuilderOpen(false); setEditingActivity(null); }}
        onSave={handleActivitySave}
        editActivity={editingActivity}
        toast={toast}
        allActivities={activities}
      />

      <Toast msg={msg} visible={visible} />
      <LoadingPopup visible={serverLoading} message={serverLoadingMsg} />
    </div>
    </>
  );
}
