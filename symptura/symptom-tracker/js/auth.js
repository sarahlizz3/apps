// ========================================
// AUTHENTICATION MODULE
// ========================================

const Auth = {
    currentUser: null,

    // Initialize auth state listener
    init() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.onSignIn(user);
            } else {
                this.onSignOut();
            }
        });

        // Bind event listeners
        document.getElementById('sign-in-btn').addEventListener('click', () => this.signIn());
        document.getElementById('sign-out-btn').addEventListener('click', () => this.signOut());

        // Handle enter key in auth form
        document.getElementById('auth-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.signIn();
            }
        });
    },

    // Show error message
    showError(message) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = message;
        errorEl.hidden = false;
    },

    // Hide error message
    hideError() {
        document.getElementById('auth-error').hidden = true;
    },

    // Get form values
    getFormValues() {
        return {
            email: document.getElementById('auth-email').value.trim(),
            password: document.getElementById('auth-password').value
        };
    },

    // Validate form
    validateForm() {
        const { email, password } = this.getFormValues();
        
        if (!email) {
            this.showError('Please enter your email address.');
            return false;
        }
        
        if (!password) {
            this.showError('Please enter your password.');
            return false;
        }
        
        return true;
    },

    // Sign in with email/password
    async signIn() {
        this.hideError();
        
        if (!this.validateForm()) return;
        
        const { email, password } = this.getFormValues();
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Sign in error:', error);
            this.showError(this.getErrorMessage(error.code));
        }
    },

    // Sign out
    async signOut() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    },

    // Handle successful sign in
    onSignIn(user) {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        
        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        this.hideError();
        
        // Initialize app data
        App.init();
    },

    // Handle sign out
    onSignOut() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-container').classList.add('hidden');
        
        // Clear app data
        App.clearData();
    },

    // Get user-friendly error message
    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Invalid email address format.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/network-request-failed': 'Network error. Check your connection.',
            'auth/too-many-requests': 'Too many attempts. Try again later.',
            'auth/invalid-credential': 'Invalid email or password.'
        };
        
        return messages[code] || 'An error occurred. Please try again.';
    }
};

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
