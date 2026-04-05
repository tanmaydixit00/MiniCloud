// ============================================================
//  Supabase Configuration
//
//  Priority order for value resolution:
//    1. window.__ENV__  — injected at deploy time
//    2. process.env.*  — available in bundler environments
//    3. Hardcoded defaults — replace with your own project values
// ============================================================

function env(key, fallback = '') {
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    const viteKey = `VITE_SUPABASE_${key}` in process.env
      ? `VITE_SUPABASE_${key}`
      : `VITE_${key}` in process.env
        ? `VITE_${key}`
        : null;
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
  }
  return fallback;
}

export const supabaseConfig = {
  url:    env('URL',    'https://YOUR_PROJECT_ID.supabase.co'),
  key:    env('KEY',    'YOUR_SUPABASE_ANON_KEY'),
  bucket: env('BUCKET', 'files'),
};
