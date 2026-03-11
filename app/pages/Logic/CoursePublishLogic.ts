// ============================================================
//  CoursePublishLogic.ts
//  All logic related to course publish eligibility:
//   - computeReadiness (checks + score)
//   - canPublish guard
//   - getPublishBlockReasons
//   - autoUnpublishIfInvalid
//   - usePublishGuard hook
// ============================================================

import { useEffect } from "react";
import type { Course } from "../../Data/types";
import api from "../../Services/api.service";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadinessCheck {
  label:  string;
  ok:     boolean;
  warn?:  boolean;   // true = advisory only, does not block publish
  detail: string;
}

export interface ReadinessResult {
  score:      number;   // 0–100
  canPublish: boolean;  // all hard (non-warn) checks pass
  checks:     ReadinessCheck[];
  blocking:   ReadinessCheck[];  // hard failures only
  warnings:   ReadinessCheck[];  // warn-only failures
}

// ─────────────────────────────────────────────────────────────────────────────
// computeReadiness
// Single source of truth for what makes a course publishable.
// Hard checks (no warn flag) MUST all pass before a course can be promoted.
// Warn checks are advisory — shown in the promote modal but never block.
// ─────────────────────────────────────────────────────────────────────────────

export function computeReadiness(c: Course): ReadinessResult {
  const modCount     = c.modules?.length ?? 0;
  const chCount      = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
  const hasTitle     = !!c.title?.trim();
  const hasDesc      = !!c.desc?.trim();
  const hasCat       = !!c.cat?.trim();
  const hasDur       = !!c.time?.trim();
  const hasMods      = modCount > 0;
  const hasChaps     = chCount > 0;
  const hasCompanies = (c.companies?.length ?? 0) > 0;

  const checks: ReadinessCheck[] = [
    // ── Hard requirements — block publish ──────────────────────────────────
    { label: "Title",    ok: hasTitle, detail: hasTitle ? c.title       : "Missing title" },
    { label: "Category", ok: hasCat,   detail: hasCat   ? c.cat         : "No category set" },
    { label: "Modules",  ok: hasMods,  detail: hasMods  ? `${modCount} module${modCount !== 1 ? "s" : ""}` : "No modules added" },
    { label: "Chapters", ok: hasChaps, detail: hasChaps ? `${chCount} chapter${chCount !== 1 ? "s" : ""}` : "No chapters in modules" },

    // ── Soft requirements — advisory warnings only ────────────────────────
    { label: "Description",        ok: hasDesc,      warn: true, detail: hasDesc      ? "Provided"                              : "No description provided" },
    { label: "Duration",           ok: hasDur,       warn: true, detail: hasDur       ? c.time!                                  : "Duration not set" },
    { label: "Companies assigned", ok: hasCompanies, warn: true, detail: hasCompanies ? `${c.companies!.length} assigned`        : "No companies assigned yet" },
  ];

  const hardChecks = checks.filter(ch => !ch.warn);
  const canPublish = hardChecks.every(ch => ch.ok);
  const score      = Math.round((checks.filter(ch => ch.ok).length / checks.length) * 100);

  return {
    score,
    canPublish,
    checks,
    blocking: checks.filter(ch => !ch.ok && !ch.warn),
    warnings: checks.filter(ch => !ch.ok && ch.warn),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPublishBlockReasons
// ─────────────────────────────────────────────────────────────────────────────

export function getPublishBlockReasons(c: Course): string[] {
  const { blocking } = computeReadiness(c);
  return blocking.map(ch => ch.label);
}

// ─────────────────────────────────────────────────────────────────────────────
// shouldAutoUnpublish
// ─────────────────────────────────────────────────────────────────────────────

export function shouldAutoUnpublish(c: Course): boolean {
  const { canPublish } = computeReadiness(c);
  return !canPublish;
}

// ─────────────────────────────────────────────────────────────────────────────
// usePublishGuard hook
//
// FIX: accepts modulesHydrated flag. The guard must NOT run until modules have
// been fetched from the server. Without this, on every page load getAll()
// returns modules:[] for all courses, computeReadiness sees no modules →
// canPublish = false → the guard calls api.courses.update(..., "unpublished")
// and WRITES that back to the DB, permanently wiping published state.
//
// The guard now only activates after AdminLearningDashboard has finished the
// parallel getById() hydration pass and set modulesHydrated = true.
// ─────────────────────────────────────────────────────────────────────────────

export function usePublishGuard(
  courses: Course[],
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>,
  toast: (msg: string) => void,
  modulesHydrated: boolean,   // NEW: must be true before guard runs
) {
  const publishedFingerprint = courses
    .filter(c => getCourseStageLocal(c) === "published")
    .map(c => {
      const chCount = c.modules?.reduce((s: number, m: any) => s + m.chapters.length, 0) ?? 0;
      return `${c.id}:${c.title}:${c.cat}:${c.modules?.length ?? 0}:${chCount}`;
    })
    .join("|");

  useEffect(() => {
    // FIX: bail out entirely until modules are hydrated from the server.
    // Running before hydration would see modules:[] on every published course
    // and incorrectly demote them all to "unpublished" in the DB.
    if (!modulesHydrated) {
      console.log("[PublishGuard] ⏸ Skipping — modules not yet hydrated");
      return;
    }

    console.group("[PublishGuard] Running check");
    console.log("[PublishGuard] fingerprint:", publishedFingerprint || "(no published courses)");

    const publishedCourses = courses.filter(c => getCourseStageLocal(c) === "published");

    if (publishedCourses.length === 0) {
      console.log("[PublishGuard] No published courses — done");
      console.groupEnd();
      return;
    }

    console.log("[PublishGuard] Checking:", publishedCourses.map(c => ({ id: c.id, title: c.title })));

    let anyDemoted = false;

    const next = courses.map(c => {
      if (getCourseStageLocal(c) !== "published") return c;
      if (!shouldAutoUnpublish(c)) {
        console.log("[PublishGuard] OK: " + c.title + " (id:" + c.id + ") — valid");
        return c;
      }

      anyDemoted = true;
      const reasons = getPublishBlockReasons(c);
      console.warn("[PublishGuard] AUTO-UNPUBLISH: " + c.title + " (id:" + c.id + ") missing: " + reasons.join(", "));

      if (c.id) {
        api.courses.update(c.id, { ...c, active: false, stage: "unpublished" })
          .then(r => console.log("[PublishGuard] API demote OK:", c.title, r))
          .catch(err => console.error("[PublishGuard] API demote FAILED:", c.title, err));
      } else {
        console.warn("[PublishGuard] No id on " + c.title + " — local demote only");
      }

      toast(`"${c.title}" was unpublished — missing: ${reasons.join(", ")}.`);
      return { ...c, active: false, stage: "unpublished" as any };
    });

    if (anyDemoted) {
      console.warn("[PublishGuard] setCourses fired — this triggers another render cycle");
      setCourses(next);
    } else {
      console.log("[PublishGuard] All valid — no setCourses call");
    }

    console.groupEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedFingerprint, modulesHydrated]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

function getCourseStageLocal(c: Course): string {
  if ((c as any).stage) return (c as any).stage;
  return c.active ? "published" : "draft";
}
