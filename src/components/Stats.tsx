import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Eye, Image as ImageIcon, ShoppingCart, FileText, Mail, BarChart3, Clock, TrendingUp, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';
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

export default function Stats({ isAdmin = false }: { isAdmin?: boolean }) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  
  const handleExportPNG = async () => {
    if (!statsRef.current) return;
    const watermark = document.getElementById('stats-watermark');
    const normalHeader = document.getElementById('stats-normal-header');
    
    const origStyle = statsRef.current.style.cssText;
    
    try {
      const isDark = document.documentElement.classList.contains('dark');
      
      if (watermark) watermark.style.display = 'flex';
      if (normalHeader) normalHeader.style.display = 'none';
      
      // We set width and height directly to make it 5000x5000 after ratio 4
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

      // Convert data URL to Blob for safer downloading of large images
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

  const [pageViews, setPageViews] = useState<number>(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [blogs, setBlogs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    let loadedFlags = { views: false, projects: false, orders: false, blogs: false, msgs: false };
    const checkAllLoaded = () => {
      if (loadedFlags.views && loadedFlags.projects && loadedFlags.orders && loadedFlags.blogs && loadedFlags.msgs) {
        setLoading(false);
      }
    };

    const unsubViews = onSnapshot(
      doc(db, 'stats', 'views'),
      (doc) => {
        if (doc.exists()) {
          setPageViews(doc.data().count || 0);
        }
        loadedFlags.views = true;
        checkAllLoaded();
      },
      (error) => { console.warn('Views stats error:', error); loadedFlags.views = true; checkAllLoaded(); }
    );

    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const activeProjects = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((p: any) => p.isArchived !== true);
        setProjects(activeProjects);
        loadedFlags.projects = true;
        checkAllLoaded();
      },
      (error) => { console.warn('Projects stats error:', error); loadedFlags.projects = true; checkAllLoaded(); }
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const loaded = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((o: any) => o.isArchived !== true);
        setOrders(loaded);
        try { localStorage.setItem('orders', JSON.stringify(loaded)); } catch (e) {}
        loadedFlags.orders = true;
        checkAllLoaded();
      },
      (error) => {
        console.warn('Orders stats error:', error);
        try {
          const saved = localStorage.getItem('orders');
          if (saved) setOrders(JSON.parse(saved));
        } catch (e) {}
        loadedFlags.orders = true;
        checkAllLoaded();
      }
    );

    const unsubBlogs = onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        const activeBlogs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((b: any) => b.isArchived !== true);
        setBlogs(activeBlogs);
        loadedFlags.blogs = true;
        checkAllLoaded();
      },
      (error) => { console.warn('Blogs stats error:', error); loadedFlags.blogs = true; checkAllLoaded(); }
    );

    const unsubMsgs = onSnapshot(
      collection(db, 'messages'),
      (snapshot) => {
        const activeMsgs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter((m: any) => m.isArchived !== true);
        setMessages(activeMsgs);
        loadedFlags.msgs = true;
        checkAllLoaded();
      },
      (error) => { console.warn('Messages stats error:', error); loadedFlags.msgs = true; checkAllLoaded(); }
    );

    return () => {
      unsubViews(); unsubProjects(); unsubOrders(); unsubBlogs(); unsubMsgs();
    };
  }, []);

  const projectCats = projects.reduce((acc, p) => {
    if (p.category) {
      acc[p.category] = (acc[p.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const orderCats = orders.reduce((acc, o) => {
    if (o.layanan) {
      acc[o.layanan] = (acc[o.layanan] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Data for Charts
  const barChartData = Object.entries(projectCats).map(([name, value]) => ({ name, value }));
  const pieChartData = Object.entries(orderCats).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#eab308', '#ec4899', '#06b6d4'];

  const monthlyDataMap: Record<string, { count: number, originalDate: number }> = {};
  projects.forEach(p => {
    let d: Date;
    if (p.dateAdded?.toDate) d = p.dateAdded.toDate();
    else if (p.dateAdded?.toMillis) d = new Date(p.dateAdded.toMillis());
    else d = new Date(p.dateAdded || p.date || 0);
    if (isNaN(d.getTime()) || d.getTime() === 0) return;
    
    // Create a key like "2024-05" for sorting, and a label like "Mei 2024"
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    
    if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { count: 0, originalDate: new Date(year, month, 1).getTime() };
    }
    monthlyDataMap[key].count += 1;
    // Also store label in a map if we want, but we can just format it later
  });

  const lineChartData = Object.entries(monthlyDataMap)
    .sort((a, b) => a[1].originalDate - b[1].originalDate)
    .map(([key, data]) => {
      const d = new Date(data.originalDate);
      const name = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      return { name, Karya: data.count };
    });

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
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "-40px" }}
      variants={sectionStaggerContainer}
      className="w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 scroll-mt-24 md:scroll-mt-32"
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
         
         {isAdmin && (
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
         {/* Skeleton Overview Cards */}
         <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-6 mb-6 md:mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
           <div key={i} className="bg-zinc-200 dark:bg-zinc-800/50 p-3.5 md:p-6 rounded-xl md:rounded-3xl shadow-sm h-28 md:h-40 w-full"></div>
          ))}
         </div>
         {/* Skeleton Charts */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-10">
          <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full"></div>
          <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full"></div>
          <div className="bg-zinc-200 dark:bg-zinc-800/50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm h-72 md:h-96 w-full lg:col-span-2"></div>
         </div>
        </div>
       ) : (
        <>
         {/* Overview Cards with Staggered Entrance */}
         <motion.div variants={childGridContainer} className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-6 mb-6 md:mb-8">
            <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
              <Eye className="w-4 h-4 md:w-6 md:h-6 text-blue-500 mb-2 md:mb-4" />
              <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pengunjung</h5>
              <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{pageViews}</p>
            </motion.div>
            <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
              <ImageIcon className="w-4 h-4 md:w-6 md:h-6 text-purple-500 mb-2 md:mb-4" />
              <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Karya</h5>
              <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{projects.length}</p>
            </motion.div>
            <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
              <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 text-green-500 mb-2 md:mb-4" />
              <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Order</h5>
              <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{orders.length}</p>
            </motion.div>
            <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
              <FileText className="w-4 h-4 md:w-6 md:h-6 text-orange-500 mb-2 md:mb-4" />
              <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Blog</h5>
              <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{blogs.length}</p>
            </motion.div>
            <motion.div variants={childGridCardItem} className="bg-white dark:bg-[#0A0A0A] p-2.5 md:p-6 rounded-lg md:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col justify-center items-center text-center">
              <Mail className="w-4 h-4 md:w-6 md:h-6 text-red-500 mb-2 md:mb-4" />
              <h5 className="text-[9px] md:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pesan</h5>
              <p className="text-xl md:text-4xl font-bold text-black dark:text-white">{messages.length}</p>
            </motion.div>
         </motion.div>

       {/* Charts Grid */}
       <motion.div variants={sectionContentItem} className="flex justify-center mb-8">
           <button 
             onClick={() => setShowCharts(!showCharts)} 
             className="text-[10px] md:text-sm font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-full bg-white dark:bg-[#111111]"
           >
             {showCharts ? 'Sembunyikan Detail Diagram' : 'Lihat Detail Diagram'}
           </button>
         </motion.div>
         {showCharts && (
           <motion.div variants={sectionContentItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
         
         {/* Bar Chart: Kategori Karya */}
         <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
           
           <div className="h-[250px] md:h-[300px] w-full">
             {barChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.2} />
                   <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                   <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} />
                   <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                     {barChartData.map((entry, index) => (
                       <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-xs text-zinc-500">Belum ada data karya.</div>
             )}
           </div>
         </div>

         {/* Pie Chart: Kategori Order */}
         <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
           
           <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
             {pieChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={pieChartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={90}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {pieChartData.map((entry, index) => (
                       <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-xs text-zinc-500">Belum ada data order.</div>
             )}
           </div>
         </div>

         {/* Line Chart: Pertumbuhan Karya */}
         <div className="bg-white dark:bg-[#0A0A0A] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm lg:col-span-2">
           
           <div className="h-[250px] md:h-[300px] w-full">
             {lineChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.2} />
                   <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                   <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                   <Tooltip content={<CustomTooltip />} />
                   <Line type="monotone" dataKey="Karya" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-xs text-zinc-500">Belum ada data riwayat karya.</div>
             )}
           </div>
         </div>

       </motion.div>
       )}
       </>
       )}
    </div>
    </motion.section>
  );
}
