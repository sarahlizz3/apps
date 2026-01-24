// ========================================
// FIREBASE CONFIGURATION
// ========================================

const firebaseConfig = {
    apiKey: "AIzaSyBMeSGxyNIkNBEhvh-zu81TsRyEEV26WQ4",
    authDomain: "personal-apps-f875f.firebaseapp.com",
    projectId: "personal-apps-f875f",
    storageBucket: "personal-apps-f875f.firebasestorage.app",
    messagingSenderId: "999017761148",
    appId: "1:999017761148:web:ed8e2524e39053b0cdfcf9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (optional but helpful)
db.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab
        console.log('Persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // Browser doesn't support persistence
        console.log('Persistence not supported by browser');
    }
});
