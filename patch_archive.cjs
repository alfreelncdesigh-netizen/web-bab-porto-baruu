const fs = require('fs');

let content = fs.readFileSync('src/components/ArchiveAdmin.tsx', 'utf8');

// Update Interface
content = content.replace(
  "type: 'projects' | 'blogPosts' | 'experiences';\n}",
  "type: 'projects' | 'blogPosts' | 'experiences';\n  image?: string;\n}"
);

// Update loadItems to include image
content = content.replace(
  "pSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'projects' }));",
  "pSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'projects', image: d.data().image }));"
);
content = content.replace(
  "bSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'blogPosts' }));",
  "bSnap.forEach(d => itemsList.push({ id: d.id, title: d.data().title || 'Tanpa Judul', type: 'blogPosts', image: d.data().image }));"
);
// Experience mostly uses `images` array but let's grab the first one if it exists
content = content.replace(
  "eSnap.forEach(d => itemsList.push({ id: d.id, title: `${d.data().role || ''} at ${d.data().company || ''}`, type: 'experiences' }));",
  "eSnap.forEach(d => itemsList.push({ id: d.id, title: `${d.data().role || ''} at ${d.data().company || ''}`, type: 'experiences', image: (d.data().images && d.data().images.length > 0) ? d.data().images[0] : undefined }));"
);

// Add editing folder state
content = content.replace(
  "const [newFolderName, setNewFolderName] = useState('');",
  "const [newFolderName, setNewFolderName] = useState('');\n  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);\n  const [editFolderName, setEditFolderName] = useState('');"
);

// Update Lucide imports
content = content.replace(
  "import { Folder, Trash, FolderOpen, ArrowLeft, RefreshCw, FileText, Briefcase, LayoutTemplate } from 'lucide-react';",
  "import { Folder, Trash, FolderOpen, ArrowLeft, RefreshCw, FileText, Briefcase, LayoutTemplate, Edit2, Check, X } from 'lucide-react';"
);

// Add optimized image util
content = content.replace(
  "import { motion } from 'motion/react';",
  "import { motion } from 'motion/react';\nimport { getOptimizedImageUrl } from '../lib/cloudinary';"
);

// Function logic for rename and delete
const replacementFunctions = `
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
    if (!confirm('Hapus folder ini? SEMUA ITEM di dalamnya akan dikeluarkan dari arsip dan kembali tampil di halaman utama.')) return;
    try {
      // Restore all items
      const pSnap = await getDocs(query(collection(db, 'projects'), where('archiveFolderId', '==', folderId)));
      for (const d of pSnap.docs) await updateDoc(doc(db, 'projects', d.id), { isArchived: false, archiveFolderId: null });
      
      const bSnap = await getDocs(query(collection(db, 'blogPosts'), where('archiveFolderId', '==', folderId)));
      for (const d of bSnap.docs) await updateDoc(doc(db, 'blogPosts', d.id), { isArchived: false, archiveFolderId: null });
      
      const eSnap = await getDocs(query(collection(db, 'experiences'), where('archiveFolderId', '==', folderId)));
      for (const d of eSnap.docs) await updateDoc(doc(db, 'experiences', d.id), { isArchived: false, archiveFolderId: null });

      // Delete the folder
      await deleteDoc(doc(db, 'archiveFolders', folderId));
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) setSelectedFolder(null);
    } catch (err) {
      console.warn(err);
    }
  };
`;

content = content.replace(
  /const handleDeleteFolder = async[\s\S]*?console\.warn\(e\);\n    \}\n  \};/,
  replacementFunctions
);

fs.writeFileSync('src/components/ArchiveAdmin.tsx', content);
