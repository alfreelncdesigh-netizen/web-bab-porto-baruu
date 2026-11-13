export interface Project {
  id: string | number;
  title: string;
  category: string;
  image: string;
  images?: string[];
  description: string;
  date?: string;
  role?: string;
  liveUrl?: string;
  link?: string;
  draft?: boolean;
  aspectRatio?: string;
  totalHoursSpent?: string | number;
  toolsUsed?: string[] | string;
  completionDate?: string;
  metrics?: {
    totalHoursSpent?: string | number;
    toolsUsed?: string[] | string;
    completionDate?: string;
  };
  isCollaboration?: boolean;
  collaborationPartner?: string;
  collaborationLogo?: string;
  collaborationText?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
  isArchived?: boolean;
  archiveFolderId?: string | null;
}

export const categories = ["Semua", "UI/UX", "Branding", "Poster", "Web Design", "PowerPoint", "Postingan Instagram"];

export const projects: Project[] = [
  {
    id: "0",
    title: "HUT RI-81 ",
    category: "Poster",
    image: "/uploads/project_0_1793923223558.png",
    description: "Desain antarmuka untuk aplikasi pelacakan keuangan pribadi dengan fokus pada kemudahan penggunaan, visualisasi data yang jernih, dan navigasi yang intuitif untuk semua kalangan.",
    date: "15 Agustus 2026",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "1",
    title: "Idul Fitri",
    category: "Postingan Instagram",
    image: "/uploads/project_1_1793923223575.png",
    description: "Desain ucapan Idul Fitri yang bernuansa hangat, elegan, dan estetik untuk media sosial.",
    date: "31 April 2026",
    role: "Simpel, Minimalis",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "2",
    title: "Nike Air Max 270 React",
    category: "Poster",
    image: "/uploads/project_2_1793923223577.png",
    description: "Desain poster promosi sepatu Nike Air Max 270 React dengan gaya modern, dinamis, dan visual kontras yang kuat.",
    date: "2026",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "3",
    title: "TRAVEL TO INDONESIA",
    category: "Poster",
    image: "/uploads/project_3_1793923223579.png",
    description: "Desain poster Promosi paket Traveling maskapai Garuda Airlines",
    date: "27 Agustus 2026",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "4",
    title: "Simple Design but impact",
    category: "Postingan Instagram",
    image: "/uploads/project_4_1793923223580.png",
    description: "Desain feed Instagram simpel tapi berdampak dengan visual tipografi yang kuat dan proporsi warna harmonis.",
    date: "2024",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "5",
    title: "Idul Fitri Story",
    category: "Postingan Instagram",
    image: "/uploads/project_5_1793923223580.png",
    description: "Desain template story Instagram Idul Fitri berkarakter modern dan minimalis.",
    date: "2026",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  },
  {
    id: "6",
    title: "Food poster design",
    category: "Poster",
    image: "/uploads/project_6_1793923223581.png",
    description: "Desain poster bertema kuliner, mengusung konsep minimalis dengan objek pada bagian center, memberikan kesan clean, dan langsung fokus pada tujuan dan tema poster",
    date: "2026",
    role: "Designer",
    liveUrl: "",
    totalHoursSpent: "16 Jam",
    toolsUsed: ["Canva", "Affinity", "Photoshop"],
    completionDate: "2026"
  }
];

