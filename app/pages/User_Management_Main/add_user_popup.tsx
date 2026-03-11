'use client';

// ─────────────────────────────────────────────
//  add_user_popup.tsx  –  Add New User Modal
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { AddUserForm, EMPTY_ADD_FORM } from './user_functions';
import { AvatarUploader, StatusRadioGroup, PasswordField, FieldLabel, FInput, FSelect } from './popup_shared_components';

export interface AddUserPopupProps {
  open:      boolean;
  companies: string[];
  onClose:   () => void;
  onAdd:     (form: AddUserForm) => string | null;
}

export default function AddUserPopup({ open, companies, onClose, onAdd }: AddUserPopupProps) {
  const [form,     setForm]     = useState<AddUserForm>({ ...EMPTY_ADD_FORM });
  const [matchMsg, setMatchMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm
      ? { ok: true,  text: '✓ Passwords match' }
      : { ok: false, text: '✗ Passwords do not match' },
    );
  }

  function reset()        { setForm({ ...EMPTY_ADD_FORM }); setMatchMsg(null); }
  function handleClose()  { reset(); onClose(); }
  function handleSubmit() { const err = onAdd(form); if (!err) reset(); }

  const initials = (form.firstName[0] ?? '') + (form.lastName[0] ?? '');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="flex flex-col modal-anim overflow-hidden bg-white" style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)' }}>

        {/* ── Header ── */}
        <div className="flex items-center relative overflow-hidden" style={{ padding: '18px 22px', background: 'linear-gradient(135deg,#5b21b6,#7c3aed 55%,#0d9488)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
          <div className="flex items-center justify-center shrink-0 relative z-10" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', marginRight: 14 }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M2 15s2.5-4 7-4 7 4 7 4" /><circle cx="9" cy="6" r="3.5" /><path d="M14 3v4M12 5h4" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="text-white font-extrabold" style={{ fontSize: 18 }}>Add New User</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>Create a user account and assign access</div>
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
            inputId="au-file" initials={initials.toUpperCase()} imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#7c3aed,#0d9488)" buttonLabel="Choose Image"
            buttonStyle={{ color: 'var(--purple)', background: 'var(--purple-lt)', border: '1px solid rgba(124,58,237,.20)' }}
            onImageLoad={src => setForm(f => ({ ...f, imgSrc: src }))}
          />

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>First Name</FieldLabel>
              <FInput type="text" placeholder="Jane" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Last Name</FieldLabel>
              <FInput type="text" placeholder="Smith" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Email Address</FieldLabel>
            <FInput type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Role</FieldLabel>
              <FSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="">Select role…</option>
                <option>System Admin</option><option>Manager</option><option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Company</FieldLabel>
              <FSelect value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c}>{c}</option>)}
              </FSelect>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <FInput type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <StatusRadioGroup name="au-status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />

          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>Set Password</span>
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Password</FieldLabel>
            <PasswordField id="au-password" label="" placeholder="Enter password…" value={form.password}
              onChange={v => { setForm(f => ({ ...f, password: v })); checkMatch(v, form.confirmPassword); }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: 5 }}>
            <FieldLabel required>Confirm Password</FieldLabel>
            <PasswordField id="au-confirm-password" label="" placeholder="Confirm password…" value={form.confirmPassword}
              onChange={v => { setForm(f => ({ ...f, confirmPassword: v })); checkMatch(form.password, v); }}
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
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: 'var(--grad)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(124,58,237,.30)' }}
            onClick={handleSubmit}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M2 7.5l3.5 3.5 6.5-7" /></svg>
            Add User
          </button>
        </div>
      </div>
    </div>
  );
}