import { QuickFilterItem } from '../types/quickFilter';

export const initialQuickFilterItems: QuickFilterItem[] = [
  {
    id: 'qfa_1',
    category: 'Tren Warna',
    question: 'Warna apa saja yang sedang mendominasi tren desain grafis & digital branding saat ini?',
    answer: 'Tren warna modern berfokus pada palet kontras tinggi dan gradasi organik (aurora mesh gradients). Warna-warna unggulan meliputi Electric Indigo (#4F46E5), Cyberpunk Neon Green/Lime (#10B981 & #A3E635), Ultra Violet, serta nuansa Earthy Warm Tones (terracotta, stone gray, sand beige) yang memberikan kesan estetik, bersih, dan premium.',
    images: [
      '/images/editing_tools_3d_1787123977793.jpg',
      '/images/minimalist_3d_illustration_1787122966121.jpg'
    ],
    tags: ['Tren Warna', 'Palet Warna', 'Desain Grafis'],
    order: 1,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_2',
    category: 'Tren Warna',
    question: 'Bagaimana rumus 60-30-10 diterapkan dalam pemilihan warna identitas visual?',
    answer: 'Aturan 60-30-10 adalah pedoman harmonisasi visual: 60% untuk warna dominan (biasanya netral seperti putih, hitam arang, atau abu lembut pada latar), 30% untuk warna sekunder (elemen kartu, border, tipografi sub-heading), dan 10% untuk warna aksen kontras (tombol CTA, badge sorotan, dan ikon penting). Komposisi ini mencegah saturasi berlebih dan menjaga kenyamanan mata.',
    images: [],
    tags: ['Tips Desain', 'Formula 60-30-10', 'Harmoni'],
    order: 2,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_3',
    category: 'Tren Desain',
    question: 'Apa saja ciri khas utama tren desain visual dan poster kreatif terkini?',
    answer: 'Karakteristik utama tren desain saat ini mencakup tipografi tebal ekspresif (Grotesque Sans & Display Typefaces), tata letak asimetris dinamis, sentuhan tekstur film grain lembut, elemen 3D minimalis bervolume, serta gaya Neo-Brutalism elegan dengan sudut rounded lembut dan bayangan terukur (soft drop-shadows).',
    images: [
      '/images/promo_poster_1789471291192.jpg',
      '/images/banner_promo_crea_1788696808849.jpg'
    ],
    tags: ['Tren Desain', 'Poster Kreatif', 'Tipografi'],
    order: 3,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_4',
    category: 'Tren Desain',
    question: 'Mengapa poster promosi modern lebih efektif menggunakan visual hierarki minimalis?',
    answer: 'Pengguna media sosial rata-rata hanya meluangkan waktu 1,5 hingga 2 detik sebelum menggulir layar. Visual hierarki yang tegas—judul ringkas berdampak tinggi, titik fokus visual tunggal, dan ruang negatif lega—mampu menyampaikan pesan utama secara instan tanpa membuat audiens merasa kewalahan oleh teks padat.',
    images: [],
    tags: ['Stopping Power', 'Visual Hierarchy', 'Konversi'],
    order: 4,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_5',
    category: 'Tips Branding',
    question: 'Apa langkah awal paling krusial dalam membangun identitas brand yang konsisten?',
    answer: 'Langkah terpenting adalah menyusun Brand Identity Kit komprehensif yang berisi: filosofi logo (master mark & ikon sekunder), panduan ruang aman (clearance space), aturan hierarki font resmi (Heading, Subhead, Body Text), palet warna primer-sekunder beserta kode HEX/RGB/CMYK, serta moodboard panduan visual pendukung.',
    images: [
      '/images/banner_promo_bca_1788696791480.jpg'
    ],
    tags: ['Brand Kit', 'Identitas Visual', 'Konsistensi'],
    order: 5,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_6',
    category: 'Tips Branding',
    question: 'Kapan saat yang tepat bagi brand atau UMKM untuk melakukan visual redesign / rebranding?',
    answer: 'Rebranding disarankan ketika: (1) Target demografi audiens bertransformasi, (2) Logo lama terlihat kaku dan tidak optimal di resolusi layar mobile atau favicon, (3) Terjadi perluasan produk/jasa baru, atau (4) Brand ingin meningkatkan persepsi nilai (repositioning) ke segmen yang lebih premium dan profesional.',
    images: [],
    tags: ['Rebranding', 'UMKM', 'Transformasi'],
    order: 6,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'qfa_7',
    category: 'Jasa & Order',
    question: 'Bagaimana alur pemesanan jasa desain poster dan visual branding di Alfreelnc?',
    answer: 'Alur sangat mudah & terarah: (1) Pilih paket layanan di menu Order atau tombol Kontak, (2) Diskusikan brief, referensi visual, serta deadline, (3) Proses pengerjaan konsep desain (1-3 hari kerja), (4) Preview hasil dan sesi revisi adaptif, (5) Serah terima file master lengkap kualitas cetak & digital (PNG, WebP, PDF High-Res, AI/PSD bila dipesan).',
    images: [],
    tags: ['Alur Kerja', 'Order Desain', 'Alfreelnc'],
    order: 7,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultPresetCategories: string[] = [
  'Tren Warna',
  'Tren Desain',
  'Tips Branding',
  'Jasa & Order'
];
