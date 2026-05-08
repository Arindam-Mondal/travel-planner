import {
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { TitleCasePipe } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Itinerary,
  type Stop,
  type TravelPreferences,
} from '../../models/trip.models';
import { formatDuration, getCategoryColor } from '../../utils/itinerary.utils';

@Component({
  selector: 'app-itinerary-view',
  imports: [
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
    TitleCasePipe,
  ],
  templateUrl: './itinerary-view.html',
  styleUrl: './itinerary-view.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(16px)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ transform: 'translateY(16px)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class ItineraryViewComponent {
  readonly itinerary = input.required<Itinerary>();
  readonly preferences = input.required<TravelPreferences>();

  readonly stopSelected = output<Stop>();
  readonly dayChanged = output<number>();

  readonly CATEGORY_ICONS = CATEGORY_ICONS;
  readonly formatDuration = formatDuration;
  readonly getCategoryColor = getCategoryColor;

  readonly totalStops = computed(() =>
    this.itinerary().days.reduce((sum, d) => sum + d.stops.length, 0),
  );

  onTabChange(index: number): void {
    this.dayChanged.emit(index);
  }

  selectStop(stop: Stop): void {
    this.stopSelected.emit(stop);
  }
}
