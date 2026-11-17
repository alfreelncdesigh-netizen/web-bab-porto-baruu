export interface Project {
  id: number | string;
  title: string;
  category: string;
  image: string;
  images?: string[];
  imageWidth?: number;
  imageHeight?: number;
  description: string;
  date: string;
  role: string;
  client?: string;
  link?: string;
  liveUrl?: string;
  aspectRatio?: string;
  draft?: boolean;
  totalHoursSpent?: string | number;
  toolsUsed?: string | string[];
  completedDate?: string;
  completionDate?: string;
  revisionCount?: number | string;
  metrics?: {
    totalHoursSpent?: string | number;
    toolsUsed?: string | string[];
    completedDate?: string;
    completionDate?: string;
    revisionCount?: number | string;
  };
  isCollaboration?: boolean;
  collaborationPartner?: string;
  collaborationLogo?: string;
  collaborationText?: string;
  isArchived?: boolean;
  archiveFolderId?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export const categories = [
  'Semua',
  'Poster',
  'Logo',
  'Branding',
  'UI/UX',
  'Kemasan',
  'Ilustrasi',
  'Konten Sosmed',
  'Lainnya',
];
