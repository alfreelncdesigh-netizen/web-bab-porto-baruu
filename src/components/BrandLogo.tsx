import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'auto' | 'black' | 'white';
}

/**
 * Komponen Logo Resmi ALFREELNC
 * Mengacu persis pada aset 'logo text hitam.png' & 'logo text putih.png':
 * - Titik aksen ungu di kiri atas (#6e2594)
 * - Teks 'ALFREELNC' dengan tipografi tebal presisi
 * - Warna teks otomatis hitam pada mode terang & putih pada mode gelap
 * - Titik aksen biru di kanan bawah (#0050a4)
 * - Bebas dari distorsi dan warna lain, profesional & tajam
 */
export default function BrandLogo({ 
  className = "h-5 sm:h-6 md:h-7", 
  variant = 'auto' 
}: BrandLogoProps) {
  if (variant === 'black') {
    return (
      <img 
        src="/logo-text-hitam.svg" 
        alt="ALFREELNC" 
        className={`${className} w-auto object-contain select-none`}
        loading="eager"
        decoding="async"
      />
    );
  }

  if (variant === 'white') {
    return (
      <img 
        src="/logo-text-putih.svg" 
        alt="ALFREELNC" 
        className={`${className} w-auto object-contain select-none`}
        loading="eager"
        decoding="async"
      />
    );
  }

  // Variant auto: otomatis ganti antara logo hitam & logo putih sesuai tema (light / dark)
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Tampil di Light Mode (Teks Hitam) */}
      <img 
        src="/logo-text-hitam.svg" 
        alt="ALFREELNC" 
        className="dark:hidden h-full w-auto object-contain select-none"
        loading="eager"
        decoding="async"
      />
      {/* Tampil di Dark & Themed Mode (Teks Putih) */}
      <img 
        src="/logo-text-putih.svg" 
        alt="ALFREELNC" 
        className="hidden dark:block h-full w-auto object-contain select-none"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
