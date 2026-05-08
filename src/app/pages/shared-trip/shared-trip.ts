import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ItineraryViewComponent } from '../../components/itinerary-view/itinerary-view';
import { MapViewComponent } from '../../components/map-view/map-view';
import { type Stop, type Trip } from '../../models/trip.models';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-shared-trip',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    RouterLink,
    ItineraryViewComponent,
    MapViewComponent,
  ],
  templateUrl: './shared-trip.html',
  styleUrl: './shared-trip.scss',
})
export class SharedTripComponent implements OnInit {
  @Input() token!: string;

  private readonly firestoreService = inject(FirestoreService);
  private readonly route = inject(ActivatedRoute);

  readonly trip = signal<Trip | null>(null);
  readonly isLoading = signal(true);
  readonly notFound = signal(false);
  readonly activeDay = signal(0);
  readonly activeStops = signal<Stop[]>([]);

  async ngOnInit(): Promise<void> {
    const token = this.token ?? this.route.snapshot.paramMap.get('token') ?? '';
    const loaded = await this.firestoreService.getTripByShareToken(token);
    if (loaded) {
      this.trip.set(loaded);
      this.activeStops.set(loaded.itinerary.days[0]?.stops ?? []);
    } else {
      this.notFound.set(true);
    }
    this.isLoading.set(false);
  }

  onDayChanged(dayIndex: number): void {
    this.activeDay.set(dayIndex);
    const t = this.trip();
    if (t) this.activeStops.set(t.itinerary.days[dayIndex]?.stops ?? []);
  }
}
