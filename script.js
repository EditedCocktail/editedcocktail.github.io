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
const MANAGER_YANDEX_LINK = "https://disk.yandex.ru/d/lwGOn7eVgP3P_A";

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
const headerText = document.getElementById('header-text');
const userCount = document.getElementById('userCount');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Version elements
const versionValue = document.getElementById('version-value');

// Store current key and expiration for language updates
let currentKey = null;
let currentExpirationDate = null;
let latestGistData = null;

// Translations
const translations = {
  en: {
    title: "VoiceCatX",
    downloadTitle: "VoiceCatX Manager",
    downloadDesc: "Download the official VoiceCatX Manager to install or update VoiceCatX.",
    downloadBtn: "Download VoiceCatX Manager",
    versionLabel: "Latest version:",
    tutorialTitle: "Installation Tutorial",
    tutorialSteps: [
      "Create an empty folder or go to your VoiceCatX folder",
      "Add this folder to Windows Defender exclusions",
      "Place VoiceCatXManager.exe in this folder",
      "Run it",
      "If the folder is empty, clicking the button will install VoiceCatX in this folder",
      "If VoiceCatX is already installed in this folder, it will check for a newer version and update if available"
    ],
    activationTitle: "Activation Key Generator",
    activationDesc: "Enter your VoiceCatX ID below to generate an activation key.",
    placeholder: "Enter VoiceCatX ID",
    keyLabel: "Key",
    expirationLabel: "Expiration",
    generateBtn: "Generate Activation Key",
    alert: "Please enter a VoiceCatX ID",
    error: "Error generating key. Please try again.",
    previousNotExpired: "Previous activation key is not expired yet",
    usersLabel: "Users",
    tabDownload: "Download",
    tabActivation: "Activation"
  },
  ru: {
    title: "VoiceCatX",
    downloadTitle: "VoiceCatX Менеджер",
    downloadDesc: "Скачайте официальный менеджер VoiceCatX для установки или обновления VoiceCatX.",
    downloadBtn: "Скачать VoiceCatX Менеджер",
    versionLabel: "Последняя версия:",
    tutorialTitle: "Инструкция по установке",
    tutorialSteps: [
      "Создайте пустую папку или Зайдите в папку с VoiceCatX",
      "Добавьте эту папку в исключения Защитника Windows",
      "Положите в эту папку VoiceCatXManager.exe",
      "Запустите",
      "Если папка пустая при нажатии кнопки он установит VoiceCatX в эту папку",
      "Если в папке уже установлен VoiceCatX, то будет проверена версия и если есть версия новее, то при нажатии кнопки он обновит VoiceCatX в этой папке до новой версии"
    ],
    activationTitle: "Генератор ключей активации",
    activationDesc: "Введите ваш ID VoiceCatX ниже для генерации ключа активации.",
    placeholder: "Введите ID VoiceCatX",
    keyLabel: "Ключ",
    expirationLabel: "Истекает",
    generateBtn: "Сгенерировать ключ активации",
    alert: "Пожалуйста, введите ID VoiceCatX",
    error: "Ошибка генерации ключа. Пожалуйста, попробуйте снова.",
    previousNotExpired: "Предыдущий ключ активации ещё не истёк",
    usersLabel: "Пользователей",
    tabDownload: "Скачать",
    tabActivation: "Активация"
  }
};

let currentLang = 'en';

async function triggerDownloadFromYandexLink(publicLink) {
  const directLink = await generateYandexDirectLink(publicLink);
  const a = document.createElement('a');
  a.href = directLink;
  a.download = '';
  document.body.appendChild(a);
  a.click();
}

// Apply language
function applyLanguage(language) {
  currentLang = language;
  const t = translations[language];

  headerText.textContent = t.title;

  document.getElementById('download-title').textContent = t.downloadTitle;
  document.getElementById('download-desc').textContent = t.downloadDesc;
  document.getElementById('download-btn').textContent = t.downloadBtn;
  document.getElementById('version-label').textContent = t.versionLabel;
  document.getElementById('tutorial-title').textContent = t.tutorialTitle;
  
  const tutorialSteps = document.querySelectorAll('#tutorial-steps li');
  tutorialSteps.forEach((step, index) => {
    step.textContent = t.tutorialSteps[index];
  });

  document.querySelector('.tab-btn[data-tab="download"]').textContent = t.tabDownload;
  document.querySelector('.tab-btn[data-tab="activation"]').textContent = t.tabActivation;
  
  idInput.placeholder = t.placeholder;
  generateBtn.textContent = t.generateBtn;
  
  if (currentKey !== null && currentExpirationDate !== null) {
    updateInfoDisplay(currentKey, currentExpirationDate);
  } else {
    infoBox.innerHTML = `${t.keyLabel}: ???<br>${t.expirationLabel}: ???`;
  }

  updateUserCount();
}

