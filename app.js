window.addEventListener('DOMContentLoaded', async () => {
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

  let currentUID = null, callRef = null, html5QrCode = null, qrScanning = false;

  // Wait until Html5Qrcode is loaded
  if (typeof Html5Qrcode === 'undefined') {
    await new Promise((resolve, reject) => {
      const maxWait = 5000; // max 5 sec
      let waited = 0;
      const interval = setInterval(() => {
        if (typeof Html5Qrcode !== 'undefined') {
          clearInterval(interval);
          resolve();
        }
        waited += 100;
        if (waited >= maxWait) {
          clearInterval(interval);
          reject(new Error("Html5Qrcode library not loaded after 5s"));
        }
      }, 100);
    }).catch(err => {
      alert(err.message);
      console.error(err);
      return;
    });
  }

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

  function log(msg){
    const t = new Date().toLocaleTimeString();
    logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
  }

  function setStatus(text,color='#333'){ statusEl.textContent=`Status: ${text}`; statusEl.style.color=color; }

  function attachListener(uid){
    if(callRef) callRef.off();
    callRef = db.ref(`calls/${uid}`);
    currentUID = uid;
    setStatus('Connected','green');
    startBtn.disabled = true; stopBtn.disabled = false;
    log(`Listening for calls/${uid}`);
    callRef.on('value', snap => {
      const data = snap.val();
      if(data && data.number){
        numberDiv.textContent=`Number: ${data.number}`;
        callBtn.href=`tel:${data.number}`;
        callBtn.textContent=`📲 Tap to Call ${data.number}`;
        callBtn.style.display='inline-block';
      } else {
        numberDiv.textContent='Waiting for number...';
        callBtn.style.display='none';
      }
    });
  }

  function stopListener(){
    if(callRef) callRef.off();
    currentUID = null;
    setStatus('Not connected','#333');
    numberDiv.textContent='Waiting for number...';
    callBtn.style.display='none';
    startBtn.disabled = false; stopBtn.disabled = true;

    if(qrScanning && html5QrCode){
      html5QrCode.stop().then(()=>{
        try{ html5QrCode.clear(); } catch(e){}
        qrReader.style.display='none';
        scanQRBtn.textContent="📷 Scan QR";
        qrScanning=false;
      });
    }
  }

  function startListening(uid){
    if(!uid){ alert('Please scan QR or enter UID'); return;}
    attachListener(uid);
    localStorage.setItem('savedUID', uid);
  }

  startBtn.addEventListener('click', ()=>startListening(uidInput.value.trim()));
  stopBtn.addEventListener('click', ()=>stopListener());

  changeUIDBtn.addEventListener('click', ()=>{
    localStorage.removeItem('savedUID');
    uidInput.value='';
    stopListener();
    alert('Previous UID cleared. Scan or paste a new UID.');
    log('Old UID cleared.');
  });

  uidInput.addEventListener('change', ()=>{
    const uid = uidInput.value.trim();
    if(uid){ log(`Manual UID entered: ${uid}`); startListening(uid); }
  });

  // Auto-load saved UID
  const savedUID = localStorage.getItem('savedUID');
  if(savedUID){ uidInput.value = savedUID; startListening(savedUID); }

  // QR Scan toggle
  scanQRBtn.addEventListener('click', async ()=>{
    if(qrScanning){
      await html5QrCode.stop();
      try{ html5QrCode.clear(); }catch(e){}
      qrReader.style.display='none'; qrScanning=false;
      scanQRBtn.textContent="📷 Scan QR";
      log('QR scanner closed by user');
      return;
    }

    qrReader.style.display='block';
    if(!html5QrCode) html5QrCode = new Html5Qrcode("qr-reader");
    qrScanning = true;
    scanQRBtn.textContent="❌ Close QR";

    try{
      const cameras = await Html5Qrcode.getCameras();
      if(cameras && cameras.length){
        let cameraId = cameras[0].id;
        for(let cam of cameras){ if(cam.label.toLowerCase().includes('back')){ cameraId = cam.id; break; } }
        await html5QrCode.start(cameraId,{fps:10, qrbox:250}, decodedText=>{
          uidInput.value = decodedText;
          startListening(decodedText);
          html5QrCode.stop().then(()=>{ qrReader.style.display='none'; qrScanning=false; scanQRBtn.textContent="📷 Scan QR"; });
        }, err=>{});
      } else { alert("No camera found"); qrScanning=false; }
    } catch(err){ alert("Camera start failed: "+err.message); qrScanning=false; scanQRBtn.textContent="📷 Scan QR"; }
  });

});
