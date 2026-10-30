import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, Phone, Instagram, LayoutTemplate, PenTool, Layers, Maximize, Hash, Calendar, DollarSign, ArrowRight, ArrowLeft, Send, CheckCircle2, FileText, UploadCloud, Info, Wallet, FileEdit, X, ChevronDown, CreditCard, ShieldCheck, Sparkles, ExternalLink, Tag, ShoppingBag, Download } from 'lucide-react';
import { FastInput, FastTextarea } from './FastInput';
import { ServiceSelectModal, servicesList } from './ServiceSelectModal';
import { getStoredSettings } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { defaultPromoPosters, PromoPosterItem } from '../data/settings';
import { PAYMENT_METHODS, BriLogo, BrimoLogo, DanaLogo, GopayLogo, OvoLogo, ShopeePayLogo, LinkAjaLogo } from './PaymentLogos';
import { getCookie, setCookie, deleteCookie } from '../lib/cookies';

interface StoreProps {
  isOrderView?: boolean;
}

export default function Store({ isOrderView = false }: StoreProps) {
  const getCleanPhone = (phoneStr?: string) => {
    let phone = (phoneStr || '628112345678').replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    return phone || '628112345678';
  };

  const deduplicatePosters = (list: PromoPosterItem[]): PromoPosterItem[] => {
    const seen = new Set<string>();
    return (list || []).map((p, idx) => {
      let id = (p.id || `poster-${idx + 1}`).toString().trim();
      if (seen.has(id)) {
        id = `${id}-${idx + 1}`;
      }
      seen.add(id);
      return { ...p, id };
    });
  };

  const [promoPosters, setPromoPosters] = useState<PromoPosterItem[]>(() => {
    const s = getStoredSettings();
    const raw = s.promoPosters && s.promoPosters.length > 0 ? s.promoPosters : [];
    return deduplicatePosters(raw);
  });

  // Sinkronisasi realtime jika poster diubah dari admin dashboard atau database Firestore
  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail?.promoPosters) {
        setPromoPosters(deduplicatePosters(e.detail.promoPosters));
      }
      if (e.detail?.contactPhone) {
        setWhatsappNumber(getCleanPhone(e.detail.contactPhone));
      }
    };
    window.addEventListener('app_settings_updated', handleSettingsUpdate);

    // 1. Dengarkan doc settings/promoPosters khusus
    const unsubPromo = onSnapshot(doc(db, 'settings', 'promoPosters'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.posters && Array.isArray(data.posters) && data.posters.length > 0) {
          setPromoPosters(deduplicatePosters(data.posters));
        }
      }
    }, (err) => {
      console.warn("Store promo realtime sync notice:", err);
    });

    // 2. Dengarkan doc settings/global
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.promoPosters && Array.isArray(data.promoPosters) && data.promoPosters.length > 0) {
          setPromoPosters(deduplicatePosters(data.promoPosters));
        }
        if (data.contactPhone) {
          setWhatsappNumber(getCleanPhone(data.contactPhone));
        }
      }
    }, (err) => {
      console.warn("Store realtime sync notice:", err);
    });

    return () => {
      window.removeEventListener('app_settings_updated', handleSettingsUpdate);
      unsubPromo();
      unsub();
    };
  }, []);

  const [step, setStep] = useState(1);
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    return getCleanPhone(getStoredSettings().contactPhone);
  });
  const [isUploading, setIsUploading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Responsive Layout detection
  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Reset step if layout changes
  useEffect(() => {
    setStep(1);
  }, [isDesktop]);

  // Form State
    const getInitialFormData = () => {
    try {
      const fromCookie = getCookie('order_draft');
      if (fromCookie) return JSON.parse(fromCookie);
      const saved = localStorage.getItem('order_draft');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      nama: '', whatsapp: '', sosmed: '', jenisLayanan: '', layananLainnya: '', tujuan: '', gaya: '', format: '', jumlah: '', deadline: '', budget: '', materi: '', referensiUrl: '', catatan: '',
    };
  };
  const [formData, setFormData] = useState(getInitialFormData);
  const [isDraftLoaded, setIsDraftLoaded] = useState(() => !!getCookie('order_draft') || !!localStorage.getItem('order_draft'));
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showNavPopup, setShowNavPopup] = useState(false);
  const [pendingNavView, setPendingNavView] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    const handleNavRequest = (e: any) => {
      if (formData.jenisLayanan) {
        e.preventDefault();
        setPendingNavView(e.detail.view);
        setShowNavPopup(true);
      }
    };
    window.addEventListener('requestChangeView', handleNavRequest);
    return () => window.removeEventListener('requestChangeView', handleNavRequest);
  }, [formData.jenisLayanan, formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.jenisLayanan) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData.jenisLayanan]);

  useEffect(() => {
    if (showCancelPopup || showNavPopup || showPaymentModal || showServiceModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCancelPopup, showNavPopup, showPaymentModal, showServiceModal]);

  const clearForm = () => {
    setFormData({ nama: '', whatsapp: '', sosmed: '', jenisLayanan: '', layananLainnya: '', tujuan: '', gaya: '', format: '', jumlah: '', deadline: '', budget: '', materi: '', referensiUrl: '', catatan: '' });
    setStep(1);
    setIsDraftLoaded(false);
    localStorage.removeItem('order_draft');
    deleteCookie('order_draft');
  };

  const confirmCancelOrder = () => {
    clearForm();
    setShowCancelPopup(false);
  };

  const navDiscard = () => {
    clearForm();
    setShowNavPopup(false);
    if (pendingNavView) {
      window.dispatchEvent(new CustomEvent('forceChangeView', { detail: { view: pendingNavView } }));
    }
  };

  const navDraft = () => {
    const draftJson = JSON.stringify(formData);
    localStorage.setItem('order_draft', draftJson);
    setCookie('order_draft', draftJson, { days: 30 });
    setIsDraftLoaded(true);
    setShowNavPopup(false);
    if (pendingNavView) {
      window.dispatchEvent(new CustomEvent('forceChangeView', { detail: { view: pendingNavView } }));
    }
  };

  const navStay = () => {
    setShowNavPopup(false);
    setPendingNavView(null);
  };


  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail && e.detail.contactPhone) {
        setWhatsappNumber(getCleanPhone(e.detail.contactPhone));
      }
    };
    window.addEventListener('app_settings_updated', handleSettingsUpdate);

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().contactPhone) {
          setWhatsappNumber(getCleanPhone(docSnap.data().contactPhone));
        }
      } catch (e) {
        console.warn(e);
      }
    };
    fetchSettings();
    return () => window.removeEventListener('app_settings_updated', handleSettingsUpdate);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name') {
        showToast("Penyimpanan cloud belum terkonfigurasi. Anda dapat mengirim gambar referensi via WhatsApp.");
        setIsUploading(false);
        return;
      }

      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, referensiUrl: data.secure_url }));
      }
    } catch (error) {
      console.warn("Upload error:", error);
      showToast("Gagal mengunggah file. Anda dapat mengirimnya langsung via WhatsApp.");
    } finally {
      setIsUploading(false);
    }
  };

  const totalSteps = isDesktop ? 3 : 5;
  const mobileStepTitles = [
    'Kontak Klien',
    'Detail Produk',
    'Jadwal & Biaya',
    'Materi & Lampiran',
    'Konfirmasi Akhir'
  ];
  const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const getMinDate = (daysToAdd: number) => {
    const today = new Date();
    today.setDate(today.getDate() + daysToAdd);
    return today.toISOString().split('T')[0];
  };

  const getPriceBreakdown = () => {
    let total = 0;
    const breakdown = [];
    
    // 1. Jenis Layanan
    const layanan = formData.jenisLayanan?.toLowerCase() || '';
    if (layanan === 'poster') {
      const jumlahPoster = Math.max(1, parseInt(formData.jumlah) || 1);
      let posterPrice = 20000;
      if (jumlahPoster <= 5) {
        posterPrice = jumlahPoster * 20000;
      } else {
        posterPrice = (5 * 20000) + ((jumlahPoster - 5) * 10000);
      }
      total += posterPrice;
      const label = jumlahPoster > 1 
        ? `Layanan (Poster - ${jumlahPoster} Desain${jumlahPoster > 5 ? ' [Hemat >5 pcs]' : ''})` 
        : 'Layanan (Poster)';
      breakdown.push({ label, price: posterPrice });
    }
    else if (layanan === 'feed & story instagram') { total += 20000; breakdown.push({ label: 'Layanan (Feed & Story)', price: 20000 }); }
    else if (layanan === 'sertifikat') { total += 35000; breakdown.push({ label: 'Layanan (Sertifikat)', price: 35000 }); }
    else if (layanan === 'undangan') { total += 15000; breakdown.push({ label: 'Layanan (Undangan)', price: 15000 }); }
    else if (layanan === 'banner') { total += 30000; breakdown.push({ label: 'Layanan (Banner)', price: 30000 }); }
    else if (layanan === 'powerpoint') { total += 5000; breakdown.push({ label: 'Layanan (PowerPoint)', price: 5000 }); }
    else if (layanan !== '') { total += 5000; breakdown.push({ label: `Layanan (${formData.jenisLayanan === 'Lainnya' ? formData.layananLainnya : formData.jenisLayanan})`, price: 5000 }); }

    // 2. Tujuan Desain
    const tujuanLen = (formData.tujuan || '').length;
    if (tujuanLen > 0) {
      if (tujuanLen < 100) { total += 5000; breakdown.push({ label: 'Tujuan (Singkat)', price: 5000 }); }
      else { total += 10000; breakdown.push({ label: 'Tujuan (Detail)', price: 10000 }); }
    }

    // 3. Gaya Desain
    const gayaStr = formData.gaya || '';
    const gayaCount = gayaStr ? gayaStr.split(',').filter((s: string) => s.trim().length > 0).length : 0;
    if (gayaCount > 0) {
      total += gayaCount * 2000;
      breakdown.push({ label: `Gaya Desain (${gayaCount})`, price: gayaCount * 2000 });
    }

    // 4. Jumlah
    const jumlahVal = parseInt(formData.jumlah) || 0; 
    if (layanan === 'feed & story instagram' && jumlahVal > 0) {
      total += jumlahVal * 3000;
      breakdown.push({ label: `Jumlah (${jumlahVal})`, price: jumlahVal * 3000 });
    } else if (layanan === 'powerpoint' && jumlahVal > 0) {
      total += jumlahVal * 5000;
      breakdown.push({ label: `Jumlah Slide (${jumlahVal})`, price: jumlahVal * 5000 });
    }

    // 5. Deadline
    if (formData.deadline) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const deadlineDate = new Date(formData.deadline);
      deadlineDate.setHours(0,0,0,0);
      
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays <= 1) { total += 30000; breakdown.push({ label: 'Deadline (1 Hari)', price: 30000 }); }
      else if (diffDays === 2) { total += 20000; breakdown.push({ label: 'Deadline (2 Hari)', price: 20000 }); }
      else if (diffDays === 3) { total += 10000; breakdown.push({ label: 'Deadline (3 Hari)', price: 10000 }); }
      else if (diffDays === 4) { total += 5000; breakdown.push({ label: 'Deadline (4 Hari)', price: 5000 }); }
    }

    return { total, breakdown };
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const layanan = formData.jenisLayanan === 'Lainnya' ? formData.layananLainnya : formData.jenisLayanan;
    
    const { total, breakdown } = getPriceBreakdown();
    const breakdownText = breakdown.map(b => `  - ${b.label}: ${formatIDR(b.price)}`).join('\n');

    // Simpan data order ke Firestore & LocalStorage
    try {
      const orderRecord = {
        nama: formData.nama,
        whatsapp: formData.whatsapp,
        sosmed: formData.sosmed || '',
        layanan,
        tujuan: formData.tujuan || '',
        gaya: formData.gaya || '',
        format: formData.format || '',
        jumlah: formData.jumlah || '',
        deadline: formData.deadline || '',
        budget: formData.budget || '',
        totalEstimasi: total,
        createdAt: new Date().toISOString()
      };
      const existing = JSON.parse(localStorage.getItem('orders') || '[]');
      existing.push(orderRecord);
      localStorage.setItem('orders', JSON.stringify(existing));
    } catch (e) {}

    try {
      await addDoc(collection(db, 'orders'), {
        nama: formData.nama,
        whatsapp: formData.whatsapp,
        sosmed: formData.sosmed || '',
        layanan,
        tujuan: formData.tujuan || '',
        gaya: formData.gaya || '',
        format: formData.format || '',
        jumlah: formData.jumlah || '',
        deadline: formData.deadline || '',
        budget: formData.budget || '',
        totalEstimasi: total,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn("Gagal mencatat order:", error);
    }
    
    const message = `Halo, saya ingin melakukan pemesanan custom desain dengan detail berikut:

*Data Diri:*
- Nama: ${formData.nama}
- WhatsApp: ${formData.whatsapp}
${formData.sosmed ? `- Media Sosial: ${formData.sosmed}` : ''}

*Detail Produk:*
- Jenis Layanan: ${layanan}
${formData.tujuan ? `- Tujuan Desain: ${formData.tujuan}` : ''}
${formData.gaya ? `- Gaya Desain: ${formData.gaya}` : ''}
${formData.format ? `- Format Ukuran: ${formData.format}` : ''}
${formData.jumlah ? `- Jumlah Desain: ${formData.jumlah}` : ''}

*Ketentuan Waktu & Harga:*
- Deadline: ${formData.deadline}
${formData.budget ? `- Budget/Kisaran Harga: ${formData.budget}` : ''}

*Estimasi Harga Sistem:*
${breakdownText}
*Total Estimasi:* ${formatIDR(total)}
*(Harga akhir akan dikonfirmasi setelah diskusi lebih lanjut)*

*Materi & Referensi:*
${formData.materi ? `- Materi: ${formData.materi}` : '- Materi: Akan dikirim via WhatsApp'}
${formData.referensiUrl ? `- Referensi Gambar: ${formData.referensiUrl}` : '- Referensi: Akan dikirim via WhatsApp'}

*Catatan Tambahan:*
${formData.catatan ? formData.catatan : '-'}

Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    try {
      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        window.location.href = waUrl;
      }
    } catch {
      window.location.href = waUrl;
    }
  };

  // Validations
  const isValidDataDiri = formData.nama.trim() !== '' && formData.whatsapp.trim() !== '';
  const isValidDetailProduk = formData.jenisLayanan !== '' && (formData.jenisLayanan !== 'Lainnya' || formData.layananLainnya.trim() !== '');
  const isValidDeadline = formData.deadline !== '';

  const isDesktopStep1Valid = isValidDataDiri && isValidDetailProduk;
  const isDesktopStep3Valid = isValidDeadline;

  // Render Helpers
  const selectedServiceObj = servicesList.find(s => s.name === formData.jenisLayanan);
  const SelectedServiceIcon = selectedServiceObj ? selectedServiceObj.icon : LayoutTemplate;

  const inputClassMobile = "w-full pl-8 pr-2.5 py-2 bg-white/90 dark:bg-[#121212]/90 border border-zinc-200/90 dark:border-zinc-800 rounded-xl focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 outline-none transition-all text-zinc-950 dark:text-zinc-50 text-xs font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-500 shadow-2xs";
  const inputClassDesktop = "w-full pl-11 lg:pl-12 pr-4 py-3.5 bg-white/70 dark:bg-black/40 backdrop-blur-xs hover:bg-white/90 dark:hover:bg-black/60 focus:bg-white dark:focus:bg-black/80 border border-zinc-200/80 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all dark:text-white text-sm font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

  return (
    <section id="store" className={`pt-5 md:pt-8 ${isOrderView ? 'pb-16 min-h-screen' : 'pb-2 md:pb-3 min-h-0'} bg-white dark:bg-[#0A0A0A] relative scroll-mt-24 md:scroll-mt-32`}>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black shadow-2xl backdrop-blur-md text-xs font-semibold max-w-[90vw] text-center pointer-events-none"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full mx-auto px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2 md:mb-4 w-full relative">
            <div className="inline-flex items-center justify-center px-2.5 md:px-4 py-1 md:py-1.5 rounded-full bg-zinc-100 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 text-[9px] md:text-xs font-bold text-zinc-500 tracking-wider uppercase">
              Pemesanan Desain
            </div>
            {isDraftLoaded && (
              <div className="inline-flex items-center justify-center px-2.5 md:px-4 py-1 md:py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[9px] md:text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                DRAFT
              </div>
            )}
            
          </div>
          <h2 className="text-xl md:text-5xl font-black text-black dark:text-white tracking-tight mb-1 md:mb-3">
            Pesan Desain Khusus
          </h2>
          <p className="text-[11px] md:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Ceritakan konsep atau kebutuhan desainmu di sini, nanti kita diskusikan bersama sampai cocok.
          </p>
        </motion.div>


        {/* Stepper Indicator */}
        <div className="flex flex-col items-center justify-center mb-4 md:mb-8">
          <div className="flex items-center justify-center overflow-x-auto pb-1.5 hide-scrollbar">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const s = index + 1;
              return (
                <div key={s} className="flex items-center shrink-0">
                  <div className={`flex items-center justify-center w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full font-bold transition-all duration-300 shadow-2xs ${step >= s ? 'bg-black text-white dark:bg-white dark:text-black scale-105' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'} text-[10px] md:text-sm`}>
                    {step > s ? <CheckCircle2 className="w-3.5 h-3.5 md:w-5 md:h-5" /> : s}
                  </div>
                  {index < totalSteps - 1 && (
                    <div className={`w-5 sm:w-8 md:w-16 h-[2px] md:h-1 mx-1 md:mx-2 rounded-full transition-colors duration-300 ${step > s ? 'bg-black dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Mobile Current Step Tag */}
          {!isDesktop && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <span>Langkah {step} dari 5: {mobileStepTitles[step - 1]}</span>
            </div>
          )}
        </div>

        {/* Form Container */}
        <div className={`frosted-glass-container border ${isDraftLoaded ? 'border-blue-400 dark:border-blue-600 shadow-blue-500/10' : 'border-zinc-200/60 dark:border-zinc-800/60 shadow-black/5'} rounded-2xl md:rounded-[2.5rem] p-3 sm:p-6 md:p-8 lg:p-10 shadow-xl w-full transition-colors`}>
          <form onSubmit={handleSubmit}>
            
            {/* DESKTOP RENDER (3 Steps) */}
            {isDesktop ? (
              <AnimatePresence mode="wait">
                
                {/* DESKTOP STEP 1: Data Diri & Detail Produk */}
                {step === 1 && (
                  <motion.div key="d-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4 mb-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Langkah 1 dari 3</span>
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-black dark:text-white tracking-tight">Data Diri & Detail Produk</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>2 Kolom Informasi Utama</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                      
                      {/* Kolom 1: Informasi Klien (Data Diri) */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Informasi Klien</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Detail kontak & identitas Anda</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 1
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Nama Lengkap</span>
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/40 dark:border-rose-900/40">Wajib</span>
                              </label>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <FastInput required type="text" name="nama" value={formData.nama} onChange={handleChange} className={inputClassDesktop} placeholder="Masukkan nama Anda" />
                              </div>
                            </div>

                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Nomor WhatsApp</span>
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/40 dark:border-rose-900/40">Wajib</span>
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <FastInput required type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className={inputClassDesktop} placeholder="Contoh: 08123456789" />
                              </div>
                            </div>

                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Media Sosial / Brand</span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">Opsional</span>
                              </label>
                              <div className="relative">
                                <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <FastInput type="text" name="sosmed" value={formData.sosmed} onChange={handleChange} className={inputClassDesktop} placeholder="@username atau Nama Brand" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Data kontak Anda hanya digunakan untuk konfirmasi proyek.</span>
                        </div>
                      </div>

                      {/* Kolom 2: Spesifikasi Pesanan (Detail Produk) */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <LayoutTemplate className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Spesifikasi Pesanan</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pilih detail desain yang ingin dibuat</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 2
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Jenis Layanan</span>
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/40 dark:border-rose-900/40">Wajib</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowServiceModal(true)}
                                className={`${inputClassDesktop} text-left flex items-center justify-between cursor-pointer group hover:border-black dark:hover:border-white transition-all`}
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <SelectedServiceIcon className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                                  <span className={`truncate ${formData.jenisLayanan ? "text-black dark:text-white font-semibold" : "text-zinc-400"}`}>
                                    {formData.jenisLayanan || "Pilih Jenis Layanan Desain..."}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0">
                                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px]">{formData.jenisLayanan ? "Ganti" : "Pilih"}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-y-0.5 transition-transform" />
                                </div>
                              </button>
                            </div>

                            {formData.jenisLayanan === 'Lainnya' && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                  <span>Tuliskan Layanan Lainnya</span>
                                  <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">Wajib</span>
                                </label>
                                <FastInput required type="text" name="layananLainnya" value={formData.layananLainnya} onChange={handleChange} className={inputClassDesktop} placeholder="Sebutkan jenis layanan..." />
                              </motion.div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div>
                                <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                  <span>Tujuan Desain</span>
                                  <span className="text-[10px] font-normal text-zinc-400">Opsional</span>
                                </label>
                                <div className="relative">
                                  <PenTool className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                  <FastInput type="text" name="tujuan" value={formData.tujuan} onChange={handleChange} className={inputClassDesktop} placeholder="Contoh: Promosi Produk" />
                                </div>
                              </div>
                              <div>
                                <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                  <span>Gaya Desain</span>
                                  <span className="text-[10px] font-normal text-zinc-400">Opsional</span>
                                </label>
                                <div className="relative">
                                  <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                  <FastInput type="text" name="gaya" value={formData.gaya} onChange={handleChange} className={inputClassDesktop} placeholder="Contoh: Elegan & Bersih" />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                              <div>
                                <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                  <span>Format Ukuran</span>
                                  <span className="text-[10px] font-normal text-zinc-400">Opsional</span>
                                </label>
                                <div className="relative">
                                  <Maximize className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                  <FastInput type="text" name="format" value={formData.format} onChange={handleChange} className={inputClassDesktop} placeholder="1080x1080px / A4" />
                                </div>
                              </div>
                              <div>
                                <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                  <span>Jumlah</span>
                                  <span className="text-[10px] font-normal text-zinc-400">Default: 1</span>
                                </label>
                                <div className="relative">
                                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                  <FastInput type="number" min="1" name="jumlah" value={formData.jumlah} onChange={handleChange} className={inputClassDesktop} placeholder="Misal: 1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Format & varian dapat disesuaikan kembali saat konsultasi.</span>
                        </div>
                      </div>

                    </div>
                    <div className="pt-6 flex justify-end gap-3">
                      {formData.jenisLayanan && (
                        <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-full sm:w-auto sm:min-w-[160px]">
                          Batal Order
                        </button>
                      )}
                      <button type="button" disabled={!isDesktopStep1Valid} onClick={nextStep} className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto sm:min-w-[160px]">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* DESKTOP STEP 2: Materi & Referensi */}
                {step === 2 && (
                  <motion.div key="d-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4 mb-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Langkah 2 dari 3</span>
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-black dark:text-white tracking-tight">Materi & Referensi Desain</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>Brief & Lampiran</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                      
                      {/* Kolom 1: Materi Klien */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Materi Klien</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Teks materi atau link Google Drive</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 1
                            </span>
                          </div>

                          <div className="flex flex-col flex-grow">
                            <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                              <span>Briefing / Teks Konten</span>
                              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">Opsional</span>
                            </label>
                            <div className="relative flex-grow min-h-[180px]">
                              <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
                              <FastTextarea 
                                name="materi" 
                                value={formData.materi} 
                                onChange={handleChange} 
                                className="w-full h-full pl-10 pr-4 py-3 bg-white/70 dark:bg-black/40 backdrop-blur-xs hover:bg-white/90 dark:hover:bg-black/60 focus:bg-white dark:focus:bg-black/80 border border-zinc-200 dark:border-zinc-800/90 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all dark:text-white resize-y text-sm min-h-[170px] placeholder:text-zinc-400 dark:placeholder:text-zinc-500" 
                                placeholder="Tuliskan materi teks, tagline, instruksi khusus, atau tempelkan link Google Drive Anda di sini..." 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Materi juga dapat dikirimkan secara fleksibel via WhatsApp saat konsultasi.</span>
                        </div>
                      </div>
                      
                      {/* Kolom 2: Upload Gambar Referensi */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Gambar Referensi</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Contoh gaya visual yang Anda sukai</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 2
                            </span>
                          </div>

                          <div className="flex flex-col flex-grow">
                            <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                              <span>Upload Lampiran Gambar</span>
                              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">Opsional</span>
                            </label>
                            
                            <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-black dark:hover:border-white rounded-2xl p-6 text-center bg-zinc-50/50 dark:bg-[#0c0c0c]/50 hover:bg-zinc-50 dark:hover:bg-[#111111] transition-all flex-grow flex items-center justify-center min-h-[170px] group cursor-pointer">
                              <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Upload Referensi" />
                              {isUploading ? (
                                <div className="flex flex-col items-center justify-center text-zinc-500">
                                  <UploadCloud className="w-8 h-8 animate-bounce mb-2 text-black dark:text-white" />
                                  <span className="text-sm font-semibold text-black dark:text-white">Mengunggah file...</span>
                                </div>
                              ) : formData.referensiUrl ? (
                                <div className="flex flex-col items-center justify-center relative z-0">
                                  <div className="relative mb-2">
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500 bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                                      <img src={formData.referensiUrl} alt="Referensi" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1 shadow-md border border-white dark:border-zinc-900">
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">File Berhasil Terpasang!</span>
                                  <span className="text-[11px] text-zinc-400 mt-0.5">Klik area untuk mengganti file</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-zinc-500">
                                  <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                                    <UploadCloud className="w-5 h-5 text-black dark:text-white" />
                                  </div>
                                  <span className="text-sm font-bold text-black dark:text-white">Pilih atau Seret Gambar ke Sini</span>
                                  <span className="text-xs text-zinc-400 mt-1">Mendukung PNG, JPG, JPEG (Maks. 5MB)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Contoh gambar referensi mempermudah keselarasan hasil visual.</span>
                        </div>
                      </div>

                    </div>
                    <div className="pt-6 flex justify-between gap-3">
                      <button type="button" onClick={prevStep} className="flex items-center justify-center gap-2 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <div className="flex gap-3">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-full sm:w-auto sm:min-w-[160px]">
                            Batal Order
                          </button>
                        )}
                        <button type="button" onClick={nextStep} className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all w-full sm:w-auto sm:min-w-[160px]">
                          Selanjutnya <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* DESKTOP STEP 3: Waktu & Konfirmasi */}
                {step === 3 && (
                  <motion.div key="d-step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4 mb-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Langkah 3 dari 3</span>
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-black dark:text-white tracking-tight">Waktu & Konfirmasi Pesanan</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Tahap Finalisasi</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
                      
                      {/* Kolom 1: Pengaturan Waktu & Harga */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Jadwal & Anggaran</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Target selesai & ekspektasi budget</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 1
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Deadline Pengerjaan</span>
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/40 dark:border-rose-900/40">Wajib</span>
                              </label>
                              <p className="text-[11px] text-zinc-400 mb-2">Pilih tanggal target selesai (minimal 1 hari dari sekarang)</p>
                              <div className="relative">
                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input required type="date" min={getMinDate(1)} name="deadline" value={formData.deadline} onChange={handleChange} className={inputClassDesktop} />
                              </div>
                              {formData.deadline === getMinDate(1) && (
                                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-amber-600 dark:text-amber-400 text-xs font-semibold mt-2 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                                  <Info className="w-4 h-4 shrink-0" />
                                  <span>Pengerjaan kilat 1 hari, biaya mungkin disesuaikan dengan prioritas pengerjaan.</span>
                                </motion.p>
                              )}
                            </div>

                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Budget / Perkiraan Harga</span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">Opsional</span>
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <FastInput type="text" name="budget" value={formData.budget} onChange={handleChange} className={inputClassDesktop} placeholder="Contoh: Rp 150.000 s/d Rp 300.000" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Pengerjaan dimulai segera setelah detail pesanan disepakati bersama.</span>
                        </div>
                      </div>

                      {/* Kolom 2: Konfirmasi & Pembayaran */}
                      <div className="frosted-glass-card rounded-2xl md:rounded-[1.75rem] p-6 lg:p-7 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                                <Wallet className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-black dark:text-white leading-tight">Konfirmasi Pesanan</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pembayaran & rincian estimasi</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                              Kolom 2
                            </span>
                          </div>

                          <div className="space-y-4">
                            {/* Kartu Pembayaran */}
                            <button type="button" onClick={() => setShowPaymentModal(true)} className="w-full flex flex-col gap-2.5 bg-zinc-50/90 hover:bg-zinc-100/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-4 rounded-xl transition-all group text-left shadow-2xs">
                              <div className="w-full flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="block text-sm font-bold text-black dark:text-white">Metode Pembayaran Resmi</span>
                                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Transfer Bank & E-Wallet (7 Metode)</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                                  <span>Detail</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center flex-wrap gap-2 text-[10px]">
                                <span className="font-semibold text-zinc-400">Tersedia:</span>
                                <span className="font-bold text-[#00529C] dark:text-blue-400">BRI</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                <span className="font-bold text-[#118EEA] dark:text-sky-400">DANA</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                <span className="font-bold text-[#00AED6] dark:text-cyan-400">GoPay</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                <span className="font-bold text-[#4C2A86] dark:text-purple-400">OVO</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                <span className="font-bold text-[#EE4D2D] dark:text-orange-400">ShopeePay</span>
                              </div>
                            </button>

                            {/* Estimasi Harga Sistem */}
                            <div className="bg-zinc-50/90 dark:bg-[#0c0c0c] rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-800">
                              <div className="flex items-center justify-between mb-2.5">
                                <h5 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Estimasi Harga Sistem</h5>
                                <span className="text-[10px] text-zinc-400">Otomatis</span>
                              </div>
                              <div className="space-y-1.5 mb-3">
                                {getPriceBreakdown().breakdown.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs text-zinc-600 dark:text-zinc-400">
                                    <span>{item.label}</span>
                                    <span className="font-medium text-black dark:text-white">{formatIDR(item.price)}</span>
                                  </div>
                                ))}
                                {getPriceBreakdown().breakdown.length === 0 && (
                                  <div className="text-xs text-zinc-400 italic">Pilih jenis layanan untuk melihat estimasi...</div>
                                )}
                              </div>
                              <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                                <span className="text-xs font-bold text-black dark:text-white">Total Estimasi</span>
                                <span className={`text-base font-black ${!formData.deadline ? 'text-zinc-400 dark:text-zinc-500 text-xs italic' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {!formData.deadline ? "Pilih deadline dahulu" : formatIDR(getPriceBreakdown().total)}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-2 italic">*Harga akhir akan dikonfirmasi kembali saat diskusi di WhatsApp.</p>
                            </div>
                            
                            {/* Catatan Tambahan */}
                            <div>
                              <label className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
                                <span>Catatan Tambahan</span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">Opsional</span>
                              </label>
                              <div className="relative">
                                <FileEdit className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                                <FastTextarea rows={2} name="catatan" value={formData.catatan} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/80 dark:bg-[#0c0c0c] hover:bg-white dark:hover:bg-[#121212] focus:bg-white dark:focus:bg-[#121212] border border-zinc-200 dark:border-zinc-800/90 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all dark:text-white resize-y text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-600" placeholder="Ada request warna spesifik, format output, atau catatan penting lainnya?" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/70 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Pemesanan terintegrasi langsung ke WhatsApp resmi Alfreelnc.</span>
                        </div>
                      </div>

                    </div>
                    <div className="pt-8 flex flex-row justify-between gap-3 md:gap-4">
                      <button type="button" onClick={prevStep} className="flex justify-center items-center gap-2 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <button type="submit" disabled={!isDesktopStep3Valid} className="flex-1 flex justify-center items-center gap-2 bg-[#25D366] text-white px-10 py-3.5 rounded-xl text-sm md:text-base font-extrabold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#25D366]/20 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none">
                        <Send className="w-5 h-5" /> Lanjutkan di WhatsApp
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (

              /* MOBILE RENDER (5 Steps) */
              <AnimatePresence mode="wait">
                
                {/* MOBILE STEP 1: Data Diri */}
                {step === 1 && (
                  <motion.div key="m-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="frosted-glass-card rounded-2xl p-3.5 sm:p-5 space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight">Informasi Klien</h3>
                          <p className="text-[10px] text-zinc-400">Langkah 1 dari 5</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        Kontak
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Nama Lengkap</span>
                          <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">Wajib</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                          <FastInput required type="text" name="nama" value={formData.nama} onChange={handleChange} className={inputClassMobile} placeholder="Masukkan nama Anda" />
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Nomor WhatsApp</span>
                          <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">Wajib</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                          <FastInput required type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className={inputClassMobile} placeholder="Contoh: 08123456789" />
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Media Sosial / Brand</span>
                          <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">Opsional</span>
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                          <FastInput type="text" name="sosmed" value={formData.sosmed} onChange={handleChange} className={inputClassMobile} placeholder="@username atau Brand" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      {formData.jenisLayanan && (
                        <button type="button" onClick={() => setShowCancelPopup(true)} className="h-9 px-3 flex items-center justify-center gap-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 dark:border-red-900/40 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shrink-0">
                          Batal Order
                        </button>
                      )}
                      <button type="button" disabled={!isValidDataDiri} onClick={nextStep} className="h-9 px-4 flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs">
                        Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* MOBILE STEP 2: Detail Produk */}
                {step === 2 && (
                  <motion.div key="m-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="frosted-glass-card rounded-2xl p-3.5 sm:p-5 space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                          <LayoutTemplate className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight">Detail Produk</h3>
                          <p className="text-[10px] text-zinc-400">Langkah 2 dari 5</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        Spesifikasi
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Jenis Layanan</span>
                          <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">Wajib</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowServiceModal(true)}
                          className={`${inputClassMobile} text-left flex items-center justify-between cursor-pointer group active:scale-[0.99] h-9.5 px-3`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <SelectedServiceIcon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
                            <span className={`text-xs truncate ${formData.jenisLayanan ? "text-zinc-950 dark:text-zinc-50 font-bold" : "text-zinc-400 dark:text-zinc-500 font-normal"}`}>
                              {formData.jenisLayanan || "Pilih Jenis Layanan Desain..."}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0">
                            <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">{formData.jenisLayanan ? "Ganti" : "Pilih"}</span>
                            <ChevronDown className="w-3 h-3 text-zinc-400" />
                          </div>
                        </button>
                      </div>

                      {formData.jenisLayanan === 'Lainnya' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                            <span>Tuliskan Layanan Lainnya</span>
                            <span className="text-[9px] font-semibold text-rose-500">Wajib</span>
                          </label>
                          <FastInput required type="text" name="layananLainnya" value={formData.layananLainnya} onChange={handleChange} className={inputClassMobile} placeholder="Sebutkan jenis layanan..." />
                        </motion.div>
                      )}

                      {/* 4 Kolom Spesifikasi Desain (Grid 2 Kolom Kompak & Proporsional) */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <label className="block text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">Tujuan Desain</label>
                          <div className="relative">
                            <PenTool className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <FastInput type="text" name="tujuan" value={formData.tujuan} onChange={handleChange} className={`${inputClassMobile} pl-7.5 pr-2 py-1.5 text-[11px] font-semibold`} placeholder="Misal: Promosi" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">Gaya Desain</label>
                          <div className="relative">
                            <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <FastInput type="text" name="gaya" value={formData.gaya} onChange={handleChange} className={`${inputClassMobile} pl-7.5 pr-2 py-1.5 text-[11px] font-semibold`} placeholder="Misal: Elegan" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">Format Ukuran</label>
                          <div className="relative">
                            <Maximize className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <FastInput type="text" name="format" value={formData.format} onChange={handleChange} className={`${inputClassMobile} pl-7.5 pr-2 py-1.5 text-[11px] font-semibold`} placeholder="Misal: 1:1 / A4" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200 mb-1 truncate">Jumlah Desain</label>
                          <div className="relative">
                            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <FastInput type="number" min="1" name="jumlah" value={formData.jumlah} onChange={handleChange} className={`${inputClassMobile} pl-7.5 pr-2 py-1.5 text-[11px] font-semibold`} placeholder="Misal: 1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button type="button" onClick={prevStep} className="h-9 px-3 flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5" /> Sebelumnya
                      </button>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="h-9 px-3 flex items-center justify-center gap-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shrink-0">
                            Batal
                          </button>
                        )}
                        <button type="button" disabled={!isValidDetailProduk} onClick={nextStep} className="h-9 px-4 flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs">
                          Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MOBILE STEP 3: Waktu & Harga */}
                {step === 3 && (
                  <motion.div key="m-step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="frosted-glass-card rounded-2xl p-3.5 sm:p-5 space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight">Jadwal & Anggaran</h3>
                          <p className="text-[10px] text-zinc-400">Langkah 3 dari 5</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        Jadwal
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Grid 2 Kolom untuk Deadline dan Budget agar memaksimalkan ruang kosong */}
                      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5">
                        <div>
                          <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                            <span>Deadline Selesai</span>
                            <span className="text-[9px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">Wajib</span>
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <input required type="date" min={getMinDate(1)} name="deadline" value={formData.deadline} onChange={handleChange} className={`${inputClassMobile} text-[11px] font-semibold cursor-pointer`} />
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                            <span>Estimasi Budget</span>
                            <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">Opsional</span>
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <FastInput type="text" name="budget" value={formData.budget} onChange={handleChange} className={`${inputClassMobile} text-[11px] font-semibold`} placeholder="Contoh: Rp 150k" />
                          </div>
                        </div>
                      </div>

                      {formData.deadline === getMinDate(1) && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-start gap-1.5 leading-tight bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/50">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                          <span>Prioritas kilat 1 hari. Biaya mungkin disesuaikan dengan urgensi jadwal.</span>
                        </motion.p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button type="button" onClick={prevStep} className="h-9 px-3 flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5" /> Sebelumnya
                      </button>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="h-9 px-3 flex items-center justify-center gap-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shrink-0">
                            Batal
                          </button>
                        )}
                        <button type="button" disabled={!isValidDeadline} onClick={nextStep} className="h-9 px-4 flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-2xs">
                          Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MOBILE STEP 4: Materi & Referensi */}
                {step === 4 && (
                  <motion.div key="m-step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="frosted-glass-card rounded-2xl p-3.5 sm:p-5 space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight">Materi & Lampiran</h3>
                          <p className="text-[10px] text-zinc-400">Langkah 4 dari 5</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        Referensi
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Materi / Briefing Teks</span>
                          <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">Opsional</span>
                        </label>
                        <div className="relative">
                          <FileText className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                          <FastTextarea rows={2.5} name="materi" value={formData.materi} onChange={handleChange} className="w-full pl-8 pr-2.5 py-2 bg-white/90 dark:bg-[#121212]/90 border border-zinc-200/90 dark:border-zinc-800 rounded-xl focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 outline-none transition-colors text-zinc-950 dark:text-zinc-50 resize-y text-xs font-semibold placeholder:text-zinc-400 min-h-[68px] max-h-[140px] shadow-2xs" placeholder="Tuliskan materi teks, tagline, atau link Google Drive..." />
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Upload Gambar Referensi</span>
                          <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">Opsional</span>
                        </label>
                        <div className="relative border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 text-center bg-zinc-50/70 dark:bg-zinc-900/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/80 transition-colors flex items-center justify-center min-h-[72px] cursor-pointer group">
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Upload Referensi" />
                          {isUploading ? (
                            <div className="flex flex-col items-center justify-center text-zinc-500 py-1">
                              <UploadCloud className="w-5 h-5 animate-bounce mb-1 text-black dark:text-white" />
                              <span className="text-[10px] font-semibold text-black dark:text-white">Mengunggah file...</span>
                            </div>
                          ) : formData.referensiUrl ? (
                            <div className="flex items-center justify-center gap-3 relative z-0 py-1">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-500 bg-zinc-100 dark:bg-zinc-800 shadow-2xs">
                                  <img src={formData.referensiUrl} alt="Referensi" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5 shadow-md border border-white dark:border-zinc-900">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">File Terpasang</span>
                                <span className="text-[9px] text-zinc-400">Ketuk untuk ganti gambar</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-500 py-1">
                              <UploadCloud className="w-4 h-4 mb-0.5 text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                              <span className="text-[10.5px] font-bold text-black dark:text-white">Pilih Gambar Referensi</span>
                              <span className="text-[8px] text-zinc-400 mt-0.5">PNG, JPG, JPEG (Maks. 5MB)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button type="button" onClick={prevStep} className="h-9 px-3 flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5" /> Sebelumnya
                      </button>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="h-9 px-3 flex items-center justify-center gap-1 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shrink-0">
                            Batal
                          </button>
                        )}
                        <button type="button" onClick={nextStep} className="h-9 px-4 flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-2xs">
                          Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MOBILE STEP 5: Konfirmasi Akhir */}
                {step === 5 && (
                  <motion.div key="m-step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="frosted-glass-card rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shrink-0">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight">Konfirmasi & Biaya</h3>
                          <p className="text-[10px] text-zinc-400">Langkah 5 dari 5</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        Final
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Tombol Pembayaran Resmi */}
                      <button type="button" onClick={() => setShowPaymentModal(true)} className="w-full flex flex-col gap-1.5 bg-zinc-50/90 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 p-2.5 rounded-xl transition-colors group text-left shadow-2xs">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                              <span className="block text-xs font-bold text-black dark:text-white leading-tight">Metode Pembayaran Resmi</span>
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">Transfer Bank BRI & 5 Dompet Digital</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            <span>Detail</span>
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/80 flex items-center flex-wrap gap-1.5 text-[9px]">
                          <span className="font-bold text-[#00529C] dark:text-blue-400">BRI</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span className="font-bold text-[#118EEA] dark:text-sky-400">DANA</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span className="font-bold text-[#00AED6] dark:text-cyan-400">GoPay</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span className="font-bold text-[#4C2A86] dark:text-purple-400">OVO</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span className="font-bold text-[#EE4D2D] dark:text-orange-400">ShopeePay</span>
                        </div>
                      </button>

                      {/* Estimasi Biaya */}
                      <div className="bg-zinc-50/90 dark:bg-[#0c0c0c]/80 rounded-xl p-2.5 border border-zinc-200/80 dark:border-zinc-800">
                        <h5 className="text-[10px] font-bold text-black dark:text-white mb-1.5 uppercase tracking-wider">Estimasi Harga Sistem</h5>
                        <div className="space-y-1 mb-1.5">
                          {getPriceBreakdown().breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] text-zinc-600 dark:text-zinc-400">
                              <span>{item.label}</span>
                              <span className="font-medium text-black dark:text-white">{formatIDR(item.price)}</span>
                            </div>
                          ))}
                          {getPriceBreakdown().breakdown.length === 0 && (
                            <div className="text-[10px] text-zinc-400 italic">Pilih jenis layanan untuk melihat estimasi...</div>
                          )}
                        </div>
                        <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                          <span className="text-xs font-bold text-black dark:text-white">Total Estimasi</span>
                          <span className={`text-xs font-black ${!formData.deadline ? 'text-zinc-400 dark:text-zinc-500 italic' : 'text-blue-600 dark:text-blue-400'}`}>
                            {!formData.deadline ? "Pilih deadline" : formatIDR(getPriceBreakdown().total)}
                          </span>
                        </div>
                        <p className="text-[8px] text-zinc-400 mt-1 italic">*Harga akhir disepakati saat konsultasi di WhatsApp.</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                          <span>Catatan Tambahan</span>
                          <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">Opsional</span>
                        </label>
                        <div className="relative">
                          <FileEdit className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                          <FastTextarea rows={2} name="catatan" value={formData.catatan} onChange={handleChange} className="w-full pl-8 pr-2.5 py-1.5 bg-white/90 dark:bg-[#121212]/90 border border-zinc-200/90 dark:border-zinc-800 rounded-xl focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 outline-none transition-colors text-zinc-950 dark:text-zinc-50 resize-y text-xs font-semibold placeholder:text-zinc-400 shadow-2xs" placeholder="Request khusus atau preferensi warna?" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button type="button" onClick={prevStep} className="h-9.5 px-3.5 flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                      </button>
                      <button type="submit" className="h-9.5 px-4 flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md shadow-[#25D366]/20">
                        <Send className="w-3.5 h-3.5" /> Lanjutkan di WhatsApp
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            )}

          </form>
        </div>

        {/* PAKET SPESIAL PILIHAN */}
        {(() => {
          const validActivePosters = promoPosters.filter(
            p => p && p.active !== false && p.image && typeof p.image === 'string' && p.image.trim().length > 0 && !p.title?.includes('Diskon 30% Paket Branding') && !p.title?.includes('Konsultasi Desain & Audit Portofolio')
          );

          if (validActivePosters.length === 0) return null;

          return (
            <div id="promo-posters-section" className="mt-10 md:mt-16 pt-8 md:pt-12 border-t border-zinc-200/80 dark:border-zinc-800/80">
              {/* Header Bagian Promo */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Promo & Penawaran Spesial</span>
                  </div>
                  <h3 className="text-lg md:text-2xl lg:text-3xl font-extrabold text-black dark:text-white tracking-tight">
                    Paket Spesial Pilihan
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                    Pilih penawaran terbaik di bawah ini untuk proyek desain grafis, branding, atau kebutuhan visual Anda.
                  </p>
                </div>
                <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">
                  <span>{validActivePosters.length} Paket Pilihan</span>
                </div>
              </div>

              {/* Grid Poster (Rasio 4:5, terstruktur rapi di semua device: 1 kolom di mobile, 2 kolom di tablet, 3 kolom di desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
                {validActivePosters.map((poster, index) => {
                  const isStoreLink = poster.link === '#store' || poster.link === 'store' || !poster.link;
                  const posterImgUrl = resolveImageUrl(poster.image);
                  return (
                    <div
                      key={poster.id ? `${poster.id}-${index}` : `promo-poster-${index}`}
                      className="group bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800/90 rounded-2xl md:rounded-[1.75rem] p-3.5 md:p-4 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300"
                    >
                      <div>
                        {/* Kontainer Gambar Vertikal Rasio 4:5 */}
                        <div className="w-full aspect-[4/5] rounded-xl md:rounded-2xl overflow-hidden relative bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                          <img
                            src={posterImgUrl}
                            alt={poster.title || `Poster Promosi #${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                            onError={handleImageError}
                          />

                          {/* Badge Nomor Slot Promosi */}
                          <div className="absolute top-2.5 left-2.5 bg-black/80 dark:bg-white/95 text-white dark:text-black backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            <span>PROMO #{index + 1}</span>
                          </div>
                        </div>

                        {/* Judul Promo */}
                        <h4 className="text-xs md:text-sm font-bold text-black dark:text-white mt-3 mb-1 line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {poster.title || `Penawaran Promo #${index + 1}`}
                        </h4>
                      </div>

                      {/* Tombol Aksi CTA */}
                      <div className="pt-3 mt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                        {isStoreLink ? (
                          <button
                            type="button"
                            onClick={() => {
                              const storeElement = document.getElementById('store');
                              if (storeElement) {
                                storeElement.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="w-full py-2 md:py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-white hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-sm cursor-pointer"
                          >
                            <span>{poster.ctaText || "Pesan Desain Ini"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <a
                            href={poster.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 md:py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-white hover:text-white transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-sm text-center"
                          >
                            <span>{poster.ctaText || "Ambil Diskon"}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Payment Info Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-2xl md:rounded-3xl p-4 md:p-6 w-full max-w-lg md:max-w-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl relative my-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 md:mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] md:text-xs font-semibold mb-1.5 border border-emerald-200/50 dark:border-emerald-800/50">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Terverifikasi & Aman</span>
                  </div>
                  <h3 className="text-base md:text-xl font-extrabold text-black dark:text-white">Metode Pembayaran Resmi</h3>
                  <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Mendukung Transfer Bank dan seluruh Dompet Digital utama Indonesia.</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)} 
                  className="p-1.5 md:p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable List */}
              <div className="overflow-y-auto pr-1 space-y-5 text-left pb-2">
                {/* Section 1: Transfer Bank */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Transfer Bank Resmi</span>
                    
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Bank BRI */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><BriLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">Bank BRI</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">ATM / Antar Bank</span>
                        </div>
                      </div>
                      
                    </div>

                    {/* BRImo */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><BrimoLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">BRImo</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">Mobile Banking</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>

                {/* Section 2: E-Wallet & Dompet Digital */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Dompet Digital (E-Wallet)</span>
                    
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* DANA */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><DanaLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">DANA</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">Dompet Digital</span>
                        </div>
                      </div>
                      
                    </div>

                    {/* GoPay */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><GopayLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">GoPay</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">Gojek App</span>
                        </div>
                      </div>
                      
                    </div>

                    {/* OVO */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><OvoLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">OVO</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">OVO Cash</span>
                        </div>
                      </div>
                      
                    </div>

                    {/* ShopeePay */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><ShopeePayLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">ShopeePay</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">Shopee & QRIS</span>
                        </div>
                      </div>
                      
                    </div>

                    {/* LinkAja */}
                    <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-500 dark:hover:border-red-500 transition-all sm:col-span-2 cursor-default shadow-sm">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="w-[25px] md:w-[50px] shrink-0 flex items-center justify-start"><LinkAjaLogo className="h-2 md:h-4 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0">LinkAja!</span>
                          <span className="block text-[8px] md:text-[10px] text-zinc-500">Dompet Digital BUMN</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3">
                <button 
                  type="button" 
                  onClick={(e) => { 
                    setShowPaymentModal(false); 
                    if ((window.innerWidth >= 768 && isDesktopStep3Valid) || (window.innerWidth < 768 && true)) {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent); 
                    } else {
                      showToast('Mohon lengkapi formulir terlebih dahulu sebelum lanjut pembelian.');
                    }
                  }} 
                  className="w-full bg-[#25D366] text-black py-3 md:py-3.5 rounded-xl text-xs md:text-sm font-extrabold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-2"
                >
                  Lanjut Pembelian
                </button>
              </div>
              {/* Bottom Notice */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition-opacity self-end sm:self-auto shrink-0"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Selection Modal */}
      <ServiceSelectModal 
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        selectedService={formData.jenisLayanan}
        onSelectService={(service) => {
          setFormData(prev => ({ 
            ...prev, 
            jenisLayanan: service, 
            layananLainnya: service === 'Lainnya' ? prev.layananLainnya : '' 
          }));
        }}
      />
      
      {/* Direct Order WhatsApp Banner */}
      <div className="w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mt-6 sm:mt-8 md:mt-10 mb-1 sm:mb-2 md:mb-3">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl md:rounded-[2.5rem] p-6 md:p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12 lg:gap-16 text-center lg:text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-green-500/20 dark:bg-green-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-500/20 dark:bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex-1">
            <h3 className="text-xl md:text-4xl lg:text-5xl font-extrabold text-black dark:text-white mb-2 md:mb-4 tracking-tight">Lebih Suka Langsung Ngobrol?</h3>
            <p className="text-xs md:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl lg:max-w-3xl mx-auto lg:mx-0 lg:leading-relaxed">
              Lewati formulir dan langsung hubungi kami via WhatsApp. Ceritakan kebutuhan desain Anda, dan kami akan segera memberikan estimasi serta penawaran terbaik.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <a 
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Halo, saya ingin order desain grafis dan berdiskusi langsung.")}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] text-black px-8 md:px-10 lg:px-14 py-4 md:py-5 lg:py-6 rounded-full text-sm md:text-base lg:text-xl font-extrabold hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-[#25D366]/20"
            >
              <Send className="w-5 h-5 md:w-6 md:h-6" /> Pesan via WhatsApp
            </a>
          </div>
        </div>
      </div>
      
    
      {/* Cancel Order Popup */}
      <AnimatePresence>
        {showCancelPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-6 pb-10 md:pb-12 bg-black/30 dark:bg-black/50 backdrop-blur-md"
            onClick={() => setShowCancelPopup(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs md:max-w-sm bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/40 dark:border-zinc-800/60"
            >
              <h3 className="text-lg md:text-xl font-bold text-black dark:text-white mb-2">Batalkan Orderan?</h3>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Data yang sudah diisi akan terhapus secara permanen. Yakin ingin membatalkan?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelPopup(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-zinc-200/50 dark:bg-zinc-800/50 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  Kembali
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-red-600/90 text-white hover:bg-red-700 transition-colors text-sm shadow-lg shadow-red-600/20"
                >
                  Hapus Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Intercept Popup */}
      <AnimatePresence>
        {showNavPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-6 pb-10 md:pb-12 bg-black/30 dark:bg-black/50 backdrop-blur-md"
            onClick={navStay}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs md:max-w-sm bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/40 dark:border-zinc-800/60 flex flex-col gap-4"
            >
              <div>
                <h3 className="text-lg md:text-xl font-bold text-black dark:text-white mb-2">Simpan Sebagai Draft?</h3>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
                  Anda dapat menyimpannya sebagai draft untuk dilanjutkan nanti, atau batalkan untuk menghapus form.
                </p>
              </div>
              
              <div className="flex flex-col gap-2.5 mt-2">
                <button
                  onClick={navDraft}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-blue-600/90 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-sm"
                >
                  Simpan Draft
                </button>
                <button
                  onClick={navDiscard}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-red-100/80 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                >
                  Batalkan Orderan
                </button>
                <button
                  onClick={navStay}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-zinc-200/50 dark:bg-zinc-800/50 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  Tetap di Halaman
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
</section>
  );
}
