import { useState, useEffect } from "react";
import constants from "../Data/test_data.json";
import type { Course, Client } from "../Data/types";

const { CLIENTS, CC_COLORS } = constants as { CLIENTS: Client[]; CC_COLORS: string[] };

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Course) => void;
  editCourse: Course | null;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toast: (msg: string) => void;
}

// ── Wizard-only styles — extends globals.css, never overrides ─────────────────
const WIZARD_CSS = `
  /* ── Step bar ── */
  .ccw-stepbar {
    display: flex; align-items: center;
    padding: 13px 22px 12px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
    flex-shrink: 0;
  }
  .ccw-step-item { display: flex; align-items: center; gap: 7px; flex: 1; }
  .ccw-step-item:last-child { flex: 0; }
  .ccw-step-dot {
    width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
    transition: all .22s cubic-bezier(.16,1,.3,1);
    border: 1.5px solid transparent;
  }
  .ccw-step-dot.done   { background: linear-gradient(135deg, var(--purple), var(--teal)); color: #fff; box-shadow: 0 3px 10px rgba(124,58,237,.28); }
  .ccw-step-dot.active { background: var(--surface); color: var(--purple); border-color: var(--purple); box-shadow: 0 0 0 3px var(--purple-mid); }
  .ccw-step-dot.idle   { background: var(--surface); color: var(--t4); border-color: var(--border); }
  .ccw-step-label { font-size: 10.5px; font-weight: 600; white-space: nowrap; transition: color .2s; }
  .ccw-step-label.active { color: var(--purple); }
  .ccw-step-label.done   { color: var(--teal); }
  .ccw-step-label.idle   { color: var(--t4); }
  .ccw-step-line { flex: 1; height: 1.5px; margin: 0 6px; background: var(--border); position: relative; overflow: hidden; }
  .ccw-step-line.done::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, var(--purple), var(--teal)); }

  /* ── Step transitions ── */
  @keyframes ccw-in   { from { opacity: 0; transform: translateX(16px);  } to { opacity: 1; transform: translateX(0); } }
  @keyframes ccw-back { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
  .ccw-fwd  { animation: ccw-in   .26s cubic-bezier(.16,1,.3,1) both; }
  .ccw-back { animation: ccw-back .26s cubic-bezier(.16,1,.3,1) both; }

  /* ── Widen modal for wizard ── */
  .modal.ccw { width: 680px; }

  /* ── Step heading uses DM Serif Display from globals ── */
  .ccw-heading {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; color: var(--t1);
    letter-spacing: -.02em; margin-bottom: 3px; line-height: 1.2;
  }
  .ccw-heading em { font-style: italic; color: var(--purple); }
  .ccw-sub { font-size: 12px; color: var(--t3); margin-bottom: 22px; }

  /* ── Duration quick-pick chips ── */
  .ccw-dur-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  .ccw-dur-chip {
    padding: 4px 11px; border-radius: 7px;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--t2); font-size: 11px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all .13s;
  }
  .ccw-dur-chip:hover { background: var(--surface); border-color: var(--border-md); }
  .ccw-dur-chip.on { background: var(--purple-lt); border-color: var(--purple); color: var(--purple-d); }

  /* ── Live card preview ── */
  .ccw-preview {
    border-radius: 14px; overflow: hidden; height: 148px;
    position: relative; box-shadow: 0 8px 28px rgba(20,10,40,.18);
    margin-bottom: 20px; flex-shrink: 0;
  }
  .ccw-preview-dots {
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px);
    background-size: 20px 20px; pointer-events: none;
  }
  .ccw-preview-glow {
    position: absolute; top: -40px; right: -30px;
    width: 160px; height: 160px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,.14), transparent 70%);
    pointer-events: none;
  }
  .ccw-preview-emoji {
    position: absolute; bottom: 12px; left: 14px;
    font-size: 44px; line-height: 1;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,.3));
    transition: transform .2s ease;
  }
  .ccw-preview-cat {
    position: absolute; top: 10px; left: 12px;
    padding: 2px 9px; border-radius: 20px;
    background: rgba(0,0,0,.3); backdrop-filter: blur(8px);
    font-size: 9px; font-weight: 700; color: rgba(255,255,255,.9);
    letter-spacing: .06em; text-transform: uppercase;
  }
  .ccw-preview-title {
    position: absolute; bottom: 14px; right: 14px;
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,.9);
    max-width: 200px; text-align: right;
    text-shadow: 0 1px 6px rgba(0,0,0,.35);
  }

  /* ── Gradient swatch picker ── */
  .ccw-grad-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .ccw-grad-swatch {
    height: 36px; border-radius: 9px; cursor: pointer;
    border: 2.5px solid transparent;
    transition: transform .14s, border-color .14s, box-shadow .14s;
    position: relative; overflow: hidden;
  }
  .ccw-grad-swatch:hover { transform: scale(1.06); }
  .ccw-grad-swatch.on { border-color: #fff; box-shadow: 0 0 0 2.5px var(--purple), 0 4px 14px rgba(124,58,237,.35); }
  .ccw-grad-swatch.on::after {
    content: '✓'; position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 13px; font-weight: 700;
    background: rgba(0,0,0,.18);
  }

  /* ── Emoji picker ── */
  .ccw-emoji-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .ccw-emoji-opt {
    width: 36px; height: 36px; border-radius: 9px;
    border: 1px solid var(--border); background: var(--surface2);
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; cursor: pointer; transition: all .13s;
  }
  .ccw-emoji-opt:hover { background: var(--purple-lt); border-color: var(--border-md); transform: scale(1.1); }
  .ccw-emoji-opt.on { background: var(--purple); border-color: var(--purple); box-shadow: 0 3px 10px rgba(124,58,237,.3); transform: scale(1.1); }

  /* ── Thumbnail URL row ── */
  .ccw-url-row { display: flex; gap: 10px; align-items: center; }
  .ccw-thumb-mini {
    width: 54px; height: 54px; border-radius: 10px; flex-shrink: 0;
    border: 1.5px dashed var(--border-md); background: var(--surface2);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; overflow: hidden;
  }
  .ccw-thumb-mini img { width: 100%; height: 100%; object-fit: cover; }

  /* ── Audience company grid ── */
  .ccw-company-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
    gap: 6px; max-height: 220px; overflow-y: auto; padding: 2px;
  }

  /* ── Audience summary note ── */
  .ccw-audience-note {
    margin-top: 12px; padding: 10px 13px; border-radius: 10px;
    font-size: 11.5px; font-weight: 500;
    display: flex; align-items: center; gap: 7px;
  }
  .ccw-audience-note.open     { background: var(--sky-lt);   color: var(--sky);   border: 1px solid rgba(2,132,199,.15); }
  .ccw-audience-note.assigned { background: var(--green-lt); color: var(--green); border: 1px solid rgba(22,163,74,.15); }

  /* ── Review card ── */
  .ccw-review-thumb {
    height: 110px; position: relative; overflow: hidden;
    border-radius: 12px 12px 0 0;
  }
  .ccw-review-title {
    font-family: 'DM Serif Display', serif;
    font-size: 17px; color: var(--t1); letter-spacing: -.015em; margin-bottom: 3px;
  }
  .ccw-review-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
  .ccw-review-tag {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 20px; font-size: 10.5px; font-weight: 600;
  }

  /* ── Publish / Draft option cards ── */
  .ccw-option-card {
    flex: 1; padding: 16px; border-radius: 12px; cursor: pointer;
    border: 1.5px solid var(--border); background: var(--surface2);
    transition: all .18s; display: flex; flex-direction: column; gap: 6px;
  }
  .ccw-option-card:hover { border-color: var(--border-md); background: var(--surface); box-shadow: 0 4px 16px rgba(124,58,237,.09); transform: translateY(-2px); }
  .ccw-option-card.publish { border-color: rgba(13,148,136,.25); background: #f0fdf9; }
  .ccw-option-card.publish:hover { border-color: var(--teal); box-shadow: 0 4px 16px rgba(13,148,136,.14); }
  .ccw-option-icon  { font-size: 22px; margin-bottom: 2px; }
  .ccw-option-title { font-size: 13px; font-weight: 700; color: var(--t1); }
  .ccw-option-desc  { font-size: 11px; color: var(--t3); line-height: 1.55; }
  .ccw-option-cta   { font-size: 10.5px; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
  .ccw-option-card.publish .ccw-option-title { color: #065f46; }
  .ccw-option-card.publish .ccw-option-cta   { color: var(--teal); }
  .ccw-option-card:not(.publish) .ccw-option-cta { color: var(--purple); }

  /* ── Footer action buttons ── */
  .ccw-btn-draft {
    background: var(--purple-lt); color: var(--purple-d);
    border: 1.5px solid rgba(124,58,237,.2);
    padding: 8px 17px; border-radius: 10px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    display: inline-flex; align-items: center; gap: 6px; transition: all .15s;
  }
  .ccw-btn-draft:hover { background: var(--purple-mid); box-shadow: 0 3px 12px rgba(124,58,237,.15); transform: translateY(-1px); }

  .ccw-btn-publish {
    background: linear-gradient(135deg, var(--purple), var(--teal));
    color: #fff; border: none;
    padding: 8px 20px; border-radius: 10px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 4px 16px rgba(124,58,237,.32);
    transition: all .15s; position: relative; overflow: hidden;
  }
  .ccw-btn-publish:hover { box-shadow: 0 7px 24px rgba(124,58,237,.44); transform: translateY(-2px); filter: brightness(1.06); }
  .ccw-btn-publish::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent);
    transform: translateX(-100%); transition: transform .5s;
  }
  .ccw-btn-publish:hover::after { transform: translateX(100%); }

  .ccw-btn-next {
    background: var(--t1); color: #fff; border: none;
    padding: 8px 17px; border-radius: 10px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    display: inline-flex; align-items: center; gap: 6px; transition: all .15s;
  }
  .ccw-btn-next:hover { background: var(--t2); box-shadow: 0 4px 14px rgba(15,10,42,.2); transform: translateY(-1px); }

  /* ── "Ready to publish" badge ── */
  @keyframes ccw-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .ccw-ready-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 20px;
    background: var(--purple-lt); color: var(--purple-d);
    font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    animation: ccw-pulse 2s infinite; margin-left: 8px;
  }
  .ccw-ready-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--purple); }
`;

