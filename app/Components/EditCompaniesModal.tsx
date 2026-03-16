'use client'

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../Services/api.service";
import type { Company, Course } from "../Services/api.service";

interface EditCompaniesModalProps {
  open: boolean;
  course: Course | null;
  onClose: () => void;
  onSave: (updatedCompanies: string[]) => void;
  toast: (msg: string) => void;
}

const MODAL_STYLES = `
  @keyframes ecm-backdrop-in { from{opacity:0} to{opacity:1} }
  @keyframes ecm-panel-in    { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:none} }

  .ecm-backdrop {
    position:fixed; inset:0; z-index:8000;
    background:rgba(10,4,30,0.55);
    backdrop-filter:blur(6px);
    animation:ecm-backdrop-in .18s ease both;
    display:flex; align-items:center; justify-content:center;
    padding:20px;
  }
  .ecm-panel {
    background:#fff;
    border-radius:20px;
    border:1.5px solid rgba(109,40,217,0.13);
    box-shadow:0 24px 80px rgba(109,40,217,0.22);
    width:100%; max-width:520px;
    animation:ecm-panel-in .22s cubic-bezier(.34,1.3,.64,1) both;
    overflow:hidden;
    display:flex; flex-direction:column;
    max-height:88vh;
  }

  /* Header */
  .ecm-header {
    padding:20px 22px 16px;
    background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(13,148,136,0.04));
    border-bottom:1.5px solid rgba(109,40,217,0.08);
    display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
  }
  .ecm-close {
    width:30px; height:30px; border-radius:8px;
    border:1.5px solid rgba(109,40,217,0.12);
    background:rgba(109,40,217,0.04); color:#8e7ec0;
    cursor:pointer; font-size:14px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    transition:all .14s; font-family:'DM Sans',sans-serif;
  }
  .ecm-close:hover { background:rgba(109,40,217,0.12); color:#4a3870; border-color:rgba(109,40,217,0.28); }

  /* Search */
  .ecm-search {
    display:flex; align-items:center; gap:7px;
    background:#fff; border:1.5px solid rgba(109,40,217,0.12);
    border-radius:10px; padding:7px 11px;
    margin:14px 22px 6px;
    transition:border-color .14s, box-shadow .14s;
  }
  .ecm-search:focus-within { border-color:rgba(109,40,217,0.35); box-shadow:0 0 0 3px rgba(109,40,217,0.08); }
  .ecm-search input { border:none; outline:none; background:transparent; font-size:12px; font-family:'DM Sans',sans-serif; color:#18103a; width:100%; }
  .ecm-search input::placeholder { color:#c4b9e8; }

  /* Company list */
  .ecm-list {
    flex:1; overflow-y:auto; padding:6px 22px 14px;
    scrollbar-width:thin; scrollbar-color:rgba(109,40,217,0.15) transparent;
  }
  .ecm-list::-webkit-scrollbar { width:4px; }
  .ecm-list::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.15); border-radius:99px; }

  @keyframes ecm-row-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
  .ecm-row {
    display:flex; align-items:center; gap:10px;
    padding:9px 11px; border-radius:10px; cursor:pointer;
    border:1.5px solid transparent;
    transition:background .12s, border-color .12s;
    animation:ecm-row-in .16s ease both;
    user-select:none;
  }
  .ecm-row:hover { background:rgba(109,40,217,0.04); border-color:rgba(109,40,217,0.1); }
  .ecm-row.ecm-selected { background:rgba(109,40,217,0.07); border-color:rgba(109,40,217,0.2); }

  .ecm-checkbox {
    width:17px; height:17px; border-radius:5px; flex-shrink:0;
    border:1.8px solid rgba(109,40,217,0.25);
    background:#fff; transition:all .12s;
    display:flex; align-items:center; justify-content:center;
  }
  .ecm-row.ecm-selected .ecm-checkbox {
    background:linear-gradient(135deg,#7c3aed,#5b21b6);
    border-color:transparent;
    box-shadow:0 2px 6px rgba(109,40,217,0.35);
  }

  .ecm-company-avatar {
    width:30px; height:30px; border-radius:8px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:800; color:#fff;
  }

  /* Footer */
  .ecm-footer {
    padding:14px 22px;
    border-top:1.5px solid rgba(109,40,217,0.08);
    display:flex; align-items:center; gap:8px; justify-content:space-between;
    background:rgba(109,40,217,0.02);
  }
  .ecm-btn-cancel {
    padding:8px 18px; border-radius:9px;
    border:1.5px solid rgba(109,40,217,0.15);
    background:#fff; color:#8e7ec0;
    font-size:12px; font-weight:600; cursor:pointer;
    font-family:'DM Sans',sans-serif; transition:all .13s;
  }
  .ecm-btn-cancel:hover { background:rgba(109,40,217,0.05); color:#4a3870; }
  .ecm-btn-save {
    padding:8px 22px; border-radius:9px; border:none;
    background:linear-gradient(135deg,#7c3aed,#5b21b6);
    color:#fff; font-size:12px; font-weight:700; cursor:pointer;
    font-family:'DM Sans',sans-serif;
    box-shadow:0 3px 12px rgba(109,40,217,0.32);
    transition:all .13s; display:flex; align-items:center; gap:6px;
  }
  .ecm-btn-save:hover:not(:disabled) { box-shadow:0 5px 18px rgba(109,40,217,0.42); transform:translateY(-1px); }
  .ecm-btn-save:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

  .ecm-empty { text-align:center; padding:32px 0; color:#c4b9e8; font-size:12.5px; font-family:'DM Sans',sans-serif; }
  .ecm-skeleton { height:48px; border-radius:10px; background:linear-gradient(90deg,rgba(109,40,217,0.04) 25%,rgba(109,40,217,0.09) 50%,rgba(109,40,217,0.04) 75%); background-size:200% 100%; animation:ecm-shimmer 1.4s infinite; margin-bottom:4px; }
  @keyframes ecm-shimmer { to { background-position:-200% 0; } }
`;

