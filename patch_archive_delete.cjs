const fs = require('fs');

let content = fs.readFileSync('src/components/ArchiveAdmin.tsx', 'utf8');

// Import writeBatch
content = content.replace(
  "import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';",
  "import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';"
);

// We should also add a local state for deletion confirmation to bypass iframe limitations
content = content.replace(
  "const [newFolderName, setNewFolderName] = useState('');",
  "const [newFolderName, setNewFolderName] = useState('');\n  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);"
);

const newDeleteLogic = `
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folderToDelete !== folderId) {
      setFolderToDelete(folderId);
      // Auto cancel after 3 seconds
      setTimeout(() => setFolderToDelete(null), 3000);
      return;
    }
    
    // Confirmed deletion
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
`;

content = content.replace(
  /const handleDeleteFolder = async[\s\S]*?console\.warn\(err\);\n    \}\n  \};/,
  newDeleteLogic
);

// UI Update for delete button to show confirmation state
content = content.replace(
  /<button\s*onClick=\{\(e\) => handleDeleteFolder\(folder\.id, e\)\}\s*className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900\/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"\s*>\s*<Trash size=\{16\} \/>\s*<\/button>/,
  `{folderToDelete === folder.id ? (
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
                        )}`
);

fs.writeFileSync('src/components/ArchiveAdmin.tsx', content);
