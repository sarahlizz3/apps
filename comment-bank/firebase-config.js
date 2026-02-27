const firebaseConfig = {
  apiKey: "AIzaSyBMeSGxyNIkNBEhvh-zu81TsRyEEV26WQ4",
  authDomain: "personal-apps-f875f.firebaseapp.com",
  projectId: "personal-apps-f875f",
  storageBucket: "personal-apps-f875f.firebasestorage.app",
  messagingSenderId: "999017761148",
  appId: "YOUR_APP_ID_HERE"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence unavailable: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  });
