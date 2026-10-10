const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Reduce padding in the modal content container
content = content.replace(
  /className=\{`w-full md:w-1\/2 flex flex-col p-4 md:p-8 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-\[#0A0A0A\]`\}/g,
  'className={`w-full md:w-1/2 flex flex-col p-3 md:p-6 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A]`}'
);

// Tighter category badge
content = content.replace(
  /className="inline-block px-3 py-1 md:px-4 md:py-1\.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-\[9px\] md:text-xs font-bold tracking-widest uppercase mb-3 md:mb-4 text-black dark:text-zinc-300 w-fit"/g,
  'className="inline-block px-2 py-1 md:px-3 md:py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-1 md:mb-2 text-black dark:text-zinc-300 w-fit"'
);

// Tighter title
content = content.replace(
  /className="text-xl md:text-4xl font-extrabold text-black dark:text-white mb-2 md:mb-4 tracking-tight leading-tight"/g,
  'className="text-lg md:text-3xl font-extrabold text-black dark:text-white mb-1.5 md:mb-2 tracking-tight leading-tight"'
);

// Tighter meta info
content = content.replace(
  /className=\{`flex flex-wrap gap-2 md:gap-3 text-xs font-medium mb-3 md:mb-4 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800\/50`\}/g,
  'className={`flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs font-medium mb-2 md:mb-3 pb-2 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800/50 w-full`}'
);

fs.writeFileSync('src/components/Portfolio.tsx', content);
