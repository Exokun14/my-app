'use client';

// ─────────────────────────────────────────────
//  popup_shared_components.tsx
//  Shared UI primitives: AvatarUploader, StatusRadioGroup,
//  PasswordField, FieldLabel, FInput, FSelect
//
//  Fixes applied:
//   • FSelect: replaced `background` shorthand + `backgroundImage` combo
//     with explicit longhand properties to avoid React style-conflict warnings.
//   • StatusRadioGroup: replaced `borderColor` toggle (which conflicted with
//     the `border` shorthand) with full explicit `border` string per state.
// ─────────────────────────────────────────────

import React, { useState, useRef, ChangeEvent } from 'react';
import { UserStatus } from './user_functions';

// ── Shared input base style ───────────────────────────────────────────────────

export const baseInputStyle: React.CSSProperties = {
  background:    'var(--s2)',
  border:        '1px solid var(--border)',
  borderRadius:  10,
  padding:       '10px 13px',
  fontFamily:    "'DM Sans', sans-serif",
  fontSize:      13,
  color:         'var(--t1)',
  outline:       'none',
  width:         '100%',
  transition:    'all .16s',
};

const focusedInputStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderColor:     'var(--border-md)',    // safe: border is NOT set on this object
  boxShadow:       '0 0 0 3px rgba(124,58,237,.08)',
};

// ── Avatar Uploader ───────────────────────────────────────────────────────────

export interface AvatarUploaderProps {
  inputId:     string;
  initials:    string;
  imgSrc:      string | null;
  accentColor: string;
  buttonLabel: string;
  buttonStyle: React.CSSProperties;
  onImageLoad: (src: string) => void;
}

export function AvatarUploader({
  inputId, initials, imgSrc, accentColor, buttonLabel, buttonStyle, onImageLoad,
}: AvatarUploaderProps) {
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onImageLoad(ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="flex items-center rounded-xl"
      style={{ gap: 16, padding: '14px 16px', background: 'var(--s2)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative"
        style={{ width: 80, height: 80, borderRadius: 16, background: accentColor }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {imgSrc
          ? <img src={imgSrc} alt="avatar" className="w-full h-full object-cover absolute inset-0" />
          : <span className="relative z-10 font-bold text-white" style={{ fontSize: 22 }}>{initials || '?'}</span>
        }
        <div
          className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-150"
          style={{ background: 'rgba(0,0,0,.35)', opacity: hovered ? 1 : 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </div>
      </div>
      <input ref={fileRef} id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="flex-1">
        <div className="font-bold" style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 3 }}>Profile Photo</div>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 8 }}>
          Upload a photo or let initials auto-generate
        </div>
        <button
          className="inline-flex items-center cursor-pointer font-semibold transition-all duration-150"
          style={{ fontSize: 12, padding: '5px 14px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", ...buttonStyle }}
          onClick={() => fileRef.current?.click()}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ── Status Radio Group ────────────────────────────────────────────────────────
// Fix: use a full `border` string instead of toggling `borderColor` on top of
// an existing `border` shorthand — mixing the two causes React style warnings.

export interface StatusRadioGroupProps {
  name:     string;
  value:    UserStatus;
  onChange: (v: UserStatus) => void;
}

export function StatusRadioGroup({ name, value, onChange }: StatusRadioGroupProps) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Status</label>
      <div className="flex" style={{ gap: 12 }}>
        {(['Active', 'Inactive'] as UserStatus[]).map(s => {
          const isActive  = value === s;
          const activeBorder = s === 'Active'
            ? '1.5px solid var(--green)'
            : '1.5px solid var(--red)';
          const activeBg     = s === 'Active'
            ? 'rgba(22,163,74,.07)'
            : 'rgba(220,38,38,.07)';

          return (
            <label
              key={s}
              className="flex items-center cursor-pointer font-medium flex-1 transition-all duration-150"
              style={{
                gap:        8,
                fontSize:   13,
                padding:    '10px 16px',
                borderRadius: 10,
                border:     isActive ? activeBorder : '1.5px solid var(--border)',
                background: isActive ? activeBg     : '#fff',
              }}
            >
              <input
                type="radio"
                name={name}
                value={s}
                checked={isActive}
                onChange={() => onChange(s)}
                style={{ accentColor: s === 'Active' ? 'var(--green)' : 'var(--red)', width: 15, height: 15 }}
              />
              <span className={`dot ${s === 'Active' ? 'dot-g' : 'dot-r'}`} style={{ width: 8, height: 8 }} />
              {s}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Password Field ────────────────────────────────────────────────────────────

export interface PasswordFieldProps {
  id:           string;
  label:        string;
  sublabel?:    string;
  value:        string;
  onChange:     (v: string) => void;
  matchMsg?:    { ok: boolean; text: string } | null;
  placeholder?: string;
}

export function PasswordField({
  id, label, sublabel, value, onChange, matchMsg, placeholder,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {label && (
        <label
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 5, display: 'flex', alignItems: 'baseline', gap: 5 }}
        >
          {label}
          {sublabel && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>{sublabel}</span>}
        </label>
      )}
      <div className="relative">
        <input
          className="w-full transition-all duration-150 focus:outline-none"
          type={show ? 'text' : 'password'}
          id={id}
          value={value}
          style={{ ...baseInputStyle, padding: '10px 40px 10px 13px' }}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter password…'}
        />
        <button type="button" className="pw-eye-btn" onClick={() => setShow(s => !s)}>
          {show
            ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l12 12M6.5 6.7A4.5 4.5 0 0 0 8 13.5c4.5 0 7-5 7-5s-.9-1.7-2.5-3" />
                <path d="M4.5 4.5C2.9 5.8 1 8 1 8s2.5 5 7 5c1.2 0 2.2-.3 3.1-.7" strokeOpacity=".4" />
              </svg>
            : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2.2" />
              </svg>
          }
        </button>
      </div>
      {matchMsg && (
        <div style={{ fontSize: 11, marginTop: 5, color: matchMsg.ok ? 'var(--green)' : 'var(--red)' }}>
          {matchMsg.text}
        </div>
      )}
    </div>
  );
}

// ── Field Label ───────────────────────────────────────────────────────────────

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 2, display: 'block' }}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>
  );
}

// ── FInput ────────────────────────────────────────────────────────────────────

export function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...baseInputStyle, ...(focused ? focusedInputStyle : {}), ...props.style }}
      onFocus={e => { setFocused(true);  props.onFocus?.(e); }}
      onBlur={e  => { setFocused(false); props.onBlur?.(e);  }}
    />
  );
}

