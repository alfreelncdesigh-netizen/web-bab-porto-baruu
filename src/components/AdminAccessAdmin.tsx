import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Shield, Plus, Trash, Check, X, ShieldAlert, Loader2 } from 'lucide-react';

export interface AdminUser {
  id: string;
  email: string;
  status: 'allowed' | 'blocked';
  addedAt: string;
}

export const MASTER_ADMINS = [
  'alfreelnc.desigh@gmail.com',
  'albianavl.co@gmail.com'
];

export default function AdminAccessAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'adminUsers'),
      (snapshot) => {
        const list: AdminUser[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AdminUser);
        });
        setUsers(list.sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
      },
      (error) => {
        console.error("Error fetching admin users:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    // Validate email format strict Google account
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:gmail\.com|googlemail\.com)$/i;
    if (!emailRegex.test(newEmail.trim())) {
      showToast('⚠️ Gagal: Pengetikan salah atau akun bukan Google (@gmail.com). Pastikan format benar dan terbaca.', 'error');
      return;
    }

    if (MASTER_ADMINS.includes(newEmail.trim().toLowerCase())) {
      showToast('Master admin sudah memiliki akses penuh permanen.', 'error');
      return;
    }

    if (users.some(u => u.email === newEmail.trim().toLowerCase())) {
      showToast('Email sudah ada dalam daftar.', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const email = newEmail.trim().toLowerCase();
      // Use email as document ID
      const docId = email;
      
      await setDoc(doc(db, 'adminUsers', docId), {
        email: email,
        status: 'allowed',
        addedAt: new Date().toISOString()
      });
      
      showToast('Pengguna berhasil ditambahkan.');
      setNewEmail('');
    } catch (err) {
      console.error(err);
      showToast('Gagal menambahkan pengguna.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (MASTER_ADMINS.includes(user.email.toLowerCase())) return;
    try {
      const newStatus = user.status === 'allowed' ? 'blocked' : 'allowed';
      await updateDoc(doc(db, 'adminUsers', user.id), {
        status: newStatus
      });
      showToast(`Akses ${newStatus === 'allowed' ? 'diizinkan' : 'diblokir'} untuk ${user.email}`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus pengguna ini dari daftar akses?')) {
      try {
        await deleteDoc(doc(db, 'adminUsers', id));
        showToast('Pengguna dihapus.');
      } catch (err) {
        console.error(err);
        showToast('Gagal menghapus.', 'error');
      }
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full flex items-center gap-2.5 text-xs font-bold shadow-2xl backdrop-blur-md border ${
              toast.type === 'error' ? 'bg-red-500/95 text-white border-red-400' : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
            }`}
          >
            {toast.type === 'error' ? <ShieldAlert size={16} /> : <Check size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-black dark:text-white mb-1 flex items-center gap-2">
          <Shield className="text-zinc-400 w-5 h-5" /> Akses Administrator
        </h2>
        <p className="text-zinc-500 text-xs max-w-2xl">
          Kelola email yang diizinkan untuk mengakses dasbor admin ini. Master Administrator ({MASTER_ADMINS.join(', ')}) memiliki akses penuh permanen.
        </p>
      </div>

      <div className="bg-zinc-50 dark:bg-[#0A0A0A] p-4 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 mb-6 shadow-sm">
        <h3 className="text-xs font-mono font-bold text-black dark:text-white mb-3 uppercase tracking-wider">Tambah Admin Baru</h3>
        <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="contoh@gmail.com"
            className="flex-1 bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
            required
          />
          <button
            type="submit"
            disabled={isAdding}
            className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg text-xs font-bold hover:opacity-80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {isAdding ? <Loader2 className="animate-spin w-3 h-3" /> : <Plus className="w-3 h-3" />}
            Izinkan Akses
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-mono font-bold text-black dark:text-white mb-3 uppercase tracking-wider">Daftar Admin</h3>
        
        {/* Master Admin Cards */}
        {MASTER_ADMINS.map(adminEmail => (
          <div key={adminEmail} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-[#0A0A0A] rounded-xl border border-zinc-200 dark:border-zinc-800/50">
            <div>
              <p className="text-xs font-bold text-black dark:text-white">{adminEmail}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Master Administrator</p>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800/50 uppercase tracking-wider">
              Full Access
            </span>
          </div>
        ))}

        {/* Other Admins */}
        {users.filter(u => !MASTER_ADMINS.includes(u.email.toLowerCase())).map(user => (
          <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all duration-300 ${user.status === 'blocked' ? 'bg-red-50/30 dark:bg-red-900/5 border-red-100 dark:border-red-900/20' : 'bg-white dark:bg-[#050505] border-zinc-200 dark:border-zinc-800/50'}`}>
            <div className="mb-2 sm:mb-0">
              <p className={`text-xs font-bold ${user.status === 'blocked' ? 'text-zinc-500 dark:text-zinc-500 line-through' : 'text-black dark:text-white'}`}>
                {user.email}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Ditambahkan: {new Date(user.addedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100 dark:border-zinc-800/50">
              <button
                onClick={() => handleToggleStatus(user)}
                className={`flex-1 sm:flex-none px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  user.status === 'allowed'
                    ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-500 dark:border-amber-800/30'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-500 dark:border-emerald-800/30'
                }`}
              >
                {user.status === 'allowed' ? 'Blokir' : 'Buka'}
              </button>
              
              <button
                onClick={() => handleDelete(user.id)}
                className="px-2 py-1 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all flex items-center gap-1.5 shrink-0 text-[10px] font-bold uppercase tracking-wider"
                title="Hapus secara permanen"
              >
                <Trash size={12} /> <span className="sm:hidden">Hapus</span>
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-center text-sm text-zinc-500 py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            Belum ada admin tambahan.
          </p>
        )}
      </div>
    </div>
  );
}