const GRADIENT_PRESETS = [
  { a: "#4c1d95", b: "#0d9488", label: "Midnight Teal" },
  { a: "#0c4a6e", b: "#065f46", label: "Deep Ocean"    },
  { a: "#831843", b: "#4c1d95", label: "Crimson Dusk"  },
  { a: "#78350f", b: "#dc2626", label: "Ember"          },
  { a: "#064e3b", b: "#0c4a6e", label: "Forest Deep"   },
  { a: "#1e3a8a", b: "#4c1d95", label: "Royal"         },
  { a: "#9d174d", b: "#78350f", label: "Rose Copper"   },
  { a: "#134e4a", b: "#1e3a8a", label: "Arctic"        },
];

const EMOJI_PICKS = [
  "📚","🎓","💡","🧠","⚡","🚀","🎯","🔐",
  "🍽️","🖥️","📋","⚙️","💰","🏆","📈","🌟",
  "🔬","🛡️","🎨","🤝",
];

const DURATION_PRESETS = ["15 Mins","30 Mins","45 Mins","1 Hour","1.5 Hours","2 Hours"];

const STEPS = [
  { num: "①", label: "Basics"   },
  { num: "②", label: "Identity" },
  { num: "③", label: "Audience" },
  { num: "④", label: "Review"   },
];

