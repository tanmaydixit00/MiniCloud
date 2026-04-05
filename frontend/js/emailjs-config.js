// ============================================================
//  EmailJS Configuration
//
//  Setup:
//    1. Sign up at https://www.emailjs.com/ (free, 200 emails/month)
//    2. Add Email Service → Connect Gmail
//    3. Create Email Template with variables:
//       {{from_name}}, {{from_email}}, {{file_name}}, {{download_link}}
//    4. Replace the placeholder values below
// ============================================================

function env(key, fallback = '') {
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    const viteKey = `VITE_EMAILJS_${key}` in process.env
      ? `VITE_EMAILJS_${key}`
      : `VITE_${key}` in process.env
        ? `VITE_${key}`
        : null;
    if (viteKey && process.env[viteKey]) return process.env[viteKey];
  }
  return fallback;
}

export const emailjsConfig = {
  publicKey:  env('PUBLIC_KEY',  'YOUR_EMAILJS_PUBLIC_KEY'),
  serviceId:  env('SERVICE_ID',  'YOUR_EMAILJS_SERVICE_ID'),
  templateId: env('TEMPLATE_ID', 'YOUR_EMAILJS_TEMPLATE_ID'),
};
