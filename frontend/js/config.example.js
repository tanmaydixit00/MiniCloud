// ============================================================
//  Frontend Configuration — EXAMPLE / TEMPLATE
//
//  HOW TO USE:
//  1. Copy frontend/.env.example to frontend/.env
//       cp frontend/.env.example frontend/.env
//  2. Fill in your Firebase and Supabase credentials in frontend/.env
//  3. Never commit frontend/.env to version control
//
//  WHERE TO FIND THESE VALUES:
//  Firebase Console → Project Settings → General
//  → "Your apps" → Web app → Config snippet
//
//  This file uses Vite environment variables (import.meta.env.VITE_*).
//  The actual frontend/js/config.js does NOT need to be edited —
//  credentials are loaded from the .env file at build time by Vite.
// ============================================================

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const supabaseConfig = {
  url:     import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
