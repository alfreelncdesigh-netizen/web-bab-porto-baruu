const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// The mobile layout starts around MOBILE VIEW ONLY
const modalRegex = /<div className="overflow-y-auto pr-1 space-y-5 text-left pb-2">([\s\S]*?)<\/div>\s*\{\/\* Bottom Notice \*\/\}/;

let modalContent = content.match(modalRegex)[1];

// Update Section 1
modalContent = modalContent.replace(/<span className="px-2 py-1 rounded-md text-\[9px\] md:text-\[10px\] font-bold bg-blue-50 dark:bg-blue-900\/30 text-\[#00529C\] dark:text-blue-400">Aktif<\/span>/g, '');
modalContent = modalContent.replace(/<span className="px-2 py-1 rounded-md text-\[9px\] md:text-\[10px\] font-bold bg-blue-50 dark:bg-blue-900\/30 text-\[#00529C\] dark:text-blue-400">Instan<\/span>/g, '');

// Update Section 2
modalContent = modalContent.replace(/<span className="px-2 py-1 rounded-md text-\[9px\] md:text-\[10px\] font-bold bg-[a-z]+-50.*?Online<\/span>/g, '');

// Scale down icons and text
modalContent = modalContent.replace(/className="h-6 md:h-7 w-auto object-contain"/g, 'className="h-4 md:h-5 w-auto object-contain"');
modalContent = modalContent.replace(/className="h-5 md:h-6 w-auto object-contain"/g, 'className="h-4 md:h-5 w-auto object-contain"');
modalContent = modalContent.replace(/className="h-4 md:h-5 w-auto object-contain"/g, 'className="h-3.5 md:h-4 w-auto object-contain"');
modalContent = modalContent.replace(/w-\[60px\] md:w-\[70px\]/g, 'w-[40px] md:w-[50px]');

modalContent = modalContent.replace(/text-sm md:text-base/g, 'text-xs md:text-sm');
modalContent = modalContent.replace(/text-\[10px\] md:text-\[11px\]/g, 'text-[9px] md:text-[10px]');

// Add Button
const newModalContent = `<div className="overflow-y-auto pr-1 space-y-5 text-left pb-2">` + modalContent + `</div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3">
                <button 
                  type="button" 
                  onClick={(e) => { 
                    setShowPaymentModal(false); 
                    if ((window.innerWidth >= 768 && isDesktopStep3Valid) || (window.innerWidth < 768 && isMobileStep4Valid)) {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent); 
                    } else {
                      alert('Mohon lengkapi formulir terlebih dahulu sebelum lanjut pembelian.');
                    }
                  }} 
                  className="w-full bg-[#25D366] text-white py-3 md:py-3.5 rounded-xl text-xs md:text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-2"
                >
                  Lanjut Pembelian via WhatsApp
                </button>
              </div>
              {/* Bottom Notice */}`;

content = content.replace(modalRegex, newModalContent);

fs.writeFileSync('src/components/Store.tsx', content);
