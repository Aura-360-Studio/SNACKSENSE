/* ==========================================================================
   SNACKSENSE™ UIFIED DUAL-LAYOUT CORE ENGINE // DESKTOP & MOBILE SYNCHRONIZER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- APPLICATION STATE ---
  const state = {
    audioEnabled: true,
    visionEnabled: true,
    stream: null,
    model: null,
    modelLoading: false,
    detectionActive: false,
    selectedPresetSnack: null,
    aiMood: 'cynical', // cynical, chaotic, cruel
    sarcasmIntensity: 85,
    msgWarningThreshold: 80,
    detectedClass: 'Awaiting specimen...',
    detectedConfidence: 0,
    dominantColor: { r: 57, g: 255, b: 20 }, // green
    auraName: 'ACTIVE GRIDS',
    historyLogs: JSON.parse(localStorage.getItem('snacksense_logs')) || []
  };

  // --- DUAL SELECTORS DICTIONARY ---
  const ui = {
    // Layout switches
    isDesktop: () => window.innerWidth > 768,
    
    // Core feeds
    video: () => ui.isDesktop() ? document.getElementById('desktopVideo') : document.getElementById('mobileVideo'),
    canvas: () => ui.isDesktop() ? document.getElementById('desktopCanvas') : document.getElementById('mobileCanvas'),
    
    // Telemetry text outputs
    telClass: () => ui.isDesktop() ? document.getElementById('d-telClass') : document.getElementById('m-drawerClass'),
    telConfidence: () => ui.isDesktop() ? document.getElementById('d-telConfidence') : document.getElementById('m-telConfidence'),
    telFPS: () => ui.isDesktop() ? document.getElementById('d-telFPS') : document.getElementById('m-telFPS'),
    
    // Telemetry bar tracks
    barPreservatives: () => ui.isDesktop() ? document.getElementById('d-barPreservatives') : document.getElementById('m-barPreservatives'),
    barVibe: () => ui.isDesktop() ? document.getElementById('d-barVibe') : document.getElementById('m-barVibe'),
    barRegret: () => ui.isDesktop() ? document.getElementById('d-barRegret') : document.getElementById('m-barRegret'),
    
    // Model Loaders
    modelSpinner: () => document.getElementById('d-modelSpinner'),
    presetContainer: () => ui.isDesktop() ? document.getElementById('d-presetContainer') : document.getElementById('m-presetContainer'),
    
    // Ticker Console logs
    consoleTicker: () => ui.isDesktop() ? document.getElementById('d-consoleTicker') : document.getElementById('m-scannerTickerConsole'),
    
    // Receipt Output decks
    recScanId: () => document.querySelectorAll('#d-recScanId, #m-recScanId'),
    recTimestamp: () => document.querySelectorAll('#d-recTimestamp, #m-recTimestamp'),
    recDetected: () => document.querySelectorAll('#d-recDetected, #m-recDetected'),
    recMSG: () => document.querySelectorAll('#d-recMSG, #m-recMSG'),
    recCrunch: () => document.querySelectorAll('#d-recCrunch, #m-recCrunch'),
    recImpulsivity: () => document.querySelectorAll('#d-recImpulsivity, #m-recImpulsivity'),
    recTier: () => document.querySelectorAll('#d-recTier, #m-recTier'),
    recNotes: () => document.querySelectorAll('#d-recNotes, #m-recNotes'),
    recAudit: () => document.querySelectorAll('#d-recAudit, #m-recAudit')
  };

  // --- NATIVE MOBILE APP SPECIFIC TABS ROUTING ---
  function switchMobileTab(tabId) {
    const screens = {
      'm-welcomeScreen': document.getElementById('m-welcomeScreen'),
      'm-chamberTab': document.getElementById('m-chamberTab'),
      'm-logsTab': document.getElementById('m-logsTab'),
      'm-settingsTab': document.getElementById('m-settingsTab')
    };

    // Collapse drawer header
    document.getElementById('m-telemetryDrawer').classList.remove('expanded');
    document.getElementById('m-presetContainer').classList.add('hidden');

    Object.keys(screens).forEach(key => {
      if (key === tabId) {
        screens[key].classList.add('active');
      } else {
        screens[key].classList.remove('active');
      }
    });

    // Update bottom tab buttons active status
    document.querySelectorAll('.tab-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (tabId === 'm-chamberTab') {
      startCameraLens();
    } else {
      stopCameraLens();
    }

    if (tabId === 'm-logsTab') {
      renderHistoricalLogs();
    }

    playSynthSound('click');
  }

  // Bind mobile specific tab items
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      switchMobileTab(item.dataset.tab);
    });
  });

  // Mobile enter button
  document.getElementById('m-btnEnterChamber').addEventListener('click', () => {
    switchMobileTab('m-chamberTab');
    triggerIslandPopup("LENSE ACTV", false, 2000);
  });

  // Mobile Telemetry Bottom drawer sheet toggler
  document.getElementById('m-telemetryDrawerHeader').addEventListener('click', () => {
    document.getElementById('m-telemetryDrawer').classList.toggle('expanded');
    playSynthSound('click');
  });

  // --- MOBILE STATUS BAR UPDATE SYSTEM ---
  function updateSystemStatusBar() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('statusBarTime').textContent = timeStr;
  }
  updateSystemStatusBar();
  setInterval(updateSystemStatusBar, 10000);

  // Battery slowly deplete simulation in status bar
  let batteryLife = 89;
  function depleteBattery() {
    batteryLife -= 1;
    if (batteryLife < 5) batteryLife = 98;
    document.getElementById('statusBarBatteryPercent').textContent = `${batteryLife}%`;
    document.getElementById('statusBarBatteryFill').style.width = `${batteryLife}%`;
  }
  setInterval(depleteBattery, 45000);

  function triggerIslandPopup(text, isScanning = false, duration = 3000) {
    const island = document.getElementById('dynamicIsland');
    const txt = document.getElementById('islandText');
    
    txt.textContent = text.toUpperCase();
    if (isScanning) {
      island.classList.add('scanning');
    } else {
      island.classList.remove('scanning');
      txt.style.display = 'block';
      setTimeout(() => {
        txt.style.display = 'none';
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
        osc.connect(gain); gain.connect(audioCtx.destination);
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
        osc.connect(gain); gain.connect(audioCtx.destination);
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
        osc.connect(gain); gain.connect(audioCtx.destination);
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
      console.warn("Sound synthesis blocked: ", e);
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


  // --- DUAL SCREEN CAMERA ENGINE ---
  async function startCameraLens() {
    state.selectedPresetSnack = null;
    ui.presetContainer().classList.add('hidden');
    ui.video().style.display = 'block';
    ui.canvas().style.display = 'block';

    const triggerBtns = document.querySelectorAll('#d-btnTriggerScan, #m-btnTriggerScan');
    triggerBtns.forEach(btn => btn.classList.add('disabled'));

    if (ui.isDesktop()) {
      document.getElementById('d-hudChamberMode').textContent = 'WEB-CAM ACTIVE';
    } else {
      document.getElementById('m-hudChamberMode').textContent = 'WEB-CAM ACTIVE';
    }

    logConsole("Vision grid locking target...");

    const constraints = {
      video: { facingMode: 'environment', width: { ideal: 480 }, height: { ideal: 640 } },
      audio: false
    };

    try {
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }

      state.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const activeVideo = ui.video();
      activeVideo.srcObject = state.stream;
      
      activeVideo.onloadedmetadata = () => {
        const activeCanvas = ui.canvas();
        activeCanvas.width = activeVideo.videoWidth;
        activeCanvas.height = activeVideo.videoHeight;
        startDetectionLoop();
        triggerBtns.forEach(btn => btn.classList.remove('disabled'));
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
    document.querySelectorAll('#d-btnTriggerScan, #m-btnTriggerScan').forEach(btn => btn.classList.add('disabled'));
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      state.stream = null;
    }
    const v = ui.video();
    if (v) v.srcObject = null;
  }

  function startPresetEmulatorMode() {
    state.selectedPresetSnack = null;
    
    // Hide video/canvas
    const vid = ui.video();
    const canv = ui.canvas();
    if (vid) vid.style.display = 'none';
    if (canv) canv.style.display = 'none';

    if (ui.isDesktop()) {
      document.getElementById('d-hudChamberMode').textContent = 'SPECIMEN EMULATOR';
    } else {
      document.getElementById('m-hudChamberMode').textContent = 'SPECIMEN EMULATOR';
    }

    ui.presetContainer().classList.remove('hidden');
    
    // Clear select styling
    document.querySelectorAll('.preset-native-btn, .d-preset-btn').forEach(btn => btn.classList.remove('selected'));
    logConsole("Containment block empty. Choose snack emulator...", 'amber');
    loadTFModel();
  }

  // Emulate Specimen triggers
  const btnToggleDesktop = document.getElementById('d-btnToggleMode');
  const btnToggleMobile = document.getElementById('m-btnToggleScannerMode');

  [btnToggleDesktop, btnToggleMobile].forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      const container = ui.presetContainer();
      if (container.classList.contains('hidden')) {
        stopCameraLens();
        startPresetEmulatorMode();
        btnToggleDesktop.textContent = 'ACTIVATE CAMERA';
        btnToggleMobile.textContent = 'ACTIVATE CAMERA';
      } else {
        container.classList.add('hidden');
        startCameraLens();
        btnToggleDesktop.textContent = 'EMULATE SPECIMEN';
        btnToggleMobile.textContent = 'EMULATE SPECIMEN';
      }
    });
  });


  // --- SETTINGS CONTROLS & STATE SYNCHRONIZER ---
  const sliderSarcasmDesktop = document.getElementById('d-sliderSarcasm');
  const sliderSarcasmMobile = document.getElementById('m-sliderSarcasm');
  const sliderMSGDesktop = document.getElementById('d-sliderMSG');
  const sliderMSGMobile = document.getElementById('m-sliderMSG');

  const lblSarcasm = document.getElementById('d-lblSarcasm');
  const lblMSG = document.getElementById('d-lblMSG');

  // Synchronize sarcasm sliders
  function syncSarcasm(val) {
    state.sarcasmIntensity = val;
    sliderSarcasmDesktop.value = val;
    sliderSarcasmMobile.value = val;
    if (lblSarcasm) lblSarcasm.textContent = `${val}%`;
  }
  sliderSarcasmDesktop.addEventListener('input', (e) => syncSarcasm(e.target.value));
  sliderSarcasmMobile.addEventListener('input', (e) => syncSarcasm(e.target.value));

  // Synchronize MSG warning sliders
  function syncMSG(val) {
    state.msgWarningThreshold = val;
    sliderMSGDesktop.value = val;
    sliderMSGMobile.value = val;
    if (lblMSG) lblMSG.textContent = `${val}%`;
  }
  sliderMSGDesktop.addEventListener('input', (e) => syncMSG(e.target.value));
  sliderMSGMobile.addEventListener('input', (e) => syncMSG(e.target.value));

  // Synchronize AI Mood presets
  function syncAIMood(val) {
    state.aiMood = val;
    document.querySelectorAll(`input[name="d-aiMood"][value="${val}"], input[name="m-aiMood"][value="${val}"]`).forEach(radio => {
      radio.checked = true;
    });
    playSynthSound('beep');
    if (!ui.isDesktop()) {
      triggerIslandPopup(`MOOD: ${val}`, false, 1500);
    } else {
      logConsole(`AI Personality shifted to: ${val.toUpperCase()}`, 'pink');
    }
  }

  document.querySelectorAll('input[name="d-aiMood"], input[name="m-aiMood"]').forEach(radio => {
    radio.addEventListener('change', (e) => syncAIMood(e.target.value));
  });

  // Audio switches
  const chkAudioMobile = document.getElementById('m-chkAudioEnable');
  const badgeAudioDesktop = document.getElementById('d-audioToggle');

  chkAudioMobile.addEventListener('change', (e) => {
    state.audioEnabled = e.target.checked;
    badgeAudioDesktop.textContent = state.audioEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    playSynthSound('beep');
  });

  badgeAudioDesktop.addEventListener('click', () => {
    state.audioEnabled = !state.audioEnabled;
    chkAudioMobile.checked = state.audioEnabled;
    badgeAudioDesktop.textContent = state.audioEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    playSynthSound('beep');
  });


  // --- TENSORFLOW COCO-SSD ENGINE ---
  async function loadTFModel() {
    if (state.model || state.modelLoading) return;
    state.modelLoading = true;
    
    if (ui.isDesktop()) {
      ui.modelSpinner().style.display = 'flex';
    } else {
      triggerIslandPopup("ARMING TF", true);
    }

    try {
      if (typeof cocoSsd !== 'undefined') {
        state.model = await cocoSsd.load({ base: 'lite' });
        logConsole("[OK] TensorFlow vision loaded.");
        if (!ui.isDesktop()) triggerIslandPopup("TF READY", false, 1500);
      } else {
        throw new Error("TF script not found");
      }
    } catch (e) {
      console.warn("TF.js blocked: ", e);
      logConsole("[WARNING] Neural vision offline. Emulated biosensors active.", 'amber');
    } finally {
      state.modelLoading = false;
      ui.modelSpinner().style.display = 'none';
      document.getElementById('dynamicIsland').classList.remove('scanning');
    }
  }

  // --- LIVE FRAME LOOP DETECTION ---
  let lastTime = 0;
  function startDetectionLoop() {
    state.detectionActive = true;
    requestAnimationFrame(detectFrame);
  }

  async function detectFrame(timestamp) {
    if (!state.detectionActive || !ui.video() || !ui.video().srcObject) return;

    // Simulated FPS
    const fps = Math.round(1000 / (timestamp - lastTime));
    lastTime = timestamp;
    ui.telFPS().textContent = `${isNaN(fps) ? 30 : Math.min(fps, 60)} hz`;

    if (state.model && ui.video().readyState === 4) {
      try {
        const predictions = await state.model.detect(ui.video());
        
        if (state.visionEnabled) {
          drawPredictions(predictions);
        } else {
          const ctx = ui.canvas().getContext('2d');
          ctx.clearRect(0, 0, ui.canvas().width, ui.canvas().height);
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
    const ctx = ui.canvas().getContext('2d');
    ctx.clearRect(0, 0, ui.canvas().width, ui.canvas().height);

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
    const ctx = ui.canvas().getContext('2d');
    ctx.clearRect(0, 0, ui.canvas().width, ui.canvas().height);
    
    const t = Date.now() * 0.002;
    const boxW = 160 + Math.sin(t) * 15;
    const boxH = 160 + Math.cos(t) * 15;
    const x = (ui.canvas().width - boxW) / 2;
    const y = (ui.canvas().height - boxH) / 2;

    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.setLineDash([]);

    state.detectedClass = "SUSPICIOUS EDIBLE MATTER";
    ui.telClass().textContent = "SPECIMEN DETECTED";
    ui.telConfidence().textContent = `${(85 + Math.sin(t) * 10).toFixed(2)}%`;
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
      ui.telClass().textContent = "CHAMBER EMPTY";
      ui.telConfidence().textContent = "0.00%";
      updateTelemetrySliders(15, 20, 25);
      return;
    }

    const mainDetection = predictions.sort((a, b) => b.score - a.score)[0];
    const rawClass = mainDetection.class;
    const humorousClass = snackClassTranslation[rawClass] || `${rawClass.toUpperCase()} (SUSPECT MATTER)`;
    
    state.detectedClass = humorousClass;
    state.detectedConfidence = mainDetection.score;

    ui.telClass().textContent = humorousClass.toUpperCase();
    ui.telConfidence().textContent = `${(mainDetection.score * 100).toFixed(2)}%`;

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
    ui.barPreservatives().style.width = `${pres}%`;
    ui.barVibe().style.width = `${vibe}%`;
    ui.barRegret().style.width = `${regret}%`;
  }

  function logConsole(message, statusClass = 'green') {
    const ticker = ui.consoleTicker();
    const p = document.createElement('p');
    p.className = `console-line text-${statusClass}`;
    p.innerHTML = `&gt; ${message}`;
    ticker.appendChild(p);
    ticker.scrollTop = ticker.scrollHeight;
  }

  // --- PRESET SELECTION BINDINGS ---
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

  document.querySelectorAll('.d-preset-btn, .preset-native-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      document.querySelectorAll('.d-preset-btn, .preset-native-btn').forEach(b => b.classList.remove('selected'));
      
      // Match active selectors
      const snackKey = btn.dataset.snack;
      document.querySelectorAll(`[data-snack="${snackKey}"]`).forEach(b => b.classList.add('selected'));

      const data = presetData[snackKey];
      state.selectedPresetSnack = snackKey;

      state.detectedClass = data.class;
      state.detectedConfidence = 0.9992;
      state.dominantColor = data.color;
      state.auraName = data.aura;

      ui.telClass().textContent = data.class.toUpperCase();
      ui.telConfidence().textContent = "99.98% (EMU)";
      updateTelemetrySliders(data.preservative, data.chaos, data.regret);

      logConsole(`Chamber containment: ${data.class} loaded.`, 'green');
      document.querySelectorAll('#d-btnTriggerScan, #m-btnTriggerScan').forEach(b => b.classList.remove('disabled'));
      if (!ui.isDesktop()) {
        triggerIslandPopup("SPECIMEN LOCK", false, 1500);
      }
    });
  });


  // --- DEEP SCAN SEQUENCE ---
  const triggerScanDesktop = document.getElementById('d-btnTriggerScan');
  const triggerScanMobile = document.getElementById('m-btnTriggerScan');

  [triggerScanDesktop, triggerScanMobile].forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;

      playSynthSound('shutter');
      stopCameraLens();

      // Show loader
      const activeLoader = ui.isDesktop() ? document.getElementById('d-loaderOverlay') : document.getElementById('m-loaderOverlay');
      activeLoader.classList.remove('hidden');
      activeLoader.classList.add('active');

      if (!ui.isDesktop()) {
        triggerIslandPopup("DEEP SCANNING...", true);
      }

      let progress = 0;
      const bar = ui.isDesktop() ? document.getElementById('d-loaderBarInner') : document.getElementById('m-loaderBarInner');
      const label = ui.isDesktop() ? document.getElementById('d-loaderLabel') : document.getElementById('m-loadingStageText');
      const sub = ui.isDesktop() ? document.getElementById('d-loaderSub') : document.getElementById('m-loadingSubText');

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
            activeLoader.classList.remove('active');
            activeLoader.classList.add('hidden');
            
            if (!ui.isDesktop()) {
              triggerIslandPopup("SUCCESS", false, 1500);
            }
            
            generateFinalReportCard();
            playSynthSound('success');
            
            if (!ui.isDesktop()) {
              document.getElementById('m-resultsView').classList.add('active');
            }
            
            initAuraVisualizer();
          }, 600);
        }
      }, 40);
    });
  });


  // --- DYNAMIC ROASTS & LOGGING GENERATOR ---
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
        "Actual organic compounds. Notes of clean water, natural minerals, and severe moral superiority.",
        "Fibrous structure, active vitamins, and a distinct lack of deep deep happiness.",
        "Natural organic molecules, glucose cells, and a mild regret that this isn't a powdered doughnut."
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
    ui.recScanId().forEach(el => el.textContent = scanId);

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ui.recTimestamp().forEach(el => el.textContent = formattedDate);

    let specimenName = state.detectedClass;
    let isFruit = false;

    if (specimenName.toLowerCase().includes('banana') || 
        specimenName.toLowerCase().includes('apple') || 
        specimenName.toLowerCase().includes('orange')) {
      isFruit = true;
    }

    ui.recDetected().forEach(el => el.textContent = specimenName.toUpperCase());

    // Stats calculations
    let presVal = isFruit ? Math.floor(1 + Math.random() * 5) : Math.floor(84 + Math.random() * 16);
    let crunchVal = isFruit ? (2 + Math.random() * 3).toFixed(1) : (8 + Math.random() * 2).toFixed(1);
    let impVal = Math.floor(72 + Math.random() * 28);

    const msgStr = isFruit ? '0.00% (NATURAL)' : `${(85 + Math.random() * 15).toFixed(1)}%`;
    const crunchStr = `${crunchVal} / 10.0`;
    const impStr = `${impVal}%`;

    ui.recMSG().forEach(el => el.textContent = msgStr);
    ui.recCrunch().forEach(el => el.textContent = crunchStr);
    ui.recImpulsivity().forEach(el => el.textContent = impStr);

    const pool = isFruit ? dynamicRoasts.fruit : (dynamicRoasts[state.aiMood] || dynamicRoasts.cynical);
    const hash = scanId.charCodeAt(2) + scanId.charCodeAt(3);
    
    const tierText = pool.tiers[hash % pool.tiers.length];
    const tastingText = pool.tastingNotes[hash % pool.tastingNotes.length];
    const auditText = pool.audits[hash % pool.audits.length];

    ui.recTier().forEach(el => el.textContent = tierText);
    ui.recNotes().forEach(el => el.textContent = `"${tastingText}"`);
    ui.recAudit().forEach(el => el.textContent = `"${auditText}"`);

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
      msg: msgStr,
      crunch: crunchStr,
      impulsivity: impStr,
      category: isFruit ? 'healthy' : 'dangerous',
      color: state.dominantColor,
      aura: state.auraName
    };

    state.historyLogs.unshift(newLog);
    localStorage.setItem('snacksense_logs', JSON.stringify(state.historyLogs));
  }

  function analyzeFrameColor() {
    try {
      const ctx = ui.canvas().getContext('2d');
      const microGrid = ctx.getImageData(ui.canvas().width / 2 - 15, ui.canvas().height / 2 - 15, 30, 30);
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
      state.dominantColor = { r: 255, g: 0, b: 127 };
      state.auraName = 'convenience Store CYBER GLOW';
    }
  }


  // --- HISTORICAL LOGS DISPLAY (MOBILE LIST VIEW) ---
  const mLogsContainer = document.getElementById('m-logsContainer');
  const mEmptyPlaceholder = document.getElementById('m-emptyLogsPlaceholder');

  function renderHistoricalLogs() {
    if (!mLogsContainer) return;
    
    // Clear list
    mLogsContainer.innerHTML = '';
    mLogsContainer.appendChild(mEmptyPlaceholder);

    if (state.historyLogs.length === 0) {
      mEmptyPlaceholder.style.display = 'block';
      return;
    }

    mEmptyPlaceholder.style.display = 'none';

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

      cell.addEventListener('click', () => {
        playSynthSound('beep');
        loadHistoricalLogIntoReceipt(log);
        document.getElementById('m-resultsView').classList.add('active');
        initAuraVisualizer();
      });

      mLogsContainer.appendChild(cell);
    });
  }

  function loadHistoricalLogIntoReceipt(log) {
    ui.recScanId().forEach(el => el.textContent = log.id);
    ui.recTimestamp().forEach(el => el.textContent = log.timestamp);
    ui.recDetected().forEach(el => el.textContent = log.name.toUpperCase());
    ui.recMSG().forEach(el => el.textContent = log.msg);
    ui.recCrunch().forEach(el => el.textContent = log.crunch);
    ui.recImpulsivity().forEach(el => el.textContent = log.impulsivity);
    ui.recTier().forEach(el => el.textContent = log.tier);
    ui.recNotes().forEach(el => el.textContent = `"${log.tasting}"`);
    ui.recAudit().forEach(el => el.textContent = `"${log.audit}"`);
    
    state.dominantColor = log.color || { r: 255, g: 0, b: 127 };
    state.auraName = log.aura || 'CYBER GLOW';
  }

  // Clear log database binding
  document.getElementById('m-btnClearLogs').addEventListener('click', () => {
    if (state.historyLogs.length === 0) return;
    playSynthSound('failure');
    state.historyLogs = [];
    localStorage.removeItem('snacksense_logs');
    renderHistoricalLogs();
    triggerIslandPopup("DB WIPED", false, 1500);
  });

  // Mobile Back button
  document.getElementById('m-btnBackFromResults').addEventListener('click', () => {
    playSynthSound('click');
    document.getElementById('m-resultsView').classList.remove('active');
    switchMobileTab('m-chamberTab');
  });


  // --- DUAL RADIAL AURA WAVE VISUALIZERS ---
  let auraAnimFrame = null;
  function initAuraVisualizer() {
    const desktopCanvas = document.getElementById('desktopAuraCanvas');
    const mobileCanvas = document.getElementById('mobileAuraCanvas');
    
    const activeCanvas = ui.isDesktop() ? desktopCanvas : mobileCanvas;
    if (!activeCanvas) return;

    const ctx = activeCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = activeCanvas.getBoundingClientRect();
    
    activeCanvas.width = rect.width * dpr;
    activeCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Update floating labels
    const auraNameEl = ui.isDesktop() ? document.getElementById('d-auraName') : document.getElementById('m-auraName');
    if (auraNameEl) {
      auraNameEl.textContent = state.auraName;
      auraNameEl.style.color = `rgb(${state.dominantColor.r}, ${state.dominantColor.g}, ${state.dominantColor.b})`;
    }

    const stabilityEl = document.getElementById('m-auraStability');
    if (stabilityEl) {
      stabilityEl.textContent = `${Math.floor(4 + Math.random() * 18)}% (STRESS LEVEL)`;
    }

    let time = 0;
    function drawAuraFrame() {
      // Loop safety
      const isVisible = ui.isDesktop() || document.getElementById('m-resultsView').classList.contains('active');
      if (!isVisible) {
        cancelAnimationFrame(auraAnimFrame);
        return;
      }

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const rgbStr = `${state.dominantColor.r}, ${state.dominantColor.g}, ${state.dominantColor.b}`;
      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, w, h);

      // Radial fluid shifts
      for (let i = 0; i < 3; i++) {
        const grad = ctx.createRadialGradient(
          w / 2 + Math.sin(time * 0.025 + i) * (w / 3.5),
          h / 2 + Math.cos(time * 0.02 + i) * (h / 4.5),
          8,
          w / 2 + Math.sin(time * 0.025 + i) * (w / 3.5),
          h / 2 + Math.cos(time * 0.02 + i) * (h / 4.5),
          w * 0.8
        );
        const alpha = 0.36 - i * 0.1;
        grad.addColorStop(0, `rgba(${rgbStr}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 0, 127, ${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Tech grids
      ctx.strokeStyle = `rgba(${rgbStr}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 20) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 20) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      time += 0.55;
      auraAnimFrame = requestAnimationFrame(drawAuraFrame);
    }
    drawAuraFrame();
  }


  // --- DUAL CRUNCH AUDIO OSCILLOSCOPE DECRYPTERS ---
  let oscAnimFrame = null;
  
  const btnPlayCrunchDesktop = document.getElementById('d-btnPlayCrunch');
  const btnPlayCrunchMobile = document.getElementById('m-btnPlayCrunchWave');

  [btnPlayCrunchDesktop, btnPlayCrunchMobile].forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      playSynthesizedCrunch((analyser, duration) => {
        drawOscilloscope(analyser, duration);
      });
    });
  });

  function drawOscilloscope(analyser, duration) {
    const desktopOsc = document.getElementById('desktopOscilloscopeCanvas');
    const mobileOsc = document.getElementById('mobileOscilloscopeCanvas');
    
    const activeCanvas = ui.isDesktop() ? desktopOsc : mobileOsc;
    if (!activeCanvas) return;

    const ctx = activeCanvas.getContext('2d');
    const w = activeCanvas.width;
    const h = activeCanvas.height;
    
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

      // Grid stripes
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < h; y += 12) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = 'rgba(255, 0, 127, 0.5)';
      ctx.shadowBlur = 4;
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
  const btnDownloadDesktop = document.getElementById('d-btnDownloadReceipt');
  const btnDownloadMobile = document.getElementById('m-btnDownloadReceipt');

  [btnDownloadDesktop, btnDownloadMobile].forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      if (!ui.isDesktop()) triggerIslandPopup("EXPORTING...", false, 1500);

      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 920;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f6f8fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1a202c'; ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 26px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      
      const scanIdText = document.getElementById('d-recScanId').textContent;
      const detectedText = document.getElementById('d-recDetected').textContent;
      const timestampText = document.getElementById('d-recTimestamp').textContent;
      const msgText = document.getElementById('d-recMSG').textContent;
      const crunchText = document.getElementById('d-recCrunch').textContent;
      const impulsivityText = document.getElementById('d-recImpulsivity').textContent;
      const tierText = document.getElementById('d-recTier').textContent;
      const notesText = document.getElementById('d-recNotes').textContent;
      const auditText = document.getElementById('d-recAudit').textContent;

      ctx.fillText("SNACKSENSE™ BIO-REPORT", canvas.width / 2, 60);

      ctx.font = '16px "Share Tech Mono", monospace';
      ctx.fillText("AURA LABS NEURAL RESEARCH", canvas.width / 2, 90);
      ctx.fillText("----------------------------------------------", canvas.width / 2, 115);

      ctx.textAlign = 'left';
      ctx.font = '18px "Share Tech Mono", monospace';
      ctx.fillText(`SCAN_ID:   ${scanIdText}`, 50, 150);
      ctx.fillText(`TIMESTAMP: ${timestampText}`, 50, 185);
      ctx.fillText(`BIO_LENSE: HYBRID_VISION`, 50, 220);

      ctx.textAlign = 'center';
      ctx.fillText("----------------------------------------------", canvas.width / 2, 250);

      ctx.textAlign = 'left';
      ctx.font = 'bold 20px "Orbitron", sans-serif';
      ctx.fillText("SPECIMEN DIAGNOSTICS:", 50, 285);

      ctx.font = '18px "Share Tech Mono", monospace';
      ctx.fillText(`SPECIMEN:          ${detectedText}`, 50, 330);
      ctx.fillText(`MSG SATURATION:    ${msgText}`, 50, 370);
      ctx.fillText(`CRUNCH INDEX:      ${crunchText}`, 50, 410);
      ctx.fillText(`IMPULSIVITY RATIO: ${impulsivityText}`, 50, 450);

      ctx.textAlign = 'center';
      ctx.fillText("----------------------------------------------", canvas.width / 2, 490);

      ctx.textAlign = 'left';
      ctx.font = 'bold 20px "Orbitron", sans-serif';
      ctx.fillText("PSYCHOSOCIAL ANALYSIS:", 50, 525);

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillText(`SOCIOECONOMIC TIER:`, 50, 570);
      ctx.fillStyle = '#b7791f';
      ctx.fillText(tierText, 260, 570);

      ctx.fillStyle = '#000';
      ctx.fillText(`AI TASTING NOTES:`, 50, 610);
      ctx.font = 'italic 16px "Share Tech Mono", monospace';
      wrapText(ctx, notesText, 50, 640, 500, 22);

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillText(`ANTHROPOLOGICAL DIAGNOSIS:`, 50, 710);
      ctx.font = '16px "Share Tech Mono", monospace';
      wrapText(ctx, auditText, 50, 740, 500, 22);

      ctx.textAlign = 'center';
      ctx.font = '54px "Share Tech Mono", monospace';
      ctx.fillText("||||| | ||||| ||| | ||| ||||", canvas.width / 2, 835);
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.fillText("SYSTEM_DETERMINISTIC_CHAOS // POWERED BY AURA LABS", canvas.width / 2, 865);

      try {
        const link = document.createElement('a');
        link.download = `snacksense_report_${scanIdText}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        if (!ui.isDesktop()) triggerIslandPopup("SAVED TO ALBUM", false, 1500);
      } catch (e) {
        console.error("Canvas write failed: ", e);
      }
    });
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


  // --- COPY TICKET SUMMARY TO CLIPBOARD ---
  const btnShareDesktop = document.getElementById('d-btnCopyShare');
  const btnShareMobile = document.getElementById('m-btnShareCopy');

  [btnShareDesktop, btnShareMobile].forEach(btn => {
    btn.addEventListener('click', () => {
      playSynthSound('beep');
      
      const scanIdText = document.getElementById('d-recScanId').textContent;
      const detectedText = document.getElementById('d-recDetected').textContent;
      const msgText = document.getElementById('d-recMSG').textContent;
      const crunchText = document.getElementById('d-recCrunch').textContent;
      const tierText = document.getElementById('d-recTier').textContent;
      const notesText = document.getElementById('d-recNotes').textContent;
      const auditText = document.getElementById('d-recAudit').textContent;

      const shareText = `📱 --- SNACKSENSE™ BIO-REPORT ---
Scan Chamber ID: ${scanIdText}
Specimen locked: ${detectedText}
MSG Saturation:  ${msgText}
Crunch Rating:   ${crunchText}

Socioeconomic:   ${tierText}
AI Tasting Logs: ${notesText}
Anthropological Diagnostic: ${auditText}
-------------------------------------
POWERED BY AURA LABS // AURA360STUDIO`;

      navigator.clipboard.writeText(shareText).then(() => {
        const span = btn.querySelector('span') || btn;
        const originalText = span.textContent;
        span.textContent = '✔ TICKET COPIED TO CLIPBOARD!';
        if (!ui.isDesktop()) triggerIslandPopup("COPIED TICKET", false, 1500);
        setTimeout(() => {
          span.textContent = originalText;
        }, 2000);
      }).catch(e => console.warn(e));
    });
  });


  // --- INITIALIZE DEVICE STATE ON BOOT ---
  // Read size to load initial webcam
  if (ui.isDesktop()) {
    startCameraLens();
  }

  // Handle window resize dynamically to redirect stream bounds
  window.addEventListener('resize', () => {
    // If layout flips, rebuild video binding safely
    if (state.stream) {
      const activeVideo = ui.video();
      if (activeVideo && activeVideo.srcObject !== state.stream) {
        activeVideo.srcObject = state.stream;
      }
    }
  });

});
