const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Mobile and Desktop all use 'pt-6 flex justify-end' or 'pt-6 flex justify-between', 'pt-2 flex justify-end', 'pt-2 flex justify-between'
// Wait, replacing with regex will be easier.

// Desktop Step 1
content = content.replace(
  /<div className="pt-6 flex justify-end">\n                      <button type="button" disabled=\{\!isDesktopStep1Valid\} onClick=\{nextStep\} className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3\.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">\n                        Selanjutnya <ArrowRight className="w-4 h-4" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-6 flex justify-end gap-3">
                      {formData.jenisLayanan && (
                        <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                          Batal Order
                        </button>
                      )}
                      <button type="button" disabled={!isDesktopStep1Valid} onClick={nextStep} className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                        Selanjutnya <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>`
);

// Desktop Step 2
content = content.replace(
  /<div className="pt-6 flex justify-between">\n                      <button type="button" onClick=\{prevStep\} className="flex items-center gap-2 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-6 py-3\.5 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">\n                        <ArrowLeft className="w-4 h-4" \/> Sebelumnya\n                      <\/button>\n                      <button type="button" onClick=\{nextStep\} className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3\.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all">\n                        Selanjutnya <ArrowRight className="w-4 h-4" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-6 flex justify-between gap-3">
                      <button type="button" onClick={prevStep} className="flex items-center justify-center gap-2 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Sebelumnya
                      </button>
                      <div className="flex gap-3">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                            Batal Order
                          </button>
                        )}
                        <button type="button" onClick={nextStep} className="flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-8 py-3.5 rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all">
                          Selanjutnya <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>`
);

// Mobile Step 1
content = content.replace(
  /<div className="pt-2 flex justify-end">\n                      <button type="button" disabled=\{\!isValidDataDiri\} onClick=\{nextStep\} className="flex items-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">\n                        Selanjutnya <ArrowRight className="w-3 h-3" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-2 flex justify-end gap-2">
                      {formData.jenisLayanan && (
                        <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                          Batal Order
                        </button>
                      )}
                      <button type="button" disabled={!isValidDataDiri} onClick={nextStep} className="flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                        Selanjutnya <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>`
);

// Mobile Step 2
content = content.replace(
  /<div className="pt-2 flex justify-between">\n                      <button type="button" onClick=\{prevStep\} className="flex items-center gap-1\.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">\n                        <ArrowLeft className="w-3 h-3" \/> Sebelumnya\n                      <\/button>\n                      <button type="button" disabled=\{\!isValidDetailProduk\} onClick=\{nextStep\} className="flex items-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">\n                        Selanjutnya <ArrowRight className="w-3 h-3" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-2 flex justify-between gap-2">
                      <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-3 h-3" /> Sebelumnya
                      </button>
                      <div className="flex gap-2">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                            Batal Order
                          </button>
                        )}
                        <button type="button" disabled={!isValidDetailProduk} onClick={nextStep} className="flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                          Selanjutnya <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>`
);

// Mobile Step 3
content = content.replace(
  /<div className="pt-2 flex justify-between">\n                      <button type="button" onClick=\{prevStep\} className="flex items-center gap-1\.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">\n                        <ArrowLeft className="w-3 h-3" \/> Sebelumnya\n                      <\/button>\n                      <button type="button" disabled=\{\!isValidDeadline\} onClick=\{nextStep\} className="flex items-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">\n                        Selanjutnya <ArrowRight className="w-3 h-3" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-2 flex justify-between gap-2">
                      <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-3 h-3" /> Sebelumnya
                      </button>
                      <div className="flex gap-2">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                            Batal Order
                          </button>
                        )}
                        <button type="button" disabled={!isValidDeadline} onClick={nextStep} className="flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                          Selanjutnya <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>`
);

// Mobile Step 4
content = content.replace(
  /<div className="pt-2 flex justify-between">\n                      <button type="button" onClick=\{prevStep\} className="flex items-center gap-1\.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">\n                        <ArrowLeft className="w-3 h-3" \/> Sebelumnya\n                      <\/button>\n                      <button type="button" onClick=\{nextStep\} className="flex items-center gap-1\.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1\.5 rounded-lg text-\[9px\] font-semibold hover:scale-105 active:scale-95 transition-all">\n                        Selanjutnya <ArrowRight className="w-3 h-3" \/>\n                      <\/button>\n                    <\/div>/,
  `<div className="pt-2 flex justify-between gap-2">
                      <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                        <ArrowLeft className="w-3 h-3" /> Sebelumnya
                      </button>
                      <div className="flex gap-2">
                        {formData.jenisLayanan && (
                          <button type="button" onClick={() => setShowCancelPopup(true)} className="flex items-center justify-center gap-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                            Batal Order
                          </button>
                        )}
                        <button type="button" onClick={nextStep} className="flex items-center justify-center gap-1.5 bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-lg text-[9px] font-semibold hover:scale-105 active:scale-95 transition-all">
                          Selanjutnya <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>`
);

fs.writeFileSync('src/components/Store.tsx', content);
