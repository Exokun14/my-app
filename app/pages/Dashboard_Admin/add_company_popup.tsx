'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Client, ACCOUNT_MANAGERS, buildNewClient, ClientCategory } from './DshAdmFunc';

/* ─── Local types ───────────────────────────────────────────────────────────── */
interface AltContact { name: string; email: string; phone: string; }
interface AddClientFormState {
  logoFile:    File | null;
  logoPreview: string;
  logoUrl:     string;
  name: string; cat: ClientCategory | '';
  contact: string; email: string; phone: string; accountManager: string;
  altContacts: AltContact[];
}

const BLANK: AddClientFormState = {
  logoFile: null, logoPreview: '', logoUrl: '',
  name: '', cat: '', contact: '',
  email: '', phone: '', accountManager: '',
  altContacts: [],
};

const SELECT_STYLE: React.CSSProperties = {
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 11px center',
  paddingRight: 26,
  cursor: 'pointer',
};

const INDUSTRY_MAP: Record<string, string> = {
  'F&B':       'Aloha (Food & Beverage)',
  'Retail':    'Retail',
  'Warehouse': 'Warehouse',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

/* ─── Props ─────────────────────────────────────────────────────────────────── */
interface AddCompanyPopupProps {
  onAdd: (client: Client) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/* ══════════════════════════════════════════════════════════════════════════════
   AddCompanyPopup
   ══════════════════════════════════════════════════════════════════════════════ */
export default function AddCompanyPopup({ onAdd, onClose, showToast }: AddCompanyPopupProps) {
  const [form, setForm]         = useState<AddClientFormState>(BLANK);
  const [isSaving, setIsSaving] = useState(false);

  const [debouncedLogoUrl, setDebouncedLogoUrl] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedLogoUrl(form.logoUrl);
    }, 600);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [form.logoUrl]);

  const MAX_ALT = 2;

  const upd    = (f: AddClientFormState) => setForm(f);
  const set    = (k: keyof AddClientFormState, v: string) => upd({ ...form, [k]: v as any });
  const setAlt = (i: number, f: keyof AltContact, v: string) =>
    upd({ ...form, altContacts: form.altContacts.map((a, j) => j === i ? { ...a, [f]: v } : a) });
  const addAlt = () => form.altContacts.length < MAX_ALT &&
    upd({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] });
  const rmAlt  = (i: number) => upd({ ...form, altContacts: form.altContacts.filter((_, j) => j !== i) });

  /* ── File picker ── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('[AddCompanyPopup] handleFile — file selected:', file.name, file.type, file.size, 'bytes');
    const reader = new FileReader();
    reader.onload = ev => {
      console.log('[AddCompanyPopup] handleFile — FileReader done, setting preview');
      setDebouncedLogoUrl('');
      upd({
        ...form,
        logoFile:    file,
        logoPreview: ev.target?.result as string,
        logoUrl:     '',
      });
    };
    reader.readAsDataURL(file);
  };

  /* ── Clear logo ── */
  const clearLogo = () => {
    console.log('[AddCompanyPopup] clearLogo called');
    setDebouncedLogoUrl('');
    setForm(prev => ({ ...prev, logoUrl: '', logoPreview: '', logoFile: null }));
  };

  /* ── handleSave ── */
  const handleSave = async () => {
    console.log('[AddCompanyPopup] handleSave triggered');
    const f = form;

    if (!f.cat) {
      console.warn('[AddCompanyPopup] Validation failed — missing category');
      showToast('Please fill in all required fields.');
      return;
    }

    const tempLogoSrc = f.logoPreview || f.logoUrl || '';

    const newClient = buildNewClient(
      f.name, f.contact, f.email, f.phone, f.cat as ClientCategory, '', 0,
      f.accountManager, tempLogoSrc, f.altContacts.filter(a => a.name.trim()),
    );

    if (!newClient) {
      console.warn('[AddCompanyPopup] buildNewClient returned null — missing required fields');
      showToast('Please fill in all required fields.');
      return;
    }

    console.log('[AddCompanyPopup] newClient built:', newClient);

    /* ── Build FormData ── */
    const body = new FormData();
    body.append('company_name',   f.name.trim());
    body.append('industry_type',  INDUSTRY_MAP[f.cat]);
    body.append('contact_person', f.contact.trim());
    body.append('email',          f.email.trim());
    if (f.phone.trim())   body.append('phone',           f.phone.trim());
    if (f.accountManager) body.append('account_manager', f.accountManager);

    if (f.logoFile) {
      console.log('[AddCompanyPopup] logo — using file upload:', f.logoFile.name);
      body.append('company_logo', f.logoFile);
    } else if (f.logoUrl.trim()) {
      console.log('[AddCompanyPopup] logo — using URL:', f.logoUrl.trim());
      body.append('company_logo_url', f.logoUrl.trim());
    } else {
      console.log('[AddCompanyPopup] logo — none provided');
    }

    const altContactsPayload = f.altContacts
      .filter(a => a.name.trim())
      .map(a => ({ name: a.name.trim(), email: a.email.trim(), phone: a.phone.trim() }));

    body.append('alt_contacts', JSON.stringify(altContactsPayload));
    console.log('[AddCompanyPopup] altContactsPayload:', altContactsPayload);

    /* ── FIX: Fetch CSRF cookie before POST (required by Laravel Sanctum) ── */
    setIsSaving(true);
    try {
      console.log('[AddCompanyPopup] fetching CSRF cookie from', `${API_BASE}/sanctum/csrf-cookie`);
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
      });
      console.log('[AddCompanyPopup] CSRF cookie fetched OK');
    } catch (err) {
      console.error('[AddCompanyPopup] CSRF fetch failed:', err);
    }

    /* ── POST to Laravel ── */
    try {
      const url = `${API_BASE}/api/companies`;
      console.log('[AddCompanyPopup] POST →', url);

      /* Read the XSRF-TOKEN cookie that Sanctum just set */
      const xsrfMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
      const xsrfToken = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : '';
      console.log('[AddCompanyPopup] XSRF token:', xsrfToken ? xsrfToken.slice(0, 20) + '...' : 'MISSING');

      const response = await fetch(url, {
        method:      'POST',
        credentials: 'include',
        headers:     {
          'Accept':       'application/json',
          'X-XSRF-TOKEN': xsrfToken,
        },
        body,
      });

      console.log('[AddCompanyPopup] response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('[AddCompanyPopup] response body:', data);

      if (!response.ok) {
        if (data.errors) {
          const messages = Object.values(data.errors as Record<string, string[]>).flat().join(' ');
          console.warn('[AddCompanyPopup] Validation errors from server:', data.errors);
          showToast(`Validation error: ${messages}`);
        } else {
          console.warn('[AddCompanyPopup] Server error:', data.message);
          showToast(`Server error: ${data.message ?? 'Unknown error'}`);
        }
        setIsSaving(false);
        return;
      }

      console.log('[AddCompanyPopup] Company created successfully — id:', data.id, '| logo_path:', data.logo_path);
      newClient.id = data.id;
      if (data.logo_path) newClient.logo = data.logo_path;

    } catch (err) {
      console.error('[AddCompanyPopup] Network error:', err);
      showToast('Network error — could not reach the server. Is Laravel running?');
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onAdd(newClient);
    showToast(`Company "${newClient.name}" added successfully!`);
    console.log('[AddCompanyPopup] done — closing popup');
    onClose();
  };

  const logoSrc = form.logoPreview || debouncedLogoUrl;
  const canSave = !!(form.name.trim() && form.cat && form.contact.trim() && form.email.trim()) && !isSaving;

  /* ── Shared style helpers ── */
  const inp: React.CSSProperties = {
    background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 8,
    padding: '8px 11px', fontFamily: 'DM Sans,sans-serif', fontSize: 12.5,
    color: '#18103a', outline: 'none', transition: 'all 0.16s', width: '100%', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: '#4a3870',
    letterSpacing: '0.04em', display: 'block', marginBottom: 4,
  };
  const miniBtn = (onClick: () => void, txt: string) => (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 10.5, fontWeight: 600, borderRadius: 8, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#4a3870', cursor: 'pointer', transition: 'all 0.16s', whiteSpace: 'nowrap' as const }}
    >
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 10, height: 10 }}><path d="M6 1v10M1 6h10"/></svg>
      {txt}
    </button>
  );
  const rmBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
      Remove
    </button>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,10,40,0.4)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="_mIn"
        style={{ background: '#fff', borderRadius: 16, width: 660, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 70px rgba(20,10,40,0.2),0 0 0 1px rgba(124,58,237,0.1)' }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg,#5b21b6,#0d9488)', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><rect x="2" y="2" width="14" height="14" rx="2"/><path d="M9 6v6M6 9h6"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Add New Company</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>Register a new client account with contact &amp; billing info</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, transition: 'all 0.14s' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Logo */}
          <Sec icon="🖼️" label="Company Logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: 18, flexShrink: 0, background: '#f2f0fb', border: '2px dashed rgba(124,58,237,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logoSrc
                  ? (
                    <img
                      src={logoSrc}
                      alt="preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                      onError={() => {
                        console.warn('[AddCompanyPopup] logo img onError — clearing logo state');
                        setForm(prev => ({ ...prev, logoPreview: '', logoUrl: '' }));
                        setDebouncedLogoUrl('');
                      }}
                    />
                  )
                  : (
                    <div style={{ textAlign: 'center', color: '#b8aed8', fontSize: 10, lineHeight: 1.4 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>No logo
                    </div>
                  )
                }
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {/* File upload */}
                <div>
                  <label style={lbl}>
                    Upload from device
                    <span style={{ marginLeft: 6, fontSize: 9.5, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>
                      (saved as <em>company_name.ext</em>)
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', fontSize: 11.5, fontWeight: 600, color: '#4a3870' }}>
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 12, height: 12 }}><path d="M7 1v8M4 4l3-3 3 3M2 11h10"/></svg>
                      Choose File
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                    </label>
                    {form.logoFile && (
                      <span style={{ fontSize: 10.5, color: '#7c3aed', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                        ✓ {form.logoFile.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* URL paste */}
                <div>
                  <label style={lbl}>Or paste image URL</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={{
                        ...inp, flex: 1, fontSize: 11.5,
                        opacity: form.logoFile ? 0.45 : 1,
                        cursor:  form.logoFile ? 'not-allowed' : 'text',
                      }}
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={form.logoUrl}
                      disabled={!!form.logoFile}
                      onChange={e => setForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                    {(form.logoUrl || logoSrc) && (
                      <button
                        style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                        onClick={clearLogo}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Status hints below the URL input */}
                  {form.logoUrl.trim() && !form.logoFile && (
                    debouncedLogoUrl === form.logoUrl ? (
                      <div style={{ marginTop: 5, fontSize: 10, color: '#0d9488', fontWeight: 500 }}>
                        ✓ URL will be saved directly to the database
                      </div>
                    ) : (
                      <div style={{ marginTop: 5, fontSize: 10, color: '#8e7ec0', fontWeight: 500 }}>
                        ⏳ Loading preview…
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </Sec>

          {/* Company Info */}
          <Sec icon="🏢" label="Company Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div>
                <label style={lbl}>Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={inp} type="text" placeholder="e.g. Starbucks PH" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Type of Industry <span style={{ color: '#dc2626' }}>*</span></label>
                <select style={{ ...inp, ...SELECT_STYLE }} value={form.cat} onChange={e => set('cat', e.target.value)}>
                  <option value="">Select industry…</option>
                  <option value="F&B">Aloha (Food &amp; Beverage)</option>
                  <option value="Retail">Retail</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div>
                <label style={lbl}>Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={inp} type="text" placeholder="Full name" value={form.contact} onChange={e => set('contact', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={inp} type="email" placeholder="contact@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div>
                <label style={lbl}>Phone</label>
                <input style={inp} type="tel" placeholder="+63 2 XXXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Account Manager</label>
                <select style={{ ...inp, ...SELECT_STYLE }} value={form.accountManager} onChange={e => set('accountManager', e.target.value)}>
                  <option value="">Select…</option>
                  {ACCOUNT_MANAGERS.map(am => <option key={am}>{am}</option>)}
                </select>
              </div>
            </div>
          </Sec>

          {/* Alternate Contacts */}
          <Sec
            icon="📋" label="Alternate Contacts"
            badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={form.altContacts.length < MAX_ALT ? miniBtn(addAlt, 'Add Contact') : <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>}
            last
          >
            {form.altContacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 14, color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                No alternate contacts. <span onClick={addAlt} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
              </div>
            )}
            {form.altContacts.map((alt, i) => (
              <div key={i} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alternate Contact {i + 1}</span>
                  {rmBtn(() => rmAlt(i))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                  <div><label style={lbl}>Contact Person</label><input style={inp} type="text" placeholder="Full name" value={alt.name} onChange={e => setAlt(i, 'name', e.target.value)} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="email@company.com" value={alt.email} onChange={e => setAlt(i, 'email', e.target.value)} /></div>
                </div>
                <div style={{ maxWidth: '50%' }}><label style={lbl}>Phone</label><input style={inp} type="tel" placeholder="+63 9XX XXX XXXX" value={alt.phone} onChange={e => setAlt(i, 'phone', e.target.value)} /></div>
              </div>
            ))}
          </Sec>

        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 18px 14px', borderTop: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: '#b8aed8', fontStyle: 'italic' }}>
            {isSaving
              ? '⏳ Saving to database…'
              : !canSave
                ? 'Fill in required fields (marked with *)'
                : '✓ Ready to add company'}
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.5 : 1, transition: 'all 0.16s' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 24px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: 'white', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: isSaving ? 'linear-gradient(135deg,#a78bfa,#5eead4)' : 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 3px 14px rgba(124,58,237,0.32)', opacity: canSave ? 1 : 0.55, transition: 'all 0.16s' }}
          >
            {isSaving ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 12, height: 12 }}><path d="M7 1v12M1 7h12"/></svg>
                Add Company
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sec ────────────────────────────────────────────────────────────────────── */
function Sec({ icon, label, badge, action, children, last }: {
  icon: string; label: string; badge?: string;
  action?: React.ReactNode; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>{label}</span>
        {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#8e7ec0' }}>{badge}</span>}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}