// ── FSelect ───────────────────────────────────────────────────────────────────
// Fix: the old version merged `background` shorthand with `backgroundImage`,
// `backgroundRepeat`, etc. as separate properties, causing React style warnings
// ("Updating background when backgroundImage is set").
// Solution: use only the `background` shorthand (which supports the full
// `url(...) no-repeat right 11px center / auto` syntax) and never set the
// individual longhand sub-properties separately.

const CHEVRON_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")";

export function FSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);

  // Build the background shorthand once — this avoids ever mixing
  // `background` + `backgroundImage` / `backgroundPosition` / `backgroundRepeat`.
  const bgValue = `${CHEVRON_URL} no-repeat right 11px center / auto ${focused ? '#fff' : 'var(--s2)'}`;

  const selectStyle: React.CSSProperties = {
    // Spread the base EXCEPT `background` (we override it below)
    border:       baseInputStyle.border,
    borderRadius: baseInputStyle.borderRadius,
    padding:      baseInputStyle.padding,
    fontFamily:   baseInputStyle.fontFamily,
    fontSize:     baseInputStyle.fontSize,
    color:        baseInputStyle.color,
    outline:      baseInputStyle.outline,
    width:        baseInputStyle.width,
    transition:   baseInputStyle.transition,
    // Single `background` shorthand — no sub-properties alongside it
    background:   bgValue,
    appearance:   'none' as const,
    paddingRight: 26,
    cursor:       'pointer',
    // Focus ring via boxShadow / borderColor (these don't conflict with `background`)
    ...(focused ? { borderColor: 'var(--border-md)', boxShadow: '0 0 0 3px rgba(124,58,237,.08)' } : {}),
    ...props.style,
  };

  return (
    <select
      {...props}
      style={selectStyle}
      onFocus={e => { setFocused(true);  props.onFocus?.(e); }}
      onBlur={e  => { setFocused(false); props.onBlur?.(e);  }}
    />
  );
}