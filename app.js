// ----------------------------
// app.js (debug-ready)
// ----------------------------

// Firebase Config (you provided these values)
const firebaseConfig = {
  apiKey: "AIzaSyAKTNMVnl4W04_WH0PqsIA2xattjTR6x0M",
  authDomain: "call-from-browserss.firebaseapp.com",
  databaseURL: "https://call-from-browserss-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "call-from-browserss",
  storageBucket: "call-from-browserss.firebasestorage.app",
  messagingSenderId: "421459301855",
  appId: "1:421459301855:web:5f9581250da6cd3935a06a"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  // if already initialized in same page
}
const db = firebase.database();

// UI elements
const uidInput = document.getElementById('uidInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const numberDiv = document.getElementById('number');
const callBtn = document.getElementById('callBtn');
const logEl = document.getElementById('log');

let currentUID = null;
let callRef = null;

// small logger
function log(msg) {
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
}

// Utility: set status text + color hint
function setStatus(text, color = '#333') {
  statusEl.textContent = `Status: ${text}`;
  statusEl.style.color = color;

  // ✅ Status অনুযায়ী Start button disable/enable করা
  if (text.toLowerCase().includes('connected')) {
    startBtn.disabled = true;
  } else {
    // UID আছে কিনা চেক করে enable
    startBtn.disabled = uidInput.value.trim().length > 0 ? false : true;
  }
}


// attach listener function
function attachListenerForUID(uid) {
  if (!uid) return;
  // detach previous
  if (callRef) {
    try { callRef.off(); } catch(e){ console.warn(e); }
    callRef = null;
  }

  currentUID = uid;
  callRef = db.ref(`calls/${currentUID}`);

  setStatus(`connected`, 'green');
  log(`Listening to calls/${currentUID}`);

  callRef.on('value', snapshot => {
    const data = snapshot.val();
    if (data && data.number) {
      numberDiv.textContent = `Number: ${data.number}`;
      callBtn.style.display = 'inline-block';
      callBtn.href = `tel:${data.number}`;
      callBtn.textContent = `Tap to Call ${data.number}`;
      log(`Received number ${data.number} (timestamp: ${data.timestamp || 'n/a'})`);
    } else {
      numberDiv.textContent = 'Waiting for number...';
      callBtn.style.display = 'none';
      log('Node exists but no number field (or node empty)');
    }
  }, error => {
    setStatus('read error', 'red');
    log('Firebase listener error: ' + error.message);
  });
}

// stop listener
function stopListener() {
  if (callRef) {
    try { callRef.off(); } catch(e){ console.warn(e); }
    callRef = null;
  }
  currentUID = null;
  setStatus('not connected', '#333');
  numberDiv.textContent = 'Waiting for number...';
  callBtn.style.display = 'none';
  log('Listener stopped');
}

// Start button behaviour
startBtn.addEventListener('click', () => {
  const uid = uidInput.value.trim();
  if (!uid) {
    alert('Please paste the UID from the extension into the box first.');
    return;
  }
  attachListenerForUID(uid);
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

// Stop button
stopBtn.addEventListener('click', () => {
  stopListener();
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Also respond on paste / input immediately so user doesn't have to press Start
uidInput.addEventListener('input', () => {
  // if currently not connected, auto-start when user pastes a plausible UID
  const val = uidInput.value.trim();
  if (!val) return;
  // heuristics: UID length > 10
  if (!currentUID && val.length > 10) {
    log('Auto-starting listener for pasted UID');
    attachListenerForUID(val);
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }
});

// Basic connectivity check
try {
  // quick read to test DB access (does not require auth if rules allow)
  db.ref('.info/connected').once('value').then(snap => {
    // no-op, this ensures SDK is reachable
    log('Firebase SDK initialized.');
  }).catch(err => {
    log('Firebase SDK init/read error: ' + err.message);
    setStatus('SDK init error', 'red');
  });
} catch (err) {
  log('Firebase init exception: ' + err.message);
  setStatus('init exception', 'red');
}

// Helpful instructions in log
log('Page ready. Paste UID and wait for realtime updates.');
