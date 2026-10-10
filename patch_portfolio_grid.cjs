const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

// Update Skeleton loader to masonry if possible, or just keep it as grid but it doesn't matter much.
content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">/g,
  '<div className="columns-2 md:columns-2 lg:columns-3 gap-2 sm:gap-6 space-y-2 sm:space-y-6">'
);

// Update Main Grid to masonry
content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 md:gap-4 md:p-8">/g,
  '<div className="columns-2 md:columns-2 lg:columns-3 gap-2 sm:gap-6 md:gap-4 md:p-8 space-y-2 sm:space-y-6 md:space-y-4">'
);

// Update card classes to remove aspect ratio constraint, so images aren't cropped
const cardClassRegex = /className=\{`group relative h-auto w-full aspect-square md:aspect-\[4\/5\] object-cover rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border hover:shadow-2xl transition-all \$\{cinematicCardClass\}`\} style=\{\{ display: 'inline-block', width: '100%' \}\}/g;
content = content.replace(cardClassRegex, `className={\`group relative h-auto w-full break-inside-avoid rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border hover:shadow-2xl transition-all \${cinematicCardClass}\`} style={{ display: 'inline-block', width: '100%' }}`);

fs.writeFileSync('src/components/Portfolio.tsx', content);
