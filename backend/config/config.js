// ============================================================
//  Backend Firebase Configuration
//
//  Values are read from environment variables at runtime.
//  Set them in backend/.env (see backend/.env.example) or in
//  your deployment platform's environment settings.
// ============================================================

const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
    'Copy backend/.env.example to backend/.env and fill in your Firebase credentials.'
  );
}

export const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
};
