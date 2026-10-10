const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

const cancelPopupRegex = /\{\/\* Cancel Order Popup \*\/\}.*?(?=\{\/\* Navigation Intercept Popup \*\/\})/s;
const navPopupRegex = /\{\/\* Navigation Intercept Popup \*\/\}.*?(?=<\/section>)/s;

const newCancelPopup = `{/* Cancel Order Popup */}
      <AnimatePresence>
        {showCancelPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-8 md:pb-12 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCancelPopup(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-5 md:p-6 shadow-2xl border border-white/20 dark:border-zinc-800/50"
            >
              <h3 className="text-lg md:text-xl font-bold text-black dark:text-white mb-2">Batalkan Orderan?</h3>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Data yang sudah diisi akan terhapus secara permanen. Yakin ingin membatalkan?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelPopup(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-zinc-200/50 dark:bg-zinc-800/50 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  Kembali
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-red-600/90 text-white hover:bg-red-700 transition-colors text-sm shadow-lg shadow-red-600/20"
                >
                  Hapus Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      `;

const newNavPopup = `{/* Navigation Intercept Popup */}
      <AnimatePresence>
        {showNavPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-8 md:pb-12 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={navStay}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-5 md:p-6 shadow-2xl border border-white/20 dark:border-zinc-800/50 flex flex-col gap-4"
            >
              <div>
                <h3 className="text-lg md:text-xl font-bold text-black dark:text-white mb-2">Simpan Sebagai Draft?</h3>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
                  Anda dapat menyimpannya sebagai draft untuk dilanjutkan nanti, atau batalkan untuk menghapus form.
                </p>
              </div>
              
              <div className="flex flex-col gap-2.5 mt-2">
                <button
                  onClick={navDraft}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-blue-600/90 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-sm"
                >
                  Simpan Draft
                </button>
                <button
                  onClick={navDiscard}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-red-100/80 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                >
                  Batalkan Orderan
                </button>
                <button
                  onClick={navStay}
                  className="w-full py-3 px-4 rounded-xl font-bold bg-zinc-200/50 dark:bg-zinc-800/50 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  Tetap di Halaman
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

content = content.replace(cancelPopupRegex, newCancelPopup);
content = content.replace(navPopupRegex, newNavPopup);

fs.writeFileSync('src/components/Store.tsx', content);
