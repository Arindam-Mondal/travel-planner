import { Injectable, signal } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';
import {
  type AppError,
  type Coordinates,
  type Stop,
  CATEGORY_COLORS,
} from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class MapsService {
  private map: google.maps.Map | null = null;
  private markers: google.maps.marker.AdvancedMarkerElement[] = [];
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;

  readonly isLoaded = signal(false);
  readonly selectedStop = signal<Stop | null>(null);
  readonly mapError = signal<AppError | null>(null);

  /**
   * Configures the Maps API key. Safe to call multiple times — options are
   * set once; subsequent calls to importLibrary reuse the loaded script.
   */
  async initLoader(): Promise<void> {
    if (this.isLoaded()) return;
    try {
      setOptions({
        key: environment.googleMapsApiKey,
        v: 'weekly',
        libraries: ['places', 'marker'],
      });
      this.isLoaded.set(true);
    } catch (err) {
      this.mapError.set({ code: 'maps-init-failed', message: 'Failed to configure Google Maps.', retryable: true });
      throw err;
    }
  }

  /**
   * Creates a Google Map instance and mounts it to the given container element.
   */
  async createMap(container: HTMLElement, center: Coordinates, zoom = 12): Promise<void> {
    await this.initLoader();

    try {
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
      this.map = new Map(container, {
        center,
        zoom,
        mapId: 'travel-planner-map',
        gestureHandling: 'cooperative',
      });

      const { DirectionsService, DirectionsRenderer } = await importLibrary('routes') as google.maps.RoutesLibrary;
      this.directionsService = new DirectionsService();
      this.directionsRenderer = new DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#1565C0', strokeWeight: 4, strokeOpacity: 0.7 },
      });
      this.directionsRenderer.setMap(this.map);
    } catch (err) {
      this.mapError.set({ code: 'map-create-failed', message: 'Failed to load the map. Check your Maps API key.', retryable: true });
      throw err;
    }
  }

  /**
   * Adds AdvancedMarkerElements for each stop, colour-coded by category.
   * Clicking a marker updates the selectedStop signal.
   */
  async renderStopMarkers(stops: Stop[]): Promise<void> {
    if (!this.map) return;
    this.clearMarkers();

    const { AdvancedMarkerElement } = await importLibrary('marker') as google.maps.MarkerLibrary;

    stops.forEach((stop, index) => {
      const color = CATEGORY_COLORS[stop.category] ?? '#607D8B';
      const pin = document.createElement('div');
      pin.style.cssText = `
        background:${color};color:#fff;border-radius:50%;
        width:32px;height:32px;display:flex;align-items:center;
        justify-content:center;font-size:13px;font-weight:700;
        box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer;`;
      pin.textContent = String(index + 1);
      pin.setAttribute('role', 'button');
      pin.setAttribute('aria-label', `Stop ${index + 1}: ${stop.name}`);

      const marker = new AdvancedMarkerElement({
        map: this.map!,
        position: stop.coordinates,
        content: pin,
        title: stop.name,
      });

      marker.addListener('click', () => this.selectedStop.set(stop));
      this.markers.push(marker);
    });
  }

  /**
   * Fetches and renders a driving route between all stops in order.
   */
  async renderDayRoute(stops: Stop[]): Promise<void> {
    if (!this.map || !this.directionsService || !this.directionsRenderer || stops.length < 2) return;

    const { TravelMode } = await importLibrary('routes') as google.maps.RoutesLibrary;

    const waypoints = stops.slice(1, -1).map((s) => ({
      location: new google.maps.LatLng(s.coordinates.lat, s.coordinates.lng),
      stopover: true,
    }));

    try {
      const result = await this.directionsService.route({
        origin: new google.maps.LatLng(stops[0].coordinates.lat, stops[0].coordinates.lng),
        destination: new google.maps.LatLng(
          stops[stops.length - 1].coordinates.lat,
          stops[stops.length - 1].coordinates.lng,
        ),
        waypoints,
        travelMode: TravelMode.DRIVING,
      });
      this.directionsRenderer.setDirections(result);
    } catch {
      // Route unavailable — silently skip
    }
  }

  /**
   * Removes all markers from the map.
   */
  clearMarkers(): void {
    this.markers.forEach((m) => (m.map = null));
    this.markers = [];
    this.selectedStop.set(null);
  }

  /**
   * Clears markers and the directions overlay.
   */
  clearMap(): void {
    this.clearMarkers();
    try {
      this.directionsRenderer?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    } catch { /* ignore */ }
  }

  /**
   * Fits the map viewport to encompass all stop coordinates.
   */
  fitBoundsToStops(stops: Stop[]): void {
    if (!this.map || stops.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(s.coordinates));
    this.map.fitBounds(bounds);
  }
}
