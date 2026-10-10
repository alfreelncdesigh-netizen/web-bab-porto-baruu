export interface TemplateProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  description: string;
  features: string[];
  checkoutUrl: string;
  category?: string;
  demoUrl?: string;
  dateAdded: string;
  draft?: boolean;
  
  // Affinity specific fields
  layersCount?: string;
  dimensions?: string;
  purpose?: string;
  estimatedTime?: string;
  
  // Format File links
  affinityFileUrl?: string; // locked
  pdfFileUrl?: string;      // can be previewed
  pngFileUrl?: string;      // can be previewed
}

export const defaultTemplates: TemplateProduct[] = [];


