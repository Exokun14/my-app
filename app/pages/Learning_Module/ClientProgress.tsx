'use client'

import { useState } from "react";
import type { ProgressRecord, ProgressStatus } from "../../Data/types";
import "../../globals.css";

const BAR_COLOR: Record<ProgressStatus, string> = {
  Completed:     "#16a34a",
  "In Progress": "var(--purple)",
  "Not Started": "#e5e7eb",
};

const PILL_CLASS: Record<ProgressStatus, string> = {
  Completed:     "completed",
  "In Progress": "started",
  "Not Started": "notstarted",
};

const DOT_CLASS: Record<ProgressStatus, string> = {
  Completed:     "dot-g",
  "In Progress": "dot-y",
  "Not Started": "dot-r",
};

const AVATAR_COLORS = ["#7c3aed", "#0d9488", "#d97706", "#0284c7", "#16a34a"];

interface ClientProgressProps {
  toast: (msg: string) => void;
  progressData?: ProgressRecord[];  // Made optional with ?
}

export default function ClientProgress({ toast, progressData = [] }: ClientProgressProps) {
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("All");

  // FIXED: Use default empty array if progressData is undefined
  const safeProgressData = progressData || [];

  const filtered = safeProgressData.filter(r => {
    const statusOk = filter === "All" || r.status === filter;
    const srchOk =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.company.toLowerCase().includes(search.toLowerCase()) ||
      r.course.toLowerCase().includes(search.toLowerCase());
    return statusOk && srchOk;
  });

  return (
    <>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.01em" }}>
            Client Learning Progress
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
            Employees across all client companies ({safeProgressData.length} records)
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="search-box" style={{ width: 180, padding: "5px 10px" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/>
          </svg>
          <input
            type="text"
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 11.5 }}
          />
        </div>
        <button className="btn btn-s btn-sm" onClick={() => toast("Exporting progress report…")}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/>
          </svg>
          Export
        </button>
      </div>

      {/* Status filter chips */}
      <div className="lc-filter-bar" style={{ marginBottom: 10 }}>
        <span className="fl">Filter</span>
        <div className="filter-divider" />
        {["All", "In Progress", "Completed", "Not Started"].map(f => (
          <button key={f} className={`lc-prog-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="surf" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div className="tbl-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Company</th>
                <th>Course</th>
                <th>Progress</th>
                <th>Date Started</th>
                <th>Date Completed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--t3)", fontSize: 12 }}>
                    {safeProgressData.length === 0 ? "No progress data available. Start by completing courses!" : "No records found"}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const initials = r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, color: "white", flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11.5, color: "var(--t2)", fontWeight: 500 }}>{r.company}</td>
                      <td style={{ fontSize: 11.5, color: "var(--t1)", fontWeight: 600, maxWidth: 140 }}>{r.course}</td>
                      <td>
                        <div className="lc-bar-wrap">
                          <div className="lc-prog-bar">
                            <div className="lc-prog-fill" style={{ width: `${r.progress}%`, background: BAR_COLOR[r.status] }} />
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--t2)", minWidth: 28, textAlign: "right" }}>
                            {r.progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--t3)" }}>{r.started || "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--t3)" }}>{r.completed || "—"}</td>
                      <td>
                        <span className={`lc-prog-pill ${PILL_CLASS[r.status]}`}>
                          <span className={`dot ${DOT_CLASS[r.status]}`} style={{ width: 5, height: 5 }} />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
