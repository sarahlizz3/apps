/* ============================================
   Authentication Module
   ============================================ */

const Auth = {
  currentUser: null,
  loginContainer: null,
  appContainer: null,
  loadingSpinner: null,
  onAuthReady: null,

  init() {
    this.loginContainer = document.getElementById('login-container');
    this.appContainer = document.getElementById('app-container');
    this.loadingSpinner = document.getElementById('loading-spinner');
    
    // Set up auth state listener
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      
      // Hide loading spinner
      this.loadingSpinner.classList.add('hidden');
      
      if (user) {
        console.log('User signed in:', user.email);
        this.showApp();
        if (this.onAuthReady) {
          this.onAuthReady(user);
        }
      } else {
        console.log('No user signed in');
        this.showLogin();
      }
    });

    // Set up login form
    this.setupLoginForm();
  },

  setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      
      // Clear previous errors
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      
      // Disable button while processing
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle the transition
      } catch (error) {
        console.error('Login error:', error);
        
        // User-friendly error messages
        let message = 'Unable to sign in. Please try again.';
        switch (error.code) {
          case 'auth/invalid-email':
            message = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
            message = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            message = 'Incorrect password.';
            break;
          case 'auth/invalid-credential':
            message = 'Invalid email or password.';
            break;
          case 'auth/too-many-requests':
            message = 'Too many attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            message = 'Network error. Check your connection.';
            break;
        }
        
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  },

  showLogin() {
    this.loginContainer.classList.remove('hidden');
    this.appContainer.classList.add('hidden');
    
    // Clear password field
    document.getElementById('login-password').value = '';
    
    // Focus email input
    setTimeout(() => {
      document.getElementById('login-email').focus();
    }, 100);
  },

  showApp() {
    this.loginContainer.classList.add('hidden');
    this.appContainer.classList.remove('hidden');
  },

  async signOut() {
    try {
      await auth.signOut();
      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  getUserId() {
    return this.currentUser?.uid || null;
  },

  getUserEmail() {
    return this.currentUser?.email || null;
  }
};
