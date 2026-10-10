const fs = require('fs');
let content = fs.readFileSync('src/components/Experience.tsx', 'utf8');

// Replace the modal layout for selectedImg
content = content.replace(
  /className="fixed inset-0 z-\[200\] bg-white dark:bg-\[#0A0A0A\] flex flex-col overflow-y-auto custom-scrollbar"/,
  'className="fixed inset-0 z-[200] bg-white dark:bg-[#0A0A0A] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar"'
);

content = content.replace(
  /className="relative w-full mx-auto bg-zinc-50 dark:bg-\[#111111\] border-b border-zinc-200 dark:border-zinc-800 shrink-0"/,
  'className="relative w-full md:w-1/2 lg:w-[60%] h-[50vh] md:h-full bg-zinc-50 dark:bg-[#111111] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center p-4 md:p-10"'
);

content = content.replace(
  /className="w-full h-auto min-h-\[50vh\] max-h-\[70vh\] flex items-center justify-center p-4 md:p-10"/,
  'className="w-full h-full flex items-center justify-center"'
);

// We need to keep the close button where it is, but it might be better positioned absolute on the right side if md:
content = content.replace(
  /<div className="relative w-full md:w-1\/2 lg:w-\[60%\] h-\[50vh\] md:h-full bg-zinc-50 dark:bg-\[#111111\] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center p-4 md:p-10">/,
  `<button onClick={() => setSelectedImg(null)} className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:scale-105 transition-transform shadow-md"><X className="w-5 h-5" /></button>
          <div className="relative w-full md:w-1/2 lg:w-[60%] h-[50vh] md:h-full bg-zinc-50 dark:bg-[#111111] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center p-4 md:p-10">`
);
// Remove the inner close button from the image div because we moved it to the outer level
content = content.replace(
  /<button\s*onClick=\{\(\) => setSelectedImg\(null\)\}\s*className="absolute top-4 right-4 md:top-6 md:right-6 z-\[210\] p-2\.5 rounded-full bg-white\/80 dark:bg-zinc-900\/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:scale-105 transition-transform shadow-md"\s*>\s*<X className="w-5 h-5" \/>\s*<\/button>/g,
  (match, offset, original) => {
    // Only remove if it's inside the image div
    return '';
  }
);
// Re-insert the close button correctly just inside the modal root
content = content.replace(
  /<motion\.div\s*initial=\{\{ opacity: 0, y: 50 \}\}\s*animate=\{\{ opacity: 1, y: 0 \}\}\s*exit=\{\{ opacity: 0, y: 50 \}\}\s*className="fixed inset-0 z-\[200\] bg-white dark:bg-\[#0A0A0A\] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar"\s*>/,
  `<motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[200] bg-white dark:bg-[#0A0A0A] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar"
        >
        <button 
          onClick={() => setSelectedImg(null)}
          className="fixed md:absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:scale-105 transition-transform shadow-md"
        >
          <X className="w-5 h-5" />
        </button>`
);

// Right side container (text)
content = content.replace(
  /className="w-full max-w-4xl mx-auto px-6 py-8 md:py-12 flex flex-col shrink-0"/,
  'className="w-full md:w-1/2 lg:w-[40%] px-5 py-6 md:px-10 md:py-12 flex flex-col shrink-0 md:h-full md:overflow-y-auto custom-scrollbar"'
);

// Make subtheme and header close to each other, smaller on mobile
content = content.replace(
  /className="inline-flex items-center gap-1\.5 px-3 py-1\.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-\[10px\] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-3 w-fit shadow-sm"/,
  'className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-2 w-fit shadow-sm"'
);

content = content.replace(
  /className="text-3xl md:text-5xl font-bold text-black dark:text-white mb-6 leading-tight tracking-tight"/,
  'className="text-xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-4 leading-tight tracking-tight"'
);

// Make description much smaller
content = content.replace(
  /className="prose prose-sm md:prose-base dark:prose-invert max-w-none"/,
  'className="prose prose-sm dark:prose-invert max-w-none"'
);

content = content.replace(
  /className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap"/,
  'className="text-[11px] md:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap"'
);

// Image sizing inside left container
content = content.replace(
  /className="max-w-full max-h-\[60vh\] object-contain rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800"/,
  'className="w-full h-full object-contain rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800"'
);

fs.writeFileSync('src/components/Experience.tsx', content);
