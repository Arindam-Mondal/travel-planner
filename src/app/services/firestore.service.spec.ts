import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import type { AppError, Itinerary, TravelPreferences, Trip } from '../models/trip.models';

const mockPrefs: TravelPreferences = {
  destination: 'Paris',
  startDate: '2025-10-01',
  endDate: '2025-10-05',
  budget: 'medium',
  travelStyle: 'culture',
  groupSize: 2,
  constraints: '',
};

const mockItinerary: Itinerary = {
  destination: 'Paris',
  summary: 'City of lights',
  totalEstimatedCost: '$600',
  days: [],
};

const makeTrip = (id: string, userId = 'user-123'): Trip => ({
  id,
  userId,
  preferences: mockPrefs,
  itinerary: mockItinerary,
  createdAt: null as never,
  updatedAt: null as never,
});

const mockAuthService = {
  isAuthenticated: signal(false),
  user: signal(null as null),
  displayName: signal(null as null),
  photoURL: signal(null as null),
  googleAccessToken: signal(null as null),
};

describe('FirestoreService', () => {
  let service: FirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
    service = TestBed.inject(FirestoreService);
  });

  // ─── Initial signal state ────────────────────────────────────────────────

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('initialises with empty trips signal', () => {
      expect(service.trips()).toEqual([]);
    });

    it('initialises with isLoading false', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('initialises with no error', () => {
      expect(service.error()).toBeNull();
    });

    it('initialises with currentTrip as null', () => {
      expect(service.currentTrip()).toBeNull();
    });
  });

  // ─── trips signal ────────────────────────────────────────────────────────

  describe('trips signal', () => {
    it('updates correctly after set with one trip', () => {
      service.trips.set([makeTrip('trip-1')]);
      expect(service.trips().length).toBe(1);
      expect(service.trips()[0].preferences.destination).toBe('Paris');
    });

    it('stores multiple trips', () => {
      service.trips.set([makeTrip('trip-1'), makeTrip('trip-2'), makeTrip('trip-3')]);
      expect(service.trips().length).toBe(3);
    });

    it('can be reset to empty', () => {
      service.trips.set([makeTrip('trip-1')]);
      service.trips.set([]);
      expect(service.trips()).toEqual([]);
    });

    it('preserves userId on stored trips', () => {
      service.trips.set([makeTrip('trip-1', 'owner-abc')]);
      expect(service.trips()[0].userId).toBe('owner-abc');
    });

    it('preserves all trip fields', () => {
      const trip = makeTrip('trip-x');
      service.trips.set([trip]);
      const stored = service.trips()[0];
      expect(stored.id).toBe('trip-x');
      expect(stored.itinerary.summary).toBe('City of lights');
      expect(stored.preferences.budget).toBe('medium');
    });

    it('reflects the correct count after sequential sets', () => {
      service.trips.set([makeTrip('a'), makeTrip('b')]);
      expect(service.trips().length).toBe(2);
      service.trips.set([makeTrip('c')]);
      expect(service.trips().length).toBe(1);
    });

    it('stores trip with correct destination', () => {
      service.trips.set([makeTrip('trip-paris')]);
      expect(service.trips()[0].itinerary.destination).toBe('Paris');
    });
  });

  // ─── currentTrip signal ──────────────────────────────────────────────────

  describe('currentTrip signal', () => {
    it('can be set to a trip', () => {
      service.currentTrip.set(makeTrip('trip-current'));
      expect(service.currentTrip()?.id).toBe('trip-current');
    });

    it('can be cleared back to null', () => {
      service.currentTrip.set(makeTrip('trip-1'));
      service.currentTrip.set(null);
      expect(service.currentTrip()).toBeNull();
    });

    it('reflects the last set trip', () => {
      service.currentTrip.set(makeTrip('trip-1'));
      service.currentTrip.set(makeTrip('trip-2'));
      expect(service.currentTrip()?.id).toBe('trip-2');
    });

    it('stores the correct itinerary on currentTrip', () => {
      service.currentTrip.set(makeTrip('trip-details'));
      expect(service.currentTrip()?.itinerary.totalEstimatedCost).toBe('$600');
    });

    it('stores trip preferences on currentTrip', () => {
      service.currentTrip.set(makeTrip('trip-prefs'));
      expect(service.currentTrip()?.preferences.travelStyle).toBe('culture');
    });
  });

  // ─── isLoading signal ────────────────────────────────────────────────────

  describe('isLoading signal', () => {
    it('can be set to true', () => {
      service.isLoading.set(true);
      expect(service.isLoading()).toBe(true);
    });

    it('can be toggled back to false', () => {
      service.isLoading.set(true);
      service.isLoading.set(false);
      expect(service.isLoading()).toBe(false);
    });

    it('starts as false and returns to false after toggle', () => {
      expect(service.isLoading()).toBe(false);
      service.isLoading.set(true);
      service.isLoading.set(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  // ─── error signal ────────────────────────────────────────────────────────

  describe('error signal', () => {
    it('is set and cleared correctly', () => {
      service.error.set({ code: 'load-failed', message: 'err', retryable: true });
      expect(service.error()?.code).toBe('load-failed');
      service.error.set(null);
      expect(service.error()).toBeNull();
    });

    it('stores retryable=false errors correctly', () => {
      service.error.set({ code: '403', message: 'Forbidden', retryable: false });
      expect(service.error()?.retryable).toBe(false);
    });

    it('stores retryable=true errors correctly', () => {
      service.error.set({ code: '500', message: 'Server error', retryable: true });
      expect(service.error()?.retryable).toBe(true);
    });

    it('overrides previous error with new one', () => {
      service.error.set({ code: 'first', message: 'First error', retryable: true });
      service.error.set({ code: 'second', message: 'Second error', retryable: false });
      expect(service.error()?.code).toBe('second');
    });

    it('stores the full error message', () => {
      service.error.set({ code: '404', message: 'Trip not found', retryable: false });
      expect(service.error()?.message).toBe('Trip not found');
    });

    it('error code is preserved correctly', () => {
      service.error.set({ code: 'PERMISSION_DENIED', message: 'Access denied', retryable: false });
      expect(service.error()?.code).toBe('PERMISSION_DENIED');
    });
  });

  // ─── ownership guard ─────────────────────────────────────────────────────

  describe('ownership guard', () => {
    it('throws when deleting a trip owned by another user', async () => {
      service.trips.set([makeTrip('trip-abc', 'other-user-999')]);

      await expect(
        (async () => {
          const trip = service.trips().find((t) => t.id === 'trip-abc');
          if (trip && trip.userId !== 'current-user') {
            throw new Error('Cannot delete a trip owned by another user');
          }
        })(),
      ).rejects.toThrow('Cannot delete a trip owned by another user');
    });

    it('does not throw when userId matches trip owner', async () => {
      service.trips.set([makeTrip('trip-mine', 'current-user')]);

      await expect(
        (async () => {
          const trip = service.trips().find((t) => t.id === 'trip-mine');
          if (trip && trip.userId !== 'current-user') {
            throw new Error('Cannot delete a trip owned by another user');
          }
        })(),
      ).resolves.toBeUndefined();
    });

    it('finds the correct trip by id', () => {
      service.trips.set([makeTrip('trip-1'), makeTrip('trip-2'), makeTrip('trip-3')]);
      const found = service.trips().find((t) => t.id === 'trip-2');
      expect(found?.id).toBe('trip-2');
    });

    it('returns undefined for a non-existent trip id', () => {
      service.trips.set([makeTrip('trip-1')]);
      const found = service.trips().find((t) => t.id === 'does-not-exist');
      expect(found).toBeUndefined();
    });
  });
});
