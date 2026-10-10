const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Replace the header section
content = content.replace(
  /<div className="inline-flex items-center justify-center px-3 md:px-4 py-1 md:py-1\.5 rounded-full bg-zinc-100 dark:bg-\[\#111111\] border border-zinc-200 dark:border-zinc-800 text-\[8px\] md:text-xs font-bold text-zinc-500 tracking-widest uppercase mb-3 md:mb-6">\n            Order Custom\n          <\/div>/,
  `<div className="flex items-center justify-center gap-2 mb-3 md:mb-6 w-full relative">
            <div className="inline-flex items-center justify-center px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-zinc-100 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 text-[8px] md:text-xs font-bold text-zinc-500 tracking-widest uppercase">
              Order Custom
            </div>
            {isDraftLoaded && (
              <div className="inline-flex items-center justify-center px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[8px] md:text-xs font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                DRAFT
              </div>
            )}
            {formData.jenisLayanan && (
              <button 
                onClick={() => setShowCancelPopup(true)}
                type="button"
                className="absolute right-0 text-[9px] md:text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800"
              >
                Batal Order
              </button>
            )}
          </div>`
);

// Replace form container
content = content.replace(
  /<div className="bg-zinc-50\/50 dark:bg-\[\#111111\]\/50 border border-zinc-200\/60 dark:border-zinc-800\/60 rounded-\[1rem\] md:rounded-\[2\.5rem\] p-3 md:p-12 lg:p-16 shadow-xl shadow-black\/5 w-full">/,
  `<div className={\`bg-zinc-50/50 dark:bg-[#111111]/50 border \${isDraftLoaded ? 'border-blue-400 dark:border-blue-600 shadow-blue-500/10' : 'border-zinc-200/60 dark:border-zinc-800/60 shadow-black/5'} rounded-[1rem] md:rounded-[2.5rem] p-3 md:p-12 lg:p-16 shadow-xl w-full transition-colors\`}>`
);

fs.writeFileSync('src/components/Store.tsx', content);
