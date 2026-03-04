'use client'

import { useState, useEffect } from "react";
import { useToast } from "../../Hooks/useToast";
import Toast from "../../Components/Toast";
import ActivityBuilderPanel, { type Activity } from "./ActivityBuilderPanel";
import ActivityManager from "./ActivityManager";
import CourseCatalog from "./CourseCatalog";
import ClientProgress from "./ClientProgress";
import CourseViewer from "./CourseViewer";
import CourseCreationWizard from "../../Components/CourseCreationWizard";
import type { Course } from "../../Data/types";
import constants from "../../Data/test_data.json";
import "../../globals.css";

const PANELS = ["Course Catalog", "Client Progress"];
const INITIAL_COURSES = constants.COURSES as Course[];
const INITIAL_ACTIVITIES = constants.ACTIVITIES as Activity[];
const DEFAULT_CATEGORIES = constants.DEFAULT_CATEGORIES;

function loadData() {
  if (typeof window === 'undefined') {
    return { 
      courses: INITIAL_COURSES, 
      categories: DEFAULT_CATEGORIES, 
      activities: INITIAL_ACTIVITIES 
    };
  }
  
  try {
    const stored = localStorage.getItem('learningCenterData');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        courses: parsed.courses && parsed.courses.length > 0 ? parsed.courses : INITIAL_COURSES,
        categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
        activities: parsed.activities || INITIAL_ACTIVITIES
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  
  return {
    courses: INITIAL_COURSES,
    categories: DEFAULT_CATEGORIES,
    activities: INITIAL_ACTIVITIES
  };
}

function saveData(courses: Course[], categories: string[], activities: Activity[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('learningCenterData', JSON.stringify({
      courses,
      categories,
      activities,
      lastUpdated: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export default function LearningCenter() {
  const [panel, setPanel] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

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

  useEffect(() => {
    const data = loadData();
    setCourses(data.courses);
    setCategories(data.categories);
    setActivities(data.activities);
  }, []);

  useEffect(() => {
    if (courses.length > 0 || activities.length > 0) {
      saveData(courses, categories, activities);
    }
  }, [courses, categories, activities]);

  const publishedActivities = activities.filter(a => a.status === "published");

  const handleActivitySave = (activity: Activity, saveAs: "draft" | "published") => {
    const updatedActivity = { ...activity, status: saveAs };
    
    if (editingActivity) {
      setActivities(prev => prev.map(a => a.id === activity.id ? updatedActivity : a));
      toast(`Activity ${saveAs === "published" ? "published" : "saved as draft"} successfully!`);
    } else {
      setActivities(prev => [...prev, updatedActivity]);
      toast(`Activity ${saveAs === "published" ? "published" : "created as draft"}!`);
    }
    
    setActivityBuilderOpen(false);
    setEditingActivity(null);
  };

  const handleWizardSave = (data: Course) => {
    setCourses(prev => [...prev, data]);
  };

  const handleProgress = (idx: number, progress: number) => {
    setCourses(prev =>
      prev.map((c, i) => i === idx ? { ...c, progress, enrolled: true } : c)
    );
  };

  const handleOpenActivityBuilder = (activity?: Activity) => {
    setEditingActivity(activity || null);
    setActivityBuilderOpen(true);
  };

  const openViewer = (idx: number) => {
    setViewerIdx(idx);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerExiting(true);
    setTimeout(() => {
      setViewerExiting(false);
      setViewerOpen(false);
      setViewerIdx(null);
    }, 320);
  };

  // ── Full-page Course Viewer ──────────────────────────────────────────
  if (viewerOpen || viewerExiting) {
    return (
      <>
        <style>{`
          @keyframes cv-pageIn  { from{opacity:0;transform:translateY(18px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
          @keyframes cv-pageOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(18px) scale(0.98)} }
          .cv-page-enter { animation: cv-pageIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
          .cv-page-exit  { animation: cv-pageOut 0.32s ease forwards; }
        `}</style>
        <div
          className={viewerExiting ? "cv-page-exit" : "cv-page-enter"}
          style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column" }}
        >
          {viewerIdx !== null && (
            <CourseViewer
              course={courses[viewerIdx]}
              onClose={closeViewer}
              onProgress={p => handleProgress(viewerIdx, p)}
            />
          )}
        </div>
        <Toast msg={msg} visible={visible} />
      </>
    );
  }

  // ── Full-page Course Creation Wizard ────────────────────────────────
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

            {/* Activity Builder Button */}
            <button
              className="btn btn-sm"
              onClick={() => handleOpenActivityBuilder()}
              style={{ 
                background: "linear-gradient(135deg, #7c3aed, #0d9488)",
                color: "#fff",
                border: "none",
              }}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="10" height="10" rx="1.5"/>
                <path d="M4.5 5.5h5M4.5 7.5h5M4.5 9.5h3"/>
              </svg>
              Activity Builder
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
              <span style={{ color: "var(--purple)" }}>{activities.length}</span>
              Activities
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)" }} />
              <span style={{ color: "var(--teal)" }}>{publishedActivities.length}</span>
              Published
            </div>

            {/* Reset Button */}
            <button
              className="btn btn-s btn-sm"
              onClick={() => {
                if (confirm('Reset all data and reload from test_data.json?')) {
                  localStorage.removeItem('learningCenterData');
                  window.location.reload();
                }
              }}
              style={{ opacity: 0.6 }}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 7a5 5 0 11-10 0 5 5 0 0110 0z"/>
                <path d="M7 3v4l2 2"/>
              </svg>
              Reset
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
              />
            </div>

            {/* Panel 1 — Client Progress */}
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
      />

      <Toast msg={msg} visible={visible} />
    </>
  );
}
