'use client';

import React, { useState, useRef } from 'react';
import { useClickOutside } from './overview_func';

export interface BannerEditModalProps {
  companyId:          number | null;
  currentSrc:         string;          // resolved URL of cover_photo (empty if none)
  currentColor:       string;          // background_color hex
  currentAccentColor: string;          // panel_color hex
  onSave: (src: string, color: string, accent: string) => void;
  onClose: () => void;
}

const ACCENT_PRESETS = [
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Violet',  value: '#7c3aed' },
  { label: 'Indigo',  value: '#4338ca' },
  { label: 'Blue',    value: '#1d4ed8' },
  { label: 'Teal',    value: '#0f766e' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Rose',    value: '#be123c' },
  { label: 'Slate',   value: '#1e293b' },
];

const BG_PRESETS = [
  '#1a0752','#0b3b3b','#1e3a5f','#18103a',
  '#3b0764','#064e3b','#1e1b4b','#7c3aed',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

export default function BannerEditModal({
  companyId, currentSrc, currentColor, currentAccentColor, onSave, onClose,
}: BannerEditModalProps) {
  const [useImage,    setUseImage]    = useState(true);

  const [draftColor,  setDraftColor]  = useState(currentColor  || '#3b1e6e');
  const [draftAccent, setDraftAccent] = useState(currentAccentColor || '#7c3aed');

  // Cover photo state
  const [existingSrc,  setExistingSrc]  = useState(currentSrc);
  const [previewFile,  setPreviewFile]  = useState<string | null>(null);
  const [uploadFile,   setUploadFile]   = useState<File | null>(null);
  const [removePhoto,  setRemovePhoto]  = useState(false);

  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const ref     = useClickOutside<HTMLDivElement>(onClose);

  // What's shown in the preview as the cover
  const activeCoverSrc = previewFile || (removePhoto ? '' : existingSrc);

  // Right panel background: solid draftColor when no image, transparent when image present
  const rightPanelBg = (useImage && activeCoverSrc) ? 'transparent' : draftColor;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewFile(url);
    setUploadFile(file);
    setRemovePhoto(false);
    setUseImage(true);
  };

  const handleRemoveCover = () => {
    setPreviewFile(null);
    setUploadFile(null);
    setExistingSrc('');
    setRemovePhoto(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    setSaveError(null);

    if (companyId) {
      setSaving(true);
      try {
        const fd = new FormData();
        fd.append('background_color', useImage ? (draftColor || '#3b1e6e') : draftColor);
        fd.append('panel_color',      draftAccent);
        fd.append('_method',          'PUT');

        if (useImage && uploadFile) {
          fd.append('cover_photo', uploadFile);
        } else if (removePhoto || !useImage) {
          fd.append('remove_cover_photo', '1');
        }

        const res  = await fetch(`${API_BASE}/api/companies/${companyId}`, {
          method:  'POST',
          headers: { Accept: 'application/json' },
          body:    fd,
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          setSaveError(json.message ?? 'Failed to save banner. Please try again.');
          setSaving(false);
          return;
        }

        if (json.cover_photo_url) setExistingSrc(json.cover_photo_url as string);

      } catch {
        setSaveError('Network error — could not save banner.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    const finalSrc   = useImage ? (previewFile || (!removePhoto ? existingSrc : '')) : '';
    const finalColor = useImage ? (draftColor || '#3b1e6e') : draftColor;
    onSave(finalSrc, finalColor, draftAccent);
    onClose();
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const FLbl: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: '#6b5fa0',
    marginBottom: 6, display: 'block',
    letterSpacing: '0.04em', textTransform: 'uppercase' as const,
  };
  const BtnS: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 18px', borderRadius: 9,
    border: '1.5px solid rgba(124,58,237,0.2)',
    background: '#fff', color: '#4a3870',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  };
  const BtnP: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 20px', borderRadius: 9, border: 'none',
    background: saving
      ? 'linear-gradient(135deg,#a78bfa,#7c3aed)'
      : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
    color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
    opacity: saving ? 0.8 : 1,
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,7,36,0.48)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12000, fontFamily: "'DM Sans', sans-serif" }}
    >
      <div ref={ref} style={{ width: 580, maxHeight: '92vh', background: '#fff', borderRadius: 18, boxShadow: '0 24px 64px rgba(15,7,36,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.7"><path d="M11 2l3 3-8 8H3v-3L11 2z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Edit Company Account Banner</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Customize the banner panel color and cover photo</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.26)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20, scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent' } as React.CSSProperties}>

          {/* ── Live Preview — matches actual banner layout exactly ── */}
          <div>
            <label style={FLbl}>Live Preview</label>
            <div style={{
              width: '100%', height: 80, borderRadius: 10, overflow: 'hidden',
              border: '1.5px solid rgba(124,58,237,0.15)',
              display: 'flex', alignItems: 'stretch', gap: 0,
              background: 'transparent',
            }}>
              {/* Left panel — solid accent color, same as actual banner */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 14px', background: draftAccent, position: 'relative',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.5)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={draftAccent} strokeWidth="1.5"><rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 17l-5-5-4 4-2-2-5 5"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Company Name</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 8px' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: '#fff' }}>Active</span>
                  </div>
                </div>
              </div>

              {/* Right panel — solid bg color OR cover image, no gradient */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: draftColor }}>
                {useImage && activeCoverSrc && (
                  <img src={activeCoverSrc} alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center' }} />
                )}
                {/* Preview label */}
                <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.55)', zIndex: 2, pointerEvents: 'none' }}>Banner preview</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 5, fontStyle: 'italic' }}>
              Left: Panel Color · Right: Background Color (or cover photo when set)
            </div>
          </div>

          {/* ── Divider ── */}
          <Divider label="Banner Background" />

          {/* ── Tab switcher ── */}
          <div style={{ display: 'flex', gap: 0, background: '#f2f0fb', borderRadius: 9, padding: 3, border: '1px solid rgba(124,58,237,0.1)' }}>
            {([{ id: true, label: '🖼  Cover Photo' }, { id: false, label: '🎨  Solid Color' }] as { id: boolean; label: string }[]).map(({ id, label }) => (
              <button key={String(id)} onClick={() => setUseImage(id)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s', background: useImage === id ? '#fff' : 'transparent', color: useImage === id ? '#5b21b6' : '#8e7ec0', boxShadow: useImage === id ? '0 1px 6px rgba(124,58,237,0.15)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Cover Photo panel ── */}
          {useImage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 9, padding: '9px 12px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/></svg>
                <div style={{ fontSize: 11, color: '#5b21b6', lineHeight: 1.6 }}>
                  <strong>Recommended size: 1200 × 120 px</strong> (10:1 ratio) · Formats: JPG, PNG, WebP<br/>
                  <span style={{ color: '#8e7ec0', fontWeight: 400 }}>Saved to <code style={{ background: 'rgba(124,58,237,0.08)', padding: '1px 4px', borderRadius: 3, fontSize: 9 }}>banner_logos/</code> folder · Path stored in <code style={{ background: 'rgba(124,58,237,0.08)', padding: '1px 4px', borderRadius: 3, fontSize: 9 }}>company.cover_photo</code></span>
                </div>
              </div>

              <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${activeCoverSrc ? 'rgba(22,163,74,0.35)' : 'rgba(124,58,237,0.28)'}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#faf9ff', transition: 'border-color 0.14s, background 0.14s', position: 'relative', minHeight: 72 }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = activeCoverSrc ? 'rgba(22,163,74,0.6)' : 'rgba(124,58,237,0.5)'; el.style.background = '#f5f3ff'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = activeCoverSrc ? 'rgba(22,163,74,0.35)' : 'rgba(124,58,237,0.28)'; el.style.background = '#faf9ff'; }}>
                {activeCoverSrc ? (
                  <>
                    <img src={activeCoverSrc} alt="cover preview" style={{ width: '100%', height: 72, objectFit: 'cover', objectPosition: 'left center', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Click to change photo</span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '18px 16px', textAlign: 'center' as const }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.5" style={{ marginBottom: 6 }}><rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 17l-5-5-4 4-2-2-5 5"/></svg>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 2 }}>Click to upload cover photo</div>
                    <div style={{ fontSize: 10.5, color: '#b8aed8' }}>1200 × 120 px recommended · JPG, PNG, WebP · Max 8 MB</div>
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />

              {activeCoverSrc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 7 }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#16a34a" strokeWidth="1.7"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, flex: 1 }}>
                    {uploadFile ? `New photo ready to upload — ${uploadFile.name}` : 'Existing cover photo loaded'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); handleRemoveCover(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5, color: '#dc2626', fontWeight: 600, fontFamily: 'inherit' }}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Solid Color panel ── */}
          {!useImage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={FLbl}>Background Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={draftColor} onChange={e => setDraftColor(e.target.value)}
                  style={{ width: 48, height: 40, borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.2)', cursor: 'pointer', padding: 3, background: '#fff' }} />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 40, borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.18)', background: '#f2f0fb', overflow: 'hidden', padding: '0 12px', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8e7ec0' }}>#</span>
                  <input value={draftColor.replace('#', '')}
                    onChange={e => { const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6); setDraftColor('#' + v); }}
                    maxLength={6}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#18103a', letterSpacing: '0.05em' }} placeholder="3b1e6e" />
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: draftColor, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#b8aed8', marginRight: 2 }}>Presets:</span>
                {BG_PRESETS.map(c => (
                  <div key={c} onClick={() => setDraftColor(c)} title={c}
                    style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: 'pointer', flexShrink: 0, border: draftColor === c ? '2.5px solid #7c3aed' : '1.5px solid rgba(0,0,0,0.12)', transition: 'transform 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          <Divider label="Panel Color (Left side)" />

          {/* ── Accent/Panel color picker ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={FLbl}>Panel Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="color" value={draftAccent} onChange={e => setDraftAccent(e.target.value)}
                style={{ width: 48, height: 40, borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.2)', cursor: 'pointer', padding: 3, background: '#fff' }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 40, borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.18)', background: '#f2f0fb', overflow: 'hidden', padding: '0 12px', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#8e7ec0' }}>#</span>
                <input value={draftAccent.replace('#', '')}
                  onChange={e => { const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6); if (v.length > 0) setDraftAccent('#' + v); }}
                  maxLength={6}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#18103a', letterSpacing: '0.05em' }} placeholder="ea580c" />
                <div style={{ width: 20, height: 20, borderRadius: 5, background: draftAccent, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {ACCENT_PRESETS.map(p => (
                <div key={p.value} onClick={() => setDraftAccent(p.value)} title={p.label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: p.value, border: draftAccent === p.value ? '3px solid #7c3aed' : '2px solid rgba(0,0,0,0.1)', transition: 'transform 0.1s', boxShadow: draftAccent === p.value ? '0 0 0 2px rgba(124,58,237,0.25)' : 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }} />
                  <span style={{ fontSize: 9, color: '#8e7ec0', fontWeight: 600 }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Error ── */}
          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.7"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{saveError}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0 }}>
          <button style={BtnS} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={BtnP} onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                Save Banner
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared divider ────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(124,58,237,0.1)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#b8aed8', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(124,58,237,0.1)' }} />
    </div>
  );
}