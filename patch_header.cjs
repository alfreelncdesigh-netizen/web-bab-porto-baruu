const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

content = content.replace(
  /import \{ Menu, X, Sun, Moon \} from 'lucide-react';/,
  "import { Menu, X, Sun, Moon, Palette } from 'lucide-react';"
);

content = content.replace(
  /const \{ isDark, toggleTheme \} = useTheme\(\);/,
  "const { theme, isDark, toggleTheme } = useTheme();"
);

// We replace the toggle button logic.
// Desktop button
content = content.replace(
  /\{isDark \? <Sun size=\{16\} \/> : <Moon size=\{16\} \/>\}/,
  "{theme === 'light' ? <Moon size={16} /> : theme === 'dark' ? <Sun size={16} /> : <Palette size={16} />}"
);

// Mobile button
content = content.replace(
  /\{isDark \? <Sun className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/> : <Moon className="w-3\.5 h-3\.5 md:w-\[18px\] md:h-\[18px\]" \/>\}/,
  "{theme === 'light' ? <Moon className=\"w-3.5 h-3.5 md:w-[18px] md:h-[18px]\" /> : theme === 'dark' ? <Sun className=\"w-3.5 h-3.5 md:w-[18px] md:h-[18px]\" /> : <Palette className=\"w-3.5 h-3.5 md:w-[18px] md:h-[18px]\" />}"
);

// Add title to desktop button
content = content.replace(
  /aria-label="Toggle Theme"/,
  'aria-label="Toggle Theme" title={`Tema Saat Ini: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}'
);

fs.writeFileSync('src/components/Header.tsx', content);
