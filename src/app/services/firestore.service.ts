import { Injectable, effect, inject, signal } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  collectionGroup,
} from '@angular/fire/firestore';
import { type AppError, type Itinerary, type Trip, type TravelPreferences } from '../models/trip.models';
import { generateShareToken } from '../utils/itinerary.utils';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly trips = signal<Trip[]>([]);
  readonly currentTrip = signal<Trip | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<AppError | null>(null);

  constructor() {
    // Auto-load trips whenever the user logs in
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadUserTrips();
      } else {
        this.trips.set([]);
      }
    });
  }

  private get userId(): string {
    const uid = this.authService.user()?.uid;
    if (!uid) throw new Error('User not authenticated');
    return uid;
  }

  private tripsCollection() {
    return collection(this.firestore, `users/${this.userId}/trips`);
  }

  private tripDoc(tripId: string) {
    return doc(this.firestore, `users/${this.userId}/trips/${tripId}`);
  }

  /**
   * Loads all trips for the authenticated user, ordered by creation date descending.
   */
  async loadUserTrips(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const q = query(this.tripsCollection(), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const trips = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
      this.trips.set(trips);
    } catch (err) {
      this.error.set({ code: 'load-failed', message: 'Failed to load trips', retryable: true });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Saves a new trip to Firestore and returns the generated document ID.
   */
  async saveTrip(preferences: TravelPreferences, itinerary: Itinerary): Promise<string> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const docRef = await addDoc(this.tripsCollection(), {
        userId: this.userId,
        preferences,
        itinerary,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await this.loadUserTrips();
      return docRef.id;
    } catch (err) {
      this.error.set({ code: 'save-failed', message: 'Failed to save trip', retryable: true });
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Updates an existing trip document with partial data.
   */
  async updateTrip(tripId: string, partial: Partial<Trip>): Promise<void> {
    try {
      await updateDoc(this.tripDoc(tripId), {
        ...partial,
        updatedAt: serverTimestamp(),
      });
      await this.loadUserTrips();
    } catch (err) {
      this.error.set({ code: 'update-failed', message: 'Failed to update trip', retryable: true });
      throw err;
    }
  }

  /**
   * Deletes a trip owned by the current user.
   */
  async deleteTrip(tripId: string): Promise<void> {
    const trip = this.trips().find((t) => t.id === tripId);
    if (trip && trip.userId !== this.userId) {
      throw new Error('Cannot delete a trip owned by another user');
    }
    try {
      await deleteDoc(this.tripDoc(tripId));
      this.trips.update((ts) => ts.filter((t) => t.id !== tripId));
    } catch (err) {
      this.error.set({ code: 'delete-failed', message: 'Failed to delete trip', retryable: false });
      throw err;
    }
  }

  /**
   * Fetches a single trip by its Firestore document ID.
   */
  async getTripById(tripId: string): Promise<Trip | null> {
    try {
      const snapshot = await getDoc(this.tripDoc(tripId));
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as Trip;
    } catch {
      return null;
    }
  }

  /**
   * Finds a trip by its public share token across all user collections.
   */
  async getTripByShareToken(token: string): Promise<Trip | null> {
    try {
      const q = query(
        collectionGroup(this.firestore, 'trips'),
        where('shareToken', '==', token),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Trip;
    } catch {
      return null;
    }
  }

  /**
   * Generates a UUID share token, saves it on the trip, and returns the full share URL.
   */
  async generateShareLink(tripId: string): Promise<string> {
    const token = generateShareToken();
    await updateDoc(this.tripDoc(tripId), { shareToken: token, updatedAt: serverTimestamp() });
    await this.loadUserTrips();
    return `${window.location.origin}/share/${token}`;
  }

  /**
   * Removes the share token from a trip, revoking public access.
   */
  async revokeShareLink(tripId: string): Promise<void> {
    const { deleteField } = await import('@angular/fire/firestore');
    await updateDoc(this.tripDoc(tripId), {
      shareToken: deleteField(),
      updatedAt: serverTimestamp(),
    });
    await this.loadUserTrips();
  }
}
