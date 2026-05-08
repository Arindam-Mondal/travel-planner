import {
  calculateTripDuration,
  sanitizeInput,
  validateItineraryResponse,
  buildGeminiPrompt,
  formatDuration,
  getCategoryColor,
} from './itinerary.utils';
import type { Itinerary, TravelPreferences } from '../models/trip.models';

describe('itinerary.utils', () => {

  describe('calculateTripDuration', () => {
    it('returns 1 for same-day trip', () => {
      expect(calculateTripDuration('2025-06-01', '2025-06-01')).toBe(1);
    });

    it('returns correct duration for multi-day trip', () => {
      expect(calculateTripDuration('2025-06-01', '2025-06-05')).toBe(5);
    });
  });

  describe('sanitizeInput', () => {
    it('strips HTML tags and collapses whitespace', () => {
      const result = sanitizeInput('<b>Tokyo</b>   Japan  ');
      expect(result).toBe('Tokyo Japan');
    });

    it('removes angle brackets and script injection', () => {
      const result = sanitizeInput('<script>alert("xss")</script>destination');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeInput('  Paris  ')).toBe('Paris');
    });
  });

  describe('validateItineraryResponse', () => {
    const validItinerary: Itinerary = {
      destination: 'Tokyo',
      summary: 'A great trip',
      totalEstimatedCost: '$500',
      days: [
        {
          dayNumber: 1,
          date: '2025-06-01',
          theme: 'Arrival',
          stops: [
            {
              id: 'stop-1',
              name: 'Tokyo Tower',
              address: '4-2-8 Shibakoen, Minato',
              category: 'attraction',
              durationMinutes: 90,
              estimatedCost: '$10',
              bestTimeToVisit: 'Morning',
              tips: 'Buy tickets online',
              coordinates: { lat: 35.6586, lng: 139.7454 },
            },
          ],
        },
      ],
    };

    it('accepts a fully valid itinerary structure', () => {
      expect(validateItineraryResponse(validItinerary)).toBeTrue();
    });

    it('rejects when days array is missing', () => {
      const invalid = { destination: 'Tokyo', summary: 'x', totalEstimatedCost: '$100' };
      expect(validateItineraryResponse(invalid)).toBeFalse();
    });

    it('rejects when a stop has an invalid category', () => {
      const withBadCategory = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      (withBadCategory.days[0].stops[0] as unknown as Record<string, unknown>)['category'] = 'invalid';
      expect(validateItineraryResponse(withBadCategory)).toBeFalse();
    });

    it('rejects null input', () => {
      expect(validateItineraryResponse(null)).toBeFalse();
    });

    it('rejects missing coordinates', () => {
      const withoutCoords = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      delete (withoutCoords.days[0].stops[0] as unknown as Record<string, unknown>)['coordinates'];
      expect(validateItineraryResponse(withoutCoords)).toBeFalse();
    });
  });

  describe('formatDuration', () => {
    it('formats minutes only', () => expect(formatDuration(45)).toBe('45m'));
    it('formats hours only', () => expect(formatDuration(120)).toBe('2h'));
    it('formats hours and minutes', () => expect(formatDuration(90)).toBe('1h 30m'));
  });

  describe('getCategoryColor', () => {
    it('returns a hex color for known categories', () => {
      const color = getCategoryColor('food');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns a fallback color for unknown category', () => {
      const color = getCategoryColor('unknown' as never);
      expect(color).toMatch(/^#/);
    });
  });

  describe('buildGeminiPrompt', () => {
    const prefs: TravelPreferences = {
      destination: 'Paris',
      startDate: '2025-07-01',
      endDate: '2025-07-05',
      budget: 'medium',
      travelStyle: 'culture',
      groupSize: 2,
      constraints: 'vegetarian',
    };

    it('includes the destination in the prompt', () => {
      expect(buildGeminiPrompt(prefs)).toContain('Paris');
    });

    it('sanitizes destination before inserting', () => {
      const maliciousPrefs = { ...prefs, destination: '<script>Paris</script>' };
      expect(buildGeminiPrompt(maliciousPrefs)).not.toContain('<script>');
    });

    it('includes the correct duration', () => {
      // 2025-07-01 to 2025-07-05 = 5 days
      expect(buildGeminiPrompt(prefs)).toContain('5-day');
    });
  });

});
