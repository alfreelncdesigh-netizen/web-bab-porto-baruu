export interface TemplateProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  downloadUrl?: string;
  demoUrl?: string;
  tags?: string[];
  featured?: boolean;
  createdAt?: any;
  updatedAt?: any;
}
