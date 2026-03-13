'use client';

import React from 'react';
import { POSDevice, Client } from './dashboard_overview_func';
import { MBtnS } from './popup_shared';

/* ─────────────────────────────────────────────
   PROPS
───────────────────────────────────────────── */
interface Props {
  pos: POSDevice;
  client: Client;
  posIndex: number;
  onClose: () => void;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function POSDetailPopup({ pos, client, posIndex, onClose }: Props) {
  const isAloha = client.cat === 'F&B';

  const specs = [
    { label: 'Device Model',    value: pos.model },
    { label: 'License Number',  value: pos.licenseNumber || '—' },
    { label: 'IP Address',      value: pos.ip },
    { label: 'OS Version',      value: pos.os },
    { label: 'Branch',          value: pos.branch },
  ];

  const getValueColor = (label: string): string => {
    if (label === 'License Number') return isAloha ? '#d97706' : '#7c3aed';
    if (label === 'OS Version') return '#7c3aed';
    return '#18103a';
  };

  const catLabel = isAloha ? 'Aloha' : client.cat;

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
        width: 460, maxWidth: '96vw',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header (teal gradient) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: 'linear-gradient(135deg,#0f766e,#0284c7)', flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="13" rx="2"/>
              <path d="M2 10h20M12 16v3M8 19h8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {pos.model}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {client.name} · {pos.branch} · {catLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.18)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '18px 20px' }}>
          {/* License type info pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: isAloha ? 'rgba(217,119,6,0.1)' : 'rgba(124,58,237,0.08)',
            border: `1px solid ${isAloha ? 'rgba(217,119,6,0.22)' : 'rgba(124,58,237,0.18)'}`,
            borderRadius: 20, padding: '3px 10px', marginBottom: 14,
            fontSize: 9.5, fontWeight: 700,
            color: isAloha ? '#92400e' : '#4c1d95',
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
            </svg>
            {isAloha ? 'Branch-specific license' : 'Shared license (all branches)'}
          </div>

          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#b8aed8',
            marginBottom: 12, paddingBottom: 6,
            borderBottom: '1px solid rgba(124,58,237,0.1)',
          }}>
            DEVICE SPECIFICATIONS
          </div>

          <div style={{
            background: '#f2f0fb', borderRadius: 12,
            border: '1px solid rgba(124,58,237,0.1)', overflow: 'hidden',
          }}>
            {specs.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px', gap: 16,
                  borderBottom: i < specs.length - 1 ? '1px solid rgba(124,58,237,0.1)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.015)',
                }}
              >
                <span style={{ fontSize: 11.5, color: '#8e7ec0', fontWeight: 500, flexShrink: 0, minWidth: 120 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: getValueColor(row.label), textAlign: 'right', wordBreak: 'break-all' }}>
                  {row.value}
                </span>
              </div>
            ))}
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