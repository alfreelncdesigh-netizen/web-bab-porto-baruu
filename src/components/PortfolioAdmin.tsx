import { useState, useEffect } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import ConfirmModal from './ConfirmModal';
import { motion } from 'motion/react';
import { Project, categories } from '../data/projects';
import { Edit, Trash, EyeOff, Eye, Plus, X, Check, Upload, Loader2, Link as LinkIcon, Archive, AlertCircle, Handshake } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStoredProjects, saveStoredProjects, cleanProjects, getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { SiteSettings } from '../data/settings';
import { getOptimizedImageUrl } from "../lib/cloudinary";
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { withTimeout, compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';

export default function PortfolioAdmin() {
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setProjects(e.detail);
    };
    window.addEventListener('user_projects_updated', handleUpdate);

    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.isArchived) {
            projs.push({ id: docSnap.id, ...data } as Project);
          }
        });
        projs.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          return dateB.localeCompare(dateA);
        });
        const cleaned = cleanProjects(projs);
        setProjects(cleaned);
        saveStoredProjects(cleaned);
      },
      (error) => {
        console.warn("Firestore Admin Error (using stored projects):", error);
        setProjects(getStoredProjects());
      }
    );
    return () => {
      unsubscribe();
      window.removeEventListener('user_projects_updated', handleUpdate);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSaving(true);

    const docId = editingProject.id.toString();

    // Pastikan payload yang dikirim HANYA BERISI TEXT STRING (kumpulan URL gambar, judul, dan deskripsi)
    // Tanpa Base64 raksasa agar proses simpan instan (< 2 detik)
    const savedProj: Project = {
      id: docId,
      title: editingProject.title.trim(),
      category: editingProject.category.trim() || 'UI/UX',
      image: (editingProject.image || '').trim(),
      images: editingProject.images || (editingProject.image ? [editingProject.image.trim()] : []),
      description: (editingProject.description || '').trim(),
      date: (editingProject.date || '').trim() || new Date().toISOString().split('T')[0],
      role: (editingProject.role || '').trim(),
      aspectRatio: editingProject.aspectRatio || '1:1',
      draft: Boolean(editingProject.draft),
      totalHoursSpent: (editingProject.totalHoursSpent || '').toString().trim(),
      toolsUsed: (editingProject.toolsUsed || '').toString().trim(),
      completionDate: (editingProject.completionDate || '').toString().trim(),
      isCollaboration: Boolean(editingProject.isCollaboration),
      collaborationPartner: (editingProject.collaborationPartner || '').trim(),
      collaborationLogo: (editingProject.collaborationLogo || '').trim(),
      collaborationText: (editingProject.collaborationText || '').trim(),
    };

    // Update state dan local storage seketika agar langsung tampil di website
    setProjects(prev => {
      const exists = prev.some(p => p.id.toString() === docId);
      const updated = exists ? prev.map(p => p.id.toString() === docId ? savedProj : p) : [savedProj, ...prev];
      saveStoredProjects(updated);
      return updated;
    });

    // Jika kolaborasi aktif pada karya ini, langsung terapkan ke pengaturan website agar logo langsung tampil di header & website
    if (savedProj.isCollaboration) {
      try {
        const siteSettings = getStoredSettings();
        const partnerLogo = savedProj.collaborationLogo || siteSettings.collaboration?.partnerLogo || '';
        const partnerName = savedProj.collaborationPartner || siteSettings.collaboration?.partnerName || '';
        const collabText = savedProj.collaborationText || siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama';

        const updatedSettings: SiteSettings = {
          ...siteSettings,
          collaboration: {
            ...siteSettings.collaboration,
            enabled: true,
            partnerName: partnerName || siteSettings.collaboration?.partnerName || '',
            partnerLogo: partnerLogo || siteSettings.collaboration?.partnerLogo || '',
            collaborationText: collabText,
            autoTagNewItems: Boolean(siteSettings.collaboration?.autoTagNewItems)
          },
          savedAt: Date.now()
        };
        saveStoredSettings(updatedSettings);
      } catch (collabErr) {
        console.warn("Notice: Syncing project collaboration to settings:", collabErr);
      }
    }

    // Tutup modal dan tampilkan notifikasi berhasil seketika (optimistic save)
    showToast("Karya berhasil disimpan & langsung tampil di web!");
    setEditingProject(null);
    setSaving(false);

    try {
      const projectRef = doc(db, 'projects', docId);
      await withTimeout(
        setDoc(projectRef, {
          title: savedProj.title,
          category: savedProj.category,
          image: savedProj.image,
          images: savedProj.images || [],
          description: savedProj.description,
          date: savedProj.date || new Date().toISOString().split('T')[0],
          role: savedProj.role || '',
          aspectRatio: savedProj.aspectRatio || '1:1',
          draft: savedProj.draft || false,
          totalHoursSpent: savedProj.totalHoursSpent || '',
          toolsUsed: savedProj.toolsUsed || '',
          completionDate: savedProj.completionDate || '',
          isCollaboration: savedProj.isCollaboration || false,
          collaborationPartner: savedProj.collaborationPartner || '',
          collaborationLogo: savedProj.collaborationLogo || '',
          collaborationText: savedProj.collaborationText || '',
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        4000,
        "Database cloud disinkronkan di latar belakang."
      );
    } catch (err: any) {
      console.warn("Save Project Cloud background sync notice:", err);
    }
  };

  const handleDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    const docId = projectToDelete.id.toString();

    // 1. Langsung hapus dari tampilan admin dan publik seketika (optimistic update)
    const updated = projects.filter(p => p.id.toString() !== docId);
    setProjects(updated);
    saveStoredProjects(updated);
    showToast(`"${projectToDelete.title || 'Karya'}" berhasil dihapus permanen.`);
    setProjectToDelete(null);

    // 2. Eksekusi penghapusan di database Cloud Firestore
    try {
      await withTimeout(
        deleteDoc(doc(db, 'projects', docId)),
        6000,
        "Database cloud selesai diperbarui."
      );
    } catch (err: any) {
      console.warn("[DELETE] Notice database cloud:", err?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleDraft = async (project: Project) => {
    const newDraftStatus = !project.draft;
    try {
      await withTimeout(
        updateDoc(doc(db, 'projects', project.id.toString()), {
          draft: newDraftStatus
        }),
        10000,
        "Waktu update status habis (10 detik)."
      );
      setProjects(prev => {
        const updated = prev.map(p => p.id === project.id ? { ...p, draft: newDraftStatus } : p);
        saveStoredProjects(updated);
        return updated;
      });
      showToast(newDraftStatus ? "Karya disembunyikan (Draft)." : "Karya ditampilkan (Publik).");
    } catch (err: any) {
      setProjects(prev => {
        const updated = prev.map(p => p.id === project.id ? { ...p, draft: newDraftStatus } : p);
        saveStoredProjects(updated);
        return updated;
      });
      showToast("Status draft diperbarui di lokal.");
    }
  };

  const createNew = () => {
    const siteSettings = getStoredSettings();
    const authSession = typeof window !== 'undefined' ? sessionStorage.getItem('admin_auth_user') : null;
    let isCollabUser = false;
    let collabPartner = '';
    let collabLogo = '';
    if (authSession) {
      try {
        const p = JSON.parse(authSession);
        if (p.role === 'collaborator') {
          isCollabUser = true;
          collabPartner = p.partnerName || '';
          collabLogo = p.partnerLogo || '';
        }
      } catch {}
    }

    const isAutoCollab = isCollabUser || Boolean(siteSettings.collaboration?.enabled && siteSettings.collaboration?.autoTagNewItems);

    setEditingProject({
      id: Date.now().toString(),
      title: '',
      category: 'UI/UX',
      image: '',
      description: '',
      date: '',
      role: '',
      aspectRatio: '1:1',
      draft: false,
      totalHoursSpent: '',
      toolsUsed: '',
      completionDate: '',
      isCollaboration: isAutoCollab,
      collaborationPartner: collabPartner || (isAutoCollab ? (siteSettings.collaboration?.partnerName || '') : ''),
      collaborationLogo: collabLogo || (isAutoCollab ? (siteSettings.collaboration?.partnerLogo || '') : ''),
      collaborationText: isAutoCollab ? (siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama') : ''
    });
  };

  /**
   * 1. Upload Langsung Saat File Dipilih (File Picker / Drag-Drop)
   * 2. Kompresi Otomatis di Client Menggunakan HTML5 Canvas (max 1000px, WebP, quality 0.78 < 150 KB)
   * 3. Multiple Upload via Promise.all jika memilih lebih dari 1 file
   * 4. Error Handling & Timeout 10 detik
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProject) return;

    const fileList = Array.from(files);
    const firstFile = fileList[0];

    // Validasi rasio aspek jika gambar
    if (firstFile.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(firstFile);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const ratio = img.width / img.height;
        let expectedRatioStr = '';
        let expectedRatioVal = 0;
        let isValid = true;
        const cat = editingProject.category;

        if (cat === 'Poster' || cat === 'Branding') {
          expectedRatioVal = 1 / 2;
          expectedRatioStr = '1:2';
          if (Math.abs(ratio - expectedRatioVal) > 0.1) isValid = false;
        } else if (cat === 'PowerPoint') {
          expectedRatioVal = 16 / 9;
          expectedRatioStr = '16:9';
          if (Math.abs(ratio - expectedRatioVal) > 0.1) isValid = false;
        } else if (cat === 'Postingan Instagram') {
          let rVal = 1;
          if (editingProject.aspectRatio === '4:5') rVal = 4 / 5;
          if (editingProject.aspectRatio === '16:9') rVal = 16 / 9;

          if (Math.abs(ratio - rVal) > 0.1) {
            isValid = false;
            expectedRatioStr = editingProject.aspectRatio || '1:1';
          }
        }

        if (!isValid) {
          console.warn(`Peringatan: Ukuran gambar tidak sesuai dengan rasio bingkai untuk kategori ${cat}. Rasio yang disarankan adalah ${expectedRatioStr}.`);
        }
      };
      img.src = objectUrl;
    }

    setUploading(true);

    try {
      if (fileList.length === 1) {
        setUploadStatusText("Mengompres & Mengunggah Gambar...");
        const cleanUrl = await compressAndUpload(firstFile, 'portfolio');
        setEditingProject(prev => prev ? ({
          ...prev,
          image: cleanUrl,
          images: [cleanUrl, ...(prev.images || []).filter(img => img !== cleanUrl)]
        }) : null);
        showToast("Gambar berhasil diunggah!");
      } else {
        setUploadStatusText(`Mengunggah Gambar (0/${fileList.length})...`);
        const cleanUrls = await uploadMultipleImagesInParallel(
          fileList,
          'portfolio',
          (done, total) => setUploadStatusText(`Mengunggah Gambar (${done}/${total})...`)
        );
        if (cleanUrls.length > 0) {
          setEditingProject(prev => prev ? ({
            ...prev,
            image: cleanUrls[0],
            images: cleanUrls
          }) : null);
          showToast(`${cleanUrls.length} gambar berhasil diunggah!`);
        }
      }
    } catch (err: any) {
      console.error("Upload portfolio image error:", err);
      showToast(err?.message || "Gagal mengunggah gambar. Batas waktu 10 detik terlampaui.", "error");
    } finally {
      setUploading(false);
      setUploadStatusText('');
      e.target.value = '';
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div
          className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-red-500/95 text-white border-red-400'
              : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {!editingProject && (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-black dark:text-white">Daftar Karya (Cloud)</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={createNew}
              className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-[10px] font-semibold flex items-center gap-2 hover:opacity-80 transition-opacity rounded-2xl active:scale-95"
            >
              <Plus size={16} /> Tambah Karya Baru
            </button>
          </div>
        </div>
      )}

      {editingProject ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          noValidate
          className="bg-zinc-50 dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 mb-6 rounded-2xl space-y-4 md:space-y-6 shadow-sm"
        >
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Edit Karya
            </h3>
            <button
              type="button"
              onClick={() => setEditingProject(null)}
              className="text-black hover:text-black dark:text-zinc-400 dark:hover:text-zinc-500 transition-colors bg-white dark:bg-zinc-900 p-2 rounded-2xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Judul Karya</label>
                <input
                  type="text"
                  required
                  value={editingProject.title}
                  onChange={e => setEditingProject({ ...editingProject, title: e.target.value })}
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                  placeholder="CONTOH: POSTER PAMERAN"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Kategori</label>
                  <input
                    type="text"
                    list="category-options"
                    value={editingProject.category}
                    onChange={e => setEditingProject({ ...editingProject, category: e.target.value })}
                    className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                    placeholder="Pilih atau Ketik Kategori Baru"
                    required
                  />
                  <datalist id="category-options">
                    {Array.from(new Set(projects.map(p => p.category))).filter(Boolean).map(c => (
                      <option key={c as string} value={c as string} />
                    ))}
                  </datalist>
                </div>

                {editingProject.category === 'Postingan Instagram' && (
                  <div>
                    <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Rasio Gambar (Instagram)</label>
                    <select
                      value={editingProject.aspectRatio || '1:1'}
                      onChange={e => setEditingProject({ ...editingProject, aspectRatio: e.target.value })}
                      className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white"
                    >
                      <option value="1:1" className="bg-white dark:bg-[#0A0A0A] text-black dark:text-white">1:1 (Square)</option>
                      <option value="4:5" className="bg-white dark:bg-[#0A0A0A] text-black dark:text-white">4:5 (Portrait)</option>
                      <option value="16:9" className="bg-white dark:bg-[#0A0A0A] text-black dark:text-white">16:9 (Landscape)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Tanggal</label>
                  <input
                    type="text"
                    value={editingProject.date || ''}
                    onChange={e => setEditingProject({ ...editingProject, date: e.target.value })}
                    className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Peran Anda</label>
                <input
                  type="text"
                  value={editingProject.role || ''}
                  onChange={e => setEditingProject({ ...editingProject, role: e.target.value })}
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                  placeholder="CONTOH: VISUAL DESIGNER"
                />
              </div>

              {/* Project Metrics Fields */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Project Metrics (Data Dinamis Proyek)
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-1.5 block">Total Jam Pengerjaan</label>
                    <input
                      type="text"
                      value={editingProject.totalHoursSpent || ''}
                      onChange={e => setEditingProject({ ...editingProject, totalHoursSpent: e.target.value })}
                      className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-2.5 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                      placeholder="Contoh: 36 Jam"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-1.5 block">Tanggal Selesai</label>
                    <input
                      type="text"
                      value={editingProject.completionDate || ''}
                      onChange={e => setEditingProject({ ...editingProject, completionDate: e.target.value })}
                      className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-2.5 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                      placeholder="Contoh: 24 Oktober 2024"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-1.5 block">Alat & Software (Tools Used)</label>
                  <input
                    type="text"
                    value={typeof editingProject.toolsUsed === 'string' ? editingProject.toolsUsed : (Array.isArray(editingProject.toolsUsed) ? editingProject.toolsUsed.join(', ') : '')}
                    onChange={e => setEditingProject({ ...editingProject, toolsUsed: e.target.value })}
                    className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-2.5 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
                    placeholder="Contoh: Figma, Affinity Designer, Photoshop"
                  />
                  <p className="text-[9px] text-zinc-400 mt-1">Pisahkan dengan tanda koma (opsional, ada fallback cerdas jika kosong).</p>
                </div>
              </div>
            </div>

            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-black dark:text-zinc-400 block">
                  Gambar Karya (Otomatis WebP Kompres &lt; 150 KB)
                </label>
                {editingProject.image && (
                  <button
                    type="button"
                    onClick={() => setEditingProject({ ...editingProject, image: '' })}
                    className="text-red-500 text-[10px] hover:underline"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
              <div className="relative flex-1 min-h-[200px] bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800/50 hover:border-black dark:hover:border-sky-400 transition-colors rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp, image/svg+xml, application/pdf, application/postscript, .ai, .eps"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />

                {uploading ? (
                  <div className="flex flex-col items-center text-black dark:text-white p-4 text-center">
                    <Loader2 size={32} className="animate-spin mb-3 text-orange-500" />
                    <span className="text-[10px] font-semibold">
                      {uploadStatusText || "Mengompres & Mengunggah Gambar..."}
                    </span>
                  </div>
                ) : editingProject.image ? (
                  <>
                    <img
                      src={
                        editingProject.image?.includes('.pdf')
                          ? 'https://via.placeholder.com/800x400?text=Dokumen+PDF'
                          : editingProject.image?.includes('.eps') || editingProject.image?.includes('.ai')
                          ? 'https://via.placeholder.com/800x400?text=File+Vektor'
                          : getOptimizedImageUrl(editingProject.image)
                      }
                      alt="Preview"
                      className="w-full h-full object-cover absolute inset-0 p-2"
                    />
                    <div className="absolute inset-0 bg-black/60 dark:bg-zinc-950/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-0">
                      <Upload size={24} className="text-white mb-2 transform -translate-y-2 group-hover:translate-y-0 transition-transform" />
                      <span className="text-white text-[10px] font-semibold">Ganti File</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-black dark:text-zinc-500 group-hover:text-black dark:group-hover:text-zinc-500 transition-colors text-center px-4">
                    <Upload size={28} className="mb-3 transform group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[10px] font-semibold mb-1">Pilih File dari Perangkat</span>
                    <span className="text-[9px] font-medium opacity-60">Mendukung JPG, PNG, WEBP, SVG, PDF (Bisa Multiple)</span>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <label className="text-[9px] font-medium text-zinc-500 block mb-1">
                  Atau masukkan Link / URL Gambar secara langsung:
                </label>
                <input
                  type="text"
                  placeholder="https://... atau /uploads/..."
                  value={editingProject.image && !editingProject.image.startsWith('data:') ? editingProject.image : ''}
                  onChange={e => setEditingProject({ ...editingProject, image: e.target.value })}
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-1.5 text-[10px] md:text-xs focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-black dark:text-zinc-400 mb-2 block">Deskripsi Karya</label>
            <textarea
              placeholder="CERITAKAN TENTANG PROYEK INI, LATAR BELAKANG, ATAU PROSES DESAINNYA..."
              rows={5}
              value={editingProject.description}
              onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
              className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-y leading-relaxed font-medium"
            />
          </div>

          {/* FITUR KOLABORASI KARYA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#101012] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Handshake size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                    Tandai Sebagai Karya Kolaborasi
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                    Menampilkan teks kolaborasi & logo mitra di bagian bawah deskripsi saat karya ini diklik.
                  </p>
                </div>
              </div>

              {/* Toggle Kolaborasi Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={editingProject.isCollaboration}
                onClick={() => {
                  const nextState = !editingProject.isCollaboration;
                  const siteSettings = getStoredSettings();
                  setEditingProject({
                    ...editingProject,
                    isCollaboration: nextState,
                    collaborationPartner: editingProject.collaborationPartner || (nextState ? siteSettings.collaboration?.partnerName || '' : ''),
                    collaborationLogo: editingProject.collaborationLogo || (nextState ? siteSettings.collaboration?.partnerLogo || '' : ''),
                    collaborationText: editingProject.collaborationText || (nextState ? siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama' : '')
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editingProject.isCollaboration ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    editingProject.isCollaboration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {editingProject.isCollaboration && (
              <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Nama Mitra Kolaborasi
                  </label>
                  <input
                    type="text"
                    value={editingProject.collaborationPartner || ''}
                    onChange={e => setEditingProject({ ...editingProject, collaborationPartner: e.target.value })}
                    placeholder="Contoh: Brand Partner, Studio Kreatif"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Teks / Label Kolaborasi
                  </label>
                  <input
                    type="text"
                    value={editingProject.collaborationText || 'Kolaborasi Bersama'}
                    onChange={e => setEditingProject({ ...editingProject, collaborationText: e.target.value })}
                    placeholder="Contoh: Kolaborasi Bersama"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Logo Mitra Kolaborasi (URL / Unggah Gambar)
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {editingProject.collaborationLogo && (
                      <img
                        src={resolveImageUrl(editingProject.collaborationLogo)}
                        alt="Logo Kolaborasi"
                        className="h-9 w-auto max-w-[80px] object-contain rounded-lg border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-900 shrink-0"
                        onError={handleImageError}
                      />
                    )}
                    <input
                      type="text"
                      value={editingProject.collaborationLogo || ''}
                      onChange={e => setEditingProject({ ...editingProject, collaborationLogo: e.target.value })}
                      placeholder="Masukkan URL logo atau unggah file..."
                      className="flex-1 min-w-[180px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <label className="cursor-pointer px-3 py-2 text-[10px] font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex items-center gap-1.5 transition-colors active:scale-95 shadow-xs">
                      <Upload size={12} />
                      <span>Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadStatusText("Mengunggah logo mitra...");
                            const url = await compressAndUpload(file, 'collaboration', 600, 0.85);
                            setEditingProject(prev => prev ? { ...prev, collaborationLogo: url } : null);
                            showToast("Logo kolaborasi berhasil diunggah!");
                          } catch (err: any) {
                            showToast("Gagal mengunggah logo mitra", "error");
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    {getStoredSettings().collaboration?.partnerLogo && editingProject.collaborationLogo !== getStoredSettings().collaboration?.partnerLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          const logo = getStoredSettings().collaboration?.partnerLogo || '';
                          const partner = getStoredSettings().collaboration?.partnerName || '';
                          setEditingProject({
                            ...editingProject,
                            collaborationLogo: logo,
                            collaborationPartner: editingProject.collaborationPartner || partner
                          });
                        }}
                        className="px-3 py-2 text-[10px] font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white shrink-0 transition-colors cursor-pointer"
                      >
                        Gunakan Logo Global
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Simpan & Status Indikator Terintegrasi */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={uploading || saving}
              className="bg-black text-white dark:bg-white dark:text-black px-8 py-4 text-[10px] font-semibold hover:opacity-80 transition-opacity rounded-2xl active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{uploadStatusText || "Mengunggah Gambar..."}</span>
                </>
              ) : saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Simpan ke Cloud Database</span>
                </>
              )}
            </button>
          </div>
        </motion.form>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View (md:hidden) */}
          <div className="md:hidden space-y-3">
            {projects.map(project => (
              <div 
                key={project.id}
                className="bg-white dark:bg-[#101010] border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-2xl shadow-xs space-y-3"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                    <img
                      src={
                        project.image?.includes('.pdf')
                          ? 'https://via.placeholder.com/150?text=PDF'
                          : project.image?.includes('.eps') || project.image?.includes('.ai')
                          ? 'https://via.placeholder.com/150?text=Vektor'
                          : resolveImageUrl(project.image)
                      }
                      alt={project.title}
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Err')}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {project.category}
                      </span>
                      {project.draft ? (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                          Draft
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Publik
                        </span>
                      )}
                      {project.isCollaboration && (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center gap-1">
                          <Handshake size={10} /> Mitra
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-black dark:text-white leading-snug line-clamp-2">
                      {project.title}
                    </h4>
                    {project.date && (
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{project.date}</span>
                    )}
                  </div>
                </div>

                {/* Mobile Action Buttons Bar */}
                <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setEditingProject(project)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl text-xs font-semibold text-black dark:text-white transition-all active:scale-95"
                    title="Edit Karya"
                  >
                    <Edit size={14} />
                    <span className="text-[11px]">Edit</span>
                  </button>
                  <button
                    onClick={() => setArchiveItemId(project.id.toString())}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all active:scale-95"
                    title="Arsipkan"
                  >
                    <Archive size={14} />
                    <span className="text-[11px]">Arsip</span>
                  </button>
                  <button
                    onClick={() => handleToggleDraft(project)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      project.draft
                        ? 'bg-zinc-800 text-white dark:bg-zinc-700'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                    title={project.draft ? 'Publikasikan' : 'Jadikan Draft'}
                  >
                    {project.draft ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span className="text-[11px]">{project.draft ? 'Publik' : 'Draft'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
                    title="Hapus"
                  >
                    <Trash size={14} />
                    <span className="text-[11px]">Hapus</span>
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="p-8 text-center text-zinc-500 font-bold bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                Belum ada karya di Cloud.
              </div>
            )}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[700px] text-left text-xs text-black dark:text-white">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="p-4 md:p-5 font-semibold">Pratinjau</th>
                  <th className="p-4 md:p-5 font-semibold">Judul</th>
                  <th className="p-4 md:p-5 font-semibold">Kategori</th>
                  <th className="p-4 md:p-5 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr
                    key={project.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-[#111111]/50 transition-colors group"
                  >
                    <td className="p-4 md:p-5">
                      <div className="w-16 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        <img
                          src={
                            project.image?.includes('.pdf')
                              ? 'https://via.placeholder.com/150?text=PDF'
                              : project.image?.includes('.eps') || project.image?.includes('.ai')
                              ? 'https://via.placeholder.com/150?text=Vektor'
                              : resolveImageUrl(project.image)
                          }
                          alt={project.title}
                          className="w-full h-full object-cover"
                          onError={e => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Err')}
                        />
                      </div>
                    </td>
                    <td className="p-4 md:p-5 font-bold truncate max-w-[280px]" title={project.title}>
                      <div className="flex items-center gap-2">
                        <span>{project.title}</span>
                        {project.isCollaboration && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-semibold uppercase">
                            Mitra
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 md:p-5 text-zinc-600 dark:text-zinc-400">{project.category}</td>
                    <td className="p-4 md:p-5 flex justify-end gap-2 items-center">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setArchiveItemId(project.id.toString())}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-300 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Arsipkan"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleDraft(project)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs ${
                          project.draft
                            ? 'bg-zinc-800 text-white dark:bg-zinc-700'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                        }`}
                        title={project.draft ? 'Publikasikan' : 'Jadikan Draft'}
                      >
                        {project.draft ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Hapus"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-zinc-500 font-bold">
                      Belum ada karya di Cloud.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ArchiveMoveModal
        isOpen={!!archiveItemId}
        onClose={() => setArchiveItemId(null)}
        onSuccess={() => {
          const updated = projects.filter(p => p.id.toString() !== archiveItemId);
          setProjects(updated);
          saveStoredProjects(updated);
          showToast("Karya berhasil dipindahkan ke arsip!");
        }}
        itemType="projects"
        itemId={archiveItemId || ''}
      />

      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Hapus Karya Desain?"
        message={`Apakah Anda yakin ingin menghapus karya "${projectToDelete?.title || ''}" secara permanen? Tindakan ini akan menghapus karya dari galeri publik dan database cloud.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setProjectToDelete(null)}
      />
    </div>
  );
}
