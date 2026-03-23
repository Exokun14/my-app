'use client';

import React, { useState } from 'react';

/* ─────────────────────────────────────────────
   SHARED BUTTON STYLES
───────────────────────────────────────────── */
export const MBtnS: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: '1px solid rgba(124,58,237,0.16)',
  background: '#f2f0fb',
  color: '#4a3870',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
};

export const MBtnP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
  color: '#fff',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
  boxShadow: '0 3px 14px rgba(124,58,237,0.32)',
};

export const MBtnXS: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid rgba(124,58,237,0.12)',
  background: '#f2f0fb',
  color: '#4a3870',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif",
};

/* ─────────────────────────────────────────────
   SHARED FORM FIELD STYLES
───────────────────────────────────────────── */
export const FLbl: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 600,
  color: '#8e7ec0',
  marginBottom: 5,
};

export const FIn: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(124,58,237,0.12)',
  background: '#f8f7ff',
  color: '#18103a',
  fontSize: 12,
  fontFamily: "'DM Sans',sans-serif",
  outline: 'none',
  boxSizing: 'border-box' as const,
};

/* ─────────────────────────────────────────────
   SHARED TYPES
───────────────────────────────────────────── */
export interface AltContact {
  name: string;
  email: string;
  phone: string;
}

export interface EditInfoFormState {
  storeName: string;
  contact: string;
  email: string;
  phone: string;
  altContacts: AltContact[];
  site: string;
  seats: string;
  keysPerStore: string;
  licenseId: string;
  saStart: string;
  saEnd: string;
  krunchNum: string;
  industryType?:   string;
  accountManager?: string;
  userRole?:       string;
  logoUrl?:        string;
  logoFile?:       File;
}

/* ─────────────────────────────────────────────
   PERIPHERAL ITEM
   dbId  — the real pos_peripherals.id from the DB (null = not yet saved)
   id    — client-side UUID used as React key while drafting
───────────────────────────────────────────── */
export interface PeripheralItem {
  /** Client-side UUID — used as React key */
  id: string;
  /** Real DB id from pos_peripherals.id — null until saved */
  dbId: number | null;
  model: string;
  serial: string;
  warrantyDate: string;
}

const genPid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export function makePeripheralItem(overrides?: Partial<PeripheralItem>): PeripheralItem {
  return {
    id:           genPid(),
    dbId:         null,
    model:        '',
    serial:       '',
    warrantyDate: '',
    ...overrides,
  };
}

/* ─────────────────────────────────────────────
   POS FORM DATA
───────────────────────────────────────────── */
export interface POSFormData {
  model: string;
  licenseNumber: string;
  serial: string;
  os: string;
  msaStart: string;
  msaEnd: string;
  warrantyDate: string;
  peripherals: PeripheralItem[];
}

export const BLANK_POS_FORM: POSFormData = {
  model: '',
  licenseNumber: '',
  serial: '',
  os: 'Windows 10',
  msaStart: '',
  msaEnd: '',
  warrantyDate: '',
  peripherals: [],
};

/* ─────────────────────────────────────────────
   ASTERISK
───────────────────────────────────────────── */
export function Asterisk() {
  return <span style={{ color: '#dc2626' }}>*</span>;
}

