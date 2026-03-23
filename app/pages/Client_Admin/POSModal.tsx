'use client';

import React from 'react';
import { POSDevice, POS_DATA, useClickOutside } from './overview_func';

// ─── Embedded "database" ─────────────────────────────────────────────────────
// POS_DATA is the source of truth; it lives in overview_func.ts.
// The functions below let callers query it without importing the full dataset.
export function getPOSById(id: string): POSDevice | undefined {
  return POS_DATA.find(p => p.id === id);
}
export function getAllPOS(): POSDevice[] {
  return [...POS_DATA];
}
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  pos: POSDevice;
  onClose: () => void;
}

export default function POSModal({ pos, onClose }: Props) {
  const ref = useClickOutside<HTMLDivElement>(onClose);

  const specs = [
    { label: 'Device Model',   value: pos.model },
    { label: 'License Number', value: pos.licenseNumber || '—' },
    { label: 'Serial Number',  value: pos.serial || '—' },
    { label: 'OS Version',     value: pos.os },
    { label: 'Warranty Date',  value: pos.warranty || '—' },
    { label: 'Branch',         value: pos.branch },
  ];

  const getColor = (label: string) => {
    if (label === 'License Number') return '#d97706';
    if (label === 'Serial Number')  return '#0d9488';
    if (label === 'OS Version')     return '#7c3aed';
    return '#18103a';
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
    >
      <div ref={ref} style={{ width: 460, maxWidth: '96vw', background: '#fff', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'linear-gradient(135deg,#0f766e,#0284c7)', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{pos.model}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Popeyes · {pos.branch} · Aloha</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.22)', borderRadius: 20, padding: '3px 10px', marginBottom: 14, fontSize: 9.5, fontWeight: 700, color: '#92400e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Branch-specific license
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b8aed8', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
            DEVICE SPECIFICATIONS
          </div>
          <div style={{ background: '#f2f0fb', borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', overflow: 'hidden' }}>
            {specs.map((row, i) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', gap: 16, borderBottom: i < specs.length - 1 ? '1px solid rgba(124,58,237,0.1)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.015)' }}>
                <span style={{ fontSize: 11.5, color: '#8e7ec0', fontWeight: 500, flexShrink: 0, minWidth: 120 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: getColor(row.label), textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0 }}>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 18px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.15)', background: '#fff', fontSize: 12, fontWeight: 600, color: '#4a3870', cursor: 'pointer', fontFamily: 'inherit' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}