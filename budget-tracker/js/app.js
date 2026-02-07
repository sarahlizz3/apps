/**
 * Main App - Initialization and routing
 */
const App = (function() {
    let currentScreen = 'entry';
    let confirmCallback = null;

    // Swipe detection utility
    function enableSwipe(element, onSwipeLeft, onSwipeRight) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const minSwipeDistance = 50;
        const maxVerticalDistance = 100;

        element.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            // Only trigger if horizontal swipe is significant and vertical movement is small
            if (Math.abs(deltaX) > minSwipeDistance && deltaY < maxVerticalDistance) {
                if (deltaX > 0 && onSwipeRight) {
                    onSwipeRight();
                } else if (deltaX < 0 && onSwipeLeft) {
                    onSwipeLeft();
                }
            }
        }
    }

    function init() {
        // Initialize Firebase first
        FirebaseApp.init();

        // Set up login form
        setupLogin();

        // Check online status
        setupOnlineStatus();

        // Register service worker
        registerServiceWorker();
    }

    function setupLogin() {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            loginError.classList.add('hidden');

            try {
                await FirebaseApp.signIn(email, password);
            } catch (error) {
                loginError.textContent = getAuthErrorMessage(error.code);
                loginError.classList.remove('hidden');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', async () => {
            Storage.stopListeners();
            await FirebaseApp.signOut();
        });
    }

    function getAuthErrorMessage(code) {
        switch (code) {
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Try again later.';
            default:
                return 'Sign in failed. Please try again.';
        }
    }

    // Called when user is authenticated
    function onAuthReady() {
        // Initialize UI modules
        EntryUI.init();
        SummaryUI.init();
        ChartsUI.init();
        GlanceUI.init();
        SettingsUI.init();

        // Set up routing
        setupRouting();

        // Set up modal handlers
        setupModals();

        // Initialize real-time listeners
        Storage.initListeners();

        // Handle initial route
        handleRoute();

        // Display user email
        const user = FirebaseApp.getUser();
        if (user) {
            document.getElementById('user-email').textContent = user.email;
        }
    }

    // Called when data changes from Firestore
    function onDataChange() {
        // Re-render current screen
        renderScreen(currentScreen);
    }

    function setupRouting() {
        window.addEventListener('hashchange', handleRoute);

        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const screen = item.dataset.screen;
                if (screen) {
                    // Hash will trigger handleRoute
                }
            });
        });
    }

    function handleRoute() {
        const hash = window.location.hash.slice(1) || 'entry';
        navigateTo(hash);
    }

    function navigateTo(screen) {
        // Validate screen
        const validScreens = ['entry', 'summary', 'charts', 'glance', 'settings'];
        if (!validScreens.includes(screen)) {
            screen = 'entry';
        }

        currentScreen = screen;

        // Update screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screenEl = document.getElementById(`screen-${screen}`);
        if (screenEl) {
            screenEl.classList.add('active');
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screen);
        });

        // Render screen content
        renderScreen(screen);
    }

    function renderScreen(screen) {
        switch (screen) {
            case 'entry':
                EntryUI.render();
                break;
            case 'summary':
                SummaryUI.render();
                break;
            case 'charts':
                ChartsUI.render();
                break;
            case 'glance':
                GlanceUI.render();
                break;
            case 'settings':
                SettingsUI.render();
                break;
        }
    }

    function setupModals() {
        const overlay = document.getElementById('modal-overlay');

        // Close modal on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Confirm modal buttons
        document.getElementById('confirm-cancel-btn').addEventListener('click', closeModal);
        document.getElementById('confirm-ok-btn').addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
                confirmCallback = null;
            }
            closeModal();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    function openModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);

        // Hide all modals first
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        // Focus first input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        confirmCallback = null;
    }

    function showConfirm(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        confirmCallback = callback;
        openModal('confirm-modal');
    }

    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) {
            existing.remove();
        }

        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('visible'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    function setupOnlineStatus() {
        const indicator = document.getElementById('offline-indicator');

        function updateStatus() {
            indicator.classList.toggle('hidden', navigator.onLine);
        }

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registered:', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }
    }

    // Public API
    return {
        init,
        navigateTo,
        openModal,
        closeModal,
        showConfirm,
        showToast,
        enableSwipe,
        onAuthReady,
        onDataChange
    };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
