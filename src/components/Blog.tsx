import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlogPost } from '../types/blog';
import { X, ArrowRight, BookOpen, Sparkles, Handshake, MessageSquare, Send, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { getStoredBlogs, saveStoredBlogs, cleanBlogs, mergeBlogs, syncDeletedIdsFromServer } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted, logFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
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
  const [loading, setLoading] = useState(() => {
    const cached = getStoredBlogs().filter(p => p.published);
    return cached.length === 0;
  });

  // Comments state untuk artikel yang sedang dibuka
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentForm, setCommentForm] = useState({ name: '', message: '' });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentToast, setCommentToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showCommentToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setCommentToast({ msg, type });
    setTimeout(() => setCommentToast(null), 3500);
  };

  // Helper styling latar belakang abu-abu dengan efek kaca buram per tema
  const getCardBgByTheme = (currentTheme: string) => {
    if (currentTheme === 'dark') {
      return 'bg-zinc-800/50 hover:bg-zinc-800/70 border-zinc-700/60 backdrop-blur-md shadow-lg shadow-black/25';
    }
    return 'bg-zinc-200/60 hover:bg-zinc-200/80 border-zinc-300/70 backdrop-blur-md shadow-sm hover:shadow-md';
  };

  // Helper styling khusus tombol "Baca Artikel"
  const getButtonClassByTheme = (currentTheme: string) => {
    if (currentTheme === 'dark') {
      return 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25';
  };

  // Refs untuk auto-scroll ke paling atas modal saat artikel dibuka
  const modalRootRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Status tracking artikel blog yang sudah dibaca
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

  // Listener Komentar Real-time untuk artikel yang sedang dipilih
  useEffect(() => {
    if (!selectedPost || !selectedPost.id) {
      setComments([]);
      return;
    }

    const blogId = String(selectedPost.id);
    setLoadingComments(true);
    let isMounted = true;

    const timeoutTimer = setTimeout(() => {
      if (isMounted) setLoadingComments(false);
    }, 2000);

    // Load komentar dari endpoint server lokal terlebih dahulu
    fetch(`/api/blog-comments/${encodeURIComponent(blogId)}`)
      .then(res => res.ok ? res.json() : [])
      .then(serverComments => {
        if (!isMounted || !Array.isArray(serverComments)) return;
        setComments(prev => {
          const map = new Map<string, any>();
          [...serverComments, ...prev].forEach((c: any) => {
            const key = c?.id ? String(c.id) : `${c?.createdAt}_${c?.message}`;
            map.set(key, c);
          });
          return Array.from(map.values()).sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        });
        setLoadingComments(false);
      })
      .catch(() => {});

    let unsub = () => {};
    if (!isQuotaExhausted()) {
      try {
        unsub = onSnapshot(
          collection(db, 'blogPosts', blogId, 'comments'),
          (snapshot) => {
            if (!isMounted) return;
            const loaded: any[] = [];
            snapshot.forEach((d) => {
              loaded.push({ id: d.id, ...d.data() });
            });
            setComments(prev => {
              const map = new Map<string, any>();
              [...prev, ...loaded].forEach((c: any) => {
                const key = c?.id ? String(c.id) : `${c?.createdAt}_${c?.message}`;
                map.set(key, c);
              });
              return Array.from(map.values()).sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
              });
            });
            setLoadingComments(false);
          },
          (error) => {
            if (isQuotaError(error)) markQuotaExhausted();
            logFirestoreError(error, OperationType.LIST, `blogPosts/${blogId}/comments`);
            if (isMounted) setLoadingComments(false);
          }
        );
      } catch (e) {
        if (isMounted) setLoadingComments(false);
      }
    } else {
      setLoadingComments(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
      unsub();
    };
  }, [selectedPost?.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentForm.message.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const blogId = String(selectedPost.id);
    const authorName = commentForm.name.trim() || 'Pengunjung';
    const messageText = commentForm.message.trim();
    const newComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blogId,
      name: authorName,
      message: messageText,
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setComments(prev => [newComment, ...prev]);
    setCommentForm({ name: '', message: '' });

    try {
      await fetch(`/api/blog-comments/${encodeURIComponent(blogId)}`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment)
      });
    } catch {}

    if (!isQuotaExhausted()) {
      try {
        await addDoc(collection(db, 'blogPosts', blogId, 'comments'), newComment);
      } catch (err: any) {
        if (isQuotaError(err)) markQuotaExhausted();
        else logFirestoreError(err, OperationType.CREATE, `blogPosts/${blogId}/comments`);
      }
    }

    showCommentToast("Komentar Anda berhasil dikirim!");
    setIsSubmittingComment(false);
  };

  const formatCommentDate = (dateVal: any): string => {
    if (!dateVal) return 'Baru saja';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Baru saja';
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return 'Baru saja';
    }
  };

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

    // 1. Initial cached data
    const initialBlogs = getStoredBlogs().filter(p => p.published);
    if (initialBlogs.length > 0) {
      setPosts(initialBlogs);
      preloadBlogImages(initialBlogs).then(() => {
        if (isMounted) setLoading(false);
      });
    }

    // 2. Sinkronisasi tombstone & fetch dari endpoint server lokal (/api/blogs)
    (async () => {
      await syncDeletedIdsFromServer();
      try {
        const res = await fetch('/api/blogs');
        const apiBlogs = res.ok ? await res.json() : [];
        if (!isMounted || !Array.isArray(apiBlogs)) return;
        const mergedAll = mergeBlogs(getStoredBlogs(), apiBlogs);
        const published = mergedAll.filter(p => p.published);
        setPosts(published);
        saveStoredBlogs(mergedAll);
        setLoading(false);
      } catch {}
    })();

    // 3. Listener pembaruan kustom
    const handleUpdate = (e: any) => {
      if (!isMounted) return;
      if (e.detail && Array.isArray(e.detail)) {
        const mergedAll = mergeBlogs(e.detail);
        const pub = mergedAll.filter((p: any) => p.published);
        setPosts(pub);
        preloadBlogImages(pub).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    };
    window.addEventListener('blog_posts_updated', handleUpdate);

    // 4. Firestore real-time listener dengan penanganan error & kuota aman
    let unsubscribe = () => {};
    if (!isQuotaExhausted()) {
      try {
        unsubscribe = onSnapshot(
          collection(db, 'blogPosts'),
          (snapshot) => {
            if (!isMounted) return;
            const loadedPosts: BlogPost[] = [];
            snapshot.forEach((docSnap) => {
              loadedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost);
            });
            const mergedAll = mergeBlogs(getStoredBlogs(), loadedPosts);
            const published = mergedAll.filter(p => p.published);
            setPosts(published);
            saveStoredBlogs(mergedAll);
            preloadBlogImages(published).then(() => {
              if (isMounted) setLoading(false);
            });
          },
          (error) => {
            if (isQuotaError(error)) markQuotaExhausted();
            logFirestoreError(error, OperationType.LIST, 'blogPosts');
            if (!isMounted) return;
            const stored = getStoredBlogs().filter(p => p.published);
            setPosts(stored);
            preloadBlogImages(stored).then(() => {
              if (isMounted) setLoading(false);
            });
          }
        );
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    } else {
      setLoading(false);
    }

    // Safety timeout: loading tidak akan pernah menggantung lebih dari 2000ms
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
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
      className="pt-3 sm:pt-5 md:pt-6 pb-6 md:pb-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 w-full max-w-[1536px] mx-auto scroll-mt-24 md:scroll-mt-32"
    >
      <motion.div variants={sectionHeaderItem}>
        <h4 className="text-[9px] md:text-xs font-bold text-black dark:text-zinc-400 mb-2 md:mb-3 flex items-center gap-2 tracking-widest uppercase">
          Catatan & Tulisan Desain
        </h4>
        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 md:mb-6 text-black dark:text-white leading-[1.08]">
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
        <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3.5 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-1 tracking-tight">
            Belum Ada Artikel Blog
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Artikel wawasan desain grafis, tips, dan catatan proses kreatif akan segera dipublikasikan di sini.
          </p>
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

            return visiblePosts.map((post, pIndex) => {
            const rawImg = post.image || (post as any).coverImage;
            const hasImage = Boolean(rawImg && typeof rawImg === 'string' && rawImg.trim() !== '');

            return (
              <motion.article
                variants={childGridCardItem}
                key={post.id ? `blog-${post.id}-${pIndex}` : `blog-idx-${pIndex}`} 
                className={`group cursor-pointer flex flex-col justify-between h-full p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${getCardBgByTheme(theme)}`}
                onClick={() => handleOpenBlogPost(post)}
              >
                  <div className="flex flex-col">
                    {/* Thumbnail: jika ada gambar tampilkan ImageWithSkeleton, jika tidak tampilkan kartu ikon kategori */}
                    {hasImage ? (
                      <div className="w-full mb-3 sm:mb-3.5 aspect-[16/10] overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 shadow-2xs">
                        <ImageWithSkeleton 
                          src={rawImg!} 
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
                    
                    {/* Badge Kategori & Tanggal */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-black dark:text-zinc-300 mb-2 tracking-wider uppercase">
                      <span className="bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 px-2 py-0.5 rounded-full text-black dark:text-zinc-200 shadow-xs text-[10px] font-semibold">
                        {post.category || 'Artikel'}
                      </span>
                      {(post.isCollaboration || post.collaborationPartner) && (
                        <span className="bg-indigo-600/90 text-white border border-indigo-400/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-xs flex items-center gap-1.5">
                          {post.collaborationLogo ? (
                            <img 
                              src={resolveImageUrl(post.collaborationLogo)} 
                              alt={post.collaborationPartner || "Mitra Kolaborasi"} 
                              className="h-3.5 w-auto max-w-[28px] object-contain rounded-xs bg-white/20 p-0.5"
                              loading="lazy"
                              decoding="async"
                              onError={handleImageError}
                            />
                          ) : (
                            <Handshake size={10} />
                          )}
                          <span>{post.collaborationPartner || 'Kolaborasi'}</span>
                        </span>
                      )}
                      <span className="text-zinc-400 dark:text-zinc-500">&bull;</span>
                      <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                        {new Date(post.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Judul Artikel */}
                    <h3 className="text-[13.5px] sm:text-[14px] md:text-[14.5px] font-bold tracking-tight mb-1.5 text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-[1.35] line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Ringkasan Artikel */}
                    {post.content && (
                      <p className="text-zinc-600 dark:text-zinc-400 text-[10.5px] sm:text-[11px] leading-relaxed line-clamp-2 font-normal mb-3.5">
                        {post.content}
                      </p>
                    )}
                  </div>
                  
                  {/* Tombol khusus "Baca Artikel" */}
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
            {/* Tombol Tutup (X) Fixed di Pojok Kanan Atas */}
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
              {/* Kolom Kiri: Menampung Gambar Sampul (Jika Ada) */}
              {(() => {
                const modalImg = selectedPost.image || (selectedPost as any).coverImage;
                const hasModalImg = Boolean(modalImg && typeof modalImg === 'string' && modalImg.trim() !== '');
                if (!hasModalImg) return null;
                return (
                  <div className="w-full md:w-[50%] lg:w-[54%] xl:w-[56%] shrink-0 bg-black md:bg-zinc-50 dark:bg-black md:dark:bg-[#111111] relative flex items-center justify-center p-0 sm:p-5 lg:p-8 border-b md:border-b-0 md:border-r border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="w-full h-auto flex items-center justify-center overflow-hidden rounded-none sm:rounded-xl">
                      <ImageWithSkeleton 
                        src={modalImg!} 
                        alt={selectedPost.title} 
                        className="w-full h-auto max-h-[85vh] md:max-h-[88vh] object-contain block mx-auto rounded-none sm:rounded-lg shadow-sm"
                        containerClassName="relative w-full h-auto flex items-center justify-center overflow-hidden"
                        skeletonClassName="rounded-none sm:rounded-xl"
                      />
                    </div>
                  </div>
                );
              })()}
              
              {/* Kolom Kanan: Menampung judul, tanggal, badge kategori, teks isi artikel, rekomendasi, dan komentar */}
              <div 
                ref={modalContentRef}
                className={`w-full ${Boolean(selectedPost.image || (selectedPost as any).coverImage) ? 'md:w-[50%] lg:w-[46%] xl:w-[44%]' : 'md:w-full'} p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-start md:overflow-y-auto md:max-h-[90vh] pb-10 custom-scrollbar`}
              >
                <div className="flex items-center gap-2.5 text-[11px] font-bold tracking-wider uppercase text-black dark:text-zinc-400 mb-3 sm:mb-4">
                  <span className="bg-zinc-100 dark:bg-[#18181b] border border-zinc-200/50 dark:border-zinc-800/50 px-3 py-1 rounded-full text-black dark:text-zinc-300 shadow-sm text-[11px]">
                    {selectedPost.category || 'Artikel'}
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

                {/* LOGO & TEKS KOLABORASI */}
                {(selectedPost.isCollaboration || selectedPost.collaborationPartner) && (
                  <div className="my-4 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedPost.collaborationLogo ? (
                        <div className="p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0">
                          <img 
                            src={resolveImageUrl(selectedPost.collaborationLogo)} 
                            alt={selectedPost.collaborationPartner || "Mitra Kolaborasi"} 
                            className="h-9 sm:h-10 w-auto max-w-[70px] sm:max-w-[90px] object-contain rounded-lg"
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                          />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Handshake size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[9.5px] md:text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                          {selectedPost.collaborationText || 'Kolaborasi Bersama'}
                        </span>
                        <h4 className="text-xs sm:text-[13px] font-semibold text-black dark:text-white truncate">
                          {selectedPost.collaborationPartner ? `Kolaborasi dengan ${selectedPost.collaborationPartner}` : 'Artikel Kolaborasi Mitra'}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}

                {/* DAFTAR ARTIKEL LAINNYA */}
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

                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      {displayBlogRecommendations.map((item, rIdx) => {
                        const isUnread = !readBlogIds.has(String(item.id));

                        return (
                          <div 
                            key={item.id ? `rec-${item.id}-${rIdx}` : `rec-idx-${rIdx}`} 
                            onClick={() => handleOpenBlogPost(item)}
                            className={`group cursor-pointer flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                              isUnread 
                                ? 'bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40 shadow-xs' 
                                : 'bg-zinc-50/80 hover:bg-zinc-100 dark:bg-[#111111] dark:hover:bg-[#181818] border-zinc-200/60 dark:border-zinc-800/60'
                            }`}
                          >
                            <div>
                              {item.image && item.image.trim() !== '' ? (
                                <div className="w-full mb-2 relative">
                                  <img 
                                    src={resolveImageUrl(item.image)} 
                                    alt={item.title} 
                                    className="w-full h-auto max-h-[140px] object-contain rounded-lg group-hover:scale-105 transition-transform duration-300" 
                                    loading="lazy"
                                    decoding="async"
                                    onError={handleImageError} 
                                  />
                                  {isUnread && (
                                    <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-black"></span>
                                  )}
                                </div>
                              ) : null}

                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                                  {item.category || 'Artikel'}
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

                              <h5 className="text-[11px] sm:text-[12px] font-semibold text-black dark:text-white line-clamp-2 group-hover:text-blue-500 transition-colors leading-snug mb-1">
                                {item.title}
                              </h5>
                            </div>

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

                {/* SEKSI FITUR KOMENTAR ARTIKEL BLOG */}
                <div className="mt-6 pt-6 border-t border-zinc-200/70 dark:border-zinc-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-black dark:text-white tracking-tight">
                        Komentar Pembaca
                      </h4>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                      {comments.length} Komentar
                    </span>
                  </div>

                  {/* Formulir Kirim Komentar */}
                  <form onSubmit={handleSubmitComment} className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        value={commentForm.name}
                        onChange={(e) => setCommentForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nama Anda (opsional)"
                        maxLength={60}
                        className="w-full sm:w-1/2 px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <textarea 
                      required
                      value={commentForm.message}
                      onChange={(e) => setCommentForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tuliskan komentar atau tanggapan Anda tentang artikel ini..."
                      rows={2}
                      maxLength={1000}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex items-center justify-between pt-1">
                      {commentToast && (
                        <span className={`text-[11px] font-medium ${commentToast.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {commentToast.msg}
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentForm.message.trim()}
                        className="ml-auto px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        {isSubmittingComment ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <Send size={11} />
                            <span>Kirim Komentar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Daftar Komentar */}
                  {loadingComments ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px]">Memuat komentar...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-6 px-3 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center">
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        Belum ada komentar untuk artikel ini
                      </p>
                      <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        Jadilah yang pertama memberikan tanggapan atau pertanyaan melalui form di atas!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {comments.map((cm, cIdx) => {
                        const authorInitial = (cm.name && cm.name.trim().length > 0) ? cm.name.trim().charAt(0).toUpperCase() : 'U';
                        return (
                          <div 
                            key={cm.id ? `blog-cm-${cm.id}-${cIdx}` : `blog-cm-idx-${cIdx}`}
                            className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 shadow-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 select-none mt-0.5">
                                {authorInitial}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-[11.5px] font-bold text-black dark:text-white truncate">
                                    {cm.name || 'Pengunjung'}
                                  </h5>
                                  <div className="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                                    <Clock size={10} />
                                    <span>{formatCommentDate(cm.createdAt)}</span>
                                  </div>
                                </div>
                                <p className="text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1 whitespace-pre-wrap break-words">
                                  {cm.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
