'use client';

// ─────────────────────────────────────────────
//  add_user_popup.tsx  –  Add New User Modal
//  Connected to /api/users  (Add_User_Controller)
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../Services/api_service';
import { companiesAPI } from '../../Services/api.service';
import { AddUserForm, EMPTY_ADD_FORM } from './user_functions';
import { AvatarUploader, StatusRadioGroup, PasswordField, FieldLabel, FInput, FSelect } from './popup_shared_components';


export interface AddUserPopupProps {
  open:      boolean;
  companies: string[];
  onClose:   () => void;
  onAdd:     (form: AddUserForm) => string | null;
}

// ── Company list fetched from /api/companies ───────────────────────────────
interface ApiCompany { id: number; company_name: string; }

export default function AddUserPopup({ open, companies: fallbackCompanies, onClose, onAdd }: AddUserPopupProps) {
  const [form,        setForm]        = useState<AddUserForm>({ ...EMPTY_ADD_FORM });
  const [matchMsg,    setMatchMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [companies,   setCompanies]   = useState<ApiCompany[]>([]);
  const [compLoading, setCompLoading] = useState(false);

  /* ── Fetch companies from API when modal opens ── */
  useEffect(() => {
    if (!open) return;
    setCompLoading(true);
    companiesAPI.getAll()
      .then(res => {
        // companiesAPI wraps the Laravel response, so actual array is res.data.data
        const rows = Array.isArray(res.data) ? res.data : (res.data as any)?.data;
        if (res.success && Array.isArray(rows)) {
          const mapped = rows
            .filter((c: any) => c.id && (c.company_name || c.name))
            .map((c: any) => ({ id: c.id as number, company_name: (c.company_name || c.name) as string }));
          setCompanies(mapped);
        } else {
          console.error('[AddUserPopup] unexpected companies shape:', res);
        }
      })
      .catch(err => {
        console.error('[AddUserPopup] companiesAPI.getAll() threw:', err);
      })
      .finally(() => {
        setCompLoading(false);
      });
  }, [open]);

  function checkMatch(pw: string, confirm: string) {
    if (!confirm) { setMatchMsg(null); return; }
    setMatchMsg(pw === confirm
      ? { ok: true,  text: '✓ Passwords match' }
      : { ok: false, text: '✗ Passwords do not match' },
    );
  }

  function reset()       { setForm({ ...EMPTY_ADD_FORM }); setMatchMsg(null); setApiError(null); }
  function handleClose() { reset(); onClose(); }

  /* ── Map role label → DB enum value ── */
  function toAccessLevel(role: string): string {
    const map: Record<string, string> = {
      'Super Admin':  'super_admin',
      'System Admin': 'system_admin',
      'Manager':      'manager',
      'User':         'user',
    };
    return map[role] ?? role.toLowerCase().replace(/\s+/g, '_');
  }

  /* ── Map account type label → DB enum value ── */
  function toAccountType(type: string): string {
    const map: Record<string, string> = {
      'Admin':           'admin',
      'Account Manager': 'account_manager',
      'Users':           'user',
    };
    return map[type] ?? type.toLowerCase().replace(/\s+/g, '_');
  }

  async function handleSubmit() {
    setApiError(null);

    /* Local validation first */
    const localErr = onAdd(form);
    if (localErr) return;

    setLoading(true);
    try {
      /* Resolve company_id from the fetched list */
      const matched   = companies.find(c => c.company_name === form.company);
      const companyId = matched?.id ?? null;

      if (form.company && companies.length > 0 && companyId === null) {
        setApiError('Could not match the selected company. Please reselect and try again.');
        return;
      }

      /* Grab the file from the hidden input (AvatarUploader pattern) */
      const fileInput    = document.getElementById('au-file') as HTMLInputElement | null;
      const profilePhoto = fileInput?.files?.[0] ?? null;

      const result = await usersAPI.create({
        full_name:      form.fullName.trim(),
        email:          form.email,
        access_level:   toAccessLevel(form.role),
        account_type:   toAccountType(form.accountType || 'Users'),
        status:         form.status === 'Active' ? 'active' : 'inactive',
        password:       form.password,
        phone_number:   form.phone   || undefined,
        company_id:     companyId,
        position_title: form.position || undefined,
        profile_photo:  profilePhoto,
      });

      if (!result.success) {
        setApiError(result.error ?? 'Something went wrong.');
        return;
      }

      /* ── Success: reset form then close modal ── */
      reset();
      onClose();

    } catch {
      setApiError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const initials = form.fullName.trim().split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2);

  /* Company options: prefer API list, fall back to props */
  const companyOptions = companies.length > 0
    ? companies.map(c => c.company_name)
    : fallbackCompanies;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-1000"
      style={{ background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="flex flex-col modal-anim overflow-hidden bg-white"
        style={{ width: 660, maxWidth: '94vw', borderRadius: 18, boxShadow: '0 24px 80px rgba(20,10,40,.28)' }}>

        {/* ── Header ── */}
        <div className="flex items-center relative overflow-hidden"
          style={{ padding: '18px 22px', backgroundColor: '#5b21b6', backgroundImage: 'linear-gradient(135deg,#5b21b6,#7c3aed 55%,#0d9488)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(ellipse 80% 140% at 110% -20%,rgba(255,255,255,.12) 0%,transparent 60%)' }} />
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
          <button className="relative z-10 flex items-center justify-center cursor-pointer transition-all duration-150"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', color: 'white', marginLeft: 12 }}
            onClick={handleClose}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10" /></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col overflow-y-auto" style={{ padding: '20px 24px', gap: 16, maxHeight: '72vh' }}>

          {/* API error banner */}
          {apiError && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold"
              style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.20)', color: '#dc2626' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="7" r="6"/><path d="M7 4v3.5M7 9.5v.5"/>
              </svg>
              {apiError}
            </div>
          )}

          <AvatarUploader
            inputId="au-file"
            initials={initials.toUpperCase()}
            imgSrc={form.imgSrc ?? null}
            accentColor="linear-gradient(135deg,#7c3aed,#0d9488)"
            buttonLabel="Choose Image"
            buttonStyle={{ color: 'var(--purple)', background: 'var(--purple-lt)', border: '1px solid rgba(124,58,237,.20)' }}
            onImageLoad={src => setForm(f => ({ ...f, imgSrc: src }))}
          />
          {form.imgSrc && (
            <div style={{ marginTop: -8 }}>
              <button
                type="button"
                className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
                style={{ gap: 5, padding: '4px 12px', borderRadius: 8, borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(220,38,38,.25)', background: 'rgba(220,38,38,.07)', color: '#dc2626', fontSize: 11.5, fontFamily: "'DM Sans',sans-serif" }}
                onClick={() => {
                  setForm(f => ({ ...f, imgSrc: undefined }));
                  const fileInput = document.getElementById('au-file') as HTMLInputElement | null;
                  if (fileInput) fileInput.value = '';
                }}
              >
                <svg width="10" height="10" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M1 1l9 9M10 1L1 10" />
                </svg>
                Remove Photo
              </button>
            </div>
          )}

          {/* ── Row 1: Full Name + Email ── */}
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

          {/* ── Row 2: Phone ── */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Phone Number</FieldLabel>
              <FInput type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          {/* ── Row 3: User Access + Account Type ── */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>User Access</FieldLabel>
              <FSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="">Select role…</option>
                <option>System Admin</option>
                <option>Manager</option>
                <option>User</option>
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Account Type</FieldLabel>
              <FSelect value={form.accountType ?? ''} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}>
                <option value="">Select type…</option>
                <option>Admin</option>
                <option>Account Manager</option>
                <option>Users</option>
              </FSelect>
            </div>
          </div>

          {/* ── Row 4: Company + Position ── */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Company</FieldLabel>
              <FSelect value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                <option value="">{compLoading ? 'Loading…' : 'Select company…'}</option>
                {companyOptions.map(c => <option key={c}>{c}</option>)}
              </FSelect>
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel>Position / Title</FieldLabel>
              <FInput type="text" placeholder="e.g. Store Manager" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
          </div>

          <StatusRadioGroup name="au-status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />

          {/* ── Password divider ── */}
          <div className="text-center" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--purple)' }}>
              Set Password
            </span>
          </div>

          {/* ── Row 5: Password ── */}
          <div className="grid grid-cols-2" style={{ gap: 14 }}>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Password</FieldLabel>
              <PasswordField
                id="au-password" label="" placeholder="Enter password…"
                value={form.password}
                onChange={v => { setForm(f => ({ ...f, password: v })); checkMatch(v, form.confirmPassword); }}
              />
            </div>
            <div className="flex flex-col" style={{ gap: 5 }}>
              <FieldLabel required>Confirm Password</FieldLabel>
              <PasswordField
                id="au-confirm-password" label="" placeholder="Confirm password…"
                value={form.confirmPassword}
                onChange={v => { setForm(f => ({ ...f, confirmPassword: v })); checkMatch(form.password, v); }}
                matchMsg={matchMsg}
              />
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end"
          style={{ gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
            style={{ gap: 6, padding: '9px 20px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', color: 'var(--t2)', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
            onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="inline-flex items-center cursor-pointer font-semibold text-white transition-all duration-150"
            style={{ gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none', background: loading ? '#a78bfa' : 'var(--grad)', fontSize: 13, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 12px rgba(124,58,237,.30)', opacity: loading ? .8 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
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











