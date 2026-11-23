export interface Project {
  id: number;
  title: string;
  url: string;
  publishedAt: string | null;
  price: number | null;
  monthlySales: number | null;
  monthlyProfit: number | null;
  pv: number | null;
  followers: number | null;
  category: string;
  kind: 'site' | 'account' | 'other';
  tags: string[];
  summary: string;
  saleReason: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  priceHistory: { date: string; price: number }[];
}

export interface ProjectsData {
  fetchedAt: string | null;
  source: string;
  items: Project[];
}
