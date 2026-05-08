import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { type Trip } from '../../models/trip.models';
import { BUDGET_OPTIONS, TRAVEL_STYLE_OPTIONS } from '../../models/trip.models';
import { FirestoreService } from '../../services/firestore.service';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-trip-card',
  imports: [
    DecimalPipe,
    TitleCasePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './trip-card.html',
  styleUrl: './trip-card.scss',
})
export class TripCardComponent {
  readonly trip = input.required<Trip>();
  readonly tripDeleted = output<string>();
  readonly tripShared = output<string>();

  private readonly router = inject(Router);
  private readonly firestoreService = inject(FirestoreService);
  private readonly calendarService = inject(CalendarService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isDeleting = signal(false);
  readonly isSharing = signal(false);
  readonly isExporting = signal(false);

  readonly budgetOptions = BUDGET_OPTIONS;
  readonly styleOptions = TRAVEL_STYLE_OPTIONS;

  getBudgetLabel(budget: string): string {
    return this.budgetOptions.find((b) => b.value === budget)?.label ?? budget;
  }

  getStyleIcon(style: string): string {
    return this.styleOptions.find((s) => s.value === style)?.icon ?? 'travel_explore';
  }

  openTrip(): void {
    this.router.navigate(['/trip', this.trip().id]);
  }

  editTrip(): void {
    this.router.navigate(['/trip/new'], { state: { trip: this.trip() } });
  }

  async shareTrip(): Promise<void> {
    this.isSharing.set(true);
    try {
      const url = await this.firestoreService.generateShareLink(this.trip().id);
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Share link copied to clipboard!', 'OK', { duration: 3000 });
      this.tripShared.emit(url);
    } catch {
      this.snackBar.open('Failed to generate share link', 'OK', { duration: 3000 });
    } finally {
      this.isSharing.set(false);
    }
  }

  async deleteTrip(): Promise<void> {
    if (!confirm(`Delete trip to ${this.trip().preferences.destination}?`)) return;
    this.isDeleting.set(true);
    try {
      await this.firestoreService.deleteTrip(this.trip().id);
      this.tripDeleted.emit(this.trip().id);
    } catch {
      this.snackBar.open('Failed to delete trip', 'OK', { duration: 3000 });
    } finally {
      this.isDeleting.set(false);
    }
  }

  async exportPdf(): Promise<void> {
    this.isExporting.set(true);
    try {
      await this.calendarService.exportToPdf(this.trip().itinerary, this.trip().preferences);
    } finally {
      this.isExporting.set(false);
    }
  }
}
