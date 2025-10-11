// ----------------------------
// app.js (Auto Start + Rear Camera Fix + Paste UID)
// ----------------------------

const firebaseConfig = {
  apiKey: "AIzaSyAKTNMVnl4W04_WH0PqsIA2xattjTR6x0M",
  authDomain: "call-from-browserss.firebaseapp.com",
  databaseURL: "https://call-from-browserss-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "call-from-browserss",
  storageBucket: "call-from-browserss.firebasestorage.app",
  messagingSenderId: "421459301855",
  appId: "1:421459301855:web:5f9581250da6cd3935a06a"
};

try { firebase.initializeApp(firebaseConfig); } catch(e){}
const db = firebase.database();

const uidInput = document.getElementById('uidInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const scanQRBtn = document.getElementById('scanQR');
const changeUIDBtn = document.getElementById('changeUID');
const statusEl = document.getElementById('status');
const numberDiv = document.getElementById('number');
const callBtn = document.getElementById('callBtn');
const logEl = document.getElementById('log');
const qrReader = document.getElementById('qr-reader');

let currentUID = null;
let callRef = null;
let html5QrCode = null;
let qrScanning = false;

// Logger
function log(msg) {
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
  if (logEl.textContent.length > 6000) {
    logEl.textContent = logEl.textContent.slice(0, 6000);
  }
}

// Status UI
function setStatus(text, color = '#333') {
  statusEl.textContent = `Status: ${text}`;
  statusEl.style.color = color;
}

// Attach listener
function attachListenerForUID(uid) {
  if (!uid) return;
  try { if (callRef) callRef.off(); } catch(e){}

  callRef = db.ref(`calls/${uid}`);
  currentUID = uid;
  localStorage.setItem('savedUID', uid);

  setStatus('Connected', 'green');
  startBtn.disabled = true;
  stopBtn.disabled = false;
  log(`Listening for calls/${uid}`);

  callRef.on('value', snap => {
    const data = snap.val();
    if (data && data.number) {
      numberDiv.textContent = `Number: ${data.number}`;
      callBtn.href = `tel:${data.number}`;
      callBtn.textContent = `📲 Tap to Call ${data.number}`;
      callBtn.style.display = 'inline-block';
      log(`Received number ${data.number}`);
    } else {
      numberDiv.textContent = 'Waiting for number...';
      callBtn.style.display = 'none';
    }
  });
}

// Stop listener
function stopListener() {
  if (callRef) try { callRef.off(); } catch(e){}
  currentUID = null;
  setStatus('Not connected', '#333');
  numberDiv.textContent = 'Waiting for number...';
  callBtn.style.display = 'none';
  startBtn.disabled = false;
  stopBtn.disabled = true;
  log('Listener stopped');

  if (qrScanning && html5QrCode) {
    html5QrCode.stop().then(() => {
      try { html5QrCode.clear(); } catch(e){}
      qrReader.style.display = 'none';
      scanQRBtn.disabled = false;
      qrScanning = false;
    });
  }
}

// Change UID (forget old one)
changeUIDBtn.addEventListener('click', () => {
  localStorage.removeItem('savedUID');
  uidInput.value = '';
  stopListener();
  log('Old UID cleared.');
  alert('Previous UID cleared. Scan or paste a new UID.');
});

// When user pastes or types UID manually → auto start
uidInput.addEventListener('change', () => {
  const uid = uidInput.value.trim();
  if (uid) {
    log(`Manual UID entered: ${uid}`);
    attachListenerForUID(uid);
  }
});

// Stop manually
stopBtn.addEventListener('click', () => stopListener());

// QR Scan with rear camera preference
scanQRBtn.addEventListener('click', async () => {
  qrReader.style.display = 'block';
  scanQRBtn.disabled = true;

  if (!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");

  try {
    // Try facingMode first (better for mobile rear camera)
    const config = { fps: 10, qrbox: 250 };
    try {
      qrScanning = true;
      await html5QrCode.start({ facingMode: { exact: "environment" } }, config, onScanSuccess);
      log('Rear camera started (facingMode: environment)');
      return;
    } catch (e) {
      log('FacingMode exact failed, fallback to camera list...');
    }

    // Fallback: get cameras and choose back camera manually
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) throw new Error('No cameras found.');

    let cameraId = cameras[0].id;
    for (let cam of cameras) {
      if (/back|rear|environment/i.test(cam.label)) {
        cameraId = cam.id;
        break;
      }
    }

    qrScanning = true;
    html5QrCode.start(cameraId, config, onScanSuccess);
    log(`Using camera: ${cameras.find(c => c.id === cameraId)?.label || 'default'}`);

  } catch (err) {
    alert("Camera access failed: " + err.message);
    scanQRBtn.disabled = false;
    qrReader.style.display = 'none';
    qrScanning = false;
  }
});

// QR success handler
function onScanSuccess(decodedText) {
  log(`Scanned UID: ${decodedText}`);
  uidInput.value = decodedText;
  localStorage.setItem('savedUID', decodedText);

  // Stop scanner & auto start listener
  html5QrCode.stop().then(() => {
    try { html5QrCode.clear(); } catch(e){}
    qrReader.style.display = 'none';
    scanQRBtn.disabled = false;
    qrScanning = false;
    attachListenerForUID(decodedText);
  });
}

// Auto-load saved UID on page load and auto-start
window.addEventListener('load', () => {
  const savedUID = localStorage.getItem('savedUID');
  if (savedUID) {
    uidInput.value = savedUID;
    log(`Loaded saved UID: ${savedUID}`);
    attachListenerForUID(savedUID);
  }
  log('App ready. Paste or scan UID to auto-start.');
});
