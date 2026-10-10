const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Refine Buttons
content = content.replace(
  /className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900\/30 dark:text-red-400 px-8 py-3\.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900\/50 transition-colors"/g,
  'className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-full sm:w-auto sm:min-w-[160px]"'
);
content = content.replace(
  /className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3\.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"/g,
  'className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto sm:min-w-[160px]"'
);
content = content.replace(
  /className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3\.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all"/g,
  'className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 md:px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all w-full sm:w-auto sm:min-w-[160px]"'
);

// Mobile buttons
content = content.replace(
  /className="flex items-center justify-center gap-1\.5 bg-red-100 text-red-600 dark:bg-red-900\/30 dark:text-red-400 px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:bg-red-200 dark:hover:bg-red-900\/50 transition-colors"/g,
  'className="flex-1 flex items-center justify-center gap-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors w-24"'
);
content = content.replace(
  /className="flex items-center justify-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"/g,
  'className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 w-24"'
);
content = content.replace(
  /className="flex items-center justify-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all"/g,
  'className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all w-24"'
);

// Refine Popup
content = content.replace(
  /className="fixed inset-0 z-\[100\] flex items-end justify-center p-4 pb-8 md:pb-12 bg-black\/20 dark:bg-black\/40 backdrop-blur-sm"/g,
  'className="fixed inset-0 z-[100] flex items-end justify-center p-6 pb-10 md:pb-12 bg-black/30 dark:bg-black/50 backdrop-blur-md"'
);

content = content.replace(
  /className="w-full max-w-sm bg-white\/90 dark:bg-\[\#111111\]\/90 backdrop-blur-md rounded-2xl md:rounded-\[2rem\] p-5 md:p-6 shadow-2xl border border-white\/20 dark:border-zinc-800\/50"/g,
  'className="w-full max-w-xs md:max-w-sm bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/40 dark:border-zinc-800/60"'
);

content = content.replace(
  /className="w-full max-w-sm bg-white\/90 dark:bg-\[\#111111\]\/90 backdrop-blur-md rounded-2xl md:rounded-\[2rem\] p-5 md:p-6 shadow-2xl border border-white\/20 dark:border-zinc-800\/50 flex flex-col gap-4"/g,
  'className="w-full max-w-xs md:max-w-sm bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-white/40 dark:border-zinc-800/60 flex flex-col gap-4"'
);

// Refine Grid for Spesifikasi
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mt-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">`
);

fs.writeFileSync('src/components/Store.tsx', content);
