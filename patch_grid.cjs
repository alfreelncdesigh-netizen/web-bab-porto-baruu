const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// Replace Desktop Grid
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">\n                          <div>\n                            <label className="block text-\[10px\] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Tujuan Desain \(Opsional\)<\/label>/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">
                          <div>
                            <label className="block text-[10px] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Tujuan Desain (Opsional)</label>`
);

// We need Format and Jumlah to be next to each other on both mobile and desktop.
// So on Desktop:
content = content.replace(
  /                          <div>\n                            <label className="block text-\[10px\] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Format Ukuran \(Opsional\)<\/label>\n                            <div className="relative">\n                              <Maximize className="absolute left-4 top-1\/2 -translate-y-1\/2 w-5 h-5 text-zinc-400" \/>\n                              <FastInput type="text" name="format" value=\{formData\.format\} onChange=\{handleChange\} className=\{inputClassDesktop\} placeholder="Contoh: 1080x1080px" \/>\n                            <\/div>\n                          <\/div>\n                          <div>\n                            <label className="block text-\[10px\] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Jumlah \(Opsional\)<\/label>\n                            <div className="relative">\n                              <Hash className="absolute left-4 top-1\/2 -translate-y-1\/2 w-5 h-5 text-zinc-400" \/>\n                              <FastInput type="number" min="1" name="jumlah" value=\{formData\.jumlah\} onChange=\{handleChange\} className=\{inputClassDesktop\} placeholder="Contoh: 3" \/>\n                            <\/div>\n                          <\/div>/,
  `                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                          <div>
                            <label className="block text-[10px] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Format Ukuran</label>
                            <div className="relative">
                              <Maximize className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                              <FastInput type="text" name="format" value={formData.format} onChange={handleChange} className={inputClassDesktop} placeholder="1080x1080px" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] md:text-sm lg:text-base font-bold text-zinc-700 dark:text-zinc-300 mb-2">Jumlah</label>
                            <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                              <FastInput type="number" min="1" name="jumlah" value={formData.jumlah} onChange={handleChange} className={inputClassDesktop} placeholder="Misal: 3" />
                            </div>
                          </div>`
);

// Mobile Grid (around line 759)
content = content.replace(
  /                      <div>\n                        <label className="block text-\[8px\] font-bold text-zinc-700 dark:text-zinc-300 mb-1">Format Ukuran<\/label>\n                        <FastInput type="text" name="format" value=\{formData\.format\} onChange=\{handleChange\} className=\{inputClassMobile\} placeholder="Contoh: 1080x1080px" \/>\n                      <\/div>\n                      <div>\n                        <label className="block text-\[8px\] font-bold text-zinc-700 dark:text-zinc-300 mb-1">Jumlah<\/label>\n                        <FastInput type="number" min="1" name="jumlah" value=\{formData\.jumlah\} onChange=\{handleChange\} className=\{inputClassMobile\} placeholder="Contoh: 3" \/>\n                      <\/div>/,
  `                      <div className="grid grid-cols-2 gap-3 col-span-1">
                        <div>
                          <label className="block text-[8px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">Format Ukuran</label>
                          <FastInput type="text" name="format" value={formData.format} onChange={handleChange} className={inputClassMobile} placeholder="1080x1080px" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">Jumlah</label>
                          <FastInput type="number" min="1" name="jumlah" value={formData.jumlah} onChange={handleChange} className={inputClassMobile} placeholder="Misal: 3" />
                        </div>
                      </div>`
);

fs.writeFileSync('src/components/Store.tsx', content);
