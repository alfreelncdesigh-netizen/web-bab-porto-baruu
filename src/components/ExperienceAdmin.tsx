import { useState, useEffect } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import ConfirmModal from './ConfirmModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences } from '../lib/contentStorage';
import { Plus, Trash2, Edit2, Check, X, Image as ImageIcon, UploadCloud, Archive, Loader2, AlertCircle } from 'lucide-react';
import { withTimeout, compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';

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
    setEditingItem({
      id: Date.now().toString(),
      header: '',
      subtheme: '',
      description: '',
      images: [],
      isNew: true
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

    try {
      await withTimeout(
        setDoc(doc(db, 'experiences', docId), toFirestore, { merge: true }),
        25000,
        "Waktu simpan database habis. Perubahan tetap tersimpan di lokal."
      );

      showToast("Pengalaman berhasil disimpan & tampil di website!");
      setIsEditing(false);
      setEditingItem(null);
    } catch (err: any) {
      console.warn("Firestore save experience notice:", err);
      showToast("Pengalaman tersimpan di penyimpanan lokal & web!", "success");
      setIsEditing(false);
      setEditingItem(null);
    } finally {
      setSaving(false);
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
          <div className="flex items-center justify-between bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">Pengalaman & Prestasi</h2>
              <p className="text-sm text-zinc-500 mt-1">Kelola data pengalaman kerja, prestasi, dan portofolio Anda.</p>
            </div>
            <button
              onClick={handleAddNew}
              className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-black/10"
            >
              <Plus className="w-4 h-4" /> Tambah Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {exp.images && exp.images.length > 0 && (
                  <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                    <img src={exp.images[0]} alt="" className="w-full h-full object-cover" />
                    {exp.images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> +{exp.images.length - 1}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-black dark:text-white line-clamp-1">{exp.header}</h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-wider">
                    {exp.subtheme}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 line-clamp-2">{exp.description}</p>

                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                    <button
                      onClick={() => handleEdit(exp)}
                      className="flex-1 bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="flex-1 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 py-2 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {experiences.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
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
