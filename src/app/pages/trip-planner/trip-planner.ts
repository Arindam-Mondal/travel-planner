import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TripFormComponent } from '../../components/trip-form/trip-form';
import { ItineraryViewComponent } from '../../components/itinerary-view/itinerary-view';
import { MapViewComponent } from '../../components/map-view/map-view';
import { FirestoreService } from '../../services/firestore.service';
import { CalendarService } from '../../services/calendar.service';
import { type Itinerary, type Stop, type TravelPreferences } from '../../models/trip.models';
import { toIsoDate } from '../../utils/itinerary.utils';

@Component({
  selector: 'app-trip-planner',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    TripFormComponent,
    ItineraryViewComponent,
    MapViewComponent,
  ],
  templateUrl: './trip-planner.html',
  styleUrl: './trip-planner.scss',
})
export class TripPlannerComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly firestoreService = inject(FirestoreService);
  private readonly calendarService = inject(CalendarService);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentItinerary = signal<Itinerary | null>(null);
  readonly currentPreferences = signal<TravelPreferences | null>(null);
  readonly activeDay = signal(0);
  readonly isSaving = signal(false);
  readonly isExportingCal = signal(false);
  readonly showMap = signal(true);

  readonly activeStops = computed(() => {
    const itinerary = this.currentItinerary();
    if (!itinerary) return [];
    return itinerary.days[this.activeDay()]?.stops ?? [];
  });

  // Pre-fill form if navigated from Edit button
  prefillTrip: unknown = null;

  ngOnInit(): void {
    const nav = history.state as { trip?: unknown };
    if (nav?.trip) {
      this.prefillTrip = nav.trip;
    }
  }

  onItineraryGenerated(itinerary: Itinerary): void {
    this.currentItinerary.set(itinerary);
    this.activeDay.set(0);
    this.snackBar.open('Itinerary generated!', 'View on Map', { duration: 3000 });
  }

  onPreferencesChange(prefs: TravelPreferences): void {
    this.currentPreferences.set(prefs);
  }

  onStopSelected(stop: Stop): void {
    const itinerary = this.currentItinerary();
    if (!itinerary) return;
    const dayIndex = itinerary.days.findIndex((d) => d.stops.some((s) => s.id === stop.id));
    if (dayIndex >= 0) this.activeDay.set(dayIndex);
  }

  onDayChanged(dayIndex: number): void {
    this.activeDay.set(dayIndex);
  }

  async saveTrip(): Promise<void> {
    const itinerary = this.currentItinerary();
    const prefs = this.currentPreferences();
    if (!itinerary || !prefs) return;

    this.isSaving.set(true);
    try {
      const id = await this.firestoreService.saveTrip(prefs, itinerary);
      this.snackBar.open('Trip saved!', 'View', { duration: 3000 }).onAction().subscribe(() => {
        this.router.navigate(['/trip', id]);
      });
      this.router.navigate(['/trip', id]);
    } catch {
      this.snackBar.open('Failed to save trip', 'OK', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  async exportToCalendar(): Promise<void> {
    const itinerary = this.currentItinerary();
    const prefs = this.currentPreferences();
    if (!itinerary || !prefs) return;

    this.isExportingCal.set(true);
    try {
      const result = await this.calendarService.exportToCalendar(itinerary, prefs);
      this.snackBar.open(`${result.created} events added to Google Calendar`, 'OK', { duration: 4000 });
    } catch {
      this.snackBar.open('Calendar export failed. Check Calendar permissions.', 'OK', { duration: 4000 });
    } finally {
      this.isExportingCal.set(false);
    }
  }

  async exportPdf(): Promise<void> {
    const itinerary = this.currentItinerary();
    const prefs = this.currentPreferences();
    if (!itinerary || !prefs) return;
    await this.calendarService.exportToPdf(itinerary, prefs);
  }
}
