'use client'

import { useState } from "react";
import { useToast } from "../../Hooks/useToast";
import Toast from "../../Components/Toast";
import CreateCourseModal from "../../Components/CreateCourseModal";
import CourseCreationWizard from "../../Components/CourseCreationWizard";
import CourseCatalog from "./CourseCatalog";
import ClientProgress from "./ClientProgress";
import CourseViewer from "./CourseViewer";
import constants from "../../Data/test_data.json";
import type { Course } from "../../Data/types";
import "../../globals.css";

const { COURSES: INITIAL_COURSES, DEFAULT_CATEGORIES } = constants;

const PANELS = ["Course Catalog", "Client Progress"];

export default function LearningCenter() {
  const [panel, setPanel] = useState<number>(0);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES as Course[]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // ── Modal state (edit only) ──────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // ── Wizard state (new course creation) ──────────────────────────────
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);

  const { msg, visible, toast } = useToast();

  // ── Course viewer state ──────────────────────────────────────────────
  const [viewerIdx,     setViewerIdx]     = useState<number | null>(null);
  const [viewerOpen,    setViewerOpen]    = useState(false);
  const [viewerExiting, setViewerExiting] = useState(false);

  const handleCreateCourse = (data: Course) => {
    setCourses(prev => [...prev, data]);
    setCreateModalOpen(false);
  };

  /** Called by the wizard when the user finalises (publish / draft / template) */
  const handleWizardSave = (data: Course) => {
    setCourses(prev => [...prev, data]);
    // Wizard handles its own close animation; it calls onCancel after 1.4 s
  };

  const handleProgress = (idx: number, progress: number) => {
    setCourses(prev =>
      prev.map((c, i) => i === idx ? { ...c, progress, enrolled: true } : c)
    );
  };

  // Open viewer with page-swap animation
  const openViewer = (idx: number) => {
    setViewerIdx(idx);
    setViewerOpen(true);
  };

  // Close viewer with exit animation
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
            {/* ← now opens the wizard instead of the modal */}
            <button
              className="btn btn-p btn-sm"
              onClick={() => setWizardOpen(true)}
            >
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/>
              </svg>
              Create New Course
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

      {/*
        CreateCourseModal is kept exclusively for editing existing courses.
        The wizard above handles all new-course creation.
      */}
      <CreateCourseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateCourse}
        editCourse={null}
        categories={categories}
        setCategories={setCategories}
        toast={toast}
      />

      <Toast msg={msg} visible={visible} />
    </>
  );
}
