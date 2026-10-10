const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Padding container
content = content.replace(
  /md:p-12 shadow-xl/g,
  'md:p-12 lg:p-16 shadow-xl'
);

// Grid gap
content = content.replace(
  /gap-6 md:gap-10/g,
  'gap-6 md:gap-10 lg:gap-16'
);

// Step headers
content = content.replace(
  /text-2xl font-bold/g,
  'text-2xl lg:text-3xl font-extrabold'
);

// Section headers
content = content.replace(
  /text-lg font-bold text-zinc-800/g,
  'text-lg lg:text-xl font-bold text-zinc-800'
);

// Labels
content = content.replace(
  /text-sm font-semibold text-zinc-700/g,
  'text-sm lg:text-base font-bold text-zinc-700'
);

// P text under section headers
content = content.replace(
  /text-sm text-zinc-500/g,
  'text-sm lg:text-base text-zinc-500'
);

// Price breakdown
content = content.replace(
  /text-\[12px\] font-extrabold text-blue-600/g,
  'text-sm lg:text-base font-extrabold text-blue-600'
);
content = content.replace(
  /text-\[10px\] font-bold text-black/g,
  'text-xs lg:text-sm font-bold text-black'
);

// WhatsApp button on desktop (Already handled mostly, let's just make sure it's huge on lg)
content = content.replace(
  /className="w-full bg-\[\#25D366\] text-black py-4 lg:py-6 rounded-xl text-sm md:text-base lg:text-lg font-extrabold/g,
  'className="w-full bg-[#25D366] text-black py-4 lg:py-6 rounded-2xl text-sm md:text-base lg:text-2xl tracking-wide font-extrabold'
);

// Remove "Pilih tanggal (minimal 1 hari dari sekarang)" and other descriptions to remove unnecessary texts
content = content.replace(
  /<p className="text-\[8px\] md:text-xs text-zinc-500 mb-2">Pilih tanggal \(minimal 1 hari dari sekarang\)<\/p>/g,
  ''
);
content = content.replace(
  /<p className="text-\[8px\] text-zinc-500 mb-1">Pilih tanggal \(minimal 1 hari dari sekarang\)<\/p>/g,
  ''
);

fs.writeFileSync('src/components/Store.tsx', content);
