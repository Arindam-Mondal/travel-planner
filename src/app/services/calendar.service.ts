import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import { type Itinerary, type TravelPreferences } from '../models/trip.models';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../models/trip.models';
import { formatDuration } from '../utils/itinerary.utils';
import { AuthService } from './auth.service';

interface CalendarEvent {
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly calendarApiBase = 'https://www.googleapis.com/calendar/v3';

  /**
   * Exports all itinerary stops as Google Calendar events (one per stop).
   * Returns a summary of created events and any errors.
   */
  async exportToCalendar(
    itinerary: Itinerary,
    preferences: TravelPreferences,
  ): Promise<{ created: number; errors: string[] }> {
    const events: CalendarEvent[] = [];

    itinerary.days.forEach((day) => {
      let hourOffset = 9; // Start each day at 9am
      day.stops.forEach((stop) => {
        const startDate = new Date(`${day.date}T${String(hourOffset).padStart(2, '0')}:00:00`);
        const endDate = new Date(startDate.getTime() + stop.durationMinutes * 60000);
        hourOffset += Math.ceil(stop.durationMinutes / 60) + 0.5; // 30-min gap between stops

        events.push({
          summary: `${stop.name} — ${itinerary.destination} Trip`,
          description: `Category: ${stop.category}\nEstimated cost: ${stop.estimatedCost}\nBest time: ${stop.bestTimeToVisit}\n\nTips: ${stop.tips}`,
          location: stop.address,
          start: { dateTime: startDate.toISOString(), timeZone: 'UTC' },
          end: { dateTime: endDate.toISOString(), timeZone: 'UTC' },
        });
      });
    });

    const results = await Promise.allSettled(events.map((e) => this.createCalendarEvent(e)));
    const created = results.filter((r) => r.status === 'fulfilled').length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => String(r.reason));

    return { created, errors };
  }

  /**
   * Creates a single event in the user's primary Google Calendar.
   */
  private async createCalendarEvent(event: CalendarEvent): Promise<void> {
    await this.http
      .post(`${this.calendarApiBase}/calendars/primary/events`, event)
      .toPromise();
  }

  /**
   * Generates and triggers a PDF download of the full itinerary.
   */
  async exportToPdf(itinerary: Itinerary, preferences: TravelPreferences): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Header
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`✈ ${itinerary.destination}`, margin, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${preferences.startDate} → ${preferences.endDate}  |  ${preferences.travelStyle}  |  Group: ${preferences.groupSize}`, margin, 26);

    y = 40;
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const summaryLines = doc.splitTextToSize(itinerary.summary, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 6 + 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 137, 123);
    doc.text(`Total estimated cost: ${itinerary.totalEstimatedCost}`, margin, y);
    y += 10;

    itinerary.days.forEach((day) => {
      if (y > 260) { doc.addPage(); y = margin; }

      doc.setFillColor(232, 240, 254);
      doc.rect(margin - 2, y - 5, pageWidth - 2 * margin + 4, 10, 'F');
      doc.setTextColor(21, 101, 192);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Day ${day.dayNumber} — ${day.date} · ${day.theme}`, margin, y);
      y += 10;

      day.stops.forEach((stop, i) => {
        if (y > 265) { doc.addPage(); y = margin; }

        doc.setTextColor(33, 33, 33);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${stop.name}`, margin + 3, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${stop.category.toUpperCase()}  ·  ${formatDuration(stop.durationMinutes)}  ·  ${stop.estimatedCost}`, margin + 3, y + 5);
        doc.setTextColor(33, 33, 33);
        const tipLines = doc.splitTextToSize(`📍 ${stop.address}`, pageWidth - 2 * margin - 6);
        doc.text(tipLines, margin + 3, y + 10);
        y += 10 + tipLines.length * 5 + 4;
      });

      y += 4;
    });

    const filename = `${itinerary.destination.replace(/\s+/g, '-').toLowerCase()}-itinerary.pdf`;
    doc.save(filename);
  }
}
