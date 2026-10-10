const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Banner container padding
content = content.replace(
  /md:p-12 flex flex-col md:flex-row items-center/g,
  'md:p-12 lg:p-20 flex flex-col lg:flex-row items-center'
);

// Banner title
content = content.replace(
  /text-xl md:text-4xl font-extrabold/g,
  'text-xl md:text-4xl lg:text-5xl font-extrabold'
);

// Banner description
content = content.replace(
  /text-xs md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto md:mx-0/g,
  'text-xs md:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl lg:max-w-3xl mx-auto lg:mx-0 lg:leading-relaxed'
);

// Banner gap
content = content.replace(
  /gap-6 md:gap-12 text-center md:text-left/g,
  'gap-6 md:gap-12 lg:gap-16 text-center lg:text-left'
);

// WhatsApp Button
content = content.replace(
  /className="inline-flex items-center gap-3 bg-\[\#25D366\] text-white px-8 md:px-10 py-4 md:py-5 rounded-full text-sm md:text-base font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-\[\#25D366\]\/20"/g,
  'className="inline-flex items-center gap-3 bg-[#25D366] text-black px-8 md:px-10 lg:px-14 py-4 md:py-5 lg:py-6 rounded-full text-sm md:text-base lg:text-xl font-extrabold hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-[#25D366]/20"'
);

fs.writeFileSync('src/components/Store.tsx', content);
