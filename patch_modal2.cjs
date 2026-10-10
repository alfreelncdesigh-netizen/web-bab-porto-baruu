const fs = require('fs');
let content = fs.readFileSync('src/components/ServiceSelectModal.tsx', 'utf8');

content = content.replace(/className="fixed inset-0 z-\[100\] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"/g, 'className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"');
content = content.replace(/className="p-4 md:p-6 pb-3 md:pb-4 border-b border-zinc-100 dark:border-zinc-800\/80 flex items-start justify-between shrink-0"/g, 'className="p-3 md:p-6 pb-2.5 md:pb-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-start justify-between shrink-0"');
content = content.replace(/className="p-3 md:p-6 overflow-y-auto custom-scrollbar flex-1"/g, 'className="p-2.5 md:p-6 overflow-y-auto custom-scrollbar flex-1"');
content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 gap-2\.5 md:gap-3\.5"/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3.5"');

content = content.replace(/className=\{`group relative text-left p-3 md:p-4 rounded-xl md:rounded-2xl/g, 'className={`group relative text-left p-2.5 md:p-4 rounded-lg md:rounded-2xl');
content = content.replace(/className=\{`w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl/g, 'className={`w-7 h-7 md:w-11 md:h-11 rounded-md md:rounded-xl');
content = content.replace(/<Icon className="w-4 h-4 md:w-5 md:h-5" \/>/g, '<Icon className="w-3.5 h-3.5 md:w-5 md:h-5" />');

content = content.replace(/<h4 className="text-xs md:text-sm font-bold tracking-tight truncate mb-1">/g, '<h4 className="text-[11px] md:text-sm font-bold tracking-tight truncate mb-0.5">');
content = content.replace(/<p\s*className=\{`text-\[9px\] md:text-\[11px\] leading-relaxed line-clamp-2 font-normal/g, '<p className={`text-[9px] md:text-[11px] leading-tight md:leading-relaxed line-clamp-2 font-normal');

content = content.replace(/<div className="absolute top-3 right-3 md:top-4 md:right-4 w-5 h-5 rounded-full/g, '<div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 w-4 h-4 md:w-5 md:h-5 rounded-full');
content = content.replace(/<Check className="w-3 h-3 stroke-\[3\]" \/>/g, '<Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />');

content = content.replace(/<div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-0/g, '<div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 opacity-0');

fs.writeFileSync('src/components/ServiceSelectModal.tsx', content);