// Set theme
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('voicecatx-theme', theme);
  
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

// Update user count display
async function updateUserCount() {
  try {
    const snapshot = await db.collection('keys').get();
    const count = snapshot.size;
    const t = translations[currentLang];
    userCount.textContent = `${t.usersLabel}: ${count}`;
  } catch (error) {
    console.error("Failed to fetch user count:", error);
    userCount.textContent = `${translations[currentLang].usersLabel}: ?`;
  }
}

// Update info display with translation
function updateInfoDisplay(key, expirationDate) {
  currentKey = key;
  currentExpirationDate = expirationDate;
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
    const docRef = db.collection('keys').doc(id);
    const docSnap = await docRef.get();

    const currentMs = getCurrentTimestampMs();

    if (docSnap.exists) {
      const data = docSnap.data();
      const expirationMs = data.expiration;

      if (expirationMs > currentMs) {
        const expirationDate = formatDate(expirationMs);
        const t = translations[currentLang];
        infoBox.innerHTML = `${t.previousNotExpired}<br>${t.keyLabel}: ${data.key}<br>${t.expirationLabel}: ${expirationDate}`;
        currentKey = data.key;
        currentExpirationDate = expirationDate;
        loadingRing.classList.remove('active');
        generateBtn.disabled = false;
        return;
      }
    }

    const expirationMs = currentMs + ONE_MONTH_MS;
    const expirationDate = formatDate(expirationMs);
    const key = encodeActivationKey(expirationMs, id);

    await docRef.set({
      key: key,
      expiration: expirationMs,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    updateInfoDisplay(key, expirationDate);
    updateUserCount();
  } catch (error) {
    console.error('Error:', error);
    alert(translations[currentLang].error);
    currentKey = null;
    currentExpirationDate = null;
  } finally {
    loadingRing.classList.remove('active');
    generateBtn.disabled = false;
  }
}

// Fetch latest version from GitHub Gist
async function fetchLatestVersion() {
  try {
    const response = await fetch('https://gist.githubusercontent.com/EditedCocktail/b49f4f670a1bef5a4a855938b3bce60f/raw/vcx-update.txt');
    const text = await response.text();
    const json = JSON.parse(text);
    latestGistData = json;
    versionValue.textContent = json.version || 'Unknown';
  } catch (error) {
    console.error('Failed to fetch version:', error);
    versionValue.textContent = 'Error';
    latestGistData = null;
  }
}

// Tab switching functionality
function switchTab(tabName) {
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('download-btn').addEventListener('click', () => {
    window.open(MANAGER_YANDEX_LINK, '_blank');
  });
  
  document.getElementById('version-value').addEventListener('click', () => {
    if (latestGistData && latestGistData.link) {
      window.open(latestGistData.link, '_blank');
    }
  });
  
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('accent'));
      btn.classList.add('accent');
      applyLanguage(btn.dataset.lang);
      localStorage.setItem('voicecatx-lang', btn.dataset.lang);
    });
  });

  const savedLang = localStorage.getItem('voicecatx-lang');
  if (savedLang && translations[savedLang]) {
    applyLanguage(savedLang);
    langButtons.forEach(btn => {
      if (btn.dataset.lang === savedLang) {
        btn.classList.add('accent');
      } else {
        btn.classList.remove('accent');
      }
    });
  } else {
    applyLanguage('en');
    document.querySelector('.lang-option[data-lang="en"]').classList.add('accent');
  }

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

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  generateBtn.addEventListener('click', generateAndSaveKey);
  idInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateAndSaveKey();
  });

  applyLanguage(currentLang);
  idInput.focus();
  
  updateUserCount();
  fetchLatestVersion();
});
