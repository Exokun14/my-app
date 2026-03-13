'use client';

import React from 'react';

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
  industryType?:   string;       // maps to company.industry_type (DB enum)
  accountManager?: string;       // read-only display — pulled from client
  userRole?:       string;       // read-only display — pulled from client
  logoUrl?:        string;       // base64 data URL or https:// URL
  logoFile?:       File;         // the raw File object from <input type="file">
}

export interface POSFormData {
  model: string;
  /** License Number for this POS (auto-filled from branch for Retail/Warehouse; per-branch for Aloha) */
  licenseNumber: string;
  ip: string;
  os: string;
  msaStart: string;
  msaEnd: string;
  warrantyDate: string;
}

export const BLANK_POS_FORM: POSFormData = {
  model: 'PAX A920',
  licenseNumber: '',
  ip: '',
  os: 'Windows 10',
  msaStart: '',
  msaEnd: '',
  warrantyDate: '',
};

/* ─────────────────────────────────────────────
   ASTERISK — required field indicator
───────────────────────────────────────────── */
export function Asterisk() {
  return <span style={{ color: '#dc2626' }}>*</span>;
}

/* ─────────────────────────────────────────────
   GENERIC MODAL WRAPPER
───────────────────────────────────────────── */
export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,7,36,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div style={{
        width: wide ? 600 : 520, maxWidth: '96vw',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px',
          background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <rect x="2" y="2" width="14" height="14" rx="2"/><path d="M9 6v6M6 9h6"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
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

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 20px',
          borderTop: '1px solid rgba(124,58,237,0.1)',
          background: '#f8f7ff', flexShrink: 0,
        }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDIT SECTION — accordion-style form section
───────────────────────────────────────────── */
export function EditSection({
  icon,
  label,
  badge,
  action,
  children,
  last,
}: {
  icon: string;
  label: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: last ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: '#ede9fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>{label}</span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#8e7ec0',
          }}>
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
   POS FORM FIELDS — reusable inside branch modal
   licenseReadOnly: if true, license field is read-only (Retail/Warehouse auto-fill)
───────────────────────────────────────────── */
const POS_MODELS  = ['PAX A920', 'Sunmi T2', 'Ingenico Move5000', 'Verifone T650P', 'PAX S300'];
const OS_OPTIONS  = ['Windows 11', 'Windows 10', 'Windows 8.1', 'Windows 8', 'Windows 7'];

export function POSFormFields({
  form,
  onChange,
  error,
  licenseReadOnly = false,
}: {
  form: POSFormData;
  onChange: (f: POSFormData) => void;
  error: string;
  licenseReadOnly?: boolean;
}) {
  const set = (key: keyof POSFormData, val: string) => onChange({ ...form, [key]: val });

  const FSel: React.CSSProperties = {
    ...FIn,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  const FInReadOnly: React.CSSProperties = {
    ...FIn,
    background: '#ede9fe',
    color: '#7c3aed',
    fontWeight: 600,
    cursor: 'default',
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={FLbl}>Model</label>
          <select style={FSel} value={form.model} onChange={e => set('model', e.target.value)}>
            {POS_MODELS.map(m => <option key={m}>{m}</option>)}
          </select>
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
            type="text"
            placeholder="e.g. LIC-XXXX-0001"
            value={form.licenseNumber}
            readOnly={licenseReadOnly}
            onChange={e => !licenseReadOnly && set('licenseNumber', e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={FLbl}>IP Address <Asterisk /></label>
          <input style={FIn} type="text" placeholder="e.g. 192.168.1.10" value={form.ip} onChange={e => set('ip', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>Operating System</label>
          <select style={FSel} value={form.os} onChange={e => set('os', e.target.value)}>
            {OS_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={FLbl}>MSA Start</label>
          <input style={FIn} type="date" value={form.msaStart} onChange={e => set('msaStart', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>MSA End</label>
          <input style={FIn} type="date" value={form.msaEnd} onChange={e => set('msaEnd', e.target.value)} />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 10, padding: '6px 10px', background: '#fee2e2', borderRadius: 7 }}>
          {error}
        </div>
      )}
    </>
  );
}