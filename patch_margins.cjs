const fs = require('fs');

const files = [
  { path: 'src/App.tsx', replaces: [['pt-24 md:pt-32', 'pt-16 md:pt-20']] },
  { path: 'src/components/Hero.tsx', replaces: [['pt-24 pb-8 md:pt-32 md:pb-12', 'pt-16 pb-6 md:pt-24 md:pb-10']] },
  { path: 'src/components/About.tsx', replaces: [['py-12 md:py-20', 'py-8 md:py-12']] },
  { path: 'src/components/Store.tsx', replaces: [['py-8 md:py-32', 'py-6 md:py-16']] },
  { path: 'src/components/CvDetail.tsx', replaces: [['py-12 sm:py-20 md:py-32', 'py-6 sm:py-12 md:py-16']] },
  { path: 'src/components/Portfolio.tsx', replaces: [['py-6 md:py-10', 'py-4 md:py-6']] },
  { path: 'src/components/Blog.tsx', replaces: [['py-6 md:py-10', 'py-4 md:py-8']] },
  { path: 'src/components/Experience.tsx', replaces: [['py-6 md:py-10', 'py-4 md:py-8']] }
];

for (const f of files) {
  if (fs.existsSync(f.path)) {
    let content = fs.readFileSync(f.path, 'utf8');
    for (const [search, replace] of f.replaces) {
      content = content.replace(search, replace);
    }
    fs.writeFileSync(f.path, content);
  }
}
