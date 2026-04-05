// Firestore file & folder metadata manager
// Uses the global `firebase` object loaded via CDN compat in HTML

export class FileManager {
  constructor(userId, userEmail = '') {
    this.userId      = userId;
    this.userEmail   = String(userEmail || '').trim().toLowerCase();
    this.db          = firebase.firestore();
    this.col         = this.db.collection('files');
  }

  // ── Helpers ──────────────────────────────────────────────
  getCreatedAtMs(item) {
    const v = item?.createdAt;
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate   === 'function') return v.toDate().getTime();
    const p = new Date(v).getTime();
    return Number.isNaN(p) ? 0 : p;
  }

  mapAndSortDocs(snapshot) {
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Folders first, then files — both sorted newest first
    const folders = docs.filter((d) => d.type === 'folder').sort((a,b) => a.name.localeCompare(b.name));
    const files   = docs.filter((d) => d.type !== 'folder').sort((a,b) => this.getCreatedAtMs(b) - this.getCreatedAtMs(a));
    return [...folders, ...files];
  }

  isIndexOrOrderError(error) {
    const msg = String(error?.message || '').toLowerCase();
    return error?.code === 'failed-precondition' || msg.includes('index') || msg.includes('order by');
  }

  listenWithFallback(primaryQF, fallbackQF, callback, onError, options = {}) {
    const emit = (snap) => {
      let items = this.mapAndSortDocs(snap);
      if (typeof options.limit === 'number') items = items.slice(0, options.limit);
      callback(items);
    };

    let fallbackUnsub = null;
    const primaryUnsub = primaryQF().onSnapshot(emit, (error) => {
      if (fallbackQF && this.isIndexOrOrderError(error)) {
        fallbackUnsub = fallbackQF().onSnapshot(emit, (fe) => { if (onError) onError(fe); });
        return;
      }
      if (onError) onError(error);
    });

    return () => {
      if (typeof primaryUnsub  === 'function') primaryUnsub();
      if (typeof fallbackUnsub === 'function') fallbackUnsub();
    };
  }

  // ── Folder CRUD ───────────────────────────────────────────
  /**
   * Create a new folder in Firestore.
   * @param {string}      name      - Folder name
   * @param {string|null} parentId  - Parent folder id (null = root)
   */
  async createFolder(name, parentId = null) {
    const data = {
      name:       String(name).trim(),
      type:       'folder',
      ownerId:    this.userId,
      ownerEmail: this.userEmail,
      parentId:   parentId,
      starred:    false,
      trashed:    false,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await this.col.add(data);
    return ref.id;
  }

  // ── File CRUD ─────────────────────────────────────────────
  /**
   * Add file metadata after a successful Storage upload.
   * @param {object}      fileData
   * @param {string|null} parentId - Folder to place file in (null = root)
   */
  async addFileMetadata(fileData, parentId = null) {
    const metadata = {
      name:        fileData.name,
      size:        fileData.size,
      type:        fileData.type || 'application/octet-stream',
      storagePath: fileData.storagePath,
      storageUrl:  fileData.storageUrl,
      ownerId:     this.userId,
      ownerEmail:  fileData.ownerEmail || '',
      parentId:    parentId,
      sharedWith:  [],
      starred:     false,
      trashed:     false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await this.col.add(metadata);
    return ref.id;
  }

  // ── Listeners ────────────────────────────────────────────
  /**
   * Listen to the contents of a folder (files + sub-folders).
   * parentId = null → show root items.
   */
  listenMyFiles(callback, onError, parentId = null) {
    return this.listenWithFallback(
      () => this.col
        .where('ownerId',  '==', this.userId)
        .where('trashed',  '==', false)
        .where('parentId', '==', parentId)
        .orderBy('createdAt', 'desc'),
      () => this.col
        .where('ownerId',  '==', this.userId)
        .where('trashed',  '==', false)
        .where('parentId', '==', parentId),
      callback,
      onError
    );
  }

  listenSharedWithMe(callback, onError) {
    const who = this.userEmail || this.userId;
    return this.listenWithFallback(
      () => this.col
        .where('sharedWith', 'array-contains', who)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc'),
      () => this.col
        .where('sharedWith', 'array-contains', who)
        .where('trashed', '==', false),
      callback,
      onError
    );
  }

  listenStarred(callback, onError) {
    return this.listenWithFallback(
      () => this.col
        .where('ownerId',  '==', this.userId)
        .where('starred',  '==', true)
        .where('trashed',  '==', false)
        .orderBy('createdAt', 'desc'),
      () => this.col
        .where('ownerId', '==', this.userId)
        .where('starred', '==', true)
        .where('trashed', '==', false),
      callback,
      onError
    );
  }

  listenRecent(callback, onError) {
    return this.listenWithFallback(
      () => this.col
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(20),
      () => this.col
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false),
      callback,
      onError,
      { limit: 20 }
    );
  }

  listenTrash(callback, onError) {
    return this.listenWithFallback(
      () => this.col
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', true)
        .orderBy('createdAt', 'desc'),
      () => this.col
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', true),
      callback,
      onError
    );
  }

  // ── Mutations ─────────────────────────────────────────────
  async shareFile(fileId, email) {
    await this.col.doc(fileId).update({
      sharedWith: firebase.firestore.FieldValue.arrayUnion(
        String(email || '').trim().toLowerCase()
      ),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async deleteFile(fileId) {
    await this.col.doc(fileId).update({
      trashed:   true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async restoreFile(fileId) {
    await this.col.doc(fileId).update({
      trashed:   false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async permanentlyDeleteFile(fileId) {
    await this.col.doc(fileId).delete();
  }

  async toggleStar(fileId, starred) {
    await this.col.doc(fileId).update({
      starred,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}
