const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Add showFullDesc state
if (!content.includes('const [showFullDesc, setShowFullDesc] = useState(false);')) {
  content = content.replace(
    'const [copied, setCopied] = useState(false);',
    'const [copied, setCopied] = useState(false);\n const [showFullDesc, setShowFullDesc] = useState(false);'
  );
}

// Reset showFullDesc when selectedProject changes
content = content.replace(
  /onClick=\{\(\) => setSelectedProject\(project\)\}/g,
  'onClick={() => { setSelectedProject(project); setShowFullDesc(false); }}'
);

// Modify grid layout for mobile 
content = content.replace(
  /className="columns-1 md:columns-2 lg:columns-3 gap-0 sm:gap-6 md:gap-4 md:p-8 space-y-0 sm:space-y-6 md:space-y-4"/g,
  'className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 md:gap-4 md:p-8"'
);
content = content.replace(
  /className=\{(.*?) h-auto break-inside-avoid mb-0 sm:mb-6 md:mb-4 (.*?)\}/g,
  'className={$1 h-auto w-full aspect-square md:aspect-[4/5] object-cover $2}'
);

// Refine modal design
const modalRegex = /<div className="mb-4 md:mb-8 pr-10">([\s\S]*?)<\/div>\s*<div className="mt-auto pt-6">/;
let modalMatch = content.match(modalRegex);
if (modalMatch) {
  let modalContent = modalMatch[1];
  
  // Make gap smaller
  modalContent = modalContent.replace(/mb-4 md:mb-8 pr-10/g, 'mb-2 md:mb-4 w-full pr-0');
  modalContent = modalContent.replace(/mb-6/g, 'mb-2');
  modalContent = modalContent.replace(/mb-4 md:mb-8 pb-8/g, 'mb-3 md:mb-4 pb-3');
  
  const originalDescRegex = /\{selectedProject\.description && \(<p className=\{`text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap text-black dark:text-zinc-300`\}>\s*\{selectedProject\.description\}\s*<\/p>\)\}/;
  
  const newDesc = `{selectedProject.description && (
          <div className="mb-4 text-black dark:text-zinc-300">
            <p className="text-xs md:text-sm leading-relaxed font-medium whitespace-pre-wrap inline">
              {showFullDesc ? selectedProject.description : selectedProject.description.substring(0, 10) + (selectedProject.description.length > 10 ? '...' : '')}
            </p>
            {!showFullDesc && selectedProject.description.length > 10 && (
              <button 
                onClick={() => setShowFullDesc(true)} 
                className="ml-1 text-[10px] md:text-xs font-bold text-blue-500 hover:underline"
              >
                selengkapnya
              </button>
            )}
            {showFullDesc && selectedProject.description.length > 10 && (
              <button 
                onClick={() => setShowFullDesc(false)} 
                className="ml-1 text-[10px] md:text-xs font-bold text-blue-500 hover:underline"
              >
                tutup
              </button>
            )}
          </div>
         )}`;
         
  modalContent = modalContent.replace(originalDescRegex, newDesc);
  
  const bottomGallery = `
          {/* Karya Lainnya */}
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
            <h4 className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Karya Lainnya</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar pr-4">
              {filteredProjects.filter(p => p.id !== selectedProject.id).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => { setSelectedProject(p); setShowFullDesc(false); }}
                  className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-zinc-200 dark:border-zinc-800"
                >
                  <img src={getOptimizedImageUrl(p.image)} alt={p.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                </div>
              ))}
            </div>
          </div>
  `;
  
  content = content.replace(modalRegex, `<div className="mb-2 w-full px-0">${modalContent}</div>${bottomGallery}<div className="mt-auto pt-6">`);
}

fs.writeFileSync('src/components/Portfolio.tsx', content);
