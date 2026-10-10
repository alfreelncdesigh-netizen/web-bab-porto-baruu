const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Container padding
content = content.replace(
  /className=\{`w-full md:w-1\/2 flex flex-col p-4 md:p-8 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-\[#0A0A0A\]`\}/g,
  'className={`w-full md:w-1/2 flex flex-col p-3 md:p-6 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A]`}'
);

// Category badge
content = content.replace(
  /className=\{`text-\[11px\] md:text-xs font-bold tracking-widest uppercase border px-4 py-1\.5 rounded-full inline-block mb-2 shadow-sm text-black dark:text-zinc-400 bg-zinc-100 dark:bg-\[#111111\] border-transparent dark:border-zinc-800\/50`\}/g,
  'className={`text-[8px] md:text-[10px] font-bold tracking-widest uppercase border px-2.5 py-1 rounded-full inline-block mb-1 shadow-sm text-black dark:text-zinc-400 bg-zinc-100 dark:bg-[#111111] border-transparent dark:border-zinc-800/50 w-fit`}'
);

// Title
content = content.replace(
  /className=\{`text-2xl md:text-4xl font-semibold tracking-tight mb-2 md:mb-4 leading-\[1\.1\] text-black dark:text-white`\}/g,
  'className={`text-lg md:text-3xl font-semibold tracking-tight mb-1.5 md:mb-2 leading-[1.1] text-black dark:text-white`}'
);

// Meta container
content = content.replace(
  /className=\{`flex flex-wrap gap-2 md:gap-3 text-xs font-medium mb-3 md:mb-4 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800\/50`\}/g,
  'className={`flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs font-medium mb-2 md:mb-3 pb-2 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800/50 w-full`}'
);

fs.writeFileSync('src/components/Portfolio.tsx', content);
