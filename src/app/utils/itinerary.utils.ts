import {
  type Itinerary,
  type ItineraryDay,
  type Stop,
  type StopCategory,
  type TravelPreferences,
  CATEGORY_COLORS,
} from '../models/trip.models';

/** Returns the number of days between two ISO date strings, inclusive. */
export function calculateTripDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

/** Strips HTML tags, trims, and collapses whitespace. Used before sending to Gemini. */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wraps crypto.randomUUID for share token generation. */
export function generateShareToken(): string {
  return crypto.randomUUID();
}

/** Returns the hex color for a stop category marker. */
export function getCategoryColor(category: StopCategory): string {
  return CATEGORY_COLORS[category] ?? '#607D8B';
}

/** Formats a duration in minutes to a human-readable string. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Groups stops by category for legend rendering. */
export function groupStopsByCategory(stops: Stop[]): Record<StopCategory, Stop[]> {
  return stops.reduce(
    (acc, stop) => {
      if (!acc[stop.category]) acc[stop.category] = [];
      acc[stop.category].push(stop);
      return acc;
    },
    {} as Record<StopCategory, Stop[]>,
  );
}

/** Type guard — validates that an unknown value conforms to the Itinerary shape. */
export function validateItineraryResponse(data: unknown): data is Itinerary {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d['destination'] !== 'string') return false;
  if (typeof d['summary'] !== 'string') return false;
  if (typeof d['totalEstimatedCost'] !== 'string') return false;
  if (!Array.isArray(d['days'])) return false;
  return d['days'].every((day: unknown) => validateDay(day));
}

function validateDay(day: unknown): day is ItineraryDay {
  if (!day || typeof day !== 'object') return false;
  const d = day as Record<string, unknown>;
  if (typeof d['dayNumber'] !== 'number') return false;
  if (typeof d['date'] !== 'string') return false;
  if (typeof d['theme'] !== 'string') return false;
  if (!Array.isArray(d['stops'])) return false;
  return d['stops'].every((stop: unknown) => validateStop(stop));
}

function validateStop(stop: unknown): stop is Stop {
  if (!stop || typeof stop !== 'object') return false;
  const s = stop as Record<string, unknown>;
  const validCategories = ['food', 'attraction', 'accommodation', 'transport', 'activity'];
  if (typeof s['id'] !== 'string') return false;
  if (typeof s['name'] !== 'string') return false;
  if (typeof s['address'] !== 'string') return false;
  if (!validCategories.includes(s['category'] as string)) return false;
  if (typeof s['durationMinutes'] !== 'number') return false;
  if (!s['coordinates'] || typeof s['coordinates'] !== 'object') return false;
  const coords = s['coordinates'] as Record<string, unknown>;
  if (typeof coords['lat'] !== 'number' || typeof coords['lng'] !== 'number') return false;
  return true;
}

/** Assembles the Gemini prompt from user preferences. */
export function buildGeminiPrompt(prefs: TravelPreferences): string {
  const duration = calculateTripDuration(prefs.startDate, prefs.endDate);
  const destination = sanitizeInput(prefs.destination);
  const constraints = sanitizeInput(prefs.constraints || 'None');

  return `You are an expert travel planner. Create a detailed ${duration}-day itinerary for ${destination}.

User preferences:
- Budget: ${prefs.budget} (low = under $50/day, medium = $50-150/day, high = $150+/day)
- Travel style: ${prefs.travelStyle}
- Group size: ${prefs.groupSize}
- Special constraints: ${constraints}
- Dates: ${prefs.startDate} to ${prefs.endDate}

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "destination": "string",
  "summary": "string",
  "totalEstimatedCost": "string",
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "stops": [
        {
          "id": "string",
          "name": "string",
          "address": "string",
          "category": "food|attraction|accommodation|transport|activity",
          "durationMinutes": 60,
          "estimatedCost": "string",
          "bestTimeToVisit": "string",
          "tips": "string",
          "coordinates": { "lat": 0.0, "lng": 0.0 }
        }
      ]
    }
  ]
}`;
}

/** Converts a Date object to an ISO date string (YYYY-MM-DD). */
export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
