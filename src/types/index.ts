export interface FileType {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
  url?: string;
  thumbnailUrl?: string;
}

export type MediaType = 'all' | 'image' | 'video' | 'document';
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export interface SearchAnalytics {
  id?: number;
  email: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  searchDuration: number;
  mediaType: MediaType;
  dateFilter: DateFilter;
}

export interface UserSession {
  id?: number;
  email: string;
  loginTime: Date;
  logoutTime?: Date;
  searchCount: number;
}

export interface AnalyticsSummary {
  totalSearches: number;
  averageSearchDuration: number;
  popularQueries: { query: string; count: number }[];
  searchesByMediaType: { mediaType: string; count: number }[];
  mostActiveUsers: { email: string; searchCount: number }[];
}
