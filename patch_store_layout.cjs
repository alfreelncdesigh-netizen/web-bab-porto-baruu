const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2 md:gap-4">/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mt-4">`
);

content = content.replace(
  /<div className="space-y-6 border-l border-zinc-200 dark:border-zinc-800 pl-10">/,
  `<div className="space-y-6 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-10">`
);

fs.writeFileSync('src/components/Store.tsx', content);
