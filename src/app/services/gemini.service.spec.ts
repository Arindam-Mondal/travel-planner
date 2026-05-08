import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GeminiService } from './gemini.service';
import type { Itinerary, TravelPreferences } from '../models/trip.models';

const mockPrefs: TravelPreferences = {
  destination: 'Tokyo',
  startDate: '2025-09-01',
  endDate: '2025-09-03',
  budget: 'medium',
  travelStyle: 'culture',
  groupSize: 2,
  constraints: '',
};

const mockItinerary: Itinerary = {
  destination: 'Tokyo',
  summary: 'A wonderful trip',
  totalEstimatedCost: '$300',
  days: [
    {
      dayNumber: 1,
      date: '2025-09-01',
      theme: 'Arrival & Asakusa',
      stops: [
        {
          id: 'stop-1',
          name: 'Senso-ji Temple',
          address: '2-3-1 Asakusa, Taito',
          category: 'attraction',
          durationMinutes: 120,
          estimatedCost: 'Free',
          bestTimeToVisit: 'Early morning',
          tips: 'Arrive before 9am',
          coordinates: { lat: 35.7148, lng: 139.7967 },
        },
      ],
    },
  ],
};

const mockGeminiResponse = {
  candidates: [
    {
      content: {
        parts: [{ text: JSON.stringify(mockItinerary) }],
      },
    },
  ],
};

describe('GeminiService', () => {
  let service: GeminiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GeminiService],
    });
    service = TestBed.inject(GeminiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Initial signal state ────────────────────────────────────────────────

  describe('initial state', () => {
    it('isGenerating starts as false', () => {
      expect(service.isGenerating()).toBe(false);
    });

    it('generationError starts as null', () => {
      expect(service.generationError()).toBeNull();
    });

    it('lastItinerary starts as null', () => {
      expect(service.lastItinerary()).toBeNull();
    });
  });

  // ─── generateItinerary ───────────────────────────────────────────────────

  describe('generateItinerary', () => {
    it('happy path: sets lastItinerary signal and clears isGenerating', async () => {
      const promise = service.generateItinerary(mockPrefs);

      const req = httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      );
      req.flush(mockGeminiResponse);

      const result = await promise;
      expect(result.destination).toBe('Tokyo');
      expect(service.lastItinerary()?.destination).toBe('Tokyo');
      expect(service.isGenerating()).toBe(false);
    });

    it('error path: sets generationError signal with retryable=true on 429', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);

      const req = httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      );
      req.flush('Rate limited', { status: 429, statusText: 'Too Many Requests' });

      await promise;
      expect(service.generationError()?.retryable).toBe(true);
      expect(service.generationError()?.code).toBe('429');
      expect(service.lastItinerary()).toBeNull();
      expect(service.isGenerating()).toBe(false);
    });

    it('sets isGenerating to true while the request is in flight', () => {
      service.generateItinerary(mockPrefs);
      expect(service.isGenerating()).toBe(true);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    });

    it('401 error: sets retryable=false and code=401', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);

      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await promise;
      expect(service.generationError()?.code).toBe('401');
      expect(service.generationError()?.retryable).toBe(false);
    });

    it('500 error: sets retryable=true', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);

      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      await promise;
      expect(service.generationError()?.retryable).toBe(true);
    });

    it('503 error: sets retryable=true and isGenerating=false', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);

      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

      await promise;
      expect(service.generationError()?.retryable).toBe(true);
      expect(service.isGenerating()).toBe(false);
    });

    it('clears generationError on a successful call after a prior error', async () => {
      const firstCall = service.generateItinerary(mockPrefs).catch(() => null);
      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush('Error', { status: 500, statusText: 'Server Error' });
      await firstCall;
      expect(service.generationError()).not.toBeNull();

      const secondCall = service.generateItinerary(mockPrefs);
      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush(mockGeminiResponse);
      await secondCall;
      expect(service.generationError()).toBeNull();
    });

    it('sends a POST request to the Gemini endpoint', () => {
      service.generateItinerary(mockPrefs);
      const req = httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      );
      expect(req.request.method).toBe('POST');
      req.flush(mockGeminiResponse);
    });

    it('includes the API key as a query parameter', () => {
      service.generateItinerary(mockPrefs);
      const req = httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      );
      expect(req.request.urlWithParams).toContain('key=');
      req.flush(mockGeminiResponse);
    });

    it('sets isGenerating to false after an error', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);
      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush('Error', { status: 500, statusText: 'Server Error' });
      await promise;
      expect(service.isGenerating()).toBe(false);
    });

    it('resolves with the correct itinerary summary and cost', async () => {
      const promise = service.generateItinerary(mockPrefs);
      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush(mockGeminiResponse);
      const result = await promise;
      expect(result.summary).toBe('A wonderful trip');
      expect(result.totalEstimatedCost).toBe('$300');
    });

    it('populates lastItinerary with correct days count', async () => {
      const promise = service.generateItinerary(mockPrefs);
      httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      ).flush(mockGeminiResponse);
      await promise;
      expect(service.lastItinerary()?.days.length).toBe(1);
    });
  });

  // ─── scheduleRegeneration debounce ───────────────────────────────────────

  describe('scheduleRegeneration debounce', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('does NOT fire an HTTP request before 1500ms debounce', async () => {
      vi.useFakeTimers();
      service.scheduleRegeneration(mockPrefs);
      vi.advanceTimersByTime(1499);
      httpMock.expectNone((r) => r.url.includes('generativelanguage.googleapis.com'));
      vi.advanceTimersByTime(1);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    });

    it('fires exactly ONE request after 1500ms even with multiple rapid calls', async () => {
      vi.useFakeTimers();
      service.scheduleRegeneration(mockPrefs);
      service.scheduleRegeneration(mockPrefs);
      service.scheduleRegeneration(mockPrefs);
      vi.advanceTimersByTime(1500);
      const reqs = httpMock.match((r) => r.url.includes('generativelanguage.googleapis.com'));
      expect(reqs.length).toBe(1);
      reqs[0].flush(mockGeminiResponse);
    });

    it('fires no request at all if no time passes', async () => {
      vi.useFakeTimers();
      service.scheduleRegeneration(mockPrefs);
      vi.advanceTimersByTime(0);
      httpMock.expectNone((r) => r.url.includes('generativelanguage.googleapis.com'));
      vi.advanceTimersByTime(1500);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    });

    it('fires a new request for each debounce window', async () => {
      vi.useFakeTimers();
      service.scheduleRegeneration(mockPrefs);
      vi.advanceTimersByTime(1500);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);

      service.scheduleRegeneration(mockPrefs);
      vi.advanceTimersByTime(1500);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    });
  });
});
