const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// 1. Remove text "Online 24 Jam"
content = content.replace(
  /<span className="text-\[9px\] md:text-\[10px\] text-zinc-400 font-medium">Online 24 Jam<\/span>/g,
  ''
);

// 2. Remove text "Bebas Biaya Admin"
content = content.replace(
  /<span className="text-\[9px\] md:text-\[10px\] text-zinc-400 font-medium">Bebas Biaya Admin<\/span>/g,
  ''
);

// 3. Make icons and texts smaller for mobile
// e.g. "w-[40px] md:w-[50px]" to "w-[30px] md:w-[50px]"
content = content.replace(/w-\[40px\]/g, 'w-[25px]');
content = content.replace(/h-3\.5 md:h-4/g, 'h-2 md:h-4');
content = content.replace(/text-xs md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0\.5/g, 'text-[10px] md:text-sm font-bold text-zinc-900 dark:text-white leading-tight mb-0');
content = content.replace(/text-\[9px\] md:text-\[10px\] text-zinc-500/g, 'text-[8px] md:text-[10px] text-zinc-500');
content = content.replace(/p-3 md:p-4 rounded-xl/g, 'p-2 md:p-4 rounded-lg md:rounded-xl');
content = content.replace(/gap-4/g, 'gap-2 md:gap-4'); // padding between icon and text

// 4. Add "Lanjut Pembelian" button at the bottom of the modal.
// Modal closes at:
//                 </div>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       )}
// Let's find the scrollable list end.
content = content.replace(
  /<\/div>\s*<\/div>\s*<\/motion\.div>\s*<\/div>\s*<\/div>\s*\)\}/,
  `                </div>
              </div>
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={(e) => {
                    setShowPaymentModal(false);
                    handleWhatsAppSubmit(e);
                  }}
                  className="w-full bg-[#25D366] text-white py-3 rounded-xl text-xs md:text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"
                >
                  <Send className="w-4 h-4" /> Lanjut Pembelian
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}`
);

fs.writeFileSync('src/components/Store.tsx', content);
