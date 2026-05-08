// Copy this file to environment.ts (dev) and environment.prod.ts (prod)
// and fill in your real API keys. Never commit the filled-in files.
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
  },
  geminiApiKey: 'YOUR_GEMINI_API_KEY',           // from aistudio.google.com
  googleMapsApiKey: 'YOUR_MAPS_API_KEY',         // from Google Cloud Console
  googleOAuthClientId: 'YOUR_OAUTH_CLIENT_ID',   // for Google Sign-In
  googleCalendarClientId: 'YOUR_CALENDAR_CLIENT_ID',
  translateApiKey: '',                            // optional
};
