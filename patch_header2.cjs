const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add the state variable for the dropdown
content = content.replace(
  /const \[isMobileMenuOpen, setIsMobileMenuOpen\] = useState\(false\);/,
  "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);\n"
);

// Destructure setTheme
content = content.replace(
  /const \{ theme, isDark, toggleTheme \} = useTheme\(\);/,
  "const { theme, isDark, toggleTheme, setTheme } = useTheme();"
);

// Replace the desktop theme button with a dropdown
const desktopThemeBtn = `
     <div className="relative">
       <button 
        onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)} 
        className="text-black hover:opacity-70 dark:text-white dark:hover:opacity-70 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Toggle Theme" title={\`Tema Saat Ini: \${theme.charAt(0).toUpperCase() + theme.slice(1)}\`}
       >
        {theme === 'light' ? <Moon size={16} /> : theme === 'dark' ? <Sun size={16} /> : <Palette size={16} />}
       </button>
       
       <AnimatePresence>
        {isThemeDropdownOpen && (
         <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-40 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-2 flex flex-col gap-1 shadow-xl z-50"
         >
           {['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].map((t) => (
             <button
               key={t}
               onClick={() => { setTheme(t); setIsThemeDropdownOpen(false); }}
               className={\`text-left text-[10px] font-bold px-3 py-2 rounded-lg transition-colors \${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}\`}
             >
               {t.charAt(0).toUpperCase() + t.slice(1)}
             </button>
           ))}
         </motion.div>
        )}
       </AnimatePresence>
     </div>
`;

content = content.replace(
  /<button\s*onClick=\{toggleTheme\}\s*className="text-black hover:opacity-70 dark:text-white dark:hover:opacity-70 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"\s*aria-label="Toggle Theme" title=\{`Tema Saat Ini: \$\{theme\.charAt\(0\)\.toUpperCase\(\) \+ theme\.slice\(1\)\}`\}\s*>\s*\{theme === 'light' \? <Moon size=\{16\} \/> : theme === 'dark' \? <Sun size=\{16\} \/> : <Palette size=\{16\} \/>\}\s*<\/button>/,
  desktopThemeBtn
);

// Replace mobile theme button with same pattern
const mobileThemeBtn = `
     <div className="relative">
       <button onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)} className="text-black dark:text-white p-1 hover:opacity-70 transition-opacity flex items-center">
        {theme === 'light' ? <Moon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> : theme === 'dark' ? <Sun className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> : <Palette className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />}
       </button>
       <AnimatePresence>
        {isThemeDropdownOpen && (
         <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-32 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-2 flex flex-col gap-1 shadow-xl z-50"
         >
           {['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].map((t) => (
             <button
               key={t}
               onClick={() => { setTheme(t); setIsThemeDropdownOpen(false); }}
               className={\`text-left text-[10px] font-bold px-3 py-2 rounded-lg transition-colors \${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}\`}
             >
               {t.charAt(0).toUpperCase() + t.slice(1)}
             </button>
           ))}
         </motion.div>
        )}
       </AnimatePresence>
     </div>
`;

content = content.replace(
  /<button onClick=\{toggleTheme\} className="text-black dark:text-white p-1 hover:opacity-70 transition-opacity flex items-center">\s*\{theme === 'light' \? <Moon className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/> : theme === 'dark' \? <Sun className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/> : <Palette className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/>\}\s*<\/button>/,
  mobileThemeBtn
);
// In case the `flex items-center` isn't there:
content = content.replace(
  /<button onClick=\{toggleTheme\} className="text-black dark:text-white p-1 hover:opacity-70 transition-opacity">\s*\{theme === 'light' \? <Moon className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/> : theme === 'dark' \? <Sun className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/> : <Palette className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/>\}\s*<\/button>/,
  mobileThemeBtn
);


fs.writeFileSync('src/components/Header.tsx', content);
