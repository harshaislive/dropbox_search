export interface SearchAnalytics {
  id: number;
  email: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  searchDuration: number;  // in milliseconds
  mediaType: string;
  dateFilter: string;
}

export interface UserSession {
  id: number;
  email: string;
  loginTime: Date;
  logoutTime?: Date;
  searchCount: number;
}

export interface AnalyticsSummary {
  totalSearches: number;
  averageSearchDuration: number;
  popularQueries: { query: string; count: number }[];
  searchesByMediaType: { [key: string]: number };
  searchesByDateFilter: { [key: string]: number };
  activeUsers: { email: string; searchCount: number }[];
}
