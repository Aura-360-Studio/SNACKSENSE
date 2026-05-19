/* ==========================================================================
   SNACKSENSE™ STANDALONE MOBILE APP CONTROLLER // AURA LABS v1.5.0
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- NATIVE MOBILE APP STATE ---
  const state = {
    audioEnabled: true,
    visionEnabled: true,
    stream: null,
    model: null,
    modelLoading: false,
    detectionActive: false,
    selectedPresetSnack: null,
    currentTab: 'chamberTab',
    aiMood: 'cynical', // cynical, chaotic, cruel
    sarcasmIntensity: 85,
    lastDetections: [],
    detectedClass: 'Awaiting specimen...',
    detectedConfidence: 0,
    dominantColor: { r: 57, g: 255, b: 20 }, // green
    auraName: 'ACTIVE GRIDS',
    historyLogs: JSON.parse(localStorage.getItem('snacksense_logs')) || []
  };

  // --- DOM SELECTORS ---
  // Tabs Screens
  const screens = {
    welcome: document.getElementById('welcomeScreen'),
    chamberTab: document.getElementById('chamberTab'),
    logsTab: document.getElementById('logsTab'),
    settingsTab: document.getElementById('settingsTab')
  };

  // Modals & Overlays
  const loaderOverlay = document.getElementById('loaderOverlay');
  const resultsView = document.getElementById('resultsView');
  const presetContainer = document.getElementById('presetContainer');
  const telemetryDrawer = document.getElementById('telemetryDrawer');

  // Trigger buttons
  const btnEnterChamber = document.getElementById('btnEnterChamber');
  const btnToggleScannerMode = document.getElementById('btnToggleScannerMode');
  const btnTriggerScan = document.getElementById('btnTriggerScan');
  const btnBackFromResults = document.getElementById('btnBackFromResults');
  const btnPlayCrunchWave = document.getElementById('btnPlayCrunchWave');
  const btnDownloadReceipt = document.getElementById('btnDownloadReceipt');
  const btnShareCopy = document.getElementById('btnShareCopy');
  const btnClearLogs = document.getElementById('btnClearLogs');
  
  // Settings binds
  const chkAudioEnable = document.getElementById('chkAudioEnable');
  const chkVisionEnable = document.getElementById('chkVisionEnable');
  const sliderSarcasm = document.getElementById('sliderSarcasm');
  const sliderMSG = document.getElementById('sliderMSG');

  // Phone components
  const statusBarTime = document.getElementById('statusBarTime');
  const statusBarBatteryPercent = document.getElementById('statusBarBatteryPercent');
  const statusBarBatteryFill = document.getElementById('statusBarBatteryFill');
  const dynamicIsland = document.getElementById('dynamicIsland');
  const islandText = document.getElementById('islandText');
  const bottomTabBar = document.getElementById('bottomTabBar');
  const hudChamberMode = document.getElementById('hudChamberMode');

  // Canvases
  const videoElement = document.getElementById('webcamVideo');
  const detectionCanvas = document.getElementById('detectionCanvas');
  const auraCanvas = document.getElementById('auraCanvas');
  const oscilloscopeCanvas = document.getElementById('oscilloscopeCanvas');

  // Telemetry panel elements
  const telemetryDrawerHeader = document.getElementById('telemetryDrawerHeader');
  const drawerClass = document.getElementById('drawerClass');
  const telConfidence = document.getElementById('telConfidence');
  const telFPS = document.getElementById('telFPS');
  const barPreservatives = document.getElementById('barPreservatives');
  const barVibe = document.getElementById('barVibe');
  const barRegret = document.getElementById('barRegret');
  const scannerTicker = document.getElementById('scannerTickerConsole');

  // Receipt printable cards
  const recScanId = document.getElementById('receiptScanId');
  const recTimestamp = document.getElementById('receiptTimestamp');
  const recDetected = document.getElementById('receiptDetected');
  const recMSG = document.getElementById('receiptMSG');
  const recCrunch = document.getElementById('receiptCrunch');
  const recImpulsivity = document.getElementById('receiptImpulsivity');
  const recTier = document.getElementById('receiptTier');
  const recNotes = document.getElementById('receiptNotes');
  const recAudit = document.getElementById('receiptAudit');

  // --- NATIVE CLOCK & BATTERY DEEP SYSTEM THREAD ---
  function updateSystemStatusBar() {
    const now = new Date();
    statusBarTime.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  updateSystemStatusBar();
  setInterval(updateSystemStatusBar, 10000); // update every 10 seconds

  // Battery slowly deplete simulation
  let batteryLife = 89;
  function depleteBattery() {
    batteryLife -= 1;
    if (batteryLife < 5) batteryLife = 98; // auto reset so phone doesn't die!
    statusBarBatteryPercent.textContent = `${batteryLife}%`;
    statusBarBatteryFill.style.width = `${batteryLife}%`;
    if (batteryLife < 20) {
      statusBarBatteryFill.style.backgroundColor = '#ff007f'; // low power alert red
    } else {
      statusBarBatteryFill.style.backgroundColor = '#39ff14';
    }
  }
  setInterval(depleteBattery, 45000); // deplete 1% every 45s

  // --- DYNAMIC ISLAND NOTIFICATION POPUPS ---
  function triggerIslandPopup(text, isScanning = false, duration = 3000) {
    islandText.textContent = text.toUpperCase();
    
    if (isScanning) {
      dynamicIsland.classList.add('scanning');
    } else {
      dynamicIsland.classList.remove('scanning');
      islandText.style.display = 'block';
      setTimeout(() => {
        islandText.style.display = 'none';
      }, duration);
    }
  }

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSynthSound(type) {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    try {
      const now = audioCtx.currentTime;

      if (type === 'beep') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.08);
      } 
      else if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(60, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.04);
      } 
      else if (type === 'scanline') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.3);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.3);
      } 
      else if (type === 'shutter') {
        const bufferSize = audioCtx.sampleRate * 0.12;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 1100;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now); noise.stop(now + 0.12);
      } 
      else if (type === 'success') {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square'; osc2.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(783.99, now + 0.1); // G5
        osc1.frequency.setValueAtTime(1174.66, now + 0.2); // D6
        osc2.frequency.setValueAtTime(587.33 * 0.5, now);
        osc2.frequency.setValueAtTime(783.99 * 0.5, now + 0.1);
        osc2.frequency.setValueAtTime(1174.66 * 0.5, now + 0.2);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(now); osc2.start(now);
        osc1.stop(now + 0.45); osc2.stop(now + 0.45);
      }
      else if (type === 'failure') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn("Sound synthesis locked: ", e);
    }
  }

  function playSynthesizedCrunch(visualizeCallback) {
    if (!state.audioEnabled) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const duration = 0.7;

    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1600;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    const subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(analyser);
    subOsc.connect(subGain); subGain.connect(analyser);
    analyser.connect(audioCtx.destination);

    noise.start(now); noise.stop(now + duration);
    subOsc.start(now); subOsc.stop(now + duration);

    if (visualizeCallback) visualizeCallback(analyser, duration);
  }

  // --- NATIVE TAB ROUTER NAVIGATION ---
  function switchTab(tabId) {
    state.currentTab = tabId;
    
    // Manage section displays
    screens.welcome.classList.remove('active');
    Object.keys(screens).forEach(key => {
      if (key === tabId) {
        screens[key].classList.add('active');
      } else {
        screens[key].classList.remove('active');
      }
    });

    // Update bottom tab active classes
    document.querySelectorAll('.tab-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Collapse drawers & close preset chamber
    telemetryDrawer.classList.remove('expanded');
    presetContainer.classList.add('hidden');

    // Camera hardware states
    if (tabId === 'chamberTab') {
      startCameraLens();
    } else {
      stopCameraLens();
    }

    if (tabId === 'logsTab') {
      renderHistoricalLogs();
    }

    playSynthSound('click');
  }

  // Attach bottom navigation listeners
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  // Welcome button route
  btnEnterChamber.addEventListener('click', () => {
    bottomTabBar.style.display = 'flex';
    switchTab('chamberTab');
    triggerIslandPopup("LENSE ACTV", false, 2000);
  });

  // Telemetry Bottom drawer sheet toggler
  telemetryDrawerHeader.addEventListener('click', () => {
    telemetryDrawer.classList.toggle('expanded');
    playSynthSound('click');
  });

  // --- CAMERA LENS & Vision Feed Engine ---
  async function startCameraLens() {
    state.selectedPresetSnack = null;
    presetContainer.classList.add('hidden');
    videoElement.style.display = 'block';
    detectionCanvas.style.display = 'block';
    hudChamberMode.textContent = 'WEB-CAM ACTIVE';
    logConsole("Vision grid locking target...");

    const constraints = {
      video: { facingMode: 'environment', width: { ideal: 480 }, height: { ideal: 640 } },
      audio: false
    };

    try {
      state.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = state.stream;
      videoElement.onloadedmetadata = () => {
        detectionCanvas.width = videoElement.videoWidth;
        detectionCanvas.height = videoElement.videoHeight;
        startDetectionLoop();
        btnTriggerScan.classList.remove('disabled');
      };
      
      logConsole("[OK] Camera matrix initialized.");
      loadTFModel();
    } catch (e) {
      console.warn("Camera locked: ", e);
      logConsole("[ERROR] Proximity camera blocked.", 'pink');
      logConsole("[EMULATOR] Initiating synthetic specimen pod fallback.", 'amber');
      startPresetEmulatorMode();
    }
  }

  function stopCameraLens() {
    state.detectionActive = false;
    btnTriggerScan.classList.add('disabled');
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      state.stream = null;
    }
    videoElement.srcObject = null;
  }

  function startPresetEmulatorMode() {
    state.selectedPresetSnack = null;
    videoElement.style.display = 'none';
    detectionCanvas.style.display = 'none';
    hudChamberMode.textContent = 'SPECIMEN EMULATOR';
    presetContainer.classList.remove('hidden');
    
    document.querySelectorAll('.preset-native-btn').forEach(btn => btn.classList.remove('selected'));
    logConsole("Containment block empty. Choose snack emulator...", 'amber');
    loadTFModel(); // load behind scenes anyway
  }

  // Toggle button between Camera & Emulator
  btnToggleScannerMode.addEventListener('click', () => {
    playSynthSound('beep');
    if (presetContainer.classList.contains('hidden')) {
      stopCameraLens();
      startPresetEmulatorMode();
      btnToggleScannerMode.textContent = 'ACTIVATE CAMERA';
    } else {
      presetContainer.classList.add('hidden');
      startCameraLens();
      btnToggleScannerMode.textContent = 'EMULATE SPECIMEN';
    }
  });

  // Hud audio toggle controller
  let audioHudEnabled = true;
  document.getElementById('btnHudAudioToggle').addEventListener('click', () => {
    audioHudEnabled = !audioHudEnabled;
    state.audioEnabled = audioHudEnabled;
    chkAudioEnable.checked = audioHudEnabled;
    
    document.getElementById('btnHudAudioToggle').textContent = audioHudEnabled ? '🔊' : '🔇';
    playSynthSound('beep');
  });

  // Settings Audio switch binding
  chkAudioEnable.addEventListener('change', (e) => {
    state.audioEnabled = e.target.checked;
    audioHudEnabled = e.target.checked;
    document.getElementById('btnHudAudioToggle').textContent = audioHudEnabled ? '🔊' : '🔇';
    playSynthSound('beep');
  });

  // settings Vision switch binding
  chkVisionEnable.addEventListener('change', (e) => {
    state.visionEnabled = e.target.checked;
    playSynthSound('beep');
    if (!state.visionEnabled) {
      const ctx = detectionCanvas.getContext('2d');
      ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
    }
  });

  // settings radio change binds
  document.querySelectorAll('input[name="aiMood"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.aiMood = e.target.value;
      playSynthSound('beep');
      triggerIslandPopup(`MOOD: ${state.aiMood}`, false, 1500);
    });
  });

  // Settings slider binds
  sliderSarcasm.addEventListener('input', (e) => {
    state.sarcasmIntensity = e.target.value;
  });

  // --- TENSORFLOW COCO-SSD INITIALIZATION ---
  async function loadTFModel() {
    if (state.model || state.modelLoading) return;
    state.modelLoading = true;
    triggerIslandPopup("ARMING TF", true);

    try {
      if (typeof cocoSsd !== 'undefined') {
        state.model = await cocoSsd.load({ base: 'lite' });
        logConsole("[OK] TensorFlow vision loaded.");
        triggerIslandPopup("TF READY", false, 1500);
      } else {
        throw new Error("TF script not found");
      }
    } catch (e) {
      console.warn("TF.js download error: ", e);
      logConsole("[WARNING] Neural vision offline. Emulated biosensors active.", 'amber');
    } finally {
      state.modelLoading = false;
      dynamicIsland.classList.remove('scanning');
    }
  }

  // --- LIVE CAMERA CLASSIFICATION FRAME LOOP ---
  let lastTime = 0;
  function startDetectionLoop() {
    state.detectionActive = true;
    requestAnimationFrame(detectFrame);
  }

  async function detectFrame(timestamp) {
    if (!state.detectionActive || !videoElement.srcObject) return;

    // Simulated FPS
    const fps = Math.round(1000 / (timestamp - lastTime));
    lastTime = timestamp;
    telFPS.textContent = `${isNaN(fps) ? 30 : Math.min(fps, 60)} hz`;

    if (state.model && videoElement.readyState === 4) {
      try {
        const predictions = await state.model.detect(videoElement);
        
        if (state.visionEnabled) {
          drawPredictions(predictions);
        } else {
          const ctx = detectionCanvas.getContext('2d');
          ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
        }
        
        processPredictions(predictions);
      } catch (e) {
        console.error("Vision cycle error: ", e);
      }
    } else {
      drawMockDetections();
    }

    if (state.detectionActive) {
      requestAnimationFrame(detectFrame);
    }
  }

  function drawPredictions(predictions) {
    const ctx = detectionCanvas.getContext('2d');
    ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255, 0, 127, 0.4)';
      ctx.shadowBlur = 6;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = 'rgba(10, 10, 16, 0.85)';
      ctx.shadowBlur = 0;
      ctx.fillRect(x, y - 22, Math.max(100, prediction.class.length * 8), 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillText(`${prediction.class.toUpperCase()} [${Math.round(prediction.score * 100)}%]`, x + 5, y - 7);
    });
  }

  function drawMockDetections() {
    if (!state.visionEnabled) return;
    const ctx = detectionCanvas.getContext('2d');
    ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
    
    const t = Date.now() * 0.002;
    const boxW = 160 + Math.sin(t) * 15;
    const boxH = 160 + Math.cos(t) * 15;
    const x = (detectionCanvas.width - boxW) / 2;
    const y = (detectionCanvas.height - boxH) / 2;

    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.setLineDash([]);

    state.detectedClass = "SUSPICIOUS EDIBLE MATTER";
    drawerClass.textContent = "SPECIMEN DETECTED";
    telConfidence.textContent = `${(85 + Math.sin(t) * 10).toFixed(2)}%`;
    updateTelemetrySliders(75 + Math.sin(t) * 8, 88 + Math.cos(t) * 5, 92 + Math.sin(t * 0.8) * 3);
  }

  const snackClassTranslation = {
    'bottle': 'Liquid Chemical Ingestion Capsule',
    'cup': 'Hydraulic Sugar Delivery Vessel',
    'banana': 'Existential Radioactive Curved Yellow Tube',
    'apple': 'Prototypical Organic Vitamin Capsule',
    'orange': 'Citric Acid Scurvy Blocker',
    'sandwich': 'Starch-Gluten Solid Press-Pack',
    'pizza': 'Gourmet Coagulated Wheat Crust Wheel',
    'donut': 'Infinite Carbohydrate Black Hole',
    'cake': 'Birthday Procrastination Sponge Block',
    'hot dog': 'Suspicious Casing Industrial Protein Slug'
  };

  function processPredictions(predictions) {
    if (predictions.length === 0) {
      drawerClass.textContent = "CHAMBER EMPTY";
      telConfidence.textContent = "0.00%";
      updateTelemetrySliders(15, 20, 25);
      return;
    }

    const mainDetection = predictions.sort((a, b) => b.score - a.score)[0];
    const rawClass = mainDetection.class;
    const humorousClass = snackClassTranslation[rawClass] || `${rawClass.toUpperCase()} (SUSPECT MATTER)`;
    
    state.detectedClass = humorousClass;
    state.detectedConfidence = mainDetection.score;

    drawerClass.textContent = humorousClass.toUpperCase();
    telConfidence.textContent = `${(mainDetection.score * 100).toFixed(2)}%`;

    let presVal = 40, chaosVal = 55, regretVal = 65;

    if (['bottle', 'cup'].includes(rawClass)) {
      presVal = 96; chaosVal = 78; regretVal = 82;
    } else if (['banana', 'apple', 'orange'].includes(rawClass)) {
      presVal = 2; chaosVal = 10; regretVal = 5;
    } else if (['pizza', 'sandwich', 'donut', 'cake', 'hot dog'].includes(rawClass)) {
      presVal = 86; chaosVal = 94; regretVal = 90;
    }

    updateTelemetrySliders(presVal, chaosVal, regretVal);
  }

  function updateTelemetrySliders(pres, vibe, regret) {
    barPreservatives.style.width = `${pres}%`;
    barVibe.style.width = `${vibe}%`;
    barRegret.style.width = `${regret}%`;
  }

  function logConsole(message, statusClass = 'green') {
    const p = document.createElement('p');
    p.className = `console-line text-${statusClass}`;
    p.innerHTML = `&gt; ${message}`;
    scannerTicker.appendChild(p);
    scannerTicker.scrollTop = scannerTicker.scrollHeight;
  }

  // --- MANUAL PRESET MOCK SELECTION CONTROL ---
  const presetData = {
    'spicy_chips': {
      class: 'Emotionally Exhausted Spicy Chips',
      preservative: 98, chaos: 96, regret: 94,
      color: { r: 255, g: 0, b: 60 },
      aura: 'VOLATILE NEON CHAOS'
    },
    'ramen': {
      class: 'Anxious Midnight Instant Noodles',
      preservative: 92, chaos: 84, regret: 80,
      color: { r: 255, g: 183, b: 3 },
      aura: 'MSG SATURATED DELIRIUM'
    },
    'energy_drink': {
      class: 'Aggressively Carbonated Anxiety Elixir',
      preservative: 99, chaos: 98, regret: 99,
      color: { r: 155, g: 93, b: 229 },
      aura: 'ARRHYTHMIC RADAR SHOCK'
    },
    'cookie': {
      class: 'Sad Desk-Drawer Chocolate Cookie',
      preservative: 65, chaos: 45, regret: 55,
      color: { r: 139, g: 69, b: 19 },
      aura: 'SUGAR COATED COPING'
    },
    'pizza': {
      class: 'Suspicious 3-AM Congealed Pizza Slice',
      preservative: 88, chaos: 89, regret: 92,
      color: { r: 247, g: 127, b: 0 },
      aura: 'GREASY COGNITIVE RETRO'
    },
    'banana': {
      class: 'Existential Radioactive Curved Yellow Tube',
      preservative: 2, chaos: 15, regret: 5,
      color: { r: 57, g: 255, b: 20 },
      aura: 'DECEPTIVE HEALTH MATRIX'
    }
  };

  document.querySelectorAll('.preset-native-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      document.querySelectorAll('.preset-native-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      const snackKey = btn.dataset.snack;
      const data = presetData[snackKey];
      state.selectedPresetSnack = snackKey;

      // Force emulator telemetry states
      state.detectedClass = data.class;
      state.detectedConfidence = 0.9992;
      state.dominantColor = data.color;
      state.auraName = data.aura;

      drawerClass.textContent = data.class.toUpperCase();
      telConfidence.textContent = "99.98% (EMU)";
      updateTelemetrySliders(data.preservative, data.chaos, data.regret);

      logConsole(`Chamber containment: ${data.class} loaded.`, 'green');
      btnTriggerScan.classList.remove('disabled');
      triggerIslandPopup("SPECIMEN LOCK", false, 1500);
    });
  });

  // --- NATIVE CAMERA SHUTTER TRIGGER DEEP SCAN SEQUENCE ---
  btnTriggerScan.addEventListener('click', () => {
    if (btnTriggerScan.classList.contains('disabled')) return;

    playSynthSound('shutter');
    stopCameraLens();
    
    // Trigger large expanding notch island
    triggerIslandPopup("DEEP SCANNING...", true);
    loaderOverlay.classList.add('active');

    let progress = 0;
    const bar = document.getElementById('loaderBarInner');
    const label = document.getElementById('loadingStageText');
    const sub = document.getElementById('loadingSubText');

    const steps = [
      { p: 15, l: "SPECTROGRAM CALIBRATION...", s: "Aligning biosensor lenses..." },
      { p: 40, l: "MSG SPECTRAL ANALYSIS...", s: "Warning: High sodium density detected..." },
      { p: 65, l: "CRUNCH FREQUENCY AUDITING...", s: "Evaluating decibel count on crisp matrix..." },
      { p: 85, l: "SOCIOECONOMIC FORECASTING...", s: "Roasting snack brand discount tiers..." },
      { p: 100, l: "BIO-DIAGNOSTIC COMPLETE.", s: "Compiling printable log ticket." }
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      progress += 2;
      if (progress > 100) progress = 100;
      
      bar.style.width = `${progress}%`;

      if (Math.round(progress) % 10 === 0) {
        playSynthSound('scanline');
      }

      if (currentStep < steps.length && progress >= steps[currentStep].p) {
        label.textContent = steps[currentStep].l;
        sub.textContent = steps[currentStep].s;
        currentStep++;
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loaderOverlay.classList.remove('active');
          triggerIslandPopup("SUCCESS", false, 1500);
          
          generateFinalReportCard();
          playSynthSound('success');
          resultsView.classList.add('active');
          initAuraVisualizer();
        }, 600);
      }
    }, 40);
  });

  btnBackFromResults.addEventListener('click', () => {
    playSynthSound('click');
    resultsView.classList.remove('active');
    switchTab('chamberTab');
  });

  // --- PERSISTENT LOGS DATABASE PROCEDURAL LOGGING ---

  const dynamicRoasts = {
    cynical: {
      tiers: ["IMPOVERISHED DEV RATION", "UPPER-CLASS KETTLE CHIP ELITIST", "PANIC WORKPLACE FUEL", "COMPROMISED TECH-BRO DIET PARADOX"],
      tastingNotes: [
        "Synthetic seasoning, keyboard dust, and severe procrastination.",
        "Overwhelming crunch density, 3 AM compiler failures, and minor loss of dignity.",
        "Industrial carbon, localized high sodium, and active existential dread."
      ],
      audits: [
        "Subject is eating this snack in direct response to calendar meeting dread. Vibe check: Endangered.",
        "Specimen survived multiple generational epochs. Subject, however, will crash immediately from glucose overload.",
        "Diagnostics indicate severe code debugging failures in surrounding telemetry. Touch grass immediately."
      ]
    },
    chaotic: {
      tiers: ["CONVENIENCE STORE APOCALYPSE CRUMB", "MSG OVERLORD DELIRIUM TILE", "LATE NIGHT REBEL DUST"],
      tastingNotes: [
        "Pure Monosodium Glutamate vibration, artificial food dye #40, and pure chaos.",
        "Aggressive grease washes, absolute disregard for cardiovascular health, and pixel dust.",
        "Artificial carbonated panic compounds combined with pure midnight madness."
      ],
      audits: [
        "SPECIMEN MSG SPECTRA EXCEEDS SAFETY STANDARDS. Subject is ascending into pure sodium consciousness.",
        "Dietary choices suggest user operates entirely on chaos theory. Vibe check: HIGH STRESS APOCALYPSE.",
        "The crispy profile of this specimen has induced a seismic sensor spike. Recommend sharing with a highly confused peer."
      ]
    },
    cruel: {
      tiers: ["DEFEATED HACKER TRASH", "RECESSION LEVEL SURVIVAL LOG", "GLORIFIED PLASTIC SLUDGE"],
      tastingNotes: [
        "Sad stale crumbs, severe disappointment, and active physical decay.",
        "Reminiscent of absolute despair, college student budgeting failures, and direct physical regret.",
        "Tastes exactly like the chemical floor cleaner at the convenience store it was panic-purchased from."
      ],
      audits: [
        "Are you actively trying to punish your internal digestive organs? Vibe check: Severe failure of basic self-respect.",
        "This specimen is 98% cardboard by weight. The biological carbon footprint of this ingestive choice is embarrassing.",
        "You are actively avoiding closing Slack. No amount of monosodium glutamate can make up for your poor scheduling decisions."
      ]
    },
    fruit: {
      tiers: ["DECEPTIVE HEALTH POSTURER", "EXISTENTIAL VITAMIN ABSORBER", "ORGANIC REBOOT PARADOX"],
      tastingNotes: [
        "実際の果糖. Notes of pure clean water, actual soil enzymes, and intolerable moral superiority.",
        "Fibrous natural structures, natural vitamins, and a distinct lack of deep deep happiness.",
        "Citric acid blocker complexes, clean carbon, and a mild regret that this isn't a doughnut."
      ],
      audits: [
        "Subject is attempting a comprehensive biological reboot. App forecast predicts healthy decisions will fail in 24 hours.",
        "Natural glucose detected. Vision sensors verify user has successfully avoided synthetic crimes... for now.",
        "Bio-readings are abnormally stable. Recommendation: Ingest aggressive chemical dye snacks immediately to balance system metrics."
      ]
    }
  };

  function generateFinalReportCard() {
    const scanId = `#9${Math.floor(1000 + Math.random() * 9000)}-${state.aiMood.toUpperCase().charAt(0)}${Math.floor(10 + Math.random() * 90)}`;
    recScanId.textContent = scanId;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    recTimestamp.textContent = formattedDate;

    let specimenName = state.detectedClass;
    let isFruit = false;

    if (specimenName.toLowerCase().includes('banana') || 
        specimenName.toLowerCase().includes('apple') || 
        specimenName.toLowerCase().includes('orange') || 
        specimenName.toLowerCase().includes('broccoli')) {
      isFruit = true;
    }

    recDetected.textContent = specimenName.toUpperCase();

    // Stats calculations
    let presVal = isFruit ? Math.floor(1 + Math.random() * 5) : Math.floor(84 + Math.random() * 16);
    let crunchVal = isFruit ? (2 + Math.random() * 3).toFixed(1) : (8 + Math.random() * 2).toFixed(1);
    let impVal = Math.floor(72 + Math.random() * 28);

    recMSG.textContent = isFruit ? '0.00% (DISAPPOINTING)' : `${(85 + Math.random() * 15).toFixed(1)}%`;
    recCrunch.textContent = `${crunchVal} / 10.0`;
    recImpulsivity.textContent = `${impVal}%`;

    // Mood matrices selector
    const pool = isFruit ? dynamicRoasts.fruit : (dynamicRoasts[state.aiMood] || dynamicRoasts.cynical);
    const hash = scanId.charCodeAt(2) + scanId.charCodeAt(3);
    
    const tierText = pool.tiers[hash % pool.tiers.length];
    const tastingText = pool.tastingNotes[hash % pool.tastingNotes.length];
    const auditText = pool.audits[hash % pool.audits.length];

    recTier.textContent = tierText;
    recNotes.textContent = `"${tastingText}"`;
    recAudit.textContent = `"${auditText}"`;

    if (!state.selectedPresetSnack) {
      analyzeFrameColor();
    }

    // Save scan to persistent localStorage database!
    const newLog = {
      id: scanId,
      timestamp: formattedDate,
      name: specimenName,
      tier: tierText,
      tasting: tastingText,
      audit: auditText,
      msg: recMSG.textContent,
      crunch: recCrunch.textContent,
      impulsivity: recImpulsivity.textContent,
      category: isFruit ? 'healthy' : 'dangerous',
      color: state.dominantColor,
      aura: state.auraName
    };

    state.historyLogs.unshift(newLog); // prepend
    localStorage.setItem('snacksense_logs', JSON.stringify(state.historyLogs));
  }

  function analyzeFrameColor() {
    try {
      const ctx = detectionCanvas.getContext('2d');
      const microGrid = ctx.getImageData(detectionCanvas.width / 2 - 15, detectionCanvas.height / 2 - 15, 30, 30);
      const data = microGrid.data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2];
      }
      const pCount = data.length / 4;
      state.dominantColor = { r: Math.round(r/pCount), g: Math.round(g/pCount), b: Math.round(b/pCount) };

      const { r: dr, g: dg, b: db } = state.dominantColor;
      if (dr > dg && dr > db) state.auraName = 'SUGAR INDUCED VOLATILE RED';
      else if (dg > dr && dg > db) state.auraName = 'RADIOACTIVE MSG LIME GREEN';
      else if (db > dr && db > dg) state.auraName = 'EXHAUSTED HACKATHON BLUE';
      else state.auraName = 'convenience Store CYBER GLOW';
    } catch(e) {
      state.dominantColor = { r: 255, g: 0, b: 127 }; // default pink
      state.auraName = 'convenience Store CYBER GLOW';
    }
  }

  // --- RENDER HISTORICAL CELL TABLE LOGS ---
  const logsContainer = document.getElementById('logsContainer');
  const emptyLogsPlaceholder = document.getElementById('emptyLogsPlaceholder');

  function renderHistoricalLogs() {
    // Clear list but retain empty placeholder
    logsContainer.innerHTML = '';
    logsContainer.appendChild(emptyLogsPlaceholder);

    if (state.historyLogs.length === 0) {
      emptyLogsPlaceholder.style.display = 'block';
      return;
    }

    emptyLogsPlaceholder.style.display = 'none';

    state.historyLogs.forEach(log => {
      const cell = document.createElement('div');
      cell.className = 'log-item-cell';
      cell.innerHTML = `
        <div class="log-cell-left">
          <span class="log-cell-name">${log.name.toUpperCase()}</span>
          <span class="log-cell-meta">${log.timestamp} // ID: ${log.id}</span>
          <span class="log-cell-badge ${log.category}">${log.category.toUpperCase()}</span>
        </div>
        <div class="log-cell-arrow">&gt;</div>
      `;

      // Cell click triggers sliding results modal loaded with historical log!
      cell.addEventListener('click', () => {
        playSynthSound('beep');
        loadHistoricalLogIntoReceipt(log);
        resultsView.classList.add('active');
        initAuraVisualizer();
      });

      logsContainer.appendChild(cell);
    });
  }

  function loadHistoricalLogIntoReceipt(log) {
    recScanId.textContent = log.id;
    recTimestamp.textContent = log.timestamp;
    recDetected.textContent = log.name.toUpperCase();
    recMSG.textContent = log.msg;
    recCrunch.textContent = log.crunch;
    recImpulsivity.textContent = log.impulsivity;
    recTier.textContent = log.tier;
    recNotes.textContent = `"${log.tasting}"`;
    recAudit.textContent = `"${log.audit}"`;
    
    state.dominantColor = log.color || { r: 255, g: 0, b: 127 };
    state.auraName = log.aura || 'CYBER GLOW';
  }

  // Settings Clear list database button
  btnClearLogs.addEventListener('click', () => {
    if (state.historyLogs.length === 0) return;
    
    playSynthSound('failure');
    state.historyLogs = [];
    localStorage.removeItem('snacksense_logs');
    renderHistoricalLogs();
    triggerIslandPopup("DB WIPED", false, 1500);
  });

  // --- HTML5 CANVAS PARTICLE AURA GRADIENT ---
  let auraAnimFrame = null;
  function initAuraVisualizer() {
    const ctx = auraCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = auraCanvas.getBoundingClientRect();
    auraCanvas.width = rect.width * dpr;
    auraCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    document.getElementById('auraName').textContent = state.auraName;
    document.getElementById('auraName').style.color = `rgb(${state.dominantColor.r}, ${state.dominantColor.g}, ${state.dominantColor.b})`;
    document.getElementById('auraStability').textContent = `${Math.floor(4 + Math.random() * 18)}% (STRESS LEVEL)`;

    let time = 0;
    function drawAuraFrame() {
      if (!resultsView.classList.contains('active')) {
        cancelAnimationFrame(auraAnimFrame);
        return;
      }

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const rgbStr = `${state.dominantColor.r}, ${state.dominantColor.g}, ${state.dominantColor.b}`;
      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, w, h);

      // Radial fluid gradients
      for (let i = 0; i < 3; i++) {
        const grad = ctx.createRadialGradient(
          w / 2 + Math.sin(time * 0.025 + i) * (w / 3.5),
          h / 2 + Math.cos(time * 0.02 + i) * (h / 4.5),
          8,
          w / 2 + Math.sin(time * 0.025 + i) * (w / 3.5),
          h / 2 + Math.cos(time * 0.02 + i) * (h / 4.5),
          w * 0.75
        );
        const alpha = 0.38 - i * 0.1;
        grad.addColorStop(0, `rgba(${rgbStr}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 0, 127, ${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Tech scanner grids
      ctx.strokeStyle = `rgba(${rgbStr}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 25) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 25) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Sweep line
      const lineY = (time * 1.3) % h;
      ctx.strokeStyle = `rgba(${rgbStr}, 0.45)`;
      ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(w, lineY); ctx.stroke();

      time += 0.55;
      auraAnimFrame = requestAnimationFrame(drawAuraFrame);
    }
    drawAuraFrame();
  }

  // --- AUDIO FREQUENCY OSCILLOSCOPE ---
  let oscAnimFrame = null;
  btnPlayCrunchWave.addEventListener('click', () => {
    playSynthSound('beep');
    playSynthesizedCrunch((analyser, duration) => {
      drawOscilloscope(analyser, duration);
    });
  });

  function drawOscilloscope(analyser, duration) {
    const ctx = oscilloscopeCanvas.getContext('2d');
    const w = oscilloscopeCanvas.width;
    const h = oscilloscopeCanvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const startTime = Date.now();

    function draw() {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > duration + 0.1) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 0, 127, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < h; y += 15) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = 'rgba(255, 0, 127, 0.6)';
      ctx.shadowBlur = 5;
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    draw();
  }

  // --- PNG CARD DOWNLOAD HANDLER ---
  btnDownloadReceipt.addEventListener('click', () => {
    playSynthSound('beep');
    triggerIslandPopup("EXPORTING...", false, 1500);

    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 920;
    const ctx = canvas.getContext('2d');

    // Solid receipt background
    ctx.fillStyle = '#f6f8fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1a202c'; ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("SNACKSENSE™ BIO-REPORT", canvas.width / 2, 60);

    ctx.font = '16px "Share Tech Mono", monospace';
    ctx.fillText("AURA LABS NEURAL RESEARCH", canvas.width / 2, 90);
    ctx.fillText("----------------------------------------------", canvas.width / 2, 115);

    ctx.textAlign = 'left';
    ctx.font = '18px "Share Tech Mono", monospace';
    ctx.fillText(`SCAN_ID:   ${recScanId.textContent}`, 50, 150);
    ctx.fillText(`TIMESTAMP: ${recTimestamp.textContent}`, 50, 185);
    ctx.fillText(`BIO_LENSE: MOBILE_VISION`, 50, 220);

    ctx.textAlign = 'center';
    ctx.fillText("----------------------------------------------", canvas.width / 2, 250);

    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Orbitron", sans-serif';
    ctx.fillText("SPECIMEN DIAGNOSTICS:", 50, 285);

    ctx.font = '18px "Share Tech Mono", monospace';
    ctx.fillText(`SPECIMEN:          ${recDetected.textContent}`, 50, 330);
    ctx.fillText(`MSG SATURATION:    ${recMSG.textContent}`, 50, 370);
    ctx.fillText(`CRUNCH INDEX:      ${recCrunch.textContent}`, 50, 410);
    ctx.fillText(`IMPULSIVITY RATIO: ${recImpulsivity.textContent}`, 50, 450);

    ctx.textAlign = 'center';
    ctx.fillText("----------------------------------------------", canvas.width / 2, 490);

    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Orbitron", sans-serif';
    ctx.fillText("PSYCHOSOCIAL ANALYSIS:", 50, 525);

    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillText(`SOCIOECONOMIC TIER:`, 50, 570);
    ctx.fillStyle = '#b7791f';
    ctx.fillText(recTier.textContent, 260, 570);

    ctx.fillStyle = '#000';
    ctx.fillText(`AI TASTING NOTES:`, 50, 610);
    ctx.font = 'italic 16px "Share Tech Mono", monospace';
    wrapText(ctx, recNotes.textContent, 50, 640, 500, 22);

    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillText(`ANTHROPOLOGICAL DIAGNOSIS:`, 50, 710);
    ctx.font = '16px "Share Tech Mono", monospace';
    wrapText(ctx, recAudit.textContent, 50, 740, 500, 22);

    ctx.textAlign = 'center';
    ctx.font = '54px "Share Tech Mono", monospace';
    ctx.fillText("||||| | ||||| ||| | ||| ||||", canvas.width / 2, 835);
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.fillText("SYSTEM_DETERMINISTIC_CHAOS // POWERED BY AURA LABS", canvas.width / 2, 865);

    try {
      const link = document.createElement('a');
      link.download = `snacksense_mobile_log_${recScanId.textContent}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      triggerIslandPopup("SAVED TO ALBUM", false, 1500);
    } catch (e) {
      console.error("Canvas write failed: ", e);
    }
  });

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = context.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
  }

  // --- COPY SHAREABLE MOBILE TICKET CARD ---
  btnShareCopy.addEventListener('click', () => {
    playSynthSound('beep');
    const shareText = `📱 --- SNACKSENSE™ BIO-REPORT ---
Scan Chamber ID: ${recScanId.textContent}
Specimen locked: ${recDetected.textContent}
MSG Saturation:  ${recMSG.textContent}
Crunch Rating:   ${recCrunch.textContent}

Socioeconomic:   ${recTier.textContent}
AI Tasting Logs: ${recNotes.textContent}
Anthropological Diagnostic: ${recAudit.textContent}
-------------------------------------
POWERED BY AURA LABS // AURA360STUDIO`;

    navigator.clipboard.writeText(shareText).then(() => {
      const originalText = btnShareCopy.querySelector('span').textContent;
      btnShareCopy.querySelector('span').textContent = '✔ LOGGED TO SYSTEM GALLERY!';
      triggerIslandPopup("COPIED TICKET", false, 1500);
      setTimeout(() => {
        btnShareCopy.querySelector('span').textContent = originalText;
      }, 2000);
    }).catch(e => console.warn(e));
  });

});