export default function CreateCourseModal({
  open, onClose, onSave, editCourse, categories, setCategories, toast,
}: CreateCourseModalProps) {
  const isEdit = !!editCourse;

  // ── Navigation ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState<"fwd" | "back">("fwd");

  // ── Step 0: Basics ────────────────────────────────────────────────────────
  const [title,       setTitle]       = useState("");
  const [desc,        setDesc]        = useState("");
  const [cat,         setCat]         = useState("");
  const [duration,    setDuration]    = useState("");
  const [showCatMgr,  setShowCatMgr]  = useState(false);
  const [newCatName,  setNewCatName]  = useState("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal,   setRenameVal]   = useState("");

  // ── Step 1: Identity ──────────────────────────────────────────────────────
  const [gradIdx,       setGradIdx]       = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState("📚");
  const [thumbUrl,      setThumbUrl]      = useState("");
  const [thumbValid,    setThumbValid]    = useState(false);

  // ── Step 2: Audience ──────────────────────────────────────────────────────
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [industryFilter,    setIndustryFilter]    = useState("All");
  const [companySearch,     setCompanySearch]     = useState("");

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(0); setDir("fwd");
    if (isEdit && editCourse) {
      setTitle(editCourse.title);
      setDesc(editCourse.desc || "");
      setCat(editCourse.cat);
      setDuration(editCourse.time);
      setThumbUrl(editCourse.thumb || "");
      setSelectedEmoji(editCourse.thumbEmoji || "📚");
    } else {
      setTitle(""); setDesc(""); setCat(""); setDuration(""); setThumbUrl(""); setSelectedEmoji("📚");
    }
    setGradIdx(0); setThumbValid(false);
    setSelectedCompanies(new Set()); setIndustryFilter("All"); setCompanySearch("");
    setShowCatMgr(false); setNewCatName(""); setRenamingCat(null);
  }, [open]);

  // ── Category management ───────────────────────────────────────────────────
  const addCategory = () => {
    const v = newCatName.trim();
    if (!v) { toast("Enter a category name."); return; }
    if (categories.includes(v)) { toast("Category already exists."); return; }
    setCategories(p => [...p, v]); setNewCatName("");
    toast(`Category "${v}" added!`);
  };
  const deleteCategory = (c: string) => {
    setCategories(p => p.filter(x => x !== c));
    toast(`Category "${c}" removed.`);
  };
  const saveRename = () => {
    const v = renameVal.trim();
    if (!v) { toast("Name cannot be empty."); return; }
    if (v !== renamingCat && categories.includes(v)) { toast(`"${v}" already exists.`); return; }
    setCategories(p => p.map(x => x === renamingCat ? v : x));
    setRenamingCat(null);
    toast(`Renamed to "${v}".`);
  };

  // ── Audience ──────────────────────────────────────────────────────────────
  const filteredClients = CLIENTS.filter(c => {
    const indOk  = industryFilter === "All" || c.cat === industryFilter;
    const srchOk = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
    return indOk && srchOk;
  });
  const allFiltered = filteredClients.length > 0 && filteredClients.every(c => selectedCompanies.has(c.id));
  const toggleCompany = (id: number) => setSelectedCompanies(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = (checked: boolean) => setSelectedCompanies(p => {
    const n = new Set(p); filteredClients.forEach(c => checked ? n.add(c.id) : n.delete(c.id)); return n;
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const step0Valid = !!(title.trim() && cat && duration.trim());
  const goNext = () => {
    if (step === 0 && !step0Valid) { toast("Fill in the required fields first."); return; }
    setDir("fwd"); setStep(s => s + 1);
  };
  const goBack = () => { setDir("back"); setStep(s => s - 1); };

  const grad = GRADIENT_PRESETS[gradIdx];

  // ── Build and submit ──────────────────────────────────────────────────────
  const buildCourse = (active: boolean): Course => ({
    title: title.trim(),
    desc: desc.trim() || "No description provided.",
    time: duration.trim(),
    thumb: thumbUrl && thumbValid ? thumbUrl : null,
    thumbEmoji: selectedEmoji,
    cat,
    enrolled: false,
    progress: 0,
    active,
    companies: selectedCompanies.size
      ? CLIENTS.filter(c => selectedCompanies.has(c.id)).map(c => c.name)
      : null,
  });

  const handlePublish = () => {
    onSave(buildCourse(true));
    toast(isEdit ? `"${title.trim()}" updated! ✓` : `"${title.trim()}" published! 🎉`);
  };
  const handleDraft = () => {
    onSave(buildCourse(false));
    toast(`"${title.trim()}" saved as draft.`);
  };

  // ── Footer note ───────────────────────────────────────────────────────────
  const footerNote =
    step === 0 ? (!step0Valid ? "Fill in the required fields to continue"      : "Looking good — continue to visual identity")
    : step === 1 ? "Customise the look of your course card"
    : step === 2 ? (selectedCompanies.size === 0
        ? "Course will be visible to all companies"
        : `${selectedCompanies.size} compan${selectedCompanies.size === 1 ? "y" : "ies"} selected`)
    : "Publish live now or save a draft to finish later";

  if (!open) return null;

  return (
    <div className="modal-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{WIZARD_CSS}</style>

      <div className="modal ccw">

        {/* ── Header (reuses .modal-head gradient from globals) ── */}
        <div className="modal-head">
          <div className="modal-head-ico">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M10 2L2 6l8 4 8-4-8-4z"/>
              <path d="M2 10l8 4 8-4"/>
              <path d="M2 14l8 4 8-4"/>
            </svg>
          </div>
          <div className="modal-head-info">
            <div className="modal-title">{isEdit ? "Edit Course" : "Create New Course"}</div>
            <div className="modal-sub">
              {isEdit
                ? "Update your course details across all four steps"
                : "Build a learning experience for your clients"}
            </div>
          </div>
          {step === 3 && (
            <div className="ccw-ready-badge">
              <div className="ccw-ready-dot" />
              Ready
            </div>
          )}
          <button className="modal-x" onClick={onClose}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Step bar ── */}
        <div className="ccw-stepbar">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "idle";
            return (
              <div
                key={i}
                className="ccw-step-item"
                style={{ cursor: i < step ? "pointer" : "default" }}
                onClick={() => { if (i < step) { setDir("back"); setStep(i); } }}
              >
                <div className={`ccw-step-dot ${state}`}>
                  {state === "done" ? "✓" : s.num}
                </div>
                <span className={`ccw-step-label ${state}`}>{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div className={`ccw-step-line${state === "done" ? " done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="modal-body" style={{ padding: "22px 22px 10px" }}>
          <div className={dir === "back" ? "ccw-back" : "ccw-fwd"} key={step}>

            {/* ════ STEP 0 — BASICS ════ */}
            {step === 0 && (
              <>
                <div className="ccw-heading">Course <em>Basics</em></div>
                <div className="ccw-sub">What's this course about?</div>

                <div className="field-g" style={{ marginBottom: 12 }}>
                  <label className="f-lbl">
                    Course Title <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <input
                    className="f-in" type="text" value={title} autoFocus
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. POS Advanced Training"
                  />
                </div>

                <div className="field-g" style={{ marginBottom: 12 }}>
                  <label className="f-lbl">Description</label>
                  <textarea
                    className="f-in" value={desc} rows={3}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Describe what learners will gain from this course…"
                  />
                </div>

                <div className="field-g row">
                  {/* Category */}
                  <div className="field-g">
                    <label className="f-lbl">
                      Category <span style={{ color: "var(--red)" }}>*</span>
                      <button className="cat-manage-btn" onClick={() => setShowCatMgr(v => !v)}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="6" cy="6" r="5"/><path d="M6 3v6M3 6h6"/>
                        </svg>
                        Manage
                      </button>
                    </label>
                    <select
                      className="f-in" value={cat}
                      onChange={e => setCat(e.target.value)}
                      style={{ cursor: "pointer", appearance: "auto" }}
                    >
                      <option value="">Select category…</option>
                      {categories.filter(c => c !== "All").map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {showCatMgr && (
                      <div className="ccm-cat-manager">
                        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>
                          Manage Categories
                        </div>
                        <div style={{ maxHeight: 120, overflowY: "auto", marginBottom: 8 }}>
                          {categories.filter(c => c !== "All").map(c => (
                            <div key={c} className="ccm-cat-row">
                              {renamingCat === c ? (
                                <>
                                  <input
                                    className="f-in"
                                    style={{ flex: 1, padding: "3px 7px", fontSize: 11.5, height: 26 }}
                                    value={renameVal}
                                    onChange={e => setRenameVal(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && saveRename()}
                                    autoFocus
                                  />
                                  <button className="ccm-cat-rename" onClick={saveRename}>✓</button>
                                </>
                              ) : (
                                <>
                                  <span style={{ flex: 1, fontSize: 11.5, color: "var(--t1)" }}>{c}</span>
                                  <button className="ccm-cat-rename" onClick={() => { setRenamingCat(c); setRenameVal(c); }}>✏️</button>
                                </>
                              )}
                              <button className="ccm-cat-del" onClick={() => deleteCategory(c)}>✕</button>
                            </div>
                          ))}
                          {categories.filter(c => c !== "All").length === 0 && (
                            <div style={{ fontSize: 11, color: "var(--t3)" }}>No categories yet.</div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            className="f-in" type="text" value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder="New category name…"
                            style={{ fontSize: 11.5, padding: "6px 10px" }}
                            onKeyDown={e => e.key === "Enter" && addCategory()}
                          />
                          <button className="btn btn-p btn-sm" onClick={addCategory} style={{ whiteSpace: "nowrap" }}>
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="field-g">
                    <label className="f-lbl">
                      Estimated Duration <span style={{ color: "var(--red)" }}>*</span>
                    </label>
                    <input
                      className="f-in" type="text" value={duration}
                      onChange={e => setDuration(e.target.value)}
                      placeholder="e.g. 45 Mins, 1 Hour"
                    />
                    <div className="ccw-dur-chips">
                      {DURATION_PRESETS.map(d => (
                        <button
                          key={d}
                          className={`ccw-dur-chip${duration === d ? " on" : ""}`}
                          onClick={() => setDuration(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ════ STEP 1 — IDENTITY ════ */}
            {step === 1 && (
              <>
                <div className="ccw-heading">Visual <em>Identity</em></div>
                <div className="ccw-sub">Give your course a look that stands out in the catalog</div>

                {/* Live card preview */}
                <div className="ccw-preview">
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${grad.a}, ${grad.b})` }} />
                  <div className="ccw-preview-dots" />
                  <div className="ccw-preview-glow" />
                  {thumbUrl && thumbValid && (
                    <img
                      src={thumbUrl} alt=""
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, mixBlendMode: "luminosity" }}
                    />
                  )}
                  {cat && <div className="ccw-preview-cat">{cat}</div>}
                  <div className="ccw-preview-emoji">{selectedEmoji}</div>
                  {title && <div className="ccw-preview-title">{title}</div>}
                </div>

                {/* Gradient picker */}
                <div className="field-g" style={{ marginBottom: 14 }}>
                  <label className="f-lbl">Card Gradient</label>
                  <div className="ccw-grad-grid">
                    {GRADIENT_PRESETS.map((g, i) => (
                      <div
                        key={i}
                        className={`ccw-grad-swatch${gradIdx === i ? " on" : ""}`}
                        title={g.label}
                        style={{ background: `linear-gradient(135deg, ${g.a}, ${g.b})` }}
                        onClick={() => setGradIdx(i)}
                      />
                    ))}
                  </div>
                </div>

                {/* Emoji picker */}
                <div className="field-g" style={{ marginBottom: 14 }}>
                  <label className="f-lbl">Course Icon</label>
                  <div className="ccw-emoji-grid">
                    {EMOJI_PICKS.map(e => (
                      <div
                        key={e}
                        className={`ccw-emoji-opt${selectedEmoji === e ? " on" : ""}`}
                        onClick={() => setSelectedEmoji(e)}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thumbnail URL */}
                <div className="field-g">
                  <label className="f-lbl">
                    Thumbnail Image
                    <span style={{ fontWeight: 400, color: "var(--t4)", fontSize: 10, marginLeft: 4 }}>optional</span>
                  </label>
                  <div className="ccw-url-row">
                    <div className="ccw-thumb-mini">
                      {thumbUrl && thumbValid
                        ? <img src={thumbUrl} alt="" onError={() => setThumbValid(false)} />
                        : <span>{selectedEmoji}</span>
                      }
                    </div>
                    <input
                      className="f-in" type="text" value={thumbUrl}
                      style={{ flex: 1 }}
                      onChange={e => { setThumbUrl(e.target.value); setThumbValid(false); }}
                      placeholder="Paste an image URL to use as card backdrop…"
                    />
                    {/* Hidden validator img */}
                    {thumbUrl && !thumbValid && (
                      <img src={thumbUrl} style={{ display: "none" }}
                        onLoad={() => setThumbValid(true)}
                        onError={() => setThumbValid(false)}
                        alt=""
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ════ STEP 2 — AUDIENCE ════ */}
            {step === 2 && (
              <>
                <div className="ccw-heading">Target <em>Audience</em></div>
                <div className="ccw-sub">Choose which companies see this course, or leave open for everyone</div>

                {/* Filter row — reuses ccm-ind-chip + search-box from globals */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--t2)", flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={allFiltered}
                      onChange={e => toggleAll(e.target.checked)}
                      style={{ width: 13, height: 13, accentColor: "var(--purple)", cursor: "pointer" }}
                    />
                    All
                  </label>
                  <div style={{ width: 1, height: 16, background: "var(--border)" }} />
                  {["All","F&B","Retail","Warehouse"].map(f => (
                    <button
                      key={f}
                      className={`ccm-ind-chip${industryFilter === f ? " on" : ""}`}
                      onClick={() => setIndustryFilter(f)}
                    >
                      {f === "All" ? "All Industries" : f}
                    </button>
                  ))}
                  <div className="search-box" style={{ width: 158, marginLeft: "auto", padding: "5px 10px", flexShrink: 0 }}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/>
                    </svg>
                    <input
                      type="text" placeholder="Search companies…"
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                      style={{ fontSize: 11 }}
                    />
                  </div>
                </div>

                {/* Company grid — reuses ccm-company-* from globals */}
                <div className="ccw-company-grid">
                  {filteredClients.map((c, i) => (
                    <div
                      key={c.id}
                      className={`ccm-company-item${selectedCompanies.has(c.id) ? " selected" : ""}`}
                      onClick={() => toggleCompany(c.id)}
                    >
                      <input
                        type="checkbox" checked={selectedCompanies.has(c.id)} onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: "var(--purple)", cursor: "pointer" }}
                      />
                      <div className="ccm-company-ico" style={{ background: CC_COLORS[i % CC_COLORS.length] }}>
                        {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ccm-company-name">{c.name}</div>
                        <div className="ccm-company-cat">{c.cat}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`ccw-audience-note${selectedCompanies.size === 0 ? " open" : " assigned"}`}>
                  <span>{selectedCompanies.size === 0 ? "🌐" : "✅"}</span>
                  {selectedCompanies.size === 0
                    ? <span>This course will be visible to <strong>all companies</strong></span>
                    : <span>Assigned to <strong>{selectedCompanies.size}</strong> {selectedCompanies.size === 1 ? "company" : "companies"}</span>
                  }
                </div>
              </>
            )}

            {/* ════ STEP 3 — REVIEW ════ */}
            {step === 3 && (
              <>
                <div className="ccw-heading">{isEdit ? "Review & " : "Review & "}<em>{isEdit ? "Save" : "Publish"}</em></div>
                <div className="ccw-sub">{isEdit ? "Confirm your changes, or save as inactive to review later." : "Everything look right? Publish live or save a draft to finish later."}</div>

                {/* Summary card */}
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 16, background: "var(--surface)" }}>
                  <div className="ccw-review-thumb" style={{ background: `linear-gradient(135deg, ${grad.a}, ${grad.b})` }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
                    <div style={{ position: "absolute", bottom: 12, left: 14, fontSize: 38, filter: "drop-shadow(0 3px 10px rgba(0,0,0,.3))" }}>
                      {selectedEmoji}
                    </div>
                    {cat && (
                      <div style={{ position: "absolute", top: 10, left: 12, padding: "2px 9px", borderRadius: 20, background: "rgba(0,0,0,.3)", backdropFilter: "blur(6px)", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.9)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                        {cat}
                      </div>
                    )}
                    {thumbUrl && thumbValid && (
                      <img src={thumbUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.32, mixBlendMode: "luminosity" }} />
                    )}
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div className="ccw-review-title">{title || "Untitled Course"}</div>
                    <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, lineHeight: 1.55 }}>
                      {desc || <span style={{ color: "var(--t4)" }}>No description provided</span>}
                    </div>
                    <div className="ccw-review-meta">
                      <div className="ccw-review-tag" style={{ background: "var(--purple-lt)", color: "var(--purple-d)" }}>
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                        {duration}
                      </div>
                      <div className="ccw-review-tag" style={{ background: "var(--teal-lt)", color: "var(--teal)" }}>
                        ◈ {cat}
                      </div>
                      {selectedCompanies.size > 0 ? (
                        <div className="ccw-review-tag" style={{ background: "var(--sky-lt)", color: "var(--sky)" }}>
                          🏢 {selectedCompanies.size} {selectedCompanies.size === 1 ? "company" : "companies"}
                        </div>
                      ) : (
                        <div className="ccw-review-tag" style={{ background: "var(--amber-lt)", color: "var(--amber)" }}>
                          🌐 All companies
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Draft / Publish choice cards */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div className="ccw-option-card" onClick={handleDraft}>
                    <div className="ccw-option-icon">📝</div>
                    <div className="ccw-option-title">{isEdit ? "Save as Inactive" : "Save as Draft"}</div>
                    <div className="ccw-option-desc">
                      {isEdit ? "Save changes but keep the course hidden from learners." : "Keep this course hidden while you continue building it out."}
                    </div>
                    <div className="ccw-option-cta">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                      {isEdit ? "Save inactive" : "Save draft"}
                    </div>
                  </div>
                  <div className="ccw-option-card publish" onClick={handlePublish}>
                    <div className="ccw-option-icon">{isEdit ? "✅" : "🚀"}</div>
                    <div className="ccw-option-title">{isEdit ? "Save & Activate" : "Publish Now"}</div>
                    <div className="ccw-option-desc">
                      {isEdit ? "Save changes and make the course active for the selected companies." : "Make this course live and available to the selected companies immediately."}
                    </div>
                    <div className="ccw-option-cta">
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                      {isEdit ? "Save & activate" : "Publish course"}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── Footer (reuses .modal-foot from globals) ── */}
        <div className="modal-foot">
          <div style={{ fontSize: 10.5, color: "var(--t3)", flex: 1 }}>{footerNote}</div>

          {step > 0 && (
            <button className="btn btn-s btn-sm" onClick={goBack}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 2L4 7l5 5"/></svg>
              Back
            </button>
          )}

          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>

          {step < 3 && (
            <button className="ccw-btn-next" onClick={goNext}>
              {step === 2 ? "Review" : "Continue"}
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 2l5 5-5 5"/></svg>
            </button>
          )}

          {step === 3 && (
            <>
              <button className="ccw-btn-draft" onClick={handleDraft}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
                {isEdit ? "Save Inactive" : "Save Draft"}
              </button>
              <button className="ccw-btn-publish" onClick={handlePublish}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                {isEdit ? "Save & Activate" : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
