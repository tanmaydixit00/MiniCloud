// ============================================================
//  Supabase Configuration — EXAMPLE / TEMPLATE
//
//  HOW TO USE:
//  1. Sign up at: https://supabase.com
//  2. Create a new project
//  3. Get credentials from: Settings → API
//  4. Copy your values below
//  5. This file is used by supabase-storage.js
//
//  WHERE TO FIND THESE VALUES:
//  Supabase Console → Settings → API
//  - Project URL: "Your API URL"
//  - API Key: "anon/public"
// ============================================================

export const supabaseConfig = {
  // Your Supabase Project URL
  // Example: https://abcdefghijk.supabase.co
  url: "https://YOUR_PROJECT_URL.supabase.co",
  
  // Your anon/public API Key (not the service role key!)
  // Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  anonKey: "YOUR_ANON_KEY_HERE",
};

// Storage bucket name (this is the bucket we created in Step 3)
export const STORAGE_BUCKET = "files";
