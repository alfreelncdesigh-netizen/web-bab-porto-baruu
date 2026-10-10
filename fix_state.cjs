const fs = require('fs');

function addState(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('const [archiveItemId')) {
    content = content.replace(/const \[toast.*?\n/, (match) => match + " const [archiveItemId, setArchiveItemId] = useState<string | null>(null);\n");
  }
  fs.writeFileSync(file, content);
}

function addStateExp(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('const [archiveItemId')) {
    content = content.replace(/const \[saving.*?\n/, (match) => match + " const [archiveItemId, setArchiveItemId] = useState<string | null>(null);\n");
  }
  fs.writeFileSync(file, content);
}

addState('src/components/PortfolioAdmin.tsx');
addState('src/components/BlogAdmin.tsx');
addStateExp('src/components/ExperienceAdmin.tsx');
