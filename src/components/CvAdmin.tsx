import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Loader2, Check, Upload, FileText, X, Plus, Trash2, 
  Image as ImageIcon, ChevronLeft, ChevronRight, Layers 
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { defaultSettings, defaultCvSections } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { compressImageToWebP } from '../lib/imageCompressor';
import { uploadImageToStorage } from '../lib/storageUploader';
import ConfirmModal from './ConfirmModal';

export default function CvAdmin() {
  const [settings, setSettings] = useState<any>(() => {
    const stored = getStoredSettings();
    const rawSections = stored.cvSections && stored.cvSections.length > 0 ? stored.cvSections : defaultCvSections;
    const normalizedSections = rawSections.map((s: any) => ({
      ...s,
      images: Array.isArray(s.images) ? s.images : (s.image ? [s.image] : [])
    }));
    return { ...stored, cvSections: normalizedSections };
  });

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [uploadingSectionIndex, setUploadingSectionIndex] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [targetSectionIndex, setTargetSectionIndex] = useState<number>(0);
  const [sectionIdxToClear, setSectionIdxToClear] = useState<number | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const stored = getStoredSettings();
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        let cvDataFromCloud: any = null;
        try {
          const cvSnap = await getDoc(doc(db, 'settings', 'cv'));
          if (cvSnap.exists()) {
            cvDataFromCloud = cvSnap.data();
          }
        } catch (e) {}

        const data = docSnap.exists() ? docSnap.data() : {};
        const cloudCvSections = (cvDataFromCloud?.cvSections && cvDataFromCloud.cvSections.length > 0)
          ? cvDataFromCloud.cvSections
          : (data.cvSections && data.cvSections.length > 0 ? data.cvSections : null);

        const rawSections = cloudCvSections && cloudCvSections.length > 0
          ? cloudCvSections
          : (stored.cvSections && stored.cvSections.length > 0 ? stored.cvSections : defaultCvSections);
        
        const normalizedSections = rawSections.map((s: any, idx: number) => {
          let imgs = Array.isArray(s.images) 
            ? s.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0) 
            : (s.image ? [s.image.trim()] : []);

          // Proteksi reload: jika cloud tidak memiliki gambar tetapi local backup memilikinya, pertahankan gambar
          if (imgs.length === 0 && stored.cvSections?.[idx]) {
            const localSec = stored.cvSections[idx];
            if (Array.isArray(localSec.images) && localSec.images.length > 0) {
              imgs = localSec.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
            }
          }

          return {
            title: s.title || '',
            content: s.content || '',
            images: imgs
          };
        });

        const merged = { 
          ...defaultSettings, 
          ...data, 
          cvRole: cvDataFromCloud?.cvRole || data.cvRole || stored.cvRole || 'Desainer Grafis',
          cvPdfFile: cvDataFromCloud?.cvPdfFile || data.cvPdfFile || stored.cvPdfFile || '',
          cvSections: normalizedSections 
        };
        setSettings(merged);
        saveStoredSettings(merged);
      } catch (err) {
        console.warn("Error fetching settings (using stored):", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && file.type !== 'image/png') {
      showToast("Hanya file PDF & PNG yang diperbolehkan", "error");
      return;
    }

    const isPng = file.type === 'image/png';
    setUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
      
      if (!cloudName || cloudName === "your_cloud_name") {
        throw new Error("Cloudinary belum dikonfigurasi");
      }

      if (isPng) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'cv');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (data.secure_url) {
          setSettings((prev: any) => ({ ...prev, cvPdfFile: data.secure_url }));
          showToast("File CV (PNG) berhasil diunggah!");
        } else {
          throw new Error(data.error?.message || "Gagal mengunggah");
        }
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'cv');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (data.secure_url) {
          setSettings((prev: any) => ({ ...prev, cvPdfFile: data.secure_url }));
          showToast("File CV (PDF) berhasil diunggah!");
        } else {
          throw new Error(data.error?.message || "Gagal mengunggah PDF");
        }
      }
    } catch (err: any) {
      if (isPng) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const value = reader.result as string;
          setSettings((prev: any) => ({ ...prev, cvPdfFile: value }));
          showToast("File CV (PNG) disimpan (Offline/Base64)");
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      } else {
        showToast(err.message || "Gagal mengunggah file CV.", "error");
      }
    } finally {
      e.target.value = '';
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveProgressText('Menyiapkan data...');

    try {
      // 1. OPTIMASI PAYLOAD: Pastikan tidak ada data Base64 raksasa di dalam JSON database
      // Jika ada gambar lokal/Base64, unggah ke storage terlebih dahulu secara paralel
      const currentSections = Array.isArray(settings.cvSections) 
        ? [...settings.cvSections] 
        : [...defaultCvSections];

      let totalBase64 = 0;
      currentSections.forEach((sec) => {
        const imgs = Array.isArray(sec.images) ? sec.images : (sec.image ? [sec.image] : []);
        imgs.forEach((img: any) => {
          if (typeof img === 'string' && img.startsWith('data:image/')) {
            totalBase64++;
          }
        });
      });

      let updatedSections = currentSections;

      if (totalBase64 > 0) {
        let converted = 0;
        setSaveProgressText(`Memproses & Menyimpan Gambar (0/${totalBase64})...`);

        // ASYNCHRONOUS / PARALLEL UPLOAD menggunakan Promise.all
        updatedSections = await Promise.all(
          currentSections.map(async (sec, secIdx) => {
            const imgs = Array.isArray(sec.images) ? sec.images : (sec.image ? [sec.image] : []);

            const convertedImages = await Promise.all(
              imgs.map(async (img: any, imgIdx: number) => {
                if (typeof img === 'string' && img.startsWith('data:image/')) {
                  try {
                    // Kompresi WebP client-side (max-width 800px, kualitas 75-80%)
                    const { blob, file: webpFile, dataUrl } = await compressImageToWebP(img, 800, 0.78);
                    const filename = `cv_sec${secIdx}_${imgIdx}_${Date.now()}.webp`;
                    const uploadedUrl = await uploadImageToStorage(blob || webpFile, filename, dataUrl);
                    converted++;
                    setSaveProgressText(`Memproses & Menyimpan Gambar (${converted}/${totalBase64})...`);
                    return uploadedUrl;
                  } catch (err) {
                    converted++;
                    setSaveProgressText(`Memproses & Menyimpan Gambar (${converted}/${totalBase64})...`);
                    return img;
                  }
                }
                return img;
              })
            );

            return {
              ...sec,
              images: convertedImages.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
            };
          })
        );
      }

      setSaveProgressText('Menyimpan ke Database...');

      const settingsToSave = {
        ...settings,
        cvSections: updatedSections
      };

      setSettings(settingsToSave);

      const success = await saveStoredSettings(settingsToSave);
      if (success) {
        showToast('Data CV & Foto berhasil disimpan ke Cloud Database & Sinkron Real-time!', 'success');
      } else {
        showToast('Data CV disimpan (Penyimpanan Lokal Aktif)', 'success');
      }
    } catch (err: any) {
      console.error("Gagal menyimpan CV:", err);
      showToast(err.message || 'Gagal menyimpan perubahan', 'error');
    } finally {
      setIsSaving(false);
      setSaveProgressText('');
    }
  };

  const addSection = () => {
    setSettings((prev: any) => {
      const updated = [...(prev.cvSections || []), { title: '', content: '', images: [] }];
      return { ...prev, cvSections: updated };
    });
    setTargetSectionIndex((settings.cvSections?.length || 0));
  };

  const updateSection = (index: number, field: 'title' | 'content', value: string) => {
    const newSections = [...(settings.cvSections || [])];
    newSections[index][field] = value;
    setSettings((prev: any) => ({ ...prev, cvSections: newSections }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      if (start !== end) {
        const selectedText = value.substring(start, end);
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const newText = `${beforeText}<b>${selectedText}</b>${afterText}`;
        updateSection(index, 'content', newText);
        setTimeout(() => {
          target.focus();
          target.setSelectionRange(start + 3, end + 3);
        }, 10);
      }
    }
  };

  const removeSection = (index: number) => {
    const newSections = [...(settings.cvSections || [])];
    newSections.splice(index, 1);
    setSettings((prev: any) => ({ ...prev, cvSections: newSections }));
    if (targetSectionIndex >= newSections.length && newSections.length > 0) {
      setTargetSectionIndex(newSections.length - 1);
    }
  };

  // MULTIPLE IMAGE UPLOAD HANDLER (PARALEL / ASYNCHRONOUS VIA Promise.all)
  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, specificIndex?: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const destIndex = specificIndex !== undefined ? specificIndex : targetSectionIndex;
    if (!settings.cvSections || !settings.cvSections[destIndex]) {
      showToast("Pilih blok/card tujuan yang valid terlebih dahulu", "error");
      e.target.value = '';
      return;
    }

    setUploadingSectionIndex(destIndex);
    setIsImageUploading(true);
    setUploadStatusText(`Mengompresi & mengunggah ${files.length} foto secara paralel...`);

    try {
      const fileList = Array.from(files);
      let completedCount = 0;

      // 1 & 2. KOMPRESI CLIENT-SIDE (WebP, 75-80%, max-width 800px) & PARALLEL UPLOAD VIA Promise.all
      const uploadPromises = fileList.map(async (file, idx) => {
        // Kompresi otomatis di browser dengan Canvas toBlob WebP
        const { blob, file: webpFile, dataUrl } = await compressImageToWebP(file, 800, 0.78);

        // Upload ke storage (Firebase Storage / Cloudinary) untuk mendapatkan URL bersih
        const filename = `cv_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}.webp`;
        const uploadedUrl = await uploadImageToStorage(blob || webpFile, filename, dataUrl);

        completedCount++;
        setUploadStatusText(`Memproses & Mengunggah Foto (${completedCount}/${fileList.length})...`);
        setSaveProgressText(`Memproses & Menyimpan Gambar (${completedCount}/${fileList.length})...`);

        return uploadedUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);

      if (validUrls.length > 0) {
        setUploadStatusText("Menyimpan ke database...");

        // METODE APPEND: Ambil referensi array foto yang sudah ada pada blok target, lalu gabungkan foto baru di akhir array (bukan overwrite)
        setSettings((prevSettings: any) => {
          const newSections = Array.isArray(prevSettings.cvSections)
            ? prevSettings.cvSections.map((sec: any) => ({
                ...sec,
                images: Array.isArray(sec.images) ? [...sec.images] : (sec.image ? [sec.image] : [])
              }))
            : [...defaultCvSections];

          if (!newSections[destIndex]) {
            newSections[destIndex] = { title: '', content: '', images: [] };
          }

          const existingImages = (newSections[destIndex].images || []).filter(
            (img: any) => typeof img === 'string' && img.trim().length > 0
          );

          // APPEND FOTO BARU KE ARRAY FOTO YANG SUDAH ADA
          newSections[destIndex].images = [...existingImages, ...validUrls];

          const updatedSettings = {
            ...prevSettings,
            cvSections: newSections
          };

          // Simpan ke Cloud Firestore (Database) dan LocalStorage seketika
          saveStoredSettings(updatedSettings).then((success) => {
            if (success) {
              showToast(`${validUrls.length} foto berhasil diunggah & disimpan ke database!`, "success");
            } else {
              showToast(`${validUrls.length} foto berhasil ditambahkan (Penyimpanan Lokal Aktif)`, "success");
            }
          });

          return updatedSettings;
        });
      } else {
        showToast("Gagal mengunggah foto.", "error");
      }
    } catch (err: any) {
      console.error("Gagal memproses upload gambar secara paralel:", err);
      showToast(err.message || "Gagal mengunggah foto.", "error");
    } finally {
      setIsImageUploading(false);
      setUploadingSectionIndex(null);
      setUploadStatusText('');
      setSaveProgressText('');
      e.target.value = '';
    }
  };

  // REORDER IMAGE HANDLER
  const handleReorderImage = async (sectionIdx: number, imgIdx: number, direction: 'left' | 'right') => {
    const newSections = [...(settings.cvSections || [])];
    const images = Array.isArray(newSections[sectionIdx]?.images) 
      ? [...newSections[sectionIdx].images] 
      : [];
    
    const targetIdx = direction === 'left' ? imgIdx - 1 : imgIdx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;

    // Swap
    const temp = images[imgIdx];
    images[imgIdx] = images[targetIdx];
    images[targetIdx] = temp;

    newSections[sectionIdx] = { ...newSections[sectionIdx], images };
    const updatedSettings = { ...settings, cvSections: newSections };
    setSettings(updatedSettings);
    await saveStoredSettings(updatedSettings);
    showToast(`Urutan foto diperbarui & disimpan`);
  };

  // REMOVE SPECIFIC IMAGE
  const handleRemoveImage = async (sectionIdx: number, imgIdx: number) => {
    const newSections = [...(settings.cvSections || [])];
    const images = Array.isArray(newSections[sectionIdx]?.images) 
      ? [...newSections[sectionIdx].images] 
      : [];
    
    images.splice(imgIdx, 1);
    newSections[sectionIdx] = { ...newSections[sectionIdx], images };
    const updatedSettings = { ...settings, cvSections: newSections };
    setSettings(updatedSettings);
    await saveStoredSettings(updatedSettings);
    showToast("Foto dihapus & perubahan disimpan");
  };

  // CLEAR ALL IMAGES FROM SECTION
  const handleClearAllImages = (sectionIdx: number) => {
    setSectionIdxToClear(sectionIdx);
  };

  const handleConfirmClearImages = async () => {
    if (sectionIdxToClear === null) return;
    const sectionIdx = sectionIdxToClear;
    setSectionIdxToClear(null);

    const newSections = [...(settings.cvSections || [])];
    newSections[sectionIdx] = { ...newSections[sectionIdx], images: [] };
    const updatedSettings = { ...settings, cvSections: newSections };
    setSettings(updatedSettings);
    await saveStoredSettings(updatedSettings);
    showToast("Semua foto di blok ini telah dihapus & disimpan");
  };

  const currentSection = settings.cvSections?.[targetSectionIndex] || null;
  const currentImages: string[] = currentSection?.images || [];

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: -24, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: -20, scale: 0.95 }} 
          className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 z-[999] shadow-2xl backdrop-blur-md border ${
            toast.type === 'success' 
              ? 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300' 
              : 'bg-red-500/95 text-white border-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">!</div>
          )}
          <span>{toast.msg}</span>
        </motion.div>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold text-black dark:text-white mb-1.5">CV & Detail</h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm">
          Kelola informasi profil, file PDF CV, serta manajemen foto kolase pada setiap blok/card target di halaman CV & Detail.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 w-full max-w-none">

        {/* Profil Singkat */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Nama Lengkap</label>
            <input 
              type="text" 
              value={settings.fullName || ''} 
              onChange={(e) => setSettings({...settings, fullName: e.target.value})} 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Catatan Kecil (Profesi)</label>
            <input 
              type="text" 
              value={settings.cvRole || ''} 
              onChange={(e) => setSettings({...settings, cvRole: e.target.value})} 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              value={settings.contactEmail || ''} 
              onChange={(e) => setSettings({...settings, contactEmail: e.target.value})} 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Nomor HP / WhatsApp</label>
            <input 
              type="text" 
              value={settings.contactPhone || ''} 
              onChange={(e) => setSettings({...settings, contactPhone: e.target.value})} 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" 
              required 
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Link Web Portofolio</label>
            <input 
              type="url" 
              value={settings.portfolioLink || ''} 
              onChange={(e) => setSettings({...settings, portfolioLink: e.target.value})} 
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" 
              placeholder="https://" 
            />
          </div>
        </div>

        {/* Upload File Dokumen CV */}
        <div>
          <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">File CV (PDF / PNG)</label>
          {settings.cvPdfFile ? (
            <div className="relative p-4 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-black dark:text-white">File CV (Tersimpan)</p>
                  <a href={settings.cvPdfFile} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Lihat File</a>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSettings((prev: any) => ({ ...prev, cvPdfFile: '' }))} 
                className="bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                title="Hapus file CV"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative p-7 w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {uploading ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">Mengunggah file CV...</span>
                </div>
              ) : (
                <>
                  <FileText className="w-8 h-8 text-zinc-400 mb-2" />
                  <span className="text-xs font-medium text-black dark:text-white/90">Klik untuk unggah (PDF / PNG)</span>
                  <input type="file" accept=".pdf,application/pdf,.png,image/png" onChange={handlePdfUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                </>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* FITUR UTAMA: MANAJEMEN FOTO KOLASE PER BLOK/CARD DENGAN DROPDOWN */}
        {/* =================================================================== */}
        <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-bold text-black dark:text-white tracking-tight">
                  Manajemen Gambar & Kolase Blok CV
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Unggah multiple gambar, atur urutan, dan hapus foto pada blok/card target.
                </p>
              </div>
            </div>

            {currentImages.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearAllImages(targetSectionIndex)}
                className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Foto di Blok Ini</span>
              </button>
            )}
          </div>

          {/* 1. DROPDOWN SELECTOR BLOK TARGET */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>Pilih Blok / Card Target:</span>
              <span className="text-[11px] font-normal text-zinc-500">
                Total {settings.cvSections?.length || 0} Blok Tersedia
              </span>
            </label>

            <div className="relative">
              <select
                value={targetSectionIndex}
                onChange={(e) => setTargetSectionIndex(Number(e.target.value))}
                className="w-full bg-white dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-bold text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none cursor-pointer shadow-sm transition-all"
              >
                {settings.cvSections && settings.cvSections.map((sec: any, idx: number) => {
                  const count = sec.images?.length || 0;
                  return (
                    <option key={idx} value={idx}>
                      Blok #{idx + 1}: {sec.title || `(Tanpa Judul)`} — [{count} Foto]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Banner info ringkas tentang blok yang sedang dipilih */}
            {currentSection && (
              <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-black dark:text-white truncate">
                    {currentSection.title || `Blok #${targetSectionIndex + 1}`}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-700 text-black dark:text-white shrink-0 border border-zinc-200 dark:border-zinc-600">
                  {currentImages.length} Foto Terpasang
                </span>
              </div>
            )}
          </div>

          {/* 2. AREA UPLOAD GAMBAR (MULTIPLE IMAGE UPLOAD) */}
          <div>
            <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">
              Unggah Foto Baru (Multiple Image):
            </label>

            <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center bg-white dark:bg-zinc-900/50 transition-all cursor-pointer group">
              {isImageUploading ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                  <span className="text-xs font-bold text-black dark:text-white">
                    {uploadStatusText || 'Sedang mengunggah foto...'}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Memproses dan mengoptimasi gambar untuk kolase CV
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:scale-110 flex items-center justify-center mb-3 transition-transform shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black dark:text-white text-center">
                    Klik atau Tarik File Gambar ke Sini
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 text-center max-w-sm">
                    Bisa memilih <strong>beberapa gambar sekaligus</strong> (PNG, JPG, WebP). Gambar akan disusun menjadi <em>Irregular Photo Collage</em> di blok ini.
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => handleMultiImageUpload(e, targetSectionIndex)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isImageUploading}
                  />
                </>
              )}
            </div>
          </div>

          {/* 3. DAFTAR FOTO DI BLOK INI (DAPAT DIATUR URUTAN & DIHAPUS) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                Daftar Foto Kolase ({currentImages.length} Foto)
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Gunakan panah untuk mengubah urutan foto di kolase
              </span>
            </div>

            {currentImages.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/30">
                <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Belum ada foto yang diunggah di blok <strong>"{currentSection?.title || `Blok #${targetSectionIndex + 1}`}"</strong>.
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Gunakan area upload di atas untuk menambahkan foto pertama.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {currentImages.map((imgUrl, imgIdx) => (
                  <div 
                    key={imgIdx}
                    className="relative group bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-2 flex flex-col shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center mb-2">
                      <img 
                        src={imgUrl} 
                        alt={`Foto #${imgIdx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Urutan Badge */}
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-black/80 text-white backdrop-blur-xs">
                        #{imgIdx + 1} {imgIdx === 0 ? '(Depan)' : ''}
                      </span>

                      {/* Tombol Hapus Cepat */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(targetSectionIndex, imgIdx)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-red-600 text-white shadow-sm hover:bg-red-700 transition-colors opacity-90 group-hover:opacity-100"
                        title="Hapus foto ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Tombol Geser Urutan (Reorder) */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-700/60">
                      <button
                        type="button"
                        disabled={imgIdx === 0}
                        onClick={() => handleReorderImage(targetSectionIndex, imgIdx, 'left')}
                        className="flex-1 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-black dark:text-white flex items-center justify-center transition-colors"
                        title="Geser ke kiri / urutan sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] font-bold text-zinc-500 px-1">
                        {imgIdx + 1}/{currentImages.length}
                      </span>

                      <button
                        type="button"
                        disabled={imgIdx === currentImages.length - 1}
                        onClick={() => handleReorderImage(targetSectionIndex, imgIdx, 'right')}
                        className="flex-1 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed text-black dark:text-white flex items-center justify-center transition-colors"
                        title="Geser ke kanan / urutan selanjutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* EDIT SUBTEMA & PARAGRAF DENGAN PREVIEW FOTO TIAP KARTU */}
        {/* =================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                Daftar Subtema & Paragraf CV
              </label>
              <p className="text-[11px] text-zinc-500">
                Kelola teks dan konten untuk setiap blok/card. Tekan Ctrl+B pada teks yang diblok untuk menebalkan kata.
              </p>
            </div>
            <button 
              type="button" 
              onClick={addSection} 
              className="flex items-center gap-2 text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-full hover:scale-105 transition-all shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Subtema
            </button>
          </div>
          
          <div className="space-y-4">
            {settings.cvSections && settings.cvSections.map((section: any, index: number) => {
              const secImages: string[] = Array.isArray(section.images) 
                ? section.images 
                : (section.image ? [section.image] : []);

              return (
                <div 
                  key={index} 
                  className={`p-5 bg-zinc-50 dark:bg-zinc-900 border rounded-2xl relative transition-all ${
                    targetSectionIndex === index 
                      ? 'border-black dark:border-white ring-1 ring-black/10 dark:ring-white/10' 
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Blok #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setTargetSectionIndex(index)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          targetSectionIndex === index 
                            ? 'bg-black text-white dark:bg-white dark:text-black' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                        }`}
                      >
                        {targetSectionIndex === index ? '✓ Sedang Diedit' : 'Pilih untuk Kelola Foto'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => removeSection(index)} 
                        className="text-zinc-400 hover:text-red-500 p-1 transition-colors"
                        title="Hapus subtema ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input 
                    type="text" 
                    value={section.title} 
                    onChange={(e) => updateSection(index, 'title', e.target.value)} 
                    placeholder="Judul Subtema (Cth: Professional Summary / Pengalaman Kerja)" 
                    className="w-full bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-black dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" 
                    required 
                  />

                  <textarea 
                    value={section.content} 
                    onChange={(e) => updateSection(index, 'content', e.target.value)} 
                    onKeyDown={(e) => handleKeyDown(e, index)}  
                    placeholder="Isi paragraf..." 
                    className="w-full bg-white dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 text-xs text-black dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none h-28" 
                    required  
                  />
                  
                  {/* Preview Kolase Foto pada Kartu Ini */}
                  <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-bold text-black dark:text-white">
                        Kolase Foto ({secImages.length}):
                      </span>
                      {secImages.length > 0 ? (
                        <div className="flex items-center -space-x-2 overflow-hidden ml-1">
                          {secImages.slice(0, 4).map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              alt="thumb" 
                              className="w-7 h-7 rounded-lg object-cover border-2 border-white dark:border-zinc-800" 
                            />
                          ))}
                          {secImages.length > 4 && (
                            <span className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center border-2 border-white dark:border-zinc-800">
                              +{secImages.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">Belum ada foto</span>
                      )}
                    </div>

                    <label 
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 self-start sm:self-auto ${
                        isImageUploading && uploadingSectionIndex === index
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 cursor-wait shadow-sm'
                          : isImageUploading
                          ? 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-60'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white cursor-pointer active:scale-95'
                      }`}
                    >
                      {isImageUploading && uploadingSectionIndex === index ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
                          <span>{uploadStatusText || 'Loading / Uploading...'}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>+ Tambah Foto ke Blok Ini</span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => handleMultiImageUpload(e, index)}
                        className="hidden"
                        disabled={isImageUploading}
                      />
                    </label>
                  </div>
                </div>
              );
            })}

            {(!settings.cvSections || settings.cvSections.length === 0) && (
              <p className="text-xs text-black dark:text-white/90 text-center py-4">Belum ada subtema yang ditambahkan.</p>
            )}
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button 
            type="submit" 
            disabled={isSaving || uploading || isImageUploading} 
            className="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-8 py-4 rounded-xl text-sm font-bold hover:opacity-85 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-black/10 dark:shadow-white/5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                <span>{saveProgressText || 'Menyimpan Perubahan...'}</span>
              </>
            ) : isImageUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                <span>{uploadStatusText || 'Mengunggah Foto...'}</span>
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>

      </form>

      {/* Floating non-blocking background progress indicator (Layar tidak diblokir) */}
      {(isSaving || isImageUploading) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 bg-zinc-900/95 text-white dark:bg-white/95 dark:text-zinc-900 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700/60 dark:border-zinc-200/60 flex items-center gap-3.5 text-xs font-semibold pointer-events-none transition-all"
        >
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400 dark:text-amber-600 shrink-0" />
            <span className="absolute w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-600 animate-ping opacity-60" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight">
              {saveProgressText || uploadStatusText || 'Memproses di latar belakang...'}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
              Layar tidak diblokir — data sedang diproses & dioptimasi secara otomatis
            </span>
          </div>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={sectionIdxToClear !== null}
        title="Hapus Semua Foto Blok Ini?"
        message="Apakah Anda yakin ingin menghapus semua foto dari blok ini? Perubahan akan disimpan secara otomatis."
        confirmText="Hapus Semua"
        cancelText="Batal"
        variant="danger"
        onConfirm={handleConfirmClearImages}
        onClose={() => setSectionIdxToClear(null)}
      />
    </div>
  );
}
