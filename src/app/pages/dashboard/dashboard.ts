import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripCardComponent } from '../../components/trip-card/trip-card';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TripCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  readonly firestoreService = inject(FirestoreService);
  readonly authService = inject(AuthService);

  readonly searchQuery = signal('');

  readonly filteredTrips = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return !q
      ? this.firestoreService.trips()
      : this.firestoreService.trips().filter((t) =>
          t.preferences.destination.toLowerCase().includes(q) ||
          t.itinerary.summary.toLowerCase().includes(q),
        );
  });

  ngOnInit(): void {
    this.firestoreService.loadUserTrips();
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
