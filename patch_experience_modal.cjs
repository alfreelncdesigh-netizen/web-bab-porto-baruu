const fs = require('fs');
let content = fs.readFileSync('src/components/Experience.tsx', 'utf8');

// Update state type for selectedImg
content = content.replace(
  /const \[selectedImg, setSelectedImg\] = useState<string \| null>\(null\);/,
  'const [selectedImg, setSelectedImg] = useState<{url: string, exp: any} | null>(null);'
);

// Update calls to setSelectedImg
content = content.replace(
  /onClick=\{\(\) => setSelectedImg\(exp\.images\[0\]\)\}/g,
  'onClick={() => setSelectedImg({url: exp.images[0], exp: exp})}'
);

content = content.replace(
  /onClick=\{\(\) => setSelectedImg\(img\)\}/g,
  'onClick={() => setSelectedImg({url: img, exp: documentationExp})}'
);

// Change Fullscreen Image Modal
const modalRegex = /\{\/\* Fullscreen Image Modal \*\/\}\s*\{selectedImg && \([\s\S]*?\}\)\s*<\/section>/;

const newModal = `      {/* Fullscreen Image Modal */}
      <AnimatePresence>
      {selectedImg && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[200] bg-white dark:bg-[#0A0A0A] flex flex-col overflow-y-auto custom-scrollbar"
        >
          <div className="relative w-full max-w-5xl mx-auto bg-zinc-50 dark:bg-[#111111] border-b border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setSelectedImg(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:scale-105 transition-transform shadow-md"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full h-auto min-h-[40vh] max-h-[70vh] flex items-center justify-center p-4 md:p-10">
              <img src={getOptimizedImageUrl(selectedImg.url)} className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800" />
            </div>
          </div>
          
          <div className="w-full max-w-4xl mx-auto px-6 py-8 md:py-12 flex flex-col">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[10px] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-3 w-fit shadow-sm">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500" /> {selectedImg.exp?.subtheme}
            </div>
            <h3 className="text-3xl md:text-5xl font-bold text-black dark:text-white mb-6 leading-tight tracking-tight">
              {selectedImg.exp?.header}
            </h3>
            
            {selectedImg.exp?.description && (
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedImg.exp.description}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>`;

// Because AnimatePresence is used, need to make sure it's imported in Experience.tsx.
if (!content.includes('AnimatePresence')) {
  content = content.replace(/import \{ motion \} from 'motion\/react';/, "import { motion, AnimatePresence } from 'motion/react';");
}

content = content.replace(modalRegex, newModal);

fs.writeFileSync('src/components/Experience.tsx', content);
