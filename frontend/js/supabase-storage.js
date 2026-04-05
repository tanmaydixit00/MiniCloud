// ============================================================
//  Supabase Storage Manager
// ============================================================
import { supabaseConfig } from './supabase-config.js';

const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const UPLOAD_TIMEOUT_MS = 30000;

let clientPromise = null;

async function getSupabaseClient() {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SUPABASE_CDN;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load Supabase SDK.'));
        document.head.appendChild(s);
      });
    }
    return window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
  })();

  return clientPromise;
}

export class StorageManager {
  constructor() {
    this.client = null;
  }

  async ensureReady() {
    if (this.client) return;
    this.client = await getSupabaseClient();

    // Pre-flight: verify bucket exists and is reachable
    const { error } = await this.client.storage
      .from(supabaseConfig.bucket)
      .list('__ping__', { limit: 1 });

    if (error && error.message !== 'The resource was not found') {
      if (error.message?.includes('not found') || error.message?.includes('bucket')) {
        throw new Error(`Storage bucket "${supabaseConfig.bucket}" not found. Create it in Supabase Dashboard.`);
      }
      throw new Error(`Storage access error: ${error.message}`);
    }
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Upload a file to Supabase Storage
   * @param {File}     file
   * @param {string}   userId
   * @param {Function} onProgress — called with 0–100
   * @returns {Promise<{path: string, url: string}>}
   */
  async uploadFile(file, userId, onProgress) {
    await this.ensureReady();

    const safeName = this.sanitizeFilename(file.name);
    const filePath = `files/${userId}/${Date.now()}_${safeName}`;

    if (onProgress) onProgress(0);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error('Upload timed out after 30s. Check your connection and try again.');
        err.code = 'storage/timeout';
        reject(err);
      }, UPLOAD_TIMEOUT_MS);
    });

    const uploadPromise = this.client.storage
      .from(supabaseConfig.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      if (error.message?.includes('Duplicate')) {
        const err = new Error('A file with this name already exists.');
        err.code = 'storage/duplicate';
        throw err;
      }
      if (error.message?.includes('Payload')) {
        const err = new Error('File is too large.');
        err.code = 'storage/payload-too-large';
        throw err;
      }
      const err = new Error(`Upload failed: ${error.message}`);
      err.code = 'storage/upload-failed';
      throw err;
    }

    if (onProgress) onProgress(100);

    // Get public URL
    const { data: urlData } = this.client.storage
      .from(supabaseConfig.bucket)
      .getPublicUrl(filePath);

    return { path: filePath, url: urlData.publicUrl };
  }

  /**
   * Delete a file from Supabase Storage
   * @param {string} filePath
   */
  async deleteFile(filePath) {
    await this.ensureReady();
    const { error } = await this.client.storage
      .from(supabaseConfig.bucket)
      .remove([filePath]);

    if (error && !error.message?.includes('not found')) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Download a file as a Blob
   * @param {string} filePath
   * @returns {Promise<Blob>}
   */
  async downloadFile(filePath) {
    await this.ensureReady();
    const { data, error } = await this.client.storage
      .from(supabaseConfig.bucket)
      .download(filePath);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
    return data;
  }

  // ── Icon helpers ──────────────────────────────────────────
  getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      pdf: 'pdf', doc: 'doc', docx: 'doc',
      xls: 'excel', xlsx: 'excel', csv: 'excel',
      ppt: 'ppt', pptx: 'ppt',
      jpg: 'image', jpeg: 'image', png: 'image',
      gif: 'image', svg: 'image', webp: 'image',
      mp4: 'video', avi: 'video', mov: 'video', mkv: 'video',
      mp3: 'audio', wav: 'audio', ogg: 'audio',
      zip: 'archive', rar: 'archive', '7z': 'archive',
      txt: 'text',
    };
    return map[ext] || 'file';
  }

  getFontAwesomeIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',   docx: 'fa-file-word',
      xls: 'fa-file-excel',  xlsx: 'fa-file-excel', csv: 'fa-file-csv',
      ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
      jpg: 'fa-file-image',  jpeg: 'fa-file-image', png: 'fa-file-image',
      gif: 'fa-file-image',  svg: 'fa-file-image',  webp: 'fa-file-image',
      mp4: 'fa-file-video',  avi: 'fa-file-video',  mov: 'fa-file-video', mkv: 'fa-file-video',
      mp3: 'fa-file-audio',  wav: 'fa-file-audio',  ogg: 'fa-file-audio',
      zip: 'fa-file-zipper', rar: 'fa-file-zipper', '7z': 'fa-file-zipper',
      txt: 'fa-file-lines',
      js:  'fa-file-code',   ts: 'fa-file-code',    html: 'fa-file-code',
      css: 'fa-file-code',   json: 'fa-file-code',  py: 'fa-file-code',
    };
    return map[ext] || 'fa-file';
  }
}