/* ─────────────────────────────────────────────
   GENERIC MODAL WRAPPER
───────────────────────────────────────────── */
export function Modal({
  title, subtitle, onClose, footer, children, wide,
}: {
  title: string; subtitle: string; onClose: () => void;
  footer: React.ReactNode; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,7,36,0.45)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
    >
      <div style={{
        width: wide ? 600 : 520, maxWidth: '96vw', background: '#fff',
        borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', flexShrink: 0,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <rect x="2" y="2" width="14" height="14" rx="2"/><path d="M9 6v6M6 9h6"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{subtitle}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDIT SECTION
───────────────────────────────────────────── */
export function EditSection({
  icon, label, badge, action, children, last,
}: {
  icon: string; label: string; badge?: string;
  action?: React.ReactNode; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: last ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>{label}</span>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#8e7ec0' }}>
            {badge}
          </span>
        )}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   POS FORM FIELDS
───────────────────────────────────────────── */
const OS_OPTIONS = ['Windows 11', 'Windows 10', 'Windows 8.1', 'Windows 8', 'Windows 7'];

export function POSFormFields({
  form, onChange, error, licenseReadOnly = false,
}: {
  form: POSFormData;
  onChange: (f: POSFormData) => void;
  error: string;
  licenseReadOnly?: boolean;
}) {
  const set = (key: keyof POSFormData, val: string) =>
    onChange({ ...form, [key]: val });

  const peripherals: PeripheralItem[] = form.peripherals ?? [];

  const addPeripheral = () => {
    onChange({
      ...form,
      peripherals: [...peripherals, makePeripheralItem()],
    });
  };

  const removePeripheral = (id: string) =>
    onChange({ ...form, peripherals: peripherals.filter(p => p.id !== id) });

  const updatePeripheral = (
    id: string,
    field: keyof Omit<PeripheralItem, 'id' | 'dbId'>,
    value: string,
  ) =>
    onChange({
      ...form,
      peripherals: peripherals.map(p => (p.id === id ? { ...p, [field]: value } : p)),
    });

  const FSel: React.CSSProperties = {
    ...FIn,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  const FInReadOnly: React.CSSProperties = {
    ...FIn, background: '#ede9fe', color: '#7c3aed', fontWeight: 600, cursor: 'default',
  };

  const PIn: React.CSSProperties = {
    width: '100%', padding: '6px 9px', borderRadius: 7,
    border: '1px solid rgba(124,58,237,0.13)',
    background: '#faf9ff', color: '#18103a', fontSize: 11.5,
    fontFamily: "'DM Sans',sans-serif", outline: 'none',
    boxSizing: 'border-box' as const, transition: 'border-color 0.14s',
  };

  return (
    <>
      {/* Row 1 — Model + License */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={FLbl}>Model <Asterisk /></label>
          <input style={FIn} type="text" placeholder="e.g. PAX A920, Sunmi T2…"
            value={form.model} onChange={e => set('model', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>
            License Number <Asterisk />
            {licenseReadOnly && (
              <span style={{ fontSize: 9, fontWeight: 600, color: '#7c3aed', marginLeft: 6, background: '#ede9fe', padding: '1px 6px', borderRadius: 4 }}>
                auto-filled
              </span>
            )}
          </label>
          <input
            style={licenseReadOnly ? FInReadOnly : FIn}
            type="text" placeholder="e.g. LIC-XXXX-0001"
            value={form.licenseNumber} readOnly={licenseReadOnly}
            onChange={e => !licenseReadOnly && set('licenseNumber', e.target.value)}
          />
        </div>
      </div>

      {/* Row 2 — Serial Number + OS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={FLbl}>Serial Number <Asterisk /></label>
          <input style={FIn} type="text" placeholder="e.g. SN-00123456"
            value={form.serial} onChange={e => set('serial', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>Operating System</label>
          <select style={FSel} value={form.os} onChange={e => set('os', e.target.value)}>
            {OS_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3 — Warranty Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={FLbl}>Warranty Date</label>
          <input style={FIn} type="date" value={form.warrantyDate} onChange={e => set('warrantyDate', e.target.value)} />
        </div>
      </div>

      {/* ════ Peripherals & Accessories ════ */}
      <div style={{
        border: '1.5px solid rgba(124,58,237,0.13)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 13px',
          background: 'linear-gradient(135deg,rgba(124,58,237,0.055),rgba(13,148,136,0.035))',
          borderBottom: peripherals.length > 0 ? '1px solid rgba(124,58,237,0.1)' : 'none',
        }}>
          {/* Left — label + count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'rgba(124,58,237,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.7">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#4a3870', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Peripherals & Accessories
            </span>
            <span style={{ fontSize: 9.5, color: '#c4b5fd', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
              optional
            </span>
            {peripherals.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 19, height: 19, borderRadius: 20,
                background: '#7c3aed', color: '#fff',
                fontSize: 9, fontWeight: 800, padding: '0 5px',
              }}>
                {peripherals.length}
              </span>
            )}
          </div>

          {/* Right — Add button */}
          <button
            type="button"
            onClick={addPeripheral}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 7,
              background: '#7c3aed', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 700,
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: '0 2px 8px rgba(124,58,237,0.28)',
              transition: 'all 0.13s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5b21b6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7c3aed'; }}
          >
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.2" width="8" height="8">
              <path d="M5 1v8M1 5h8"/>
            </svg>
            Add Item
          </button>
        </div>

        {/* Body */}
        {peripherals.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, padding: '18px 12px', background: '#fdfcff',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e2d9f3" strokeWidth="1.3">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#b8aed8' }}>No peripherals added</span>
            <span style={{ fontSize: 10.5, color: '#c4b5fd', textAlign: 'center', lineHeight: 1.5 }}>
              Click <strong style={{ color: '#7c3aed' }}>Add Item</strong> to attach accessories — scanners, printers, displays, etc.
            </span>
          </div>
        ) : (
          <div style={{ padding: '10px 13px 12px', background: '#fdfcff' }}>
            {/* Col headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 28px',
              gap: 7, paddingBottom: 6,
              borderBottom: '1px solid rgba(124,58,237,0.07)', marginBottom: 7,
            }}>
              {['Model / Name', 'Serial No.', 'Warranty Date', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 8.5, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {peripherals.map(p => (
                <div
                  key={p.id}
                  style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 28px', gap: 7, alignItems: 'center' }}
                >
                  <input
                    style={PIn}
                    type="text"
                    placeholder="e.g. Barcode Scanner"
                    value={p.model}
                    onChange={e => updatePeripheral(p.id, 'model', e.target.value)}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.38)'; (e.target as HTMLInputElement).style.background = '#fff'; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.13)'; (e.target as HTMLInputElement).style.background = '#faf9ff'; }}
                  />
                  <input
                    style={PIn}
                    type="text"
                    placeholder="Serial No."
                    value={p.serial}
                    onChange={e => updatePeripheral(p.id, 'serial', e.target.value)}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.38)'; (e.target as HTMLInputElement).style.background = '#fff'; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.13)'; (e.target as HTMLInputElement).style.background = '#faf9ff'; }}
                  />
                  <input
                    style={{ ...PIn, colorScheme: 'light' as any }}
                    type="date"
                    value={p.warrantyDate}
                    onChange={e => updatePeripheral(p.id, 'warrantyDate', e.target.value)}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.38)'; (e.target as HTMLInputElement).style.background = '#fff'; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(124,58,237,0.13)'; (e.target as HTMLInputElement).style.background = '#faf9ff'; }}
                  />
                  <button
                    type="button"
                    onClick={() => removePeripheral(p.id)}
                    title="Remove"
                    style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: 'rgba(220,38,38,0.07)',
                      border: '1px solid rgba(220,38,38,0.16)',
                      color: '#dc2626', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0, transition: 'all 0.13s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(220,38,38,0.14)'; el.style.borderColor = 'rgba(220,38,38,0.34)'; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(220,38,38,0.07)'; el.style.borderColor = 'rgba(220,38,38,0.16)'; }}
                  >
                    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" width="8" height="8">
                      <path d="M1 1l8 8M9 1L1 9"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(124,58,237,0.06)' }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#c4b5fd" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
              </svg>
              <span style={{ fontSize: 9.5, color: '#c4b5fd' }}>
                Peripherals are saved to the database and linked to this POS machine.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, padding: '6px 10px', background: '#fee2e2', borderRadius: 7 }}>
          {error}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   PERIPHERALS VIEW MODAL
   Read-only view of saved peripherals for a POS.
───────────────────────────────────────────── */
export interface PeripheralsViewModalProps {
  posModel: string;
  peripherals: PeripheralItem[];
  onClose: () => void;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function wStatus(d: string): { color: string; label: string } {
  if (!d) return { color: '#b8aed8', label: 'No date' };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { color: '#dc2626', label: 'Expired' };
  if (days <= 30) return { color: '#d97706', label: `${days}d left` };
  if (days <= 90) return { color: '#0d9488', label: `${days}d left` };
  return { color: '#16a34a', label: `${days}d left` };
}

export function PeripheralsViewModal({ posModel, peripherals, onClose }: PeripheralsViewModalProps) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(12,5,30,0.58)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 620, maxWidth: '95vw',
          height: 520, maxHeight: '90vh',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 32px 80px rgba(12,5,30,0.34), 0 4px 20px rgba(12,5,30,0.14)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Gradient Header ── */}
        <div style={{
          padding: '20px 22px 18px',
          background: 'linear-gradient(135deg,#1a0752 0%,#2e1580 45%,#0a3a3a 100%)',
          flexShrink: 0, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -24, right: -24, width: 110, height: 110, borderRadius: '50%', background: 'rgba(124,58,237,0.22)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -32, right: 50, width: 90, height: 90, borderRadius: '50%', background: 'rgba(13,148,136,0.18)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 10, left: '40%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(167,139,250,0.1)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(124,58,237,0.32)',
              border: '1px solid rgba(167,139,250,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.6">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Peripherals & Accessories
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,0.7)" strokeWidth="1.8">
                    <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
                  </svg>
                  <span style={{ fontSize: 11.5, color: 'rgba(196,181,253,0.9)', fontWeight: 500 }}>
                    {posModel || 'POS Device'}
                  </span>
                </div>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(196,181,253,0.4)', display: 'inline-block' }} />
                <span style={{
                  background: peripherals.length > 0 ? 'rgba(124,58,237,0.4)' : 'rgba(100,116,139,0.3)',
                  border: `1px solid ${peripherals.length > 0 ? 'rgba(167,139,250,0.55)' : 'rgba(148,163,184,0.3)'}`,
                  borderRadius: 20, padding: '2px 10px',
                  fontSize: 10.5, fontWeight: 700,
                  color: peripherals.length > 0 ? '#c4b5fd' : 'rgba(196,181,253,0.6)',
                }}>
                  {peripherals.length} item{peripherals.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#e2d9f3', transition: 'all 0.14s', position: 'relative', zIndex: 1,
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.2)'; el.style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(255,255,255,0.1)'; el.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l9 9M10 1L1 10"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1, overflowY: 'auto', minHeight: 0,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent',
        } as React.CSSProperties}>

          {peripherals.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '44px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 62, height: 62, borderRadius: 18,
                background: 'linear-gradient(135deg,#f2f0fb,#ede9fe)',
                border: '1.5px solid rgba(124,58,237,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(124,58,237,0.08)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.3">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4a3870', marginBottom: 6 }}>
                  No peripherals recorded
                </div>
                <div style={{ fontSize: 11.5, color: '#b8aed8', lineHeight: 1.7, maxWidth: 280 }}>
                  No accessories were added when this POS was created. Peripherals can be attached the next time this device is edited.
                </div>
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['#', 'Model / Name', 'Serial No.', 'Warranty Date', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        position: 'sticky', top: 0, zIndex: 1,
                        background: '#f2f0fb',
                        padding: i === 0 ? '9px 10px 9px 22px' : '9px 16px',
                        fontSize: 9.5, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.09em',
                        color: '#8e7ec0', textAlign: 'left',
                        borderBottom: '1px solid rgba(124,58,237,0.12)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peripherals.map((p, idx) => {
                  const ws = wStatus(p.warrantyDate);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid rgba(124,58,237,0.07)', transition: 'background 0.12s' }}
                      onMouseEnter={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '#faf9ff')}
                      onMouseLeave={e => Array.from((e.currentTarget as HTMLTableRowElement).cells).forEach(td => (td as HTMLElement).style.background = '')}
                    >
                      {/* # */}
                      <td style={{ padding: '11px 10px 11px 22px', color: '#b8aed8', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {idx + 1}
                      </td>

                      {/* Model */}
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                            background: 'rgba(124,58,237,0.09)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.7">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a' }}>
                            {p.model || <span style={{ color: '#c4b5fd', fontWeight: 400, fontStyle: 'italic' }}>Unnamed</span>}
                          </span>
                        </div>
                      </td>

                      {/* Serial */}
                      <td style={{ padding: '11px 16px' }}>
                        {p.serial ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, color: '#4a3870',
                            background: 'rgba(124,58,237,0.07)',
                            border: '1px solid rgba(124,58,237,0.14)',
                            borderRadius: 6, padding: '3px 8px',
                            fontFamily: "'DM Mono', monospace, 'DM Sans', sans-serif",
                            letterSpacing: '0.02em', whiteSpace: 'nowrap',
                          }}>
                            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                              <rect x="2" y="4" width="10" height="6" rx="1.2"/><path d="M5 4V3M7 4V2.5M9 4V3"/>
                            </svg>
                            {p.serial}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Warranty Date */}
                      <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 600, color: '#18103a', whiteSpace: 'nowrap' }}>
                        {p.warrantyDate ? fmtDate(p.warrantyDate) : (
                          <span style={{ fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '11px 16px 11px 0' }}>
                        {p.warrantyDate ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 20,
                            background: ws.color + '14',
                            border: `1px solid ${ws.color}30`,
                            whiteSpace: 'nowrap',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ws.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: ws.color }}>{ws.label}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 22px',
          borderTop: '1px solid rgba(124,58,237,0.08)',
          background: '#f8f7ff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#c4b5fd" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
            </svg>
            <span style={{ fontSize: 10, color: '#b8aed8' }}>
              {peripherals.length > 0
                ? `${peripherals.length} peripheral${peripherals.length !== 1 ? 's' : ''} saved in database · view only`
                : 'No peripherals on record for this POS'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              ...MBtnS,
              padding: '7px 22px',
              fontSize: 12, fontWeight: 700,
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.28)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.16)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}










