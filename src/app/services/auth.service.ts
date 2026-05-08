import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  OAuthCredential,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  readonly user = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly googleAccessToken = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly displayName = computed(() => this.user()?.displayName ?? 'Traveller');
  readonly photoURL = computed(() => this.user()?.photoURL ?? null);
  readonly email = computed(() => this.user()?.email ?? null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.isLoading.set(false);
    });
  }

  /**
   * Signs in the user with Google using a popup.
   * Requests the calendar.events scope so Calendar export works without re-auth.
   */
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    try {
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result) as OAuthCredential;
      if (credential?.accessToken) {
        this.googleAccessToken.set(credential.accessToken);
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  }

  /**
   * Signs the current user out and clears all auth signals.
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.googleAccessToken.set(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  }
}
