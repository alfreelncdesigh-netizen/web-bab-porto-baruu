const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

// The grids with 2 columns are currently `grid-cols-2`.
// The user asks "kolom kolom di menu order, buat lebih berdekatan dan lebih kecil lagi, sesuaikan layout nya di dengan device mobile"
// and "buat kisi nya 2 kanan dan kiri setiap metode pembayaran"
// It looks like for mobile they want everything tighter and 2 columns for payment methods.

// 1. Fixing Desktop vs Mobile form fields grid
content = content.replace(
  /className="grid grid-cols-2 gap-4"/g,
  'className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"'
);

// 2. Fixing Desktop 2-column layout to be responsive
content = content.replace(
  /className="grid grid-cols-2 gap-10"/g,
  'className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10"'
);
content = content.replace(
  /className="grid grid-cols-2 gap-10 h-full"/g,
  'className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 h-full"'
);

fs.writeFileSync('src/components/Store.tsx', content);
