import { useState } from "react";
import type { Course, Module } from "../../Data/types";
import type { Activity } from "../Learning_Module/ActivityBuilderPanel";
import api from "../../Services/api.service";

export interface CourseCatalogProps {
  courses:       Course[];
  setCourses:    React.Dispatch<React.SetStateAction<Course[]>>;
  categories:    string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toast:         (msg: string) => void;
  onOpenCourse:  (idx: number) => void;
  publishedActivities: Activity[];
}

export const THUMB_GRADIENTS = [
  ["#4c1d95","#0d9488"],["#0c4a6e","#065f46"],["#831843","#4c1d95"],
  ["#78350f","#dc2626"],["#064e3b","#0c4a6e"],["#1e3a8a","#4c1d95"],
  ["#9d174d","#78350f"],["#134e4a","#1e3a8a"],
];

export const THUMB_PATTERNS = [
  `radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px)`,
  `repeating-linear-gradient(45deg,rgba(255,255,255,0.06) 0,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 14px)`,
  `repeating-linear-gradient(-45deg,rgba(255,255,255,0.06) 0,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 14px)`,
  `repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 18px),repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 18px)`,
];

export const CAT_ICONS: Record<string, string> = {
  "POS Training":"🖥️","Food Safety":"🍽️","Customer Service":"🎯",
  "HR & Compliance":"📋","Sales":"📈","Operations":"⚙️","Finance":"💰","Leadership":"🏆",
};

export const CARD_STYLES = `
.cc3-card {
  border-radius:18px; overflow:hidden; background:#fff;
  border:1px solid rgba(109,40,217,0.08);
  box-shadow:0 2px 14px rgba(109,40,217,0.07);
  cursor:pointer; display:flex; flex-direction:column;
  transition:transform .24s cubic-bezier(0.16,1,0.3,1),box-shadow .24s,border-color .18s;
}
.cc3-card:hover {
  transform:translateY(-6px) scale(1.01);
  box-shadow:0 22px 56px rgba(109,40,217,0.18);
  border-color:rgba(109,40,217,0.22);
}
.cc3-overlay { opacity:0; transition:opacity .22s ease; }
.cc3-card:hover .cc3-overlay { opacity:1; }
.cc3-emoji { transition:transform .24s cubic-bezier(0.16,1,0.3,1); }
.cc3-card:hover .cc3-emoji { transform:scale(1.14) translateY(-4px); }
.cc3-shine {
  position:absolute; inset:0;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.14) 50%,transparent 65%);
  transform:translateX(-100%); transition:transform .55s ease;
}
.cc3-card:hover .cc3-shine { transform:translateX(100%); }
.cc3-btn { transition:background .13s,transform .13s,box-shadow .13s; }
.cc3-btn:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,0,0,0.1); }
@keyframes cc3-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
`;

