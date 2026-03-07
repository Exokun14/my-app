'use client'

import { useState, useEffect, useMemo } from "react";
import api from "../Services/api.service";

interface Client { id: number; name: string; cat: string; enrolled_count?: number; user_count?: number; }
interface ClientUser { id: number; name: string; email: string; role?: string; enrolled?: boolean; }
interface Course { id?: number | string; title: string; cat?: string; thumbEmoji?: string; thumb_emoji?: string; time?: string; duration?: string; totalEnrolled?: number; enrolled_count?: number; [k: string]: any; }
interface EnrollWizardProps { course: Course; onClose: () => void; toast: (msg: string) => void; }

export default function EnrollWizard({ course, onClose, toast }: EnrollWizardProps) {
  const [step, setStep]                         = useState<1|2|3>(1);
  const [clients, setClients]                   = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading]     = useState(true);
  const [users, setUsers]                       = useState<ClientUser[]>([]);
  const [usersLoading, setUsersLoading]         = useState(false);
  const [selectedClient, setSelectedClient]     = useState<Client|null>(null);
  const [selectedUserIds, setSelectedUserIds]   = useState<Set<number>>(new Set());
  const [clientSearch, setClientSearch]         = useState("");
  const [clientCatFilter, setClientCatFilter]   = useState("All");
  const [userSearch, setUserSearch]             = useState("");
  const [roleFilter, setRoleFilter]             = useState("All");
  const [enrolling, setEnrolling]               = useState(false);
  const [done, setDone]                         = useState(false);

  useEffect(() => {
    (async () => {
      setClientsLoading(true);
      try { const r = await (api as any).clients.getAll(); if (r.success && r.data) setClients(r.data); }
      catch {} finally { setClientsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    (async () => {
      setUsersLoading(true); setUsers([]); setSelectedUserIds(new Set()); setRoleFilter("All"); setUserSearch("");
      try { const r = await (api as any).clients.getUsers(selectedClient.id, course.id); if (r.success && r.data) setUsers(r.data); }
      catch { setUsers([]); } finally { setUsersLoading(false); }
    })();
  }, [selectedClient]);

  const clientCats      = useMemo(() => ["All", ...Array.from(new Set(clients.map(c => c.cat).filter(Boolean)))], [clients]);
  const filteredClients = useMemo(() => clients.filter(c =>
    (clientCatFilter === "All" || c.cat === clientCatFilter) &&
    (c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.cat.toLowerCase().includes(clientSearch.toLowerCase()))
  ), [clients, clientSearch, clientCatFilter]);

  const roles         = useMemo(() => ["All", ...Array.from(new Set(users.map(u => u.role).filter(Boolean) as string[]))], [users]);
  const eligibleUsers = users.filter(u => !u.enrolled);
  const enrolledUsers = users.filter(u => u.enrolled);
  const filteredUsers = useMemo(() => eligibleUsers.filter(u => {
    const ms = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    return ms && (roleFilter === "All" || u.role === roleFilter);
  }), [eligibleUsers, userSearch, roleFilter]);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  const toggleUser = (id: number) => setSelectedUserIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll  = () => {
    if (allSelected) setSelectedUserIds(prev => { const n = new Set(prev); filteredUsers.forEach(u => n.delete(u.id)); return n; });
    else             setSelectedUserIds(prev => { const n = new Set(prev); filteredUsers.forEach(u => n.add(u.id)); return n; });
  };

  const handleEnroll = async () => {
    if (!selectedClient || selectedUserIds.size === 0) return;
    setEnrolling(true);
    try {
      const r = await (api as any).enrollments.create({ course_id: course.id, client_id: selectedClient.id, user_ids: Array.from(selectedUserIds) });
      if (r.success) setDone(true);
      else { toast("Error: " + (r.error || "Failed to enroll")); setEnrolling(false); }
    } catch { toast("Failed to connect to server"); setEnrolling(false); }
  };

  const handleClose = () => {
    if (done) toast("Enrolled " + selectedUserIds.size + " user" + (selectedUserIds.size !== 1 ? "s" : "") + " in " + course.title);
    onClose();
  };

  const emoji         = course.thumbEmoji || course.thumb_emoji || "📚";
  const selectedNames = users.filter(u => selectedUserIds.has(u.id)).map(u => u.name.split(" ")[0]);
  const initials      = (name: string) => name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const totalEnrolled = course.totalEnrolled ?? course.enrolled_count ?? null;
  const duration      = course.time || course.duration || null;

  return (
    <>
      <style>{EW_STYLES}</style>
      <div className="ew-overlay" onClick={handleClose}>
        <div className="ew-modal" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="ew-header">
            <div className="ew-header-top">
              <div className="ew-header-content">
                <div className="ew-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="7" r="3"/>
                    <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6"/>
                    <circle cx="17" cy="9" r="2.5"/>
                    <path d="M15 20c0-2.21 1.57-4.07 3.71-4.62"/>
                  </svg>
                  <div className="ew-icon-ring" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ew-title">{done ? "Enrollment Complete!" : "Enroll Users into Course"}</div>
                  <div className="ew-subtitle">
                    <span className="ew-course-pill">{emoji} {course.title}</span>
                    {course.cat && <span className="ew-cat-pill">{course.cat}</span>}
                  </div>
                </div>
              </div>
              <button className="ew-close" onClick={handleClose}>x</button>
            </div>

            {!done && (
              <div className="ew-stats-bar">
                <div className="ew-stat">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1.5" y="1.5" width="11" height="11" rx="2.5"/><path d="M5 7h4M7 5v4"/></svg>
                  <span className="ew-stat-val">{clientsLoading ? "..." : clients.length}</span>
                  <span className="ew-stat-lbl">Companies</span>
                </div>
                <div className="ew-stat-div" />
                <div className="ew-stat">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="5" r="2.5"/><path d="M1 12c0-2.76 2.24-5 5-5"/><circle cx="11" cy="9" r="2.5"/><path d="M9 12v-1a2 2 0 0 1 4 0v1"/></svg>
                  <span className="ew-stat-val">{totalEnrolled !== null ? totalEnrolled : "—"}</span>
                  <span className="ew-stat-lbl">Enrolled</span>
                </div>
                {duration && (<>
                  <div className="ew-stat-div" />
                  <div className="ew-stat">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 2"/></svg>
                    <span className="ew-stat-val">{duration}</span>
                    <span className="ew-stat-lbl">Duration</span>
                  </div>
                </>)}
                {selectedUserIds.size > 0 && (<>
                  <div className="ew-stat-div" />
                  <div className="ew-stat accent">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l3.5 3.5L12 4"/></svg>
                    <span className="ew-stat-val">{selectedUserIds.size}</span>
                    <span className="ew-stat-lbl">Selected</span>
                  </div>
                </>)}
              </div>
            )}
          </div>

          {/* STEP TABS */}
          {!done && (
            <div className="ew-steps">
              {([{ n: 1, label: "Select Company" }, { n: 2, label: "Choose Users" }, { n: 3, label: "Confirm" }] as const).map(({ n, label }) => (
                <button key={n}
                  className={"ew-step-tab" + (step === n ? " active" : "") + (n < step ? " done" : "") + (n > step ? " locked" : "")}
                  onClick={() => { if (n < step) setStep(n); }}
                >
                  <span className="ew-step-num">
                    {n < step
                      ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>
                      : n}
                  </span>
                  <span className="ew-step-label">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* BODY */}
          <div className="ew-body">

            {/* SUCCESS */}
            {done && (
              <div className="ew-success">
                <div className="ew-success-icon">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="white" strokeWidth="2.8"><path d="M7 18l8 8 14-14"/></svg>
                </div>
                <div className="ew-success-title">{selectedUserIds.size} user{selectedUserIds.size !== 1 ? "s" : ""} enrolled!</div>
                <div className="ew-success-sub">Successfully added to <strong>{course.title}</strong> under <strong>{selectedClient?.name}</strong>.</div>
                <div className="ew-name-tags">
                  {selectedNames.slice(0, 12).map((n, i) => <span key={i} className="ew-name-tag">{n}</span>)}
                  {selectedNames.length > 12 && <span className="ew-name-tag muted">+{selectedNames.length - 12} more</span>}
                </div>
              </div>
            )}

            {/* STEP 1 */}
            {!done && step === 1 && (
              <div className="ew-section">
                <div className="ew-section-title">
                  Company
                  {!clientsLoading && <span className="ew-section-badge">{clients.length} total</span>}
                </div>
                <div className="ew-field">
                  <input type="text" className="ew-input" placeholder="Search by name or industry..." value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)} autoFocus />
                </div>
                {!clientsLoading && clientCats.length > 2 && (
                  <div className="ew-chips">
                    {clientCats.map(c => (
                      <button key={c} className={"ew-chip" + (clientCatFilter === c ? " active" : "")} onClick={() => setClientCatFilter(c)}>{c}</button>
                    ))}
                  </div>
                )}
                {clientsLoading ? (
                  <div className="ew-loading-state">
                    <div className="ew-spinner-ring" />
                    <div className="ew-loading-text">Loading companies...</div>
                    <div className="ew-skeletons">
                      {[0,1,2].map(i => (
                        <div key={i} className="ew-skeleton-row" style={{ animationDelay: (i * 0.12) + "s" }}>
                          <div className="ew-skeleton-box sq" />
                          <div className="ew-skeleton-lines">
                            <div className="ew-skeleton-line w60" />
                            <div className="ew-skeleton-line w35" />
                          </div>
                          <div className="ew-skeleton-chip" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="ew-empty"><span style={{ fontSize: 28 }}>🏢</span><span>No companies found</span></div>
                ) : (
                  <div className="ew-list">
                    {filteredClients.map(cl => {
                      const sel = selectedClient?.id === cl.id;
                      return (
                        <div key={cl.id} className={"ew-company-card" + (sel ? " selected" : "")} onClick={() => setSelectedClient(cl)}>
                          <div className="ew-checkbox" style={{ background: sel ? "var(--purple)" : "transparent", border: sel ? "1.5px solid var(--purple)" : "1.5px solid #d1d5db" }}>
                            {sel && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                          </div>
                          <div className="ew-company-avatar">{cl.name.charAt(0)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ew-company-name">{cl.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" as const }}>
                              <span className="ew-company-cat">{cl.cat}</span>
                              {cl.user_count != null && (
                                <span className="ew-co-meta">
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="4" r="2"/><path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>
                                  {cl.user_count} users
                                </span>
                              )}
                              {cl.enrolled_count != null && (
                                <span className="ew-co-meta teal">
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5"/></svg>
                                  {cl.enrolled_count} enrolled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {!done && step === 2 && selectedClient && (
              <div className="ew-section">
                <div className="ew-section-title">
                  Choose Users
                  <span className="ew-section-badge">{selectedClient.name}</span>
                </div>
                <div className="ew-field">
                  <input type="text" className="ew-input" placeholder="Search users by name or email..."
                    value={userSearch} onChange={e => setUserSearch(e.target.value)} autoFocus />
                </div>
                {roles.length > 1 && (
                  <div className="ew-chips">
                    {roles.map(r => (
                      <button key={r} className={"ew-chip" + (roleFilter === r ? " active" : "")} onClick={() => setRoleFilter(r)}>{r}</button>
                    ))}
                  </div>
                )}
                {usersLoading ? (
                  <div className="ew-loading-state">
                    <div className="ew-spinner-ring" />
                    <div className="ew-loading-text">Loading users from {selectedClient.name}...</div>
                    <div className="ew-skeletons">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="ew-skeleton-row" style={{ animationDelay: (i * 0.1) + "s" }}>
                          <div className="ew-skeleton-box round" />
                          <div className="ew-skeleton-lines">
                            <div className="ew-skeleton-line w60" />
                            <div className="ew-skeleton-line w40" />
                          </div>
                          <div className="ew-skeleton-chip" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (<>
                  {filteredUsers.length > 0 && (
                    <div className="ew-select-all" onClick={toggleAll}>
                      <div className="ew-checkbox" style={{ background: allSelected ? "var(--purple)" : "transparent", border: allSelected ? "1.5px solid var(--purple)" : "1.5px solid #d1d5db" }}>
                        {allSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                      </div>
                      <span className="ew-select-all-label">{allSelected ? "Deselect all" : "Select all (" + filteredUsers.length + ")"}</span>
                      {selectedUserIds.size > 0 && <span className="ew-selected-badge">{selectedUserIds.size} selected</span>}
                    </div>
                  )}
                  {filteredUsers.length === 0 && eligibleUsers.length === 0 ? (
                    <div className="ew-empty"><span style={{ fontSize: 28 }}>✅</span><span>All users are already enrolled.</span></div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="ew-empty"><span>No users match your filters</span></div>
                  ) : (
                    <div className="ew-list">
                      {filteredUsers.map(u => {
                        const checked = selectedUserIds.has(u.id);
                        return (
                          <div key={u.id} className={"ew-user-card" + (checked ? " selected" : "")} onClick={() => toggleUser(u.id)}>
                            <div className="ew-checkbox" style={{ background: checked ? "var(--purple)" : "transparent", border: checked ? "1.5px solid var(--purple)" : "1.5px solid #d1d5db" }}>
                              {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                            </div>
                            <div className="ew-user-avatar">{initials(u.name)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="ew-user-name">{u.name}</div>
                              <div className="ew-user-email">{u.email}</div>
                            </div>
                            {u.role && <span className="ew-role-tag">{u.role}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {enrolledUsers.length > 0 && (<>
                    <div className="ew-divider-label">Already Enrolled ({enrolledUsers.length})</div>
                    <div className="ew-list">
                      {enrolledUsers.map(u => (
                        <div key={u.id} className="ew-user-card enrolled">
                          <div className="ew-user-avatar grey">{initials(u.name)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ew-user-name muted">{u.name}</div>
                            <div className="ew-user-email">{u.email}</div>
                          </div>
                          <span className="ew-enrolled-tag">Enrolled</span>
                        </div>
                      ))}
                    </div>
                  </>)}
                </>)}
              </div>
            )}

            {/* STEP 3 */}
            {!done && step === 3 && selectedClient && (
              <div className="ew-section">
                <div className="ew-section-title">Confirm Enrollment</div>
                <div className="ew-confirm-box">
                  <div className="ew-confirm-row">
                    <span className="ew-confirm-label">Course</span>
                    <span className="ew-confirm-value">{emoji} {course.title}</span>
                  </div>
                  <div className="ew-confirm-divider" />
                  <div className="ew-confirm-row">
                    <span className="ew-confirm-label">Company</span>
                    <span className="ew-confirm-value">{selectedClient.name}<span className="ew-confirm-cat">{selectedClient.cat}</span></span>
                  </div>
                  <div className="ew-confirm-divider" />
                  <div className="ew-confirm-row">
                    <span className="ew-confirm-label">Users</span>
                    <span className="ew-confirm-count">{selectedUserIds.size}</span>
                  </div>
                </div>
                <div className="ew-field" style={{ marginTop: 16 }}>
                  <label className="ew-label">Users Being Enrolled</label>
                  <div className="ew-name-tags">
                    {selectedNames.slice(0, 10).map((n, i) => <span key={i} className="ew-name-tag">{n}</span>)}
                    {selectedNames.length > 10 && <span className="ew-name-tag muted">+{selectedNames.length - 10} more</span>}
                  </div>
                </div>
                <div className="ew-notice">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v3M7 9.5v.5"/></svg>
                  Users will gain immediate access to this course once enrolled.
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="ew-footer">
            {done ? (
              <button className="ew-btn-primary" onClick={handleClose}>Done</button>
            ) : (<>
              <button className="ew-btn-secondary" onClick={step === 1 ? handleClose : () => setStep(s => (s - 1) as 1|2|3)}>
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <button className="ew-btn-primary"
                disabled={(step === 1 && !selectedClient) || (step === 2 && selectedUserIds.size === 0) || enrolling}
                onClick={() => { if (step === 1) setStep(2); else if (step === 2) setStep(3); else handleEnroll(); }}>
                {enrolling
                  ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span className="ew-btn-spinner" />Enrolling...</span>
                  : step === 3 ? "Enroll " + selectedUserIds.size + " User" + (selectedUserIds.size !== 1 ? "s" : "") : "Next"}
              </button>
            </>)}
          </div>

        </div>
      </div>
    </>
  );
}

const EW_STYLES = `
@keyframes ew-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes ew-slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ew-pop     { 0% { transform: scale(0.5); opacity: 0; } 65% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
@keyframes ew-spin    { to { transform: rotate(360deg); } }
@keyframes ew-pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes ew-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

.ew-overlay {
  position: fixed; inset: 0; z-index: 4000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: ew-fadeIn 0.2s ease;
}
.ew-modal {
  background: var(--surface, #fff); border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  max-width: 560px; width: 100%; max-height: 90vh;
  display: flex; flex-direction: column;
  animation: ew-slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
  overflow: hidden;
}

/* ── Header ── */
.ew-header {
  background: var(--surface, #fff);
  border-bottom: 1px solid var(--border, rgba(124,58,237,0.1));
  flex-shrink: 0;
}
.ew-header-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px;
}
.ew-header-content { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.ew-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 50%, #0d9488 100%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.12) inset,
    0 6px 20px rgba(109,40,217,0.45),
    0 2px 4px rgba(0,0,0,0.15);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.ew-icon-ring {
  position: absolute; inset: -3px; border-radius: 17px;
  border: 1.5px solid rgba(124,58,237,0.25);
  pointer-events: none;
}
.ew-title { font-size: 18px; font-weight: 800; color: var(--t1, #18103a); letter-spacing: -0.02em; }
.ew-subtitle { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.ew-course-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px; border-radius: 20px;
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15);
  color: var(--purple, #7c3aed); font-weight: 600; font-size: 11.5px;
}
.ew-cat-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 20px;
  background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.15);
  color: var(--teal, #0d9488); font-weight: 600; font-size: 11px;
}
.ew-close {
  width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent;
  color: var(--t2, #4a3870); font-size: 22px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  flex-shrink: 0;
}
.ew-close:hover { background: rgba(124,58,237,0.08); }

/* ── Stats bar ── */
.ew-stats-bar {
  display: flex; align-items: center; gap: 0;
  padding: 10px 24px 14px;
  border-top: 1px solid var(--border, rgba(124,58,237,0.08));
}
.ew-stat {
  display: flex; align-items: center; gap: 5px;
  color: var(--t3, #a89dc8); font-size: 11.5px; font-weight: 500;
}
.ew-stat.accent { color: var(--purple, #7c3aed); font-weight: 600; }
.ew-stat svg { opacity: 0.7; flex-shrink: 0; }
.ew-stat.accent svg { opacity: 1; }
.ew-stat-val { font-weight: 700; color: var(--t1, #18103a); font-size: 12px; }
.ew-stat.accent .ew-stat-val { color: var(--purple, #7c3aed); }
.ew-stat-lbl { color: var(--t3, #a89dc8); font-size: 11px; }
.ew-stat-div { width: 1px; height: 16px; background: var(--border, rgba(124,58,237,0.12)); margin: 0 14px; flex-shrink: 0; }

/* ── Step tabs ── */
.ew-steps {
  display: flex; border-bottom: 1px solid var(--border, rgba(124,58,237,0.1));
  flex-shrink: 0; padding: 0 24px; gap: 4px;
}
.ew-step-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 14px 11px; border: none; background: transparent;
  font-family: inherit; font-size: 11.5px; font-weight: 600;
  color: var(--t3, #a89dc8); cursor: default;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all 0.15s; white-space: nowrap;
}
.ew-step-tab.active { color: var(--purple, #7c3aed); border-bottom-color: var(--purple, #7c3aed); }
.ew-step-tab.done   { color: var(--t2, #4a3870); cursor: pointer; }
.ew-step-tab.done:hover { color: var(--purple, #7c3aed); }
.ew-step-tab.locked { opacity: 0.4; }
.ew-step-num {
  width: 20px; height: 20px; border-radius: 50%;
  border: 1.5px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; flex-shrink: 0; transition: all 0.15s;
}
.ew-step-tab.active .ew-step-num { background: var(--purple, #7c3aed); border-color: var(--purple, #7c3aed); color: #fff; }
.ew-step-tab.done   .ew-step-num { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.3); color: var(--purple, #7c3aed); }

/* ── Body ── */
.ew-body { flex: 1; overflow-y: auto; padding: 22px 24px; }
.ew-body::-webkit-scrollbar { width: 4px; }
.ew-body::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.18); border-radius: 4px; }

.ew-section-title {
  font-size: 13px; font-weight: 700; color: var(--t1, #18103a);
  margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 8px;
}
.ew-section-badge {
  font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0;
  padding: 2px 8px; border-radius: 20px;
  background: rgba(124,58,237,0.08); color: var(--purple, #7c3aed);
  border: 1px solid rgba(124,58,237,0.15);
}
.ew-field { margin-bottom: 14px; }
.ew-label { display: block; font-size: 12px; font-weight: 600; color: var(--t2, #4a3870); margin-bottom: 6px; }
.ew-input {
  width: 100%; padding: 10px 12px; border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.15));
  background: var(--bg, #faf9ff); font-size: 13px;
  color: var(--t1, #18103a); font-family: inherit; transition: all 0.15s; box-sizing: border-box;
}
.ew-input:focus { outline: none; border-color: var(--purple, #7c3aed); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.ew-input::placeholder { color: var(--t4, #b0a8cc); }

/* ── Loading ── */
.ew-loading-state { display: flex; flex-direction: column; align-items: center; padding: 4px 0 8px; gap: 10px; }
.ew-spinner-ring {
  width: 30px; height: 30px; border-radius: 50%;
  border: 3px solid rgba(124,58,237,0.15); border-top-color: var(--purple, #7c3aed);
  animation: ew-spin 0.75s linear infinite;
}
.ew-loading-text { font-size: 12px; font-weight: 600; color: var(--t3, #a89dc8); }
.ew-skeletons { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.ew-skeleton-row {
  display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.1)); background: var(--bg, #faf9ff);
  animation: ew-pulse 1.5s ease infinite;
}
.ew-skeleton-box {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
  background: linear-gradient(90deg, rgba(124,58,237,0.07) 25%, rgba(124,58,237,0.15) 50%, rgba(124,58,237,0.07) 75%);
  background-size: 400px 100%; animation: ew-shimmer 1.6s ease infinite;
}
.ew-skeleton-box.sq    { border-radius: 10px; }
.ew-skeleton-box.round { border-radius: 50%; }
.ew-skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.ew-skeleton-line {
  height: 10px; border-radius: 5px;
  background: linear-gradient(90deg, rgba(124,58,237,0.07) 25%, rgba(124,58,237,0.14) 50%, rgba(124,58,237,0.07) 75%);
  background-size: 400px 100%; animation: ew-shimmer 1.6s ease infinite;
}
.ew-skeleton-line.w60 { width: 60%; }
.ew-skeleton-line.w40 { width: 40%; }
.ew-skeleton-line.w35 { width: 35%; }
.ew-skeleton-chip {
  width: 52px; height: 22px; border-radius: 20px; flex-shrink: 0;
  background: linear-gradient(90deg, rgba(124,58,237,0.07) 25%, rgba(124,58,237,0.14) 50%, rgba(124,58,237,0.07) 75%);
  background-size: 400px 100%; animation: ew-shimmer 1.6s ease infinite;
}

/* ── Checkbox ── */
.ew-checkbox {
  width: 18px; height: 18px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s;
}

/* ── Lists ── */
.ew-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.ew-list::-webkit-scrollbar { width: 3px; }
.ew-list::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.15); border-radius: 3px; }

/* ── Chips ── */
.ew-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.ew-chip {
  padding: 4px 11px; border-radius: 20px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.15));
  background: var(--bg, #faf9ff); color: var(--t2, #4a3870);
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.ew-chip:hover  { border-color: var(--purple, #7c3aed); color: var(--purple, #7c3aed); }
.ew-chip.active { background: var(--purple, #7c3aed); border-color: var(--purple, #7c3aed); color: #fff; }

/* ── Company card ── */
.ew-company-card {
  display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.1));
  background: var(--bg, #faf9ff); cursor: pointer; transition: all 0.15s;
}
.ew-company-card:hover  { border-color: var(--purple, #7c3aed); background: rgba(124,58,237,0.04); }
.ew-company-card.selected { border-color: var(--purple, #7c3aed); background: rgba(124,58,237,0.06); }
.ew-company-avatar {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--teal, #0d9488));
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: #fff;
}
.ew-company-name { font-size: 13px; font-weight: 600; color: var(--t1, #18103a); }
.ew-company-cat  { font-size: 10.5px; color: var(--t3, #a89dc8); }
.ew-co-meta {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 500; color: var(--t3, #a89dc8);
}
.ew-co-meta.teal { color: var(--teal, #0d9488); font-weight: 600; }

/* ── Select all ── */
.ew-select-all {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px;
  border: 1.5px dashed rgba(124,58,237,0.2); cursor: pointer; margin-bottom: 10px; transition: background 0.15s;
}
.ew-select-all:hover { background: rgba(124,58,237,0.03); }
.ew-select-all-label { font-size: 12px; font-weight: 600; color: var(--purple, #7c3aed); flex: 1; }
.ew-selected-badge {
  font-size: 10.5px; font-weight: 700; color: #fff;
  background: var(--purple, #7c3aed); border-radius: 20px; padding: 2px 9px;
}

/* ── User card ── */
.ew-user-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.1));
  background: var(--bg, #faf9ff); cursor: pointer; transition: all 0.15s;
}
.ew-user-card:hover:not(.enrolled) { border-color: var(--purple, #7c3aed); background: rgba(124,58,237,0.04); }
.ew-user-card.selected { border-color: var(--purple, #7c3aed); background: rgba(124,58,237,0.06); }
.ew-user-card.enrolled { opacity: 0.55; cursor: default; }
.ew-user-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--purple-d, #6d28d9));
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
}
.ew-user-avatar.grey { background: linear-gradient(135deg, #c4bdd8, #a89dc8); }
.ew-user-name       { font-size: 12.5px; font-weight: 600; color: var(--t1, #18103a); }
.ew-user-name.muted { color: var(--t3, #a89dc8); }
.ew-user-email      { font-size: 11px; color: var(--t3, #a89dc8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ew-role-tag {
  font-size: 10px; font-weight: 600; color: var(--purple, #7c3aed);
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15);
  padding: 2px 8px; border-radius: 20px; flex-shrink: 0;
}
.ew-enrolled-tag {
  font-size: 10px; font-weight: 600; color: var(--teal, #0d9488);
  background: rgba(13,148,136,0.08); border: 1px solid rgba(13,148,136,0.18);
  padding: 2px 8px; border-radius: 20px; flex-shrink: 0;
}
.ew-divider-label {
  font-size: 10px; font-weight: 700; color: var(--t4, #b0a8cc);
  text-transform: uppercase; letter-spacing: 0.07em; margin: 14px 0 8px;
}

/* ── Confirm ── */
.ew-confirm-box {
  border-radius: 10px; border: 1.5px solid var(--border, rgba(124,58,237,0.12));
  background: rgba(124,58,237,0.03); overflow: hidden;
}
.ew-confirm-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; gap: 12px; }
.ew-confirm-divider { height: 1px; background: var(--border, rgba(124,58,237,0.1)); }
.ew-confirm-label { font-size: 11px; font-weight: 700; color: var(--t3, #a89dc8); text-transform: uppercase; letter-spacing: 0.05em; }
.ew-confirm-value { font-size: 13px; font-weight: 600; color: var(--t1, #18103a); display: flex; align-items: center; gap: 6px; }
.ew-confirm-cat { font-size: 10px; font-weight: 600; color: var(--t3, #a89dc8); background: rgba(124,58,237,0.06); padding: 1px 7px; border-radius: 20px; }
.ew-confirm-count { font-size: 22px; font-weight: 800; color: var(--purple, #7c3aed); letter-spacing: -0.02em; }

/* ── Name tags ── */
.ew-name-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.ew-name-tag {
  padding: 3px 10px; border-radius: 20px;
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15);
  color: var(--purple, #7c3aed); font-size: 11.5px; font-weight: 600;
}
.ew-name-tag.muted { background: var(--bg, #faf9ff); color: var(--t3, #a89dc8); border-color: var(--border); }

/* ── Notice ── */
.ew-notice {
  display: flex; align-items: flex-start; gap: 8px; padding: 11px 13px; border-radius: 8px;
  background: rgba(13,148,136,0.06); border: 1px solid rgba(13,148,136,0.2);
  color: var(--teal, #0d9488); font-size: 12px; font-weight: 500; line-height: 1.5;
}

/* ── Empty ── */
.ew-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 0; color: var(--t3, #a89dc8); font-size: 12.5px; text-align: center; }

/* ── Success ── */
.ew-success { display: flex; flex-direction: column; align-items: center; padding: 32px 16px 16px; text-align: center; }
.ew-success-icon {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, var(--teal, #0d9488), #059669);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px; animation: ew-pop 0.4s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 8px 24px rgba(13,148,136,0.3);
}
.ew-success-title { font-size: 20px; font-weight: 800; color: var(--t1, #18103a); letter-spacing: -0.02em; margin-bottom: 8px; }
.ew-success-sub   { font-size: 13px; color: var(--t2, #4a3870); line-height: 1.6; margin-bottom: 20px; max-width: 340px; }

/* ── Footer ── */
.ew-footer {
  padding: 16px 24px; border-top: 1px solid var(--border, rgba(124,58,237,0.1));
  display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0;
}
.ew-btn-secondary {
  padding: 10px 20px; border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124,58,237,0.2));
  background: transparent; color: var(--t2, #4a3870);
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.ew-btn-secondary:hover { background: rgba(124,58,237,0.06); }
.ew-btn-primary {
  padding: 10px 24px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--teal, #0d9488));
  color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.15s; box-shadow: 0 2px 8px rgba(124,58,237,0.25); font-family: inherit;
}
.ew-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(124,58,237,0.35); }
.ew-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
.ew-btn-spinner {
  display: inline-block; width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
  animation: ew-spin 0.7s linear infinite;
}
`;
