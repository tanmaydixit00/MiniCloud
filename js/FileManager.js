fileManager.js

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

  async getUserFiles() {
    const snapshot = await this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("trashed", "==", false)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null
    }));
  }

  async searchFiles(searchTerm) {

    const snapshot = await this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("trashed", "==", false)
      .get();

    const term = (searchTerm || "").toLowerCase();
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      }))
      .filter((f) => (f.name || "").toLowerCase().includes(term));
  }

  async deleteFile(fileId) {
    await this.filesCollection.doc(fileId).delete();
  }

  async shareFile(fileId, userEmail) {
    await this.filesCollection.doc(fileId).update({
      sharedWith: firebase.firestore.FieldValue.arrayUnion(userEmail),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  listenToFiles(callback) {
    return this.filesCollection
      .where("ownerId", "==", this.userId)
      .where("trashed", "==", false)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const files = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null
          }));
          callback(files);
        },
        (error) => console.error("Firestore listener error:", error)
      );
  }
}
