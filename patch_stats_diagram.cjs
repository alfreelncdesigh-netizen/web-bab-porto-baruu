const fs = require('fs');
let content = fs.readFileSync('src/components/Stats.tsx', 'utf8');

// Ensure state is added
if (!content.includes('const [showCharts, setShowCharts] = useState(false);')) {
  content = content.replace(
    /export default function Stats\(\) \{/,
    'export default function Stats() {\n  const [showCharts, setShowCharts] = useState(false);'
  );
}

content = content.replace(/Kategori Karya \(Diagram Batang\)/g, 'Kategori Karya');
content = content.replace(/Kategori Order \(Diagram Lingkaran\)/g, 'Kategori Order');
content = content.replace(/Pertumbuhan Karya \(Diagram Garis\)/g, 'Pertumbuhan Karya');

const splitStr = '{/* Charts Grid */}';
const parts = content.split(splitStr);

if (parts.length > 1) {
    let before = parts[0];
    let after = parts[1];
    
    // We want to wrap the <div className="grid ..."> that comes right after
    const gridStartRegex = /<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12">/;
    const gridStartMatch = after.match(gridStartRegex);
    
    if (gridStartMatch) {
      after = after.replace(gridStartRegex, 
        `<div className="flex justify-center mb-8">
           <button 
             onClick={() => setShowCharts(!showCharts)} 
             className="text-[10px] md:text-sm font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-full bg-white dark:bg-[#111]"
           >
             {showCharts ? 'Sembunyikan Detail Diagram' : 'Lihat Detail Diagram'}
           </button>
         </div>
         {showCharts && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">`
      );
      
      // Need to close the condition before </>
      const endTagIndex = after.lastIndexOf('</>');
      if (endTagIndex !== -1) {
        after = after.substring(0, endTagIndex) + ')}\n       ' + after.substring(endTagIndex);
      }
    }
    content = before + splitStr + after;
}

fs.writeFileSync('src/components/Stats.tsx', content);
