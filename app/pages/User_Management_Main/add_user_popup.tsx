'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { AddUserForm, EMPTY_ADD_FORM } from './user_functions';
import {
  StatusRadioGroup,
  PasswordField,
  FieldLabel,
  FInput,
  FSelect,
} from './popup_shared_components';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

export interface AddUserPopupProps {
  open:      boolean;
  companies: string[];
  onClose:   () => void;
  onAdd:     (form: AddUserForm) => string | null;
}

interface ApiCompany { id: number; company_name: string; }

// ── Auto access_id map — derived from selected role ────────────────────────
const ROLE_ACCESS_ID: Record<string, string> = {
  'System Admin': '11',
  'Manager':      '22',
  'User':         '33',
};

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
          background: 'var(--purple-lt, #ede9fe)',
          border: 'none',
          borderRight: '1px solid rgba(124,58,237,0.18)',
          borderRadius: '7px 0 0 7px',
          padding: '0 10px',
          fontSize: 12, fontWeight: 700, color: 'var(--purple, #4a3870)',
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
              key={c.code}
              type="button"
              onClick={() => { onChange(c.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px',
                background: c.code === value ? 'var(--purple-lt,#ede9fe)' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: c.code === value ? 700 : 500,
                color: c.code === value ? 'var(--purple,#5b21b6)' : 'var(--t1,#18103a)',
                fontFamily: "'DM Sans',sans-serif",
                textAlign: 'left' as const,
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

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function slugify(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function renameProfilePhoto(file: File, fullName: string): File {
  const ext     = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const slug    = slugify(fullName) || 'user';
  const newName = `${slug}_${Date.now()}.${ext}`;
  return new File([file], newName, { type: file.type });
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function AddUserPopup({
  open, companies: fallbackCompanies, onClose, onAdd,
}: AddUserPopupProps) {
  const [form,        setForm]        = useState<AddUserForm>({ ...EMPTY_ADD_FORM });
  const [phoneCode,   setPhoneCode]   = useState('+63');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [matchMsg,    setMatchMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [companies,   setCompanies]   = useState<ApiCompany[]>([]);
  const [compLoading, setCompLoading] = useState(false);

  const fullPhone     = phoneDigits ? `${phoneCode} ${phoneDigits}` : '';
  const isSystemAdmin = form.role === 'System Admin';

  // ── When role changes: auto-set accessId, clear company for System Admin ──
  function handleRoleChange(newRole: string) {
    setForm(f => ({
      ...f,
      role:     newRole,
      accessId: ROLE_ACCESS_ID[newRole] ?? '',
      // System Admins don't belong to a company — clear it automatically
      company:  newRole === 'System Admin' ? '' : f.company,
    }));
  }

  useEffect(() => {
    if (!open) return;
    setCompLoading(true);
    fetch(`${API_BASE}/api/companies`)
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setCompanies(d.data); })
      .catch(() => {})
      .finally(() => setCompLoading(false));
  }, [open]);

  function handlePhoneDigits(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 11));
  }

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(
      pw === confirm
        ? { ok: true,  text: '✓ Passwords match' }
        : { ok: false, text: '✗ Passwords do not match' },
    );
  }

  function reset() {
    setForm({ ...EMPTY_ADD_FORM });
    setPhoneCode('+63');
    setPhoneDigits('');
    setPhotoFile(null);
    setMatchMsg(null);
    setApiError(null);
  }

  function handleClose() { reset(); onClose(); }

  function handleImageSelected(previewSrc: string, file: File) {
    setForm(f => ({ ...f, imgSrc: previewSrc }));
    setPhotoFile(file);
  }

  function toAccessLevel(role: string): string {
    const map: Record<string, string> = {
      'Super Admin': 'super_admin', 'System Admin': 'system_admin',
      'Manager': 'manager', 'User': 'user',
    };
    return map[role] ?? role.toLowerCase().replace(/\s+/g, '_');
  }

  async function handleSubmit() {
    setApiError(null);

    /* ── Required field validation ── */
    if (!form.fullName.trim())                  { setApiError('Full Name is required.');        return; }
    if (!form.email.trim())                     { setApiError('Email Address is required.');    return; }
    if (!phoneDigits.trim())                    { setApiError('Phone Number is required.');     return; }
    if (!form.role)                             { setApiError('User Access is required.');      return; }
    // Company only required for Manager and User roles
    if (!isSystemAdmin && !form.company)        { setApiError('Company is required.');          return; }
    if (!form.password)                         { setApiError('Password is required.');         return; }
    if (!form.confirmPassword)                  { setApiError('Please confirm your password.'); return; }
    if (form.password !== form.confirmPassword) { setApiError('Passwords do not match.');       return; }

    const localErr = onAdd(form);
    if (localErr) return;

    setLoading(true);
    try {
      const matched   = companies.find(c => c.company_name === form.company);
      const companyId = matched?.id ?? null;

      // access_id is derived automatically from the role — never entered manually
      const accessId = ROLE_ACCESS_ID[form.role] ?? '';

      const fd = new FormData();
      fd.append('full_name',    form.fullName.trim());
      fd.append('email',        form.email);
      fd.append('access_level', toAccessLevel(form.role));
      fd.append('access_id',    accessId);
      fd.append('status',       form.status === 'Active' ? 'active' : 'inactive');
      fd.append('password',     form.password);
      fd.append('phone_number', fullPhone);
      // Only send company_id for roles that require a company
      if (!isSystemAdmin && companyId !== null) fd.append('company_id', String(companyId));
      if (form.position) fd.append('position_title', form.position);

      if (photoFile) {
        const renamed = renameProfilePhoto(photoFile, form.fullName.trim());
        fd.append('profile_photo', renamed, renamed.name);
      }

      const res  = await fetch(`${API_BASE}/api/users`, { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        const firstError = data.errors
          ? Object.values(data.errors as Record<string, string[]>)[0][0]
          : data.message ?? 'Something went wrong.';
        setApiError(firstError);
        return;
      }

      reset();
      onClose();
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const initials       = form.fullName.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2);
  const companyOptions = companies.length > 0 ? companies.map(c => c.company_name) : fallbackCompanies;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="flex flex-col modal-anim bg-white"
        style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)', overflow: 'visible' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center relative overflow-hidden"
          style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#5b21b6,#7c3aed 55%,#0d9488)', borderRadius: '18px 18px 0 0' }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
          <div className="flex items-center justify-center shrink-0 relative z-10"
            style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M2 15s2.5-4 7-4 7 4 7 4" /><circle cx="9" cy="6" r="3.5" /><path d="M14 3v4M12 5h4" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Add New User</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Create a user account and assign access</div>
          </div>
          <button
            className="relative z-10 flex items-center justify-center cursor-pointer"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: 'white', marginLeft: 12 }}
            onClick={handleClose}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M1 1l9 9M10 1L1 10" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: '20px 24px', gap: 16, maxHeight: '72vh' }}>

          {apiError && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold"
              style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.20)', color: '#dc2626' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="6" /><path d="M7 4v3.5M7 9.5v.5" />
              </svg>
              {apiError}
            </div>
          )}

          <AvatarUploaderWithFile
            inputId="au-file"
            initials={initials.toUpperCase()}
            imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#7c3aed,#0d9488)"
            buttonLabel="Choose Image"
            buttonStyle={{ color: 'var(--purple)', background: 'var(--purple-lt)', border: '1px solid rgba(124,58,237,.20)' }}
            onImageSelected={handleImageSelected}
          />

          {form.imgSrc && (
            <div style={{ marginTop: -8 }}>
              <button type="button"
                className="inline-flex items-center cursor-pointer font-semibold"
                style={{ gap: 5, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.25)', background: 'rgba(220,38,38,.07)', color: '#dc2626', fontSize: 11.5, fontFamily: "'DM Sans',sans-serif" }}
                onClick={() => { setForm(f => ({ ...f, imgSrc: undefined })); setPhotoFile(null); }}
              >
                <svg width="10" height="10" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M1 1l9 9M10 1L1 10" />
                </svg>
                Remove Photo
              </button>
            </div>
          )}

          {/* Row 1: Full Name + Email */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Full Name</FieldLabel>
              <FInput type="text" placeholder="Jane Smith" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Email Address</FieldLabel>
              <FInput type="email" placeholder="jane@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          {/* Row 2: Phone */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>
                Phone Number
                <span style={{ marginLeft: 5, fontSize: 9.5, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>(digits only, max 11)</span>
              </FieldLabel>
              <div style={{ display: 'flex', height: 38, borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: 'var(--s2,#f5f3ff)', overflow: 'visible' }}>
                <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
                <input
                  type="tel" inputMode="numeric" placeholder="9171234567"
                  value={phoneDigits} onChange={handlePhoneDigits} maxLength={11}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 10px', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--t1,#18103a)', outline: 'none', width: 0 }}
                />
              </div>
              {phoneDigits && (
                <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 500, marginTop: 2 }}>
                  Stored as: <strong>{fullPhone}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: User Access + Position
               Access ID field removed — auto-derived from role via ROLE_ACCESS_ID map */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Access</FieldLabel>
              <FSelect value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                <option value="">Select role…</option>
                <option>System Admin</option>
                <option>Manager</option>
                <option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
          </div>

          {/* Row 4: Company — rendered only when role is NOT System Admin */}
          {!isSystemAdmin && (
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>Company</FieldLabel>
                <FSelect value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                  <option value="">{compLoading ? 'Loading…' : 'Select company…'}</option>
                  {companyOptions.map(c => <option key={c}>{c}</option>)}
                </FSelect>
              </div>
            </div>
          )}

          <StatusRadioGroup name="au-status" value={form.status}
            onChange={v => setForm(f => ({ ...f, status: v }))} />

          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
              Set Password
            </span>
          </div>

          {/* Row 5: Password */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Password</FieldLabel>
              <PasswordField id="au-password" label="" placeholder="Enter password…" value={form.password}
                onChange={v => { setForm(f => ({ ...f, password: v })); checkMatch(v, form.confirmPassword); }} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Confirm Password</FieldLabel>
              <PasswordField id="au-confirm-password" label="" placeholder="Confirm password…" value={form.confirmPassword}
                onChange={v => { setForm(f => ({ ...f, confirmPassword: v })); checkMatch(form.password, v); }}
                matchMsg={matchMsg} />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end"
          style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)', borderRadius: '0 0 18px 18px' }}>
          <button className="inline-flex items-center cursor-pointer font-semibold"
            style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
            onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button className="inline-flex items-center cursor-pointer font-semibold text-white"
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: loading ? '#a78bfa' : 'var(--grad)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(124,58,237,.30)', opacity: loading ? .8 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              : <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <path d="M2 7.5l3.5 3.5 6.5-7" />
                </svg>
            }
            {loading ? 'Saving…' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── AvatarUploaderWithFile ─────────────────────────────────────────────── */
interface AvatarUploaderWithFileProps {
  inputId:         string;
  initials:        string;
  imgSrc:          string | null;
  accentColor:     string;
  buttonLabel:     string;
  buttonStyle:     React.CSSProperties;
  onImageSelected: (previewSrc: string, file: File) => void;
}

function AvatarUploaderWithFile({ inputId, initials, imgSrc, accentColor, buttonLabel, buttonStyle, onImageSelected }: AvatarUploaderWithFileProps) {
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) onImageSelected(ev.target.result as string, file);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center rounded-xl"
      style={{ gap: 16, padding: '14px 16px', background: 'var(--s2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative"
        style={{ width: 80, height: 80, borderRadius: 16, background: accentColor }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        {imgSrc
          ? <img src={imgSrc} alt="avatar" className="w-full h-full object-cover absolute inset-0" />
          : <span className="relative z-10 font-bold text-white" style={{ fontSize: 22 }}>{initials || '?'}</span>
        }
        <div className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-150"
          style={{ background: 'rgba(0,0,0,.35)', opacity: hovered ? 1 : 0 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </div>
      </div>
      <input ref={fileRef} id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex-1">
        <div className="font-bold" style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 3 }}>Profile Photo</div>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 8 }}>Upload a photo or let initials auto-generate</div>
        <button className="inline-flex items-center cursor-pointer font-semibold"
          style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", ...buttonStyle }}
          onClick={() => fileRef.current?.click()}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

