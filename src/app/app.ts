import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NavbarComponent } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <a class="sr-only" href="#main-content">Skip to main content</a>
    @if (isAuthenticated()) {
      <app-navbar />
    }
    <main id="main-content">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {
  private readonly authService = inject(AuthService);
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
}
