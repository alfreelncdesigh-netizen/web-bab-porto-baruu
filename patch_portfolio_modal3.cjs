const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Give the root modal wrapper an ID
content = content.replace(
  /className=\{`border-0 md:border w-full h-full md:max-w-6xl md:max-h-\[90vh\] md:h-\[85vh\] overflow-y-auto md:overflow-hidden rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl relative bg-white dark:bg-\[#0A0A0A\] border-zinc-200\/50 dark:border-zinc-800\/50`\}/,
  'id="portfolio-modal-root" className={`border-0 md:border w-full h-full md:w-[98vw] md:max-w-none md:h-[95vh] overflow-y-auto md:overflow-hidden rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl relative bg-white dark:bg-[#0A0A0A] border-zinc-200/50 dark:border-zinc-800/50`}'
);

// Add scroll to both root and content
content = content.replace(
  /document\.getElementById\("portfolio-modal-content"\)\?\.scrollTo\(\{ top: 0, behavior: "smooth" \}\);/g,
  'document.getElementById("portfolio-modal-root")?.scrollTo({ top: 0, behavior: "smooth" }); document.getElementById("portfolio-modal-content")?.scrollTo({ top: 0, behavior: "smooth" });'
);

// Increase image size in the modal to fill space better on the left (w-full h-full instead of being constrained unnecessarily)
// Actually, it's currently w-full md:w-1/2 relative ... flex items-center justify-center
content = content.replace(
  /className=\{`w-full md:w-1\/2 relative border-b md:border-b-0 md:border-r flex items-center justify-center h-auto md:h-full pt-0 pb-0 px-0 md:p-0 shrink-0 overflow-hidden bg-zinc-50 dark:bg-\[#111111\] border-zinc-200\/50 dark:border-zinc-800\/50 rounded-b-2xl md:rounded-none`\}/,
  'className={`w-full md:w-[55%] relative border-b md:border-b-0 md:border-r flex items-center justify-center h-auto md:h-full pt-0 pb-0 px-0 md:p-0 shrink-0 overflow-hidden bg-zinc-50 dark:bg-[#111111] border-zinc-200/50 dark:border-zinc-800/50 rounded-b-2xl md:rounded-none`}'
);

content = content.replace(
  /className=\{`w-full md:w-1\/2 flex flex-col p-3 md:p-6 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-\[#0A0A0A\]`\}/,
  'id="portfolio-modal-content" className={`w-full md:w-[45%] flex flex-col p-3 md:p-8 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A]`}'
);


fs.writeFileSync('src/components/Portfolio.tsx', content);
