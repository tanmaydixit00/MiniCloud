import { firebaseConfig } from './config.js';
import { StorageManager } from './storage.js';
import { FileManager } from './fileManager.js';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let storageManager;
let fileManager;
let currentFileIdForSharing;
let unsubscribeListener;

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    initializeApp(user);
});

function initializeApp(user) {
    const userEmail = document.querySelector('.user-email');
    const userName = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-profile img');
    
    if (userEmail) userEmail.textContent = user.email;
    if (userName) userName.textContent = user.displayName || user.email;
    if (userAvatar) {
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=667eea&color=fff`;
    }

    storageManager = new StorageManager();
    fileManager = new FileManager(user.uid);
    
    unsubscribeListener = fileManager.listenToFiles(displayFiles);
    
    setupEventListeners();
}

function setupEventListeners() {
    
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        if (unsubscribeListener) unsubscribeListener();
        await auth.signOut();
    });

    const fileInput = document.getElementById('fileInput');
    fileInput?.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    const uploadZone = document.getElementById('uploadZone');
    
    uploadZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary)';
        uploadZone.style.background = 'rgba(102, 126, 234, 0.1)';
    });

    uploadZone?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        uploadZone.style.background = 'rgba(26, 26, 46, 0.5)';
    });

    uploadZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        uploadZone.style.background = 'rgba(26, 26, 46, 0.5)';
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    const searchInput = document.querySelector('.search-bar input');
    let searchTimeout;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const searchTerm = e.target.value.trim();
            if (searchTerm) {
                const results = await fileManager.searchFiles(searchTerm);
                displayFiles(results);
            } else {
                const files = await fileManager.getUserFiles();
                displayFiles(files);
            }
        }, 300);
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            const filesList = document.getElementById('filesList');
            
            if (view === 'list') {
                filesList.classList.remove('files-grid');
                filesList.classList.add('files-list');
            } else {
                filesList.classList.remove('files-list');
                filesList.classList.add('files-grid');
            }
        });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.textContent.toLowerCase();
            const files = await fileManager.getUserFiles();
            
            if (filter === 'all') {
                displayFiles(files);
            } else {
                const filtered = files.filter(file => {
                    const type = file.type.toLowerCase();
                    if (filter === 'documents') {
                        return type.includes('pdf') || type.includes('word') || type.includes('document') || type.includes('text');
                    } else if (filter === 'images') {
                        return type.includes('image');
                    } else if (filter === 'videos') {
                        return type.includes('video');
                    }
                    return true;
                });
                displayFiles(filtered);
            }
        });
    });

    // Modal close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeShareModal);
    });

    document.querySelector('.modal-overlay')?.addEventListener('click', closeShareModal);

    // Share file button in modal
    document.getElementById('shareFileBtn')?.addEventListener('click', handleShareFile);
}

// Handle file uploads
async function handleFiles(files) {
    if (files.length === 0) return;

    const progressDiv = document.getElementById('uploadProgress');
    const user = auth.currentUser;
    
    progressDiv.innerHTML = `
        <div style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Uploading ${files.length} file(s)...</span>
                <span id="uploadPercent">0%</span>
            </div>
            <div style="height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden;">
                <div id="uploadBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--primary), var(--accent)); transition: width 0.3s;"></div>
            </div>
        </div>
    `;

    try {
        let completed = 0;
        const total = files.length;

        for (let file of files) {
            // Upload to Supabase
            const { path, url } = await storageManager.uploadFile(
                file, 
                user.uid,
                (progress) => {
                    const overallProgress = ((completed + (progress / 100)) / total) * 100;
                    updateUploadProgress(overallProgress);
                }
            );
            
            // Save metadata to Firestore
            await fileManager.addFileMetadata({
                name: file.name,
                size: file.size,
                type: file.type,
                storagePath: path,
                storageUrl: url,
                ownerEmail: user.email
            });

            completed++;
            updateUploadProgress((completed / total) * 100);
        }

        progressDiv.innerHTML = `
            <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); border-radius: var(--radius-sm); color: var(--success);">
                <i class="fas fa-check-circle"></i> Upload complete!
            </div>
        `;
        
        // Clear file input
        document.getElementById('fileInput').value = '';
        
        setTimeout(() => {
            progressDiv.innerHTML = '';
        }, 3000);
    } catch (error) {
        console.error('Upload error:', error);
        progressDiv.innerHTML = `
            <div style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger);">
                <i class="fas fa-exclamation-circle"></i> Upload failed: ${error.message}
            </div>
        `;
    }
}

function updateUploadProgress(percent) {
    const uploadBar = document.getElementById('uploadBar');
    const uploadPercent = document.getElementById('uploadPercent');
    
    if (uploadBar) uploadBar.style.width = percent + '%';
    if (uploadPercent) uploadPercent.textContent = Math.round(percent) + '%';
}

// Display files in the UI
function displayFiles(files) {
    const filesList = document.getElementById('filesList');
    
    if (!filesList) return;
    
    if (files.length === 0) {
        filesList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fas fa-folder-open" style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p style="font-size: 18px;">No files yet</p>
                <p style="font-size: 14px; margin-top: 8px;">Upload some files to get started!</p>
            </div>
        `;
        return;
    }

    filesList.innerHTML = files.map(file => `
        <div class="file-card" data-file-id="${file.id}">
            <div class="file-icon ${storageManager.getFileIcon(file.name)}">
                <i class="fas ${storageManager.getFontAwesomeIcon(file.name)}"></i>
            </div>
            <div class="file-details">
                <h3 title="${file.name}">${file.name}</h3>
                <p class="file-meta">
                    <span>${formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>${formatDate(file.createdAt)}</span>
                </p>
                ${file.sharedWith && file.sharedWith.length > 0 ? `
                    <div class="shared-badge">
                        <i class="fas fa-users"></i>
                        Shared with ${file.sharedWith.length} ${file.sharedWith.length === 1 ? 'person' : 'people'}
                    </div>
                ` : ''}
            </div>
            <div class="file-actions">
                <button class="action-btn" onclick="viewFile('${file.storageUrl}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="openShareModal('${file.id}')" title="Share">
                    <i class="fas fa-share-nodes"></i>
                </button>
                <button class="action-btn" onclick="downloadFile('${file.storagePath}', '${file.name}')" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="action-btn delete" onclick="deleteFile('${file.id}', '${file.storagePath}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// View file in new tab
window.viewFile = (url) => {
    window.open(url, '_blank');
};

// Download file
window.downloadFile = async (filePath, fileName) => {
    try {
        const blob = await storageManager.downloadFile(filePath);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('File downloaded successfully!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Failed to download file', 'error');
    }
};

// Delete file
window.deleteFile = async (fileId, storagePath) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
        return;
    }

    try {
        // Delete from Supabase Storage
        await storageManager.deleteFile(storagePath);
        
        // Delete metadata from Firestore
        await fileManager.deleteFile(fileId);
        
        showNotification('File deleted successfully!', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete file: ' + error.message, 'error');
    }
};

// Open share modal
window.openShareModal = (fileId) => {
    currentFileIdForSharing = fileId;
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.style.display = 'block';
        setTimeout(() => modal.classList.add('active'), 10);
    }
};

// Close share modal
function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    document.getElementById('shareEmail').value = '';
}

// Handle file sharing
async function handleShareFile() {
    const email = document.getElementById('shareEmail').value.trim();
    
    if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    try {
        await fileManager.shareFile(currentFileIdForSharing, email);
        showNotification(`File shared with ${email}!`, 'success');
        closeShareModal();
    } catch (error) {
        console.error('Share error:', error);
        showNotification('Failed to share file: ' + error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 16px 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    const color = type === 'success' ? 'var(--success)' : 
                  type === 'error' ? 'var(--danger)' : 'var(--info)';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas ${icon}" style="color: ${color}; font-size: 20px;"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Utility: Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Utility: Format date
function formatDate(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);
