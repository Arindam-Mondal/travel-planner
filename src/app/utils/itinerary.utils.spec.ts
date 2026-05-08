import {
  calculateTripDuration,
  sanitizeInput,
  validateItineraryResponse,
  buildGeminiPrompt,
  formatDuration,
  getCategoryColor,
  generateShareToken,
  groupStopsByCategory,
} from './itinerary.utils';
import type { Itinerary, Stop, TravelPreferences } from '../models/trip.models';

describe('itinerary.utils', () => {

  // ─── calculateTripDuration ───────────────────────────────────────────────

  describe('calculateTripDuration', () => {
    it('returns 1 for same-day trip', () => {
      expect(calculateTripDuration('2025-06-01', '2025-06-01')).toBe(1);
    });

    it('returns correct duration for multi-day trip', () => {
      expect(calculateTripDuration('2025-06-01', '2025-06-05')).toBe(5);
    });

    it('returns 3 for a 3-day range', () => {
      expect(calculateTripDuration('2025-07-10', '2025-07-12')).toBe(3);
    });

    it('handles month boundary correctly', () => {
      expect(calculateTripDuration('2025-01-29', '2025-02-02')).toBe(5);
    });

    it('handles year boundary correctly', () => {
      expect(calculateTripDuration('2025-12-30', '2026-01-01')).toBe(3);
    });

    it('returns at least 1 when end is before start', () => {
      expect(calculateTripDuration('2025-06-05', '2025-06-01')).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── sanitizeInput ───────────────────────────────────────────────────────

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

    it('returns empty string for empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('removes double-quote characters', () => {
      expect(sanitizeInput('Rome "Eternal City"')).not.toContain('"');
    });

    it('removes backtick characters', () => {
      expect(sanitizeInput('`Paris`')).not.toContain('`');
    });

    it('leaves clean plain text unchanged', () => {
      expect(sanitizeInput('New York')).toBe('New York');
    });

    it('collapses multiple internal spaces to one', () => {
      expect(sanitizeInput('Tokyo    Japan')).toBe('Tokyo Japan');
    });
  });

  // ─── validateItineraryResponse ───────────────────────────────────────────

  describe('validateItineraryResponse', () => {
    const validStop: Stop = {
      id: 'stop-1',
      name: 'Tokyo Tower',
      address: '4-2-8 Shibakoen, Minato',
      category: 'attraction',
      durationMinutes: 90,
      estimatedCost: '$10',
      bestTimeToVisit: 'Morning',
      tips: 'Buy tickets online',
      coordinates: { lat: 35.6586, lng: 139.7454 },
    };

    const validItinerary: Itinerary = {
      destination: 'Tokyo',
      summary: 'A great trip',
      totalEstimatedCost: '$500',
      days: [
        {
          dayNumber: 1,
          date: '2025-06-01',
          theme: 'Arrival',
          stops: [validStop],
        },
      ],
    };

    it('accepts a fully valid itinerary structure', () => {
      expect(validateItineraryResponse(validItinerary)).toBe(true);
    });

    it('rejects when days array is missing', () => {
      const invalid = { destination: 'Tokyo', summary: 'x', totalEstimatedCost: '$100' };
      expect(validateItineraryResponse(invalid)).toBe(false);
    });

    it('rejects when a stop has an invalid category', () => {
      const withBadCategory = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      (withBadCategory.days[0].stops[0] as unknown as Record<string, unknown>)['category'] = 'invalid';
      expect(validateItineraryResponse(withBadCategory)).toBe(false);
    });

    it('rejects null input', () => {
      expect(validateItineraryResponse(null)).toBe(false);
    });

    it('rejects missing coordinates', () => {
      const withoutCoords = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      delete (withoutCoords.days[0].stops[0] as unknown as Record<string, unknown>)['coordinates'];
      expect(validateItineraryResponse(withoutCoords)).toBe(false);
    });

    it('rejects an empty object', () => {
      expect(validateItineraryResponse({})).toBe(false);
    });

    it('rejects when destination is not a string', () => {
      const bad = { ...validItinerary, destination: 42 };
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('rejects when summary is missing', () => {
      const bad = { destination: 'Tokyo', totalEstimatedCost: '$100', days: [] };
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('rejects when totalEstimatedCost is not a string', () => {
      const bad = { ...validItinerary, totalEstimatedCost: 500 };
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('rejects when days is not an array', () => {
      const bad = { destination: 'Tokyo', summary: 'x', totalEstimatedCost: '$100', days: 'not-array' };
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('accepts itinerary with multiple days', () => {
      const multiDay: Itinerary = {
        ...validItinerary,
        days: [
          { dayNumber: 1, date: '2025-06-01', theme: 'Day 1', stops: [validStop] },
          { dayNumber: 2, date: '2025-06-02', theme: 'Day 2', stops: [validStop] },
        ],
      };
      expect(validateItineraryResponse(multiDay)).toBe(true);
    });

    it('rejects when a stop is missing the name field', () => {
      const bad = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      delete (bad.days[0].stops[0] as unknown as Record<string, unknown>)['name'];
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('rejects when coordinates lat is not a number', () => {
      const bad = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
      (bad.days[0].stops[0].coordinates as unknown as Record<string, unknown>)['lat'] = 'not-a-number';
      expect(validateItineraryResponse(bad)).toBe(false);
    });

    it('accepts all valid stop categories', () => {
      const categories = ['food', 'attraction', 'accommodation', 'transport', 'activity'] as const;
      for (const cat of categories) {
        const itinerary = JSON.parse(JSON.stringify(validItinerary)) as Itinerary;
        itinerary.days[0].stops[0].category = cat;
        expect(validateItineraryResponse(itinerary)).toBe(true);
      }
    });

    it('rejects undefined input', () => {
      expect(validateItineraryResponse(undefined)).toBe(false);
    });

    it('rejects a primitive string input', () => {
      expect(validateItineraryResponse('not-an-object')).toBe(false);
    });
  });

  // ─── formatDuration ──────────────────────────────────────────────────────

  describe('formatDuration', () => {
    it('formats minutes only', () => expect(formatDuration(45)).toBe('45m'));
    it('formats hours only', () => expect(formatDuration(120)).toBe('2h'));
    it('formats hours and minutes', () => expect(formatDuration(90)).toBe('1h 30m'));
    it('formats 0 minutes', () => expect(formatDuration(0)).toBe('0m'));
    it('formats exactly 60 minutes as 1h', () => expect(formatDuration(60)).toBe('1h'));
    it('formats 1 minute', () => expect(formatDuration(1)).toBe('1m'));
    it('formats large value (3h 45m)', () => expect(formatDuration(225)).toBe('3h 45m'));
  });

  // ─── getCategoryColor ────────────────────────────────────────────────────

  describe('getCategoryColor', () => {
    it('returns a hex color for known categories', () => {
      const color = getCategoryColor('food');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns a fallback color for unknown category', () => {
      const color = getCategoryColor('unknown' as never);
      expect(color).toMatch(/^#/);
    });

    it('returns a hex color for attraction', () => {
      expect(getCategoryColor('attraction')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns a hex color for accommodation', () => {
      expect(getCategoryColor('accommodation')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns a hex color for transport', () => {
      expect(getCategoryColor('transport')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns a hex color for activity', () => {
      expect(getCategoryColor('activity')).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('returns different colors for different categories', () => {
      const foodColor = getCategoryColor('food');
      const attractionColor = getCategoryColor('attraction');
      expect(foodColor).not.toBe(attractionColor);
    });
  });

  // ─── generateShareToken ──────────────────────────────────────────────────

  describe('generateShareToken', () => {
    it('returns a non-empty string', () => {
      expect(typeof generateShareToken()).toBe('string');
      expect(generateShareToken().length).toBeGreaterThan(0);
    });

    it('returns a UUID-formatted string', () => {
      const token = generateShareToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('returns unique tokens on successive calls', () => {
      const t1 = generateShareToken();
      const t2 = generateShareToken();
      expect(t1).not.toBe(t2);
    });
  });

  // ─── groupStopsByCategory ────────────────────────────────────────────────

  describe('groupStopsByCategory', () => {
    const makeStop = (id: string, category: Stop['category']): Stop => ({
      id,
      name: `Stop ${id}`,
      address: 'Some address',
      category,
      durationMinutes: 60,
      estimatedCost: '$10',
      bestTimeToVisit: 'Morning',
      tips: 'None',
      coordinates: { lat: 0, lng: 0 },
    });

    it('groups stops correctly by category', () => {
      const stops = [
        makeStop('1', 'food'),
        makeStop('2', 'food'),
        makeStop('3', 'attraction'),
      ];
      const result = groupStopsByCategory(stops);
      expect(result['food'].length).toBe(2);
      expect(result['attraction'].length).toBe(1);
    });

    it('returns empty object for empty input', () => {
      const result = groupStopsByCategory([]);
      expect(Object.keys(result).length).toBe(0);
    });

    it('handles all five categories in one pass', () => {
      const stops = [
        makeStop('1', 'food'),
        makeStop('2', 'attraction'),
        makeStop('3', 'accommodation'),
        makeStop('4', 'transport'),
        makeStop('5', 'activity'),
      ];
      const result = groupStopsByCategory(stops);
      expect(Object.keys(result).length).toBe(5);
    });
  });

  // ─── buildGeminiPrompt ───────────────────────────────────────────────────

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
      expect(buildGeminiPrompt(prefs)).toContain('5-day');
    });

    it('includes the budget level', () => {
      expect(buildGeminiPrompt(prefs)).toContain('medium');
    });

    it('includes the travel style', () => {
      expect(buildGeminiPrompt(prefs)).toContain('culture');
    });

    it('includes the group size', () => {
      expect(buildGeminiPrompt(prefs)).toContain('2');
    });

    it('includes the constraints', () => {
      expect(buildGeminiPrompt(prefs)).toContain('vegetarian');
    });

    it('sanitizes constraints to strip HTML', () => {
      const badPrefs = { ...prefs, constraints: '<b>no nuts</b>' };
      const prompt = buildGeminiPrompt(badPrefs);
      expect(prompt).not.toContain('<b>');
      expect(prompt).toContain('no nuts');
    });

    it('includes start and end dates', () => {
      const prompt = buildGeminiPrompt(prefs);
      expect(prompt).toContain('2025-07-01');
      expect(prompt).toContain('2025-07-05');
    });

    it('returns a non-empty string', () => {
      expect(buildGeminiPrompt(prefs).length).toBeGreaterThan(50);
    });

    it('requests JSON-only output', () => {
      expect(buildGeminiPrompt(prefs)).toContain('JSON');
    });

    it('produces different prompts for different destinations', () => {
      const romePrefs = { ...prefs, destination: 'Rome' };
      expect(buildGeminiPrompt(prefs)).not.toEqual(buildGeminiPrompt(romePrefs));
    });
  });

});
