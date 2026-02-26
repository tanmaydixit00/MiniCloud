import { firebaseConfig } from './config.js';

const db = firebase.firestore();

export class FileManager {
    constructor(userId) {
        this.userId = userId;
        this.filesCollection = db.collection('files');
    }

    async addFileMetadata(fileData) {
        try {
            const metadata = {
                name: fileData.name,
                size: fileData.size,
                type: fileData.type || 'application/octet-stream',
                storagePath: fileData.storagePath,
                storageUrl: fileData.storageUrl,
                ownerId: this.userId,
                ownerEmail: fileData.ownerEmail || '',
                sharedWith: [],
                starred: false,
                trashed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.filesCollection.add(metadata);
            return docRef.id;
        } catch (error) {
            console.error('Error adding file metadata:', error);
            throw new Error(`Failed to save file metadata: ${error.message}`);
        }
    }

    async getUserFiles() {
        try {
            const snapshot = await this.filesCollection
                .where('ownerId', '==', this.userId)
                .where('trashed', '==', false)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error('Error getting user files:', error);
            throw new Error(`Failed to get files: ${error.message}`);
        }
    }

    async getSharedFiles() {
        try {
            const userEmail = firebase.auth().currentUser?.email;
            if (!userEmail) return [];

            const snapshot = await this.filesCollection
                .where('sharedWith', 'array-contains', userEmail)
                .where('trashed', '==', false)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error('Error getting shared files:', error);
            throw new Error(`Failed to get shared files: ${error.message}`);
        }
    }
    async getStarredFiles() {
        try {
            const snapshot = await this.filesCollection
                .where('ownerId', '==', this.userId)
                .where('starred', '==', true)
                .where('trashed', '==', false)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error('Error getting starred files:', error);
            return [];
        }
    }

    async getTrashedFiles() {
        try {
            const snapshot = await this.filesCollection
                .where('ownerId', '==', this.userId)
                .where('trashed', '==', true)
                .orderBy('updatedAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
        } catch (error) {
            console.error('Error getting trashed files:', error);
            return [];
        }
    }

    async deleteFile(fileId) {
        try {
            await this.filesCollection.doc(fileId).delete();
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    }

    
    async moveToTrash(fileId) {
        try {
            await this.filesCollection.doc(fileId).update({
                trashed: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error moving to trash:', error);
            throw new Error(`Failed to move file to trash: ${error.message}`);
        }
    }

    
    async restoreFromTrash(fileId) {
        try {
            await this.filesCollection.doc(fileId).update({
                trashed: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error restoring file:', error);
            throw new Error(`Failed to restore file: ${error.message}`);
        }
    }

    
    async toggleStar(fileId, starred) {
        try {
            await this.filesCollection.doc(fileId).update({
                starred: starred,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error toggling star:', error);
            throw new Error(`Failed to update file: ${error.message}`);
        }
    }

    async shareFile(fileId, userEmail) {
        try {
            await this.filesCollection.doc(fileId).update({
                sharedWith: firebase.firestore.FieldValue.arrayUnion(userEmail),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error sharing file:', error);
            throw new Error(`Failed to share file: ${error.message}`);
        }
    }

    async unshareFile(fileId, userEmail) {
        try {
            await this.filesCollection.doc(fileId).update({
                sharedWith: firebase.firestore.FieldValue.arrayRemove(userEmail),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error unsharing file:', error);
            throw new Error(`Failed to unshare file: ${error.message}`);
        }
    }
    listenToFiles(callback) {
        return this.filesCollection
            .where('ownerId', '==', this.userId)
            .where('trashed', '==', false)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const files = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
                callback(files);
            }, error => {
                console.error('Listener error:', error);
            });
    }

    async searchFiles(searchTerm) {
        try {
            const snapshot = await this.filesCollection
                .where('ownerId', '==', this.userId)
                .where('trashed', '==', false)
                .get();

            const files = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                }))
                .filter(file => 
                    file.name.toLowerCase().includes(searchTerm.toLowerCase())
                );

            return files;
        } catch (error) {
            console.error('Error searching files:', error);
            return [];
        }
    }
}
