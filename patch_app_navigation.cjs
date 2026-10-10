const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /window\.addEventListener\('changeView', handleViewChange\);/,
  `window.addEventListener('changeView', handleViewChange);
    
    const handleForceViewChange = (e: any) => {
      if (e.detail && e.detail.view) {
        setView(e.detail.view);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('forceChangeView', handleForceViewChange);
    return () => {
      window.removeEventListener('changeView', handleViewChange);
      window.removeEventListener('forceChangeView', handleForceViewChange);
    };`
);
// Remove the old return () => window.removeEventListener...
content = content.replace(
  /return \(\) => window\.removeEventListener\('changeView', handleViewChange\);\n  \}, \[\]\);/,
  `}, []);`
);

fs.writeFileSync('src/App.tsx', content);
