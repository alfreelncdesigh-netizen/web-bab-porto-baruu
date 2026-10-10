const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Add ArchiveAdmin import
content = content.replace("import { Mail } from 'lucide-react';", "import { Mail, Archive } from 'lucide-react';\nimport ArchiveAdmin from './ArchiveAdmin';");

// Add archive to activeTab state
content = content.replace("useState<'portfolio' | 'blog' | 'experience' | 'about' | 'cv' | 'stats' | 'settings' | 'store' | 'messages'>('portfolio');", "useState<'portfolio' | 'blog' | 'experience' | 'about' | 'cv' | 'stats' | 'settings' | 'store' | 'messages' | 'archive'>('portfolio');");

// Add Archive tab to the sidebar
const sidebarTab = `          <button onClick={() => setActiveTab('messages')} className={\`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm \${activeTab === 'messages' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}\`}>
           <Mail size={18} />
           Pesan Masuk
          </button>
          
          <button onClick={() => setActiveTab('archive')} className={\`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm \${activeTab === 'archive' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}\`}>
           <Archive size={18} />
           Arsip
          </button>`;
content = content.replace(/<button onClick=\{\(\) => setActiveTab\('messages'\)[\s\S]*?Pesan Masuk\s*<\/button>/m, sidebarTab);

// Render ArchiveAdmin
const renderTab = `         {activeTab === 'messages' && <MessagesAdmin />}
         {activeTab === 'archive' && <ArchiveAdmin />}`;
content = content.replace(/{activeTab === 'messages' && <MessagesAdmin \/>}/, renderTab);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
