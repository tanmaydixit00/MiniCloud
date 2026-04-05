// ============================================================
//  Email Notification Service (EmailJS)
// ============================================================
import { emailjsConfig } from './emailjs-config.js';

let initialized = false;

function init() {
  if (initialized) return;
  if (!window.emailjs) {
    throw new Error('EmailJS SDK not loaded.');
  }
  window.emailjs.init(emailjsConfig.publicKey);
  initialized = true;
}

/**
 * Send a share notification email
 * @param {object} params
 * @param {string} params.toEmail       - Recipient email
 * @param {string} params.fromName      - Sharer's display name
 * @param {string} params.fromEmail     - Sharer's email
 * @param {string} params.fileName      - Name of shared file
 * @param {string} params.downloadLink  - Public download URL
 */
export async function sendShareEmail({ toEmail, fromName, fromEmail, fileName, downloadLink }) {
  init();

  if (emailjsConfig.publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
    // EmailJS not configured — skip silently, share still works in Firestore
    return false;
  }

  const templateParams = {
    to_email: toEmail,
    from_name: fromName,
    from_email: fromEmail,
    file_name: fileName,
    download_link: downloadLink,
  };

  const response = await window.emailjs.send(
    emailjsConfig.serviceId,
    emailjsConfig.templateId,
    templateParams
  );

  return response.status === 200;
}
