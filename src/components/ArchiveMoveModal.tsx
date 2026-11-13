import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Folder, Plus, FolderDown } from 'lucide-react';
import {
  getStoredProjects,
  saveStoredProjects,
  getStoredBlogs,
  saveStoredBlogs,
  getStoredExperiences,
  saveStoredExperiences
} from '../lib/contentStorage';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted } from '../lib/firestoreErrorHandler';

interface ArchiveFolder {
  id: string;
  name: string;
}

const FOLDERS_CACHE_KEY = 'archive_folders_cache';
const ARCHIVED_ITEMS_CACHE_KEY = 'archived_items_cache';

function readCachedFolders(): ArchiveFolder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function writeCachedFolders(folders: ArchiveFolder[]): void {
  try {
    localStorage.setItem(FOLDERS_CACHE_KEY, JSON.stringify(folders));
  } catch {}
}

function saveArchivedItemToCache(entry: any): void {
  try {
    const raw = localStorage.getItem(ARCHIVED_ITEMS_CACHE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list)
      ? list.filter((i: any) => !(String(i.id) === String(entry.id) && i.type === entry.type))
      : [];
    filtered.unshift(entry);
    localStorage.setItem(ARCHIVED_ITEMS_CACHE_KEY, JSON.stringify(filtered.slice(0, 200)));
  } catch {}
}

export default function ArchiveMoveModal({
  isOpen,
  onClose,
  onSuccess,
  itemType,
  itemId
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folderId: string) => void;
  itemType: 'projects' | 'blogPosts' | 'experiences';
  itemId: string;
}) {
  const [folders, setFolders] = useState<ArchiveFolder[]>(() => readCachedFolders());
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const cached = readCachedFolders();
    if (cached.length > 0) setFolders(cached);

    if (isQuotaExhausted()) return;

    loadFolders();
    const unsub = onSnapshot(collection(db, 'archiveFolders'), (snap) => {
      const cloud: ArchiveFolder[] = [];
      snap.forEach(d => cloud.push({ id: d.id, name: d.data().name }));
      const map = new Map<string, ArchiveFolder>();
      readCachedFolders().forEach(f => map.set(f.id, f));
      cloud.forEach(f => map.set(f.id, f));
      const merged = Array.from(map.values());
      setFolders(merged);
      writeCachedFolders(merged);
    }, (err) => {
      if (isQuotaError(err)) markQuotaExhausted();
      console.warn("Archive modal folder sync warning:", err);
    });

    return () => unsub();
  }, [isOpen]);

  const loadFolders = async () => {
    if (isQuotaExhausted()) return;
    try {
      const snap = await getDocs(collection(db, 'archiveFolders'));
      const cloud: ArchiveFolder[] = [];
      snap.forEach(d => cloud.push({ id: d.id, name: d.data().name }));
      const map = new Map<string, ArchiveFolder>();
      readCachedFolders().forEach(f => map.set(f.id, f));
      cloud.forEach(f => map.set(f.id, f));
      const merged = Array.from(map.values());
      setFolders(merged);
      writeCachedFolders(merged);
    } catch (e) {
      if (isQuotaError(e)) markQuotaExhausted();
      console.warn("Failed to load folders", e);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      let folderId = `folder_${Date.now()}`;
      if (!isQuotaExhausted()) {
        try {
          const ref = await addDoc(collection(db, 'archiveFolders'), {
            name: trimmed,
            createdAt: serverTimestamp()
          });
          folderId = ref.id;
        } catch (err) {
          if (isQuotaError(err)) markQuotaExhausted();
        }
      }
      const newFolder = { id: folderId, name: trimmed };
      setFolders(prev => {
        const next = prev.some(f => f.id === folderId) ? prev : [...prev, newFolder];
        writeCachedFolders(next);
        return next;
      });
      setNewFolderName('');
      setIsCreating(false);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToArchive = async (folderId: string) => {
    setLoading(true);
    const nowIso = new Date().toISOString();
    let itemSnapshot: any = null;

    try {
      if (itemType === 'projects') {
        const stored = getStoredProjects();
        itemSnapshot = stored.find(p => p.id.toString() === itemId) || null;
        const updated = stored.filter(p => p.id.toString() !== itemId);
        await saveStoredProjects(updated);
      } else if (itemType === 'blogPosts') {
        const stored = getStoredBlogs();
        itemSnapshot = stored.find(b => b.id.toString() === itemId) || null;
        const updated = stored.filter(b => b.id.toString() !== itemId);
        await saveStoredBlogs(updated);
      } else if (itemType === 'experiences') {
        const stored = getStoredExperiences();
        itemSnapshot = stored.find(ex => ex.id.toString() === itemId) || null;
        const updated = stored.filter(ex => ex.id.toString() !== itemId);
        await saveStoredExperiences(updated);
      }

      if (itemSnapshot) {
        saveArchivedItemToCache({
          ...itemSnapshot,
          id: itemId,
          type: itemType,
          isArchived: true,
          archiveFolderId: folderId,
          updatedAt: nowIso
        });
      }

      if (!isQuotaExhausted()) {
        try {
          await setDoc(doc(db, itemType, itemId), {
            ...(itemSnapshot || {}),
            isArchived: true,
            archiveFolderId: folderId,
            updatedAt: nowIso,
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true
          }, { merge: true });
        } catch (err) {
          if (isQuotaError(err)) markQuotaExhausted();
          console.warn(err);
        }
      }

      onSuccess(folderId);
      onClose();
    } catch (e) {
      console.warn(e);
      onSuccess(folderId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#111111] w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl relative"
        >
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
            <X size={16} />
          </button>
          
          <h2 className="text-xl font-bold text-black dark:text-white mb-6 flex items-center gap-2">
            <FolderDown className="text-blue-500" />
            Pindahkan ke Arsip
          </h2>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {folders.length === 0 && !isCreating ? (
              <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-zinc-500 text-sm">
                Belum ada folder arsip.
              </div>
            ) : (
              <div className="grid gap-2">
                {folders.map(f => (
                  <button
                    key={f.id}
                    disabled={loading}
                    onClick={() => handleMoveToArchive(f.id)}
                    className="flex items-center gap-3 p-4 text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group disabled:opacity-50"
                  >
                    <Folder className="text-zinc-400 group-hover:text-blue-500" size={20} />
                    <span className="font-semibold text-black dark:text-white">{f.name}</span>
                  </button>
                ))}
              </div>
            )}

            {isCreating ? (
              <form onSubmit={handleCreateFolder} className="flex gap-2 mt-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <input
                  type="text"
                  placeholder="Nama Folder Baru..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-black dark:text-white text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !newFolderName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Buat
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors mt-4"
              >
                <Plus size={18} />
                <span className="font-semibold text-sm">Buat Folder Baru</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
