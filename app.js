// ----------------------------
// app.js (QR Scan + Change UID)
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

// Logger
function log(msg) {
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
}

// Status UI
function setStatus(text, color = '#333') {
  statusEl.textContent = `Status: ${text}`;
  statusEl.style.color = color;
}

// Attach listener
function attachListenerForUID(uid) {
  if (!uid) return;
  if (callRef) try { callRef.off(); } catch(e){}
  callRef = db.ref(`calls/${uid}`);
  currentUID = uid;
  setStatus('Connected', 'green');
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
  log('Listener stopped');
}

// Start listening
startBtn.addEventListener('click', () => {
  const uid = uidInput.value.trim();
  if (!uid) {
    alert('Please scan QR code first.');
    return;
  }
  attachListenerForUID(uid);
  localStorage.setItem('savedUID', uid);
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

// Stop listening
stopBtn.addEventListener('click', () => {
  stopListener();
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// Change UID (forget old one)
changeUIDBtn.addEventListener('click', () => {
  localStorage.removeItem('savedUID');
  uidInput.value = '';
  stopListener();
  log('Old UID cleared. You can scan a new one now.');
  alert('Previous UID cleared. Scan a new QR to reconnect.');
});

// QR Scan (updated for rear camera preference)
scanQRBtn.addEventListener('click', async () => {
  qrReader.style.display = 'block';
  scanQRBtn.disabled = true;
  html5QrCode = new Html5Qrcode("qr-reader");

  try {
    const cameras = await Html5Qrcode.getCameras();

    if (cameras && cameras.length) {
      // Try to pick the rear (back) camera
      let cameraId = cameras[1].id;
      for (let cam of cameras) {
        if (cam.label.toLowerCase().includes('back')) {
          cameraId = cam.id;
          break;
        }
      }

      log(`Using camera: ${cameras.find(c => c.id === cameraId)?.label || 'default'}`);

      html5QrCode.start(
        cameraId,
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          log(`Scanned UID: ${decodedText}`);
          uidInput.value = decodedText;
          localStorage.setItem('savedUID', decodedText);
          html5QrCode.stop().then(() => {
            qrReader.style.display = 'none';
            scanQRBtn.disabled = false;
          });
        },
        (error) => {
          // scanning error ignored
        }
      ).catch(err => {
        alert("Camera start failed: " + err.message);
        scanQRBtn.disabled = false;
      });
    } else {
      alert("No camera found!");
      scanQRBtn.disabled = false;
    }
  } catch (err) {
    alert("Camera access failed: " + err.message);
    scanQRBtn.disabled = false;
  }
});

      },
      () => {}
    ).catch(err => {
      alert("Camera access failed: " + err.message);
      scanQRBtn.disabled = false;
    });
  } else {
    alert("No camera found!");
    scanQRBtn.disabled = false;
  }
});

// Auto-load UID
window.addEventListener('load', () => {
  const savedUID = localStorage.getItem('savedUID');
  if (savedUID) {
    uidInput.value = savedUID;
    log(`Loaded saved UID: ${savedUID}`);
  }
  log('App ready. Scan QR or use saved UID.');
});

