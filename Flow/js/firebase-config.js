/* ============================================
   Firebase Configuration
   Using compat SDK for browser (no build step needed)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBMeSGxyNIkNBEhvh-zu81TsRyEEV26WQ4",
  authDomain: "personal-apps-f875f.firebaseapp.com",
  projectId: "personal-apps-f875f",
  storageBucket: "personal-apps-f875f.firebasestorage.app",
  messagingSenderId: "999017761148",
  appId: "1:999017761148:web:f1963b877857e6b9cdfcf9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get service references
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence unavailable: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  });

console.log('Firebase initialized');
