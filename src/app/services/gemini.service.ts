import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Subject, debounceTime, switchMap, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { type AppError, type Itinerary, type ItineraryDay, type TravelPreferences } from '../models/trip.models';
import { buildGeminiPrompt, validateItineraryResponse } from '../utils/itinerary.utils';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

  readonly isGenerating = signal(false);
  readonly generationError = signal<AppError | null>(null);
  readonly lastItinerary = signal<Itinerary | null>(null);

  private readonly regenSubject = new Subject<TravelPreferences>();

  constructor() {
    this.regenSubject
      .pipe(
        debounceTime(1500),
        switchMap((prefs) => from(this.generateItinerary(prefs))),
      )
      .subscribe({
        error: (err) => console.error('Auto-regen error:', err),
      });
  }

  /**
   * Generates a full day-by-day itinerary by sending preferences to Gemini 2.0 Flash.
   */
  async generateItinerary(preferences: TravelPreferences): Promise<Itinerary> {
    this.isGenerating.set(true);
    this.generationError.set(null);

    try {
      const prompt = buildGeminiPrompt(preferences);
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      };

      const url = `${this.endpoint}?key=${environment.geminiApiKey}`;
      const response = await this.http
        .post<GeminiResponse>(url, body)
        .toPromise();

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');

      const parsed: unknown = JSON.parse(text);
      if (!validateItineraryResponse(parsed)) {
        throw new Error('Invalid itinerary structure returned by Gemini');
      }

      this.lastItinerary.set(parsed);
      return parsed;
    } catch (err: unknown) {
      const error = this.mapError(err);
      this.generationError.set(error);
      throw err;
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Schedules a debounced itinerary regeneration (1500 ms) on preference changes.
   * Multiple rapid calls result in only one API request.
   */
  scheduleRegeneration(preferences: TravelPreferences): void {
    this.regenSubject.next(preferences);
  }

  /**
   * Translates itinerary text to the target language via Google Translate REST API.
   * Returns the original itinerary unchanged when the Translate key is not configured.
   */
  async translateItinerary(itinerary: Itinerary, targetLanguage: string): Promise<Itinerary> {
    if (!environment.translateApiKey) return itinerary;

    const textsToTranslate: string[] = [];
    const pathMap: string[] = [];

    itinerary.days.forEach((day, di) => {
      textsToTranslate.push(day.theme);
      pathMap.push(`days.${di}.theme`);
      day.stops.forEach((stop, si) => {
        textsToTranslate.push(stop.name, stop.tips, stop.bestTimeToVisit);
        pathMap.push(
          `days.${di}.stops.${si}.name`,
          `days.${di}.stops.${si}.tips`,
          `days.${di}.stops.${si}.bestTimeToVisit`,
        );
      });
    });

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${environment.translateApiKey}`;
      const response = await this.http
        .post<{ data: { translations: Array<{ translatedText: string }> } }>(url, {
          q: textsToTranslate,
          target: targetLanguage,
          format: 'text',
        })
        .toPromise();

      const translations = response?.data?.translations ?? [];
      const translatedItinerary = JSON.parse(JSON.stringify(itinerary)) as Itinerary;

      translations.forEach((t, i) => {
        const path = pathMap[i].split('.');
        let obj: unknown = translatedItinerary;
        for (let j = 0; j < path.length - 1; j++) {
          obj = (obj as Record<string, unknown>)[path[j]];
        }
        (obj as Record<string, unknown>)[path[path.length - 1]] = t.translatedText;
      });

      return translatedItinerary;
    } catch {
      return itinerary;
    }
  }

  private mapError(err: unknown): AppError {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status;
      if (status === 429) return { code: '429', message: 'Rate limit reached. Please wait a moment.', retryable: true };
      if (status === 401) return { code: '401', message: 'Invalid Gemini API key.', retryable: false };
      if (status >= 500) return { code: `${status}`, message: 'Gemini service error. Try again.', retryable: true };
    }
    return { code: 'unknown', message: 'Failed to generate itinerary. Please try again.', retryable: true };
  }
}
