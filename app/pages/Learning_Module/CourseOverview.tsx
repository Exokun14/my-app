'use client'

import { useState, useEffect } from "react";
import type { Course } from "../../Data/types";

interface CourseOverviewProps {
  course: Course;
  onStart: () => void;
  onClose: () => void;
  progress: number;
  timeSpent: number; // in minutes
  lastAccessed?: string;
  enrolled?: boolean;
  completed?: boolean;
  completedDate?: string;
}

const STYLES = `
@keyframes coFadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes coSlideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
@keyframes coPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
@keyframes coShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

.co-page {
  position:fixed; inset:0; z-index:1000;
  background:var(--bg,#f8f7ff);
  display:flex; flex-direction:column;
  animation:coFadeIn 0.4s ease both;
}

/* Header */
.co-header {
  height:64px; flex-shrink:0;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; align-items:center; padding:0 24px; gap:16px;
  box-shadow:0 1px 6px rgba(124,58,237,0.04);
}
.co-back {
  width:36px; height:36px; border-radius:10px;
  background:transparent;
  border:1.5px solid var(--border,rgba(124,58,237,0.15));
  color:var(--t2,#4a3870);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all 0.15s; font-size:16px;
}
.co-back:hover {
  background:rgba(124,58,237,0.06);
  border-color:rgba(124,58,237,0.25);
  transform:translateX(-2px);
}
.co-header-title {
  font-size:14px; font-weight:700;
  color:var(--t2,#4a3870);
}

/* Hero Section */
.co-hero {
  background:linear-gradient(135deg,#7c3aed,#0d9488);
  padding:32px;
  border-bottom:1px solid rgba(255,255,255,0.1);
  animation:coFadeIn 0.5s ease both;
}
.co-hero-content {
  max-width:1200px; margin:0 auto;
  display:flex; align-items:center; gap:24px;
}
.co-hero-icon {
  width:100px; height:100px; border-radius:20px;
  background:rgba(255,255,255,0.15);
  backdrop-filter:blur(20px);
  display:flex; align-items:center; justify-content:center;
  font-size:48px; flex-shrink:0;
  box-shadow:0 8px 32px rgba(0,0,0,0.2);
  border:2px solid rgba(255,255,255,0.2);
}
.co-hero-details {
  flex:1; color:#fff;
}
.co-hero-category {
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:8px;
  background:rgba(255,255,255,0.2);
  font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:0.05em;
  margin-bottom:12px;
}
.co-hero-title {
  font-size:28px; font-weight:900;
  letter-spacing:-0.03em; margin-bottom:8px;
  line-height:1.2;
}
.co-hero-desc {
  font-size:14px; line-height:1.5;
  opacity:0.95; margin-bottom:16px;
}
.co-hero-meta {
  display:flex; align-items:center; gap:20px;
  font-size:13px; opacity:0.9;
}
.co-hero-meta-item {
  display:flex; align-items:center; gap:6px;
}

/* Body */
.co-body {
  flex:1; display:flex; overflow:hidden; padding:24px;
}
.co-container {
  max-width:1200px; margin:0 auto; width:100%;
  display:grid; grid-template-columns:1fr 360px;
  gap:24px; align-items:start;
}

/* Main Content */
.co-main {
  display:flex; flex-direction:column; gap:24px;
}

/* Progress Card */
.co-progress-card {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:16px; padding:20px;
  animation:coSlideIn 0.4s ease both;
  animation-delay:0.1s;
}
.co-progress-header {
  display:flex; align-items:center; gap:12px;
  margin-bottom:16px;
}
.co-progress-icon {
  width:44px; height:44px; border-radius:12px;
  background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(13,148,136,0.1));
  display:flex; align-items:center; justify-content:center;
  font-size:20px;
}
.co-progress-title {
  font-size:18px; font-weight:800;
  color:var(--t1,#18103a);
}
.co-progress-bar-wrapper {
  margin-bottom:16px;
}
.co-progress-bar {
  height:8px; border-radius:8px;
  background:var(--border,rgba(124,58,237,0.1));
  overflow:hidden; margin-bottom:8px;
}
.co-progress-bar-fill {
  height:100%; border-radius:8px;
  background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  transition:width 0.6s cubic-bezier(0.16,1,0.3,1);
  position:relative;
}
.co-progress-bar-fill::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
  animation:coShimmer 2s infinite;
  background-size:200% 100%;
}
.co-progress-stats {
  display:flex; justify-content:space-between;
  font-size:12px;
}
.co-progress-stat-label {
  color:var(--t3,#a89dc8);
}
.co-progress-stat-value {
  font-weight:700;
  color:var(--t1,#18103a);
}
.co-progress-details {
  display:grid; grid-template-columns:1fr 1fr;
  gap:12px; margin-top:16px;
  padding-top:16px;
  border-top:1px solid var(--border,rgba(124,58,237,0.08));
}
.co-progress-detail {
  display:flex; align-items:center; gap:10px;
}
.co-progress-detail-icon {
  width:36px; height:36px; border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; flex-shrink:0;
}
.co-progress-detail-content {
  flex:1;
}
.co-progress-detail-label {
  font-size:10.5px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase; letter-spacing:0.05em;
}
.co-progress-detail-value {
  font-size:15px; font-weight:800;
  color:var(--t1,#18103a);
}

/* Course Content Card */
.co-content-card {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:16px; padding:20px;
  animation:coSlideIn 0.4s ease both;
  animation-delay:0.2s;
  display:flex; flex-direction:column;
  max-height:calc(100vh - 400px);
}
.co-content-header {
  display:flex; align-items:center; gap:12px;
  margin-bottom:16px; flex-shrink:0;
}
.co-content-scroll {
  flex:1; overflow-y:auto; overflow-x:hidden;
  margin:0 -20px; padding:0 20px;
}
.co-content-icon {
  width:44px; height:44px; border-radius:12px;
  background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(13,148,136,0.1));
  display:flex; align-items:center; justify-content:center;
  font-size:20px;
}
.co-content-title {
  font-size:18px; font-weight:800;
  color:var(--t1,#18103a);
}
.co-module {
  margin-bottom:12px;
}
.co-module-header {
  display:flex; align-items:center; gap:8px;
  padding:10px 12px; border-radius:10px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  margin-bottom:6px;
}
.co-module-num {
  width:26px; height:26px; border-radius:7px;
  background:var(--purple,#7c3aed); color:#fff;
  font-size:11px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.co-module-title {
  flex:1; font-size:13px; font-weight:700;
  color:var(--t1,#18103a);
}
.co-module-count {
  font-size:10.5px; font-weight:600;
  color:var(--t3,#a89dc8);
}
.co-chapter {
  display:flex; align-items:center; gap:8px;
  padding:8px 12px 8px 42px;
  border-radius:8px;
  background:transparent;
  transition:all 0.15s;
  margin-bottom:3px;
}
.co-chapter:hover {
  background:rgba(124,58,237,0.04);
}
.co-chapter-icon {
  width:20px; height:20px; border-radius:6px;
  font-size:10px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.co-chapter-title {
  flex:1; font-size:12px; font-weight:500;
  color:var(--t2,#4a3870);
}
.co-chapter-check {
  width:18px; height:18px; border-radius:50%;
  border:2px solid var(--border,rgba(124,58,237,0.2));
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; font-size:10px;
  transition:all 0.2s;
}
.co-chapter.done .co-chapter-check {
  background:var(--teal,#0d9488);
  border-color:var(--teal,#0d9488);
  color:#fff;
}

/* Sidebar */
.co-sidebar {
  display:flex; flex-direction:column; gap:20px;
}

/* CTA Card */
.co-cta-card {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  border-radius:16px; padding:24px;
  color:#fff;
  animation:coSlideIn 0.4s ease both;
  animation-delay:0.3s;
  box-shadow:0 8px 24px rgba(124,58,237,0.25);
}
.co-cta-title {
  font-size:18px; font-weight:800;
  margin-bottom:6px; line-height:1.3;
}
.co-cta-desc {
  font-size:12px; opacity:0.95;
  line-height:1.5; margin-bottom:18px;
}
.co-cta-button {
  width:100%; padding:12px 18px;
  border-radius:10px; border:none;
  background:rgba(255,255,255,0.95);
  color:var(--purple,#7c3aed);
  font-size:13px; font-weight:700;
  cursor:pointer; transition:all 0.2s;
  display:flex; align-items:center; justify-content:center; gap:8px;
  box-shadow:0 4px 14px rgba(0,0,0,0.1);
}
.co-cta-button:hover {
  background:#fff;
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(0,0,0,0.15);
}
.co-cta-button:active {
  transform:translateY(0);
}

/* Info Card */
.co-info-card {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:16px; padding:18px;
  animation:coSlideIn 0.4s ease both;
  animation-delay:0.4s;
}
.co-info-title {
  font-size:13px; font-weight:700;
  color:var(--t1,#18103a); margin-bottom:12px;
}
.co-info-item {
  display:flex; align-items:flex-start; gap:10px;
  padding:8px 0;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.06));
}
.co-info-item:last-child {
  border-bottom:none;
}
.co-info-icon {
  width:30px; height:30px; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  font-size:15px; flex-shrink:0;
  background:var(--bg,#faf9ff);
}
.co-info-content {
  flex:1;
}
.co-info-label {
  font-size:10px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase; letter-spacing:0.05em;
  margin-bottom:2px;
}
.co-info-value {
  font-size:12px; font-weight:600;
  color:var(--t1,#18103a);
}

/* Companies Badge */
.co-companies {
  display:flex; flex-wrap:wrap; gap:6px;
  margin-top:6px;
}
.co-company-badge {
  padding:4px 10px; border-radius:6px;
  background:rgba(124,58,237,0.08);
  font-size:11px; font-weight:600;
  color:var(--purple,#7c3aed);
}
`;

