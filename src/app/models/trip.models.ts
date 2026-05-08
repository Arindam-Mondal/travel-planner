import { Timestamp } from 'firebase/firestore';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type StopCategory =
  | 'food'
  | 'attraction'
  | 'accommodation'
  | 'transport'
  | 'activity';

export interface Stop {
  id: string;
  name: string;
  address: string;
  category: StopCategory;
  durationMinutes: number;
  estimatedCost: string;
  bestTimeToVisit: string;
  tips: string;
  coordinates: Coordinates;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme: string;
  stops: Stop[];
}

export interface Itinerary {
  destination: string;
  summary: string;
  totalEstimatedCost: string;
  days: ItineraryDay[];
}

export type BudgetLevel = 'low' | 'medium' | 'high';
export type TravelStyle = 'adventure' | 'relaxation' | 'culture' | 'food';

export interface TravelPreferences {
  destination: string;
  startDate: string;
  endDate: string;
  budget: BudgetLevel;
  travelStyle: TravelStyle;
  groupSize: number;
  constraints: string;
}

export interface Trip {
  id: string;
  userId: string;
  preferences: TravelPreferences;
  itinerary: Itinerary;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  shareToken?: string;
}

export interface MapMarkerData extends Stop {
  markerColor: string;
  dayNumber: number;
}

export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface TripFormValue {
  destination: string | null;
  startDate: Date | null;
  endDate: Date | null;
  budget: BudgetLevel | null;
  travelStyle: TravelStyle | null;
  groupSize: number | null;
  constraints: string | null;
}

export interface BudgetOption {
  label: string;
  value: BudgetLevel;
  dailyRange: string;
  icon: string;
}

export interface TravelStyleOption {
  label: string;
  value: TravelStyle;
  icon: string;
  description: string;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { label: 'Budget', value: 'low', dailyRange: 'Under $50/day', icon: 'savings' },
  { label: 'Mid-range', value: 'medium', dailyRange: '$50–$150/day', icon: 'account_balance_wallet' },
  { label: 'Luxury', value: 'high', dailyRange: '$150+/day', icon: 'diamond' },
];

export const TRAVEL_STYLE_OPTIONS: TravelStyleOption[] = [
  { label: 'Adventure', value: 'adventure', icon: 'hiking', description: 'Outdoor activities & thrills' },
  { label: 'Relaxation', value: 'relaxation', icon: 'spa', description: 'Rest, wellness & slow travel' },
  { label: 'Culture', value: 'culture', icon: 'museum', description: 'History, art & local life' },
  { label: 'Food', value: 'food', icon: 'restaurant', description: 'Cuisine & culinary experiences' },
];

export const CATEGORY_COLORS: Record<StopCategory, string> = {
  food: '#FF8F00',
  attraction: '#1565C0',
  accommodation: '#00897B',
  transport: '#7B1FA2',
  activity: '#C62828',
};

export const CATEGORY_ICONS: Record<StopCategory, string> = {
  food: 'restaurant',
  attraction: 'photo_camera',
  accommodation: 'hotel',
  transport: 'directions_transit',
  activity: 'sports_tennis',
};

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];
