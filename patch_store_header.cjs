const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

content = content.replace(
  /\{formData\.jenisLayanan && \(\n              <button \n                onClick=\{\(\) => setShowCancelPopup\(true\)\}\n                type="button"\n                className="absolute right-0 text-\[9px\] md:text-xs font-bold bg-red-100 dark:bg-red-900\/30 text-red-600 dark:text-red-400 px-3 py-1\.5 md:px-4 md:py-2 rounded-full hover:bg-red-200 dark:hover:bg-red-900\/50 transition-colors border border-red-200 dark:border-red-800"\n              >\n                Batal Order\n              <\/button>\n            \)\}/,
  ``
);

fs.writeFileSync('src/components/Store.tsx', content);
