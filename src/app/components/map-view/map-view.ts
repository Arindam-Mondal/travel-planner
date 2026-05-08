import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { type Stop } from '../../models/trip.models';
import { MapsService } from '../../services/maps.service';
import { CATEGORY_ICONS } from '../../models/trip.models';
import { formatDuration } from '../../utils/itinerary.utils';

@Component({
  selector: 'app-map-view',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TitleCasePipe,
  ],
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  readonly mapsService = inject(MapsService);

  readonly stops = input<Stop[]>([]);
  readonly activeDay = input<number>(0);

  readonly CATEGORY_ICONS = CATEGORY_ICONS;
  readonly formatDuration = formatDuration;

  private defaultCenter = { lat: 35.6762, lng: 139.6503 }; // Tokyo default

  constructor() {
    // Re-render markers when stops input changes
    effect(() => {
      const currentStops = this.stops();
      if (this.mapsService.isLoaded() && currentStops.length > 0) {
        this.mapsService.renderStopMarkers(currentStops).then(() => {
          this.mapsService.fitBoundsToStops(currentStops);
        });
      }
    });

    // Update route when active day changes
    effect(() => {
      const _ = this.activeDay();
      const currentStops = this.stops();
      if (this.mapsService.isLoaded() && currentStops.length >= 2) {
        this.mapsService.renderDayRoute(currentStops);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      const center = this.stops().length > 0
        ? this.stops()[0].coordinates
        : this.defaultCenter;

      await this.mapsService.createMap(this.mapContainer.nativeElement, center);

      if (this.stops().length > 0) {
        await this.mapsService.renderStopMarkers(this.stops());
        this.mapsService.fitBoundsToStops(this.stops());
        if (this.stops().length >= 2) {
          await this.mapsService.renderDayRoute(this.stops());
        }
      }
    } catch (err) {
      console.error('Map init failed:', err);
    }
  }

  ngOnDestroy(): void {
    this.mapsService.clearMap();
  }

  closeInfoPanel(): void {
    this.mapsService.selectedStop.set(null);
  }
}
