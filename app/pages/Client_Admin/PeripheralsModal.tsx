'use client';

import React, { useState, useEffect } from 'react';
import { warrantyStatus, formatWarrantyDate } from './overview_func';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PeripheralItem {
  id:           string;
  model:        string;
  serial:       string;
  warrantyDate: string;
}

interface DBPeripheralRow {
  id:            number;
  pos_id:        number;
  company_id:    number;
  branch_id:     number;
  model_name:    string;
  serial_number: string | null;
  warranty_date: string | null;
}

export interface PeripheralsModalProps {
  posId:    string;
  posModel: string;
  branch:   string;
  onClose:  () => void;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Static modal dimensions ──────────────────────────────────────────────────
const MODAL_W  = 800;
const MODAL_H  = 560;
const HEADER_H = 90;
const FOOTER_H = 62;
// ─────────────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 1,
  background: '#f5f4fb',
  padding: '10px 16px',
  fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  color: '#9b8ec0', textAlign: 'left',
  borderBottom: '1px solid rgba(124,58,237,0.1)',
  whiteSpace: 'nowrap',
};

export default function PeripheralsModal({
  posId, posModel, branch, onClose,
}: PeripheralsModalProps) {

  const [items,   setItems]   = useState<PeripheralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ── Fetch peripherals from API ─────────────────────────────────────────────
  useEffect(() => {
    if (!posId) { setLoading(false); return; }

    setLoading(true);
    setError('');

    fetch(`${API_BASE}/api/peripherals?pos_id=${posId}`, {
      headers: { Accept: 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          setError(data.message ?? 'Failed to load peripherals.');
          return;
        }
        const mapped: PeripheralItem[] = (data.peripherals ?? []).map((r: DBPeripheralRow) => ({
          id:           String(r.id),
          model:        r.model_name    ?? '',
          serial:       r.serial_number ?? '',
          warrantyDate: r.warranty_date ?? '',
        }));
        setItems(mapped);
      })
      .catch(err => {
        console.error('[PeripheralsModal] fetch failed:', err);
        setError('Network error — could not reach the server.');
      })
      .finally(() => setLoading(false));
  }, [posId]);

  const tableBodyH = MODAL_H - HEADER_H - FOOTER_H;

  const BtnSecondary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 22px', borderRadius: 10,
    border: '1.5px solid rgba(124,58,237,0.22)',
    background: '#fff', color: '#4a3870',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,7,36,0.52)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 11000,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: MODAL_W, height: MODAL_H,
          background: '#ffffff', borderRadius: 18,
          boxShadow: '0 28px 80px rgba(15,7,36,0.38)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ══════════════ HEADER ══════════════ */}
        <div style={{
          height: HEADER_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 24px',
          background: 'linear-gradient(135deg,#1a0752 0%,#2e1580 55%,#0b3b3b 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: -32, right: -32, width: 130, height: 130, borderRadius: '50%', background: 'rgba(124,58,237,0.22)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, right: 64, width: 110, height: 110, borderRadius: '50%', background: 'rgba(13,148,136,0.18)', pointerEvents: 'none' }} />

          {/* Wrench icon */}
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: 'rgba(124,58,237,0.32)',
            border: '1.5px solid rgba(167,139,250,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.32)',
            position: 'relative', zIndex: 1,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.6">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Peripherals &amp; Accessories
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,0.7)" strokeWidth="1.8">
                <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
              </svg>
              <span style={{ fontSize: 12, color: 'rgba(196,181,253,0.88)', fontWeight: 500 }}>{posModel || 'POS Device'}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(196,181,253,0.4)', display: 'inline-block' }} />
              {!loading && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(124,58,237,0.45)',
                  border: '1px solid rgba(167,139,250,0.6)',
                  color: '#e9d5ff',
                  padding: '2px 12px', borderRadius: 20,
                }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.22)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#e2d9f3', position: 'relative', zIndex: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
          >
            <svg width="13" height="13" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ══════════════ TABLE BODY ══════════════ */}
        <div style={{
          height: tableBodyH, overflowY: 'auto', flexShrink: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(124,58,237,0.15) transparent',
        } as React.CSSProperties}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: '100%' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"
                style={{ animation: 'spin 0.75s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span style={{ fontSize: 13, color: '#8e7ec0', fontWeight: 500 }}>Loading peripherals…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%', padding: '0 40px', textAlign: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.5"/></svg>
              <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && items.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, height: '100%', textAlign: 'center', padding: '0 40px' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#f2f0fb,#ede9fe)', border: '1.5px solid rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.3">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4a3870', marginBottom: 6 }}>No peripherals recorded</div>
                <div style={{ fontSize: 12, color: '#b8aed8', lineHeight: 1.7, maxWidth: 300 }}>
                  No accessories have been added for this POS machine yet.
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && items.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 56, paddingLeft: 28 }}>#</th>
                  <th style={thStyle}>MODEL / NAME</th>
                  <th style={thStyle}>SERIAL NO.</th>
                  <th style={thStyle}>WARRANTY DATE</th>
                  <th style={thStyle}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, idx) => {
                  const ws = warrantyStatus(p.warrantyDate);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid rgba(124,58,237,0.07)', transition: 'background 0.1s' }}
                      onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = '#faf9ff'; })}
                      onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach((td: any) => { td.style.background = ''; })}
                    >
                      {/* # */}
                      <td style={{ padding: '15px 0 15px 28px', width: 56 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(124,58,237,0.07)',
                          fontSize: 12, fontWeight: 700, color: '#8e7ec0',
                        }}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* MODEL / NAME */}
                      <td style={{ padding: '15px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: 'rgba(124,58,237,0.07)',
                            border: '1px solid rgba(124,58,237,0.13)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b8ec0" strokeWidth="1.7">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                          </div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#18103a' }}>{p.model}</span>
                        </div>
                      </td>

                      {/* SERIAL NO. */}
                      <td style={{ padding: '15px 16px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.14)',
                          borderRadius: 7, padding: '4px 12px',
                        }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><rect x="1" y="3" width="10" height="7" rx="1"/><path d="M4 3V2h4v1"/></svg>
                          <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#4a3870', fontWeight: 600, letterSpacing: '0.02em' }}>{p.serial || '—'}</span>
                        </div>
                      </td>

                      {/* WARRANTY DATE */}
                      <td style={{ padding: '15px 16px', fontSize: 13, color: '#4a3870', fontWeight: 500 }}>
                        {formatWarrantyDate(p.warrantyDate)}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '15px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 700,
                          padding: '5px 14px', borderRadius: 20,
                          background: ws.bg, color: ws.color,
                          border: `1px solid ${ws.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ws.color, flexShrink: 0 }} />
                          {ws.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ══════════════ FOOTER ══════════════ */}
        <div style={{
          height: FOOTER_H, flexShrink: 0,
          borderTop: '1px solid rgba(124,58,237,0.1)',
          background: '#f9f8ff',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={BtnSecondary}>Close</button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}