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
import type { Course } from "../../Data/types";
import constants from "../../Data/test_data.json";
import api from "../../Services/api.service"; // Import API service
import "../../globals.css";

const PANELS = ["Course Catalog", "Activities", "Client Progress"];
const INITIAL_COURSES = constants.COURSES as Course[];
const INITIAL_ACTIVITIES = constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES = constants.DEFAULT_CATEGORIES;

// ─────────────────────────────────────────────────────────────────────────────
// DATA LOADING & SAVING - Now uses API instead of localStorage
// ─────────────────────────────────────────────────────────────────────────────

async function loadDataFromAPI() {
  try {
    // Load courses from backend
    const coursesResponse = await api.courses.getAll();
    const courses = coursesResponse.success && coursesResponse.data && coursesResponse.data.length > 0
      ? coursesResponse.data
      : INITIAL_COURSES;

    // Load activities from backend
    const activitiesResponse = await api.activities.getAll();
    const activities = activitiesResponse.success && activitiesResponse.data && activitiesResponse.data.length > 0
      ? activitiesResponse.data
      : INITIAL_ACTIVITIES;

    // Load categories from backend
    const categoriesResponse = await api.settings.getCategories();
    const categories = categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0
      ? categoriesResponse.data
      : DEFAULT_CATEGORIES;

    return {
      courses,
      categories,
      activities,
      courseProgress: {}, // This will be loaded per-course as needed
    };
  } catch (error) {
    console.error('Failed to load data from API:', error);
    // Fallback to test data if API fails
    return {
      courses: INITIAL_COURSES,
      categories: DEFAULT_CATEGORIES,
      activities: INITIAL_ACTIVITIES,
      courseProgress: {},
    };
  }
}

