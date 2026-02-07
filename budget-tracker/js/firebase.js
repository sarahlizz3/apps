/**
 * Firebase Configuration and Authentication
 */
const FirebaseApp = (function() {
    // Firebase config
    const firebaseConfig = {
        apiKey: "AIzaSyBMeSGxyNIkNBEhvh-zu81TsRyEEV26WQ4",
        authDomain: "personal-apps-f875f.firebaseapp.com",
        projectId: "personal-apps-f875f",
        storageBucket: "personal-apps-f875f.firebasestorage.app",
        messagingSenderId: "999017761148",
        appId: "1:999017761148:web:f1963b877857e6b9cdfcf9"
    };

    let app = null;
    let auth = null;
    let db = null;
    let currentUser = null;

    function init() {
        // Initialize Firebase
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // Enable offline persistence
        db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore persistence failed: multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore persistence not supported by browser');
                }
            });

        return new Promise((resolve) => {
            // Listen for auth state changes
            auth.onAuthStateChanged((user) => {
                currentUser = user;
                if (user) {
                    console.log('User signed in:', user.email);
                    document.getElementById('login-screen').classList.add('hidden');
                    document.getElementById('app-content').classList.remove('hidden');
                    // Initialize app after auth
                    if (typeof App !== 'undefined' && App.onAuthReady) {
                        App.onAuthReady();
                    }
                } else {
                    console.log('User signed out');
                    document.getElementById('login-screen').classList.remove('hidden');
                    document.getElementById('app-content').classList.add('hidden');
                }
                resolve(user);
            });
        });
    }

    function signIn(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    }

    function signOut() {
        return auth.signOut();
    }

    function getUser() {
        return currentUser;
    }

    function getUserId() {
        return currentUser ? currentUser.uid : null;
    }

    function getDb() {
        return db;
    }

    function isAuthenticated() {
        return currentUser !== null;
    }

    return {
        init,
        signIn,
        signOut,
        getUser,
        getUserId,
        getDb,
        isAuthenticated
    };
})();
