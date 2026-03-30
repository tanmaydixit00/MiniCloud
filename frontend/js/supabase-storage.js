// ============================================================
//  Supabase Storage Manager
//
//  Handles file uploads/downloads using Supabase Storage
//  Requires supabase-config.js with URL and anonKey
// ============================================================

import { supabaseConfig, STORAGE_BUCKET } from './supabase-config.js';

// Import Supabase client
// CDN-based approach for browser compatibility
async function getSupabaseClient() {
  // Check if Supabase is already loaded
  if (window.supabaseClient) return window.supabaseClient;

  // Load Supabase from CDN
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize Supabase client
  window.supabaseClient = window.supabase.createClient(
    supabaseConfig.url,
    supabaseConfig.anonKey
  );

  console.log('[Supabase] Client initialized');
  return window.supabaseClient;
}

export class StorageManager {
  constructor() {
    this.client = null;
    this.ready = false;
  }

  async ensureReady() {
    if (this.ready) return;

    try {
      this.client = await getSupabaseClient();
      console.log('[StorageManager] Supabase client ready');
      this.ready = true;
    } catch (error) {
      console.error('[StorageManager] Failed to initialize Supabase:', error);
      throw new Error('Failed to initialize storage. Check your Supabase credentials.');
    }
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Upload a file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} userId - User ID (used for folder path)
   * @param {Function} onProgress - Progress callback (percentage: 0-100)
   * @returns {Promise<{path: string, url: string}>}
   */
  async uploadFile(file, userId, onProgress) {
    await this.ensureReady();

    const safeName = this.sanitizeFilename(file.name);
    const filePath = `${userId}/${Date.now()}_${safeName}`;

    try {
      console.log('[StorageManager] Starting upload:', { filePath, size: file.size });

      // For progress tracking, we'll simulate it since Supabase doesn't provide granular progress
      if (onProgress) onProgress(10);

      // Upload file to Supabase Storage
      const { data, error } = await this.client.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('[StorageManager] Upload error:', error);
        throw error;
      }

      if (onProgress) onProgress(80);

      // Get public URL
      const { data: publicData } = this.client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      const url = publicData?.publicUrl;
      if (!url) {
        throw new Error('Failed to get download URL');
      }

      if (onProgress) onProgress(100);

      console.log('[StorageManager] Upload successful:', { path: filePath, url });
      return { path: filePath, url };
    } catch (error) {
      console.error('[StorageManager] Upload failed:', error);
      const err = new Error(error.message || 'Failed to upload file');
      err.code = error.code || 'storage/unknown';
      throw err;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param {string} filePath - Path of file to delete (e.g., userId/timestamp_filename)
   */
  async deleteFile(filePath) {
    await this.ensureReady();

    try {
      console.log('[StorageManager] Deleting file:', filePath);
      const { error } = await this.client.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error && error.message !== 'Not found') {
        throw error;
      }

      console.log('[StorageManager] File deleted:', filePath);
    } catch (error) {
      console.error('[StorageManager] Delete failed:', error);
      throw new Error(error.message || 'Failed to delete file');
    }
  }

  /**
   * Download a file from Supabase Storage
   * @param {string} filePath - Path of file to download
   * @returns {Promise<Blob>}
   */
  async downloadFile(filePath) {
    await this.ensureReady();

    try {
      console.log('[StorageManager] Downloading file:', filePath);
      const { data, error } = await this.client.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        throw error;
      }

      console.log('[StorageManager] File downloaded:', filePath);
      return data;
    } catch (error) {
      console.error('[StorageManager] Download failed:', error);
      throw new Error(error.message || 'Failed to download file');
    }
  }

  /**
   * Get public URL for a file
   * @param {string} filePath - Path of file
   * @returns {string} Public URL
   */
  getPublicUrl(filePath) {
    const { data } = this.client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data?.publicUrl || '';
  }

  // ── Icon helpers ────────────────────────────
  getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const iconMap = {
      pdf: 'pdf',
      doc: 'doc',
      docx: 'doc',
      xls: 'excel',
      xlsx: 'excel',
      ppt: 'ppt',
      pptx: 'ppt',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
      mp4: 'video',
      avi: 'video',
      mov: 'video',
      mkv: 'video',
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      txt: 'text',
      csv: 'excel',
    };
    return iconMap[ext] || 'file';
  }

  getFontAwesomeIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const iconMap = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',
      docx: 'fa-file-word',
      xls: 'fa-file-excel',
      xlsx: 'fa-file-excel',
      ppt: 'fa-file-powerpoint',
      pptx: 'fa-file-powerpoint',
      jpg: 'fa-file-image',
      jpeg: 'fa-file-image',
      png: 'fa-file-image',
      gif: 'fa-file-image',
      svg: 'fa-file-image',
      webp: 'fa-file-image',
      mp4: 'fa-file-video',
      avi: 'fa-file-video',
      mov: 'fa-file-video',
      mkv: 'fa-file-video',
      mp3: 'fa-file-audio',
      wav: 'fa-file-audio',
      ogg: 'fa-file-audio',
      zip: 'fa-file-zipper',
      rar: 'fa-file-zipper',
      '7z': 'fa-file-zipper',
      txt: 'fa-file-lines',
      csv: 'fa-file-csv',
      js: 'fa-file-code',
      html: 'fa-file-code',
      css: 'fa-file-code',
      json: 'fa-file-code',
      py: 'fa-file-code',
      ts: 'fa-file-code',
    };
    return iconMap[ext] || 'fa-file';
  }
}
