'use client';

import React, { useState } from 'react';
import { POSDevice, Client } from './dashboard_overview_func';
import {
  MBtnS, MBtnP, MBtnXS,
  POSFormFields, POSFormData, BLANK_POS_FORM,
} from './popup_shared';

/* ─────────────────────────────────────────────
   PROPS
───────────────────────────────────────────── */
interface Props {
  branch: string;
  client: Client;
  posDevices: POSDevice[];
  onClose: () => void;
  onAddPOS: (branch: string, posData: Omit<POSFormData, never>) => void;
  onEditPOS: (posId: string, posData: Omit<POSFormData, never>) => void;
  onRemovePOS: (posId: string) => void;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function BranchDetailPopup({
  branch, client, posDevices,
  onClose, onAddPOS, onEditPOS, onRemovePOS,
}: Props) {
  const [showAddForm,     setShowAddForm]     = useState(false);
  const [posForm,         setPosForm]         = useState<POSFormData>(BLANK_POS_FORM);
  const [formError,       setFormError]       = useState('');
  const [editingPosId,    setEditingPosId]    = useState<string | null>(null);
  const [editForm,        setEditForm]        = useState<POSFormData>(BLANK_POS_FORM);
  const [editError,       setEditError]       = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const isFnB   = client.cat === 'F&B';
  const isRetail = client.cat === 'Retail';

  const branchPOS      = posDevices.filter(d => d.branch === branch);
  const totalBranches  = (client.branches || []).length;
  const seatsPerBranch = Math.ceil((client.seats || 0) / (totalBranches || 1));

  const headerGrad = isFnB
    ? 'linear-gradient(135deg,#d97706,#f59e0b)'
    : isRetail
    ? 'linear-gradient(135deg,#0284c7,#0ea5e9)'
    : 'linear-gradient(135deg,#0d9488,#14b8a6)';

  /* ── Handlers ── */
  const handleSaveAdd = () => {
    if (!posForm.serial.trim()) { setFormError('Serial number is required.'); return; }
    if (!posForm.ip.trim())     { setFormError('IP address is required.'); return; }
    setFormError('');
    onAddPOS(branch, posForm);
    setPosForm(BLANK_POS_FORM);
    setShowAddForm(false);
  };

  const startEdit = (pos: POSDevice) => {
    setEditingPosId(pos.id);
    setEditForm({ model: pos.model, serial: pos.serial, ip: pos.ip, os: pos.os, msaStart: pos.msaStart || '', msaEnd: pos.msaEnd || '', warrantyDate: pos.warrantyDate || '' });
    setEditError('');
    setConfirmRemoveId(null);
    setShowAddForm(false);
  };

  const handleSaveEdit = () => {
    if (!editForm.serial.trim()) { setEditError('Serial number is required.'); return; }
    if (!editForm.ip.trim())     { setEditError('IP address is required.'); return; }
    setEditError('');
    onEditPOS(editingPosId!, editForm);
    setEditingPosId(null);
  };

  const handleRemove = (posId: string) => {
    onRemovePOS(posId);
    setConfirmRemoveId(null);
    if (editingPosId === posId) setEditingPosId(null);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div style={{
        width: 600, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: headerGrad, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/>
              <circle cx="9" cy="7" r="1.8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{branch}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {client.name} · {client.cat}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, padding: '18px 20px' }}>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isFnB ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
            <StatCard value={branchPOS.length} label="POS Machines" color="#0d9488" bg="rgba(13,148,136,0.07)" border="rgba(13,148,136,0.18)" />
            {isFnB ? (
              <StatCard value={client.keysPerStore ?? '—'} label="Keys / Store" color="#d97706" bg="rgba(217,119,6,0.07)" border="rgba(217,119,6,0.2)" />
            ) : (
              <>
                <StatCard value={seatsPerBranch} label="Seats" color="#0284c7" bg="rgba(2,132,199,0.07)" border="rgba(2,132,199,0.18)" />
                <StatCard value={totalBranches}  label="Total Branches" color="#7c3aed" bg="#ede9fe" border="rgba(124,58,237,0.18)" />
              </>
            )}
          </div>

          {/* POS Devices List */}
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                POS Devices at this Branch
              </span>
              <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                {branchPOS.length}
              </span>
              <div style={{ flex: 1 }} />
              {!showAddForm && !editingPosId && (
                <button
                  onClick={() => { setShowAddForm(true); setConfirmRemoveId(null); }}
                  style={{ ...MBtnP, fontSize: 10.5, padding: '6px 12px', gap: 5 }}
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9">
                    <path d="M6 1v10M1 6h10"/>
                  </svg>
                  Add POS
                </button>
              )}
            </div>

            {/* Add POS Form */}
            {showAddForm && (
              <div style={{
                background: 'rgba(124,58,237,0.04)',
                border: '1.5px solid rgba(124,58,237,0.18)',
                borderRadius: 14, padding: 16, marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed' }}>New POS Device — {branch}</span>
                  <button
                    style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }}
                    onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(BLANK_POS_FORM); }}
                  >
                    ✕ Cancel
                  </button>
                </div>
                <POSFormFields form={posForm} onChange={setPosForm} error={formError} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button style={MBtnS} onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(BLANK_POS_FORM); }}>
                    Cancel
                  </button>
                  <button style={{ ...MBtnP, boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }} onClick={handleSaveAdd}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11">
                      <path d="M2 7.5l3.5 3.5 6.5-7"/>
                    </svg>
                    Save POS
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {branchPOS.length === 0 && !showAddForm && (
              <div style={{
                textAlign: 'center', padding: '24px', color: '#8e7ec0', fontSize: 12,
                background: '#f2f0fb', borderRadius: 12,
                border: '1.5px dashed rgba(124,58,237,0.22)',
              }}>
                No POS machines assigned to this branch yet.
              </div>
            )}

            {/* POS Device Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {branchPOS.map((pos, i) => (
                <div key={pos.id}>
                  {/* Edit form for this POS */}
                  {editingPosId === pos.id ? (
                    <div style={{
                      background: 'rgba(13,148,136,0.04)',
                      border: '1.5px solid rgba(13,148,136,0.22)',
                      borderRadius: 14, padding: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0d9488' }}>Edit POS {i + 1}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#ede9fe', color: '#5b21b6' }}>
                            {pos.model}
                          </span>
                        </div>
                        <button
                          style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }}
                          onClick={() => setEditingPosId(null)}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                      <POSFormFields form={editForm} onChange={setEditForm} error={editError} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button style={MBtnS} onClick={() => setEditingPosId(null)}>Cancel</button>
                        <button
                          style={{ ...MBtnP, background: 'linear-gradient(135deg,#0d9488,#0284c7)', boxShadow: '0 2px 10px rgba(13,148,136,0.3)' }}
                          onClick={handleSaveEdit}
                        >
                          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11">
                            <path d="M2 7.5l3.5 3.5 6.5-7"/>
                          </svg>
                          Save Changes
                        </button>
                      </div>
                    </div>

                  ) : (
                    /* POS row card */
                    <div style={{
                      borderRadius: 12,
                      border: confirmRemoveId === pos.id ? '1.5px solid #dc2626' : '1px solid rgba(124,58,237,0.1)',
                      overflow: 'hidden', background: '#fff', transition: 'border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                        {/* Icon */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: '#ccfbf1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="13" rx="2"/>
                            <path d="M2 10h20M12 16v3M8 19h8"/>
                          </svg>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a' }}>POS {i + 1}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#ede9fe', color: '#5b21b6' }}>
                              {pos.model}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {[{ label: 'Serial', val: pos.serial }, { label: 'IP', val: pos.ip }, { label: 'OS', val: pos.os }].map(({ label, val }) => (
                              <span key={label} style={{ fontSize: 10.5, color: '#8e7ec0' }}>
                                <span style={{ fontWeight: 600, color: '#4a3870' }}>{label}: </span>{val}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          <button
                            style={{ ...MBtnXS, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => startEdit(pos)}
                          >
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9">
                              <path d="M8 1l3 3L4 11H1V8z"/>
                            </svg>
                            Edit
                          </button>
                          <button
                            style={{ ...MBtnXS, background: '#fee2e2', color: '#dc2626', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setConfirmRemoveId(confirmRemoveId === pos.id ? null : pos.id)}
                          >
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="9" height="9">
                              <path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3"/>
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Confirm remove bar */}
                      {confirmRemoveId === pos.id && (
                        <div style={{
                          background: '#fee2e2',
                          borderTop: '1px solid rgba(220,38,38,0.18)',
                          padding: '9px 14px',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6">
                            <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/>
                          </svg>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', flex: 1 }}>
                            Remove POS {i + 1} ({pos.model})? This cannot be undone.
                          </span>
                          <button style={{ ...MBtnXS, background: '#fff', color: '#4a3870' }} onClick={() => setConfirmRemoveId(null)}>
                            Cancel
                          </button>
                          <button
                            style={{ ...MBtnXS, background: '#dc2626', color: '#fff', border: 'none', boxShadow: '0 1px 6px rgba(220,38,38,0.3)' }}
                            onClick={() => handleRemove(pos.id)}
                          >
                            Confirm Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '12px 20px',
          borderTop: '1px solid rgba(124,58,237,0.1)',
          background: '#f8f7ff', flexShrink: 0,
        }}>
          <button style={MBtnS} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOCAL HELPER — stat card
───────────────────────────────────────────── */
function StatCard({
  value, label, color, bg, border,
}: {
  value: number | string;
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '14px 16px',
      border: `1px solid ${border}`, textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
















