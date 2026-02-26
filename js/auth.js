import { firebaseConfig } from './config.js';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(targetTab + 'Form').classList.add('active');
        
        document.getElementById('authError').style.display = 'none';
    });
});

document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

const signupPassword = document.getElementById('signupPassword');
if (signupPassword) {
    signupPassword.addEventListener('input', (e) => {
        const password = e.target.value;
        const strengthBar = document.querySelector('.strength-bar');
        
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.match(/[a-z]+/)) strength += 25;
        if (password.match(/[A-Z]+/)) strength += 25;
        if (password.match(/[0-9]+/) || password.match(/[^a-zA-Z0-9]+/)) strength += 25;
        
        strengthBar.style.width = strength + '%';
    });
}

function showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        
        await auth.signInWithEmailAndPassword(email, password);
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Login error:', error);
        showError(getErrorMessage(error.code));
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Your Account';
    }
});

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Validate password strength
    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await userCredential.user.updateProfile({
            displayName: name
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        showError(getErrorMessage(error.code));
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
});

document.querySelectorAll('.social-btn.google').forEach(btn => {
    btn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Google sign in error:', error);
            showError(getErrorMessage(error.code));
        }
    });
});

document.querySelectorAll('.social-btn.github').forEach(btn => {
    btn.addEventListener('click', async () => {
        const provider = new firebase.auth.GithubAuthProvider();
        
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('GitHub sign in error:', error);
            showError(getErrorMessage(error.code));
        }
    });
});
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
