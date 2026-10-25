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
    title: "PROFESIONAL SUMMARY",
    content: "Seorang Desainer Garis dengan pengalaman dalam menciptakan solusi visual yang fungsional dan estetis.",
    images: []
  },
  {
    title: "PENDIDKAN",
    content: "<b>UPT SMK NEGERI 1 Sinjai</b> - Sinjai Utara<br/>Jurusan Teknik Komputer dan Jaringan.",
    images: []
  },
  {
    title: "PENGALAMAN KERJA & PROYEK",
    content: "<b>Jasa Desain Grafis Freelance</b> - Sekarang<br/>Merancang materi visual, branding, dan poster.",
    images: []
  },
  {
    title: "KEAHLIAN",
    content: "<b>Hard Skills</b><br/>Desain Grafis : Poster, Sertifikat, Identitas Visual, Kemasan.",
    images: []
  },
  {
    title: "SERTIFIKASI",
    content: "<b>Workshop Video Editing</b> - 2024",
    images: []
  },
  {
    title: "PROYEK UNGGULAN",
    content: "<b>Branding Media Sosial</b>",
    images: []
  }
];

export interface CollaboratorAccount {
  id: string;
  username: string;
  password: string;
  partnerName?: string;
  partnerLogo?: string;
  active: boolean;
  createdAt?: string;
}

export interface CollaborationConfig {
  enabled: boolean;
  partnerName: string;
  partnerLogo: string;
  collaborationText?: string;
  autoTagNewItems?: boolean;
  collaboratorUsername?: string;
  collaboratorPassword?: string;
  collaboratorLoginEnabled?: boolean;
  collaboratorAccounts?: CollaboratorAccount[];
}

export interface SiteSettings {
  savedAt?: number;
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
  collaboration?: CollaborationConfig;
}

export const defaultPromoPosters: PromoPosterItem[] = [
  {
    id: "poster-1",
    title: "Diskon 30% Paket Branding & Desain UI/UX",
    image: "/images/promo_poster_1789471291192.jpg",
    ctaText: "Ambil Diskon",
    link: "https://wa.me/6282394549268?text=Halo%20saya%20tertarik%20dengan%20Promo%20Diskon%2030%25%20Desain",
    active: true,
  },
  {
    id: "poster-2",
    title: "Paket Konten Kreatif & Visual Media Sosial",
    image: "/images/banner_promo_crea_1788696808849.jpg",
    ctaText: "Pesan Sekarang",
    link: "https://wa.me/6282394549268?text=Halo%20saya%20tertarik%20dengan%20Paket%20Konten%20Visual%20Media%20Sosial",
    active: true,
  },
  {
    id: "poster-3",
    title: "Konsultasi Desain & Audit Portofolio Gratis",
    image: "/images/banner_promo_bca_1788696791480.jpg",
    ctaText: "Chat Sekarang",
    link: "https://wa.me/6282394549268?text=Halo%20saya%20ingin%20konsultasi%20desain%20gratis",
    active: true,
  }
];

export const defaultSettings: SiteSettings = {
  cvRole: "Desainer Grafis",
  cvSections: defaultCvSections,
  fullName: "Muhammad Albiansyah",
  heroBadge: "PORTFOLIO DESIGN",
  heroTitle1: "WELCOME",
  heroTitle2: "My Portfolio Design",
  heroDescription: "Saya membantu merek dan perusahaan mengubah ide kompleks menjadi desain antarmuka yang sederhana, indah, dan berpusat pada manusia.",
  aboutTitle1: "Pendekatan",
  aboutTitle2: "Desain Saya",
  aboutDescription1: "Desain yang baik bukan hanya tentang bagaimana ia terlihat, tetapi bagaimana ia berfungsi. Saya percaya pada pendekatan minimalis dimana setiap elemen memiliki tujuan.",
  aboutDescription2: "Dengan pengalaman lebih dari 5 tahun di industri kreatif, saya telah bekerja dengan berbagai klien dari startup hingga perusahaan besar untuk merancang produk digital yang tidak hanya estetis, tetapi juga memecahkan masalah pengguna secara nyata.",
  aboutImage: "",
  heroImage: "/images/editing_tools_3d_1787123977793.jpg",
  heroBanners: [
    {
      id: "banner-1",
      image: "/images/banner_promo_bca_1788696791480.jpg",
      title: "Praktis Pembayaran & Konsultasi Desain Digital",
      subtitle: "Solusi antarmuka dan visual presisi tinggi untuk pertumbuhan brand Anda",
      badge: "PROMO SPESIAL",
      link: "#portfolio",
      linkText: "Lihat Karya",
      active: true,
      overlayText: false
    },
    {
      id: "banner-2",
      image: "/images/banner_promo_crea_1788696808849.jpg",
      title: "Paket Konten Kreatif & Visual Media Sosial",
      subtitle: "Desain visual feeds, story, dan materi promosi menarik untuk brand Anda",
      badge: "KONTEN KREATIF",
      link: "#portfolio",
      linkText: "Lihat Karya",
      active: true,
      overlayText: false
    },
    {
      id: "banner-3",
      image: "/images/promo_poster_1789471291192.jpg",
      title: "Diskon 30% Paket Branding & Desain UI/UX",
      subtitle: "Tingkatkan identitas visual bisnis Anda dengan harga promo terbatas",
      badge: "DISKON 30%",
      link: "#contact",
      linkText: "Pesan Sekarang",
      active: true,
      overlayText: false
    }
  ],
  contactEmail: "alfreelnc.desigh@gmail.com",
  contactPhone: "+62 823-9454-9268",
  contactLocation: "Kabupaten Sinjai Utara",
  portfolioLink: "https://alfreelnc.com",
  promoWidgetActive: true,
  promoWidgetImage: "/images/promo_poster_1789471291192.jpg",
  promoWidgetLink: "https://wa.me/6282394549268?text=Halo%20saya%20tertarik%20dengan%20promo%20diskon%20desain%20grafis",
  promoWidgetCtaText: "Ambil Diskon",
  promoPosters: defaultPromoPosters,
  collaboration: {
    enabled: false,
    partnerName: "",
    partnerLogo: "",
    collaborationText: "Kolaborasi Bersama",
    autoTagNewItems: false,
    collaboratorUsername: "kolaborator",
    collaboratorPassword: "kolaborasi123",
    collaboratorLoginEnabled: true,
    collaboratorAccounts: [
      {
        id: "collab-1",
        username: "kolaborator",
        password: "kolaborasi123",
        partnerName: "Mitra Desain",
        partnerLogo: "",
        active: true,
      }
    ],
  },
};
