// ============================================================
//  Backend Configuration — EXAMPLE / TEMPLATE
//
//  HOW TO USE:
//  1. Copy backend/.env.example to backend/.env
//       cp backend/.env.example backend/.env
//  2. Fill in your Firebase credentials in backend/.env
//  3. Never commit backend/.env to version control
//
//  WHERE TO FIND THESE VALUES:
//  Firebase Console → Project Settings → General
//  → "Your apps" → Web app → Config snippet
//
//  This file reads from environment variables (process.env.*).
//  The actual backend/config/config.js does NOT need to be
//  edited — credentials are loaded from the .env file at runtime.
// ============================================================

export const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
};