export default function LearningCenter() {
  const [panel, setPanel] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const { msg, visible, toast } = useToast();

  // Activity Builder state
  const [activityBuilderOpen, setActivityBuilderOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Course Creation Wizard state
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);

  // Course Viewer state
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerExiting, setViewerExiting] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showCompletionStats, setShowCompletionStats] = useState(false);
  
  // NEW: Store the full course data separately when opened
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

  // ── LOAD DATA FROM BACKEND ON MOUNT ────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await loadDataFromAPI();
      setCourses(data.courses);
      setCategories(data.categories);
      setActivities(data.activities);
      setCourseProgress(data.courseProgress);
      setLoading(false);
      console.log('Loaded from API - Courses:', data.courses.length);
      console.log('Loaded from API - Activities:', data.activities.length);
      console.log('Published activities:', data.activities.filter(a => a.status === "published").length);
    };
    loadData();
  }, []);

  const publishedActivities = activities.filter(a => a.status === "published");

  // ── ACTIVITY HANDLERS - NOW SAVE TO BACKEND ─────────────────────────────────
  const handleActivitySave = async (activity: Activity, saveAs: "draft" | "published") => {
    const updatedActivity = { ...activity, status: saveAs };
    
    try {
      if (editingActivity) {
        // UPDATE existing activity
        const response = await api.activities.update(activity.id, updatedActivity);
        
        if (response.success) {
          setActivities(prev => prev.map(a => a.id === activity.id ? updatedActivity : a));
          toast(`Activity ${saveAs === "published" ? "published" : "saved as draft"} successfully!`);
        } else {
          toast(`Error: ${response.error || 'Failed to update activity'}`);
          return;
        }
      } else {
        // CREATE new activity
        const response = await api.activities.create(updatedActivity);
        
        if (response.success && response.data) {
          // Update the activity with the server-generated ID
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
      console.error('Error saving activity:', error);
      toast('Failed to save activity to server');
    }
  };

  // ── COURSE HANDLERS - NOW SAVE TO BACKEND ───────────────────────────────────
  const handleWizardSave = async (data: Course) => {
    try {
      const response = await api.courses.create(data);
      
      if (response.success && response.data) {
        // Add the new course with the server-generated ID
        const newCourse = { ...data, id: response.data.id };
        setCourses(prev => [...prev, newCourse]);
        toast('Course created successfully!');
      } else {
        toast(`Error: ${response.error || 'Failed to create course'}`);
      }
    } catch (error) {
      console.error('Error creating course:', error);
      toast('Failed to create course on server');
    }
  };

  // ── PROGRESS HANDLER - NOW SAVE TO BACKEND ──────────────────────────────────
  const handleProgress = async (idx: number, progress: number, timeSpent?: number, assessmentScore?: number) => {
    const isCompleted = progress >= 100;
    const currentProgress = courseProgress[idx] || { quizScores: [], assessmentScores: [], timeSpent: 0 };
    const course = fullCourse || courses[idx]; // Use fullCourse if available
    
    // If assessment score provided, add it
    let updatedAssessmentScores = currentProgress.assessmentScores || [];
    if (assessmentScore !== undefined) {
      const modules = course.modules || [];
      let passingScore = 70; // default
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
    
    // Update local state
    setCourses(prev =>
      prev.map((c, i) => i === idx ? { ...c, progress, enrolled: true } : c)
    );
    
    const newProgressData = {
      progress,
      timeSpent: (currentProgress?.timeSpent || 0) + (timeSpent || 0),
      lastAccessed: new Date().toISOString(),
      enrolled: true,
      completed: isCompleted,
      completedDate: isCompleted ? new Date().toISOString() : currentProgress?.completedDate,
      quizScores: currentProgress?.quizScores || [],
      assessmentScores: updatedAssessmentScores,
    };
    
    setCourseProgress(prev => ({
      ...prev,
      [idx]: newProgressData,
    }));

    // Show completion stats when course is completed
    if (isCompleted && !currentProgress.completed) {
      // Delay slightly to allow state to update
      setTimeout(() => {
        setShowCompletionStats(true);
      }, 500);
    }

    // Save progress to backend
    try {
      const courseId = course.id;
      if (courseId) {
        const response = await api.courses.updateProgress(courseId, progress, true, timeSpent);
        if (!response.success) {
          console.error('Failed to update progress on server:', response.error);
        }
      }
    } catch (error) {
      console.error('Error updating progress on server:', error);
    }
  };

  const handleResetData = async () => {
    const data = await loadDataFromAPI();
    setCourses(data.courses);
    setCategories(data.categories);
    setActivities(data.activities);
    setCourseProgress({});
    toast('Data reloaded from server');
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const response = await api.activities.delete(id);
      
      if (response.success) {
        setActivities(prev => prev.filter(a => a.id !== id));
        toast('Activity deleted successfully');
      } else {
        toast(`Error: ${response.error || 'Failed to delete activity'}`);
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast('Failed to delete activity from server');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CRITICAL FIX: Load full course data before opening viewer
  // ─────────────────────────────────────────────────────────────────────────────
  const openViewer = async (idx: number) => {
    const course = courses[idx];
    
    // If course doesn't have an ID, can't load from backend
    if (!course.id) {
      console.warn('Course has no ID, using cached data');
      
      // Check if course has modules
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

    // Load the FULL course with all modules and chapters from backend
    setLoadingCourse(true);
    try {
      console.log('🔵 Loading full course data for course ID:', course.id);
      const response = await api.courses.getFullCourse(course.id);
      
      if (response.success && response.data) {
        console.log('✅ Loaded full course:', response.data);
        console.log('📦 Modules:', response.data.modules?.length || 0);
        response.data.modules?.forEach((mod: any, i: number) => {
          console.log(`   Module ${i + 1}: ${mod.title} (${mod.chapters?.length || 0} chapters)`);
        });
        
        // Check if course has no modules
        if (!response.data.modules || response.data.modules.length === 0) {
          toast('⚠️ This course has no modules yet. Please add content first.');
          setLoadingCourse(false);
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
    }
  };

  const startCourse = () => {
    setShowOverview(false);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerExiting(true);
    setTimeout(() => {
      setViewerOpen(false);
      setViewerExiting(false);
      setViewerIdx(null);
      setShowOverview(false);
      setFullCourse(null); // Clear full course data
    }, 280);
  };

  const handleCloseCompletionStats = () => {
    setShowCompletionStats(false);
    closeViewer();
  };

  const handleOpenActivityBuilder = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setActivityBuilderOpen(true);
  };

  const handleCompleteCourse = (idx: number) => {
    handleProgress(idx, 100);
    const currentProgress = courseProgress[idx];
    if (currentProgress) {
      setShowCompletionStats(true);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--purple)',
        fontWeight: 600,
      }}>
        Loading...
      </div>
    );
  }

  // ── Course Overview (Modal) ──────────────────────────────────────────────────
  if (showOverview && viewerIdx !== null && fullCourse) {
    return (
      <>
        {loadingCourse && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}>
            <div style={{
              background: 'var(--surface)',
              padding: '24px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              color: 'var(--t1)',
              fontWeight: 600,
            }}>
              Loading course...
            </div>
          </div>
        )}
        <CourseOverview
          course={fullCourse} // Use fullCourse instead of courses[viewerIdx]
          onStart={startCourse}
          onClose={() => {
            setShowOverview(false);
            setViewerIdx(null);
            setFullCourse(null);
          }}
          toast={toast}
        />
        <Toast msg={msg} visible={visible} />
      </>
    );
  }

  // ── Course Viewer (Full-screen) ──────────────────────────────────────────────
  if (viewerOpen && viewerIdx !== null && fullCourse) {
    return (
      <>
        <CourseViewer
          course={fullCourse} // Use fullCourse instead of courses[viewerIdx]
          onClose={closeViewer}
          onProgress={(progress, timeSpent, assessmentScore) => handleProgress(viewerIdx, progress, timeSpent, assessmentScore)}
          toast={toast}
        />
        <Toast msg={msg} visible={visible} />
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
              timeSpent: Number(courseProgress[viewerIdx]?.timeSpent) || 0,
              completionDate: courseProgress[viewerIdx]?.completedDate || new Date().toISOString()
            }}
          />
        )}
      </>
    );
  }

  // ── Full-page Course Creation Wizard ────────────────────────────────────
  if (wizardOpen) {
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
      </>
    );
  }

  // ── Main Learning Center ─────────────────────────────────────────────
  return (
    <>
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
            {/* Create New Course Button */}
            <button
              className="btn btn-p btn-sm"
              onClick={() => setWizardOpen(true)}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/>
              </svg>
              Create New Course
            </button>

            {/* Activity Builder Button - Subtle style */}
            <button
              className="btn btn-s btn-sm"
              onClick={() => handleOpenActivityBuilder()}
              style={{
                background: 'var(--surface)',
                borderColor: 'rgba(124,58,237,0.2)',
              }}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="10" height="10" rx="2"/>
                <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3"/>
              </svg>
              <span style={{ fontWeight: 600 }}>Activity Builder</span>
              {activities.length > 0 && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  borderRadius: '9px',
                  background: 'var(--purple)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  marginLeft: '4px'
                }}>
                  {activities.length}
                </div>
              )}
            </button>

            {/* Stats Display */}
            <div style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--t2)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--purple)'
                }} />
                <span style={{ color: "var(--purple)" }}>{activities.length}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>Total</span>
              </div>
              <span style={{ width: 1, height: 12, background: "var(--border)" }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--teal)'
                }} />
                <span style={{ color: "var(--teal)" }}>{publishedActivities.length}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>Published</span>
              </div>
            </div>

            {/* Reload from Server Button */}
            <button
              className="btn btn-s btn-sm"
              onClick={handleResetData}
              style={{ opacity: 0.6 }}
            >
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

            {/* Panel 0 — Course Catalog */}
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

            {/* Panel 1 — Activities */}
            <div className="swipe-panel" style={{ width: "100%" }}>
              <ActivitiesPanel
                activities={activities}
                onEdit={handleOpenActivityBuilder}
                onDelete={handleDeleteActivity}
                toast={toast}
              />
            </div>

            {/* Panel 2 — Client Progress */}
            <div className="swipe-panel" style={{ width: "100%" }}>
              <ClientProgress toast={toast} />
            </div>

          </div>
        </div>
      </div>

      {/* Activity Builder Panel */}
      <ActivityBuilderPanel
        open={activityBuilderOpen}
        onClose={() => {
          setActivityBuilderOpen(false);
          setEditingActivity(null);
        }}
        onSave={handleActivitySave}
        editActivity={editingActivity}
        toast={toast}
        allActivities={activities}
      />

      <Toast msg={msg} visible={visible} />
    </>
  );
}
