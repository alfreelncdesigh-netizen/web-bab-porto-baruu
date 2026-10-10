const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

const popups = `
      {/* Cancel Order Popup */}
      <AnimatePresence>
        {showCancelPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCancelPopup(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Batalkan Orderan?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Semua data yang sudah Anda isi akan terhapus secara permanen. Apakah Anda yakin ingin membatalkan?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCancelPopup(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Hapus Data
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Intercept Popup */}
      <AnimatePresence>
        {showNavPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNavPopup(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4"
            >
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">Simpan Sebagai Draft?</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Anda sedang mengisi form orderan. Anda dapat menyimpannya sebagai draft untuk dilanjutkan nanti, atau batalkan untuk menghapus isian.
                </p>
              </div>
              
              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={navDraft}
                  className="w-full py-3.5 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Simpan Draft
                </button>
                <button
                  onClick={navDiscard}
                  className="w-full py-3.5 px-4 rounded-xl font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Batalkan Orderan
                </button>
                <button
                  onClick={navStay}
                  className="w-full py-3.5 px-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Tetap di Halaman
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

content = content.replace(
  /    <\/div>\n  <\/div>\n\n    <\/section>\n  \);\n\}/,
  `    </div>\n  </div>\n\n${popups}\n    </section>\n  );\n}`
);

// Fallback in case the replacement didn't match perfectly
if (content.includes(popups.trim().substring(0, 50))) {
  console.log("Already appended");
} else {
  const parts = content.split('</section>');
  if (parts.length >= 2) {
    content = parts[0] + popups + '\n    </section>' + parts[1];
  }
}

fs.writeFileSync('src/components/Store.tsx', content);
