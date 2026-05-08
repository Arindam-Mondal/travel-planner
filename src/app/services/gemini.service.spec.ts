import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
      expect(service.isGenerating()).toBeFalse();
    });

    it('error path: sets generationError signal with retryable=true on 429', async () => {
      const promise = service.generateItinerary(mockPrefs).catch(() => null);

      const req = httpMock.expectOne((r) =>
        r.url.includes('generativelanguage.googleapis.com'),
      );
      req.flush('Rate limited', { status: 429, statusText: 'Too Many Requests' });

      await promise;
      expect(service.generationError()?.retryable).toBeTrue();
      expect(service.generationError()?.code).toBe('429');
      expect(service.lastItinerary()).toBeNull();
      expect(service.isGenerating()).toBeFalse();
    });

    it('sets isGenerating to true while the request is in flight', () => {
      service.generateItinerary(mockPrefs);
      expect(service.isGenerating()).toBeTrue();
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    });
  });

  describe('scheduleRegeneration debounce', () => {
    it('does NOT fire an HTTP request before 1500ms debounce', fakeAsync(() => {
      service.scheduleRegeneration(mockPrefs);
      tick(1499);
      httpMock.expectNone((r) => r.url.includes('generativelanguage.googleapis.com'));
      // cleanup — complete the debounce so afterEach verify passes
      tick(1);
      httpMock.expectOne((r) => r.url.includes('generativelanguage.googleapis.com')).flush(mockGeminiResponse);
    }));

    it('fires exactly ONE request after 1500ms even with multiple rapid calls', fakeAsync(() => {
      service.scheduleRegeneration(mockPrefs);
      service.scheduleRegeneration(mockPrefs);
      service.scheduleRegeneration(mockPrefs);
      tick(1500);
      const reqs = httpMock.match((r) => r.url.includes('generativelanguage.googleapis.com'));
      expect(reqs.length).toBe(1);
      reqs[0].flush(mockGeminiResponse);
    }));
  });
});
