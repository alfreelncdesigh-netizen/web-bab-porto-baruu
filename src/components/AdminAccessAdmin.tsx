import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Shield, Plus, Trash, Check, ShieldAlert, Loader2, UserCheck, Key } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export interface AdminUser {
  id: string;
  email?: string;
  username?: string;
  password?: string;
  status: 'allowed' | 'blocked';
  role?: string;
  addedAt: string;
}

export const MASTER_ADMINS = [
  'albian',
  'alfreelnc',
  'albianavl.co@gmail.com',
  'alfreelnc.desigh@gmail.com'
];

export default function AdminAccessAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    // Pastikan dokumen bawaan master 'albian' tersimpan di Firestore
    const seedMaster = async () => {
      try {
        await setDoc(doc(db, 'adminUsers', 'albian'), {
          username: 'albian',
          role: 'master',
          status: 'allowed',
          addedAt: '2025-01-01T00:00:00.000Z'
        }, { merge: true });
      } catch {}
    };
    seedMaster();

    const unsubscribe = onSnapshot(
      collection(db, 'adminUsers'),
      (snapshot) => {
        const list: AdminUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            username: data.username || docSnap.id,
            email: data.email || (docSnap.id.includes('@') ? docSnap.id : `${docSnap.id}@admin.local`),
            password: data.password || '31102008',
            status: data.status || 'allowed',
            role: data.role || (MASTER_ADMINS.includes(docSnap.id.toLowerCase()) ? 'master' : 'admin'),
            addedAt: data.addedAt || new Date().toISOString()
          } as AdminUser);
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
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newIdentifier.trim().toLowerCase();
    if (!cleanId) return;

    if (cleanId.length < 3) {
      showToast('⚠️ Username atau email minimal 3 karakter.', 'error');
      return;
    }

    // Cek apakah sudah merupakan master admin
    if (MASTER_ADMINS.includes(cleanId)) {
      showToast(`"${cleanId}" sudah memiliki akses Master Admin permanen.`, 'error');
      return;
    }

    if (users.some(u => (u.username?.toLowerCase() === cleanId || u.email?.toLowerCase() === cleanId || u.id.toLowerCase() === cleanId))) {
      showToast(`Username atau email "${cleanId}" sudah ada dalam daftar.`, 'error');
      return;
    }

    setIsAdding(true);
    try {
      const isEmail = cleanId.includes('@');
      const passwordToSet = newPassword.trim() || '31102008';
      
      await setDoc(doc(db, 'adminUsers', cleanId), {
        username: isEmail ? cleanId.split('@')[0] : cleanId,
        email: isEmail ? cleanId : `${cleanId}@admin.local`,
        password: passwordToSet,
        status: 'allowed',
        role: 'admin',
        addedAt: new Date().toISOString()
      });
      
      showToast(`Akses admin untuk "${cleanId}" berhasil ditambahkan.`);
      setNewIdentifier('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menambahkan pengguna ke Firestore.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const checkName = (user.username || user.email || user.id).toLowerCase();
    if (MASTER_ADMINS.includes(checkName)) {
      showToast('Hak akses Master Admin permanen dan tidak dapat diblokir.', 'error');
      return;
    }

    try {
      const newStatus = user.status === 'allowed' ? 'blocked' : 'allowed';
      await updateDoc(doc(db, 'adminUsers', user.id), {
        status: newStatus
      });
      showToast(`Akses ${newStatus === 'allowed' ? 'diizinkan' : 'diblokir'} untuk ${user.username || user.email}`);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status akses.', 'error');
    }
  };

  const handleDelete = (user: AdminUser) => {
    const checkName = (user.username || user.email || user.id).toLowerCase();
    if (MASTER_ADMINS.includes(checkName)) {
      showToast('Master Admin tidak dapat dihapus.', 'error');
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const id = userToDelete.id;

    // Optimistic update
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast(`Admin "${userToDelete.username || userToDelete.email}" dihapus dari akses.`);
    setUserToDelete(null);

    try {
      await deleteDoc(doc(db, 'adminUsers', id));
    } catch (err) {
      console.error("Delete admin user error:", err);
    } finally {
      setIsDeleting(false);
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
          <Shield className="text-zinc-400 w-5 h-5" /> Kelola Akses Administrator
        </h2>
        <p className="text-zinc-500 text-xs max-w-2xl leading-relaxed">
          Kelola username dan email yang diizinkan untuk masuk ke mode admin. Anda dapat menambahkan username baru dengan sandi khusus atau menggunakan sandi standar (<span className="font-mono font-bold text-black dark:text-white">31102008</span>).
        </p>
      </div>

      {/* Formulir Tambah Admin Baru (Bisa Username atau Email) */}
      <div className="bg-zinc-50 dark:bg-[#0A0A0A] p-4 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/50 mb-6 shadow-sm">
        <h3 className="text-xs font-mono font-bold text-black dark:text-white mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Tambah Akses Admin Baru
        </h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          <div className="sm:col-span-6">
            <input
              type="text"
              value={newIdentifier}
              onChange={(e) => setNewIdentifier(e.target.value)}
              placeholder="Username atau email (contoh: albian, desainer, dll)"
              className="w-full bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all font-medium"
              required
            />
          </div>

          <div className="sm:col-span-4">
            <div className="relative">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi (default: 31102008)"
                className="w-full bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all font-mono"
              />
              <Key className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-85 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isAdding ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-mono font-bold text-black dark:text-white mb-2 uppercase tracking-wider">
          Daftar Administrator Terdaftar
        </h3>
        
        {/* Master Admin Card (albian) */}
        <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-[#0A0A0A] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
                albian <span className="text-[10px] text-zinc-400 font-mono font-normal">(Username Utama)</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Master Administrator • Sandi: 31102008</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50 uppercase tracking-wider">
            Full Access
          </span>
        </div>

        {/* Master Admin Card (albianavl.co@gmail.com) */}
        <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-[#0A0A0A] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-black dark:text-white">albianavl.co@gmail.com</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Master Administrator Google</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50 uppercase tracking-wider">
            Full Access
          </span>
        </div>

        {/* Additional Registered Admins */}
        {users
          .filter(u => {
            const idLower = (u.username || u.email || u.id).toLowerCase();
            return idLower !== 'albian' && idLower !== 'albianavl.co@gmail.com' && idLower !== 'alfreelnc.desigh@gmail.com';
          })
          .map((user) => {
            const isBlocked = user.status === 'blocked';
            const displayName = user.username || user.email || user.id;

            return (
              <div 
                key={user.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                  isBlocked 
                    ? 'bg-red-50/20 dark:bg-red-900/5 border-red-200 dark:border-red-900/30 opacity-70' 
                    : 'bg-white dark:bg-[#050505] border-zinc-200 dark:border-zinc-800/60'
                }`}
              >
                <div className="mb-2 sm:mb-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold ${isBlocked ? 'text-zinc-500 line-through' : 'text-black dark:text-white'}`}>
                      {displayName}
                    </p>
                    {isBlocked ? (
                      <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Diblokir
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                    Ditambahkan: {new Date(user.addedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {user.password && user.password !== '31102008' ? ' • [Sandi Khusus]' : ' • Sandi Standar'}
                  </p>
                </div>
                
                <div className="flex items-center gap-1.5 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100 dark:border-zinc-800/50">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      user.status === 'allowed'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30'
                    }`}
                  >
                    {user.status === 'allowed' ? 'Blokir' : 'Buka Akses'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-1.5 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all flex items-center justify-center cursor-pointer"
                    title="Hapus akses admin"
                    aria-label="Hapus admin"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Hapus Akses Admin?"
        message={`Apakah Anda yakin ingin menghapus "${userToDelete?.username || userToDelete?.email || ''}" dari daftar akses admin?`}
        confirmText="Hapus Akses"
        cancelText="Batal"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setUserToDelete(null)}
      />
    </div>
  );
}
