const fs = require('fs');

let content = fs.readFileSync('src/components/BlogAdmin.tsx', 'utf8');

if (!content.includes('import ArchiveMoveModal')) {
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport ArchiveMoveModal from './ArchiveMoveModal';");
    content = content.replace("import { Plus, Trash, Edit, FileText, CheckCircle, XCircle, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';", "import { Plus, Trash, Edit, FileText, CheckCircle, XCircle, RefreshCw, Loader2, Eye, EyeOff, Archive } from 'lucide-react';");

    content = content.replace("const [posts, setPosts] = useState<BlogPost[]>([]);", "const [posts, setPosts] = useState<BlogPost[]>([]);\n const [archiveItemId, setArchiveItemId] = useState<string | null>(null);");

    const moveBtn = `<button onClick={() => setArchiveItemId(post.id.toString())} className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-400 hover:bg-black hover:text-white dark:hover:bg-blue-400 dark:hover:text-[#0A0A0A] rounded-2xl transition-all" title="Arsipkan">
           <Archive size={14} />
          </button>`;
    
    // Insert button before Draft button
    content = content.replace(/<button onClick=\{\(\) => handleToggleDraft\(post\)\}/, moveBtn + '\n          <button onClick={() => handleToggleDraft(post)}');

    const modalRender = `     <ArchiveMoveModal
        isOpen={!!archiveItemId}
        onClose={() => setArchiveItemId(null)}
        onSuccess={() => {
          setPosts(posts.filter(p => p.id.toString() !== archiveItemId));
        }}
        itemType="blogPosts"
        itemId={archiveItemId || ''}
      />
    </div>
  );
}`;

    content = content.replace(/<\/div>\s*\);\s*\}/, modalRender);

    fs.writeFileSync('src/components/BlogAdmin.tsx', content);
}
