import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Mail, Calendar, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function MessagesAdmin() {
 const [messages, setMessages] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [toast, setToast] = useState('');

 useEffect(() => {
  const unsubscribe = onSnapshot(
   collection(db, 'messages'),
   (snapshot) => {
    const msgData: any[] = [];
    snapshot.forEach((doc) => {
     msgData.push({ id: doc.id, ...doc.data() });
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
    console.warn("Messages error:", err);
    setLoading(false);
   }
  );
  return () => unsubscribe();
 }, []);

 const handleDelete = async (id: string) => {
  if (confirm("Hapus pesan ini?")) {
   try {
    await deleteDoc(doc(db, 'messages', id));
    setToast("Pesan dihapus");
    setTimeout(() => setToast(''), 3000);
   } catch (err) {
    console.warn(err);
    setToast("Gagal menghapus pesan");
   }
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
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xl">
     <Check size={16} /> {toast}
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
        className="bg-zinc-50 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800/50 p-6 rounded-2xl flex flex-col md:flex-row gap-6 relative group"
       >
        <div className="flex-1 space-y-3">
         <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-black dark:text-white">
          <span className="text-sm">{msg.name}</span>
          <a href={`mailto:${msg.email}`} className="text-blue-500 hover:underline inline-flex items-center gap-1"><Mail size={12}/> {msg.email}</a>
          <span className="text-zinc-500 inline-flex items-center gap-1 font-medium"><Calendar size={12}/> {formatDate(msg.dateAdded)}</span>
         </div>
         <p className="text-sm text-zinc-700 dark:text-zinc-400 leading-relaxed font-medium">
          {msg.message}
         </p>
        </div>
        <div>
         <button 
          onClick={() => handleDelete(msg.id)} 
          className="p-3 rounded-xl bg-white dark:bg-[#0A0A0A] text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 border border-zinc-200 dark:border-zinc-800 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 active:scale-90 duration-300 shadow-sm"
         >
          <Trash2 size={16} />
         </button>
        </div>
       </motion.div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
