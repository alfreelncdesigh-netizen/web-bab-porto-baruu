export interface HeroBanner {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  link?: string;
  linkText?: string;
  active?: boolean;
  overlayText?: boolean;
}

export interface PromoPosterItem {
  id: string;
  title: string;
  image: string;
  ctaText: string;
  link: string;
  active: boolean;
}

export interface CvSectionItem {
  title: string;
  content: string;
  image?: string;
  images?: string[];
}

export const defaultCvSections: CvSectionItem[] = [
  {
    title: "Professional Summary",
    content: "Desainer Grafis & UI/UX dengan dedikasi tinggi dalam menciptakan identitas visual yang presisi, estetis, dan fungsional. Berpengalaman menangani proyek branding, publikasi media, hingga antarmuka sistem digital.",
    images: []
  },
  {
    title: "Pendidikan",
    content: "<b>SMK Negeri 1 Sinjai</b><br/>Teknik Komputer dan Jaringan (TKJ)<br/>Fokus pada dasar rekayasa sistem komputer, logika jaringan, dan pengembangan kreativitas desain digital.",
    images: []
  },
  {
    title: "Pengalaman Kerja & Proyek",
    content: "<b>Freelance Graphic Designer & UI/UX</b> (2021 - Sekarang)<br/>Merancang materi promosi, poster acara, identitas visual brand, serta antarmuka prototipe web/mobile.<br/><br/><b>Creative Visual Contributor</b><br/>Membuat aset template visual dan konten media sosial kreatif.",
    images: []
  },
  {
    title: "Keahlian",
    content: "<b>Visual & Design:</b> Adobe Photoshop, Adobe Illustrator, Figma, Canva, Affinity Designer.<br/><b>Prinsip:</b> Tipografi Modern, Komposisi Grid, Teori Warna, Layout Editorial, UI/UX Design.",
    images: []
  }
];

export interface SiteSettings {
  cvPdfFile?: string;
  cvRole?: string;
  cvSections?: CvSectionItem[];
  
  fullName: string;
  heroBadge?: string;
  heroTitle1: string;
  heroTitle2: string;
  heroDescription: string;
  aboutTitle1: string;
  aboutTitle2: string;
  aboutDescription1: string;
  aboutDescription2: string;
  aboutImage: string;
  heroImage: string;
  heroBanners?: HeroBanner[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  portfolioLink?: string;
  promoWidgetActive?: boolean;
  promoWidgetImage?: string;
  promoWidgetLink?: string;
  promoWidgetCtaText?: string;
  promoPosters?: PromoPosterItem[];
}

export const defaultPromoPosters: PromoPosterItem[] = [
  {
    id: "poster-1",
    title: "Diskon 30% Paket Branding & Desain UI/UX",
    image: "/src/assets/images/promo_poster_1789471291192.jpg",
    ctaText: "Ambil Diskon",
    link: "https://wa.me/628112345678?text=Halo%20saya%20tertarik%20dengan%20Promo%20Diskon%2030%25%20Desain",
    active: true,
  },
  {
    id: "poster-2",
    title: "Koleksi Eksklusif Template & Asset Grafis",
    image: "/src/assets/images/banner_promo_crea_1788696808849.jpg",
    ctaText: "Buka Store",
    link: "#store",
    active: true,
  },
  {
    id: "poster-3",
    title: "Konsultasi Desain & Audit Portofolio Gratis",
    image: "/src/assets/images/banner_promo_bca_1788696791480.jpg",
    ctaText: "Chat Sekarang",
    link: "https://wa.me/628112345678?text=Halo%20saya%20ingin%20konsultasi%20desain%20gratis",
    active: true,
  }
];

export const defaultSettings: SiteSettings = {
  cvRole: "Desainer Grafis",
  cvSections: defaultCvSections,
  fullName: "Muhammad Albiansyah",
  heroBadge: "MY PORTOFOLIO DESIGN",
  heroTitle1: "WELCOME",
  heroTitle2: "My portofolio design",
  heroDescription: "Saya membantu merek dan perusahaan mengubah ide kompleks menjadi desain antarmuka yang sederhana, indah, dan berpusat pada manusia.",
  aboutTitle1: "Pendekatan",
  aboutTitle2: "Desain Saya",
  aboutDescription1: "Desain yang baik bukan hanya tentang bagaimana ia terlihat, tetapi bagaimana ia berfungsi. Saya percaya pada pendekatan minimalis dimana setiap elemen memiliki tujuan.",
  aboutDescription2: "Dengan pengalaman lebih dari 5 tahun di industri kreatif, saya telah bekerja dengan berbagai klien dari startup hingga perusahaan besar untuk merancang produk digital yang tidak hanya estetis, tetapi juga memecahkan masalah pengguna secara nyata.",
  aboutImage: "",
  heroImage: "/src/assets/images/editing_tools_3d_1787123977793.jpg",
  heroBanners: [
    {
      id: "banner-1",
      image: "/src/assets/images/banner_promo_bca_1788696791480.jpg",
      title: "Praktis Pembayaran & Konsultasi Desain Digital",
      subtitle: "Solusi antarmuka dan visual presisi tinggi untuk pertumbuhan brand Anda",
      badge: "PROMO SPESIAL",
      link: "#portfolio",
      linkText: "Lihat Karya",
      active: true,
      overlayText: false
    }
  ],
  contactEmail: "alfreelnc.desigh@gmail.com",
  contactPhone: "+62 823-9454-9268",
  contactLocation: "Kabupaten Sinjai Utara",
  portfolioLink: "https://alfreelnc.com",
  promoWidgetActive: true,
  promoWidgetImage: "/src/assets/images/promo_poster_1789471291192.jpg",
  promoWidgetLink: "https://wa.me/628112345678?text=Halo%20saya%20tertarik%20dengan%20promo%20diskon%20desain%20grafis",
  promoWidgetCtaText: "Ambil Diskon",
  promoPosters: defaultPromoPosters,
};
