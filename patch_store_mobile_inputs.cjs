const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

content = content.replace(
  'const inputClassMobile = "w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-colors dark:text-white text-sm";',
  'const inputClassMobile = "w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-colors dark:text-white text-[10px]";'
);

content = content.replace(
  /<div className="space-y-4 md:space-y-6">/g,
  '<div className="space-y-2 md:space-y-6">'
);
content = content.replace(
  /<div className="space-y-4">/g,
  '<div className="space-y-2.5">'
);

fs.writeFileSync('src/components/Store.tsx', content);
