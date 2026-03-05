import { useState, useEffect, useRef } from "react";
import type { Course, Client } from "../../Data/types";
import { uploadFile } from "../../Services/api";

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Course) => void;
  editCourse: Course | null;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toast: (msg: string) => void;
  clients: Client[];  // ← ADDED: Pass clients as prop
  colors: string[];   // ← ADDED: Pass colors as prop
}

export default function CreateCourseModal({
  open,
  onClose,
  onSave,
  editCourse,
  categories,
  setCategories,
  toast,
  clients,  // ← ADDED
  colors,   // ← ADDED
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
      
      // Map company names to IDs
      const companyIds = editCourse.companies?.map(companyName => {
        const client = clients.find(c => c.name === companyName);
        return client?.id;
      }).filter(id => id !== undefined) as number[];
      
      setSelectedCompanies(new Set(companyIds));
    } else {
      reset();
    }
  }, [open, isEdit, editCourse, clients]);

  const reset = () => {
    setTitle("");
    setDesc("");
    setCat("");
    setDuration("");
    setThumbUrl("");
    setSelectedCompanies(new Set());
    setIndustryFilter("All");
    setCompanySearch("");
    setShowCatManager(false);
    setNewCatName("");
    setRenamingCat(null);
    setRenameVal("");
  };

  const handleSave = () => {
    if (!title.trim() || !cat || !duration) {
      toast("Please fill in all required fields");
      return;
    }

    // Convert selected company IDs to company names
    const companyNames = Array.from(selectedCompanies)
      .map(id => clients.find(c => c.id === id)?.name)
      .filter(Boolean) as string[];

    const courseData: any = {
      title: title.trim(),
      desc: desc.trim(),
      cat,
      time: duration,
      thumb: thumbUrl || null,
      companies: companyNames,
    };

    if (isEdit && editCourse) {
      courseData.id = editCourse.id;
    }

    onSave(courseData);
    reset();
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      setThumbUrl(result.url);
      toast("Thumbnail uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      toast("Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  const toggleCompany = (id: number) => {
    const newSet = new Set(selectedCompanies);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCompanies(newSet);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.includes(newCatName.trim())) {
      toast("Category already exists");
      return;
    }
    setCategories([...categories, newCatName.trim()]);
    toast(`"${newCatName.trim()}" category added`);
    setNewCatName("");
  };

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Delete category "${catName}"?`)) {
      setCategories(categories.filter(c => c !== catName));
      toast(`"${catName}" deleted`);
    }
  };

  const handleRenameCategory = (oldName: string) => {
    if (!renameVal.trim() || renameVal.trim() === oldName) {
      setRenamingCat(null);
      setRenameVal("");
      return;
    }
    if (categories.includes(renameVal.trim())) {
      toast("Category name already exists");
      return;
    }
    setCategories(categories.map(c => c === oldName ? renameVal.trim() : c));
    toast(`"${oldName}" renamed to "${renameVal.trim()}"`);
    setRenamingCat(null);
    setRenameVal("");
  };

  // Filter clients
  const industries = ["All", ...new Set(clients.map(c => c.industry))];
  const filteredClients = clients.filter(c => {
    const industryOk = industryFilter === "All" || c.industry === industryFilter;
    const searchOk = !companySearch || 
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      c.industry.toLowerCase().includes(companySearch.toLowerCase());
    return industryOk && searchOk;
  });

  if (!open) return null;

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="ccm-overlay" onClick={onClose}>
        <div className="ccm-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="ccm-header">
            <div className="ccm-header-content">
              <div className="ccm-icon">{isEdit ? "✏️" : "+"}</div>
              <div>
                <div className="ccm-title">{isEdit ? "Edit Course" : "Create New Course"}</div>
                <div className="ccm-subtitle">
                  {isEdit ? "Update course details" : "Add a new course to your catalog"}
                </div>
              </div>
            </div>
            <button className="ccm-close" onClick={onClose}>×</button>
          </div>

          {/* Body */}
          <div className="ccm-body">
            
            {/* Course Details */}
            <div className="ccm-section">
              <div className="ccm-section-title">Course Details</div>
              
              <div className="ccm-field">
                <label className="ccm-label">
                  Course Title <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="ccm-input"
                  placeholder="e.g., Advanced POS Training"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="ccm-field">
                <label className="ccm-label">Description</label>
                <textarea
                  className="ccm-textarea"
                  placeholder="Brief description of the course content..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="ccm-row">
                <div className="ccm-field" style={{ flex: 1 }}>
                  <label className="ccm-label">
                    Category <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="ccm-select"
                      value={cat}
                      onChange={e => setCat(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select category</option>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      className="ccm-icon-btn"
                      onClick={() => setShowCatManager(!showCatManager)}
                      title="Manage categories"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>

                <div className="ccm-field" style={{ flex: 1 }}>
                  <label className="ccm-label">
                    Duration <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="ccm-input"
                    placeholder="e.g., 2 hours"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Manager */}
              {showCatManager && (
                <div className="ccm-cat-manager">
                  <div className="ccm-cat-header">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>
                      Manage Categories
                    </span>
                  </div>

                  {/* Add new category */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      className="ccm-input"
                      placeholder="New category name"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                      style={{ flex: 1, fontSize: 11 }}
                    />
                    <button className="ccm-btn-add" onClick={handleAddCategory}>
                      Add
                    </button>
                  </div>

                  {/* Category list */}
                  <div className="ccm-cat-list">
                    {categories.map(c => (
                      <div key={c} className="ccm-cat-item">
                        {renamingCat === c ? (
                          <>
                            <input
                              type="text"
                              className="ccm-input"
                              value={renameVal}
                              onChange={e => setRenameVal(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleRenameCategory(c)}
                              onBlur={() => handleRenameCategory(c)}
                              autoFocus
                              style={{ flex: 1, fontSize: 11 }}
                            />
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{c}</span>
                            <button
                              className="ccm-cat-action"
                              onClick={() => {
                                setRenamingCat(c);
                                setRenameVal(c);
                              }}
                              title="Rename"
                            >
                              ✏️
                            </button>
                            <button
                              className="ccm-cat-action"
                              onClick={() => handleDeleteCategory(c)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thumbnail */}
              <div className="ccm-field">
                <label className="ccm-label">Thumbnail Image</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    className="ccm-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                  {thumbUrl && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={thumbUrl} alt="Thumbnail" className="ccm-thumb-preview" />
                      <button
                        className="ccm-icon-btn"
                        onClick={() => setThumbUrl("")}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Selection */}
            <div className="ccm-section">
              <div className="ccm-section-title">
                Assign to Companies ({selectedCompanies.size} selected)
              </div>

              {/* Filters */}
              <div className="ccm-filters">
                <select
                  className="ccm-select"
                  value={industryFilter}
                  onChange={e => setIndustryFilter(e.target.value)}
                  style={{ fontSize: 11 }}
                >
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="ccm-input"
                  placeholder="Search companies..."
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  style={{ flex: 1, fontSize: 11 }}
                />
              </div>

              {/* Company grid */}
              <div className="ccm-company-grid">
                {filteredClients.map(client => {
                  const isSelected = selectedCompanies.has(client.id);
                  return (
                    <div
                      key={client.id}
                      className={`ccm-company-card${isSelected ? " selected" : ""}`}
                      onClick={() => toggleCompany(client.id)}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div
                          className="ccm-checkbox"
                          style={{
                            background: isSelected ? "var(--purple)" : "transparent",
                            border: isSelected ? "1.5px solid var(--purple)" : "1.5px solid #d1d5db",
                          }}
                        >
                          {isSelected && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ccm-company-name">{client.name}</div>
                          <div className="ccm-company-industry">{client.industry}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredClients.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--t3)", fontSize: 12 }}>
                  No companies found
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ccm-footer">
            <button className="ccm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="ccm-btn-primary" onClick={handleSave}>
              {isEdit ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const MODAL_STYLES = `
/* (Keep all your existing modal styles - they remain unchanged) */
/* I'm including the essential ones here */

.ccm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
  padding: 20px;
}

