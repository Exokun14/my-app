'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Client } from './dashboard_overview_func';
import {
  MBtnS, MBtnP, MBtnXS,
  FLbl, FIn,
  Asterisk, EditSection,
  AltContact, EditInfoFormState,
} from './popup_shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

const FReadOnly: React.CSSProperties = {
  ...FIn,
  background: '#f5f4fc',
  fontWeight: 600,
  cursor: 'not-allowed',
  userSelect: 'none' as const,
};

type SaveState = 'idle' | 'saving' | 'success' | 'error';

/* ─── Country dial codes ─────────────────────────────────────────────────── */
const COUNTRY_CODES = [
  { code: '+63',  flag: '🇵🇭' },
  { code: '+1',   flag: '🇺🇸' },
  { code: '+44',  flag: '🇬🇧' },
  { code: '+61',  flag: '🇦🇺' },
  { code: '+64',  flag: '🇳🇿' },
  { code: '+65',  flag: '🇸🇬' },
  { code: '+60',  flag: '🇲🇾' },
  { code: '+66',  flag: '🇹🇭' },
  { code: '+62',  flag: '🇮🇩' },
  { code: '+84',  flag: '🇻🇳' },
  { code: '+82',  flag: '🇰🇷' },
  { code: '+81',  flag: '🇯🇵' },
  { code: '+86',  flag: '🇨🇳' },
  { code: '+91',  flag: '🇮🇳' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+966', flag: '🇸🇦' },
  { code: '+49',  flag: '🇩🇪' },
  { code: '+33',  flag: '🇫🇷' },
  { code: '+39',  flag: '🇮🇹' },
  { code: '+34',  flag: '🇪🇸' },
  { code: '+55',  flag: '🇧🇷' },
  { code: '+52',  flag: '🇲🇽' },
  { code: '+27',  flag: '🇿🇦' },
  { code: '+234', flag: '🇳🇬' },
];

/* ─── CountryCodePicker ──────────────────────────────────────────────────── */
function CountryCodePicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRY_CODES.find(c => c.code === value) ?? COUNTRY_CODES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#ede9fe',
          border: 'none',
          borderRight: '1px solid rgba(124,58,237,0.18)',
          borderRadius: '7px 0 0 7px',
          padding: '0 10px',
          fontSize: 12, fontWeight: 700, color: '#4a3870',
          fontFamily: "'DM Sans',sans-serif",
          cursor: 'pointer', whiteSpace: 'nowrap' as const,
          height: '100%', minWidth: 88,
        }}
      >
        <span style={{ fontSize: 14 }}>{selected.flag}</span>
        <span>{selected.code}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ width: 8, height: 8, marginLeft: 2, opacity: 0.6 }}>
          <path d="M1 1l4 4 4-4" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
          background: '#fff', borderRadius: 10,
          border: '1px solid rgba(124,58,237,0.18)',
          boxShadow: '0 8px 28px rgba(20,10,40,0.14)',
          maxHeight: 210, overflowY: 'auto', minWidth: 130,
        }}>
          {COUNTRY_CODES.map(c => (
            <button
              key={c.code} type="button"
              onClick={() => { onChange(c.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px',
                background: c.code === value ? '#ede9fe' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: c.code === value ? 700 : 500,
                color: c.code === value ? '#5b21b6' : '#18103a',
                fontFamily: "'DM Sans',sans-serif", textAlign: 'left' as const,
              }}
              onMouseEnter={e => { if (c.code !== value) (e.currentTarget as HTMLButtonElement).style.background = '#f5f3ff'; }}
              onMouseLeave={e => { if (c.code !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15 }}>{c.flag}</span>
              <span style={{ fontSize: 12 }}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Parse "+63 9171234567" → ['+63', '9171234567'] */
function parsePhone(phone: string): [string, string] {
  const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const code   = COUNTRY_CODES.find(c => c.code === match[1]) ? match[1] : '+63';
    const digits = match[2].replace(/\D/g, '').slice(0, 11);
    return [code, digits];
  }
  return ['+63', phone.replace(/\D/g, '').slice(0, 11)];
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  client: Client;
  form: EditInfoFormState;
  onChange: (form: EditInfoFormState) => void;
  onSaved?: (updated: {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string | null;
    logo_path: string | null;
    alternate_contact_1: number | null;
    alternate_contact_2: number | null;
  }) => void;
  onClose: () => void;
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const snippet = text.slice(0, 200).replace(/<[^>]+>/g, '').trim().slice(0, 120);
    throw new Error(`Server returned a non-JSON response (HTTP ${res.status})${snippet ? `: ${snippet}` : '.'}`);
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function EditInfoPopup({ client, form, onChange, onSaved, onClose }: Props) {
  const MAX_ALT   = 2;
  const canAddAlt = form.altContacts.length < MAX_ALT;
  const fileRef   = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string>(
    form.logoUrl ?? (typeof client.logo === 'string' ? client.logo : '') ?? ''
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string>('');

  /* ── Phone state ── pre-populated from form.phone ── */
  const [phoneCode,   setPhoneCode]   = useState('+63');
  const [phoneDigits, setPhoneDigits] = useState('');

  const fullPhone = phoneDigits ? `${phoneCode} ${phoneDigits}` : '';

  /* Parse existing phone on mount */
  useEffect(() => {
    const [code, digits] = parsePhone(form.phone ?? '');
    setPhoneCode(code);
    setPhoneDigits(digits);
  }, []);

  function handlePhoneDigits(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 11));
  }

  const set    = (key: keyof EditInfoFormState, val: string) => onChange({ ...form, [key]: val });
  const setAlt = (idx: number, field: keyof AltContact, val: string) =>
    onChange({ ...form, altContacts: form.altContacts.map((a, i) => i === idx ? { ...a, [field]: val } : a) });
  const addAlt    = () => { if (!canAddAlt) return; onChange({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] }); };
  const removeAlt = (idx: number) => onChange({ ...form, altContacts: form.altContacts.filter((_, i) => i !== idx) });

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

  const initials = (() => {
    const parts = (form.storeName || client.name || '').trim().split(' ');
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const handleSave = async () => {
    /* ── Required field validation ── */
    if (!form.storeName.trim()) { setSaveError('Store / Company Name is required.'); setSaveState('error'); return; }
    if (!form.contact.trim())   { setSaveError('Contact Person is required.');       setSaveState('error'); return; }
    if (!form.email.trim())     { setSaveError('Email is required.');                setSaveState('error'); return; }
    if (!phoneDigits.trim())    { setSaveError('Phone is required.');                setSaveState('error'); return; }

    setSaveState('saving');
    setSaveError('');

    try {
      const data = new FormData();
      data.append('company_name',   form.storeName.trim());
      data.append('contact_person', form.contact.trim());
      data.append('email',          form.email.trim());
      data.append('phone',          fullPhone);

      /* ── License & Activation fields ── */
      if (form.krunchNum?.trim())     data.append('krunch_id',        form.krunchNum.trim());
      if (form.saStart?.trim())       data.append('activation_code',  form.saStart.trim());

      if (form.logoFile instanceof File) {
        data.append('company_logo', form.logoFile);
      } else {
        const logoUrl = form.logoUrl?.startsWith('data:') ? '' : (form.logoUrl ?? '');
        data.append('company_logo_url', logoUrl);
      }

      const validAlts = form.altContacts.filter(a => a.name.trim());
      data.append('alt_contacts', JSON.stringify(validAlts));
      data.append('_method', 'PUT');

      const res = await fetch(`${API_BASE}/api/companies/${client.id}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });

      const json = await safeJson(res);
      if (!res.ok || !json.success) throw new Error((json.message as string) ?? `Server error ${res.status}`);

      setSaveState('success');
      onSaved?.({
        company_name:        form.storeName.trim(),
        contact_person:      form.contact.trim(),
        email:               form.email.trim(),
        phone:               fullPhone || null,
        logo_path:           (json.logo_path as string) ?? null,
        alternate_contact_1: (json.alternate_contact_1 as number) ?? null,
        alternate_contact_2: (json.alternate_contact_2 as number) ?? null,
      });

      setTimeout(() => { setSaveState('idle'); onClose(); }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setSaveError(msg);
      setSaveState('error');
    }
  };

  const saveBtnContent = () => {
    if (saveState === 'saving') return (
      <>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Saving…
      </>
    );
    if (saveState === 'success') return (
      <>
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M2 7.5l3.5 3.5 6.5-7"/>
        </svg>
        Saved!
      </>
    );
    return (
      <>
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
          <path d="M2 7.5l3.5 3.5 6.5-7"/>
        </svg>
        Save Changes
      </>
    );
  };

  const saveBtnStyle: React.CSSProperties = {
    ...MBtnP,
    opacity: saveState === 'saving' ? 0.75 : 1,
    background: saveState === 'success'
      ? 'linear-gradient(135deg,#16a34a,#15803d)'
      : (MBtnP as React.CSSProperties).background,
    transition: 'background 0.25s, opacity 0.2s',
    pointerEvents: saveState === 'saving' ? 'none' : 'auto',
  };

  /* ── Shared input style for read-hint fields ── */
  const FInHint: React.CSSProperties = {
    ...FIn,
    paddingRight: 36,
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
        width: 660, maxWidth: '96vw', maxHeight: '92vh',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'visible', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', flexShrink: 0,
          borderRadius: '18px 18px 0 0',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ════ COMPANY LOGO ════ */}
          <EditSection icon="🖼️" label="Company Logo">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 14, flexShrink: 0, background: logoPreview ? '#fff' : '#f0edfb', border: '1.5px dashed rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={() => setLogoPreview('')} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.03em' }}>{initials}</div>
                    <div style={{ fontSize: 9, color: '#c4b5fd', marginTop: 2 }}>No logo</div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4a3870' }}>Upload from device</span>
                    <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>(saved as company_name.ext)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.25)', background: '#f5f3ff', color: '#4a3870', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12"><path d="M7 1v8M4 4L7 1l3 3M2 11v1a1 1 0 001 1h8a1 1 0 001-1v-1"/></svg>
                      Choose File
                    </button>
                    {logoPreview && (
                      <button type="button" onClick={clearLogo}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1.5px solid rgba(220,38,38,0.2)', background: '#fff5f5', color: '#dc2626', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M1 1l10 10M11 1L1 11"/></svg>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#4a3870', marginBottom: 6 }}>Or paste image URL</div>
                  <input style={{ ...FIn, fontSize: 11.5 }} type="url" placeholder="https://example.com/logo.png"
                    value={form.logoFile ? '' : (form.logoUrl?.startsWith('data:') ? '' : (form.logoUrl ?? ''))}
                    onChange={e => { const url = e.target.value; setLogoPreview(url); onChange({ ...form, logoUrl: url, logoFile: undefined }); }} />
                </div>
              </div>

              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoFile} />
            </div>
          </EditSection>

          {/* ════ PRIMARY CONTACT ════ */}
          <EditSection icon="👤" label="Primary Contact">
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Email <Asterisk /></label>
                <input style={FIn} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={FLbl}>
                  Phone <Asterisk />
                  <span style={{ marginLeft: 5, fontSize: 9.5, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>(digits only, max 11)</span>
                </label>
                {/* Phone pill */}
                <div style={{ display: 'flex', height: 34, borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: '#f2f0fb', overflow: 'visible' }}>
                  <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
                  <input
                    type="tel" inputMode="numeric" placeholder="9171234567"
                    value={phoneDigits} onChange={handlePhoneDigits} maxLength={11}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 10px', fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, color: '#18103a', outline: 'none', width: 0 }}
                  />
                </div>
                {phoneDigits && (
                  <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 500, marginTop: 3 }}>
                    Stored as: <strong>{fullPhone}</strong>
                  </div>
                )}
              </div>
            </div>
          </EditSection>

          {/* ════ LICENSE & ACTIVATION ════ */}
          <EditSection icon="🔑" label="License & Activation">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Krunch Number → krunch_id table */}
              <div>
                <label style={FLbl}>
                  Krunch Number
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: '#0d9488', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 4, padding: '1px 6px' }}>
                    krunch_id table
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={FInHint}
                    type="text"
                    placeholder="e.g. KRN-00123"
                    value={form.krunchNum ?? ''}
                    onChange={e => set('krunchNum', e.target.value)}
                  />
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4">
                      <path d="M10.5 1.5l4 4-7 7H4v-3.5l6.5-7.5z"/>
                      <circle cx="12.5" cy="3.5" r="1.2" fill="#c4b5fd" stroke="none"/>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: 9.5, color: '#b8aed8', marginTop: 3 }}>
                  Saved to <code style={{ background: '#f2f0fb', padding: '1px 4px', borderRadius: 3, fontSize: 9 }}>krunch_id.krunch</code>
                </div>
              </div>

              {/* Activation Code → company.activation_code */}
              <div>
                <label style={FLbl}>
                  Activation Code
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 600, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4, padding: '1px 6px' }}>
                    company table
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={FInHint}
                    type="text"
                    placeholder="e.g. ACT-2024-XXXX"
                    value={form.saStart ?? ''}
                    onChange={e => set('saStart', e.target.value)}
                  />
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4">
                      <rect x="3" y="7" width="10" height="7" rx="1.5"/>
                      <path d="M5 7V5a3 3 0 016 0v2"/>
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: 9.5, color: '#b8aed8', marginTop: 3 }}>
                  Saved to <code style={{ background: '#f2f0fb', padding: '1px 4px', borderRadius: 3, fontSize: 9 }}>company.activation_code</code>
                </div>
              </div>
            </div>

            {/* Info banner */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(13,148,136,0.04))',
              border: '1px solid rgba(124,58,237,0.1)',
              borderRadius: 10, padding: '10px 13px', marginTop: 2,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8e7ec0" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
              </svg>
              <div style={{ fontSize: 10.5, color: '#6b5fa0', lineHeight: 1.6 }}>
                <strong>Krunch Number</strong> is stored in the <code style={{ background: 'rgba(124,58,237,0.08)', padding: '1px 4px', borderRadius: 3 }}>krunch_id</code> table linked to this company.{' '}
                <strong>Activation Code</strong> is stored directly on the <code style={{ background: 'rgba(124,58,237,0.08)', padding: '1px 4px', borderRadius: 3 }}>company</code> record.
              </div>
            </div>
          </EditSection>

          {/* ════ ALTERNATE CONTACT ════ */}
          <EditSection
            icon="📋" label="Alternate Contact"
            badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={
              canAddAlt
                ? <button style={{ ...MBtnXS, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={addAlt}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10"/></svg>
                    Add Contact
                  </button>
                : <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>
            }
          >
            {form.altContacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                No alternate contacts.{' '}
                <span onClick={addAlt} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
              </div>
            )}

            {form.altContacts.map((alt, idx) => (
              <div key={idx} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alternate Contact {idx + 1}</span>
                  <button style={{ ...MBtnXS, background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => removeAlt(idx)}>Remove</button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0, borderRadius: '0 0 18px 18px' }}>
          {saveState === 'error' && saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: 11.5, fontWeight: 500 }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="13" height="13">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7M7 9.5h.01"/>
              </svg>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={MBtnS} onClick={onClose} disabled={saveState === 'saving'}>Cancel</button>
            <button style={saveBtnStyle} onClick={handleSave}>{saveBtnContent()}</button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}