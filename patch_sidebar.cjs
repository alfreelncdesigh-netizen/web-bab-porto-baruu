const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const settingsBtnRegex = /<button\s*onClick=\{\(\) => setActiveTab\('settings'\)\}[\s\S]*?<\/button>/;

const archiveBtn = `<button
        onClick={() => setActiveTab('archive')}
        className={\`flex items-center gap-2 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all rounded-2xl \${activeTab === 'archive' ? 'bg-white text-black shadow-sm dark:bg-[#0A0A0A] dark:text-white dark:border-zinc-800/50 border border-zinc-200' : 'bg-transparent text-black hover:text-black dark:text-zinc-500 dark:hover:text-zinc-300 border border-transparent'}\`}
      >
       <Archive size={14} /> Arsip
      </button>`;

content = content.replace(settingsBtnRegex, (match) => archiveBtn + '\n      ' + match);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