export function useCourseCatalog({
  courses,
  setCourses,
  toast,
  onOpenCourse,
}: Pick<CourseCatalogProps, "courses" | "setCourses" | "toast" | "onOpenCourse">) {
  const [search,        setSearch]        = useState("");
  const [activeCat,     setActiveCat]     = useState("All");
  const [statusFilter,  setStatusFilter]  = useState("All");
  const [filterOn,      setFilterOn]      = useState(true);
  const [editOpen,      setEditOpen]      = useState(false);
  const [editIdx,       setEditIdx]       = useState<number | null>(null);
  const [modOpen,       setModOpen]       = useState(false);
  const [modIdx,        setModIdx]        = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIdx,     setDeleteIdx]     = useState<number | null>(null);

  const filtered = courses.filter(c => {
    const catOk    = activeCat === "All" || c.cat === activeCat;
    const searchOk = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase());
    const statOk   = statusFilter === "All" || (statusFilter === "Published" && c.active) || (statusFilter === "Draft" && !c.active);
    return catOk && searchOk && statOk;
  });

  // ── SAVE TO BACKEND ────────────────────────────────────────────────────────
  const handleEditSave = async (data: Course) => {
    try {
      if (editIdx !== null) {
        // UPDATE existing course
        const existingCourse = courses[editIdx];
        console.log('🔄 Updating course:', existingCourse);
        console.log('🔄 Course ID:', existingCourse.id);
        console.log('🔄 Update data:', data);
        
        if (existingCourse.id) {
          const response = await api.courses.update(existingCourse.id, data);
          console.log('🔄 Update response:', response);
          
          if (response.success) {
            setCourses(prev => prev.map((c, i) => i === editIdx ? { ...c, ...data } : c));
            toast('Course updated successfully');
          } else {
            toast(`Error: ${response.error || 'Failed to update course'}`);
            return;
          }
        } else {
          console.error('❌ Course has no ID, cannot update in database');
          toast('Cannot update: Course has no ID');
          return;
        }
      } else {
        // CREATE new course
        const response = await api.courses.create(data);
        
        if (response.success && response.data) {
          const newCourse = { ...data, id: response.data.id };
          setCourses(prev => [...prev, newCourse]);
          toast('Course created successfully');
        } else {
          toast(`Error: ${response.error || 'Failed to create course'}`);
          return;
        }
      }
      
      setEditOpen(false);
      setEditIdx(null);
    } catch (error) {
      console.error('Error saving course:', error);
      toast('Failed to save course to server');
    }
  };

  // ── DELETE FROM BACKEND ────────────────────────────────────────────────────
  const handleDelete = (idx: number) => {
    setDeleteIdx(idx);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteIdx !== null) {
      const course = courses[deleteIdx];
      
      try {
        if (course.id) {
          const response = await api.courses.delete(course.id);
          
          if (response.success) {
            toast(`"${course.title}" deleted.`);
            setCourses(prev => prev.filter((_, i) => i !== deleteIdx));
          } else {
            toast(`Error: ${response.error || 'Failed to delete course'}`);
          }
        } else {
          // If no ID, just remove from local state
          toast(`"${course.title}" deleted.`);
          setCourses(prev => prev.filter((_, i) => i !== deleteIdx));
        }
        
        setDeleteConfirmOpen(false);
        setDeleteIdx(null);
      } catch (error) {
        console.error('Error deleting course:', error);
        toast('Failed to delete course from server');
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteIdx(null);
  };

  // ── SAVE MODULES TO BACKEND ────────────────────────────────────────────────
  const handleModSave = async (idx: number, modules: Module[]) => {
    const course = courses[idx];
    
    // Update local state first
    setCourses(prev => prev.map((c, i) => i === idx ? { ...c, modules } : c));
    
    // Then save to backend
    try {
      if (course.id) {
        const response = await api.courses.updateModules(course.id, modules);
        
        if (response.success) {
          toast('Modules updated successfully');
        } else {
          toast(`Error: ${response.error || 'Failed to update modules'}`);
        }
      }
    } catch (error) {
      console.error('Error saving modules:', error);
      toast('Failed to save modules to server');
    }
  };

  const openViewer = (realIdx: number) => {
    onOpenCourse(realIdx);
  };

  const openEdit = (realIdx: number) => {
    setEditIdx(realIdx);
    setEditOpen(true);
  };

  const openModules = (realIdx: number) => {
    setModIdx(realIdx);
    setModOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditIdx(null);
  };

  const closeMod = () => {
    setModOpen(false);
    setModIdx(null);
  };

  return {
    // state
    search, setSearch,
    activeCat, setActiveCat,
    statusFilter, setStatusFilter,
    filterOn, setFilterOn,
    editOpen, editIdx,
    modOpen, modIdx,
    deleteConfirmOpen, deleteIdx,
    filtered,
    // handlers
    handleEditSave,
    handleDelete,
    confirmDelete,
    cancelDelete,
    handleModSave,
    openViewer,
    openEdit,
    openModules,
    closeEdit,
    closeMod,
  };
}