.ccm-modal {
  background: var(--surface, #fff);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ccm-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, rgba(124, 58, 237, 0.1));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ccm-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ccm-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--teal, #0d9488));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.ccm-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--t1, #18103a);
  letter-spacing: -0.02em;
}

.ccm-subtitle {
  font-size: 12px;
  color: var(--t2, #4a3870);
  margin-top: 2px;
}

.ccm-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--t2, #4a3870);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.ccm-close:hover {
  background: rgba(124, 58, 237, 0.08);
}

.ccm-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.ccm-section {
  margin-bottom: 24px;
}

.ccm-section:last-child {
  margin-bottom: 0;
}

.ccm-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--t1, #18103a);
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ccm-field {
  margin-bottom: 16px;
}

.ccm-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--t2, #4a3870);
  margin-bottom: 6px;
}

.ccm-input, .ccm-select, .ccm-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.15));
  background: var(--bg, #faf9ff);
  font-size: 13px;
  color: var(--t1, #18103a);
  font-family: inherit;
  transition: all 0.15s;
}

.ccm-input:focus, .ccm-select:focus, .ccm-textarea:focus {
  outline: none;
  border-color: var(--purple, #7c3aed);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.ccm-textarea {
  resize: vertical;
  min-height: 80px;
}

.ccm-row {
  display: flex;
  gap: 12px;
}

.ccm-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.15));
  background: var(--bg, #faf9ff);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ccm-icon-btn:hover {
  background: rgba(124, 58, 237, 0.08);
  border-color: var(--purple, #7c3aed);
}

.ccm-cat-manager {
  padding: 14px;
  border-radius: 10px;
  background: rgba(124, 58, 237, 0.04);
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  margin-top: 12px;
}

.ccm-cat-header {
  margin-bottom: 12px;
}

.ccm-btn-add {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--purple, #7c3aed);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ccm-btn-add:hover {
  background: var(--teal, #0d9488);
}

.ccm-cat-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.ccm-cat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid rgba(124, 58, 237, 0.1);
}

.ccm-cat-action {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.ccm-cat-action:hover {
  background: rgba(124, 58, 237, 0.1);
}

.ccm-upload-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.2));
  background: var(--bg, #faf9ff);
  color: var(--purple, #7c3aed);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ccm-upload-btn:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.08);
}

.ccm-upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ccm-thumb-preview {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.15));
}

.ccm-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.ccm-company-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.ccm-company-card {
  padding: 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.1));
  background: var(--bg, #faf9ff);
  cursor: pointer;
  transition: all 0.15s;
}

.ccm-company-card:hover {
  border-color: var(--purple, #7c3aed);
  background: rgba(124, 58, 237, 0.04);
}

.ccm-company-card.selected {
  border-color: var(--purple, #7c3aed);
  background: rgba(124, 58, 237, 0.08);
}

.ccm-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.ccm-company-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--t1, #18103a);
  margin-bottom: 2px;
}

.ccm-company-industry {
  font-size: 10px;
  color: var(--t3, #a89dc8);
}

.ccm-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border, rgba(124, 58, 237, 0.1));
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.ccm-btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.2));
  background: transparent;
  color: var(--t2, #4a3870);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ccm-btn-secondary:hover {
  background: rgba(124, 58, 237, 0.06);
}

.ccm-btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--teal, #0d9488));
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
}

.ccm-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
