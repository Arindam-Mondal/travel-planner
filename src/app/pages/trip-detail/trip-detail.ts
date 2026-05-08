import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ItineraryViewComponent } from '../../components/itinerary-view/itinerary-view';
import { MapViewComponent } from '../../components/map-view/map-view';
import { type Stop, type Trip } from '../../models/trip.models';
import { FirestoreService } from '../../services/firestore.service';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-trip-detail',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    RouterLink,
    ItineraryViewComponent,
    MapViewComponent,
  ],
  templateUrl: './trip-detail.html',
  styleUrl: './trip-detail.scss',
})
export class TripDetailComponent implements OnInit {
  @Input() id!: string;

  private readonly firestoreService = inject(FirestoreService);
  private readonly calendarService = inject(CalendarService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly trip = signal<Trip | null>(null);
  readonly isLoading = signal(true);
  readonly activeDay = signal(0);
  readonly activeStops = signal<Stop[]>([]);

  async ngOnInit(): Promise<void> {
    const loaded = await this.firestoreService.getTripById(this.id);
    this.trip.set(loaded);
    this.isLoading.set(false);
    if (loaded) this.activeStops.set(loaded.itinerary.days[0]?.stops ?? []);
  }

  onDayChanged(dayIndex: number): void {
    this.activeDay.set(dayIndex);
    const t = this.trip();
    if (t) this.activeStops.set(t.itinerary.days[dayIndex]?.stops ?? []);
  }

  editTrip(): void {
    this.router.navigate(['/trip/new'], { state: { trip: this.trip() } });
  }

  async exportPdf(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    await this.calendarService.exportToPdf(t.itinerary, t.preferences);
  }

  async exportToCalendar(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    try {
      const result = await this.calendarService.exportToCalendar(t.itinerary, t.preferences);
      this.snackBar.open(`${result.created} events added to Google Calendar`, 'OK', { duration: 4000 });
    } catch {
      this.snackBar.open('Calendar export failed', 'OK', { duration: 3000 });
    }
  }

  async shareTrip(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    try {
      const url = await this.firestoreService.generateShareLink(t.id);
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Share link copied!', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Failed to generate link', 'OK', { duration: 3000 });
    }
  }
}
