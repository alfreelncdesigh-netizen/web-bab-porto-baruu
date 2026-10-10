const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// The mobile layout starts around MOBILE VIEW ONLY
// Let's find space-y classes for the form steps in Mobile.
content = content.replace(/<div className="space-y-4">/g, '<div className="space-y-2.5">'); // Step 1 form fields
content = content.replace(/<div className="space-y-6">/g, '<div className="space-y-3">'); // Maybe some other spacing
content = content.replace(/<div className="grid grid-cols-2 gap-2">/g, '<div className="grid grid-cols-2 gap-1.5">'); // Tujuan and Target Audience
content = content.replace(/<div className="flex flex-col gap-3">/g, '<div className="flex flex-col gap-2">'); // Service selection button

// We can tighten the padding of inputs as well
const inputMobileRegex = /const inputClassMobile = "w-full px-2\.5 py-2\.5 bg-white dark:bg-\[#0A0A0A\] border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-colors dark:text-white text-\[11px\]";/g;
content = content.replace(inputMobileRegex, 'const inputClassMobile = "w-full px-2 py-2 bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-md focus:ring-1 focus:ring-black dark:focus:ring-white outline-none transition-colors dark:text-white text-[10px]";');

fs.writeFileSync('src/components/Store.tsx', content);
