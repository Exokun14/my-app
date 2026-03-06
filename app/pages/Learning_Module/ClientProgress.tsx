'use client'

import { useState, useEffect } from "react";
import type { ProgressRecord } from "../../Data/types";
import api from "../../Services/api.service";

interface ProgressPanelProps {
  toast: (msg: string) => void;
}

const BAR_C: Record<string, string> = {
  Completed: "#16a34a",
  "In Progress": "#6c3dd6",
  "Not Started": "#e5e7eb",
};
const PILL_C: Record<string, string> = {
  Completed: "completed",
  "In Progress": "started",
  "Not Started": "notstarted",
};
const DOT_C: Record<string, string> = {
  Completed: "dot-g",
  "In Progress": "dot-y",
  "Not Started": "dot-r",
};

export default function ProgressPanel({ toast }: ProgressPanelProps) {
  const [data, setData] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.progress.getAll();
        if (r.success && r.data) setData(r.data as ProgressRecord[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const safe = data || [];
  const rows = safe.filter(r =>
    (filter === "All" || r.status === filter) &&
    (!search || r.course.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="lv-prog">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.02em" }}>My Progress</div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>
            {safe.length} record{safe.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="lv-search">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
          </svg>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-s btn-sm" onClick={() => toast("Exporting…")}>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" />
          </svg>
          Export
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12, flexShrink: 0, flexWrap: "wrap" }}>
        {["All", "In Progress", "Completed", "Not Started"].map(f => (
          <button
            key={f}
            className={`lv-chip${filter === f ? " on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="surf" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div className="tbl-wrap">
          {loading
            ? <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)", fontSize: 13 }}>Loading…</div>
            : (
              <table className="dt">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Progress</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ink3)", fontSize: 12 }}>
                        {safe.length === 0 ? "No progress yet — start a course!" : "No records found"}
                      </td>
                    </tr>
                    : rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{r.course}</td>
                        <td>
                          <div className="lc-bar-wrap">
                            <div className="lc-prog-bar">
                              <div className="lc-prog-fill" style={{ width: `${r.progress}%`, background: BAR_C[r.status] }} />
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink2)", minWidth: 28, textAlign: "right" }}>
                              {r.progress}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--ink3)" }}>{r.started || "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--ink3)" }}>{r.completed || "—"}</td>
                        <td>
                          <span className={`lc-prog-pill ${PILL_C[r.status]}`}>
                            <span className={`dot ${DOT_C[r.status]}`} style={{ width: 5, height: 5 }} />
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
