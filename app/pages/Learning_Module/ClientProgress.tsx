'use client'

import { useState, useEffect } from "react";
import type { ProgressRecord } from "../../Data/types";
import api from "../../Services/api.service";

interface ProgressPanelProps {
  toast: (msg: string) => void;
}

const STATUS_CONFIG: Record<string, { bar: string; badge: string; dot: string; label: string }> = {
  Completed: {
    bar: "linear-gradient(90deg, #10b981, #34d399)",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "#10b981",
    label: "Completed",
  },
  "In Progress": {
    bar: "linear-gradient(90deg, #6366f1, #818cf8)",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "#6366f1",
    label: "In Progress",
  },
  "Not Started": {
    bar: "linear-gradient(90deg, #d1d5db, #e5e7eb)",
    badge: "bg-slate-50 text-slate-500 border-slate-200",
    dot: "#d1d5db",
    label: "Not Started",
  },
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "18px 22px",
      border: "1px solid #f1f5f9",
      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 100,
      flex: 1,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color: accent, fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: "-.03em" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em" }}>
        {label}
      </span>
    </div>
  );
}

export default function ProgressPanel({ toast }: ProgressPanelProps) {
  const [data, setData] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [hovered, setHovered] = useState<number | null>(null);

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
  const completed = safe.filter(r => r.status === "Completed").length;
  const inProgress = safe.filter(r => r.status === "In Progress").length;
  const avgProgress = safe.length
    ? Math.round(safe.reduce((s, r) => s + r.progress, 0) / safe.length)
    : 0;

  const rows = safe.filter(r =>
    (filter === "All" || r.status === filter) &&
    (!search || r.course.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

        .prog-root {
          font-family: 'DM Sans', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          padding: 32px 28px;
          box-sizing: border-box;
        }

        .prog-chip {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all .18s ease;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: .01em;
        }
        .prog-chip:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
        .prog-chip.active { background: #6366f1; color: #fff; border-color: #6366f1; box-shadow: 0 2px 8px rgba(99,102,241,.3); }

        .prog-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 14px;
          transition: border-color .15s;
        }
        .prog-search:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
        .prog-search input {
          border: none;
          outline: none;
          font-size: 13px;
          color: #1e293b;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          width: 180px;
        }
        .prog-search input::placeholder { color: #94a3b8; }

        .prog-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .prog-table thead tr th {
          padding: 10px 16px;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: #94a3b8;
          text-align: left;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .prog-table thead tr th:first-child { border-radius: 10px 0 0 0; }
        .prog-table thead tr th:last-child { border-radius: 0 10px 0 0; }

        .prog-row {
          transition: background .15s;
          cursor: default;
        }
        .prog-row td {
          padding: 13px 16px;
          border-bottom: 1px solid #f8fafc;
          vertical-align: middle;
        }
        .prog-row:hover td { background: #fafbff; }
        .prog-row:last-child td { border-bottom: none; }

        .prog-bar-track {
          height: 6px;
          background: #f1f5f9;
          border-radius: 99px;
          overflow: hidden;
          width: 120px;
        }
        .prog-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width .6s cubic-bezier(.34,1.56,.64,1);
        }

        .prog-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px 3px 7px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          border: 1.5px solid;
        }

        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
        }
        .export-btn:hover {
          border-color: #6366f1;
          color: #6366f1;
          background: #eef2ff;
        }

        .empty-state {
          text-align: center;
          padding: 56px 20px;
        }
        .empty-icon {
          width: 52px;
          height: 52px;
          background: #f1f5f9;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp .35s ease both;
        }
      `}</style>

      <div className="prog-root">
        {/* Page Header */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 30,
                fontWeight: 400,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-.03em",
                lineHeight: 1.1,
              }}>
                My Learning Progress
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#64748b", fontWeight: 400 }}>
                Track your courses, milestones, and achievements.
              </p>
            </div>
            <button className="export-btn" onClick={() => toast("Exporting…")}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        {!loading && (
          <div className="fade-up" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", animationDelay: ".05s" }}>
            <StatCard label="Total Courses" value={safe.length} accent="#0f172a" />
            <StatCard label="Completed" value={completed} accent="#10b981" />
            <StatCard label="In Progress" value={inProgress} accent="#6366f1" />
            <StatCard label="Avg. Progress" value={`${avgProgress}%`} accent="#f59e0b" />
          </div>
        )}

        {/* Filter + Search Bar */}
        <div className="fade-up" style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          animationDelay: ".1s",
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
            {["All", "In Progress", "Completed", "Not Started"].map(f => (
              <button
                key={f}
                className={`prog-chip${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="prog-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
            </svg>
            <input
              placeholder="Search courses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Table Card */}
        <div className="fade-up" style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #f1f5f9",
          boxShadow: "0 2px 12px rgba(0,0,0,.04)",
          overflow: "hidden",
          animationDelay: ".15s",
        }}>
          {loading ? (
            <div style={{ padding: "24px 16px" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                  <div className="skeleton" style={{ height: 14, width: "30%", animationDelay: `${i * .07}s` }} />
                  <div className="skeleton" style={{ height: 8, width: "20%", borderRadius: 99 }} />
                  <div className="skeleton" style={{ height: 12, width: "12%" }} />
                  <div className="skeleton" style={{ height: 12, width: "12%" }} />
                  <div className="skeleton" style={{ height: 22, width: "14%", borderRadius: 99 }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="prog-table">
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
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6">
                              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
                              <path d="M12 8v4M12 16h.01" />
                            </svg>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", margin: "0 0 4px" }}>
                            {safe.length === 0 ? "No courses yet" : "No results found"}
                          </p>
                          <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>
                            {safe.length === 0
                              ? "Start a course to track your progress here."
                              : "Try a different search or filter."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : rows.map((r, i) => {
                    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["Not Started"];
                    return (
                      <tr
                        key={i}
                        className="prog-row"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ animationDelay: `${i * .04}s` }}
                      >
                        {/* Course */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                              </svg>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.course}</span>
                          </div>
                        </td>

                        {/* Progress bar */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="prog-bar-track">
                              <div
                                className="prog-bar-fill"
                                style={{ width: `${r.progress}%`, background: cfg.bar }}
                              />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", minWidth: 30 }}>
                              {r.progress}%
                            </span>
                          </div>
                        </td>

                        {/* Started */}
                        <td style={{ fontSize: 12, color: "#64748b" }}>
                          {r.started
                            ? <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="2" y="3" width="12" height="11" rx="2" />
                                <path d="M5 1v2M11 1v2M2 7h12" />
                              </svg>
                              {r.started}
                            </span>
                            : <span style={{ color: "#cbd5e1" }}>—</span>
                          }
                        </td>

                        {/* Completed */}
                        <td style={{ fontSize: 12, color: "#64748b" }}>
                          {r.completed
                            ? <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth="2">
                                <path d="M2 8l4 4 8-8" />
                              </svg>
                              {r.completed}
                            </span>
                            : <span style={{ color: "#cbd5e1" }}>—</span>
                          }
                        </td>

                        {/* Status badge */}
                        <td>
                          <span className={`prog-badge ${cfg.badge}`} style={{
                            borderColor: cfg.dot + "40",
                            background: cfg.dot + "12",
                            color: cfg.dot,
                          }}>
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: cfg.dot,
                              flexShrink: 0,
                            }} />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && rows.length > 0 && (
            <div style={{
              padding: "10px 18px",
              borderTop: "1px solid #f8fafc",
              fontSize: 11.5,
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span>Showing <strong style={{ color: "#475569" }}>{rows.length}</strong> of <strong style={{ color: "#475569" }}>{safe.length}</strong> courses</span>
              {filter !== "All" && (
                <button
                  onClick={() => { setFilter("All"); setSearch(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 11.5, fontWeight: 600, padding: 0, fontFamily: "inherit" }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