// Deterministic color per company initial
const AVATAR_COLORS = [
  ["#7c3aed","#5b21b6"], ["#0d9488","#0f766e"], ["#d97706","#b45309"],
  ["#dc2626","#b91c1c"], ["#0ea5e9","#0284c7"], ["#7c3aed","#0d9488"],
];
function avatarGrad(name: string) {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [a, b] = AVATAR_COLORS[idx];
  return `linear-gradient(135deg,${a},${b})`;
}

export default function EditCompaniesModal({
  open, course, onClose, onSave, toast,
}: EditCompaniesModalProps) {
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  // ── Load all companies when modal opens ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoading(true);

    api.companies.getAll().then(res => {
      if (res.success && res.data) {
        setCompanies(res.data);

        // Pre-select companies already linked to this course
        if (course?.companies && course.companies.length > 0) {
          const preSelected = new Set<number>();
          res.data.forEach(co => {
            if (course.companies!.includes(co.name) ||
                course.companies!.includes(String(co.id))) {
              preSelected.add(co.id);
            }
          });
          setSelected(preSelected);
        } else {
          setSelected(new Set());
        }
      } else {
        toast(`Failed to load companies: ${res.error ?? "unknown error"}`);
      }
    }).catch(() => {
      toast("Network error loading companies.");
    }).finally(() => setLoading(false));
  }, [open, course]);

  const toggle = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!course?.id) { toast("Course has no server ID — cannot save."); return; }

    setSaving(true);
    try {
      // Use syncCourses per company — or update the course's companies field directly
      const res = await api.courses.update(course.id, {
        companies: companies
          .filter(co => selected.has(co.id))
          .map(co => co.name),
      });

      if (res.success) {
        const names = companies.filter(co => selected.has(co.id)).map(co => co.name);
        onSave(names);
        toast(`Course republished to ${names.length} compan${names.length === 1 ? "y" : "ies"}.`);
        onClose();
      } else {
        toast(`Save failed: ${res.error ?? "unknown error"}`);
      }
    } catch {
      toast("Network error — changes not saved.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = companies.filter(co =>
    co.name.toLowerCase().includes(search.toLowerCase()) ||
    (co.industry ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{MODAL_STYLES}</style>
      <div className="ecm-backdrop" onClick={onClose}>
        <div className="ecm-panel" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="ecm-header">
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8">
                    <path d="M2 13V7l6-4 6 4v6H2z"/>
                    <rect x="6" y="9" width="4" height="4"/>
                  </svg>
                </div>
                <span style={{ fontSize:14, fontWeight:900, color:"#18103a", letterSpacing:"-.02em", fontFamily:"'DM Sans',sans-serif" }}>
                  Edit Companies
                </span>
              </div>
              <div style={{ fontSize:11.5, color:"#8e7ec0", fontFamily:"'DM Sans',sans-serif", lineHeight:1.4 }}>
                {course ? (
                  <>Republish <strong style={{ color:"#4a3870" }}>{course.title}</strong> to selected companies</>
                ) : "Select which companies this course is published to"}
              </div>
            </div>
            <button className="ecm-close" onClick={onClose}>✕</button>
          </div>

          {/* ── Search ── */}
          <div className="ecm-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#c4b9e8" strokeWidth="1.6">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/>
            </svg>
            <input
              type="text"
              placeholder="Search companies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")}
                style={{ border:"none", background:"none", color:"#c4b9e8", cursor:"pointer", fontSize:13, padding:0, lineHeight:1 }}>
                ×
              </button>
            )}
          </div>

          {/* ── Selection summary chip ── */}
          {selected.size > 0 && (
            <div style={{ margin:"4px 22px 0", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:"#7c3aed", background:"rgba(124,58,237,0.1)", padding:"3px 9px", borderRadius:20, fontFamily:"'DM Sans',sans-serif" }}>
                {selected.size} selected
              </span>
              <button
                onClick={() => setSelected(new Set())}
                style={{ fontSize:10.5, color:"#8e7ec0", background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", padding:0, textDecoration:"underline" }}>
                Clear all
              </button>
            </div>
          )}

          {/* ── Company list ── */}
          <div className="ecm-list" style={{ marginTop: selected.size > 0 ? 8 : 0 }}>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="ecm-skeleton" style={{ animationDelay:`${i*0.07}s` }} />
              ))
            ) : filtered.length === 0 ? (
              <div className="ecm-empty">
                {search ? `No companies match "${search}"` : "No companies found"}
              </div>
            ) : filtered.map((co, i) => {
              const isSelected = selected.has(co.id);
              return (
                <div
                  key={co.id}
                  className={`ecm-row${isSelected ? " ecm-selected" : ""}`}
                  style={{ animationDelay:`${i * 0.03}s` }}
                  onClick={() => toggle(co.id)}
                >
                  {/* Checkbox */}
                  <div className="ecm-checkbox">
                    {isSelected && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1.5 5l2.5 2.5L8.5 2"/>
                      </svg>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="ecm-company-avatar" style={{ background: avatarGrad(co.name) }}>
                    {co.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:"#18103a", fontFamily:"'DM Sans',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {co.name}
                    </div>
                    <div style={{ fontSize:10.5, color:"#8e7ec0", fontFamily:"'DM Sans',sans-serif", marginTop:1 }}>
                      {[co.industry, co.store_name].filter(Boolean).join(" · ") || "No details"}
                    </div>
                  </div>

                  {/* Active pill */}
                  <div style={{
                    fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0,
                    background: co.active ? "rgba(13,148,136,0.1)" : "rgba(220,38,38,0.08)",
                    color: co.active ? "#0f766e" : "#dc2626",
                  }}>
                    {co.active ? "Active" : "Inactive"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div className="ecm-footer">
            <div style={{ fontSize:11, color:"#c4b9e8", fontFamily:"'DM Sans',sans-serif" }}>
              {companies.length} total · {filtered.length} shown
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ecm-btn-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className="ecm-btn-save" onClick={handleSave} disabled={saving || loading}>
                {saving ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation:"spin 0.8s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M7 1v8M4 6l3-5 3 5M3 11h8"/>
                    </svg>
                    Republish to {selected.size} {selected.size === 1 ? "Company" : "Companies"}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>,
    document.body
  );
}
