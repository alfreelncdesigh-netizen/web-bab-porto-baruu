export interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
  category: string;
  published: boolean;
  image?: string;
  excerpt?: string;
  readTime?: string;
  tags?: string[];
  isCollaboration?: boolean;
  collaborationPartner?: string;
  collaborationLogo?: string;
  collaborationText?: string;
}

