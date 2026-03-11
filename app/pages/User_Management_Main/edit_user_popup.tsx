'use client';

// ─────────────────────────────────────────────
//  edit_user_popup.tsx  –  Edit User Modal
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { EditUserForm } from './user_functions';
import { AvatarUploader, StatusRadioGroup, PasswordField, FieldLabel, FInput, FSelect } from './popup_shared_components';

export interface EditUserPopupProps {
  open:      boolean;
  form:      EditUserForm;
  companies: string[];
  onClose:   () => void;
  onChange:  (form: EditUserForm) => void;
  onSave:    (form: EditUserForm) => string | null;
}

export default function EditUserPopup({ open, form, companies, onClose, onChange, onSave }: EditUserPopupProps) {
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm
      ? { ok: true,  text: '✓ Passwords match' }
      : { ok: false, text: '✗ Passwords do not match' },
    );
  }

  function handleClose() { setMatchMsg(null); onClose(); }
  function handleSave()  { const err = onSave(form); if (!err) setMatchMsg(null); }

  if (!open) return null;

  const initials = (form.firstName[0] ?? '') + (form.lastName[0] ?? '');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="flex flex-col modal-anim overflow-hidden bg-white" style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)' }}>

        {/* ── Header ── */}
        <div className="flex items-center relative overflow-hidden" style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#065f46,#0d9488 55%,#0284c7)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
          <div className="flex items-center justify-center shrink-0 relative z-10" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.7">
              <path d="M12.5 2.5l3 3L5 16H2v-3z" /><path d="M10 5l3 3" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Edit User: {form.firstName} {form.lastName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Update user information and access</div>
          </div>
          <button className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-150"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: 'white', marginLeft: 12 }}
            onClick={handleClose}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: '20px 24px', gap: 16, maxHeight: '72vh' }}>
          <AvatarUploader
            inputId="eu-file" initials={initials.toUpperCase()} imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#0d9488,#0284c7)" buttonLabel="Change Photo"
            buttonStyle={{ color: 'var(--teal)', background: 'var(--teal-lt)', border: '1px solid rgba(13,148,136,.28)' }}
            onImageLoad={src => onChange({ ...form, imgSrc: src })}
          />

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>First Name</FieldLabel>
              <FInput type="text" value={form.firstName} onChange={e => onChange({ ...form, firstName: e.target.value })} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Last Name</FieldLabel>
              <FInput type="text" value={form.lastName} onChange={e => onChange({ ...form, lastName: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Email Address</FieldLabel>
            <FInput type="email" value={form.email} onChange={e => onChange({ ...form, email: e.target.value })} />
          </div>

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Role</FieldLabel>
              <FSelect value={form.role} onChange={e => onChange({ ...form, role: e.target.value })}>
                <option value="">Select role…</option>
                <option>System Admin</option><option>Manager</option><option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Company</FieldLabel>
              <FSelect value={form.company} onChange={e => onChange({ ...form, company: e.target.value })}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c}>{c}</option>)}
              </FSelect>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position} onChange={e => onChange({ ...form, position: e.target.value })} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <FInput type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => onChange({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <StatusRadioGroup name="eu-status" value={form.status} onChange={v => onChange({ ...form, status: v })} />

          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>Change Password</span>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'baseline', gap: 5 }}>
              New Password
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>(leave blank to keep current)</span>
            </label>
            <PasswordField id="eu-new-pw" label="" value={form.newPassword}
              onChange={v => { onChange({ ...form, newPassword: v }); checkMatch(v, form.confirmPassword); }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel>Confirm Password</FieldLabel>
            <PasswordField id="eu-confirm-pw" label="" value={form.confirmPassword}
              onChange={v => { onChange({ ...form, confirmPassword: v }); checkMatch(form.newPassword, v); }}
              matchMsg={matchMsg}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end" style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
            style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
            onClick={handleClose}
          >Cancel</button>
          <button className="inline-flex items-center cursor-pointer font-semibold text-white transition-all duration-150"
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#065f46,#0d9488 50%,#0284c7)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(13,148,136,.35)' }}
            onClick={handleSave}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}