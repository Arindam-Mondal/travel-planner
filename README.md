# TravelAI — Smart Travel Planning & Experience Engine

> AI-powered, day-by-day itinerary generator built for the **Hack to Skill — Built with AI Hackathon**.

**Live Demo:** https://travel-planner-edf55.web.app *(after `firebase deploy`)*

---

## Vertical

**Travel Planning & Experience Engine** — generates personalised, interactive trip itineraries using Gemini AI, displayed on Google Maps with full calendar and PDF export.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Angular 21 SPA                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Pages   │  │  Components  │  │    Services      │   │
│  │ dashboard│  │ trip-form    │  │ GeminiService    │   │
│  │ planner  │  │ itinerary-   │  │ MapsService      │   │
│  │ detail   │  │   view       │  │ FirestoreService │   │
│  │ shared   │  │ map-view     │  │ AuthService      │   │
│  └────┬─────┘  │ trip-card    │  │ CalendarService  │   │
│       │        └──────────────┘  └────────┬─────────┘   │
└───────┼─────────────────────────────────── ┼─────────────┘
        │                                    │
        ▼                                    ▼
┌───────────────┐          ┌─────────────────────────────┐
│   Firebase    │          │        Google APIs           │
│  ─ Firestore  │          │  ─ Gemini 2.0 Flash          │
│  ─ Auth       │          │  ─ Maps JS API               │
│  ─ Hosting    │          │  ─ Places API                │
└───────────────┘          │  ─ Directions API            │
                           │  ─ Calendar API              │
                           │  ─ Translate API (optional)  │
                           └─────────────────────────────┘
```

---

## Google Services Used

| Service | Why |
|---|---|
| **Gemini 2.0 Flash** | Fast, structured JSON itinerary generation with `responseMimeType: application/json` |
| **Firebase Auth** | Zero-backend Google Sign-In with Calendar OAuth scope |
| **Firestore** | Real-time trip storage, security rules, public share tokens |
| **Firebase Hosting** | Static SPA hosting with SPA rewrites and security headers |
| **Maps JS API** | Interactive map with `AdvancedMarkerElement` colour-coded by stop category |
| **Directions API** | Driving routes between stops for each day |
| **Google Calendar API** | One-click export of every stop as a calendar event |
| **Translate API** | *(Optional)* Translate itinerary text to destination language |

---

## How Gemini Generates Itineraries

1. User fills in destination, dates, budget, travel style, group size, and constraints.
2. `buildGeminiPrompt()` assembles a structured prompt requesting **strict JSON output** (`responseMimeType: application/json`).
3. Gemini 2.0 Flash returns a day-by-day itinerary with GPS coordinates, cost estimates, and actionable tips for each stop.
4. `validateItineraryResponse()` (type guard) verifies the JSON shape before rendering.
5. Preferences changes are **debounced (1500 ms)** via RxJS `Subject → debounceTime → switchMap` to avoid excessive API calls.

---

## Setup

### Prerequisites
- Node.js 18+
- Angular CLI 17+: `npm i -g @angular/cli`
- Firebase CLI: `npm i -g firebase-tools`
- Google Cloud project with Maps JS, Directions, Calendar, and Translate APIs enabled
- Firebase project with Firestore + Google Auth enabled

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd travel-planner
npm install

# 2. Configure API keys in src/environments/environment.ts
#    (see the file — all keys are clearly labelled)

# 3. Start dev server
npm start
# Open http://localhost:4200
```

### Run Tests

```bash
npm test
```

### Production Build

```bash
ng build --configuration production
# Output: dist/travel-planner/browser/
```

### Deploy to Firebase

```bash
# First-time setup
firebase login
firebase use travel-planner-edf55

# Deploy hosting + Firestore rules + indexes
firebase deploy
```

---

## Assumptions

- The Gemini API key and Maps API key can be the same Google Cloud API key if both APIs are enabled on the same project.
- Calendar export requires the user to grant `calendar.events` OAuth scope at sign-in.
- GPS coordinates are provided by Gemini and are approximate; the app relies on them for initial map centering and route planning.
- The Translate feature requires a separate Translate API key and is disabled when `translateApiKey` is empty.
- Share links grant public read access to the trip document; access is revoked by removing the `shareToken` field.

---

## Future Improvements

- **Offline support**: Cache itineraries in IndexedDB for offline viewing
- **Collaborative trips**: Multi-user editing with Firestore real-time listeners
- **Hotel & flight search**: Integrate with Amadeus or Booking.com API
- **AI chat refinement**: Allow natural-language edits ("move the restaurant to Day 2")
- **Budget tracker**: Real-time spend tracking vs. estimate
- **Photos**: Pull Place Photos API images for each stop hero image
- **Dark mode**: Angular Material theming with user preference persistence
