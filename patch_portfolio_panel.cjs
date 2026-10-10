const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Right panel padding
content = content.replace(
  /className=\{`w-full md:w-1\/2 flex flex-col p-6 md:p-12 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-\[#0A0A0A\]`\}/g,
  'className={`w-full md:w-1/2 flex flex-col p-4 md:p-8 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A]`}'
);

// Title margin bottom
content = content.replace(
  /className=\{`text-2xl md:text-4xl font-semibold tracking-tight mb-4 md:mb-8 leading-\[1.1\] text-black dark:text-white`\}/g,
  'className={`text-2xl md:text-4xl font-semibold tracking-tight mb-2 md:mb-4 leading-[1.1] text-black dark:text-white`}'
);

// Date and Role container
content = content.replace(
  /className=\{`flex flex-wrap gap-4 text-xs font-medium mb-3 md:mb-4 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800\/50`\}/g,
  'className={`flex flex-wrap gap-2 md:gap-3 text-xs font-medium mb-3 md:mb-4 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800/50`}'
);

// Date and Role items
content = content.replace(
  /className=\{`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border bg-zinc-50 dark:bg-\[#111111\] border-zinc-100 dark:border-zinc-800\/50`\}/g,
  'className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border bg-zinc-50 dark:bg-[#111111] border-zinc-100 dark:border-zinc-800/50`}'
);

fs.writeFileSync('src/components/Portfolio.tsx', content);
