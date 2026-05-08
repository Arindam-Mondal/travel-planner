import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found-container">
      <mat-icon class="big-icon">flight_off</mat-icon>
      <h1>404 — Page Not Found</h1>
      <p>Looks like this destination doesn't exist. Let's get you back on track.</p>
      <a mat-raised-button color="primary" routerLink="/dashboard">
        <mat-icon>home</mat-icon>
        Go Home
      </a>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      gap: 16px;
      text-align: center;
      padding: 24px;
      color: #555;
    }
    .big-icon { font-size: 80px; width: 80px; height: 80px; color: #1565C0; opacity: .4; }
    h1 { margin: 0; }
    p { max-width: 360px; line-height: 1.6; }
    a { display: flex; align-items: center; gap: 8px; }
  `],
})
export class NotFoundComponent {}
