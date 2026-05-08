import {
  Component,
  OnInit,
  inject,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BUDGET_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
  type Itinerary,
  type TravelPreferences,
} from '../../models/trip.models';
import { GeminiService } from '../../services/gemini.service';
import { toIsoDate } from '../../utils/itinerary.utils';

function endAfterStartValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value as Date | null;
  const end = control.get('endDate')?.value as Date | null;
  if (!start || !end) return null;
  return end > start ? null : { endBeforeStart: true };
}

@Component({
  selector: 'app-trip-form',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  templateUrl: './trip-form.html',
  styleUrl: './trip-form.scss',
})
export class TripFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly geminiService = inject(GeminiService);

  readonly itineraryGenerated = output<Itinerary>();
  readonly minDate = new Date();

  readonly budgetOptions = BUDGET_OPTIONS;
  readonly styleOptions = TRAVEL_STYLE_OPTIONS;

  readonly form = this.fb.group(
    {
      destination: ['', [Validators.required, Validators.minLength(2)]],
      startDate: [null as Date | null, Validators.required],
      endDate: [null as Date | null, Validators.required],
      budget: ['medium', Validators.required],
      travelStyle: ['culture', Validators.required],
      groupSize: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
      constraints: ['', Validators.maxLength(500)],
    },
    { validators: endAfterStartValidator },
  );

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      const itinerary = await this.geminiService.generateItinerary(this.buildPreferences());
      this.itineraryGenerated.emit(itinerary);
    } catch {
      // Error handled by geminiService.generationError signal
    }
  }

  private buildPreferences(): TravelPreferences {
    const v = this.form.getRawValue();
    return {
      destination: v.destination ?? '',
      startDate: v.startDate ? toIsoDate(v.startDate) : '',
      endDate: v.endDate ? toIsoDate(v.endDate) : '',
      budget: (v.budget as TravelPreferences['budget']) ?? 'medium',
      travelStyle: (v.travelStyle as TravelPreferences['travelStyle']) ?? 'culture',
      groupSize: v.groupSize ?? 1,
      constraints: v.constraints ?? '',
    };
  }
}
