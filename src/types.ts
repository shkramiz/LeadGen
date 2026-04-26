export interface BusinessLead {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  rating?: number;
  reviewsCount?: number;
  mapsUrl: string;
  hasWebsite: boolean;
  websiteUrl?: string;
  category: string;
}

export interface SearchState {
  keyword: string;
  location: string;
  isSearching: boolean;
  results: BusinessLead[];
  error: string | null;
}

export interface SavedSearch {
  id: string;
  category: string;
  customCategory: string;
  countryCode: string;
  city: string;
  name: string;
  createdAt: number;
}
