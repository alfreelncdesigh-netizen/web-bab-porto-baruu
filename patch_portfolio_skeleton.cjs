const fs = require('fs');
let content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');

content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-6">/g,
  '<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">'
);

fs.writeFileSync('src/components/Portfolio.tsx', content);
