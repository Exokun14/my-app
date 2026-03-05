import { useState, useEffect, useRef } from "react";
import constants from "../../Data/test_data.json";
import type { Course, Client } from "../../Data/types";
import { uploadFile } from "../../Services/api";

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

export default function CreateCourseModal({
  open,
  onClose,
  onSave,
  editCourse,
  categories,
  setCategories,
  toast,
}: CreateCourseModalProps) {
  const isEdit = !!editCourse;

  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [industryFilter, setIndustryFilter] = useState<string>("All");
  const [companySearch, setCompanySearch] = useState<string>("");
  const [showCatManager, setShowCatManager] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState<string>("");

  // ── Upload state ──────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (isEdit && editCourse) {
      setTitle(editCourse.title);
      setDesc(editCourse.desc || "");
      setCat(editCourse.cat);
      setDuration(editCourse.time);
      setThumbUrl(editCourse.thumb || "");
    } else {
      setTitle(""); setDesc(""); setCat(""); setDuration(""); setThumbUrl("");
    }
    setSelectedCompanies(new Set());
    setIndustryFilter("All");
    setCompanySearch("");
    setShowCatManager(false);
    setNewCatName("");
    setRenamingCat(null);
  }, [open, isEdit, editCourse]);

  // ── Handle thumbnail file upload ──────────────────────────
  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file.");
      return;
    }

    setUploading(true);
    try {
      const data = await uploadFile(file);
      setThumbUrl(`http://localhost${data.url}`);
      toast("Thumbnail uploaded successfully!");
    } catch (err) {
      toast("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredClients = CLIENTS.filter(c => {
    const indOk = industryFilter === "All" || c.cat === industryFilter;
    const srchOk = !companySearch || c.name.toLowerCase().includes(companySearch.toLowerCase());
    return indOk && srchOk;
  });

  const allSelected = filteredClients.length > 0 && filteredClients.every(c => selectedCompanies.has(c.id));

  const toggleCompany = (id: number) => {
    setSelectedCompanies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedCompanies(prev => {
      const next = new Set(prev);
      filteredClients.forEach(c => checked ? next.add(c.id) : next.delete(c.id));
      return next;
    });
  };

  const addCategory = () => {
    const v = newCatName.trim();
    if (!v) { toast("Enter a category name."); return; }
    if (categories.includes(v)) { toast("Category already exists."); return; }
    setCategories(prev => [...prev, v]);
    setNewCatName("");
    toast(`Category "${v}" added!`);
  };

  const deleteCategory = (c: string) => {
    setCategories(prev => prev.filter(x => x !== c));
    toast(`Category "${c}" removed.`);
  };

  const saveRename = () => {
    const v = renameVal.trim();
    if (!v) { toast("Category name cannot be empty."); return; }
    if (v !== renamingCat && categories.includes(v)) { toast(`Category "${v}" already exists.`); return; }
    setCategories(prev => prev.map(x => x === renamingCat ? v : x));
    setRenamingCat(null);
    toast(`Category renamed to "${v}".`);
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast("Please enter a course title."); return; }
    if (!cat)          { toast("Please select a category.");    return; }
    if (!duration.trim()) { toast("Please enter the estimated duration."); return; }
    const companies = CLIENTS.filter(c => selectedCompanies.has(c.id)).map(c => c.name);
    onSave({
      title: title.trim(),
      desc: desc || "No description provided.",
      time: duration.trim(),
      thumb: thumbUrl || null,
      thumbEmoji: !thumbUrl ? "📚" : null,
      cat,
      enrolled: false,
      progress: 0,
      active: true,
      companies: companies.length ? companies : null,
    });
  };

  const footerNote = !title.trim() || !cat || !duration.trim()
    ? "Fill in the required fields to continue."
    : selectedCompanies.size === 0
      ? "Course will be visible to all companies."
      : `Assigned to ${selectedCompanies.size} compan${selectedCompanies.size === 1 ? "y" : "ies"}.`;

  const footerNoteColor = (!title.trim() || !cat || !duration.trim()) ? "var(--t3)" : "var(--teal)";

  if (!open) return null;

  return (
    <div className="modal-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal ccm">

        {/* Header */}
        <div className="modal-head">
          <div className="modal-head-ico">
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.6">
              <path d="M10 2L2 6l8 4 8-4-8-4z"/><path d="M2 10l8 4 8-4"/><path d="M2 14l8 4 8-4"/>
            </svg>
          </div>
          <div className="modal-head-info">
            <div className="modal-title">{isEdit ? "Edit Course" : "Create New Course"}</div>
            <div className="modal-sub">{isEdit ? "Update the details for this course" : "Build a learning module and assign it to client companies"}</div>
          </div>
          <button className="modal-x" onClick={onClose}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Course Info */}
          <div className="ccm-section">
            <div className="ccm-sec-hd">
              <div className="ccm-sec-ico" style={{ background: "var(--purple-lt)", color: "var(--purple)" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 8h6M8 5v6"/>
                </svg>
              </div>
              <span className="ccm-sec-label">Course Information</span>
            </div>
            <div className="field-g" style={{ marginBottom: 11 }}>
              <label className="f-lbl">Course Title <span style={{ color: "var(--red)" }}>*</span></label>
              <input className="f-in" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. POS Advanced Training" />
            </div>
            <div className="field-g" style={{ marginBottom: 11 }}>
              <label className="f-lbl">Description</label>
              <textarea className="f-in" value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Briefly describe what this course covers..." />
            </div>
            <div className="field-g row">
              <div className="field-g">
                <label className="f-lbl">
                  Category <span style={{ color: "var(--red)" }}>*</span>
                  <button className="cat-manage-btn" onClick={() => setShowCatManager(v => !v)}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="6" cy="6" r="5"/><path d="M6 3v6M3 6h6"/>
                    </svg>
                    Manage
                  </button>
                </label>
                <select className="f-sel" value={cat} onChange={e => setCat(e.target.value)}>
                  <option value="">Select category...</option>
                  {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {showCatManager && (
                  <div className="ccm-cat-manager">
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>Manage Categories</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8, maxHeight: 130, overflowY: "auto" }}>
                      {categories.filter(c => c !== "All").map(c => (
                        <div key={c} className="ccm-cat-row">
                          {renamingCat === c ? (
                            <>
                              <input className="f-in" style={{ flex: 1, padding: "3px 7px", fontSize: 11.5, height: 26 }} value={renameVal} onChange={e => setRenameVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveRename()} autoFocus />
                              <button className="ccm-cat-rename" onClick={saveRename}>✓</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex: 1, fontSize: 11.5 }}>{c}</span>
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
                      <input className="f-in" type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category name..." style={{ fontSize: 11.5, padding: "6px 10px" }} onKeyDown={e => e.key === "Enter" && addCategory()} />
                      <button className="btn btn-p btn-sm" onClick={addCategory} style={{ whiteSpace: "nowrap" }}>Add</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="field-g">
                <label className="f-lbl">Estimated Duration <span style={{ color: "var(--red)" }}>*</span></label>
                <input className="f-in" type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 45 Mins, 1 Hour" />
              </div>
            </div>
          </div>

          {/* Thumbnail — now supports file upload AND URL */}
          <div className="ccm-section">
            <div className="ccm-sec-hd">
              <div className="ccm-sec-ico" style={{ background: "var(--sky-lt)", color: "var(--sky)" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.5" y="3" width="13" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="M1.5 12l4-4 2.5 2.5 3-3.5 4 5"/>
                </svg>
              </div>
              <span className="ccm-sec-label">Thumbnail</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

              {/* Preview box */}
              <div className="ccm-thumb-preview">
                {uploading ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ fontSize: 9, color: "rgba(124,58,237,0.5)" }}>Uploading...</span>
                  </div>
                ) : thumbUrl ? (
                  <img src={thumbUrl} alt="thumb" onError={() => setThumbUrl("")} />
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <span>No image</span>
                  </>
                )}
              </div>

              {/* Upload controls */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleThumbUpload}
                />
                <button
                  className="btn btn-s btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ justifyContent: "center", width: "100%" }}
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 1v8M4 4l3-3 3 3M2 11h10"/>
                  </svg>
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>

                {/* OR divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {/* URL input */}
                <input
                  className="f-in"
                  type="text"
                  value={thumbUrl}
                  onChange={e => setThumbUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  disabled={uploading}
                />

                {/* Clear button */}
                {thumbUrl && (
                  <button
                    className="btn btn-s btn-sm"
                    onClick={() => setThumbUrl("")}
                    style={{ justifyContent: "center", width: "100%", color: "var(--red)", borderColor: "rgba(239,68,68,0.2)" }}
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Assign Companies */}
          <div className="ccm-section" style={{ borderBottom: "none" }}>
            <div className="ccm-sec-hd">
              <div className="ccm-sec-ico" style={{ background: "var(--teal-lt)", color: "var(--teal)" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2"/>
                  <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.2"/>
                </svg>
              </div>
              <span className="ccm-sec-label">Assign to Companies</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--t3)", fontWeight: 500 }}>{selectedCompanies.size} selected</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--t2)", flexShrink: 0 }}>
                <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} style={{ width: 13, height: 13, accentColor: "var(--purple)" }} />
                All
              </label>
              <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} />
              {["All", "F&B", "Retail", "Warehouse"].map(ind => (
                <button key={ind} className={`ccm-ind-chip${industryFilter === ind ? " on" : ""}`} onClick={() => setIndustryFilter(ind)}>
                  {ind === "All" ? "All Industries" : ind}
                </button>
              ))}
              <div className="search-box" style={{ width: 160, marginLeft: "auto", padding: "5px 10px", flexShrink: 0 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
                <input type="text" placeholder="Search..." value={companySearch} onChange={e => setCompanySearch(e.target.value)} style={{ fontSize: 11 }} />
              </div>
            </div>
            <div className="ccm-company-grid">
              {filteredClients.map((c, i) => (
                <div key={c.id} className={`ccm-company-item${selectedCompanies.has(c.id) ? " selected" : ""}`} onClick={() => toggleCompany(c.id)}>
                  <input type="checkbox" checked={selectedCompanies.has(c.id)} onChange={() => toggleCompany(c.id)} onClick={e => e.stopPropagation()} style={{ accentColor: "var(--purple)" }} />
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
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <div style={{ fontSize: 10.5, color: footerNoteColor, flex: 1 }}>{footerNote}</div>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={handleSubmit} style={{ padding: "9px 20px", fontSize: 12.5, borderRadius: 10, boxShadow: "0 3px 12px rgba(124,58,237,0.3)" }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
            {isEdit ? "Save Changes" : "Complete Creation"}
          </button>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
