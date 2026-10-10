const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(
  /p \{\n    line-height: 1.8;\n  \}/,
  `p {
    line-height: 1.8;
  }` // Actually, it's already there from my previous patch.
);

fs.writeFileSync('src/index.css', content);
