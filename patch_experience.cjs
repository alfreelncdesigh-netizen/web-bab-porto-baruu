const fs = require('fs');
let content = fs.readFileSync('src/components/Experience.tsx', 'utf8');

// Replace line 1 (the timeline vertical line and main container spacing)
const regexMainContainer = /<div className="space-y-16 md:space-y-32 relative before:absolute before:inset-0 before:ml-4 md:before:ml-\[50%\] before:-translate-x-px md:before:-translate-x-px before:h-full before:w-0\.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 dark:before:via-zinc-800 before:to-transparent">/;
content = content.replace(regexMainContainer, `<div className="space-y-10 md:space-y-20 flex flex-col items-center">`);

// Replace the mapping and card layout
const regexMapStart = /className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-16 \$\{isEven \? 'md:flex-row-reverse' : ''\}`}/;
content = content.replace(regexMapStart, `className={\`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-10 w-full \${isEven ? 'md:flex-row-reverse' : ''}\`}`);

// Remove Timeline Node
const regexTimelineNode = /\{\/\* Timeline Node \*\/\}\s*<div className="absolute left-4 md:left-1\/2 top-1\.5 md:top-1\/2 -translate-x-1\/2 md:-translate-y-1\/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-black dark:bg-white border-\[3px\] border-\[#F0EEEE\] dark:border-\[#0A0A0A\] z-10 shadow-sm"><\/div>/;
content = content.replace(regexTimelineNode, ``);

// Adjust Text Content paddings and sizes
const regexTextContent = /\{\/\* Text Content \*\/\}\s*<div className="w-full md:w-1\/2 pl-12 md:pl-0 flex flex-col justify-center">\s*<div className={`flex flex-col items-start text-left \$\{isEven \? 'md:items-start md:text-left' : 'md:items-end md:text-right'\}`}>\s*<div className="inline-flex items-center gap-2 px-3 py-1\.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-\[11px\] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-4 shadow-sm">\s*<Briefcase className="w-3 h-3 text-zinc-500" \/> \{exp\.subtheme\}\s*<\/div>\s*<h3 className="text-xl md:text-3xl font-bold text-black dark:text-white mb-3 md:mb-4 leading-tight">\{exp\.header\}<\/h3>\s*\{exp\.description && \(<p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6 md:mb-6">/g;

content = content.replace(regexTextContent, `{/* Text Content */}
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <div className={\`flex flex-col items-start text-left \${isEven ? 'md:items-start md:text-left' : 'md:items-end md:text-right'}\`}>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-2.5 md:mb-4 shadow-sm">
                      <Briefcase className="w-3 h-3 text-zinc-500" /> {exp.subtheme}
                    </div>
                    <h3 className="text-lg md:text-3xl font-bold text-black dark:text-white mb-1.5 md:mb-4 leading-tight">{exp.header}</h3>
                    {exp.description && (<p className="text-xs md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3 md:mb-6">`);

// Adjust Image Gallery paddings
const regexImageContent = /\{\/\* Image Gallery \*\/\}\s*<div className="w-full md:w-1\/2 pl-12 md:pl-0">/;
content = content.replace(regexImageContent, `{/* Image Gallery */}
                <div className="w-full md:w-1/2">`);

fs.writeFileSync('src/components/Experience.tsx', content);