export default function CourseOverview({
  course,
  onStart,
  onClose,
  progress,
  timeSpent,
  lastAccessed,
  enrolled = false,
  completed = false,
  completedDate
}: CourseOverviewProps) {
  const modules = course.modules || [];
  const totalChapters = modules.reduce((sum, m) => sum + m.chapters.length, 0);
  const completedChapters = modules.reduce(
    (sum, m) => sum + m.chapters.filter(c => c.done).length,
    0
  );

  const TM = {
    lesson: { bg: "#e0f2fe", color: "#0284c7", icon: "📖", label: "Lesson" },
    quiz: { bg: "#ede9fe", color: "#7c3aed", icon: "❓", label: "Quiz" },
    assessment: { bg: "#fef3c7", color: "#d97706", icon: "📝", label: "Assessment" }
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatLastAccessed = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isStarted = progress > 0 || enrolled;
  const isCompleted = completed || progress === 100;
  
  const formatCompletedDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="co-page">
        
        {/* Header */}
        <div className="co-header">
          <button className="co-back" onClick={onClose}>
            ←
          </button>
          <div className="co-header-title">Course Overview</div>
        </div>

        {/* Hero Section */}
        <div className="co-hero">
          <div className="co-hero-content">
            <div className="co-hero-icon">
              {course.thumbEmoji || "📚"}
            </div>
            <div className="co-hero-details">
              <div className="co-hero-category">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="1" y="1" width="10" height="10" rx="2"/>
                </svg>
                {course.cat || "General"}
              </div>
              <h1 className="co-hero-title">{course.title}</h1>
              <p className="co-hero-desc">{course.desc}</p>
              <div className="co-hero-meta">
                <div className="co-hero-meta-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="7" r="5.5"/>
                    <path d="M7 3.5v3.5l2 2"/>
                  </svg>
                  {course.time}
                </div>
                <div className="co-hero-meta-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="10" height="9" rx="1"/>
                    <path d="M2 6h10"/>
                  </svg>
                  {modules.length} Module{modules.length !== 1 ? 's' : ''}
                </div>
                <div className="co-hero-meta-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 2v10M2 7h10"/>
                  </svg>
                  {totalChapters} Chapter{totalChapters !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="co-body">
          <div className="co-container">
            
            {/* Main Content */}
            <div className="co-main">
              
              {/* Progress Card */}
              <div className="co-progress-card">
                <div className="co-progress-header">
                  <div className="co-progress-icon">📊</div>
                  <div className="co-progress-title">Your Progress</div>
                </div>
                
                <div className="co-progress-bar-wrapper">
                  <div className="co-progress-bar">
                    <div className="co-progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="co-progress-stats">
                    <span className="co-progress-stat-label">Completed</span>
                    <span className="co-progress-stat-value">{progress}%</span>
                  </div>
                </div>

                <div className="co-progress-details">
                  <div className="co-progress-detail">
                    <div className="co-progress-detail-icon" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                      ✓
                    </div>
                    <div className="co-progress-detail-content">
                      <div className="co-progress-detail-label">Chapters Done</div>
                      <div className="co-progress-detail-value">{completedChapters} / {totalChapters}</div>
                    </div>
                  </div>
                  
                  <div className="co-progress-detail">
                    <div className="co-progress-detail-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                      ⏱️
                    </div>
                    <div className="co-progress-detail-content">
                      <div className="co-progress-detail-label">Time Spent</div>
                      <div className="co-progress-detail-value">{formatTimeSpent(timeSpent)}</div>
                    </div>
                  </div>
                </div>

                {lastAccessed && (
                  <div style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border,rgba(124,58,237,0.08))",
                    fontSize: 12,
                    color: "var(--t3,#a89dc8)"
                  }}>
                    Last accessed: {formatLastAccessed(lastAccessed)}
                  </div>
                )}

                {completed && completedDate && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(13,148,136,0.08)",
                    border: "1.5px solid rgba(13,148,136,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "var(--teal,#0d9488)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--teal,#0d9488)",
                        marginBottom: 2
                      }}>
                        Course Completed!
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: "var(--t2,#4a3870)"
                      }}>
                        Completed on {formatCompletedDate(completedDate)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Content */}
              <div className="co-content-card">
                <div className="co-content-header">
                  <div className="co-content-icon">📚</div>
                  <div className="co-content-title">Course Content</div>
                </div>

                <div className="co-content-scroll">
                  {modules.map((mod, modIdx) => (
                    <div key={modIdx} className="co-module">
                      <div className="co-module-header">
                        <div className="co-module-num">{modIdx + 1}</div>
                        <div className="co-module-title">{mod.title}</div>
                        <div className="co-module-count">
                          {mod.chapters.length} chapter{mod.chapters.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      {mod.chapters.map((ch, chIdx) => {
                        const meta = TM[ch.type];
                        return (
                          <div key={chIdx} className={`co-chapter${ch.done ? ' done' : ''}`}>
                            <div className="co-chapter-icon" style={{ background: meta.bg, color: meta.color }}>
                              {meta.icon}
                            </div>
                            <div className="co-chapter-title">{ch.title}</div>
                            <div className="co-chapter-check">
                              {ch.done && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="co-sidebar">
              
              {/* CTA Card */}
              <div className="co-cta-card">
                <div className="co-cta-title">
                  {isCompleted ? '🎉 Course Completed!' : isStarted ? 'Continue Learning' : 'Start Your Journey'}
                </div>
                <div className="co-cta-desc">
                  {isCompleted 
                    ? 'Congratulations! You have completed this course. Review anytime.'
                    : isStarted 
                    ? `Pick up where you left off. ${totalChapters - completedChapters} chapter${totalChapters - completedChapters !== 1 ? 's' : ''} remaining.`
                    : 'Begin this course and start building your skills today.'}
                </div>
                <button className="co-cta-button" onClick={onStart}>
                  {isCompleted ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 10.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9z"/>
                        <path d="M6 8l2 2 4-4"/>
                      </svg>
                      Review Course
                    </>
                  ) : enrolled && isStarted ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3l8 5-8 5V3z"/>
                      </svg>
                      Continue Learning
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3l8 5-8 5V3z"/>
                      </svg>
                      {enrolled ? 'Start Learning' : 'Enroll & Start'}
                    </>
                  )}
                </button>
              </div>

              {/* Info Card */}
              <div className="co-info-card">
                <div className="co-info-title">Course Details</div>
                
                <div className="co-info-item">
                  <div className="co-info-icon">⏱️</div>
                  <div className="co-info-content">
                    <div className="co-info-label">Duration</div>
                    <div className="co-info-value">{course.time}</div>
                  </div>
                </div>

                <div className="co-info-item">
                  <div className="co-info-icon">📊</div>
                  <div className="co-info-content">
                    <div className="co-info-label">Difficulty</div>
                    <div className="co-info-value">
                      {progress === 0 ? 'Beginner' : progress < 50 ? 'Intermediate' : 'Advanced'}
                    </div>
                  </div>
                </div>

                <div className="co-info-item">
                  <div className="co-info-icon">🏷️</div>
                  <div className="co-info-content">
                    <div className="co-info-label">Category</div>
                    <div className="co-info-value">{course.cat || 'General'}</div>
                  </div>
                </div>

                {course.companies && course.companies.length > 0 && (
                  <div className="co-info-item">
                    <div className="co-info-icon">🏢</div>
                    <div className="co-info-content">
                      <div className="co-info-label">Companies</div>
                      <div className="co-companies">
                        {course.companies.map((company, idx) => (
                          <div key={idx} className="co-company-badge">
                            {company}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
