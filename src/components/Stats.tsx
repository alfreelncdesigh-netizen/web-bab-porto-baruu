import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Eye, Image as ImageIcon, ShoppingCart, FileText, Mail, BarChart3, Download, Tag, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';
import { cleanProjects, cleanBlogs, getStoredProjects, getStoredBlogs } from '../lib/contentStorage';
import { MASTER_ADMINS } from './AdminDashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, 
  LineChart, Line, Legend
} from 'recharts';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

// Wrapper khusus untuk memastikan Recharts selalu menerima dimensi pixel valid saat detail dibuka/tutup berkali-kali
function ChartWrapper({ 
  children,
  minHeight = 280
}: { 
  children: React.ReactNode;
  minHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const triggerResize = () => {
      window.dispatchEvent(new Event('resize'));
    };
    triggerResize();
    const t1 = setTimeout(triggerResize, 60);
    const t2 = setTimeout(triggerResize, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: minHeight, minHeight }} className="relative w-full min-w-0">
      {mounted ? (
        <ResponsiveContainer width="100%" height={minHeight}>
          {children as any}
        </ResponsiveContainer>
      ) : (
        <div style={{ height: minHeight }} className="w-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function Stats({ 
  isAdmin = false,
  isFullView = false 
}: { 
  isAdmin?: boolean;
  isFullView?: boolean;
}) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Status autentikasi hak akses Admin
  const [isEffectiveAdmin, setIsEffectiveAdmin] = useState<boolean>(isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setIsEffectiveAdmin(true);
      return;
    }
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email && MASTER_ADMINS.includes(user.email.toLowerCase().trim())) {
        setIsEffectiveAdmin(true);
      } else {
        setIsEffectiveAdmin(false);
      }
    });
    return () => unsubAuth();
  }, [isAdmin]);

  const toggleCharts = () => {
    setShowCharts((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
      }
      return next;
    });
  };
  
  const handleExportPNG = async () => {
    if (!statsRef.current) return;
    const watermark = document.getElementById('stats-watermark');
    const normalHeader = document.getElementById('stats-normal-header');
    
    const origStyle = statsRef.current.style.cssText;
    
    try {
      const isDark = document.documentElement.classList.contains('dark');
      
      if (watermark) watermark.style.display = 'flex';
      if (normalHeader) normalHeader.style.display = 'none';
      
      statsRef.current.style.width = '1250px';
      statsRef.current.style.height = '1250px';
      statsRef.current.style.overflow = 'hidden';
      statsRef.current.style.position = 'relative';
      statsRef.current.style.display = 'flex';
      statsRef.current.style.flexDirection = 'column';

      window.dispatchEvent(new Event('resize'));
      
      await new Promise(resolve => setTimeout(resolve, 800));

      const dataUrl = await toPng(statsRef.current, {
        pixelRatio: 4,
        backgroundColor: isDark ? '#0A0A0A' : '#F0EEEE',
        cacheBust: true,
      });

      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (watermark) watermark.style.display = 'none';
      if (normalHeader) normalHeader.style.display = 'flex';
      statsRef.current.style.cssText = origStyle;
      window.dispatchEvent(new Event('resize'));

      const link = document.createElement('a');
      link.download = 'statistik-alfreelnc-' + new Date().toISOString().split('T')[0] + '.png';
      link.href = objectUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

    } catch (err) {
      console.warn('Gagal mengekspor statistik', err);
      alert('Gagal mengunduh gambar. Silakan coba gunakan browser desktop atau kurangi ukuran/pixelRatio.');
      if (watermark) watermark.style.display = 'none';
      if (normalHeader) normalHeader.style.display = 'flex';
      statsRef.current.style.cssText = origStyle;
      window.dispatchEvent(new Event('resize'));
    }
  };

  const [pageViews, setPageViews] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('stats_views');
      if (saved) return parseInt(saved, 10) || 128;
    } catch (e) {}
    return 128;
  });

  const [projects, setProjects] = useState<any[]>(() => {
    const stored = getStoredProjects();
    return cleanProjects(stored as any);
  });

  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [blogs, setBlogs] = useState<any[]>(() => {
    const stored = getStoredBlogs();
    return cleanBlogs(stored as any);
  });

  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    let unsubOrders: (() => void) | null = null;
    let unsubMsgs: (() => void) | null = null;

    const handleProjectsUpdate = (e: any) => {
      if (isSubscribed && e.detail && Array.isArray(e.detail)) {
        setProjects(cleanProjects(e.detail));
      }
    };
    const handleBlogsUpdate = (e: any) => {
      if (isSubscribed && e.detail && Array.isArray(e.detail)) {
        setBlogs(cleanBlogs(e.detail));
      }
    };
    window.addEventListener('user_projects_updated', handleProjectsUpdate);
    window.addEventListener('blog_posts_updated', handleBlogsUpdate);

    // 1. Data Agregat Publik: Jumlah Pengunjung (stats/views)
    const unsubViews = onSnapshot(
      doc(db, 'stats', 'views'),
      (docSnap) => {
        if (!isSubscribed) return;
        if (docSnap.exists()) {
          const c = docSnap.data().count;
          if (typeof c === 'number' && c > 0) {
            setPageViews(c);
            try { localStorage.setItem('stats_views', String(c)); } catch (e) {}
          }
        }
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        if (err.code !== 'permission-denied') {
          console.warn('Catatan pembacaan statistik pengunjung:', err.message);
        }
        setLoading(false);
      }
    );

    // 2. Data Publik: Portofolio Proyek (projects)
    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        if (!isSubscribed) return;
        const rawProjects = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((p: any) => p.isArchived !== true);
        const activeProjects = cleanProjects(rawProjects as any);
        if (activeProjects.length > 0) {
          setProjects(activeProjects);
        } else {
          setProjects(cleanProjects(getStoredProjects() as any));
        }
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        setProjects(cleanProjects(getStoredProjects() as any));
        setLoading(false);
      }
    );

    // 3. Data Publik: Artikel Blog (blogPosts)
    const unsubBlogs = onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        if (!isSubscribed) return;
        const rawBlogs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((b: any) => b.isArchived !== true);
        const activeBlogs = cleanBlogs(rawBlogs as any);
        if (activeBlogs.length > 0) {
          setBlogs(activeBlogs);
        } else {
          setBlogs(cleanBlogs(getStoredBlogs() as any));
        }
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        setBlogs(cleanBlogs(getStoredBlogs() as any));
        setLoading(false);
      }
    );

    // 4. Data Privat: Pesanan (orders) & Pesan Masuk (messages)
    // HANYA dipanggil jika pengguna terbukti memiliki otorisasi Admin yang sah
    if (isEffectiveAdmin) {
      unsubOrders = onSnapshot(
        collection(db, 'orders'),
        (snapshot) => {
          if (!isSubscribed) return;
          const loaded = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((o: any) => o.isArchived !== true);
          setOrders(loaded);
          try { localStorage.setItem('orders', JSON.stringify(loaded)); } catch (e) {}
        },
        (err) => {
          if (!isSubscribed) return;
          if (err.code === 'permission-denied') {
            if (unsubOrders) { unsubOrders(); unsubOrders = null; }
          }
        }
      );

      unsubMsgs = onSnapshot(
        collection(db, 'messages'),
        (snapshot) => {
          if (!isSubscribed) return;
          const activeMsgs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((m: any) => m.isArchived !== true);
          setMessages(activeMsgs);
        },
        (err) => {
          if (!isSubscribed) return;
          if (err.code === 'permission-denied') {
            if (unsubMsgs) { unsubMsgs(); unsubMsgs = null; }
          }
        }
      );
    } else {
      // Pengunjung publik tidak mengakses koleksi privat orders & messages
      try {
        const saved = localStorage.getItem('orders');
        if (saved) setOrders(JSON.parse(saved));
      } catch (e) {}
    }

    const safetyTimer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, 400);

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('user_projects_updated', handleProjectsUpdate);
      window.removeEventListener('blog_posts_updated', handleBlogsUpdate);
      unsubViews();
      unsubProjects();
      unsubBlogs();
      if (unsubOrders) unsubOrders();
      if (unsubMsgs) unsubMsgs();
    };
  }, [isEffectiveAdmin]);

  // Helper parsing tanggal
  const parseDate = (val: any): Date => {
    if (!val) return new Date();
    if (val?.toDate) return val.toDate();
    if (val?.toMillis) return new Date(val.toMillis());
    if (typeof val === 'number') return new Date(val);
    const str = String(val).trim();
    if (/^\d{4}$/.test(str)) {
      return new Date(parseInt(str, 10), 5, 1);
    }
    const monthMap: Record<string, number> = {
      januari: 0, jan: 0, februari: 1, feb: 1, maret: 2, mar: 2, april: 3, apr: 3,
      mei: 4, may: 4, juni: 5, jun: 5, juli: 6, jul: 6, agustus: 7, agu: 7, aug: 7,
      september: 8, sep: 8, oktober: 9, okt: 9, oct: 9, november: 10, nov: 10, desember: 11, des: 11, dec: 11
    };
    const parts = str.toLowerCase().split(/[\s,/-]+/);
    let year: number | null = null;
    let month: number | null = null;
    let day = 1;
    for (const part of parts) {
      if (/^\d{4}$/.test(part)) year = parseInt(part, 10);
      else if (monthMap[part] !== undefined) month = monthMap[part];
      else if (/^\d{1,2}$/.test(part)) day = parseInt(part, 10);
    }
    if (year !== null) return new Date(year, month !== null ? month : 0, day);
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const projectCats = projects.reduce((acc, p) => {
    const cat = p.category ? p.category.trim() : 'Lainnya';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderCats = orders.reduce((acc, o) => {
    const lay = o.layanan || o.jenisLayanan || 'Layanan Desain';
    acc[lay] = (acc[lay] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Data Diagram Batang (Distribusi Kategori Karya)
  let barChartData = Object.entries(projectCats).map(([name, value]) => ({ name, value }));
  if (barChartData.length === 0) {
    barChartData = [
      { name: 'Poster', value: 5 },
      { name: 'Postingan Instagram', value: 3 },
      { name: 'Web Design', value: 2 },
      { name: 'Branding', value: 2 },
      { name: 'UI/UX', value: 1 }
    ];
  }

  // Data Diagram Lingkaran
  // Jika Admin: proporsi pesanan masuk sesungguhnya
  // Jika Publik: proporsi sebaran kategori layanan desain
  let pieChartData: { name: string; value: number }[] = [];
  if (isEffectiveAdmin && orders.length > 0) {
    pieChartData = Object.entries(orderCats).map(([name, value]) => ({ name, value: Number(value) }));
  } else {
    pieChartData = Object.entries(projectCats).map(([name, value]) => ({ name, value: Number(value) }));
    if (pieChartData.length === 0) {
      pieChartData = [
        { name: 'Poster & Banner', value: 4 },
        { name: 'Feed & Story Instagram', value: 3 },
        { name: 'Branding & Identitas', value: 2 },
        { name: 'UI/UX & Web', value: 2 }
      ];
    }
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#eab308', '#ec4899', '#06b6d4'];

  const monthlyDataMap: Record<string, { count: number, originalDate: number }> = {};
  projects.forEach(p => {
    const d = parseDate(p.dateAdded || p.date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = { count: 0, originalDate: new Date(year, month, 1).getTime() };
    }
    monthlyDataMap[key].count += 1;
  });

  let lineChartData = Object.entries(monthlyDataMap)
    .sort((a, b) => a[1].originalDate - b[1].originalDate)
    .map(([, data]) => {
      const d = new Date(data.originalDate);
      const name = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return { name, Karya: data.count };
    });

  if (lineChartData.length < 2) {
    const totalProj = Math.max(projects.length, 14);
    lineChartData = [
      { name: 'Mei 2026', Karya: Math.max(2, Math.floor(totalProj * 0.25)) },
      { name: 'Jun 2026', Karya: Math.max(4, Math.floor(totalProj * 0.45)) },
      { name: 'Jul 2026', Karya: Math.max(6, Math.floor(totalProj * 0.6)) },
      { name: 'Agu 2026', Karya: Math.max(9, Math.floor(totalProj * 0.75)) },
      { name: 'Sep 2026', Karya: Math.max(11, Math.floor(totalProj * 0.88)) },
      { name: 'Okt 2026', Karya: totalProj }
    ];
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-xl">
          <p className="text-xs font-bold text-black dark:text-white mb-1">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-medium" style={{ color: entry.color || entry.fill }}>
              {entry.name === 'value' ? 'Jumlah' : entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.section 
      id="stats" 
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      variants={sectionStaggerContainer}
      className="w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 scroll-mt-24 md:scroll-mt-32"
    >
      <div ref={statsRef} className="p-4 sm:p-6 md:p-8 rounded-3xl bg-[#F0EEEE] dark:bg-[#0A0A0A] relative">
        <div id="stats-watermark" style={{ display: 'none' }} className="flex justify-between items-center w-full pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Statistik Web</h2>
          <div className="flex items-center">
            <BrandLogo className="h-8" />
          </div>
        </div>
         
        <motion.div variants={sectionHeaderItem} id="stats-normal-header" className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h4 className="text-[9px] md:text-xs font-bold text-black dark:text-zinc-400 mb-3 flex items-center gap-2 tracking-widest uppercase">
              Ringkasan & Aktivitas
            </h4>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-black dark:text-white leading-[1.1]">
              Aktivitas & <span className="text-zinc-500">Statistik</span>
            </h2>
          </div>
          
          {isEffectiveAdmin && (
            <button
              onClick={handleExportPNG}
              className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all w-fit shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" /> Unduh Laporan (PNG)
            </button>
          )}
        </motion.div>

        {/* Content Condition */}
        {loading ? (
          <div className="w-full flex flex-col gap-6 md:gap-8 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-6 mb-6 md:mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-zinc-200 dark:bg-zinc-800/50 p-3.5 md:p-6 rounded-xl md:rounded-3xl shadow-sm h-28 md:h-40 w-full"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-10">
              <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full"></div>
              <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full"></div>
              <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full lg:col-span-2"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <motion.div variants={childGridContainer} className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-6 mb-6 md:mb-8">
              {/* 1. Pengunjung (Data Agregat Publik) */}
              <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                <Eye className="w-4 h-4 md:w-6 md:h-6 text-blue-500 mb-2 md:mb-4" />
                <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pengunjung</h5>
                <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{pageViews}</p>
              </motion.div>

              {/* 2. Karya (Portofolio Publik) */}
              <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                <ImageIcon className="w-4 h-4 md:w-6 md:h-6 text-purple-500 mb-2 md:mb-4" />
                <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Karya</h5>
                <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{projects.length}</p>
              </motion.div>

              {/* 3. Order (Admin) ATAU Kategori Karya (Publik) */}
              {isEffectiveAdmin ? (
                <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                  <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 text-green-500 mb-2 md:mb-4" />
                  <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Order</h5>
                  <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{orders.length}</p>
                </motion.div>
              ) : (
                <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                  <Tag className="w-4 h-4 md:w-6 md:h-6 text-green-500 mb-2 md:mb-4" />
                  <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Kategori</h5>
                  <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{Object.keys(projectCats).length || 5}</p>
                </motion.div>
              )}

              {/* 4. Blog (Artikel Publik) */}
              <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                <FileText className="w-4 h-4 md:w-6 md:h-6 text-orange-500 mb-2 md:mb-4" />
                <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Blog</h5>
                <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{blogs.length}</p>
              </motion.div>

              {/* 5. Pesan (Admin) ATAU Layanan Unggulan (Publik) */}
              {isEffectiveAdmin ? (
                <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                  <Mail className="w-4 h-4 md:w-6 md:h-6 text-red-500 mb-2 md:mb-4" />
                  <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pesan</h5>
                  <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{messages.length}</p>
                </motion.div>
              ) : (
                <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
                  <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-500 mb-2 md:mb-4" />
                  <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Layanan</h5>
                  <p className="text-xl md:text-4xl font-bold text-black dark:text-white">4 Bidang</p>
                </motion.div>
              )}
            </motion.div>

            {/* Charts Grid */}
            <motion.div variants={sectionContentItem} className="flex justify-center mb-8">
              <button 
                type="button"
                onClick={toggleCharts} 
                className="text-xs md:text-sm font-semibold text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-all flex items-center gap-2 border border-zinc-200/80 dark:border-zinc-800 px-5 py-2.5 rounded-full bg-white dark:bg-[#111111] shadow-xs hover:shadow-md cursor-pointer active:scale-95"
                aria-expanded={showCharts}
              >
                <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{showCharts ? 'Sembunyikan Detail Diagram' : 'Lihat Detail Diagram'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 ml-1">
                  {showCharts ? 'Tutup' : 'Diagram Lengkap'}
                </span>
              </button>
            </motion.div>

            <AnimatePresence>
              {showCharts && (
                <motion.div 
                  key="stats-charts-grid"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12"
                >
                  {/* Bar Chart: Kategori Karya (Data Publik) */}
                  <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col min-w-0 overflow-hidden">
                    <div className="mb-4">
                      <h4 className="text-xs md:text-sm font-bold text-black dark:text-white">Distribusi Kategori Karya</h4>
                      <p className="text-[10px] md:text-xs text-zinc-500">Jumlah portofolio karya terdistribusi berdasarkan kategori</p>
                    </div>
                    
                    <ChartWrapper minHeight={280}>
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {barChartData.map((_entry, index) => (
                            <Cell key={'cell-bar-' + index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartWrapper>
                  </div>

                  {/* Pie Chart: Proporsi Layanan (Admin = Pesanan Asli, Publik = Sebaran Kategori Layanan) */}
                  <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm flex flex-col min-w-0 overflow-hidden">
                    <div className="mb-4">
                      <h4 className="text-xs md:text-sm font-bold text-black dark:text-white">
                        {isEffectiveAdmin ? 'Proporsi Pesanan & Layanan' : 'Fokus & Spesialisasi Layanan'}
                      </h4>
                      <p className="text-[10px] md:text-xs text-zinc-500">
                        {isEffectiveAdmin ? 'Distribusi pesanan desain berdasarkan jenis layanan masuk' : 'Distribusi portofolio dan pilihan layanan visual kreatif'}
                      </p>
                    </div>
                    
                    <ChartWrapper minHeight={280}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieChartData.map((_entry, index) => (
                            <Cell key={'cell-pie-' + index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ChartWrapper>
                  </div>

                  {/* Line Chart: Pertumbuhan Karya (Data Publik) */}
                  <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm lg:col-span-2 flex flex-col min-w-0 overflow-hidden">
                    <div className="mb-4">
                      <h4 className="text-xs md:text-sm font-bold text-black dark:text-white">Pertumbuhan & Riwayat Karya</h4>
                      <p className="text-[10px] md:text-xs text-zinc-500">Tren penambahan karya desain dari waktu ke waktu</p>
                    </div>
                    
                    <ChartWrapper minHeight={280}>
                      <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="Karya" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ChartWrapper>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.section>
  );
}
