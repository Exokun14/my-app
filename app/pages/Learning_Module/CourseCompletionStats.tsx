'use client'

// CourseCompletionStats has been replaced by the built-in CourseCompletionPopup
// inside CourseViewer.tsx, which provides a richer animated completion experience.
// This file is kept as a pass-through stub for backward compatibility.

interface CourseCompletionStatsProps {
  open: boolean;
  onClose: () => void;
  courseName: string;
  stats: {
    totalChapters: number;
    completedChapters: number;
    totalQuizzes: number;
    quizScores: number[];
    totalAssessments: number;
    assessmentScores: Array<{ score: number; passed: boolean }>;
    timeSpent: number;
    completionDate: string;
  };
}

export default function CourseCompletionStats({ open, onClose }: CourseCompletionStatsProps) {
  // No-op: completion UI is now handled by CourseCompletionPopup in CourseViewer.tsx
  return null;
}
