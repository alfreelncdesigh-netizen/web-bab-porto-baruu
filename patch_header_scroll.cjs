const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

content = content.replace(/window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);/g, '');
content = content.replace(/window\.scrollTo\(\{top: 0, behavior: 'smooth'\}\);/g, '');

fs.writeFileSync('src/components/Header.tsx', content);
