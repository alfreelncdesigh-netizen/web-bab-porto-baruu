const fs = require('fs');
const lines = fs.readFileSync('src/components/Store.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* Scrollable List */}'));
const endIdx = lines.findIndex(l => l.includes('{/* Bottom Notice */}'));

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `              {/* Scrollable List */}
              <div className="overflow-y-auto pr-1 space-y-5 text-left pb-2">
                {/* Section 1: Transfer Bank */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Transfer Bank Resmi</span>
                    <span className="text-[10px] md:text-[11px] text-zinc-400 font-medium">Online 24 Jam</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Bank BRI */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><BriLogo className="h-6 md:h-7 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">Bank BRI</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">ATM / Antar Bank</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-[#00529C] dark:text-blue-400">Aktif</span>
                    </div>

                    {/* BRImo */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><BrimoLogo className="h-6 md:h-7 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">BRImo</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">Mobile Banking</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-[#00529C] dark:text-blue-400">Instan</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: E-Wallet & Dompet Digital */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Dompet Digital (E-Wallet)</span>
                    <span className="text-[10px] md:text-[11px] text-zinc-400 font-medium">Bebas Biaya Admin</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* DANA */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><DanaLogo className="h-5 md:h-6 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">DANA</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">Dompet Digital</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-sky-50 dark:bg-sky-900/30 text-[#118EEA] dark:text-sky-400">Online</span>
                    </div>

                    {/* GoPay */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><GopayLogo className="h-6 md:h-7 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">GoPay</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">Gojek App</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-cyan-50 dark:bg-cyan-900/30 text-[#00AED6] dark:text-cyan-400">Online</span>
                    </div>

                    {/* OVO */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><OvoLogo className="h-5 md:h-6 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">OVO</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">OVO Cash</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-purple-50 dark:bg-purple-900/30 text-[#4C2A86] dark:text-purple-400">Online</span>
                    </div>

                    {/* ShopeePay */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><ShopeePayLogo className="h-4 md:h-5 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">ShopeePay</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">Shopee & QRIS</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-orange-50 dark:bg-orange-900/30 text-[#EE4D2D] dark:text-orange-400">Online</span>
                    </div>

                    {/* LinkAja */}
                    <div className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-500 dark:hover:border-red-500 transition-all sm:col-span-2 cursor-default shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-[60px] md:w-[70px] shrink-0 flex items-center justify-start"><LinkAjaLogo className="h-5 md:h-6 w-auto object-contain" /></div>
                        <div>
                          <span className="block text-sm md:text-base font-bold text-zinc-900 dark:text-white leading-tight mb-0.5">LinkAja!</span>
                          <span className="block text-[10px] md:text-[11px] text-zinc-500">Dompet Digital BUMN</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-red-50 dark:bg-red-900/30 text-[#E32322] dark:text-red-400">Online</span>
                    </div>
                  </div>
                </div>
              </div>`;

  lines.splice(startIdx, endIdx - startIdx, replacement);
  fs.writeFileSync('src/components/Store.tsx', lines.join('\n'));
} else {
  console.log('Could not find boundaries');
}
