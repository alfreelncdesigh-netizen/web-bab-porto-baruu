const fs = require('fs');

const content = `import React from 'react';

export interface PaymentMethodItem {
  id: string;
  name: string;
  category: 'E-Wallet' | 'Transfer Bank';
  type: string;
  description: string;
  color: string;
  badgeBg: string;
  logo: React.ReactNode;
}

// 1. Bank BRI
export const BriLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#00529C" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="36" letterSpacing="2">BRI</text>
  </svg>
);

// 2. BRImo
export const BrimoLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#00529C" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="32">BRI</text>
    <text x="62" y="32" fill="#F58220" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="32">mo</text>
  </svg>
);

// 3. DANA
export const DanaLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#118EEA" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="34" letterSpacing="1">DANA</text>
  </svg>
);

// 4. GoPay
export const GopayLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#00AED6" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="32" letterSpacing="-1">gopay</text>
  </svg>
);

// 5. OVO
export const OvoLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#4C2A86" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="36" letterSpacing="1">OVO</text>
  </svg>
);

// 6. ShopeePay
export const ShopeePayLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#EE4D2D" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="28">ShopeePay</text>
  </svg>
);

// 7. LinkAja!
export const LinkAjaLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <text x="0" y="32" fill="#E32322" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="32">LinkAja!</text>
  </svg>
);

export const PAYMENT_METHODS: PaymentMethodItem[] = [];
`;
fs.writeFileSync('src/components/PaymentLogos.tsx', content);
