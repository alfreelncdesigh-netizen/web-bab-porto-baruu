const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

content = content.replace(
  /className="w-full h-auto aspect-square shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-zinc-200 dark:border-zinc-800"/g,
  'className="w-full h-auto shrink-0 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"'
);

content = content.replace(
  /<img src=\{getOptimizedImageUrl\(p.image\)\} alt=\{p.title\} className="w-full h-full object-cover"/g,
  '<img src={getOptimizedImageUrl(p.image)} alt={p.title} className="w-full h-auto object-contain"'
);

fs.writeFileSync('src/components/Portfolio.tsx', content);
