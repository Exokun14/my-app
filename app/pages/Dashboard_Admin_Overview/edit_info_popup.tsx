'use client';

import React, { useRef, useState } from 'react';
import { Client } from './dashboard_overview_func';
import {
  MBtnS, MBtnP, MBtnXS,
  FLbl, FIn,
  Asterisk, EditSection,
  AltContact, EditInfoFormState,
} from './popup_shared';

/* ─────────────────────────────────────────────
   SHARED STYLES
───────────────────────────────────────────── */
const FReadOnly: React.CSSProperties = {
  ...FIn,
  background: '#f5f4fc',
  fontWeight: 600,
  cursor: 'not-allowed',
  userSelect: 'none' as const,
};

/* ─────────────────────────────────────────────
   PROPS
───────────────────────────────────────────── */
interface Props {
  client: Client;
  form: EditInfoFormState;
  onChange: (form: EditInfoFormState) => void;
  onSave: () => void;
  onClose: () => void;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function EditInfoPopup({ client, form, onChange, onSave, onClose }: Props) {
  const MAX_ALT   = 2;
  const canAddAlt = form.altContacts.length < MAX_ALT;
  const fileRef   = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string>(
    form.logoUrl ?? (typeof client.logo === 'string' ? client.logo : '') ?? ''
  );

  const set    = (key: keyof EditInfoFormState, val: string) => onChange({ ...form, [key]: val });
  const setAlt = (idx: number, field: keyof AltContact, val: string) =>
    onChange({ ...form, altContacts: form.altContacts.map((a, i) => i === idx ? { ...a, [field]: val } : a) });
  const addAlt    = () => { if (!canAddAlt) return; onChange({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] }); };
  const removeAlt = (idx: number) => onChange({ ...form, altContacts: form.altContacts.filter((_, i) => i !== idx) });

  /* ── Logo: file upload ── */
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      onChange({ ...form, logoUrl: url, logoFile: file });
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoPreview('');
    if (fileRef.current) fileRef.current.value = '';
    onChange({ ...form, logoUrl: '', logoFile: undefined });
  };

  /* ── Initials fallback ── */
  const initials = (() => {
    const parts = (form.storeName || client.name || '').trim().split(' ');
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

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
        width: 660, maxWidth: '96vw', maxHeight: '92vh',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Edit General Information</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {client.name} — update contact &amp; account details
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ════ COMPANY LOGO ════ */}
          <EditSection icon="🖼️" label="Company Logo">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>

              {/* Preview box */}
              <div style={{
                width: 80, height: 80, borderRadius: 14, flexShrink: 0,
                background: logoPreview ? '#fff' : '#f0edfb',
                border: '1.5px dashed rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="logo preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                    onError={() => setLogoPreview('')}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.03em' }}>
                      {initials}
                    </div>
                    <div style={{ fontSize: 9, color: '#c4b5fd', marginTop: 2 }}>No logo</div>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Upload from device label */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4a3870' }}>Upload from device</span>
                    <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>(saved as company_name.ext)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 16px', borderRadius: 8,
                        border: '1.5px solid rgba(124,58,237,0.25)',
                        background: '#f5f3ff', color: '#4a3870',
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'DM Sans',sans-serif", transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ede9fe'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f3ff'; }}
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
                        <path d="M7 1v8M4 4L7 1l3 3M2 11v1a1 1 0 001 1h8a1 1 0 001-1v-1"/>
                      </svg>
                      Choose File
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={clearLogo}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '7px 12px', borderRadius: 8,
                          border: '1.5px solid rgba(220,38,38,0.2)',
                          background: '#fff5f5', color: '#dc2626',
                          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                          <path d="M1 1l10 10M11 1L1 11"/>
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* URL paste */}
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#4a3870', marginBottom: 6 }}>
                    Or paste image URL
                  </div>
                  <input
                    style={{ ...FIn, fontSize: 11.5 }}
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={
                      form.logoFile
                        ? ''
                        : (form.logoUrl?.startsWith('data:') ? '' : (form.logoUrl ?? ''))
                    }
                    onChange={e => {
                      const url = e.target.value;
                      setLogoPreview(url);
                      onChange({ ...form, logoUrl: url, logoFile: undefined });
                    }}
                  />
                </div>

              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoFile}
              />
            </div>
          </EditSection>

          {/* ════ PRIMARY CONTACT ════ */}
          <EditSection icon="👤" label="Primary Contact">

            {/* Row 1 — Company Name + Contact Person */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Store / Company Name <Asterisk /></label>
                <input style={FIn} type="text" value={form.storeName} onChange={e => set('storeName', e.target.value)} />
              </div>
              <div>
                <label style={FLbl}>Contact Person <Asterisk /></label>
                <input style={FIn} type="text" value={form.contact} onChange={e => set('contact', e.target.value)} />
              </div>
            </div>

            {/* Row 2 — Email + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Email <Asterisk /></label>
                <input style={FIn} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={FLbl}>Phone</label>
                <input style={FIn} type="tel" placeholder="+63 2 XXXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>

          </EditSection>

          {/* ════ ALTERNATE CONTACT ════ */}
          <EditSection
            icon="📋"
            label="Alternate Contact"
            badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={
              canAddAlt
                ? (
                  <button
                    style={{ ...MBtnXS, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={addAlt}
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10">
                      <path d="M6 1v10M1 6h10"/>
                    </svg>
                    Add Contact
                  </button>
                )
                : <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>
            }
          >
            {form.altContacts.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '16px 0', color: '#8e7ec0', fontSize: 12,
                background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)',
              }}>
                No alternate contacts.{' '}
                <span onClick={addAlt} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>
                  Add one
                </span>
              </div>
            )}

            {form.altContacts.map((alt, idx) => (
              <div key={idx} style={{
                background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)',
                borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Alternate Contact {idx + 1}
                  </span>
                  <button
                    style={{ ...MBtnXS, background: '#fee2e2', color: '#dc2626', border: 'none' }}
                    onClick={() => removeAlt(idx)}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={FLbl}>Full Name</label>
                    <input style={FIn} type="text" placeholder="Contact person" value={alt.name} onChange={e => setAlt(idx, 'name', e.target.value)} />
                  </div>
                  <div>
                    <label style={FLbl}>Email</label>
                    <input style={FIn} type="email" placeholder="email@company.com" value={alt.email} onChange={e => setAlt(idx, 'email', e.target.value)} />
                  </div>
                </div>
                <div style={{ maxWidth: '50%' }}>
                  <label style={FLbl}>Phone</label>
                  <input style={FIn} type="tel" placeholder="+63 9XX XXX XXXX" value={alt.phone} onChange={e => setAlt(idx, 'phone', e.target.value)} />
                </div>
              </div>
            ))}
          </EditSection>

          

        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 20px',
          borderTop: '1px solid rgba(124,58,237,0.1)',
          background: '#f8f7ff', flexShrink: 0,
        }}>
          <button style={MBtnS} onClick={onClose}>Cancel</button>
          <button style={MBtnP} onClick={onSave}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
              <path d="M2 7.5l3.5 3.5 6.5-7"/>
            </svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}













