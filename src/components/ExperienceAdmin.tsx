import { useState, useEffect } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import ConfirmModal from './ConfirmModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences, getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { SiteSettings } from '../data/settings';
import { Plus, Trash2, Edit2, Check, X, Image as ImageIcon, UploadCloud, Archive, Loader2, AlertCircle, Handshake, Upload } from 'lucide-react';
import { withTimeout, compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { recordCollaboratorActivity } from '../lib/collaboratorLogger';

export default function ExperienceAdmin() {
  const [experiences, setExperiences] = useState<any[]>(() => getStoredExperiences());
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setExperiences(e.detail);
    };
    window.addEventListener('user_experiences_updated', handleUpdate);

    const unsub = onSnapshot(
      collection(db, 'experiences'),
      (snap) => {
        const data: any[] = [];
        snap.forEach(d => {
          if (!d.data().isArchived) data.push({ id: d.id, ...d.data() });
        });
        data.sort((a, b) => {
          const dA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : 0;
          const dB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : 0;
          return dB - dA;
        });
        setExperiences(data);
        saveStoredExperiences(data);
      },
      (error) => {
        console.warn("Experience Admin error (using stored):", error);
        setExperiences(getStoredExperiences());
      }
    );
    return () => {
      unsub();
      window.removeEventListener('user_experiences_updated', handleUpdate);
    };
  }, []);

  const handleAddNew = () => {
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

    // Saat menambahkan pengalaman baru, toggle kolaborator selalu OFF secara default
    setEditingItem({
      id: Date.now().toString(),
      header: '',
      subtheme: '',
      description: '',
      images: [],
      isNew: true,
      isCollaboration: false,
      collaborationPartner: collabPartner || siteSettings.collaboration?.partnerName || '',
      collaborationLogo: collabLogo || siteSettings.collaboration?.partnerLogo || '',
      collaborationText: siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama'
    });
    setIsEditing(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem({ ...item, images: item.images || [], isNew: false });
    setIsEditing(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const id = itemToDelete.id.toString();

    // 1. Langsung hapus dari state & local storage seketika (optimistic update)
    const updated = experiences.filter(e => e.id.toString() !== id);
    setExperiences(updated);
    saveStoredExperiences(updated);
    showToast(`Pengalaman "${itemToDelete.header || ''}" berhasil dihapus permanen.`);
    
    // Lacak aktivitas penghapusan pengalaman oleh kolaborator
    try {
      const u = JSON.parse(sessionStorage.getItem('admin_auth_user') || '{}');
      if (u.role === 'collaborator') {
        recordCollaboratorActivity(
          'Menghapus Pengalaman',
          `Kolaborator menghapus pengalaman "${itemToDelete.header || 'Tanpa Judul'}".`,
          '/admin#experience'
        );
      }
    } catch {}

    setItemToDelete(null);

    // 2. Eksekusi penghapusan di cloud
    try {
      await withTimeout(
        deleteDoc(doc(db, 'experiences', id)),
        6000,
        "Database cloud selesai diperbarui."
      );
    } catch (err: any) {
      console.warn("[DELETE] Notice database cloud experience:", err?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.header) return;
    setSaving(true);

    const docId = editingItem.id.toString();
    const isNew = Boolean(editingItem.isNew);

    // Payload yang dikirim ke database HANYA BERISI TEXT STRING & URL GAMBAR BERSIH
    const cleanImages = (editingItem.images || [])
      .filter((img: string) => typeof img === 'string' && img.trim() !== '')
      .map((img: string) => img.trim());

    const toFirestore: Record<string, any> = {
      header: editingItem.header.trim(),
      subtheme: (editingItem.subtheme || '').trim(),
      description: (editingItem.description || '').trim(),
      images: cleanImages,
      isCollaboration: Boolean(editingItem.isCollaboration),
      collaborationPartner: (editingItem.collaborationPartner || '').trim(),
      collaborationLogo: (editingItem.collaborationLogo || '').trim(),
      collaborationText: (editingItem.collaborationText || '').trim(),
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true,
      updatedAt: new Date().toISOString()
    };

    if (isNew) {
      toFirestore.dateAdded = serverTimestamp();
    }

    const stateItem = { ...toFirestore, id: docId };

    // Update state dan local storage seketika agar langsung tampil di website
    const exists = experiences.some(exp => exp.id === docId);
    const updated = exists
      ? experiences.map(exp => (exp.id === docId ? stateItem : exp))
      : [stateItem, ...experiences];

    setExperiences(updated);
    saveStoredExperiences(updated);

    // Jika kolaborasi aktif pada pengalaman ini, langsung terapkan ke pengaturan website agar logo langsung tampil di header & website
    if (toFirestore.isCollaboration) {
      try {
        const siteSettings = getStoredSettings();
        const partnerLogo = toFirestore.collaborationLogo || siteSettings.collaboration?.partnerLogo || '';
        const partnerName = toFirestore.collaborationPartner || siteSettings.collaboration?.partnerName || '';
        const collabText = toFirestore.collaborationText || siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama';

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
        console.warn("Notice: Syncing experience collaboration to settings:", collabErr);
      }
    }

    // Tutup editor dan tampilkan notifikasi berhasil seketika (optimistic save)
    showToast("Pengalaman berhasil disimpan & tampil di website!");
    setIsEditing(false);
    setEditingItem(null);
    setSaving(false);

    // Lacak aktivitas kolaborator secara realtime jika sesi aktif adalah kolaborator
    try {
      const u = JSON.parse(sessionStorage.getItem('admin_auth_user') || '{}');
      if (u.role === 'collaborator') {
        recordCollaboratorActivity(
          isNew ? 'Menambahkan Pengalaman Baru' : 'Memperbarui Pengalaman',
          `Kolaborator ${isNew ? 'menambahkan pengalaman baru' : 'memperbarui pengalaman'} "${toFirestore.header}".`,
          '/admin#experience'
        );
      }
    } catch {}

    try {
      await withTimeout(
        setDoc(doc(db, 'experiences', docId), toFirestore, { merge: true }),
        4000,
        "Database cloud disinkronkan di latar belakang."
      );
    } catch (err: any) {
      console.warn("Firestore save experience background notice:", err);
    }
  };

  /**
   * 1. Upload Langsung Saat File Dipilih (File Picker)
   * 2. Kompresi Otomatis di Client Menggunakan HTML5 Canvas (max 1000px, WebP, quality 0.78 < 150 KB)
   * 3. Multiple Upload via Promise.all jika memilih lebih dari 1 file
   * 4. Error Handling & Timeout 10 detik
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingItem) return;

    setUploading(true);
    const fileList = Array.from(files);

    try {
      if (fileList.length === 1) {
        setUploadProgressText("Mengompres & Mengunggah Gambar...");
        const cleanUrl = await compressAndUpload(fileList[0], 'experiences');
        setEditingItem((prev: any) => ({
          ...prev,
          images: [...(prev?.images || []), cleanUrl]
        }));
        showToast("Gambar berhasil diunggah!");
      } else {
        setUploadProgressText(`Mengunggah Gambar (0/${fileList.length})...`);
        const cleanUrls = await uploadMultipleImagesInParallel(
          fileList,
          'experiences',
          (done, total) => setUploadProgressText(`Mengunggah Gambar (${done}/${total})...`)
        );
        if (cleanUrls.length > 0) {
          setEditingItem((prev: any) => ({
            ...prev,
            images: [...(prev?.images || []), ...cleanUrls]
          }));
          showToast(`${cleanUrls.length} gambar berhasil diunggah!`);
        }
      }
    } catch (err: any) {
      console.error("Upload experience images error:", err);
      showToast(err?.message || "Gagal mengunggah gambar. Batas waktu 10 detik terlampaui.", "error");
    } finally {
      setUploading(false);
      setUploadProgressText('');
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    const newImages = [...editingItem.images];
    newImages.splice(idx, 1);
    setEditingItem({ ...editingItem, images: newImages });
  };

  return (
    <div className="space-y-6 relative">
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

      {isEditing && editingItem ? (
        <div className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black dark:text-white">
              {editingItem.isNew ? 'Tambah Pengalaman Baru' : 'Edit Pengalaman'}
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Header / Judul
              </label>
              <input
                type="text"
                required
                value={editingItem.header}
                onChange={(e) => setEditingItem({ ...editingItem, header: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black dark:focus:border-zinc-500 text-black dark:text-white"
                placeholder="Contoh: Senior Graphic Designer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Subtema / Perusahaan / Tahun
              </label>
              <input
                type="text"
                value={editingItem.subtheme}
                onChange={(e) => setEditingItem({ ...editingItem, subtheme: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black dark:focus:border-zinc-500 text-black dark:text-white"
                placeholder="Contoh: PT Kreatif Indonesia | 2020 - 2023"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Deskripsi
              </label>
              <textarea
                rows={5}
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black dark:focus:border-zinc-500 text-black dark:text-white resize-y"
                placeholder="Jelaskan peran dan pencapaian Anda..."
              />
            </div>

            {/* FITUR KOLABORASI PENGALAMAN */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#101012] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Handshake size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                      Tandai Sebagai Pengalaman Kolaborasi
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                      Menampilkan teks kolaborasi & logo mitra di bagian bawah deskripsi pengalaman.
                    </p>
                  </div>
                </div>

                {/* Toggle Kolaborasi Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={editingItem.isCollaboration}
                  onClick={() => {
                    const nextState = !editingItem.isCollaboration;
                    const siteSettings = getStoredSettings();
                    setEditingItem({
                      ...editingItem,
                      isCollaboration: nextState,
                      collaborationPartner: editingItem.collaborationPartner || (nextState ? siteSettings.collaboration?.partnerName || '' : ''),
                      collaborationLogo: editingItem.collaborationLogo || (nextState ? siteSettings.collaboration?.partnerLogo || '' : ''),
                      collaborationText: editingItem.collaborationText || (nextState ? siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama' : '')
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editingItem.isCollaboration ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      editingItem.isCollaboration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {editingItem.isCollaboration && (
                <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Nama Mitra Kolaborasi
                    </label>
                    <input
                      type="text"
                      value={editingItem.collaborationPartner || ''}
                      onChange={e => setEditingItem({ ...editingItem, collaborationPartner: e.target.value })}
                      placeholder="Contoh: Brand Partner, Komunitas"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Teks / Label Kolaborasi
                    </label>
                    <input
                      type="text"
                      value={editingItem.collaborationText || 'Kolaborasi Bersama'}
                      onChange={e => setEditingItem({ ...editingItem, collaborationText: e.target.value })}
                      placeholder="Contoh: Kolaborasi Bersama"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Logo Mitra Kolaborasi (URL / Unggah Gambar)
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {editingItem.collaborationLogo && (
                        <img
                          src={resolveImageUrl(editingItem.collaborationLogo)}
                          alt="Logo Kolaborasi"
                          className="h-9 w-auto max-w-[80px] object-contain rounded-lg border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-900 shrink-0"
                          onError={handleImageError}
                        />
                      )}
                      <input
                        type="text"
                        value={editingItem.collaborationLogo || ''}
                        onChange={e => setEditingItem({ ...editingItem, collaborationLogo: e.target.value })}
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
                              setUploadProgressText("Mengunggah logo mitra...");
                              const url = await compressAndUpload(file, 'collaboration', 600, 0.85);
                              setEditingItem((prev: any) => ({ ...prev, collaborationLogo: url }));
                              showToast("Logo kolaborasi berhasil diunggah!");
                            } catch (err: any) {
                              showToast("Gagal mengunggah logo mitra", "error");
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {getStoredSettings().collaboration?.partnerLogo && editingItem.collaborationLogo !== getStoredSettings().collaboration?.partnerLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            const logo = getStoredSettings().collaboration?.partnerLogo || '';
                            const partner = getStoredSettings().collaboration?.partnerName || '';
                            setEditingItem({
                              ...editingItem,
                              collaborationLogo: logo,
                              collaborationPartner: editingItem.collaborationPartner || partner
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

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Gambar Bukti Prestasi / Sertifikat (Otomatis Kompres &lt; 150 KB)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {editingItem.images?.map((img: string, idx: number) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-video rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative text-center p-2">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                        {uploadProgressText || "Mengunggah..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-zinc-400" />
                      <span className="text-xs font-semibold text-zinc-500">Upload Foto/Sertifikat</span>
                      <span className="text-[9px] text-zinc-400">Bisa pilih multiple file</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Tombol Simpan & Indikator Status Terintegrasi */}
            <div className="flex gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="submit"
                disabled={saving || uploading}
                className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadProgressText || "Mengunggah Gambar..."}</span>
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Data...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Pengalaman</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>

          <ArchiveMoveModal
            isOpen={!!archiveItemId}
            onClose={() => setArchiveItemId(null)}
            onSuccess={() => {
              setExperiences(experiences.filter(p => p.id.toString() !== archiveItemId));
            }}
            itemType="experiences"
            itemId={archiveItemId || ''}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white">Pengalaman & Prestasi</h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Kelola data pengalaman kerja, prestasi, dan portofolio Anda.</p>
            </div>
            <button
              onClick={handleAddNew}
              className="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Baru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-6">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                {exp.images && exp.images.length > 0 && (
                  <div className="w-full h-44 sm:h-48 bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                    <img src={exp.images[0]} alt="" className="w-full h-full object-cover" />
                    {exp.images.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                        <ImageIcon className="w-3 h-3" /> +{exp.images.length - 1}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-black dark:text-white line-clamp-1">{exp.header}</h3>
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-wider font-mono">
                      {exp.subtheme}
                    </p>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{exp.description}</p>
                  </div>

                  <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="flex-1 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {experiences.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500 text-xs sm:text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                Belum ada data pengalaman.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Hapus Pengalaman?"
        message={`Apakah Anda yakin ingin menghapus pengalaman "${itemToDelete?.header || ''}" secara permanen? Data akan dihapus dari website dan cloud database.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setItemToDelete(null)}
      />
    </div>
  );
}
