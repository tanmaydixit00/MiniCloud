const db = firebase.firestore();

export class FileManager {
  constructor(userId) {
    this.userId = userId;
    this.filesCollection = db.collection("files");
  }

  async addFileMetadata(fileData) {
    const metadata = {
      name: fileData.name,
      size: fileData.size,
      type: fileData.type || "application/octet-stream",
      storagePath: fileData.storagePath,
      storageUrl: fileData.storageUrl,
      ownerId: this.userId,
      ownerEmail: fileData.ownerEmail || "",
      sharedWith: [],
      starred: false,
      trashed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await this.filesCollection.add(metadata);
    return docRef.id;
  }

  listenMyFiles(callback) {
    return this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("trashed", "==", false)
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(this._mapSnap(snap)));
  }

  listenSharedWithMe(callback) {
    const email = firebase.auth().currentUser?.email;
    if (!email) return () => {};
    return this.filesCollection
      .where("sharedWith", "array-contains", email)
      .where("trashed", "==", false)
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(this._mapSnap(snap)));
  }

  listenStarred(callback) {
    return this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("starred", "==", true)
      .where("trashed", "==", false)
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(this._mapSnap(snap)));
  }

  listenRecent(callback) {
    // same as my-files for now (simple recent)
    return this.listenMyFiles(callback);
  }

  listenTrash(callback) {
    return this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("trashed", "==", true)
      .orderBy("updatedAt", "desc")
      .onSnapshot((snap) => callback(this._mapSnap(snap)));
  }

  _mapSnap(snapshot) {
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate?.() || null,
        updatedAt: d.updatedAt?.toDate?.() || null
      };
    });
  }
}
