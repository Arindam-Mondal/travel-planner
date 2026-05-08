import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth.service';

const mockAuthService = {
  isAuthenticated: signal(false),
  user: signal(null as null),
  displayName: signal(null as null),
  photoURL: signal(null as null),
  googleAccessToken: signal(null as null),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not show navbar when not authenticated', () => {
    mockAuthService.isAuthenticated.set(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeNull();
  });

  it('exposes isAuthenticated computed from AuthService', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    mockAuthService.isAuthenticated.set(false);
    expect(app.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated reflects AuthService signal changes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    mockAuthService.isAuthenticated.set(false);
    expect(app.isAuthenticated()).toBe(false);
    mockAuthService.isAuthenticated.set(true);
    expect(app.isAuthenticated()).toBe(true);
    mockAuthService.isAuthenticated.set(false);
  });
});
