import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'trip/new',
    loadComponent: () =>
      import('./pages/trip-planner/trip-planner').then(
        (m) => m.TripPlannerComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'trip/:id',
    loadComponent: () =>
      import('./pages/trip-detail/trip-detail').then(
        (m) => m.TripDetailComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'share/:token',
    loadComponent: () =>
      import('./pages/shared-trip/shared-trip').then(
        (m) => m.SharedTripComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFoundComponent),
  },
];
