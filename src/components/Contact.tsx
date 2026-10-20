import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Check, ArrowRight, MessageSquare, MessageCircle, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, query, orderBy } from 'firebase/firestore';
import { defaultSettings, SiteSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { FastInput, FastTextarea } from './FastInput';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

export default function Contact() {
 const [formData, setFormData] = useState({ name: '', email: '', message: '' });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);
 const [messages, setMessages] = useState<any[]>([]);
 const [loadingMessages, setLoadingMessages] = useState(true);
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());

 useEffect(() => {
  const handleSettingsUpdate = (e: any) => {
    if (e.detail) setSettings(e.detail);
  };
  window.addEventListener('app_settings_updated', handleSettingsUpdate);

  let unsubscribeMessages: (() => void) | null = null;
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    if (user && user.email && ['alfreelnc.desigh@gmail.com', 'albianavl.co@gmail.com'].includes(user.email.toLowerCase().trim())) {
      unsubscribeMessages = onSnapshot(
        query(collection(db, 'messages'), orderBy('dateAdded', 'desc')),
        (snapshot) => {
          const msgData: any[] = [];
          snapshot.forEach((doc) => {
            msgData.push({ id: doc.id, ...doc.data() });
          });
          setMessages(msgData);
          setLoadingMessages(false);
        },
        (err) => {
          console.warn("Messages notice:", err);
          setLoadingMessages(false);
        }
      );
    } else {
      setMessages([]);
      setLoadingMessages(false);
    }
  });

  const docRef = doc(db, 'settings', 'global');
  const unsubscribe = onSnapshot(
   docRef,
   (docSnap) => {
    if (docSnap.exists()) {
     setSettings({ ...defaultSettings, ...(docSnap.data() as Partial<SiteSettings>) });
    }
   },
   (err) => {
    console.warn("Contact settings error (using stored):", err);
    setSettings(getStoredSettings());
   }
  );
  return () => {
    unsubscribe();
    unsubAuth();
    if (unsubscribeMessages) unsubscribeMessages();
    window.removeEventListener('app_settings_updated', handleSettingsUpdate);
  };
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
   await addDoc(collection(db, 'messages'), {
    ...formData,
    dateAdded: new Date()
   });
   setIsSubmitting(false);
   setIsSuccess(true);
   setFormData({ name: '', email: '', message: '' });
   setTimeout(() => setIsSuccess(false), 5000);
  } catch (error) {
   console.warn("Error adding document: ", error);
   setIsSubmitting(false);
  }
 };

 const rawPhone = (settings.contactPhone || '628112345678').replace(/[^0-9]/g, '');
 const waNumber = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone || '628112345678';
 const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin memesan jasa desain / berdiskusi mengenai proyek visual.')}`;

 return (
  <motion.section 
   id="contact" 
   initial="hidden"
   animate="visible"
   whileInView="visible"
   viewport={{ once: true, amount: 0 }}
   variants={sectionStaggerContainer}
   className="pt-8 pb-28 mb-20 bg-white dark:bg-[#0A0A0A] scroll-mt-24 md:scroll-mt-32"
  >
   <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18">
    
    {/* Section Header */}
    <motion.div 
     variants={sectionHeaderItem}
     className="text-left md:text-center mb-8 md:mb-12"
    >
     <div className="inline-block px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/50 text-[11px] md:text-xs font-semibold tracking-widest text-black dark:text-zinc-400 mb-3 uppercase">
      Yuk Ngobrol & Diskusi
     </div>
     <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white leading-[1.15] mb-3">
      Punya Ide atau Proyek Seru? <span className="text-black dark:text-zinc-500">Mari Kolaborasi</span>
     </h2>
     <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
      Lagi butuh bantuan visual, desain branding, atau sekadar ingin bertukar ide? Silakan hubungi langsung lewat WhatsApp agar lebih cepat, atau tinggalkan pesan lewat formulir di bawah.
     </p>
    </motion.div>

    {/* 1. Card WhatsApp (Paling Utama & Menonjol) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 mb-6 shadow-sm relative overflow-hidden"
    >
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div className="flex items-start gap-4">
       <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/25">
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
       </div>
       <div className="text-left">
        <div className="flex items-center gap-2 mb-1">
         <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
         <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Lebih Cepat & Praktis
         </span>
        </div>
        <h3 className="text-base sm:text-xl font-bold text-black dark:text-white tracking-tight">
         Ngobrol Langsung di WhatsApp
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md leading-relaxed">
         Konsultasi santai dan fleksibel. Mulai dari konsep, referensi visual, perkiraan biaya, sampai jadwal pengerjaan bisa langsung kita bicarakan.
        </p>
       </div>
      </div>

      <a 
       href={waLink}
       target="_blank" 
       rel="noopener noreferrer"
       className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold px-6 py-3.5 sm:px-7 sm:py-3.5 rounded-full text-xs sm:text-sm transition-all shadow-md shadow-[#25D366]/20 shrink-0"
      >
       <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
       <span>Chat di WhatsApp</span>
      </a>
     </div>
    </motion.div>

    {/* 2. Form Kontak Sederhana (Input: Nama, Email, Pesan, Button: Kirim) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-zinc-50 dark:bg-[#111111] border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm"
    >
     <div className="text-left mb-6">
      <h3 className="text-base sm:text-xl font-bold text-black dark:text-white tracking-tight">
       Tinggalkan Pesan Tertulis
      </h3>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
       Lebih nyaman lewat pesan tertulis? Silakan isi data di bawah, nanti akan saya balas secepatnya.
      </p>
     </div>

     <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Nama
       </label>
       <FastInput 
        type="text" 
        name="name" 
        required 
        value={formData.name} 
        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 shadow-sm" 
        placeholder="Nama atau nama brand kamu" 
       />
      </div>
      
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Email
       </label>
       <FastInput 
        type="email" 
        name="email" 
        required 
        value={formData.email} 
        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 shadow-sm" 
        placeholder="nama@email.com" 
       />
      </div>
      
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Pesan
       </label>
       <FastTextarea 
        name="message" 
        required 
        rows={4} 
        value={formData.message} 
        onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none shadow-sm" 
        placeholder="Jelaskan kebutuhan proyek atau pertanyaan Anda..." 
       />
      </div>
      
      <button 
       type="submit" 
       disabled={isSubmitting || isSuccess} 
       className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs sm:text-sm font-semibold rounded-full border transition-all active:scale-95 duration-200 ${
        isSuccess 
         ? 'bg-emerald-500 text-white border-emerald-500 cursor-default' 
         : 'bg-black text-white border-black dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed shadow-md'
       }`}
      >
       {isSubmitting ? (
        'Mengirim...'
       ) : isSuccess ? (
        <><Check size={16} /> Pesan Terkirim!</>
       ) : (
        <><Send size={15} /> Kirim Pesan</>
       )}
      </button>
     </form>
    </motion.div>

    {/* Buku Tamu (Guestbook) Ringkas di Bawah Form */}
    {messages.length > 0 && (
     <div className="mt-10 pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 text-left">
      <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white mb-4 flex items-center gap-2">
       <MessageSquare className="w-4 h-4 text-zinc-500" /> Buku Tamu ({messages.length})
      </h4>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
       {messages.slice(0, 5).map((msg) => (
        <div 
         key={msg.id} 
         className="bg-zinc-50 dark:bg-[#111111] p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 text-xs"
        >
         <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-black dark:text-white">{msg.name}</span>
          <span className="text-[10px] text-zinc-400">
           {msg.dateAdded?.toDate ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'short' }).format(msg.dateAdded.toDate()) : 'Baru saja'}
          </span>
         </div>
         <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
          {msg.message}
         </p>
        </div>
       ))}
      </div>
     </div>
    )}

   </div>
  </motion.section>
 );
}
