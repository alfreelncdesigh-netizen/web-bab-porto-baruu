import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlogPost } from '../types/blog';
import { X, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredBlogs, saveStoredBlogs, cleanBlogs } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import ImageWithSkeleton from './ImageWithSkeleton';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

export interface BlogProps {
  isSecondHalfLoaded?: boolean;
}

export default function Blog({ isSecondHalfLoaded = true }: BlogProps = {}) {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    return getStoredBlogs().filter(p => p.published);
  });
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper styling latar belakang abu-abu dengan efek kaca buram (frosted glass) per tema
  const getCardBgByTheme = (currentTheme: string) => {
    switch (currentTheme) {
      case 'tiffany':
        return 'bg-[#1f1f1f]/65 hover:bg-[#1f1f1f]/85 border-[#2e2e2e]/80 backdrop-blur-md shadow-lg shadow-black/20';
      case 'charcoal':
        return 'bg-[#3C1A47]/50 hover:bg-[#3C1A47]/70 border-[#5a276b]/70 backdrop-blur-md shadow-lg shadow-[#3C1A47]/20';
      case 'cyprus':
        return 'bg-[#004741]/50 hover:bg-[#004741]/70 border-[#007369]/70 backdrop-blur-md shadow-lg shadow-[#004741]/20';
      case 'dark':
        return 'bg-zinc-800/50 hover:bg-zinc-800/70 border-zinc-700/60 backdrop-blur-md shadow-lg shadow-black/25';
      default: // mode terang: abu-abu dengan efek kaca buram halus & elegan
        return 'bg-zinc-200/60 hover:bg-zinc-200/80 border-zinc-300/70 backdrop-blur-md shadow-sm hover:shadow-md';
    }
  };

  // Helper styling khusus tombol "Baca Artikel": mode terang berwarna biru
  const getButtonClassByTheme = (currentTheme: string) => {
    switch (currentTheme) {
      case 'tiffany':
        return 'bg-[#21F1A8] hover:bg-[#1de09b] text-black shadow-md shadow-[#21F1A8]/20';
      case 'charcoal':
        return 'bg-[#B6FF00] hover:bg-[#a4e600] text-black shadow-md shadow-[#B6FF00]/20';
      case 'cyprus':
        return 'bg-[#F0EDE4] hover:bg-white text-[#004741] shadow-md shadow-white/10';
      case 'dark':
        return 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30';
      default: // mode terang: warna biru solid elegan
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25';
    }
  };

  // Refs untuk auto-scroll ke paling atas modal saat artikel dibuka atau berpindah artikel
  const modalRootRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Status tracking artikel blog yang sudah dibaca (disimpan di localStorage)
  const [readBlogIds, setReadBlogIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('read_blog_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markBlogAsRead = (id: string | number) => {
    const idStr = String(id);
    setReadBlogIds(prev => {
      if (prev.has(idStr)) return prev;
      const next = new Set(prev);
      next.add(idStr);
      try {
        localStorage.setItem('read_blog_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleOpenBlogPost = (postToOpen: BlogPost) => {
    markBlogAsRead(postToOpen.id);
    setSelectedPost(postToOpen);

    // Auto-scroll ke paling atas
    setTimeout(() => {
      if (modalRootRef.current) modalRootRef.current.scrollTop = 0;
      if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
    }, 30);
  };

  useEffect(() => {
    if (selectedPost) {
      markBlogAsRead(selectedPost.id);
      const scrollToTop = () => {
        if (modalRootRef.current) modalRootRef.current.scrollTop = 0;
        if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
      };
      scrollToTop();
      const timer = setTimeout(scrollToTop, 60);
      return () => clearTimeout(timer);
    }
  }, [selectedPost?.id]);

  useEffect(() => {
    let isMounted = true;

    const preloadBlogImages = (items: BlogPost[]) => {
      const promises = items.map((b) => {
        const raw = b.image || (b as any).coverImage;
        if (!raw) return Promise.resolve();
        const url = resolveImageUrl(raw);
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 2000);
        });
      });
      return Promise.all(promises);
    };

    // Preload initial cached blogs
    const initialBlogs = getStoredBlogs().filter(p => p.published);
    if (initialBlogs.length > 0) {
      preloadBlogImages(initialBlogs).then(() => {
        if (isMounted) setLoading(false);
      });
    }

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        const pub = e.detail.filter((p: any) => p.published);
        setPosts(pub);
        preloadBlogImages(pub).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    };
    window.addEventListener('blog_posts_updated', handleUpdate);

    const unsubscribe = onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        const loadedPosts: BlogPost[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!data.isArchived) loadedPosts.push({ id: docSnap.id, ...data });
        });
        const cleaned = cleanBlogs(loadedPosts);
        const published = cleaned.filter(p => p.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPosts(published);
        saveStoredBlogs(cleaned);
        preloadBlogImages(published).then(() => {
          if (isMounted) setLoading(false);
        });
      },
      (error) => {
        console.warn("Firestore Blog Error (using stored blogs):", error);
        const stored = getStoredBlogs().filter(p => p.published);
        setPosts(stored);
        preloadBlogImages(stored).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    );

    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('blog_posts_updated', handleUpdate);
    };
  }, []);

  // Daftar artikel yang belum dibaca (tidak termasuk artikel yang sedang dibuka)
  const unreadPosts = posts.filter(
    p => String(p.id) !== String(selectedPost?.id) && !readBlogIds.has(String(p.id))
  );

  // Jika semua sudah dibaca, tampilkan artikel lainnya agar tetap ada rekomendasi artikel
  const displayBlogRecommendations = unreadPosts.length > 0
    ? unreadPosts
    : posts.filter(p => String(p.id) !== String(selectedPost?.id));

  return (
    <motion.section 
      id="blog" 
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      variants={sectionStaggerContainer}
      className="py-6 md:py-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 w-full max-w-[1536px] mx-auto scroll-mt-24 md:scroll-mt-32"
    >
      <motion.div variants={sectionHeaderItem}>
        <h4 className="text-[9px] md:text-xs font-bold text-black dark:text-zinc-400 mb-3 md:mb-4 flex items-center gap-2 tracking-widest uppercase">
          Catatan & Tulisan Desain
        </h4>
        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 md:mb-8 text-black dark:text-white leading-[1.08]">
          Blog <span className="text-black dark:text-zinc-600">Saya</span>
        </h2>
      </motion.div>
        
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-5 lg:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="w-full flex flex-col p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
              <div className="w-full aspect-[16/10] rounded-xl sm:rounded-2xl animate-shimmer mb-3" />
              <div className="w-20 h-3.5 rounded-full animate-shimmer mb-2.5" />
              <div className="w-full h-4 rounded-lg animate-shimmer mb-1.5" />
              <div className="w-4/5 h-4 rounded-lg animate-shimmer mb-2.5" />
              <div className="w-full h-2.5 rounded-full animate-shimmer mb-1" />
              <div className="w-2/3 h-2.5 rounded-full animate-shimmer mb-3" />
              <div className="w-full h-8 rounded-xl animate-shimmer mt-auto" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-5 lg:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="w-full flex flex-col p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40">
              <div className="w-full aspect-[16/10] rounded-xl sm:rounded-2xl animate-shimmer mb-3" />
              <div className="w-20 h-3.5 rounded-full animate-shimmer mb-2.5" />
              <div className="w-full h-4 rounded-lg animate-shimmer mb-1.5" />
              <div className="w-4/5 h-4 rounded-lg animate-shimmer mb-2.5" />
              <div className="w-full h-2.5 rounded-full animate-shimmer mb-1" />
              <div className="w-2/3 h-2.5 rounded-full animate-shimmer mb-3" />
              <div className="w-full h-8 rounded-xl animate-shimmer mt-auto" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div 
          variants={childGridContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-5 lg:gap-6"
        >
          {(() => {
            const is50Limited = !isSecondHalfLoaded;
            const displayLimit = is50Limited ? Math.max(1, Math.ceil(posts.length * 0.5)) : posts.length;
            const visiblePosts = posts.slice(0, displayLimit);

            return visiblePosts.map((post) => {
            const rawImg = post.image || (post as any).coverImage;
            let postImg = rawImg;
            if (!postImg || typeof postImg !== 'string' || !postImg.trim()) {
              const t = (post.title || '').toLowerCase();
              if (t.includes('affinity')) postImg = '/images/editing_tools_3d_1787123977793.jpg';
              else if (t.includes('minimalis') || t.includes('filosofi')) postImg = '/images/minimalist_3d_illustration_1787122966121.jpg';
              else if (t.includes('tipografi') || t.includes('modern')) postImg = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=1200';
              else postImg = '/images/promo_poster_1789471291192.jpg';
            }
            const hasImage = Boolean(postImg && typeof postImg === 'string' && postImg.trim() !== '');

            return (
              <motion.article
                variants={childGridCardItem}
                key={post.id} 
                className={`group cursor-pointer flex flex-col justify-between h-full p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${getCardBgByTheme(theme)}`}
                onClick={() => handleOpenBlogPost(post)}
              >
                  <div className="flex flex-col">
                    {/* Thumbnail: langsung tampilkan gambar lebih besar dan proporsional */}
                    {hasImage ? (
                      <div className="w-full mb-3 sm:mb-3.5 aspect-[16/10] overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 shadow-2xs">
                        <ImageWithSkeleton 
                          src={postImg} 
                          alt={post.title} 
                          className="w-full h-full object-cover rounded-xl sm:rounded-2xl block group-hover:scale-[1.03] transition-transform duration-300" 
                          skeletonClassName="rounded-xl sm:rounded-2xl"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full mb-3 sm:mb-3.5 aspect-[16/10] flex flex-col justify-between p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200/50 dark:border-zinc-800/50 relative overflow-hidden group-hover:scale-[1.01] transition-transform">
                        <BookOpen className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        <span className="text-[9.5px] font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                          {post.category || 'Artikel Desain'}
                        </span>
                      </div>
                    )}
                    
                    {/* Badge Kategori & Tanggal (font-size lebih kecil dan rapi) */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-black dark:text-zinc-300 mb-2 tracking-wider uppercase">
                      <span className="bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 px-2 py-0.5 rounded-full text-black dark:text-zinc-200 shadow-xs text-[10px] font-semibold">
                        {post.category}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500">&bull;</span>
                      <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                        {new Date(post.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Judul Artikel: Dikecilkan sedikit agar seimbang dengan kisi 4 kolom */}
                    <h3 className="text-[13.5px] sm:text-[14px] md:text-[14.5px] font-bold tracking-tight mb-1.5 text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-[1.35] line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Ringkasan Artikel: Teks deskripsi lebih kecil */}
                    {post.content && (
                      <p className="text-zinc-600 dark:text-zinc-400 text-[10.5px] sm:text-[11px] leading-relaxed line-clamp-2 font-normal mb-3.5">
                        {post.content}
                      </p>
                    )}
                  </div>
                  
                  {/* Tombol khusus "Baca Artikel": ukuran teks dan padding lebih proporsional */}
                  <div className="mt-auto pt-1.5">
                    <span className={`w-full py-2 px-3 rounded-xl sm:rounded-2xl inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-[12px] font-bold transition-all duration-200 group-hover:brightness-110 active:scale-[0.98] ${getButtonClassByTheme(theme)}`}>
                      Baca Artikel <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </div>
                </motion.article>
              );
            });
          })()}
        </motion.div>
        )}

      {/* Blog Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 dark:bg-black/85 p-0 md:p-3 lg:p-5 xl:p-6 overflow-hidden"
            onClick={() => setSelectedPost(null)}
          >
            {/* Tombol Tutup (X) Fixed di Pojok Kanan Atas dengan z-index tinggi */}
            <button 
              onClick={() => setSelectedPost(null)} 
              aria-label="Tutup artikel"
              className="fixed top-4 right-4 sm:top-5 sm:right-5 md:absolute md:top-4 md:right-4 z-[130] text-black dark:text-white bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md p-2.5 sm:p-3 rounded-full hover:scale-105 active:scale-95 duration-200 shadow-lg border border-zinc-200/70 dark:border-zinc-700/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div 
              ref={modalRootRef}
              initial={{ scale: 0.98, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.98, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#0A0A0A] w-screen md:w-[98vw] lg:w-[96vw] xl:w-[94vw] 2xl:w-[92vw] md:max-w-7xl lg:max-w-[1450px] xl:max-w-[1600px] 2xl:max-w-[1720px] h-[100dvh] md:h-auto md:max-h-[90vh] rounded-none md:rounded-3xl m-0 md:m-auto border-0 md:border md:border-zinc-200/60 dark:md:border-zinc-800/60 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Kolom Kiri: Menampung Gambar Sampul */}
              {(() => {
                let modalImg = selectedPost.image || (selectedPost as any).coverImage;
                if (!modalImg || typeof modalImg !== 'string' || !modalImg.trim()) {
                  const t = (selectedPost.title || '').toLowerCase();
                  if (t.includes('affinity')) modalImg = '/images/editing_tools_3d_1787123977793.jpg';
                  else if (t.includes('minimalis') || t.includes('filosofi')) modalImg = '/images/minimalist_3d_illustration_1787122966121.jpg';
                  else if (t.includes('tipografi') || t.includes('modern')) modalImg = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=1200';
                  else modalImg = '/images/promo_poster_1789471291192.jpg';
                }
                return (
                  <div className="w-full md:w-[50%] lg:w-[54%] xl:w-[56%] shrink-0 bg-black md:bg-zinc-50 dark:bg-black md:dark:bg-[#111111] relative flex items-center justify-center p-0 sm:p-5 lg:p-8 border-b md:border-b-0 md:border-r border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="w-full h-auto flex items-center justify-center overflow-hidden rounded-none sm:rounded-xl">
                      <ImageWithSkeleton 
                        src={modalImg} 
                        alt={selectedPost.title} 
                        className="w-full h-auto max-h-[85vh] md:max-h-[88vh] object-contain block mx-auto rounded-none sm:rounded-lg shadow-sm"
                        containerClassName="relative w-full h-auto flex items-center justify-center overflow-hidden"
                        skeletonClassName="rounded-none sm:rounded-xl"
                      />
                    </div>
                  </div>
                );
              })()}
              
              {/* Kolom Kanan: Menampung judul, tanggal, badge kategori, dan teks isi artikel */}
              <div 
                ref={modalContentRef}
                className={`w-full ${Boolean(selectedPost.image || (selectedPost as any).coverImage) ? 'md:w-[50%] lg:w-[46%] xl:w-[44%]' : 'md:w-full'} p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-start md:overflow-y-auto md:max-h-[90vh] pb-10 custom-scrollbar`}
              >
                <div className="flex items-center gap-2.5 text-[11px] font-bold tracking-wider uppercase text-black dark:text-zinc-400 mb-3 sm:mb-4">
                  <span className="bg-zinc-100 dark:bg-[#18181b] border border-zinc-200/50 dark:border-zinc-800/50 px-3 py-1 rounded-full text-black dark:text-zinc-300 shadow-sm text-[11px]">
                    {selectedPost.category}
                  </span>
                  <span>&bull;</span>
                  <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                    {new Date(selectedPost.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight mb-4 sm:mb-5 text-black dark:text-white leading-[1.25]">
                  {selectedPost.title}
                </h3>
                
                {selectedPost.content && (
                  <div className="text-zinc-600 dark:text-zinc-300 text-[11.5px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] leading-[1.8] space-y-3.5 whitespace-pre-wrap font-normal pb-4 text-justify [text-justify:inter-word] [text-align-last:left]">
                    {selectedPost.content}
                  </div>
                )}

                {/* LAMPIRAN DAFTAR ARTIKEL YANG BELUM DIBACA (2 Artikel Horizontal) */}
                {displayBlogRecommendations.length > 0 && (
                  <div className="mt-4 pt-5 border-t border-zinc-200/70 dark:border-zinc-800/70">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${unreadPosts.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <h4 className="text-[11px] md:text-xs font-semibold tracking-wide text-black dark:text-white flex items-center gap-1.5">
                          <BookOpen size={13} className="text-blue-500" />
                          {unreadPosts.length > 0 ? 'Bacaan Lainnya' : 'Artikel Blog Lainnya'}
                        </h4>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50">
                        {unreadPosts.length > 0 ? `${unreadPosts.length} belum kamu baca` : `${displayBlogRecommendations.length} tulisan`}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2.5">
                      Mau lanjut membaca? Pilih salah satu tulisan di bawah ini:
                    </p>

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      {displayBlogRecommendations.map((item) => {
                        const isUnread = !readBlogIds.has(String(item.id));

                        return (
                          <div 
                            key={item.id} 
                            onClick={() => handleOpenBlogPost(item)}
                            className={`group cursor-pointer flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                              isUnread 
                                ? 'bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40 shadow-xs' 
                                : 'bg-zinc-50/80 hover:bg-zinc-100 dark:bg-[#111111] dark:hover:bg-[#181818] border-zinc-200/60 dark:border-zinc-800/60'
                            }`}
                          >
                            <div>
                              {/* Thumbnail dengan rasio asli, tanpa shape latar belakang */}
                              {item.image && item.image.trim() !== '' ? (
                                <div className="w-full mb-2 relative">
                                  <img 
                                    src={resolveImageUrl(item.image)} 
                                    alt={item.title} 
                                    className="w-full h-auto max-h-[140px] object-contain rounded-lg group-hover:scale-105 transition-transform duration-300" 
                                    onError={handleImageError} 
                                  />
                                  {isUnread && (
                                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-black"></span>
                                  )}
                                </div>
                              ) : null}

                              {/* Badge Kategori & Status */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                                  {item.category}
                                </span>
                                {isUnread ? (
                                  <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded bg-blue-500 text-white dark:bg-blue-500/20 dark:text-blue-400 shrink-0 flex items-center gap-0.5">
                                    <Sparkles size={8} /> Belum dibaca
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-medium px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 shrink-0">
                                    Sudah dibaca
                                  </span>
                                )}
                              </div>

                              {/* Judul Artikel */}
                              <h5 className="text-[11px] sm:text-[12px] font-semibold text-black dark:text-white line-clamp-2 group-hover:text-blue-500 transition-colors leading-snug mb-1">
                                {item.title}
                              </h5>
                            </div>

                            {/* Footer Kartu */}
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/40 mt-1.5">
                              <span className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                                {new Date(item.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[9px] sm:text-[10px] font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                                Baca <ArrowRight size={10} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
