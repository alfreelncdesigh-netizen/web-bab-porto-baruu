const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// The user wants labels on mobile to be 2x smaller. Currently they are already text-[9px] on mobile forms (e.g. `label className="block text-[9px] font-semibold text-zinc-700...`).
// Wait, for desktop forms, the classes are `text-sm lg:text-base`. On mobile desktop forms aren't shown, but wait - there is separate rendering for isDesktop and mobile!
// If they are text-[9px], what's 2x smaller? text-[8px] is the smallest standard Tailwind. Let's use text-[8px] or text-[10px] for desktop but mobile forms are using text-[9px].
// Ah, let's just use `text-[10px] md:text-sm lg:text-base` for desktop form labels, and `text-[8px]` for mobile form labels.
content = content.replace(/text-sm lg:text-base/g, 'text-[10px] md:text-sm lg:text-base');
content = content.replace(/text-\[9px\] font-semibold text-zinc-700/g, 'text-[8px] font-bold text-zinc-700');

// Add scroll lock effect for modals
const scrollLockEffect = `  useEffect(() => {
    if (showCancelPopup || showNavPopup || showPaymentModal || showServiceModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCancelPopup, showNavPopup, showPaymentModal, showServiceModal]);`;

content = content.replace(
  /  const clearForm = \(\) => \{/g,
  `${scrollLockEffect}\n\n  const clearForm = () => {`
);

// Fix grid for Format and Jumlah (to be 2-column always on desktop grid and mobile grid)
// In desktop:
content = content.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">\n                          <div>\n                            <label/g,
  `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-6">
                          <div>
                            <label`
);
// Wait, I can just replace the specific section in desktop and mobile.

fs.writeFileSync('src/components/Store.tsx', content);
