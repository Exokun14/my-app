'use client';

import React, { useState } from 'react';
import { Client, GlobalUser, buildNewUser } from './dashboard_overview_func';
import { Modal, MBtnS, MBtnP, FLbl, FIn, Asterisk } from './popup_shared';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface AddUserForm {
  fname: string;
  lname: string;
  email: string;
  role: string;
  company: string;
  position: string;
  phone: string;
}

const BLANK_FORM: AddUserForm = {
  fname: '', lname: '', email: '', role: '', company: '', position: '', phone: '',
};

interface Props {
  clients: Client[];
  onAdd: (user: GlobalUser) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function AddUserPopup({ clients, onAdd, onClose, showToast }: Props) {
  const [form, setForm] = useState<AddUserForm>(BLANK_FORM);

  const set = (key: keyof AddUserForm, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleAdd = () => {
    const newUser = buildNewUser(form.fname, form.lname, form.email, form.role, form.company, form.position, form.phone);
    if (!newUser) {
      showToast('Please fill in all required fields.');
      return;
    }
    onAdd(newUser);
    setForm(BLANK_FORM);
    onClose();
    showToast(`User "${newUser.name}" added successfully!`);
  };

  const FSel: React.CSSProperties = {
    ...FIn,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  return (
    <Modal
      title="Add New User"
      subtitle="Create a user account and assign access"
      onClose={onClose}
      footer={
        <>
          <button style={MBtnS} onClick={onClose}>Cancel</button>
          <button style={MBtnP} onClick={handleAdd}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
              <path d="M2 7.5l3.5 3.5 6.5-7"/>
            </svg>
            Add User
          </button>
        </>
      }
    >
      {/* Name row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={FLbl}>First Name <Asterisk /></label>
          <input style={FIn} type="text" placeholder="Jane" value={form.fname} onChange={e => set('fname', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>Last Name <Asterisk /></label>
          <input style={FIn} type="text" placeholder="Smith" value={form.lname} onChange={e => set('lname', e.target.value)} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={FLbl}>Email Address <Asterisk /></label>
        <input style={FIn} type="email" placeholder="jane@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
      </div>

      {/* Role + Company */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={FLbl}>User Role <Asterisk /></label>
          <select style={FSel} value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="">Select role…</option>
            <option>System Admin</option>
            <option>Manager</option>
            <option>User</option>
          </select>
        </div>
        <div>
          <label style={FLbl}>Company <Asterisk /></label>
          <select style={FSel} value={form.company} onChange={e => set('company', e.target.value)}>
            <option value="">Select company…</option>
            {clients.map(c => <option key={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Position + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={FLbl}>Position / Title</label>
          <input style={FIn} type="text" placeholder="e.g. Store Manager" value={form.position} onChange={e => set('position', e.target.value)} />
        </div>
        <div>
          <label style={FLbl}>Phone Number</label>
          <input style={FIn} type="tel" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}