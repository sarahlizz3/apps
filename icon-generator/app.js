// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv2ot1mjNkbJ9brsxLVrG3-_2rnUF2QoY",
  authDomain: "focus-to-do-app-f8b3c.firebaseapp.com",
  projectId: "focus-to-do-app-f8b3c",
  storageBucket: "focus-to-do-app-f8b3c.firebasestorage.app",
  messagingSenderId: "1060856691525",
  appId: "1:1060856691525:web:b9b4eaa50e6b1d00fa5c2c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const emailLoginBtn = document.getElementById('emailLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authSection = document.getElementById('authSection');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const loginPrompt = document.getElementById('loginPrompt');
const mainContent = document.getElementById('mainContent');
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const preview = document.getElementById('preview');
const clearBtn = document.getElementById('clearBtn');
const generateSection = document.getElementById('generateSection');
const generateBtn = document.getElementById('generateBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const resultsSection = document.getElementById('resultsSection');
const iconPreviews = document.getElementById('iconPreviews');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const manifestCode = document.getElementById('manifestCode');
const htmlCode = document.getElementById('htmlCode');

// State
let currentUser = null;
let uploadedImage = null;
let generatedIcons = [];

// Icon sizes needed for web apps
const ICON_SIZES = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' }
];

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        showMainApp(user);
    } else {
        showLoginPrompt();
    }
});

// Show/Hide UI based on auth state
function showMainApp(user) {
    loginPrompt.classList.add('hidden');
    mainContent.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
}

function showLoginPrompt() {
    loginPrompt.classList.remove('hidden');
    mainContent.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    userInfo.classList.add('hidden');
}

// Authentication Handlers
loginBtn.addEventListener('click', () => {
    loginPrompt.scrollIntoView({ behavior: 'smooth' });
});

googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

emailLoginBtn.addEventListener('click', async () => {
    const email = prompt('Enter your email:');
    if (!email) return;
    
    const password = prompt('Enter your password:');
    if (!password) return;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            if (confirm('Account not found. Would you like to create a new account?')) {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                } catch (signUpError) {
                    alert('Sign up failed: ' + signUpError.message);
                }
            }
        } else {
            alert('Login failed: ' + error.message);
        }
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// File Upload Handlers
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageUpload(file);
    }
});

clearBtn.addEventListener('click', () => {
    uploadedImage = null;
    fileInput.value = '';
    uploadBox.classList.remove('hidden');
    previewSection.classList.add('hidden');
    generateSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    generatedIcons = [];
});

// Handle Image Upload
function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            preview.src = e.target.result;
            uploadBox.classList.add('hidden');
            previewSection.classList.remove('hidden');
            generateSection.classList.remove('hidden');
            resultsSection.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Generate Icons
generateBtn.addEventListener('click', async () => {
    if (!uploadedImage) return;
    
    generateBtn.disabled = true;
    progressBar.classList.remove('hidden');
    generatedIcons = [];
    
    for (let i = 0; i < ICON_SIZES.length; i++) {
        const iconConfig = ICON_SIZES[i];
        const iconData = await generateIcon(uploadedImage, iconConfig.size);
        generatedIcons.push({
            name: iconConfig.name,
            size: iconConfig.size,
            data: iconData
        });
        
        const progress = ((i + 1) / ICON_SIZES.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    displayResults();
    generateBtn.disabled = false;
    progressBar.classList.add('hidden');
    progressFill.style.width = '0%';
});

// Generate individual icon
function generateIcon(img, size) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions to maintain aspect ratio and center
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        canvas.toBlob((blob) => {
            resolve({
                blob: blob,
                url: canvas.toDataURL('image/png')
            });
        }, 'image/png');
    });
}

// Display Results
function displayResults() {
    // Show icon previews
    iconPreviews.innerHTML = '';
    generatedIcons.forEach(icon => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'icon-preview';
        previewDiv.innerHTML = `
            <img src="${icon.data.url}" alt="${icon.name}">
            <span>${icon.size}x${icon.size}</span>
        `;
        iconPreviews.appendChild(previewDiv);
    });
    
    // Generate manifest.json code
const manifest = {
    "name": "Your App Name",
    "short_name": "App",
    "icons": [
        {
            "src": "icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": ["any", "maskable"]
        },
        {
            "src": "icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": ["any", "maskable"]
        }
    ],
    "theme_color": "#7c3aed",
    "background_color": "#0a0a0a",
    "display": "standalone",
    "start_url": "./"
};
    
    manifestCode.textContent = JSON.stringify(manifest, null, 2);
    

// Generate HTML code
const html = `<!-- Required in <head> section -->

<!-- iOS Home Screen Icon (CRITICAL for iPad/iPhone) -->
<link rel="apple-touch-icon" href="apple-touch-icon.png">

<!-- Favicon for browsers -->
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">

<!-- Web App Manifest (for Android) -->
<link rel="manifest" href="manifest.json">

<!-- iOS Web App Configuration -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Your App Name">

<!-- Theme Color (for Android) -->
<meta name="theme-color" content="#7c3aed">`;
    
    htmlCode.textContent = html;
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Download All Icons
downloadAllBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    
    generatedIcons.forEach(icon => {
        zip.file(icon.name, icon.data.blob);
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-app-icons.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Copy Code Functionality
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
        const targetId = e.target.getAttribute('data-target');
        const codeElement = document.getElementById(targetId);
        const text = codeElement.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = '✓ Copied!';
            e.target.classList.add('copied');
            
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.classList.remove('copied');
            }, 2000);
        });
    }
});