export interface QuickFilterItem {
  id: string;
  question: string;
  answer: string;
  category: string; // e.g. "Tren Warna", "Tren Desain", "Tips Branding", "Jasa & Order"
  images?: string[]; // Array of supporting image URLs (optional)
  tags?: string[];
  order?: number;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuickFilterCategory {
  id: string;
  label: string;
  icon?: string;
}
