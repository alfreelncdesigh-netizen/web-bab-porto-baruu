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
}

export const categories = ["Semua", "UI/UX", "Branding", "Poster", "Web Design", "PowerPoint", "Postingan Instagram"];

export const projects: Project[] = [];
