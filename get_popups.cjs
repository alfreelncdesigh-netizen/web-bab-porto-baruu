const fs = require('fs');
const content = fs.readFileSync('src/components/Store.tsx', 'utf8');
console.log(content.match(/<AnimatePresence>.*?showCancelPopup.*?<\/AnimatePresence>/s)?.[0]);
console.log("---");
console.log(content.match(/<AnimatePresence>.*?showNavPopup.*?<\/AnimatePresence>/s)?.[0]);
