import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateProduct } from '../data/templates';
import { cleanTemplates } from '../lib/contentStorage';
import { Edit, Trash, EyeOff, Eye, Plus, X, Check, Upload, Loader2, Tag, DownloadCloud, Link as LinkIcon, Cloud } from 'lucide-react';
import { deleteFromCloudinary } from "../lib/cloudinary";
import { db, googleSignIn, getAccessToken } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function StoreAdmin() {
 const [templates, setTemplates] = useState<TemplateProduct[]>(() => {
   try {
     const saved = localStorage.getItem('templates');
     if (saved) {
       const parsed = JSON.parse(saved);
       if (Array.isArray(parsed)) return parsed;
     }
   } catch (e) {}
   return [];
 });
 const [editingTemplate, setEditingTemplate] = useState<TemplateProduct | null>(null);
 const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
 const [uploading, setUploading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [featuresInput, setFeaturesInput] = useState('');
 const [showCloudinaryModal, setShowCloudinaryModal] = useState(false);
 const [cloudinaryCloudName, setCloudinaryCloudName] = useState(() => 
   localStorage.getItem('cloudinary_cloud_name') || (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' ? (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '') : '')
 );
 const [cloudinaryPreset, setCloudinaryPreset] = useState(() => 
   localStorage.getItem('cloudinary_upload_preset') || (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET !== 'your_unsigned_upload_preset' ? (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '') : '')
 );

 const showToast = (msg: string, type: 'success'|'error' = 'success') => {
  setToast({msg, type});
  setTimeout(() => setToast(null), 3000);
 };

 useEffect(() => {
  const unsubscribe = onSnapshot(
   collection(db, 'templates'),
   (snapshot) => {
    if (!snapshot.empty) {
     const tmpls: TemplateProduct[] = [];
     snapshot.forEach((doc) => {
      tmpls.push({ id: doc.id, ...doc.data() } as TemplateProduct);
     });
     tmpls.sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
     setTemplates(cleanTemplates(tmpls));
    } else {
     setTemplates([]);
     
    }
   },
   (error) => {
    console.warn("Firestore Admin Templates Error:", error);
    setTemplates([]);
   }
  );
  return () => unsubscribe();
 }, []);

 const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingTemplate) return;
  setIsSaving(true);

  if (!editingTemplate.title || !editingTemplate.price || !editingTemplate.description) {
   showToast("Harap isi Nama Template, Harga, dan Deskripsi.", "error");
   return;
  }

  if (!editingTemplate.image) {
   showToast("Harap unggah gambar preview template terlebih dahulu.", "error");
   return;
  }

  try {
   const docId = editingTemplate.id;
   const templateRef = doc(db, 'templates', docId);
   const featuresArray = featuresInput.split(',').map(f => f.trim()).filter(f => f.length > 0);
   
   const payloadToSave = {
    title: editingTemplate.title,
    price: Number(editingTemplate.price),
    image: editingTemplate.image,
    description: editingTemplate.description,
    features: featuresArray,
    checkoutUrl: editingTemplate.checkoutUrl,
    category: editingTemplate.category || '',
    demoUrl: editingTemplate.demoUrl || '',
    dateAdded: editingTemplate.dateAdded || new Date().toISOString(),
    layersCount: editingTemplate.layersCount || '',
    dimensions: editingTemplate.dimensions || '',
    purpose: editingTemplate.purpose || '',
    estimatedTime: editingTemplate.estimatedTime || '',
    affinityFileUrl: editingTemplate.affinityFileUrl || '',
    pdfFileUrl: editingTemplate.pdfFileUrl || '',
    pngFileUrl: editingTemplate.pngFileUrl || ''
   };

   // Validate size before saving to Firestore
   const approximateSize = new Blob([JSON.stringify(payloadToSave)]).size;
   if (approximateSize > 900000) {
     setIsSaving(false);
     showToast(`Gagal: Total data terlalu besar (${(approximateSize / (1024 * 1024)).toFixed(2)} MB). Batas maksimum Firestore adalah 1MB.\nHarap kurangi ukuran gambar atau file PDF/SVG Anda.`, "error");
     return;
   }
   
   await setDoc(templateRef, payloadToSave);

   showToast("Template berhasil disimpan di Toko!");
   setEditingTemplate(null);
   setFeaturesInput('');
  } catch (err) {
   console.warn(err);
   showToast("Gagal menyimpan ke Firestore.", "error");
  } finally {
   setIsSaving(false);
  }
 };

 const handleDelete = async (id: string, imageUrl?: string) => {
  if (confirm("Apakah Anda yakin ingin menghapus template ini dari toko? Tindakan ini permanen di Cloud Database.")) {
   console.log(`[DELETE] Mulai menghapus template ID: ${id}`);
   try {
    console.log(`[DELETE] Request hapus document dari Firestore...`);
    await deleteDoc(doc(db, 'templates', id));
    console.log(`[DELETE] Firestore delete berhasil.`);
    
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      console.log(`[DELETE] Gambar template ini tersimpan di Cloudinary: ${imageUrl}`);
      console.log(`[DELETE] CATATAN: Karena alasan keamanan, penghapusan asset Cloudinary dari browser tidak direkomendasikan dan memerlukan endpoint server-side. Document terkait telah dihapus.`);
    }

    showToast("Template berhasil dihapus permanen.");
   } catch (err: any) {
    console.error("[DELETE] Gagal menghapus template:", err);
    showToast(`Gagal menghapus: ${err.message || 'Error Database'}`, "error");
   }
  }
 };

 const handleToggleDraft = async (tmpl: TemplateProduct) => {
  try {
   const newDraftStatus = !tmpl.draft;
   await updateDoc(doc(db, 'templates', tmpl.id.toString()), {
    draft: newDraftStatus
   });
   showToast(newDraftStatus ? "Template disembunyikan (Draft)." : "Template ditampilkan (Publik).");
  } catch (err) {
   console.warn(err);
   showToast("Gagal mengubah status draft.", "error");
  }
 };

 const createNew = () => {
  setEditingTemplate({
   id: Date.now().toString(),
   title: '',
   price: 0,
   image: '',
   description: '',
   features: [],
   checkoutUrl: 'https://wa.me/628112345678',
   category: '',
   demoUrl: '',
   dateAdded: new Date().toISOString()
  });
  setFeaturesInput('');
 };

 const startEdit = (template: TemplateProduct) => {
  setEditingTemplate(template);
  setFeaturesInput(template.features?.join(', ') || '');
 };

 // Super-fast Canvas image compressor (main thread, 0 worker overhead, never hangs in iframes)
 const compressImageToBlob = (file: File, maxWidth = 1600, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve) => {
   const reader = new FileReader();
   reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
     resolve({ blob: file, dataUrl });
     return;
    }
    const img = new Image();
    img.onload = () => {
     let { width, height } = img;
     if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
     }
     const canvas = document.createElement('canvas');
     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      canvas.toBlob(
       (blob) => {
        resolve({ blob: blob || file, dataUrl: compressedDataUrl });
       },
       'image/jpeg',
       quality
      );
     } else {
      resolve({ blob: file, dataUrl });
     }
    };
    img.onerror = () => resolve({ blob: file, dataUrl });
    img.src = dataUrl;
   };
   reader.onerror = () => resolve({ blob: file, dataUrl: '' });
   reader.readAsDataURL(file);
  });
 };

 // Generic fast FileReader to DataURL
 const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = () => resolve(reader.result as string);
   reader.onerror = (e) => reject(e);
   reader.readAsDataURL(file);
  });
 };

 // Google Drive upload with 6s timeout protection
 const uploadToDrive = async (file: File | Blob, fileName: string, token: string): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
   const resMedia = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
    method: 'POST',
    headers: {
     Authorization: 'Bearer ' + token,
     'Content-Type': file.type || 'application/octet-stream'
    },
    body: file,
    signal: controller.signal
   });

   if (!resMedia.ok) {
    console.warn("Drive media upload failed with status:", resMedia.status);
    return null;
   }

   const dataMedia = await resMedia.json();
   if (!dataMedia?.id) return null;

   await fetch('https://www.googleapis.com/drive/v3/files/' + dataMedia.id + '?fields=id,webViewLink,webContentLink', {
    method: 'PATCH',
    headers: {
     Authorization: 'Bearer ' + token,
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: fileName }),
    signal: controller.signal
   });

   await fetch('https://www.googleapis.com/drive/v3/files/' + dataMedia.id + '/permissions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    signal: controller.signal
   }).catch(e => console.warn("Drive permission error (ignored):", e));

   const res = await fetch('https://www.googleapis.com/drive/v3/files/' + dataMedia.id + '?fields=id,webViewLink,webContentLink', {
    headers: { Authorization: 'Bearer ' + token },
    signal: controller.signal
   });
   const fileData = await res.json();
   return fileData.webContentLink || fileData.webViewLink || ('https://drive.google.com/file/d/' + dataMedia.id + '/view');
  } catch (err) {
   console.warn("Drive upload timed out or failed:", err);
   return null;
  } finally {
   clearTimeout(timeoutId);
  }
 };

 // Cloudinary upload with auto and raw fallback
 const uploadToCloudinary = async (file: File | Blob, fileName: string): Promise<string | null> => {
  const cloudName = localStorage.getItem('cloudinary_cloud_name') || (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' ? (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '') : '');
  const uploadPreset = localStorage.getItem('cloudinary_upload_preset') || (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET !== 'your_unsigned_upload_preset' ? (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '') : '');

  if (!cloudName || !uploadPreset) {
   return null;
  }

  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('upload_preset', uploadPreset);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
   // 1. Try auto upload endpoint
   const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
    signal: controller.signal
   });

   if (res.ok) {
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
   }

   // 2. Try raw endpoint if auto didn't return secure_url
   const resRaw = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: formData,
    signal: controller.signal
   });

   if (resRaw.ok) {
    const rawData = await resRaw.json();
    if (rawData.secure_url) return rawData.secure_url;
   }

   return null;
  } catch (err) {
   console.warn("Cloudinary upload timed out or failed:", err);
   return null;
  } finally {
   clearTimeout(timeoutId);
  }
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  if (file.size > 10 * 1024 * 1024) {
   showToast("Ukuran gambar terlalu besar (Maksimal 10MB).", "error");
   return;
  }

  setUploading(true);

  try {
   const comp = await compressImageToBlob(file);
   const fileToUpload = comp.blob;
   const localDataUrl = comp.dataUrl;

   // 1. Try Google Drive if token available
   const accessToken = await getAccessToken();
   if (accessToken) {
    const driveUrl = await uploadToDrive(fileToUpload, file.name, accessToken);
    if (driveUrl) {
     if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, image: driveUrl });
     }
     showToast("Gambar berhasil diunggah ke Google Drive!");
     return;
    }
   }

   // 2. Try Cloudinary fallback
   const cloudinaryUrl = await uploadToCloudinary(fileToUpload, file.name);
   if (cloudinaryUrl) {
    if (editingTemplate) {
     setEditingTemplate({ ...editingTemplate, image: cloudinaryUrl });
    }
    showToast("Gambar berhasil diunggah ke Cloudinary!");
    return;
   }

   // 3. Fallback to instant compressed Base64 Data URL
   if (localDataUrl) {
    if (editingTemplate) {
     setEditingTemplate({ ...editingTemplate, image: localDataUrl });
    }
    showToast("Gambar berhasil diproses & disimpan!");
    return;
   }

   showToast("Gagal memproses gambar.", "error");
  } catch (err: any) {
   console.warn("handleImageUpload error:", err);
   showToast("Gagal memproses gambar.", "error");
  } finally {
   setUploading(false);
  }
 };

 const [uploadingField, setUploadingField] = useState<string | null>(null);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof TemplateProduct, isImage: boolean) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  if (fieldName === 'affinityFileUrl' && file.size > 35 * 1024 * 1024) {
   showToast("File Affinity terlalu besar (Maksimal 35MB).", "error");
   return;
  }
  if (fieldName === 'pdfFileUrl' && file.size > 15 * 1024 * 1024) {
   showToast("File PDF terlalu besar (Maksimal 15MB).", "error");
   return;
  }
  if (fieldName === 'pngFileUrl' && file.size > 10 * 1024 * 1024) {
   showToast("File PNG terlalu besar (Maksimal 10MB).", "error");
   return;
  }

  setUploadingField(fieldName);

  try {
   let fileToUpload: File | Blob = file;
   let localDataUrl = '';

   const isSvgOrAfsvg = file.name.toLowerCase().endsWith('.svg') || file.name.toLowerCase().endsWith('.afsvg');

   if (isImage || file.type.startsWith('image/')) {
    if (!isSvgOrAfsvg) {
     const comp = await compressImageToBlob(file);
     fileToUpload = comp.blob;
     localDataUrl = comp.dataUrl;
    } else {
     localDataUrl = await fileToDataUrl(file);
    }
   } else {
    if (file.size <= 850 * 1024) {
     localDataUrl = await fileToDataUrl(file);
    }
   }

   // 1. Try Google Drive first if token exists
   const accessToken = await getAccessToken();
   if (accessToken) {
    const driveUrl = await uploadToDrive(fileToUpload, file.name, accessToken);
    if (driveUrl) {
     if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, [fieldName]: driveUrl });
     }
     showToast("File berhasil disimpan ke Google Drive!");
     return;
    }
   }

   // 2. If Google Drive not connected or failed -> Try Cloudinary!
   const cloudinaryUrl = await uploadToCloudinary(fileToUpload, file.name);
   if (cloudinaryUrl) {
    if (editingTemplate) {
     setEditingTemplate({ ...editingTemplate, [fieldName]: cloudinaryUrl });
    }
    showToast("File berhasil disimpan ke Cloudinary!");
    return;
   }

   // 3. Fallback: Local Base64 / Data URL
   if (localDataUrl && localDataUrl.length < 900000) {
    if (editingTemplate) {
     setEditingTemplate({ ...editingTemplate, [fieldName]: localDataUrl });
    }
    const typeLabel = isImage ? "File PNG preview" : (isSvgOrAfsvg ? "File .afsvg / .svg" : "File");
    showToast(`${typeLabel} berhasil diproses & disimpan!`);
    return;
   }

   showToast("Google Drive & Cloudinary belum terhubung untuk file besar (>850KB). Silakan hubungkan Google Drive, atur Cloudinary, atau masukkan link URL langsung.", "error");
  } catch (err: any) {
   console.warn("handleFileUpload error:", err);
   showToast("Gagal memproses file. Anda dapat memasukkan tautan URL secara manual.", "error");
  } finally {
   setUploadingField(null);
  }
 };

 return (
  <div className="relative">
   {toast && (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-[10px] md:text-xs font-semibold flex items-center gap-2 shadow-xl transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-black text-white dark:bg-white dark:text-black'}`}>
     {toast.type === 'error' ? <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px]">!</div> : <Check size={16} />} {toast.msg}
    </div>
   )}

   {!editingTemplate && (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 md:mb-6">
     <h3 className="text-base md:text-lg font-semibold text-black dark:text-white">Kelola Produk Template</h3>
     <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <button onClick={async () => {
         try {
           await googleSignIn();
           showToast("Terhubung ke Google Drive! Sekarang file akan diunggah ke Drive Anda.");
         } catch(err) {
           showToast("Gagal terhubung ke Google Drive.", "error");
         }
      }} className="bg-blue-600 text-white px-5 py-2.5 text-[10px] md:text-xs font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors rounded-2xl active:scale-95 shadow-sm">
        <DownloadCloud size={16} /> Hubungkan Google Drive
      </button>
      <button type="button" onClick={() => setShowCloudinaryModal(true)} className="bg-zinc-800 text-white px-5 py-2.5 text-[10px] md:text-xs font-semibold flex items-center gap-2 hover:bg-zinc-700 transition-colors rounded-2xl active:scale-95 border border-zinc-700 shadow-sm">
        <Cloud size={16} /> Cloudinary
      </button>
      <button onClick={createNew} className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 text-[10px] md:text-xs font-semibold flex items-center gap-2 hover:opacity-80 transition-opacity rounded-2xl active:scale-95">
        <Plus size={16} /> Tambah Template Baru
      </button>
     </div>
    </div>
   )}

   {editingTemplate ? (
    <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSave} className="relative bg-zinc-50 dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 mb-6 rounded-2xl space-y-4 md:space-y-6 shadow-sm">
     
     {isSaving && (
      <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#050505]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl overflow-hidden">
       <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-black dark:bg-white w-1/3 rounded-full" style={{ animation: "progress 1.5s ease-in-out infinite" }}></div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h4 className="text-sm font-bold text-black dark:text-white">Menyimpan Template Baru</h4>
          <p className="text-[10px] text-zinc-500 font-medium">Sedang memproses file dan mengunggah ke menu order...</p>
        </div>
       </div>
      </div>
     )}

     <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
      <h3 className="text-lg font-semibold text-black dark:text-white">
       {editingTemplate.title ? 'Edit Template' : 'Template Baru'}
      </h3>
      <button type="button" onClick={() => setEditingTemplate(null)} className="text-black hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 p-2 rounded-2xl"><X size={20} /></button>
     </div>
     
     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <div className="space-y-6">
       <div>
        <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Nama Template</label>
        <input type="text" value={editingTemplate.title} onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl" placeholder="Misal: Minimalist UI Kit" />
       </div>
       
       <div>
        <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Harga (Rp)</label>
        <input type="number" value={editingTemplate.price} onChange={e => setEditingTemplate({...editingTemplate, price: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl" placeholder="Misal: 150000" />
       </div>

       
       
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Kategori</label>
         <select value={editingTemplate.category || ''} onChange={e => setEditingTemplate({...editingTemplate, category: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl appearance-none">
          <option value="">Pilih Kategori</option>
          <option value="Canva">Canva</option>
          <option value="Affinity">Affinity</option>
         </select>
        </div>
        {editingTemplate.category !== 'Affinity' && (
        <div>
         <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">URL Live Preview (Demo)</label>
         <input type="text" value={editingTemplate.demoUrl || ''} onChange={e => setEditingTemplate({...editingTemplate, demoUrl: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl" placeholder="Link Canva / Web" />
        </div>
       )}
       </div>

       {editingTemplate.category === 'Affinity' && (
        <div className="grid grid-cols-2 gap-4 mt-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
         <div className="col-span-2 mb-2">
          <h4 className="text-[10px] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest">Detail Spesifik Affinity</h4>
         </div>
         <div>
          <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-2 block uppercase tracking-wider">Jumlah Layer</label>
          <input type="text" value={editingTemplate.layersCount || ''} onChange={e => setEditingTemplate({...editingTemplate, layersCount: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-xl" placeholder="Contoh: 15 Layer" />
         </div>
         <div>
          <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-2 block uppercase tracking-wider">Ukuran / Resolusi</label>
          <input type="text" value={editingTemplate.dimensions || ''} onChange={e => setEditingTemplate({...editingTemplate, dimensions: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-xl" placeholder="Contoh: 1080x1080px" />
         </div>
         <div>
          <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-2 block uppercase tracking-wider">Tujuan Template</label>
          <input type="text" value={editingTemplate.purpose || ''} onChange={e => setEditingTemplate({...editingTemplate, purpose: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-xl" placeholder="Contoh: Instagram Post" />
         </div>
         <div>
          <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-2 block uppercase tracking-wider">Waktu Pengerjaan</label>
          <input type="text" value={editingTemplate.estimatedTime || ''} onChange={e => setEditingTemplate({...editingTemplate, estimatedTime: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-xl" placeholder="Contoh: 2-3 Hari" />
         </div>
         <div className="col-span-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/50">
          <h4 className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-3">File & Aset Template (Link Google Drive / Cloudinary / Upload)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           <div>
            <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-1 block">File .pdf (Preview)</label>
            <div className="flex gap-1.5 items-center">
             <input 
              type="text" 
              value={editingTemplate.pdfFileUrl || ""} 
              onChange={e => setEditingTemplate({...editingTemplate, pdfFileUrl: e.target.value})} 
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-1.5 px-2.5 text-[10px] focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white" 
              placeholder="Link PDF / file..." 
             />
             <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[9px] font-medium px-2.5 py-1.5 rounded-xl shadow-sm text-black dark:text-white transition-colors shrink-0 flex items-center gap-1">
              {uploadingField === "pdfFileUrl" ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              <span>{uploadingField === "pdfFileUrl" ? "..." : "Upload"}</span>
              <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={uploadingField !== null} onChange={(e) => handleFileUpload(e, "pdfFileUrl", false)} />
             </label>
            </div>
           </div>
           <div>
            <label className="text-[10px] font-medium text-black dark:text-zinc-400 mb-1 block">File .png (Preview)</label>
            <div className="flex gap-1.5 items-center">
             <input 
              type="text" 
              value={editingTemplate.pngFileUrl || ""} 
              onChange={e => setEditingTemplate({...editingTemplate, pngFileUrl: e.target.value})} 
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-1.5 px-2.5 text-[10px] focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white" 
              placeholder="Link PNG / file..." 
             />
             <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-[9px] font-medium px-2.5 py-1.5 rounded-xl shadow-sm text-black dark:text-white transition-colors shrink-0 flex items-center gap-1">
              {uploadingField === "pngFileUrl" ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              <span>{uploadingField === "pngFileUrl" ? "..." : "Upload"}</span>
              <input type="file" accept=".png,image/png,image/*" className="hidden" disabled={uploadingField !== null} onChange={(e) => handleFileUpload(e, "pngFileUrl", true)} />
             </label>
            </div>
           </div>
          </div>
         </div>
        </div>
       )}


       <div>
        <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Tautan Pembelian (Checkout URL)</label>
        <input type="text" value={editingTemplate.checkoutUrl} onChange={e => setEditingTemplate({...editingTemplate, checkoutUrl: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl" placeholder="Tautan Gumroad, Stripe, atau WhatsApp" />
       </div>
       
       <div>
        <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Fitur / Highlight (Pisahkan dengan koma)</label>
        <div className="relative">
         <Tag size={16} className="absolute left-4 top-3.5 text-black" />
         <input type="text" value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 pl-10 pr-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl" placeholder="Figma, Auto Layout, 50+ Screens" />
        </div>
       </div>
      </div>

      <div className="h-full flex flex-col">
       <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">
        Gambar Preview Template (Rekomendasi: 16:9)
       </label>
       <div className="relative flex-1 min-h-[250px] bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800/50 hover:border-black dark:hover:border-white transition-colors rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
        <input 
         type="file" 
         accept="image/png, image/jpeg, image/webp" 
         onChange={handleImageUpload} 
         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
         disabled={uploading}
        />
        
        {uploading ? (
         <div className="flex flex-col items-center text-black dark:text-zinc-400">
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-[10px] md:text-xs font-semibold">Mengunggah...</span>
         </div>
        ) : editingTemplate.image ? (
         <>
          <img 
           src={editingTemplate.image} 
           alt="Preview" 
           className="w-full h-full object-cover absolute inset-0" 
          />
          <div className="absolute inset-0 bg-black/60 dark:bg-[#050505]/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-0">
           <Upload size={24} className="text-white mb-2" />
           <span className="text-white text-[10px] md:text-xs font-semibold">Ganti Gambar</span>
          </div>
         </>
        ) : (
         <div className="flex flex-col items-center text-black group-hover:text-black dark:group-hover:text-white transition-colors text-center px-4">
          <Upload size={28} className="mb-3" />
          <span className="text-[10px] md:text-xs font-semibold mb-1">Pilih Gambar</span>
          <span className="text-[10px] opacity-60">Maks 500kb. Mendukung JPG, PNG, WEBP.</span>
         </div>
        )}
       </div>
       <div className="mt-3">
        <label className="text-[10px] font-medium text-zinc-500 block mb-1">Atau masukkan Link / URL Gambar Langsung:</label>
        <input 
         type="url" 
         placeholder="https://images.unsplash.com/..." 
         value={editingTemplate.image && !editingTemplate.image.startsWith('data:') ? editingTemplate.image : ''} 
         onChange={e => setEditingTemplate({...editingTemplate, image: e.target.value})} 
         className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-xl placeholder-zinc-400"
        />
       </div>
      </div>
     </div>

     <div>
      <label className="text-[10px] md:text-xs font-medium text-black dark:text-zinc-400 mb-2 block">Deskripsi Detail</label>
      <textarea placeholder="Jelaskan secara detail mengenai template ini..." rows={6} value={editingTemplate.description} onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-4 px-4 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white rounded-2xl resize-y"></textarea>
     </div>

     <div className="flex justify-end pt-4">
      <button type="submit" disabled={uploading} className="bg-black text-white dark:bg-white dark:text-black px-8 py-4 text-[10px] md:text-xs font-semibold hover:opacity-80 transition-opacity rounded-2xl active:scale-95 flex items-center gap-2 disabled:opacity-50">
       <Check size={16} /> Simpan Produk
      </button>
     </div>
    </motion.form>
   ) : (
    <div className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-sm">
     <table className="w-full min-w-[300px] md:min-w-[700px] text-left text-[10px] md:text-xs text-black dark:text-white">
      <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
       <tr>
        <th className="p-2 md:p-5 font-semibold">Produk</th>
        <th className="p-2 md:p-5 font-semibold">Harga</th>
        <th className="p-2 md:p-5 font-semibold">Tautan Checkout</th>
        <th className="p-2 md:p-5 font-semibold text-right">Aksi</th>
       </tr>
      </thead>
      <tbody>
       {templates.map(tmpl => (
        <tr key={tmpl.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-[#111111]/50 transition-colors group">
         <td className="p-2 md:p-5 flex items-center gap-4">
          <div className="w-16 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
           <img src={tmpl.image} alt={tmpl.title} className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold whitespace-normal md:truncate min-w-[120px] md:max-w-[200px]">{tmpl.title}</span>
         </td>
         <td className="p-2 md:p-5 text-black dark:text-zinc-400 font-medium">Rp {tmpl.price.toLocaleString('id-ID')}</td>
         <td className="p-2 md:p-5 text-black dark:text-zinc-400 truncate max-w-[150px]">
          {tmpl.checkoutUrl ? <a href={tmpl.checkoutUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link</a> : 'Belum Ada'}
         </td>
         <td className="p-2 md:p-5">
          <div className="flex justify-end gap-1 md:gap-2 items-center">
           <button onClick={() => startEdit(tmpl)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-[#0A0A0A] rounded-2xl transition-all">
            <Edit size={14} />
           </button>
           <button onClick={() => handleToggleDraft(tmpl)} className={`w-8 h-8 flex items-center justify-center rounded-2xl transition-all ${tmpl.draft ? 'bg-zinc-800 text-white dark:bg-zinc-700' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-400 hover:bg-black hover:text-white dark:hover:bg-sky-400 dark:hover:text-[#0A0A0A]'}`} title={tmpl.draft ? "Publikasikan" : "Jadikan Draft"}>
            {tmpl.draft ? <EyeOff size={14} /> : <Eye size={14} />}
           </button>
           <button onClick={() => handleDelete(tmpl.id.toString(), tmpl.image)} className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-2xl transition-all">
            <Trash size={14} />
           </button>
          </div>
         </td>
        </tr>
       ))}
       {templates.length === 0 && (
        <tr><td colSpan={4} className="p-12 text-center text-black dark:text-zinc-400 font-medium">Belum ada template yang dijual.</td></tr>
       )}
      </tbody>
     </table>
    </div>
   )}

   {/* Modal Konfigurasi Cloudinary */}
   <AnimatePresence>
    {showCloudinaryModal && (
     <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="w-full max-w-md bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl">
       <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
         <Cloud size={18} className="text-sky-500" /> Konfigurasi Cloudinary
        </h3>
        <button onClick={() => setShowCloudinaryModal(false)} className="text-zinc-500 hover:text-black dark:hover:text-white p-1 rounded-xl">
         <X size={18} />
        </button>
       </div>
       <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
        Jika Google Drive tidak terhubung atau gagal, file template (.afsvg, .png, .pdf, cover) akan otomatis disimpan ke Cloudinary Anda.
       </p>
       <div className="space-y-4 mb-6">
        <div>
         <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 block uppercase tracking-wider">Cloud Name</label>
         <input
          type="text"
          value={cloudinaryCloudName}
          onChange={(e) => setCloudinaryCloudName(e.target.value.trim())}
          placeholder="Contoh: dxy12345"
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
         />
        </div>
        <div>
         <label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 block uppercase tracking-wider">Unsigned Upload Preset</label>
         <input
          type="text"
          value={cloudinaryPreset}
          onChange={(e) => setCloudinaryPreset(e.target.value.trim())}
          placeholder="Contoh: portfolio_unsigned atau ml_default"
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-[10px] md:text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
         />
        </div>
       </div>
       <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setShowCloudinaryModal(false)} className="px-4 py-2 text-[10px] md:text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
         Batal
        </button>
        <button
         type="button"
         onClick={() => {
          localStorage.setItem('cloudinary_cloud_name', cloudinaryCloudName);
          localStorage.setItem('cloudinary_upload_preset', cloudinaryPreset);
          setShowCloudinaryModal(false);
          showToast("Pengaturan Cloudinary berhasil disimpan!");
         }}
         className="px-5 py-2 text-[10px] md:text-xs font-semibold bg-black text-white dark:bg-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"
        >
         Simpan Konfigurasi
        </button>
       </div>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </div>
 );
}
