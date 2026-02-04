// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCm4t7eokVqF1baXGeQtidR6A2ZrJUMGHk",
  authDomain: "voicecatx.firebaseapp.com",
  projectId: "voicecatx",
  storageBucket: "voicecatx.firebasestorage.app",
  messagingSenderId: "503409354304",
  appId: "1:503409354304:web:ad6372e2d79634af8e21a5",
  measurementId: "G-DXV389RNPQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Constants
const B32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ONE_MONTH_MS = 30 * 24 * 3600 * 1000;

// Theme configuration
const themeNames = ['light', 'dark', 'horizon'];
const themeIcons = ['sun', 'moon', 'sun-horizon'];
let currentTheme = themeNames[0];

// DOM elements
const idInput = document.getElementById('idInput');
const infoBox = document.getElementById('infoBox');
const generateBtn = document.getElementById('generateBtn');
const loadingRing = document.getElementById('loadingRing');
const themeBtn = document.getElementById('theme-btn');
const langButtons = document.querySelectorAll('.lang-option');
const pageTitle = document.getElementById('page-title');

// Translations
const translations = {
  en: {
    title: "VoiceCatX Activation Key Generator",
    placeholder: "Enter VoiceCatX ID",
    keyLabel: "Key",
    expirationLabel: "Expiration",
    generateBtn: "Generate Activation Key",
    alert: "Please enter a VoiceCatX ID",
    error: "Error generating key. Please try again."
  },
  ru: {
    title: "Генератор ключей активации VoiceCatX",
    placeholder: "Введите ID VoiceCatX",
    keyLabel: "Ключ",
    expirationLabel: "Истекает",
    generateBtn: "Сгенерировать ключ активации",
    alert: "Пожалуйста, введите ID VoiceCatX",
    error: "Ошибка генерации ключа. Пожалуйста, попробуйте снова."
  }
};

let currentLang = 'en';

// Apply language
function applyLanguage(language) {
  currentLang = language;
  const t = translations[language];
  
  pageTitle.textContent = t.title;
  idInput.placeholder = t.placeholder;
  generateBtn.textContent = t.generateBtn;
  
  // Update info box if it has content
  if (infoBox.innerHTML !== 'Key: ???<br>Expiration: ???') {
    const keyMatch = infoBox.innerHTML.match(/Key: ([^<]+)/);
    const expMatch = infoBox.innerHTML.match(/Expiration: (.+)/);
    if (keyMatch && expMatch) {
      updateInfo(keyMatch[1], expMatch[1]);
    }
  }
}

// Set theme
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('voicecatx-theme', theme);
  
  // Update icon
  const iconIndex = themeNames.indexOf(theme);
  themeBtn.innerHTML = `<i class="ph-fill ph-${themeIcons[iconIndex]}"></i>`;
}

// Get current timestamp in milliseconds
function getCurrentTimestampMs() {
  return Date.now();
}

// Base32 encode with custom padding
function base32Encode(data) {
  const bits = [];
  for (let byte of data) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }
  
  while (bits.length % 5 !== 0) {
    bits.push(0);
  }
  
  let b32 = '';
  for (let i = 0; i < bits.length; i += 5) {
    let chunk = 0;
    for (let j = 0; j < 5; j++) {
      chunk = (chunk << 1) | bits[i + j];
    }
    b32 += B32_CHARS[chunk];
  }
  
  const remainder = b32.length % 5;
  const padLen = (5 - remainder) % 5;
  let padding = '';
  if (padLen > 0) {
    for (let i = 0; i < padLen; i++) {
      padding += B32_CHARS.charAt(Math.floor(Math.random() * B32_CHARS.length));
    }
    b32 += padding;
  }
  
  const groups = [];
  for (let i = 0; i < b32.length; i += 5) {
    groups.push(b32.substring(i, i + 5));
  }
  
  return `VSCX${padLen}-${groups.join('-')}`;
}

// Generate activation key
function encodeActivationKey(expirationMs, idStr) {
  const dataStr = expirationMs.toString();
  const data = new TextEncoder().encode(dataStr);
  
  const keyHex = CryptoJS.SHA256(idStr).toString();
  const keyBytes = [];
  for (let i = 0; i < keyHex.length; i += 2) {
    keyBytes.push(parseInt(keyHex.substr(i, 2), 16));
  }
  
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return base32Encode(encrypted);
}

// Update info display with translation
function updateInfo(key, expirationDate) {
  const t = translations[currentLang];
  infoBox.innerHTML = `${t.keyLabel}: ${key}<br>${t.expirationLabel}: ${expirationDate}`;
}

// Format date for display
function formatDate(timestampMs) {
  const date = new Date(timestampMs);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Generate and save key
async function generateAndSaveKey() {
  const id = idInput.value.trim();
  if (!id) {
    alert(translations[currentLang].alert);
    return;
  }
  
  loadingRing.classList.add('active');
  generateBtn.disabled = true;
  
  try {
    const currentMs = getCurrentTimestampMs();
    const expirationMs = currentMs + ONE_MONTH_MS;
    const expirationDate = formatDate(expirationMs);
    
    const key = encodeActivationKey(expirationMs, id);
    
    await db.collection('keys').doc(id).set({
      key: key,
      expiration: expirationMs,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    updateInfo(key, expirationDate);
  } catch (error) {
    console.error('Error:', error);
    alert(translations[currentLang].error);
  } finally {
    loadingRing.classList.remove('active');
    generateBtn.disabled = false;
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function () {
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('accent'));
      btn.classList.add('accent');
      applyLanguage(btn.dataset.lang);
      localStorage.setItem('voicecatx-lang', btn.dataset.lang);
    });
  });

  // Load saved language or default to English
  const savedLang = localStorage.getItem('voicecatx-lang');
  if (savedLang && translations[savedLang]) {
    applyLanguage(savedLang)
    langButtons.forEach(btn => {
      if (btn.dataset.lang === savedLang) {
        btn.classList.add('accent');
      } else {
        btn.classList.remove('accent');
      }
    });
  } else {
    applyLanguage('en');
  }

  // Theme setup
  const savedTheme = localStorage.getItem('voicecatx-theme');
  if (savedTheme && themeNames.includes(savedTheme)) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  themeBtn.addEventListener('click', function () {
    let index = themeNames.indexOf(currentTheme) + 1;
    if (index >= themeNames.length) index = 0;
    setTheme(themeNames[index]);
  });

  generateBtn.addEventListener('click', generateAndSaveKey);
  idInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateAndSaveKey();
  });

  updateInfo('???', '???');
  
  idInput.focus();
});
