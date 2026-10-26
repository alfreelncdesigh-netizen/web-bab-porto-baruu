import { useState, useEffect } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import ConfirmModal from './ConfirmModal';
import { motion } from 'motion/react';
import { BlogPost } from '../types/blog';
import { Edit, Trash, Plus, X, Check, Cloud, Upload, Loader2, Image as ImageIcon, Archive, AlertCircle, Handshake } from 'lucide-react';
import { db, ensureFreshAuthToken } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStoredBlogs, saveStoredBlogs, cleanBlogs, getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { SiteSettings } from '../data/settings';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { withTimeout, compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>(() => getStoredBlogs());
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [savingPost, setSavingPost] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setPosts(e.detail);
    };
    window.addEventListener('blog_posts_updated', handleUpdate);

    const unsubscribe = onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        const loadedPosts: BlogPost[] = [];
        snapshot.forEach((docSnap) => {
          loadedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost);
        });
        loadedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const cleaned = cleanBlogs(loadedPosts);
        setPosts(cleaned);
        saveStoredBlogs(cleaned);
      },
      (error) => {
        console.warn("Firestore Admin Blog Error (using stored blogs):", error);
        setPosts(getStoredBlogs());
      }
    );
    return () => {
      unsubscribe();
      window.removeEventListener('blog_posts_updated', handleUpdate);
    };
  }, []);

  const savePosts = async (newPosts: BlogPost[]) => {
    setPosts(newPosts);
    saveStoredBlogs(newPosts);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    setSavingPost(true);

    // Pastikan payload HANYA berisi text string (URL gambar, judul, konten, kategori, tanggal)
    // Tidak ada Base64 mentah yang dikirim ke database
    const payloadToSave: BlogPost = {
      id: editingPost.id,
      title: editingPost.title.trim(),
      content: editingPost.content || '',
      image: (editingPost.image || '').trim(),
      date: editingPost.date || new Date().toISOString(),
      category: editingPost.category || 'Umum',
      published: Boolean(editingPost.published),
      isCollaboration: Boolean(editingPost.isCollaboration),
      collaborationPartner: (editingPost.collaborationPartner || '').trim(),
      collaborationLogo: (editingPost.collaborationLogo || '').trim(),
      collaborationText: (editingPost.collaborationText || '').trim(),
    };

    // Update state & local storage segera agar perubahan langsung terlihat di web
    let newPosts: BlogPost[];
    if (posts.find(p => p.id === payloadToSave.id)) {
      newPosts = posts.map(p => p.id === payloadToSave.id ? payloadToSave : p);
    } else {
      newPosts = [payloadToSave, ...posts];
    }
    savePosts(newPosts);

    // Jika kolaborasi aktif pada blog ini, langsung terapkan ke pengaturan website agar logo langsung tampil di header & website
    if (payloadToSave.isCollaboration) {
      try {
        const siteSettings = getStoredSettings();
        const partnerLogo = payloadToSave.collaborationLogo || siteSettings.collaboration?.partnerLogo || '';
        const partnerName = payloadToSave.collaborationPartner || siteSettings.collaboration?.partnerName || '';
        const collabText = payloadToSave.collaborationText || siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama';

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
        console.warn("Notice: Syncing blog collaboration to settings:", collabErr);
      }
    }

    // Tutup modal dan tampilkan notifikasi berhasil seketika (optimistic save)
    showToast("Postingan berhasil disimpan & tampil di website!");
    setEditingPost(null);
    setSavingPost(false);

    try {
      await withTimeout(
        setDoc(doc(db, 'blogPosts', payloadToSave.id), {
          ...payloadToSave,
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true,
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        4000,
        "Database cloud disinkronkan di latar belakang."
      );
    } catch (err: any) {
      console.warn("Save Blog Cloud background sync notice:", err);
    }
  };

  const handleDelete = (post: BlogPost) => {
    setPostToDelete(post);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    const id = postToDelete.id;

    // 1. Langsung hapus dari state & local storage seketika (optimistic update)
    const updated = posts.filter(p => p.id !== id);
    savePosts(updated);
    showToast(`"${postToDelete.title || 'Postingan'}" berhasil dihapus permanen.`);
    setPostToDelete(null);

    // 2. Eksekusi penghapusan di cloud
    try {
      await withTimeout(
        deleteDoc(doc(db, 'blogPosts', id)),
        6000,
        "Database cloud selesai diperbarui."
      );
    } catch (err: any) {
      console.warn("[DELETE] Notice database cloud blog:", err?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePublish = async (id: string) => {
    const targetPost = posts.find(p => p.id === id);
    if (!targetPost) return;
    const updatedPost = { ...targetPost, published: !targetPost.published };
    try {
      await withTimeout(
        setDoc(doc(db, 'blogPosts', id), updatedPost),
        15000,
        "Waktu update status habis."
      );
      savePosts(posts.map(p => p.id === id ? updatedPost : p));
      showToast("Status publikasi diperbarui di database.");
    } catch (err: any) {
      savePosts(posts.map(p => p.id === id ? updatedPost : p));
      showToast("Status publikasi diperbarui lokal.");
    }
  };

  /**
   * 1. Refresh Session Token otomatis sebelum upload agar terhindar dari Session Timeout
   * 2. Kompresi Otomatis di Client: Canvas WebP/JPEG, max-width 1200px, quality 0.75 (< 200 KB)
   * 3. Direct/Background Upload: Langsung unggah saat file dipilih untuk mendapatkan URL string
   * 4. Batas Timeout 15 detik: Batalkan otomatis jika gagal/lambat agar tidak stuck loading
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingPost) return;

    setUploadingImage(true);
    const fileList = Array.from(files);

    try {
      if (fileList.length === 1) {
        setUploadStatusText("Mengompres & Mengunggah Gambar...");
        // max-width: 1200px, quality: 0.75, fast upload
        const cleanUrl = await compressAndUpload(fileList[0], 'blog_posts', 1200, 0.75, 8000);
        setEditingPost(prev => prev ? ({ ...prev, image: cleanUrl }) : null);
        showToast("Gambar berhasil diunggah!");
      } else {
        // Multiple upload parallel
        setUploadStatusText(`Mengunggah Gambar (0/${fileList.length})...`);
        const cleanUrls = await uploadMultipleImagesInParallel(
          fileList,
          'blog_posts',
          (done, total) => setUploadStatusText(`Mengunggah Gambar (${done}/${total})...`),
          1200,
          0.75,
          10000
        );
        if (cleanUrls.length > 0) {
          setEditingPost(prev => prev ? ({ ...prev, image: cleanUrls[0] }) : null);
          showToast(`${cleanUrls.length} gambar berhasil diunggah!`);
        }
      }
    } catch (err: any) {
      console.error("Upload blog image error:", err);
      showToast("Gagal mengunggah gambar, silakan coba lagi", "error");
    } finally {
      setUploadingImage(false);
      setUploadStatusText('');
      e.target.value = '';
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

    setEditingPost({
      id: Date.now().toString(),
      title: '',
      content: '',
      image: '',
      date: new Date().toISOString(),
      category: 'Umum',
      published: true,
      isCollaboration: isAutoCollab,
      collaborationPartner: collabPartner || (isAutoCollab ? (siteSettings.collaboration?.partnerName || '') : ''),
      collaborationLogo: collabLogo || (isAutoCollab ? (siteSettings.collaboration?.partnerLogo || '') : ''),
      collaborationText: isAutoCollab ? (siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama') : ''
    });
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

      {!editingPost && (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-black dark:text-white">Daftar Blog</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={createNew}
              className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-[10px] font-semibold flex items-center gap-2 hover:opacity-80 transition-opacity rounded-2xl active:scale-95"
            >
              <Plus size={16} /> Tulis Postingan
            </button>
          </div>
        </div>
      )}

      {editingPost ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          noValidate
          className="bg-zinc-50 dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 mb-6 rounded-2xl space-y-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-semibold text-black dark:text-white">Editor Blog</h3>
            <button
              type="button"
              onClick={() => setEditingPost(null)}
              className="text-black hover:text-black dark:text-zinc-400 dark:hover:text-zinc-500 transition-colors bg-white dark:bg-zinc-900 p-2 rounded-2xl"
            >
              <X size={20} />
            </button>
          </div>

          <input
            type="text"
            placeholder="JUDUL POSTINGAN"
            required
            value={editingPost.title}
            onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
            className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
          />

          <input
            type="text"
            placeholder="KATEGORI"
            required
            value={editingPost.category}
            onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}
            className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
          />

          {/* Area Upload Gambar Sampul Blog */}
          <div className="bg-white dark:bg-zinc-900/50 p-3 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-black dark:text-zinc-300 flex items-center gap-1.5">
                <ImageIcon size={14} /> GAMBAR SAMPUL (OTOMATIS DIKOMPRES WEBP &lt; 150 KB)
              </label>
              {editingPost.image && (
                <button
                  type="button"
                  onClick={() => setEditingPost({ ...editingPost, image: '' })}
                  className="text-red-500 text-[10px] hover:underline"
                >
                  Hapus Gambar
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {editingPost.image ? (
                <div className="w-36 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 relative group">
                  <img
                    src={resolveImageUrl(editingPost.image)}
                    onError={handleImageError}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-36 h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 shrink-0">
                  <ImageIcon size={24} className="mb-1" />
                  <span className="text-[9px]">Belum ada gambar</span>
                </div>
              )}

              <div className="flex-1 space-y-3 w-full">
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, application/pdf, .pdf"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    className="w-full py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-xl text-[10px] font-semibold text-black dark:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-orange-500" />
                        <span>{uploadStatusText || "Mengunggah..."}</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Pilih Gambar (Otomatis Kompres & Upload Langsung)</span>
                      </>
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Atau tempel path/URL gambar (/uploads/... atau https://...)"
                  value={editingPost.image && !editingPost.image.startsWith('data:') ? editingPost.image : ''}
                  onChange={e => setEditingPost({ ...editingPost, image: e.target.value })}
                  className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-2 text-[10px] md:text-xs focus:border-black dark:focus:border-sky-400 outline-none text-black dark:text-white placeholder-zinc-400"
                />
              </div>
            </div>
          </div>

          <textarea
            placeholder="KONTEN POSTINGAN (MENDUKUNG MULTI-PARAGRAF)"
            rows={8}
            value={editingPost.content}
            onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
            className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800/50 py-3 text-sm focus:border-black dark:focus:border-sky-400 outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-y leading-relaxed font-medium"
          />

          {/* FITUR KOLABORASI BLOG */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#101012] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Handshake size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white">
                    Tandai Sebagai Blog Kolaborasi
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                    Menampilkan teks kolaborasi & logo mitra di bagian bawah artikel saat blog ini dibaca.
                  </p>
                </div>
              </div>

              {/* Toggle Kolaborasi Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={editingPost.isCollaboration}
                onClick={() => {
                  const nextState = !editingPost.isCollaboration;
                  const siteSettings = getStoredSettings();
                  setEditingPost({
                    ...editingPost,
                    isCollaboration: nextState,
                    collaborationPartner: editingPost.collaborationPartner || (nextState ? siteSettings.collaboration?.partnerName || '' : ''),
                    collaborationLogo: editingPost.collaborationLogo || (nextState ? siteSettings.collaboration?.partnerLogo || '' : ''),
                    collaborationText: editingPost.collaborationText || (nextState ? siteSettings.collaboration?.collaborationText || 'Kolaborasi Bersama' : '')
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editingPost.isCollaboration ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    editingPost.isCollaboration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {editingPost.isCollaboration && (
              <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Nama Mitra Kolaborasi
                  </label>
                  <input
                    type="text"
                    value={editingPost.collaborationPartner || ''}
                    onChange={e => setEditingPost({ ...editingPost, collaborationPartner: e.target.value })}
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
                    value={editingPost.collaborationText || 'Kolaborasi Bersama'}
                    onChange={e => setEditingPost({ ...editingPost, collaborationText: e.target.value })}
                    placeholder="Contoh: Kolaborasi Bersama"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Logo Mitra Kolaborasi (URL / Unggah Gambar)
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {editingPost.collaborationLogo && (
                      <img
                        src={resolveImageUrl(editingPost.collaborationLogo)}
                        alt="Logo Kolaborasi"
                        className="h-9 w-auto max-w-[80px] object-contain rounded-lg border border-zinc-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-900 shrink-0"
                        onError={handleImageError}
                      />
                    )}
                    <input
                      type="text"
                      value={editingPost.collaborationLogo || ''}
                      onChange={e => setEditingPost({ ...editingPost, collaborationLogo: e.target.value })}
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
                            setEditingPost(prev => prev ? { ...prev, collaborationLogo: url } : null);
                            showToast("Logo kolaborasi berhasil diunggah!");
                          } catch (err: any) {
                            showToast("Gagal mengunggah logo mitra", "error");
                          } finally {
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                    {getStoredSettings().collaboration?.partnerLogo && editingPost.collaborationLogo !== getStoredSettings().collaboration?.partnerLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          const logo = getStoredSettings().collaboration?.partnerLogo || '';
                          const partner = getStoredSettings().collaboration?.partnerName || '';
                          setEditingPost({
                            ...editingPost,
                            collaborationLogo: logo,
                            collaborationPartner: editingPost.collaborationPartner || partner
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4">
            <label className="flex items-center gap-3 text-[10px] font-semibold text-black dark:text-white cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 border-2 border-zinc-300 dark:border-zinc-800/50 rounded-2xl group-hover:border-black dark:group-hover:border-sky-400 transition-colors">
                <input
                  type="checkbox"
                  checked={editingPost.published}
                  onChange={e => setEditingPost({ ...editingPost, published: e.target.checked })}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                {editingPost.published && <Check size={14} className="text-black dark:text-white" />}
              </div>
              Langsung Publikasikan
            </label>

            {/* Tombol Simpan dengan Status Indikator Terintegrasi */}
            <button
              type="submit"
              disabled={uploadingImage || savingPost}
              className="bg-black text-white dark:bg-white dark:text-black px-8 py-4 text-[10px] font-semibold hover:opacity-80 transition-opacity rounded-2xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingImage ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{uploadStatusText || "Mengunggah Gambar..."}</span>
                </>
              ) : savingPost ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <span>Simpan Postingan</span>
              )}
            </button>
          </div>
        </motion.form>
      ) : (
        <div className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full min-w-[300px] md:min-w-[700px] text-left text-[10px] md:text-xs text-black dark:text-white">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-2 md:p-5 font-semibold w-16">Cover</th>
                <th className="p-2 md:p-5 font-semibold">Judul</th>
                <th className="p-2 md:p-5 font-semibold">Kategori</th>
                <th className="p-2 md:p-5 font-semibold">Tanggal</th>
                <th className="p-2 md:p-5 font-semibold text-center">Status</th>
                <th className="p-2 md:p-5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr
                  key={post.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-[#111111]/50 transition-colors group"
                >
                  <td className="p-4 w-16">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                      {post.image ? (
                        <img
                          src={resolveImageUrl(post.image)}
                          onError={handleImageError}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px]">
                          No Img
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 md:p-5 font-bold whitespace-normal md:truncate min-w-[120px]" title={post.title}>
                    {post.title}
                  </td>
                  <td className="p-2 md:p-5 text-black dark:text-zinc-400">{post.category}</td>
                  <td className="p-2 md:p-5 text-black dark:text-zinc-400">
                    {new Date(post.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="p-2 md:p-5 text-center">
                    <button
                      onClick={() => togglePublish(post.id)}
                      className={`px-4 py-1.5 text-[10px] font-semibold tracking-widest rounded-2xl transition-all active:scale-95 border ${
                        post.published
                          ? 'bg-transparent text-black border-black dark:text-white dark:border-zinc-600 hover:bg-black hover:text-white dark:hover:bg-sky-400/10'
                          : 'bg-transparent text-black border-zinc-300 dark:border-zinc-800/50 dark:text-zinc-500 hover:border-zinc-500 dark:hover:border-zinc-500'
                      }`}
                    >
                      {post.published ? 'Publik' : 'Draft'}
                    </button>
                  </td>
                  <td className="p-2 md:p-5 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingPost(post)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-400 hover:bg-black hover:text-white dark:hover:bg-sky-400 dark:hover:text-[#0A0A0A] rounded-2xl transition-all"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-2xl transition-all"
                      title="Hapus"
                    >
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-black dark:text-zinc-400 font-bold">
                    Belum ada data postingan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ArchiveMoveModal
        isOpen={!!archiveItemId}
        onClose={() => setArchiveItemId(null)}
        onSuccess={() => {
          setPosts(posts.filter(p => p.id.toString() !== archiveItemId));
        }}
        itemType="blogPosts"
        itemId={archiveItemId || ''}
      />

      <ConfirmModal
        isOpen={!!postToDelete}
        title="Hapus Postingan Blog?"
        message={`Apakah Anda yakin ingin menghapus postingan "${postToDelete?.title || ''}" secara permanen? Tindakan ini akan menghapusnya dari artikel blog dan cloud database.`}
        confirmText="Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setPostToDelete(null)}
      />
    </div>
  );
}
