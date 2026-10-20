import { useState, useEffect } from 'react';
import ArchiveMoveModal from './ArchiveMoveModal';
import { motion } from 'motion/react';
import { BlogPost } from '../types/blog';
import { Edit, Trash, Plus, X, Check, Cloud, Upload, Loader2, Image as ImageIcon, Archive, AlertCircle } from 'lucide-react';
import { db, ensureFreshAuthToken } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStoredBlogs, saveStoredBlogs, cleanBlogs } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { withTimeout, compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';

export default function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>(() => getStoredBlogs());
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
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
        if (!snapshot.empty) {
          const loadedPosts: BlogPost[] = [];
          snapshot.forEach((docSnap) => {
            loadedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost);
          });
          loadedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const cleaned = cleanBlogs(loadedPosts);
          setPosts(cleaned);
          saveStoredBlogs(cleaned);
        }
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
    };

    // Update state & local storage segera agar perubahan langsung terlihat di web
    let newPosts: BlogPost[];
    if (posts.find(p => p.id === payloadToSave.id)) {
      newPosts = posts.map(p => p.id === payloadToSave.id ? payloadToSave : p);
    } else {
      newPosts = [payloadToSave, ...posts];
    }
    savePosts(newPosts);

    try {
      await withTimeout(
        setDoc(doc(db, 'blogPosts', payloadToSave.id), payloadToSave, { merge: true }),
        25000,
        "Waktu simpan database habis. Perubahan tetap tersimpan di lokal."
      );

      showToast("Postingan berhasil disimpan & tampil di website!");
      setEditingPost(null);
    } catch (err: any) {
      console.warn("Save Blog Cloud Notice:", err);
      showToast("Postingan disimpan di penyimpanan lokal & web!", "success");
      setEditingPost(null);
    } finally {
      setSavingPost(false);
    }
  };

  const handleDelete = async (id: string, imageUrl?: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini permanen di Cloud Database.")) {
      try {
        await withTimeout(
          deleteDoc(doc(db, 'blogPosts', id)),
          15000,
          "Waktu hapus data habis."
        );
        const updated = posts.filter(p => p.id !== id);
        savePosts(updated);
        showToast("Postingan berhasil dihapus permanen.");
      } catch (err: any) {
        console.error("[DELETE] Gagal menghapus postingan:", err);
        showToast(`Gagal menghapus: ${err.message || 'Error Database'}`, "error");
      }
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
      // Refresh auth token sebelum request upload dikirim
      await ensureFreshAuthToken();

      if (fileList.length === 1) {
        setUploadStatusText("Mengompres & Mengunggah Gambar...");
        // max-width: 1200px, quality: 0.75, timeout: 15000ms (15 detik)
        const cleanUrl = await compressAndUpload(fileList[0], 'blog_posts', 1200, 0.75, 15000);
        setEditingPost(prev => prev ? ({ ...prev, image: cleanUrl }) : null);
        showToast("Gambar berhasil diunggah!");
      } else {
        // Multiple upload parallel dengan timeout 15 detik
        setUploadStatusText(`Mengunggah Gambar (0/${fileList.length})...`);
        const cleanUrls = await uploadMultipleImagesInParallel(
          fileList,
          'blog_posts',
          (done, total) => setUploadStatusText(`Mengunggah Gambar (${done}/${total})...`),
          1200,
          0.75,
          15000
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
    setEditingPost({
      id: Date.now().toString(),
      title: '',
      content: '',
      image: '',
      date: new Date().toISOString(),
      category: 'Umum',
      published: true
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
                      onClick={() => handleDelete(post.id, post.image)}
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
    </div>
  );
}
