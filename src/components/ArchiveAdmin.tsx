import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  setDoc,
  onSnapshot,
  serverTimestamp, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Folder, 
  Trash, 
  FolderOpen, 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  Briefcase, 
  LayoutTemplate, 
  Edit2, 
  Check, 
  X, 
  CheckSquare, 
  Square,
  Plus,
  FolderPlus,
  Search,
  AlertCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { Project } from '../data/projects';
import { 
  getStoredProjects, 
  saveStoredProjects, 
  cleanProjects,
  getStoredBlogs,
  saveStoredBlogs,
  getStoredExperiences,
  saveStoredExperiences
} from '../lib/contentStorage';
import { resolveImageUrl } from '../lib/imageResolver';
import ConfirmModal from './ConfirmModal';

interface ArchiveFolder {
  id: string;
  name: string;
}

interface ArchivedItem {
  id: string;
  title: string;
  type: 'projects' | 'blogPosts' | 'experiences';
  image?: string;
  category?: string;
}

export default function ArchiveAdmin() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ArchiveFolder | null>(null);
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Available active works that can be archived
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  
  // Create Archive Form state
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedProjectIdsForNewArchive, setSelectedProjectIdsForNewArchive] = useState<string[]>([]);
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  
  // Add Items to Existing Folder state
  const [selectedProjectIdsForExisting, setSelectedProjectIdsForExisting] = useState<string[]>([]);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  
  // Folder edit / delete states
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  // Confirmation modal state (replacing window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
    secondaryAction?: {
      text: string;
      onAction: () => void | Promise<void>;
    };
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Bulk Selection States inside folder or folder list
  const [selectedFoldersForBulk, setSelectedFoldersForBulk] = useState<string[]>([]);
  const [selectedItemsForBulk, setSelectedItemsForBulk] = useState<string[]>([]);

  // Toast & processing state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadAvailableProjects();

    const unsubFolders = onSnapshot(
      collection(db, 'archiveFolders'),
      (snap) => {
        const f: ArchiveFolder[] = [];
        snap.forEach(d => f.push({ id: d.id, name: d.data().name }));
        setFolders(f);
        setLoading(false);
      },
      (err) => {
        console.warn("Failed to listen to archive folders:", err);
        loadFolders();
      }
    );

    return () => unsubFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadItems(selectedFolder.id);
      setSelectedItemsForBulk([]);
    } else {
      setSelectedFoldersForBulk([]);
    }
  }, [selectedFolder]);

  // Load list of folders
  const loadFolders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'archiveFolders'));
      const f: ArchiveFolder[] = [];
      snap.forEach(d => f.push({ id: d.id, name: d.data().name }));
      setFolders(f);
    } catch (e) {
      console.warn("Failed to load archive folders:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load available unarchived projects
  const loadAvailableProjects = async () => {
    try {
      // Prioritize local storage for instant access
      const stored = getStoredProjects();
      setAvailableProjects(cleanProjects(stored));

      // Check Firestore to get up-to-date projects
      const snap = await getDocs(collection(db, 'projects'));
      if (!snap.empty) {
        const projs: Project[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!data.isArchived) {
            projs.push({ id: docSnap.id, ...data } as Project);
          }
        });
        const cleaned = cleanProjects(projs);
        if (cleaned.length > 0) {
          setAvailableProjects(cleaned);
        }
      }
    } catch (err) {
      console.warn("Failed to load available projects:", err);
    }
  };

  // Load items inside a folder
  const loadItems = async (folderId: string) => {
    setLoading(true);
    try {
      const itemsList: ArchivedItem[] = [];
      
      const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
      pSnap.forEach(d => {
        const data = d.data();
        itemsList.push({ 
          id: d.id, 
          title: data.title || 'Tanpa Judul', 
          type: 'projects', 
          image: data.image,
          category: data.category
        });
      });
      
      const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
      bSnap.forEach(d => {
        const data = d.data();
        itemsList.push({ 
          id: d.id, 
          title: data.title || 'Tanpa Judul', 
          type: 'blogPosts', 
          image: data.image 
        });
      });
      
      const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
      eSnap.forEach(d => {
        const data = d.data();
        itemsList.push({ 
          id: d.id, 
          title: `${data.header || data.role || ''} at ${data.company || ''}`, 
          type: 'experiences', 
          image: (data.images && data.images.length > 0) ? data.images[0] : undefined 
        });
      });
      
      setItems(itemsList);
    } catch (e) {
      console.warn("Error loading archived items:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Folder (with optional selected projects)
  const handleCreateArchive = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    if (!newFolderName.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Create Archive Folder in Firestore
      const folderRef = await addDoc(collection(db, 'archiveFolders'), {
        name: newFolderName.trim(),
        createdAt: serverTimestamp()
      });
      const newFolder: ArchiveFolder = { id: folderRef.id, name: newFolderName.trim() };

      // 2. If user selected projects to include in this archive
      if (selectedProjectIdsForNewArchive.length > 0) {
        const batch = writeBatch(db);
        for (const projId of selectedProjectIdsForNewArchive) {
          const projObj = availableProjects.find(p => p.id.toString() === projId);
          batch.set(doc(db, 'projects', projId), {
            ...(projObj ? {
              title: projObj.title || '',
              category: projObj.category || '',
              image: projObj.image || '',
              description: projObj.description || '',
              date: projObj.date || ''
            } : {}),
            isArchived: true,
            archiveFolderId: folderRef.id,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        await batch.commit();

        // 3. Immediately remove archived works from public website & stored projects
        const currentProjects = getStoredProjects();
        const remaining = currentProjects.filter(p => !selectedProjectIdsForNewArchive.includes(p.id.toString()));
        saveStoredProjects(remaining);
        setAvailableProjects(remaining);
      }

      setFolders(prev => prev.some(f => f.id === newFolder.id) ? prev : [...prev, newFolder]);
      showToast(`Arsip "${newFolder.name}" berhasil dibuat dengan ${selectedProjectIdsForNewArchive.length} karya!`);
      
      // Reset form & close modal
      setNewFolderName('');
      setSelectedProjectIdsForNewArchive([]);
      setIsCreateModalOpen(false);

      // Automatically open the new folder
      setSelectedFolder(newFolder);
    } catch (err: any) {
      console.error("Failed to create archive:", err);
      showToast(err?.message || "Gagal membuat arsip. Silakan coba lagi.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle adding selected projects to the currently active folder
  const handleAddProjectsToCurrentFolder = async () => {
    if (!selectedFolder || selectedProjectIdsForExisting.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      for (const projId of selectedProjectIdsForExisting) {
        const projObj = availableProjects.find(p => p.id.toString() === projId);
        batch.set(doc(db, 'projects', projId), {
          ...(projObj ? {
            title: projObj.title || '',
            category: projObj.category || '',
            image: projObj.image || '',
            description: projObj.description || '',
            date: projObj.date || ''
          } : {}),
          isArchived: true,
          archiveFolderId: selectedFolder.id,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      await batch.commit();

      // Immediately update local stored projects so they disappear from public web
      const currentProjects = getStoredProjects();
      const newlyArchived = currentProjects.filter(p => selectedProjectIdsForExisting.includes(p.id.toString()));
      const remaining = currentProjects.filter(p => !selectedProjectIdsForExisting.includes(p.id.toString()));
      saveStoredProjects(remaining);
      setAvailableProjects(remaining);

      // Append new items to current folder view
      const newArchivedItems: ArchivedItem[] = newlyArchived.map(p => ({
        id: p.id.toString(),
        title: p.title || 'Tanpa Judul',
        type: 'projects',
        image: p.image,
        category: p.category
      }));
      setItems(prev => [...prev, ...newArchivedItems]);

      showToast(`${selectedProjectIdsForExisting.length} karya berhasil dimasukkan ke arsip "${selectedFolder.name}"!`);
      setSelectedProjectIdsForExisting([]);
      setIsAddItemsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to add projects to folder:", err);
      showToast("Gagal memasukkan karya ke arsip.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameFolder = async (folderId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
    if (!editFolderName.trim()) return;
    try {
      await updateDoc(doc(db, 'archiveFolders', folderId), { name: editFolderName.trim() });
      setFolders(folders.map(f => f.id === folderId ? { ...f, name: editFolderName.trim() } : f));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder({ ...selectedFolder, name: editFolderName.trim() });
      }
      setEditingFolderId(null);
      showToast("Nama folder diperbarui.");
    } catch (err) {
      console.warn(err);
      showToast("Gagal memperbarui nama folder.", "error");
    }
  };

  const promptDeleteFolder = (folder: ArchiveFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: `Hapus Folder "${folder.name}"?`,
      message: `Pilih apakah Anda ingin menghapus folder ini dan mengembalikan semua karya di dalamnya agar kembali tampil di website, atau menghapus folder beserta seluruh karyanya secara permanen.`,
      confirmText: 'Kembalikan Karya & Hapus Folder',
      cancelText: 'Batal',
      variant: 'warning',
      secondaryAction: {
        text: 'Hapus Folder & Seluruh Karyanya Secara Permanen',
        onAction: () => executeDeleteFolder(folder.id, 'delete_all')
      },
      onConfirm: () => executeDeleteFolder(folder.id, 'restore_items')
    });
  };

  const executeDeleteFolder = async (folderId: string, mode: 'restore_items' | 'delete_all') => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
      const restoredProjects: Project[] = [];
      const deletedProjectIds = new Set<string>();

      pSnap.forEach(d => {
        if (mode === 'restore_items') {
          batch.set(doc(db, 'projects', d.id), { isArchived: false, archiveFolderId: null }, { merge: true });
          restoredProjects.push({ id: d.id, ...d.data(), isArchived: false, archiveFolderId: null } as unknown as Project);
        } else {
          batch.delete(doc(db, 'projects', d.id));
          deletedProjectIds.add(d.id);
        }
      });
      
      const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
      bSnap.forEach(d => {
        if (mode === 'restore_items') {
          batch.set(doc(db, 'blogPosts', d.id), { isArchived: false, archiveFolderId: null }, { merge: true });
        } else {
          batch.delete(doc(db, 'blogPosts', d.id));
        }
      });
      
      const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
      eSnap.forEach(d => {
        if (mode === 'restore_items') {
          batch.set(doc(db, 'experiences', d.id), { isArchived: false, archiveFolderId: null }, { merge: true });
        } else {
          batch.delete(doc(db, 'experiences', d.id));
        }
      });

      batch.delete(doc(db, 'archiveFolders', folderId));
      await batch.commit();
      
      if (mode === 'restore_items') {
        if (restoredProjects.length > 0) {
          const currentProjects = getStoredProjects();
          const existingIds = new Set(currentProjects.map(p => p.id.toString()));
          const merged = [...restoredProjects.filter(p => !existingIds.has(p.id.toString())), ...currentProjects];
          await saveStoredProjects(merged);
          setAvailableProjects(merged);
        }
        showToast("Folder berhasil dihapus & karyanya kembali tampil di web!");
      } else {
        if (deletedProjectIds.size > 0) {
          const currentProjects = getStoredProjects();
          const remaining = currentProjects.filter(p => !deletedProjectIds.has(p.id.toString()));
          await saveStoredProjects(remaining);
          setAvailableProjects(remaining);
        }
        showToast("Folder dan seluruh isinya berhasil dihapus permanen.");
      }

      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) setSelectedFolder(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      console.warn("Failed to delete folder:", err);
      showToast("Gagal menghapus folder. Silakan coba lagi.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore single item back to public
  const handleRestore = async (item: ArchivedItem) => {
    setIsProcessing(true);
    try {
      await setDoc(doc(db, item.type, item.id), {
        isArchived: false,
        archiveFolderId: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // If it's a project, restore it to stored projects so it immediately displays on web
      if (item.type === 'projects') {
        let projectData: Project | null = null;
        try {
          const docSnap = await getDoc(doc(db, 'projects', item.id));
          if (docSnap.exists()) {
            projectData = { id: docSnap.id, ...docSnap.data(), isArchived: false, archiveFolderId: null } as unknown as Project;
          }
        } catch {}

        if (!projectData) {
          projectData = {
            id: item.id,
            title: item.title,
            category: item.category || 'UI/UX',
            image: item.image || '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            isArchived: false,
            archiveFolderId: null
          } as unknown as Project;
        }

        const current = getStoredProjects();
        const updated = [projectData, ...current.filter(p => p.id.toString() !== item.id)];
        await saveStoredProjects(updated);
        setAvailableProjects(updated);
      } else if (item.type === 'blogPosts') {
        try {
          const docSnap = await getDoc(doc(db, 'blogPosts', item.id));
          if (docSnap.exists()) {
            const bData = { id: docSnap.id, ...docSnap.data(), isArchived: false, archiveFolderId: null };
            const current = getStoredBlogs();
            const updated = [bData, ...current.filter(b => b.id.toString() !== item.id)];
            await saveStoredBlogs(updated as any);
          }
        } catch {}
      } else if (item.type === 'experiences') {
        try {
          const docSnap = await getDoc(doc(db, 'experiences', item.id));
          if (docSnap.exists()) {
            const eData = { id: docSnap.id, ...docSnap.data(), isArchived: false, archiveFolderId: null };
            const current = getStoredExperiences();
            const updated = [eData, ...current.filter(e => e.id.toString() !== item.id)];
            await saveStoredExperiences(updated);
          }
        } catch {}
      }

      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast(`"${item.title}" berhasil dikeluarkan dan kembali tampil di web!`);
    } catch (e: any) {
      console.warn("Failed to restore item:", e);
      showToast("Gagal mengeluarkan karya.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Permanently delete single item
  const handleDeleteItemPermanently = (item: ArchivedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Konten Permanen?',
      message: `HAPUS PERMANEN "${item.title}"? Konten ini akan dihapus selamanya dari arsip dan cloud database. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await deleteDoc(doc(db, item.type, item.id));

          if (item.type === 'projects') {
            const current = getStoredProjects();
            const updated = current.filter(p => p.id.toString() !== item.id);
            await saveStoredProjects(updated);
            setAvailableProjects(updated);
          } else if (item.type === 'blogPosts') {
            const current = getStoredBlogs();
            const updated = current.filter(b => b.id.toString() !== item.id);
            await saveStoredBlogs(updated);
          } else if (item.type === 'experiences') {
            const current = getStoredExperiences();
            const updated = current.filter(e => e.id.toString() !== item.id);
            await saveStoredExperiences(updated);
          }

          setItems(prev => prev.filter(i => i.id !== item.id));
          showToast(`"${item.title}" berhasil dihapus permanen.`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.warn("Failed to delete item:", err);
          showToast("Gagal menghapus konten.", "error");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  // Bulk Selection Toggles
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

  const handleBulkRestoreItems = () => {
    if (selectedItemsForBulk.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Keluarkan ${selectedItemsForBulk.length} Karya ke Web?`,
      message: `Semua karya yang dipilih (${selectedItemsForBulk.length} karya) akan dikeluarkan dari folder arsip ini dan langsung ditampilkan kembali di halaman utama website.`,
      confirmText: 'Keluarkan ke Web',
      cancelText: 'Batal',
      variant: 'primary',
      onConfirm: async () => {
        setIsProcessing(true);
        setLoading(true);
        try {
          const batch = writeBatch(db);
          for (const itemId of selectedItemsForBulk) {
            const item = items.find(i => i.id === itemId);
            if (item) {
              batch.set(doc(db, item.type, item.id), { isArchived: false, archiveFolderId: null, updatedAt: new Date().toISOString() }, { merge: true });
            }
          }
          await batch.commit();

          // Fetch restored projects and update storedProjects
          const restoredProjects: Project[] = [];
          for (const itemId of selectedItemsForBulk) {
            const item = items.find(i => i.id === itemId);
            if (item && item.type === 'projects') {
              try {
                const docSnap = await getDoc(doc(db, 'projects', itemId));
                if (docSnap.exists()) {
                  restoredProjects.push({ id: docSnap.id, ...docSnap.data(), isArchived: false, archiveFolderId: null } as unknown as Project);
                }
              } catch {}
            }
          }

          if (restoredProjects.length > 0) {
            const currentProjects = getStoredProjects();
            const existingIds = new Set(currentProjects.map(p => p.id.toString()));
            const merged = [
              ...restoredProjects.filter(p => !existingIds.has(p.id.toString())),
              ...currentProjects
            ];
            await saveStoredProjects(merged);
            setAvailableProjects(merged);
          }

          setItems(prev => prev.filter(i => !selectedItemsForBulk.includes(i.id)));
          showToast(`${selectedItemsForBulk.length} karya berhasil dikembalikan ke website publik!`);
          setSelectedItemsForBulk([]);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          console.warn("Failed to bulk restore:", e);
          showToast("Gagal memproses pengembalian karya.", "error");
        } finally {
          setIsProcessing(false);
          setLoading(false);
        }
      }
    });
  };

  const handleBulkDeleteItems = () => {
    if (selectedItemsForBulk.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `HAPUS PERMANEN ${selectedItemsForBulk.length} Karya?`,
      message: `Tindakan ini tidak bisa dibatalkan! ${selectedItemsForBulk.length} karya terpilih akan dihapus selamanya dari arsip dan cloud database.`,
      confirmText: 'Hapus Semua Terpilih',
      cancelText: 'Batal',
      variant: 'danger',
      onConfirm: async () => {
        setIsProcessing(true);
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

          const currentProjects = getStoredProjects();
          const remaining = currentProjects.filter(p => !selectedItemsForBulk.includes(p.id.toString()));
          await saveStoredProjects(remaining);
          setAvailableProjects(remaining);

          setItems(prev => prev.filter(i => !selectedItemsForBulk.includes(i.id)));
          setSelectedItemsForBulk([]);
          showToast(`${selectedItemsForBulk.length} karya berhasil dihapus permanen.`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          console.warn("Failed to bulk delete:", e);
          showToast("Gagal memproses bulk delete.", "error");
        } finally {
          setIsProcessing(false);
          setLoading(false);
        }
      }
    });
  };

  // Toggle selection for creating a new archive
  const toggleProjectForNewArchive = (id: string) => {
    if (selectedProjectIdsForNewArchive.includes(id)) {
      setSelectedProjectIdsForNewArchive(prev => prev.filter(pId => pId !== id));
    } else {
      setSelectedProjectIdsForNewArchive(prev => [...prev, id]);
    }
  };

  const toggleAllForNewArchive = (filteredList: Project[]) => {
    const filteredIds = filteredList.map(p => p.id.toString());
    const allSelected = filteredIds.every(id => selectedProjectIdsForNewArchive.includes(id));
    if (allSelected) {
      setSelectedProjectIdsForNewArchive(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProjectIdsForNewArchive(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Toggle selection for adding to existing folder
  const toggleProjectForExisting = (id: string) => {
    if (selectedProjectIdsForExisting.includes(id)) {
      setSelectedProjectIdsForExisting(prev => prev.filter(pId => pId !== id));
    } else {
      setSelectedProjectIdsForExisting(prev => [...prev, id]);
    }
  };

  const toggleAllForExisting = (filteredList: Project[]) => {
    const filteredIds = filteredList.map(p => p.id.toString());
    const allSelected = filteredIds.every(id => selectedProjectIdsForExisting.includes(id));
    if (allSelected) {
      setSelectedProjectIdsForExisting(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedProjectIdsForExisting(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Filtered available projects for Modals
  const filteredProjectsForCreate = availableProjects.filter(p => {
    if (!createSearchQuery.trim()) return true;
    const q = createSearchQuery.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const filteredProjectsForAdd = availableProjects.filter(p => {
    if (!addSearchQuery.trim()) return true;
    const q = addSearchQuery.toLowerCase();
    return (p.title || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  // ==========================================
  // VIEW: INSIDE A SPECIFIC FOLDER
  // ==========================================
  if (selectedFolder) {
    return (
      <div className="space-y-6 relative">
        {toast && (
          <div className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border animate-fadeIn ${
            toast.type === 'error' ? 'bg-red-500/95 text-white border-red-400' : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedFolder(null)} 
              className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-black dark:text-white transition-colors"
              title="Kembali ke Daftar Folder"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="text-blue-500" size={22} />
                <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">{selectedFolder.name}</h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Semua karya di folder ini tersimpan aman & disembunyikan dari halaman utama web.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                loadAvailableProjects();
                setSelectedProjectIdsForExisting([]);
                setIsAddItemsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              Masukkan Karya ke Arsip
            </button>

            <button
              onClick={() => promptDeleteFolder(selectedFolder)}
              className="px-3.5 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border border-red-200 dark:border-red-900/40"
              title="Hapus folder arsip ini"
            >
              <Trash size={15} />
              Hapus Folder
            </button>

            {items.length > 0 && (
              <button
                onClick={toggleAllItems}
                className="px-3.5 py-2.5 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {selectedItemsForBulk.length === items.length ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} />}
                Pilih Semua
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedItemsForBulk.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
            <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
              {selectedItemsForBulk.length} Karya Terpilih
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkRestoreItems}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw size={14} /> Keluarkan Terpilih ke Web
              </button>
              <button
                onClick={handleBulkDeleteItems}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Trash size={14} /> Hapus Permanen
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Memuat karya di arsip...</div>
        ) : (
          <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
                <p className="text-zinc-600 dark:text-zinc-400 font-semibold mb-2">Folder arsip ini masih kosong.</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-5">Klik tombol di bawah untuk memilih karya desain yang ingin dimasukkan ke dalam folder ini.</p>
                <button
                  onClick={() => {
                    loadAvailableProjects();
                    setSelectedProjectIdsForExisting([]);
                    setIsAddItemsModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Plus size={16} /> Masukkan Karya Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {items.map(item => {
                  const isSelected = selectedItemsForBulk.includes(item.id);
                  return (
                    <div 
                      key={item.id} 
                      onClick={(e) => toggleItemSelection(item.id, e)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 shadow-sm' 
                          : 'bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className="text-blue-500 shrink-0">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-zinc-400" />}
                        </div>
                        {item.image ? (
                          <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <img src={resolveImageUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <LayoutTemplate size={20} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-black dark:text-white text-xs sm:text-sm truncate">{item.title}</h4>
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{item.category || item.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(item); }}
                          title="Keluarkan & tampilkan kembali di website publik"
                          className="px-2.5 py-1.5 bg-zinc-200/80 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-zinc-800 dark:text-zinc-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span className="hidden sm:inline">Keluarkan</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItemPermanently(item, e)}
                          title="Hapus permanen"
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: Tambah Karya ke Folder Yang Sedang Dibuka */}
        <AnimatePresence>
          {isAddItemsModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#111111] w-full max-w-2xl rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <Plus size={18} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-black dark:text-white">Masukkan Karya ke Arsip</h3>
                      <p className="text-xs text-zinc-500">Folder: <span className="font-semibold text-blue-500">{selectedFolder.name}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAddItemsModalOpen(false)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search & Select All */}
                <div className="py-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder="Cari karya desain..."
                      value={addSearchQuery}
                      onChange={e => setAddSearchQuery(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-black dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {filteredProjectsForAdd.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleAllForExisting(filteredProjectsForAdd)}
                      className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-black dark:text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <CheckSquare size={14} />
                      {filteredProjectsForAdd.every(p => selectedProjectIdsForExisting.includes(p.id.toString())) ? 'Batalkan Semua' : 'Pilih Semua'}
                    </button>
                  )}
                </div>

                {/* Projects Grid for Selection */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-2 min-h-[220px]">
                  {filteredProjectsForAdd.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 text-xs sm:text-sm">
                      {availableProjects.length === 0 ? 'Semua karya saat ini sudah diarsipkan atau belum ada karya aktif.' : 'Tidak ada karya yang sesuai dengan pencarian.'}
                    </div>
                  ) : (
                    filteredProjectsForAdd.map(project => {
                      const idStr = project.id.toString();
                      const isSelected = selectedProjectIdsForExisting.includes(idStr);

                      return (
                        <div
                          key={idStr}
                          onClick={() => toggleProjectForExisting(idStr)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 shadow-xs' 
                              : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-blue-500 shrink-0">
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-zinc-400" />}
                            </div>
                            {project.image ? (
                              <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                <img src={resolveImageUrl(project.image)} alt={project.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-11 h-11 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <LayoutTemplate size={18} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 pr-2">
                              <h5 className="font-bold text-black dark:text-white text-xs sm:text-sm truncate">{project.title}</h5>
                              <span className="text-[10px] text-zinc-500 font-medium">{project.category || 'UI/UX'} • {project.date || 'Terbaru'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-500">
                    {selectedProjectIdsForExisting.length} Karya Dipilih
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddItemsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={selectedProjectIdsForExisting.length === 0 || isProcessing}
                      onClick={handleAddProjectsToCurrentFolder}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isProcessing ? 'Memproses...' : `Masukkan (${selectedProjectIdsForExisting.length}) Karya`}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          variant={confirmModal.variant}
          secondaryAction={confirmModal.secondaryAction}
          isProcessing={isProcessing}
          onConfirm={confirmModal.onConfirm}
          onClose={() => !isProcessing && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW: FOLDERS OVERVIEW (HOME OF ARCHIVE)
  // ==========================================
  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border animate-fadeIn ${
          toast.type === 'error' ? 'bg-red-500/95 text-white border-red-400' : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header with Prominent "Buat Arsip" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight flex items-center gap-2.5">
            <Folder className="text-blue-500" size={28} />
            Manajemen Arsip
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xl">
            Buat folder arsip dan simpan gambar karya pilihan Anda secara rapi. Karya yang diarsipkan akan disembunyikan dari halaman utama web dan bisa dikembalikan kapan saja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadAvailableProjects();
              setSelectedProjectIdsForNewArchive([]);
              setNewFolderName('');
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-xs sm:text-sm hover:opacity-85 transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <FolderPlus size={18} />
            + Buat Arsip
          </button>
        </div>
      </div>

      {/* Main Folder Grid */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">Daftar Folder Arsip</h3>
          <span className="text-xs text-zinc-500">{folders.length} Folder</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500 font-medium">Memuat folder arsip...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.length === 0 ? (
              <div className="col-span-full text-center py-16 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8">
                <FolderOpen className="mx-auto text-zinc-400 mb-3" size={44} />
                <h4 className="font-bold text-black dark:text-white text-base mb-1">Belum Ada Folder Arsip</h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto mb-5">Buat folder arsip pertama Anda dan pilih gambar karya yang ingin dimasukkan ke dalam arsip.</p>
                <button
                  onClick={() => {
                    loadAvailableProjects();
                    setSelectedProjectIdsForNewArchive([]);
                    setNewFolderName('');
                    setIsCreateModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                >
                  <Plus size={16} /> Buat Arsip Sekarang
                </button>
              </div>
            ) : (
              folders.map(folder => {
                const isEditing = editingFolderId === folder.id;

                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder)}
                    className="group cursor-pointer border p-5 rounded-3xl transition-all flex flex-col justify-between bg-zinc-50/70 dark:bg-[#0A0A0A] border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-lg"
                  >
                    {isEditing ? (
                      <form className="flex items-center gap-2 w-full" onSubmit={(e) => handleRenameFolder(folder.id, e)}>
                        <input
                          autoFocus
                          type="text"
                          value={editFolderName}
                          onChange={e => setEditFolderName(e.target.value)}
                          className="flex-1 min-w-0 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:border-blue-500"
                          onClick={e => e.stopPropagation()}
                        />
                        <button type="submit" className="shrink-0 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors" onClick={e => e.stopPropagation()}>
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFolderId(null); }} className="shrink-0 w-9 h-9 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                          <X size={15} />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="shrink-0 w-11 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <Folder size={22} />
                          </div>
                          <div className="min-w-0 pr-1">
                            <span className="font-bold text-black dark:text-white text-sm truncate block">{folder.name}</span>
                            <span className="text-[10px] text-zinc-400 group-hover:text-blue-500 font-medium transition-colors">Buka Folder &rarr;</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(folder.id);
                              setEditFolderName(folder.name);
                            }}
                            title="Ubah nama"
                            className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-200 hover:text-black dark:hover:text-white dark:hover:bg-zinc-700 transition-all cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={(e) => promptDeleteFolder(folder, e)}
                            title="Hapus folder arsip"
                            className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL: BUAT ARSIP BARU + PILIH KARYA */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111111] w-full max-w-2xl rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <FolderPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-black dark:text-white">Buat Arsip Baru</h3>
                    <p className="text-xs text-zinc-500">Beri nama folder arsip dan pilih karya yang ingin langsung dimasukkan.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Input Folder Name */}
              <div className="pt-4 pb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                  Nama Folder Arsip
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Arsip Karya 2024, Desain Logo, Proyek Lawas..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-black dark:text-white outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Work Selection Section */}
              <div className="py-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                    Pilih Karya Desain untuk Dimasukkan
                  </h4>
                  <p className="text-[11px] text-zinc-500">Opsional. Karya terpilih akan otomatis diarsipkan & hilang dari halaman utama web.</p>
                </div>

                {filteredProjectsForCreate.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleAllForNewArchive(filteredProjectsForCreate)}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-black dark:text-white rounded-xl text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare size={13} />
                    {filteredProjectsForCreate.every(p => selectedProjectIdsForNewArchive.includes(p.id.toString())) ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {/* Search Filter */}
              <div className="relative my-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                <input
                  type="text"
                  placeholder="Cari karya berdasarkan judul atau kategori..."
                  value={createSearchQuery}
                  onChange={e => setCreateSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-black dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* List of projects to choose from */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 py-2 min-h-[180px] max-h-[300px]">
                {filteredProjectsForCreate.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 text-xs">
                    {availableProjects.length === 0 ? 'Belum ada karya aktif yang dapat diarsipkan.' : 'Tidak ada karya yang sesuai dengan kata kunci pencarian.'}
                  </div>
                ) : (
                  filteredProjectsForCreate.map(project => {
                    const idStr = project.id.toString();
                    const isSelected = selectedProjectIdsForNewArchive.includes(idStr);

                    return (
                      <div
                        key={idStr}
                        onClick={() => toggleProjectForNewArchive(idStr)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 shadow-xs' 
                            : 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="text-blue-500 shrink-0">
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-zinc-400" />}
                          </div>
                          {project.image ? (
                            <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                              <img src={resolveImageUrl(project.image)} alt={project.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                              <LayoutTemplate size={18} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 pr-2">
                            <h5 className="font-bold text-black dark:text-white text-xs sm:text-sm truncate">{project.title}</h5>
                            <span className="text-[10px] text-zinc-500 font-medium">{project.category || 'UI/UX'} • {project.date || 'Terbaru'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-500">
                  {selectedProjectIdsForNewArchive.length} Karya Dipilih
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!newFolderName.trim() || isProcessing}
                    onClick={handleCreateArchive}
                    className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isProcessing ? 'Menyimpan...' : selectedProjectIdsForNewArchive.length > 0 ? `Buat Arsip & Masukkan (${selectedProjectIdsForNewArchive.length}) Karya` : 'Buat Arsip'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        secondaryAction={confirmModal.secondaryAction}
        isProcessing={isProcessing}
        onConfirm={confirmModal.onConfirm}
        onClose={() => !isProcessing && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
