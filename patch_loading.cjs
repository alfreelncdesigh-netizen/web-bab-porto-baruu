const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure handleLoad is called even if there's an error in Promise.all
content = content.replace(
  /Promise\.all\(\[prefetchData\(\), domReady\]\)\.then\(\(\) => \{\n      handleLoad\(\);\n    \}\);/,
  `Promise.all([prefetchData(), domReady])
      .then(() => handleLoad())
      .catch(() => handleLoad());
      
    // Ultimate fallback: ALWAYS show content after 4 seconds maximum
    setTimeout(() => {
      setIsAppLoading(false);
    }, 4000);`
);

fs.writeFileSync('src/App.tsx', content);
