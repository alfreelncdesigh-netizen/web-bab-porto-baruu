const fs = require('fs');

function addArchiveImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("from 'lucide-react'") && !content.includes("Archive } from 'lucide-react'")) {
    content = content.replace(/\} from 'lucide-react'/, ", Archive } from 'lucide-react'");
  }
  fs.writeFileSync(file, content);
}

addArchiveImport('src/components/PortfolioAdmin.tsx');
addArchiveImport('src/components/BlogAdmin.tsx');
