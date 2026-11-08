import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit, Trash2, Search, Check, X, HelpCircle, 
  Sparkles, Layers, ArrowUpDown, Eye, EyeOff, Save, Loader2,
  Upload, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { QuickFilterItem } from '../types/quickFilter';
import { 
  getStoredQuickFilterItems, 
  saveQuickFilterItemToFirestore, 
  deleteQuickFilterItemFromFirestore,
  cleanQuickFilterItems 
} from '../lib/quickFilterStorage';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { CustomLoadingPlaceholder } from './SectionInsight';
import { compressAndUpload, uploadMultipleImagesInParallel } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

export default function QuickFilterAdmin() {
  const [items, setItems] = useState<QuickFilterItem[]>(() => getStoredQuickFilterItems());
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getStoredQuickFilterItems();
    return !cached || cached.length === 0;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [editingItem, setEditingItem] = useState<QuickFilterItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<QuickFilterItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('Tren Desain');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formCustomUrl, setFormCustomUrl] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formPublished, setFormPublished] = useState(true);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Subscribe to Firestore for real-time admin sync
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setItems(e.detail);
    };
    window.addEventListener('quick_filter_updated', handleUpdate);

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'quickFilterQA'),
        (snapshot) => {
          const loaded: QuickFilterItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              question: data.question || '',
              answer: data.answer || '',
              category: data.category || 'Tren Desain',
              images: Array.isArray(data.images) ? data.images : (typeof data.image === 'string' && data.image ? [data.image] : []),
              tags: data.tags || [],
              order: data.order ?? 0,
              published: data.published !== false,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });

          if (loaded.length > 0) {
            setItems(cleanQuickFilterItems(loaded));
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn('Firestore QuickFilter admin listener notice:', error);
          setIsLoading(false);
        }
      );

      return () => {
        unsubscribe();
        window.removeEventListener('quick_filter_updated', handleUpdate);
      };
    } catch {
      setIsLoading(false);
      return () => window.removeEventListener('quick_filter_updated', handleUpdate);
    }
  }, []);

  // Compute categories
  const categories = Array.from(new Set(items.map(i => i.category || 'Tren Desain').filter(Boolean)));
  const defaultPresets = ['Tren Warna', 'Tren Desain', 'Tips Branding', 'Jasa & Order'];
  const allCategoryOptions = Array.from(new Set([...defaultPresets, ...categories]));

  const filteredItems = selectedCategory === 'Semua' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  const openAddModal = () => {
    setEditingItem(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('Tren Desain');
    setFormCustomCategory('');
    setFormImages([]);
    setFormCustomUrl('');
    setFormTags('');
    setFormOrder(items.length + 1);
    setFormPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: QuickFilterItem) => {
    setEditingItem(item);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    if (defaultPresets.includes(item.category)) {
      setFormCategory(item.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('custom');
      setFormCustomCategory(item.category);
    }
    setFormImages(Array.isArray(item.images) ? [...item.images] : []);
    setFormCustomUrl('');
    setFormTags((item.tags || []).join(', '));
    setFormOrder(item.order ?? 1);
    setFormPublished(item.published !== false);
    setIsModalOpen(true);
  };

  // Upload image handler (supports single or multiple file upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setIsUploadingImages(true);
    setUploadStatusText(`Mengompres & Mengunggah ${fileList.length} gambar...`);

    try {
      if (fileList.length === 1) {
        const uploadedUrl = await compressAndUpload(fileList[0], 'insight');
        if (uploadedUrl) {
          setFormImages(prev => [...prev, uploadedUrl]);
          showToast('Gambar berhasil diunggah!');
        }
      } else {
        const uploadedUrls = await uploadMultipleImagesInParallel(
          fileList,
          'insight',
          (done, total) => setUploadStatusText(`Mengunggah (${done}/${total})...`)
        );
        if (uploadedUrls.length > 0) {
          setFormImages(prev => [...prev, ...uploadedUrls]);
          showToast(`${uploadedUrls.length} gambar berhasil diunggah!`);
        }
      }
    } catch (err: any) {
      console.error('Upload image error:', err);
      showToast('Gagal mengunggah gambar. Silakan coba lagi.', 'error');
    } finally {
      setIsUploadingImages(false);
      setUploadStatusText('');
      e.target.value = '';
    }
  };

  // Add image via URL
  const handleAddImageUrl = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const cleanUrl = formCustomUrl.trim();
    if (!cleanUrl) return;

    setFormImages(prev => [...prev, cleanUrl]);
    setFormCustomUrl('');
    showToast('Tautan gambar berhasil ditambahkan');
  };

  // Remove an image from form
  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      showToast('Pertanyaan dan jawaban wajib diisi', 'error');
      return;
    }

    const finalCategory = (formCategory === 'custom' ? formCustomCategory : formCategory).trim() || 'Tren Desain';

    setIsSaving(true);
    try {
      const payload: QuickFilterItem = {
        id: editingItem?.id || `qfa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        category: finalCategory,
        images: formImages.filter(url => url && typeof url === 'string' && url.trim().length > 0),
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        order: Number(formOrder) || 1,
        published: formPublished,
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveQuickFilterItemToFirestore(payload);
      showToast(editingItem ? 'Pertanyaan & Jawaban berhasil diperbarui!' : 'Pertanyaan baru berhasil ditambahkan ke database!', 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan data ke Firestore', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteQuickFilterItemFromFirestore(itemToDelete.id);
      showToast('Item berhasil dihapus dari database', 'success');
      setItemToDelete(null);
    } catch {
      showToast('Gagal menghapus item dari database', 'error');
    }
  };

  const handleTogglePublish = async (item: QuickFilterItem) => {
    try {
      await saveQuickFilterItemToFirestore({
        ...item,
        published: !item.published
      });
      showToast(`Item ${!item.published ? 'ditampilkan' : 'disembunyikan'} di website`);
    } catch {
      showToast('Gagal mengubah status publikasi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-[110000] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
            }`}
          >
            {toast.type === 'error' ? <X size={15} /> : <Check size={15} />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
              <Search size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-black dark:text-white tracking-tight">
              Kelola Section Insight (Quick Filter Q&A)
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Sistem CMS untuk menambah, mengedit, atau menghapus kartu pertanyaan, jawaban, dan gambar pendukung di Section Insight.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Tambah Pertanyaan Baru</span>
        </button>
      </div>

      {/* Filter by Category Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-bold text-zinc-500 shrink-0 mr-1">Filter Kategori:</span>
        {['Semua', ...allCategoryOptions].map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Q&A Cards List in Admin Mode */}
      {isLoading ? (
        <CustomLoadingPlaceholder />
      ) : (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
              <HelpCircle className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Tidak ada pertanyaan pada kategori ini.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const hasImages = Array.isArray(item.images) && item.images.length > 0;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-2xs"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Thumbnail preview if has images */}
                    {hasImages && (
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <img
                          src={resolveImageUrl(item.images![0])}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                        {item.images!.length > 1 && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-white font-mono text-[9px] font-bold">
                            +{item.images!.length - 1}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Urutan: #{item.order ?? 1}
                        </span>
                        {hasImages && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            <ImageIcon size={10} className="text-blue-500" />
                            {item.images!.length} Gambar
                          </span>
                        )}
                        {item.published === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <EyeOff size={10} /> Disembunyikan
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-black dark:text-white mb-1.5 leading-snug">
                        {item.question}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                        {item.answer}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[9.5px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        item.published !== false 
                          ? 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200' 
                          : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                      }`}
                      title={item.published !== false ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {item.published !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                      title="Edit Pertanyaan & Gambar"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 rounded-xl text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                      title="Hapus Pertanyaan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-extrabold text-black dark:text-white">
                  {editingItem ? 'Edit Pertanyaan & Gambar Insight' : 'Tambah Pertanyaan Insight Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
                {/* Category Preset Selector */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Kategori Preset (Topik):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {defaultPresets.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => { setFormCategory(cat); setFormCustomCategory(''); }}
                        className={`px-3 py-2 rounded-xl text-center font-bold text-[11px] transition-all cursor-pointer border ${
                          formCategory === cat 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                            : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormCategory('custom')}
                    className={`text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-block mb-1 cursor-pointer`}
                  >
                    + Buat Kategori Custom Baru
                  </button>

                  {formCategory === 'custom' && (
                    <input
                      type="text"
                      placeholder="Masukkan nama kategori baru..."
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600 mt-1"
                      required={formCategory === 'custom'}
                    />
                  )}
                </div>

                {/* Question Input */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Pertanyaan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Warna apa saja yang sedang menjadi tren saat ini?"
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600"
                    required
                  />
                </div>

                {/* Answer Textarea */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Jawaban Lengkap:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan jawaban informatif yang membantu pengunjung..."
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600 resize-none"
                    required
                  />
                </div>

                {/* ========================================================
                    UPLOAD GAMBAR PENDUKUNG (BISA LEBIH DARI SATU / KOSONG)
                    ======================================================== */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-zinc-800 dark:text-zinc-200">
                        Gambar Pendukung (Opsional / Bisa Lebih Dari Satu)
                      </span>
                      <span className="text-[10.5px] text-zinc-500">
                        Akan ditampilkan di kolom kanan saat pertanyaan dibuka.
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {formImages.length} Gambar
                    </span>
                  </div>

                  {/* Upload Actions: File Picker & Manual URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* File Upload Button */}
                    <label className={`relative flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-blue-500/70 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold transition-all cursor-pointer ${isUploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={15} />
                      <span>{isUploadingImages ? uploadStatusText || 'Mengunggah...' : 'Upload File Gambar'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploadingImages}
                      />
                    </label>

                    {/* Add Image by URL Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        placeholder="Tempel URL gambar (https://...)"
                        value={formCustomUrl}
                        onChange={(e) => setFormCustomUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddImageUrl(e); }}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-black dark:text-white font-bold transition-colors cursor-pointer shrink-0"
                      >
                        + Tambah
                      </button>
                    </div>
                  </div>

                  {/* Image Thumbnails Preview List */}
                  {formImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      {formImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                        >
                          <img
                            src={resolveImageUrl(imgUrl)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-md opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Hapus gambar ini"
                          >
                            <Trash2 size={12} />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags & Order Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Tags (Pisahkan koma):
                    </label>
                    <input
                      type="text"
                      placeholder="Tren, Palet, Desain"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Urutan Tampil (Nomor):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={formOrder}
                      onChange={(e) => setFormOrder(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-black dark:text-white focus:outline-blue-600"
                    />
                  </div>
                </div>

                {/* Published Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="publishedCheck"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="publishedCheck" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Tampilkan pertanyaan ini di website (Publikasikan)
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploadingImages}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>{editingItem ? 'Simpan Perubahan' : 'Terbitkan Q&A'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-black dark:text-white">
                Hapus Pertanyaan Ini?
              </h3>
              <p className="text-xs text-zinc-500 line-clamp-2">
                "{itemToDelete.question}"
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
