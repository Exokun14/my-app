'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { EditUserForm, UserStatus } from './user_functions';
import {
  StatusRadioGroup,
  PasswordField,
  FieldLabel,
  FInput,
  FSelect,
} from './popup_shared_components';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface EditUserPopupProps {
  open:      boolean;
  form:      EditUserForm;
  companies: string[];
  onClose:   () => void;
  onChange:  (form: EditUserForm) => void;
  onSave:    (form: EditUserForm) => string | null;
  onDeleted: (userId: number) => void;
}

interface ApiCompany { id: number; company_name: string; }

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
              key={c.code} type="button"
              onClick={() => { onChange(c.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px',
                background: c.code === value ? 'var(--purple-lt,#ede9fe)' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: c.code === value ? 700 : 500,
                color: c.code === value ? 'var(--purple,#5b21b6)' : 'var(--t1,#18103a)',
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

/** Parse an existing phone string like "+63 9171234567" into [code, digits] */
function parsePhone(phone: string): [string, string] {
  const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const code   = COUNTRY_CODES.find(c => c.code === match[1]) ? match[1] : '+63';
    const digits = match[2].replace(/\D/g, '').slice(0, 11);
    return [code, digits];
  }
  return ['+63', phone.replace(/\D/g, '').slice(0, 11)];
}

/* ─── AvatarUploaderEdit ─────────────────────────────────────────────────── */
interface AvatarUploaderEditProps {
  initials:        string;
  imgSrc:          string | null;
  onImageSelected: (previewSrc: string, file: File) => void;
}

function AvatarUploaderEdit({ initials, imgSrc, onImageSelected }: AvatarUploaderEditProps) {
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
    e.target.value = '';
  }

  return (
    <div className="flex items-center rounded-xl"
      style={{ gap: 16, padding: '14px 16px', background: 'var(--s2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative"
        style={{ width: 80, height: 80, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#0d9488)' }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        {imgSrc
          ? <img src={imgSrc} alt="avatar" className="w-full h-full object-cover absolute inset-0" style={{ borderRadius: 16 }} />
          : <span className="relative z-10 font-bold text-white" style={{ fontSize: 22 }}>{initials || '?'}</span>
        }
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 transition-opacity duration-150"
          style={{ background: 'rgba(0,0,0,.45)', opacity: hovered ? 1 : 0, borderRadius: 16, gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.85)', fontWeight: 600, letterSpacing: '.04em' }}>CHANGE</span>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex-1">
        <div className="font-bold" style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 3 }}>Profile Photo</div>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 10 }}>
          {imgSrc ? 'Click the avatar or the button to replace the photo.' : 'Upload a photo or let initials auto-generate.'}
        </div>
        <button type="button" className="inline-flex items-center cursor-pointer font-semibold"
          style={{ gap: 6, fontSize: 12, padding: '5px 14px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", color: 'var(--purple)', background: 'var(--purple-lt)', border: '1px solid rgba(124,58,237,.20)' }}
          onClick={() => fileRef.current?.click()}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 1v12M1 7h12" />
          </svg>
          {imgSrc ? 'Replace Photo' : 'Choose Image'}
        </button>
      </div>
    </div>
  );
}

/* ─── DeleteConfirm ──────────────────────────────────────────────────────── */
interface DeleteConfirmProps {
  userName: string; loading: boolean;
  onCancel: () => void; onDelete: () => void;
}

function DeleteConfirm({ userName, loading, onCancel, onDelete }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1100, background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white flex flex-col overflow-hidden"
        style={{ width: 400, borderRadius: 16, boxShadow: '0 20px 60px rgba(20,10,40,.30)' }}>
        <div className="flex items-center" style={{ padding: '18px 20px 14px', gap: 12 }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(220,38,38,.10)' }}>
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.8">
              <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l.8 9.5a.5.5 0 0 0 .5.5h7.4a.5.5 0 0 0 .5-.5L13 4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Delete User</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
          Are you sure you want to permanently delete <strong>{userName}</strong>?
        </div>
        <div className="flex items-center justify-end"
          style={{ gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="inline-flex items-center cursor-pointer font-semibold"
            style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 12.5, fontFamily: "'DM Sans',sans-serif" }}
            onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="inline-flex items-center cursor-pointer font-semibold text-white"
            style={{ gap: 6, padding: '8px 18px', borderRadius: 9, border: 'none', background: loading ? '#fca5a5' : '#dc2626', fontSize: 12.5, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 10px rgba(220,38,38,.30)' }}
            onClick={onDelete} disabled={loading}>
            {loading
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              : null}
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function EditUserPopup({
  open, form, companies: fallbackCompanies,
  onClose, onChange, onSave, onDeleted,
}: EditUserPopupProps) {

  const [photoFile,     setPhotoFile]     = useState<File | null>(null);
  const [photoRemoved,  setPhotoRemoved]  = useState(false);
  const [matchMsg,      setMatchMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [apiError,      setApiError]      = useState<string | null>(null);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [companies,     setCompanies]     = useState<ApiCompany[]>([]);
  const [compLoading,   setCompLoading]   = useState(false);

  /* ── Phone state — parse from existing form.phone on open ── */
  const [phoneCode,   setPhoneCode]   = useState('+63');
  const [phoneDigits, setPhoneDigits] = useState('');

  const fullPhone = phoneDigits ? `${phoneCode} ${phoneDigits}` : '';

  useEffect(() => {
    if (!open) return;
    setPhotoFile(null);
    setPhotoRemoved(false);
    setMatchMsg(null);
    setApiError(null);
    setShowDelete(false);

    /* Pre-populate phone fields from existing value */
    const [code, digits] = parsePhone(form.phone ?? '');
    setPhoneCode(code);
    setPhoneDigits(digits);

    setCompLoading(true);
    fetch(`${API_BASE}/api/companies`)
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setCompanies(d.data); })
      .catch(() => {})
      .finally(() => setCompLoading(false));
  }, [open]);

  const companyOptions = companies.length > 0 ? companies.map(c => c.company_name) : fallbackCompanies;
  const initials = form.fullName.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  const previewSrc: string | null = photoRemoved ? null : photoFile ? form.imgSrc ?? null : form.imgSrc ?? null;

  function handlePhoneDigits(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 11));
  }

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm
      ? { ok: true, text: '✓ Passwords match' }
      : { ok: false, text: '✗ Passwords do not match' });
  }

  function handleImageSelected(src: string, file: File) {
    setPhotoRemoved(false);
    setPhotoFile(file);
    onChange({ ...form, imgSrc: src });
  }

  function handleRemovePhoto() {
    setPhotoRemoved(true);
    setPhotoFile(null);
    onChange({ ...form, imgSrc: null });
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
    if (!form.fullName.trim())  { setApiError('Full Name is required.');        return; }
    if (!form.email.trim())     { setApiError('Email Address is required.');    return; }
    if (!phoneDigits.trim())    { setApiError('Phone Number is required.');     return; }
    if (!form.role)             { setApiError('User Access is required.');      return; }
    if (!form.accessId)         { setApiError('Access ID is required.');        return; }
    if (!form.company)          { setApiError('Company is required.');          return; }
    if (!form.position?.trim()) { setApiError('Position / Title is required.'); return; }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setApiError('Passwords do not match.'); return;
    }

    const localErr = onSave(form);
    if (localErr) return;

    setLoading(true);
    try {
      const matched   = companies.find(c => c.company_name === form.company);
      const companyId = matched?.id ?? null;

      const fd = new FormData();
      fd.append('_method',      'PUT');
      fd.append('full_name',    form.fullName.trim());
      fd.append('email',        form.email);
      fd.append('access_level', toAccessLevel(form.role));
      fd.append('access_id',    form.accessId);             // ← integer FK
      fd.append('status',       form.status === 'Active' ? 'active' : 'inactive');
      fd.append('phone_number', fullPhone);
      if (companyId !== null)   fd.append('company_id',     String(companyId));
      if (form.position)        fd.append('position_title', form.position);
      if (form.newPassword)     fd.append('password',       form.newPassword);

      if (photoRemoved) {
        fd.append('remove_photo', '1');
      } else if (photoFile) {
        const renamed = renameProfilePhoto(photoFile, form.fullName.trim());
        fd.append('profile_photo', renamed, renamed.name);
      }

      const res  = await fetch(`${API_BASE}/api/users/${form.userId}`, { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        const firstError = data.errors
          ? Object.values(data.errors as Record<string, string[]>)[0][0]
          : data.message ?? 'Something went wrong.';
        setApiError(firstError);
        return;
      }
      onClose();
    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/users/${form.userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setApiError(data.message ?? 'Failed to delete user.'); setShowDelete(false); return; }
      onDeleted(form.userId);
    } catch {
      setApiError('Network error. Please try again.');
      setShowDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-1000"
        style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex flex-col modal-anim bg-white"
          style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)', overflow: 'visible' }}>

          {/* ── Header ── */}
          <div className="flex items-center relative overflow-hidden"
            style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#0d9488,#7c3aed 55%,#5b21b6)', borderRadius: '18px 18px 0 0' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
            <div className="flex items-center justify-center shrink-0 relative z-10"
              style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}>
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
                <path d="M2 15s2.5-4 7-4 7 4 7 4" /><circle cx="9" cy="6" r="3.5" />
                <path d="M12.5 2.5l3 3M13.5 1.5l2 1-3 3-2-1z" />
              </svg>
            </div>
            <div className="relative z-10 flex-1">
              <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Edit User</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Update account details and access settings</div>
            </div>
            <button className="relative z-10 flex items-center justify-center cursor-pointer"
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: 'white', marginLeft: 12 }}
              onClick={onClose}>
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

            <AvatarUploaderEdit initials={initials} imgSrc={previewSrc} onImageSelected={handleImageSelected} />

            {previewSrc && (
              <div style={{ marginTop: -8 }}>
                <button type="button" className="inline-flex items-center cursor-pointer font-semibold"
                  style={{ gap: 5, padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.25)', background: 'rgba(220,38,38,.07)', color: '#dc2626', fontSize: 11.5, fontFamily: "'DM Sans',sans-serif" }}
                  onClick={handleRemovePhoto}>
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
                  onChange={e => onChange({ ...form, fullName: e.target.value })} />
              </div>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>Email Address</FieldLabel>
                <FInput type="email" placeholder="jane@company.com" value={form.email}
                  onChange={e => onChange({ ...form, email: e.target.value })} />
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

            {/* Row 3: User Access + Access ID */}
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>User Access</FieldLabel>
                <FSelect value={form.role} onChange={e => onChange({ ...form, role: e.target.value })}>
                  <option value="">Select role…</option>
                  <option>Super Admin</option>
                  <option>System Admin</option>
                  <option>Manager</option>
                  <option>User</option>
                </FSelect>
              </div>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>Access ID</FieldLabel>
                <FInput
                  type="number"
                  placeholder="e.g. 1"
                  min={1}
                  value={form.accessId ?? ''}
                  onChange={e => onChange({ ...form, accessId: e.target.value })}
                />
              </div>
            </div>

            {/* Row 4: Company + Position */}
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>Company</FieldLabel>
                <FSelect value={form.company} onChange={e => onChange({ ...form, company: e.target.value })}>
                  <option value="">{compLoading ? 'Loading…' : 'Select company…'}</option>
                  {companyOptions.map(c => <option key={c}>{c}</option>)}
                </FSelect>
              </div>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel required>Position / Title</FieldLabel>
                <FInput type="text" placeholder="e.g. Store Manager" value={form.position}
                  onChange={e => onChange({ ...form, position: e.target.value })} />
              </div>
            </div>

            <StatusRadioGroup name="eu-status" value={form.status}
              onChange={v => onChange({ ...form, status: v })} />

            <div className="text-center" style={{ paddingTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
                Change Password
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--t4)', marginLeft: 8 }}>(leave blank to keep current)</span>
            </div>

            {/* Row 5: New Password */}
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel>New Password</FieldLabel>
                <PasswordField id="eu-new-password" label="" placeholder="New password…" value={form.newPassword}
                  onChange={v => { onChange({ ...form, newPassword: v }); checkMatch(v, form.confirmPassword); }} />
              </div>
              <div className="flex flex-col" style={{ gap: 5 }}>
                <FieldLabel>Confirm Password</FieldLabel>
                <PasswordField id="eu-confirm-password" label="" placeholder="Confirm new password…" value={form.confirmPassword}
                  onChange={v => { onChange({ ...form, confirmPassword: v }); checkMatch(form.newPassword, v); }}
                  matchMsg={matchMsg} />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center"
            style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)', borderRadius: '0 0 18px 18px' }}>
            <button type="button" className="inline-flex items-center cursor-pointer font-semibold"
              style={{ gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(220,38,38,.25)', background: 'rgba(220,38,38,.07)', color: '#dc2626', fontSize: 12.5, fontFamily: "'DM Sans',sans-serif" }}
              onClick={() => setShowDelete(true)} disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M3 4l.8 9.5a.5.5 0 0 0 .5.5h7.4a.5.5 0 0 0 .5-.5L13 4" />
              </svg>
              Delete User
            </button>
            <div className="flex-1" />
            <button className="inline-flex items-center cursor-pointer font-semibold"
              style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
              onClick={onClose} disabled={loading}>Cancel</button>
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
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {showDelete && (
        <DeleteConfirm userName={form.fullName || 'this user'}
          loading={deleteLoading} onCancel={() => setShowDelete(false)} onDelete={handleDelete} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}