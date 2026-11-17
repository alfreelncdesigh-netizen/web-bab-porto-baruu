import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Mail, Calendar, Check, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmModal from './ConfirmModal';

export default function MessagesAdmin() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const DUMMY_COMMENT_NAMES = new Set(['Rahmat Hidayat', 'Siti Nurhaliza', 'Dimas Pratama', 'Putri Ayu Lestari']);
    const DUMMY_COMMENT_IDS = new Set(['msg_1730000101', 'msg_1730000102', 'msg_1730000103', 'msg_1730000104']);

    const unsubscribe = onSnapshot(
      collection(db, 'messages'),
      (snapshot) => {
        const msgData: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.isDeleted === true ||
            data.status === 'deleted' ||
            DUMMY_COMMENT_IDS.has(docSnap.id) ||
            DUMMY_COMMENT_NAMES.has(String(data.name || '').trim())
          ) {
            return;
          }
          msgData.push({ id: docSnap.id, ...data });
        });
        msgData.sort((a, b) => {
          const timeA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : new Date(a.dateAdded || 0).getTime();
          const timeB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : new Date(b.dateAdded || 0).getTime();
          return timeB - timeA;
        });
        setMessages(msgData);
        setLoading(false);
      },
      (err) => {
        console.error("Messages error:", err);
        showToast(err?.message || "Gagal memuat pesan dari Firestore.", "error");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDelete = (msg: any) => {
    setMessageToDelete(msg);
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    const id = String(messageToDelete.id);

    try {
      await deleteDoc(doc(db, 'messages', id));

      setMessages(prev => prev.filter(m => String(m.id) !== id));
      setMessageToDelete(null);
      window.dispatchEvent(new CustomEvent('message_deleted', { detail: { id } }));
      window.dispatchEvent(new CustomEvent('messages_updated'));
      showToast("Pesan berhasil dihapus dari Firestore.");
    } catch (err: any) {
      console.error("Delete message error:", err);
      showToast(err?.message || "Gagal menghapus pesan dari Firestore.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  if (loading) return <div className="p-8 text-center text-black dark:text-white">Memuat pesan...</div>;

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xl ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-black text-white dark:bg-white dark:text-black'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />} {toast.msg}
        </div>
      )}
      
      <div className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">Pesan Masuk</h3>
        
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 text-sm font-medium">Belum ada pesan masuk.</div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={msg.id} 
                className="bg-zinc-50 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800/50 p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row gap-3 sm:gap-6 relative group"
              >
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold text-black dark:text-white">
                    <span className="text-sm font-bold">{msg.name}</span>
                    <a href={`mailto:${msg.email}`} className="text-blue-500 hover:underline inline-flex items-center gap-1 font-mono text-[11px] truncate max-w-[200px] sm:max-w-none">
                      <Mail size={12}/> {msg.email}
                    </a>
                    <span className="text-zinc-500 inline-flex items-center gap-1 font-mono text-[10px]">
                      <Calendar size={12}/> {formatDate(msg.dateAdded)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
                <div className="flex justify-end pt-2 md:pt-0 border-t md:border-0 border-zinc-200/50 dark:border-zinc-800/50">
                  <button 
                    onClick={() => handleDelete(msg)} 
                    className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#161616] text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 border border-zinc-200 dark:border-zinc-800 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Hapus Pesan"
                  >
                    <Trash2 size={15} />
                    <span className="md:hidden">Hapus</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!messageToDelete}
        title="Hapus Pesan Masuk?"
        message={`Apakah Anda yakin ingin menghapus pesan dari "${messageToDelete?.name || 'Pengguna'}"? Pesan ini akan dihapus permanen.`}
        confirmText="Hapus Pesan"
        cancelText="Batal"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setMessageToDelete(null)}
      />
    </div>
  );
}
