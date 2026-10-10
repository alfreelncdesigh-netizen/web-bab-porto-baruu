
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Folder, Trash, FolderOpen, ArrowLeft, RefreshCw, FileText, Briefcase, LayoutTemplate, Edit2, Check, X, CheckSquare, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { getOptimizedImageUrl } from '../lib/cloudinary';

interface ArchiveFolder {
  id: string;
  name: string;
}

interface ArchivedItem {
  id: string;
  title: string;
  type: 'projects' | 'blogPosts' | 'experiences';
  image?: string;
}

export default function ArchiveAdmin() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ArchiveFolder | null>(null);
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  // Bulk Selection States
  const [selectedFoldersForBulk, setSelectedFoldersForBulk] = useState<string[]>([]);
  const [selectedItemsForBulk, setSelectedItemsForBulk] = useState<string[]>([]);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadItems(selectedFolder.id);
      setSelectedItemsForBulk([]);
    } else {
      setSelectedFoldersForBulk([]);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'archiveFolders'));
      const f: ArchiveFolder[] = [];
      snap.forEach(d => f.push({ id: d.id, name: d.data().name }));
      setFolders(f);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (folderId: string) => {
    setLoading(true);
    try {
      const itemsList: ArchivedItem[] = [];
      
      const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
      pSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'projects', image: d.data().image }));
      
      const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
      bSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'blogPosts', image: d.data().image }));
      
      const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
      eSnap.forEach(d => itemsList.push({ id: d.id, title: `${d.data().role || ''} at ${d.data().company || ''}`, type: 'experiences', image: (d.data().images && d.data().images.length > 0) ? d.data().images[0] : undefined }));
      
      setItems(itemsList);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const ref = await addDoc(collection(db, 'archiveFolders'), {
        name: newFolderName,
        createdAt: serverTimestamp()
      });
      setFolders([...folders, { id: ref.id, name: newFolderName }]);
      setNewFolderName('');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRenameFolder = async (folderId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
    if (!editFolderName.trim()) return;
    try {
      await updateDoc(doc(db, 'archiveFolders', folderId), { name: editFolderName });
      setFolders(folders.map(f => f.id === folderId ? { ...f, name: editFolderName } : f));
      setEditingFolderId(null);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folderToDelete !== folderId) {
      setFolderToDelete(folderId);
      setTimeout(() => setFolderToDelete(null), 3000);
      return;
    }
    
    try {
      const batch = writeBatch(db);
      
      const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
      pSnap.forEach(d => batch.update(doc(db, 'projects', d.id), { isArchived: false, archiveFolderId: null }));
      
      const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
      bSnap.forEach(d => batch.update(doc(db, 'blogPosts', d.id), { isArchived: false, archiveFolderId: null }));
      
      const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
      eSnap.forEach(d => batch.update(doc(db, 'experiences', d.id), { isArchived: false, archiveFolderId: null }));

      batch.delete(doc(db, 'archiveFolders', folderId));
      
      await batch.commit();
      
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) setSelectedFolder(null);
      setFolderToDelete(null);
    } catch (err) {
      console.warn(err);
      alert('Gagal menghapus folder. Silakan coba lagi.');
    }
  };

  const handleRestore = async (item: ArchivedItem) => {
    try {
      await updateDoc(doc(db, item.type, item.id), {
        isArchived: false,
        archiveFolderId: null
      });
      setItems(items.filter(i => i.id !== item.id));
    } catch (e) {
      console.warn(e);
    }
  };

  // Bulk Actions - Folders
  const toggleFolderSelection = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFoldersForBulk.includes(folderId)) {
      setSelectedFoldersForBulk(selectedFoldersForBulk.filter(id => id !== folderId));
    } else {
      setSelectedFoldersForBulk([...selectedFoldersForBulk, folderId]);
    }
  };

  const toggleAllFolders = () => {
    if (selectedFoldersForBulk.length === folders.length) {
      setSelectedFoldersForBulk([]);
    } else {
      setSelectedFoldersForBulk(folders.map(f => f.id));
    }
  };

  const handleBulkRestoreFolders = async () => {
    if (!confirm(`Yakin ingin merestore semua isi dari ${selectedFoldersForBulk.length} folder dan menghapus foldernya?`)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const folderId of selectedFoldersForBulk) {
        const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
        pSnap.forEach(d => batch.update(doc(db, 'projects', d.id), { isArchived: false, archiveFolderId: null }));
        
        const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
        bSnap.forEach(d => batch.update(doc(db, 'blogPosts', d.id), { isArchived: false, archiveFolderId: null }));
        
        const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
        eSnap.forEach(d => batch.update(doc(db, 'experiences', d.id), { isArchived: false, archiveFolderId: null }));

        batch.delete(doc(db, 'archiveFolders', folderId));
      }
      await batch.commit();
      setFolders(folders.filter(f => !selectedFoldersForBulk.includes(f.id)));
      setSelectedFoldersForBulk([]);
    } catch (e) {
      console.warn(e);
      alert('Gagal memproses bulk restore.');
    }
    setLoading(false);
  };

  const handleBulkDeleteFolders = async () => {
    if (!confirm(`HAPUS PERMANEN ${selectedFoldersForBulk.length} folder beserta SEMUA KARYA/ITEM di dalamnya? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const folderId of selectedFoldersForBulk) {
        const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
        pSnap.forEach(d => batch.delete(doc(db, 'projects', d.id)));
        
        const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
        bSnap.forEach(d => batch.delete(doc(db, 'blogPosts', d.id)));
        
        const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
        eSnap.forEach(d => batch.delete(doc(db, 'experiences', d.id)));

        batch.delete(doc(db, 'archiveFolders', folderId));
      }
      await batch.commit();
      setFolders(folders.filter(f => !selectedFoldersForBulk.includes(f.id)));
      setSelectedFoldersForBulk([]);
    } catch (e) {
      console.warn(e);
      alert('Gagal memproses bulk delete.');
    }
    setLoading(false);
  };

  // Bulk Actions - Items
  const toggleItemSelection = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedItemsForBulk.includes(itemId)) {
      setSelectedItemsForBulk(selectedItemsForBulk.filter(id => id !== itemId));
    } else {
      setSelectedItemsForBulk([...selectedItemsForBulk, itemId]);
    }
  };

  const toggleAllItems = () => {
    if (selectedItemsForBulk.length === items.length) {
      setSelectedItemsForBulk([]);
    } else {
      setSelectedItemsForBulk(items.map(i => i.id));
    }
  };

  const handleBulkRestoreItems = async () => {
    if (!confirm(`Restore ${selectedItemsForBulk.length} item kembali ke halaman utama?`)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const itemId of selectedItemsForBulk) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          batch.update(doc(db, item.type, item.id), { isArchived: false, archiveFolderId: null });
        }
      }
      await batch.commit();
      setItems(items.filter(i => !selectedItemsForBulk.includes(i.id)));
      setSelectedItemsForBulk([]);
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
  };

  const handleBulkDeleteItems = async () => {
    if (!confirm(`HAPUS PERMANEN ${selectedItemsForBulk.length} item? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const itemId of selectedItemsForBulk) {
        const item = items.find(i => i.id === itemId);
        if (item) {
          batch.delete(doc(db, item.type, item.id));
        }
      }
      await batch.commit();
      setItems(items.filter(i => !selectedItemsForBulk.includes(i.id)));
      setSelectedItemsForBulk([]);
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
  };


  if (selectedFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedFolder(null)} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-black dark:text-white">Isi Folder: {selectedFolder.name}</h2>
              <p className="text-sm text-zinc-500">Semua item ini disembunyikan dari halaman publik.</p>
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={toggleAllItems}
              className="px-4 py-2 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {selectedItemsForBulk.length === items.length ? <CheckSquare size={16} /> : <Square size={16} />}
              Pilih Semua
            </button>
          )}
        </div>

        {selectedItemsForBulk.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between animate-in fade-in slide-in-from-top-4 gap-4">
            <span className="font-bold text-blue-700 dark:text-blue-400">
              {selectedItemsForBulk.length} Item Terpilih
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkRestoreItems}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} /> Restore Terpilih
              </button>
              <button
                onClick={handleBulkDeleteItems}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Trash size={16} /> Hapus Permanen
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-zinc-500">Memuat item...</div>
        ) : (
          <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
                <p className="text-zinc-500">Folder ini kosong.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {items.map(item => (
                  <div 
                    key={item.id} 
                    onClick={(e) => toggleItemSelection(item.id, e)}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedItemsForBulk.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    <div className="flex items-center gap-4 mb-3 md:mb-0 w-full md:w-auto overflow-hidden">
                      <div className="text-blue-500 shrink-0">
                        {selectedItemsForBulk.includes(item.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-zinc-400" />}
                      </div>
                      {item.image ? (
                        <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                          <img src={getOptimizedImageUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                          {item.type === 'projects' && <LayoutTemplate size={20} />}
                          {item.type === 'blogPosts' && <FileText size={20} />}
                          {item.type === 'experiences' && <Briefcase size={20} />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-black dark:text-white text-sm md:text-base truncate">{item.title}</h4>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{item.type}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(item); }}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 text-black dark:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-2 md:mt-0"
                    >
                      <RefreshCw size={16} />
                      Keluarkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-black dark:text-white tracking-tight">Manajemen Arsip</h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">
            Buat folder untuk menyimpan karya, blog, atau pengalaman secara pribadi. Konten yang diarsipkan tidak akan tampil di website umum.
          </p>
        </div>
        {folders.length > 0 && (
          <button
            onClick={toggleAllFolders}
            className="px-4 py-2 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            {selectedFoldersForBulk.length === folders.length ? <CheckSquare size={16} /> : <Square size={16} />}
            Pilih Semua
          </button>
        )}
      </div>

      {selectedFoldersForBulk.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between animate-in fade-in slide-in-from-top-4 gap-4">
          <span className="font-bold text-blue-700 dark:text-blue-400">
            {selectedFoldersForBulk.length} Folder Terpilih
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestoreFolders}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              title="Restore semua isinya & hapus folder"
            >
              <RefreshCw size={16} /> Restore Isinya
            </button>
            <button
              onClick={handleBulkDeleteFolders}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              title="Hapus permanen folder & semua isinya"
            >
              <Trash size={16} /> Hapus Permanen
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
        <form onSubmit={handleCreateFolder} className="flex flex-col md:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Nama Folder Baru..."
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            className="flex-1 bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-black dark:text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" disabled={!newFolderName.trim()} className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold disabled:opacity-50">
            Buat Folder
          </button>
        </form>

        {loading ? (
          <div className="text-center py-8 text-zinc-500">Memuat folder...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                Belum ada folder arsip. Buat folder pertama Anda di atas.
              </div>
            ) : (
              folders.map(folder => {
                const isEditing = editingFolderId === folder.id;
                const isSelected = selectedFoldersForBulk.includes(folder.id);
                
                return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className={`group cursor-pointer border p-5 rounded-3xl transition-all flex flex-col justify-between ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 shadow-md' : 'bg-zinc-50 dark:bg-[#0A0A0A] border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-lg'}`}
                >
                  {isEditing ? (
                    <form className="flex items-center gap-2 w-full" onSubmit={(e) => handleRenameFolder(folder.id, e)}>
                      <input
                        autoFocus
                        type="text"
                        value={editFolderName}
                        onChange={e => setEditFolderName(e.target.value)}
                        className="flex-1 min-w-0 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-black dark:text-white focus:outline-none focus:border-blue-500"
                        onClick={e => e.stopPropagation()}
                      />
                      <button type="submit" className="shrink-0 w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors" onClick={e => e.stopPropagation()}>
                        <Check size={16} />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFolderId(null); }} className="shrink-0 w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <button 
                          onClick={(e) => toggleFolderSelection(folder.id, e)}
                          className={`shrink-0 text-zinc-400 hover:text-blue-500 transition-colors ${isSelected ? 'text-blue-500' : ''}`}
                        >
                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <div className="shrink-0 w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                          <Folder size={24} />
                        </div>
                        <span className="font-bold text-black dark:text-white truncate pr-2">{folder.name}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditFolderName(folder.name);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-200 hover:text-black dark:hover:text-white dark:hover:bg-zinc-700 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        {folderToDelete === folder.id ? (
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            className="px-3 h-10 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold text-xs transition-all"
                          >
                            Hapus?
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        )}
      </div>
    </div>
  );
}
