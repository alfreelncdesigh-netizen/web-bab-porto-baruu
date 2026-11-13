import { useState, useEffect, useRef } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import ConfirmModal from './ConfirmModal';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences, mergeExperiences, markDeletedIds, unmarkDeletedIds, syncDeletedIdsFromServer, getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { SiteSettings } from '../data/settings';
import { Plus, Trash2, Edit2, Check, X, Image as ImageIcon, UploadCloud, Archive, Loader2, AlertCircle, Handshake, Upload, ChevronLeft, ChevronRight, Star, Link as LinkIcon } from 'lucide-react';
import { withTimeout, compressAndUpload, ensurePersistedAssetUrl } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { recordCollaboratorActivity } from '../lib/collaboratorLogger';
import { isQuotaExhausted, markQuotaExhausted, isQuotaError, logFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

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
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && isMounted) setExperiences(e.detail);
    };
    window.addEventListener('user_experiences_updated', handleUpdate);

    (async () => {
      await syncDeletedIdsFromServer();
      try {
        const res = await fetch('/api/experiences');
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && isMounted) {
            const merged = mergeExperiences(getStoredExperiences(), apiData);
            setExperiences(merged);
            await saveStoredExperiences(merged);
          }
        }
      } catch {}
    })();

    let unsub = () => {};
    if (!isQuotaExhausted()) {
      unsub = onSnapshot(
        collection(db, 'experiences'),
        (snap) => {
          if (!isMounted) return;
          const data: any[] = [];
          snap.forEach(d => {
            data.push({ id: d.id, ...d.data() });
          });
          const merged = mergeExperiences(getStoredExperiences(), data);
          setExperiences(merged);
          saveStoredExperiences(merged);
        },
        (error) => {
          if (isQuotaError(error)) markQuotaExhausted();
          logFirestoreError(error, OperationType.LIST, 'experiences');
          if (isMounted) setExperiences(getStoredExperiences());
        }
      );
    }

    return () => {
      isMounted = false;
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
      image: '',
      isNew: true,
      isCollaboration: false,
      collaborationPartner: collabPartner || siteSettings.collaboration?.partnerName || '',
      collaborationLogo: collabLogo || siteSettings.collaboration?.partnerLogo || '',
      collaborationText: siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama'
    });
    setIsEditing(true);
  };

  const handleEdit = (item: any) => {
    let existingImages: string[] = [];
    if (Array.isArray(item.images)) {
      existingImages = item.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    }
    if (existingImages.length === 0 && item.image && typeof item.image === 'string' && item.image.trim()) {
      existingImages = [item.image.trim()];
    }
    setEditingItem({
      ...item,
      images: existingImages,
      image: existingImages[0] || '',
      isNew: false
    });
    setIsEditing(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const id = itemToDelete.id.toString();

    await markDeletedIds('experiences', [id]);

    // 1. Langsung hapus dari state & local storage seketika (optimistic update)
    const updated = experiences.filter(e => e.id.toString() !== id);
    setExperiences(updated);
    await saveStoredExperiences(updated);
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
    if (!isQuotaExhausted()) {
      try {
        await withTimeout(
          deleteDoc(doc(db, 'experiences', id)),
          6000,
          "Database cloud selesai diperbarui."
        );
      } catch (err: any) {
        if (isQuotaError(err)) markQuotaExhausted();
        else logFirestoreError(err, OperationType.DELETE, `experiences/${id}`);
      }
    }
    setIsDeleting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.header?.trim()) {
      showToast("Judul / Header pengalaman wajib diisi!", "error");
      return;
    }
    setSaving(true);

    const docId = editingItem.id.toString();
    const isNew = Boolean(editingItem.isNew);
    const nowMs = Date.now();

    const rawImages: string[] = Array.isArray(editingItem.images) ? editingItem.images : [];
    const persistedImages: string[] = [];
    for (const img of rawImages) {
      const cleanUrl = await ensurePersistedAssetUrl(img || '', 'experiences');
      if (cleanUrl && !cleanUrl.startsWith('blob:')) {
        persistedImages.push(cleanUrl);
      }
    }

    const persistedCollabLogo = editingItem.collaborationLogo
      ? await ensurePersistedAssetUrl(editingItem.collaborationLogo, 'collaboration')
      : '';

    const toLocalAndServer: Record<string, any> = {
      id: docId,
      header: editingItem.header.trim(),
      subtheme: (editingItem.subtheme || '').trim(),
      description: (editingItem.description || '').trim(),
      images: persistedImages,
      image: persistedImages[0] || '',
      isCollaboration: Boolean(editingItem.isCollaboration),
      collaborationPartner: (editingItem.collaborationPartner || '').trim(),
      collaborationLogo: persistedCollabLogo,
      collaborationText: (editingItem.collaborationText || '').trim(),
      createdAt: editingItem.createdAt || nowMs,
      updatedAt: nowMs,
      isArchived: false,
      archiveFolderId: null,
    };

    const toFirestore: Record<string, any> = {
      ...toLocalAndServer,
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true,
      updatedAt: new Date(nowMs).toISOString()
    };

    if (isNew) {
      toFirestore.dateAdded = serverTimestamp();
    }

    await unmarkDeletedIds('experiences', [docId]);

    const mergedUpdated = mergeExperiences([toLocalAndServer], experiences);
    setExperiences(mergedUpdated);
    await saveStoredExperiences(mergedUpdated);

    if (!isQuotaExhausted()) {
      const docRef = doc(db, 'experiences', docId);
      try {
        if (!isNew && persistedImages.length > 0) {
          try {
            await withTimeout(
              updateDoc(docRef, {
                ...toFirestore,
                images: arrayUnion(...persistedImages)
              }),
              5000,
              "Firestore updateDoc timeout"
            );
          } catch (updateErr: any) {
            await withTimeout(
              setDoc(docRef, toFirestore, { merge: true }),
              5000,
              "Firestore setDoc fallback timeout"
            );
          }
        } else {
          await withTimeout(
            setDoc(docRef, toFirestore, { merge: true }),
            5000,
            "Firestore setDoc timeout"
          );
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markQuotaExhausted();
        } else {
          logFirestoreError(err, OperationType.WRITE, `experiences/${docId}`);
        }
      }
    }

    // Jika kolaborasi aktif pada pengalaman ini, langsung terapkan ke pengaturan website
    if (toLocalAndServer.isCollaboration) {
      try {
        const siteSettings = getStoredSettings();
        const partnerLogo = toLocalAndServer.collaborationLogo || siteSettings.collaboration?.partnerLogo || '';
        const partnerName = toLocalAndServer.collaborationPartner || siteSettings.collaboration?.partnerName || '';
        const collabText = toLocalAndServer.collaborationText || siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama';

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
        await saveStoredSettings(updatedSettings);
      } catch (collabErr) {
        console.warn("Notice: Syncing experience collaboration to settings:", collabErr);
      }
    }

    // Lacak aktivitas kolaborator secara realtime jika sesi aktif adalah kolaborator
    try {
      const u = JSON.parse(sessionStorage.getItem('admin_auth_user') || '{}');
      if (u.role === 'collaborator') {
        recordCollaboratorActivity(
          isNew ? 'Menambahkan Pengalaman Baru' : 'Memperbarui Pengalaman',
          `Kolaborator ${isNew ? 'menambahkan pengalaman baru' : 'memperbarui pengalaman'} "${toLocalAndServer.header}".`,
          '/admin#experience'
        );
      }
    } catch {}

    // Tutup editor dan tampilkan notifikasi berhasil
    showToast("Pengalaman & foto dokumentasi berhasil disimpan permanen!");
    setIsEditing(false);
    setEditingItem(null);
    setSaving(false);
  };

  /**
   * 1. Upload Langsung Saat File Dipilih (Bisa 1 atau banyak gambar sekaligus, atau tambah gambar berikutnya)
   * 2. Kompresi Otomatis Cepat di Client Menggunakan HTML5 Canvas (max 1200px, WebP, quality 0.8)
   * 3. Pemrosesan Tangguh (Resilient): gambar berhasil langsung ditambahkan tanpa menggagalkan seluruh batch
   * 4. Dukungan Menambah Foto ke-2, ke-3 dst secara berulang tanpa menimpa foto yang sudah ada
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0 || !editingItem) return;

    // Salin file list secara sinkron & bersihkan input seketika sebelum async
    // agar pemilihan file berikutnya atau file yang sama selalu memicu onChange
    const fileList = Array.from(rawFiles);
    e.target.value = '';
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(true);
    let successCount = 0;
    const newUrls: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadProgressText(`Mengompres & Mengunggah ke Firebase Storage (/experiences/) (${i + 1}/${fileList.length})...`);
      try {
        const rawUrl = await compressAndUpload(file, 'experiences', 1200, 0.8, 25000);
        const url = await ensurePersistedAssetUrl(rawUrl, 'experiences');
        if (url && typeof url === 'string' && url.trim() && !url.startsWith('blob:')) {
          newUrls.push(url.trim());
          successCount++;
        }
      } catch (err: any) {
        console.warn(`Gagal mengunggah file ${file.name} ke Firebase Storage:`, err);
      }
    }

    if (newUrls.length > 0) {
      const persistableCloudUrls = newUrls.filter(u => !u.startsWith('data:'));
      if (!editingItem.isNew && editingItem.id && !isQuotaExhausted() && persistableCloudUrls.length > 0) {
        try {
          const docRef = doc(db, 'experiences', editingItem.id.toString());
          await updateDoc(docRef, {
            images: arrayUnion(...persistableCloudUrls),
            image: editingItem.image || persistableCloudUrls[0],
            updatedAt: new Date().toISOString()
          });
        } catch (syncErr: any) {
          if (isQuotaError(syncErr)) markQuotaExhausted();
        }
      }

      setEditingItem((prev: any) => {
        if (!prev) return prev;
        const currentImages = Array.isArray(prev.images)
          ? prev.images.filter((img: any) => typeof img === 'string' && img.trim())
          : (prev.image ? [prev.image] : []);
        const mergedImages = [...currentImages, ...newUrls];
        return {
          ...prev,
          images: mergedImages,
          image: mergedImages[0] || ''
        };
      });
      showToast(`${successCount} gambar berhasil ditambahkan!`);
    } else {
      showToast("Gagal mengunggah gambar, silakan coba lagi.", "error");
    }

    setUploading(false);
    setUploadProgressText('');
  };

  const handleAddImageUrl = async () => {
    if (!imageUrlInput.trim() || !editingItem) return;
    const url = imageUrlInput.trim();

    if (!editingItem.isNew && editingItem.id && !isQuotaExhausted() && !url.startsWith('data:')) {
      try {
        const docRef = doc(db, 'experiences', editingItem.id.toString());
        await updateDoc(docRef, {
          images: arrayUnion(url),
          updatedAt: new Date().toISOString()
        });
      } catch (syncErr: any) {
        if (isQuotaError(syncErr)) markQuotaExhausted();
      }
    }

    setEditingItem((prev: any) => {
      if (!prev) return prev;
      const currentImages = Array.isArray(prev.images)
        ? prev.images.filter((img: any) => typeof img === 'string' && img.trim())
        : (prev.image ? [prev.image] : []);
      const mergedImages = [...currentImages, url];
      return {
        ...prev,
        images: mergedImages,
        image: mergedImages[0] || ''
      };
    });
    setImageUrlInput('');
    showToast("Gambar berhasil ditambahkan dari tautan URL!");
  };

  const removeImage = (idx: number) => {
    if (!editingItem?.images) return;
    const newImages = [...editingItem.images];
    newImages.splice(idx, 1);
    setEditingItem({ 
      ...editingItem, 
      images: newImages,
      image: newImages[0] || ''
    });
    showToast("Gambar dihapus dari daftar.");
  };

  const setPrimaryImage = (idx: number) => {
    if (!editingItem?.images || idx <= 0) return;
    const newImages = [...editingItem.images];
    const [selected] = newImages.splice(idx, 1);
    newImages.unshift(selected);
    setEditingItem({ 
      ...editingItem, 
      images: newImages,
      image: newImages[0] || ''
    });
    showToast("Foto utama berhasil diperbarui!");
  };

  const moveImage = (idx: number, direction: 'left' | 'right') => {
    if (!editingItem?.images) return;
    const newImages = [...editingItem.images];
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newImages.length) return;
    const temp = newImages[idx];
    newImages[idx] = newImages[targetIdx];
    newImages[targetIdx] = temp;
    setEditingItem({ 
      ...editingItem, 
      images: newImages,
      image: newImages[0] || ''
    });
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

            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#101012] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Foto Dokumentasi & Sertifikat ({editingItem.images?.length || 0} Foto)
                  </label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Foto pertama (Foto 1) otomatis menjadi sampul utama. Anda dapat menambah foto ke-2, ke-3, dst.
                  </p>
                </div>
                {editingItem.images?.length > 1 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
                    {editingItem.images.length} Foto Siap Tampil di Website
                  </span>
                )}
              </div>

              {/* Grid Preview Foto yang Sudah Ada */}
              {editingItem.images && editingItem.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {editingItem.images.map((img: string, idx: number) => {
                    const isPrimary = idx === 0;
                    return (
                      <div 
                        key={idx} 
                        className={`relative rounded-xl overflow-hidden border-2 bg-white dark:bg-zinc-900 group shadow-xs transition-all ${
                          isPrimary 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="aspect-video w-full relative bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                          <img 
                            src={resolveImageUrl(img)} 
                            alt={`Dokumentasi ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={handleImageError}
                          />
                          {/* Badge Posisi Foto */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-xs bg-black/75 text-white">
                            {isPrimary ? (
                              <>
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span>Foto 1 (Utama)</span>
                              </>
                            ) : (
                              <span>Foto {idx + 1}</span>
                            )}
                          </div>
                        </div>

                        {/* Control Bar Per Gambar */}
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(idx)}
                                className="px-2 py-1 rounded-lg text-[9px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
                                title="Jadikan Sampul Utama"
                              >
                                Set Utama
                              </button>
                            )}
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveImage(idx, 'left')}
                                className="p-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                title="Geser ke kiri"
                              >
                                <ChevronLeft size={12} />
                              </button>
                            )}
                            {idx < editingItem.images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(idx, 'right')}
                                className="p-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                title="Geser ke kanan"
                              >
                                <ChevronRight size={12} />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                            title="Hapus foto ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Area Upload File Baru & Tambah Gambar Berikutnya */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* Input File Tersembunyi yang Dikontrol fileInputRef */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Tombol Upload File */}
                <button
                  type="button"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  disabled={uploading}
                  className="md:col-span-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-zinc-500 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 cursor-pointer p-4 text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <div className="text-left">
                        <span className="text-xs font-bold text-black dark:text-white block">
                          {uploadProgressText || "Mengunggah..."}
                        </span>
                        <span className="text-[10px] text-zinc-500">Kompresi otomatis WebP cepat &lt; 150 KB</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-black dark:text-white block">
                          {editingItem.images?.length > 0 ? '+ Tambah Foto Dokumentasi Lagi' : '+ Upload Foto / Sertifikat'}
                        </span>
                        <span className="text-[10px] text-zinc-500">Pilih 1 file atau banyak file sekaligus (JPG, PNG, WebP)</span>
                      </div>
                    </div>
                  )}
                </button>

                {/* Tambah via URL Gambar */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 flex flex-col justify-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <LinkIcon size={11} /> Tambah via URL
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="https://... atau /uploads/..."
                      className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      disabled={!imageUrlInput.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors shrink-0"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
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
              const updated = experiences.filter(p => p.id.toString() !== archiveItemId);
              setExperiences(updated);
              saveStoredExperiences(updated);
              showToast("Pengalaman berhasil dipindahkan ke arsip!");
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
