const fs = require('fs');
let content = fs.readFileSync('src/components/HeroBannerCarousel.tsx', 'utf8');

// Banner 1 (Single banner) mobile gradient and placement
content = content.replace(
  /absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black\/85 via-black\/40 to-transparent p-4 sm:p-6 md:p-10 flex flex-col justify-end md:justify-center text-white z-10/g,
  'absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/40 md:via-black/60 to-transparent p-3 sm:p-6 md:p-10 flex flex-col justify-end items-start md:justify-center text-left text-white z-10'
);

// Banner 1 Texts
content = content.replace(
  /<h3 className="text-base sm:text-xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight max-w-xl mb-1 md:mb-2 drop-shadow-sm">/g,
  '<h3 className="text-xs sm:text-xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight max-w-xl mb-0.5 md:mb-2 drop-shadow-sm">'
);

content = content.replace(
  /<p className="text-xs sm:text-sm md:text-base text-zinc-200 line-clamp-2 max-w-lg mb-3 md:mb-4 drop-shadow-sm font-medium">/g,
  '<p className="text-[9px] sm:text-sm md:text-base text-zinc-200 line-clamp-2 max-w-lg mb-1.5 md:mb-4 drop-shadow-sm font-medium">'
);

content = content.replace(
  /className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs font-bold w-fit shadow-lg group-hover:bg-zinc-100 transition-colors"/g,
  'className="inline-flex items-center gap-1 bg-white text-black px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[9px] md:text-xs font-bold w-fit shadow-lg group-hover:bg-zinc-100 transition-colors"'
);

content = content.replace(
  /className="inline-block w-fit px-3 py-1 bg-blue-600\/90 text-white rounded-full text-\[9px\] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-3 shadow-md"/g,
  'className="inline-block w-fit px-2 py-0.5 md:px-3 md:py-1 bg-blue-600/90 text-white rounded-full text-[8px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-3 shadow-md"'
);


// Banner Multiple mobile gradient and placement
content = content.replace(
  /absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black\/85 via-black\/45 to-transparent p-3 sm:p-5 md:p-8 flex flex-col justify-end md:justify-center text-white z-10/g,
  'absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/40 md:via-black/60 to-transparent p-3 sm:p-5 md:p-8 flex flex-col justify-end items-start md:justify-center text-left text-white z-10'
);

// Banner Multiple Texts
content = content.replace(
  /<h3 className="text-xs sm:text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight max-w-lg mb-1 drop-shadow-sm">/g,
  '<h3 className="text-[11px] sm:text-lg md:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight max-w-lg mb-0.5 drop-shadow-sm">'
);

content = content.replace(
  /<p className="text-\[10px\] sm:text-xs md:text-sm text-zinc-200 line-clamp-1 sm:line-clamp-2 max-w-md mb-2 md:mb-3 drop-shadow-sm">/g,
  '<p className="text-[8px] sm:text-xs md:text-sm text-zinc-200 line-clamp-1 sm:line-clamp-2 max-w-md mb-1.5 md:mb-3 drop-shadow-sm">'
);

content = content.replace(
  /className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1 md:px-4 md:py-2 rounded-full text-\[9px\] sm:text-xs font-bold w-fit shadow-lg hover:bg-zinc-100 transition-colors"/g,
  'className="inline-flex items-center gap-1 bg-white text-black px-2.5 py-1 md:px-4 md:py-2 rounded-full text-[8px] sm:text-xs font-bold w-fit shadow-lg hover:bg-zinc-100 transition-colors"'
);

content = content.replace(
  /className="inline-block w-fit px-2.5 py-0.5 md:px-3 md:py-1 bg-blue-600\/90 text-white rounded-full text-\[8px\] sm:text-\[10px\] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 shadow-md"/g,
  'className="inline-block w-fit px-2 py-0.5 md:px-3 md:py-1 bg-blue-600/90 text-white rounded-full text-[7px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 shadow-md"'
);

fs.writeFileSync('src/components/HeroBannerCarousel.tsx', content);
