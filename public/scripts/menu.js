/**
 * MENU.JS - Menú principal optimizado
 * Pesadilla en los Backrooms
 */

// ════ CONFIGURACIÓN ════
const CONFIG = {
  isMobile: window.innerWidth < 600,
  rainDrops: window.innerWidth < 600 ? 60 : 120,
  particles: window.innerWidth < 600 ? 15 : 30,
  audioLazyInit: true
};

// ════ VARIABLES GLOBALES ════
let audioContext = null;
let masterGain = null;
let droneGain = null;
let windGain = null;
let whisperGain = null;
let audioStarted = false;
let audioInitialized = false;

// ════ LLUVIA ════
function createRain() {
  const container = document.getElementById('rainContainer');
  if (!container) return;
  
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < CONFIG.rainDrops; i++) {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';
    drop.style.cssText = `left:${Math.random() * 100}%;animation-duration:${0.35 + Math.random() * 0.4}s;animation-delay:${Math.random() * 2}s;opacity:${0.3 + Math.random() * 0.4}`;
    fragment.appendChild(drop);
  }
  container.appendChild(fragment);
}

// ════ GOTAS DE SANGRE ════
function createBlood() {
  const positions = [5, 15, 28, 42, 58, 72, 85, 95];
  const fragment = document.createDocumentFragment();
  positions.forEach(p => {
    const drop = document.createElement('div');
    drop.className = 'blood-drip';
    drop.style.cssText = `left:${p}%;animation-delay:${Math.random() * 5}s`;
    fragment.appendChild(drop);
  });
  document.body.appendChild(fragment);
}

// ════ PARTÍCULAS FLOTANTES ════
function createFloatingParticles() {
  const container = document.getElementById('menuParticles');
  if (!container) return;
  
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < CONFIG.particles; i++) {
    const size = 2 + Math.random() * 3;
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${15 + Math.random() * 20}s;animation-delay:${Math.random() * 20}s;opacity:${0.2 + Math.random() * 0.3}`;
    fragment.appendChild(particle);
  }
  container.appendChild(fragment);
}

// ════ AURICULARES MODAL ════
function initHeadphonesModal() {
  const hpModal = document.getElementById('headphonesModal');
  const hpBtnYes = document.getElementById('hpBtnYes');
  const hpBtnNo = document.getElementById('hpBtnNo');
  
  function dismissHeadphones() {
    if (hpModal) hpModal.style.display = 'none';
  }
  
  function handleChoice(hasHeadphones) {
    localStorage.setItem('headphonesChoice', hasHeadphones ? 'yes' : 'no');
    dismissHeadphones();
    initAudio();
  }
  
  if (hpBtnYes) hpBtnYes.addEventListener('click', () => handleChoice(true));
  if (hpBtnNo) hpBtnNo.addEventListener('click', () => handleChoice(false));
  
  const hpChoice = localStorage.getItem('headphonesChoice');
  if (hpChoice) {
    dismissHeadphones();
    setTimeout(initAudio, 100);
  }
}

// ════ SISTEMA DE RELÁMPAGOS ════
let thunderAudioCtx = null;
let thunderMasterGain = null;

function getOrCreateAudioContext() {
  if (window.menuAudioContext) return window.menuAudioContext;
  
  if (!thunderAudioCtx) {
    thunderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    thunderMasterGain = thunderAudioCtx.createGain();
    thunderMasterGain.gain.value = 1.5;
    thunderMasterGain.connect(thunderAudioCtx.destination);
    createThunderAmbience();
  }
  return thunderAudioCtx;
}

function getMasterGain() {
  return window.menuMasterGain || thunderMasterGain;
}

function createThunderAmbience() {
  if (!thunderAudioCtx || !thunderMasterGain) return;
  
  const sampleRate = thunderAudioCtx.sampleRate;
  const bufferSize = sampleRate * 3;
  
  // Lluvia optimizada
  const rainBuffer = thunderAudioCtx.createBuffer(2, bufferSize, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = rainBuffer.getChannelData(ch);
    for (let i = 0; i < bufferSize; i++) {
      if (Math.random() > 0.997) data[i] = (Math.random() - 0.5) * 0.4;
    }
  }
  
  const rainSource = thunderAudioCtx.createBufferSource();
  rainSource.buffer = rainBuffer;
  rainSource.loop = true;
  
  const rainFilter = thunderAudioCtx.createBiquadFilter();
  rainFilter.type = 'bandpass';
  rainFilter.frequency.value = 4000;
  rainFilter.Q.value = 0.5;
  
  const rainGain = thunderAudioCtx.createGain();
  rainGain.gain.value = 0.2;
  
  rainSource.connect(rainFilter);
  rainFilter.connect(rainGain);
  rainGain.connect(thunderMasterGain);
  rainSource.start();
  
  // Viento
  const windBuffer = thunderAudioCtx.createBuffer(1, bufferSize, sampleRate);
  const windData = windBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990465;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 1.0526913;
    windData[i] = (b0 + b1 + b2 + white * 0.1848) * 0.15;
  }
  
  const windSource = thunderAudioCtx.createBufferSource();
  windSource.buffer = windBuffer;
  windSource.loop = true;
  
  const windFilter = thunderAudioCtx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 500;
  
  const windGainNode = thunderAudioCtx.createGain();
  windGainNode.gain.value = 1.2;
  
  windSource.connect(windFilter);
  windFilter.connect(windGainNode);
  windGainNode.connect(thunderMasterGain);
  windSource.start();
}

function playThunder() {
  const ctx = getOrCreateAudioContext();
  if (!ctx || ctx.state === 'suspended') return;
  
  const now = ctx.currentTime;
  const duration = 3 + Math.random() * 2;
  const gain = getMasterGain();
  
  // Crack
  const crackSize = ctx.sampleRate * 0.15;
  const crackBuffer = ctx.createBuffer(1, crackSize, ctx.sampleRate);
  const crackData = crackBuffer.getChannelData(0);
  for (let i = 0; i < crackSize; i++) {
    crackData[i] = (Math.random() * 2 - 1) * Math.exp(-(i / crackSize) * 15) * 0.8;
  }
  
  const crackSource = ctx.createBufferSource();
  crackSource.buffer = crackBuffer;
  const crackFilter = ctx.createBiquadFilter();
  crackFilter.type = 'highpass';
  crackFilter.frequency.value = 800;
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(1.5, now);
  crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  crackSource.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(gain);
  crackSource.start(now);
  
  // Rumble
  const rumbleSize = ctx.sampleRate * duration;
  const rumbleBuffer = ctx.createBuffer(1, rumbleSize, ctx.sampleRate);
  const rumbleData = rumbleBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < rumbleSize; i++) {
    lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
    rumbleData[i] = lastOut * 3.5;
  }
  
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumbleBuffer;
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 200;
  const rumbleGainNode = ctx.createGain();
  rumbleGainNode.gain.setValueAtTime(0, now + 0.05);
  rumbleGainNode.gain.linearRampToValueAtTime(2.5, now + 0.3);
  rumbleGainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
  rumbleSource.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGainNode);
  rumbleGainNode.connect(gain);
  rumbleSource.start(now + 0.05);
  
  // Lluvia del rayo
  const rainSize = ctx.sampleRate * (duration * 0.7);
  const rainBuffer = ctx.createBuffer(1, rainSize, ctx.sampleRate);
  const rainData = rainBuffer.getChannelData(0);
  b0 = 0; b1 = 0; b2 = 0;
  for (let i = 0; i < rainSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.0990465;
    b1 = 0.96300 * b1 + white * 0.2965164;
    b2 = 0.57000 * b2 + white * 0.0526913;
    rainData[i] = (b0 + b1 + b2) * 0.15;
  }
  
  const rainSource = ctx.createBufferSource();
  rainSource.buffer = rainBuffer;
  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'bandpass';
  rainFilter.frequency.value = 3000;
  const rainGainNode = ctx.createGain();
  rainGainNode.gain.setValueAtTime(0, now + 0.1);
  rainGainNode.gain.linearRampToValueAtTime(1.2, now + 0.5);
  rainGainNode.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
  rainSource.connect(rainFilter);
  rainFilter.connect(rainGainNode);
  rainGainNode.connect(gain);
  rainSource.start(now + 0.1);
}

function initLightning() {
  const overlay = document.getElementById('lightningOverlay');
  if (!overlay) return;
  
  function triggerLightning() {
    const isDouble = Math.random() > 0.6;
    overlay.className = isDouble ? 'lightning-overlay double-flash' : 'lightning-overlay flash';
    setTimeout(playThunder, 150 + Math.random() * 400);
    setTimeout(() => { overlay.className = 'lightning-overlay'; }, isDouble ? 700 : 400);
    setTimeout(triggerLightning, 5000 + Math.random() * 12000);
  }
  
  setTimeout(triggerLightning, 3000 + Math.random() * 5000);
}

// ════ AUDIO SYSTEM ════
function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  
  window.menuAudioContext = audioContext;
  
  masterGain = audioContext.createGain();
  masterGain.gain.value = 1.5;
  masterGain.connect(audioContext.destination);
  window.menuMasterGain = masterGain;
  
  droneGain = audioContext.createGain();
  droneGain.gain.value = 0.25;
  droneGain.connect(masterGain);
  
  windGain = audioContext.createGain();
  windGain.gain.value = 0.4;
  windGain.connect(masterGain);
  
  whisperGain = audioContext.createGain();
  whisperGain.gain.value = 0.2;
  whisperGain.connect(masterGain);
  
  createAmbientDrone();
  createWindNoise();
  createCreepyWhispers();
  createDistantSighs();
  createClockTick();
  
  applyMenuAudioOptions();
}

function applyMenuAudioOptions() {
  const musicVol = parseFloat(localStorage.getItem('optMusic') || '70') / 100;
  const sfxVol = parseFloat(localStorage.getItem('optSfx') || '80') / 100;
  if (masterGain) masterGain.gain.value = 1.5 * sfxVol;
  if (droneGain) droneGain.gain.value = musicVol * 0.25;
  if (windGain) windGain.gain.value = sfxVol * 0.4;
}

function createAmbientDrone() {
  if (!audioContext || !droneGain) return;
  
  const osc1 = audioContext.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 55;
  
  const osc2 = audioContext.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 57;
  
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1;
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.value = 5;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);
  
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(droneGain);
  
  osc1.start();
  osc2.start();
  lfo.start();
}

function createWindNoise() {
  if (!audioContext || !windGain) return;
  
  const sampleRate = audioContext.sampleRate;
  const bufferSize = sampleRate * 4;
  
  const buffer = audioContext.createBuffer(2, bufferSize, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.2;
      b6 = white * 0.115926;
    }
  }
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  lfoGain.connect(windGain.gain);
  
  source.connect(filter);
  filter.connect(windGain);
  source.start();
  lfo.start();
  
  // Lluvia constante
  const rainBuffer = audioContext.createBuffer(2, bufferSize, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = rainBuffer.getChannelData(ch);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() > 0.998) ? (Math.random() * 0.3) : 0;
    }
  }
  
  const rainSource = audioContext.createBufferSource();
  rainSource.buffer = rainBuffer;
  rainSource.loop = true;
  
  const rainFilter = audioContext.createBiquadFilter();
  rainFilter.type = 'highpass';
  rainFilter.frequency.value = 2000;
  
  const rainGainNode = audioContext.createGain();
  rainGainNode.gain.value = 0.15;
  
  rainSource.connect(rainFilter);
  rainFilter.connect(rainGainNode);
  rainGainNode.connect(windGain);
  rainSource.start();
}

function createCreepyWhispers() {
  if (!audioContext || !whisperGain) return;
  
  function playWhisper() {
    try {
      const now = audioContext.currentTime;
      const bufferSize = Math.floor(audioContext.sampleRate * 1.2);
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 8;
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(whisperGain);
      source.start(now);
      source.stop(now + 1.0);
    } catch (e) {}
    setTimeout(playWhisper, 4000 + Math.random() * 8000);
  }
  setTimeout(playWhisper, 2000);
}

function createDistantSighs() {
  if (!audioContext || !whisperGain) return;
  
  function playSigh() {
    try {
      const now = audioContext.currentTime;
      const duration = 1.5 + Math.random();
      const bufferSize = Math.floor(audioContext.sampleRate * duration);
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * 0.3 * Math.sin(t * Math.PI) * Math.exp(-t * 0.5);
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(whisperGain);
      source.start(now);
      source.stop(now + duration);
    } catch (e) {}
    setTimeout(playSigh, 8000 + Math.random() * 15000);
  }
  setTimeout(playSigh, 5000);
}

function createClockTick() {
  if (!audioContext || !masterGain) return;
  
  function playTick() {
    try {
      const now = audioContext.currentTime;
      const bufferSize = Math.floor(audioContext.sampleRate * 0.05);
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / bufferSize) * 40) * 0.5;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      const gain = audioContext.createGain();
      gain.gain.value = 0.15;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(now);
    } catch (e) {}
    setTimeout(playTick, 1000 + Math.random() * 1000);
  }
  setTimeout(playTick, 3000);
}

// ════ MODALES ════
function speakPlayerName(name) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  
  const utterance = new SpeechSynthesisUtterance(`${name}...`);
  utterance.lang = 'es-ES';
  utterance.rate = 0.5;
  utterance.pitch = 0.3;
  utterance.volume = 0.9;
  
  const voices = synth.getVoices();
  const voice = voices.find(v => v.lang.includes('es')) || voices[0];
  if (voice) utterance.voice = voice;
  
  synth.cancel();
  synth.speak(utterance);
}

function initModals() {
  const nameModal = document.getElementById('nameModal');
  const mainCover = document.getElementById('mainCover');
  const playerNameInput = document.getElementById('playerNameInput');
  const startBtn = document.getElementById('startBtn');
  
  const savedName = sessionStorage.getItem('playerName');
  if (savedName) {
    nameModal.style.display = 'none';
    mainCover.style.display = 'flex';
    setTimeout(() => speakPlayerName(savedName), 500);
  }
  
  function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
      sessionStorage.setItem('playerName', name);
      nameModal.style.display = 'none';
      mainCover.style.display = 'flex';
      setTimeout(() => speakPlayerName(name), 300);
    } else {
      nameModal.style.display = 'none';
      mainCover.style.display = 'flex';
    }
  }
  
  startBtn.addEventListener('click', startGame);
  playerNameInput.addEventListener('keypress', e => { if (e.key === 'Enter') startGame(); });
  
  function openModal(id) {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }
  
  function closeModal(e) {
    if (e.target.classList.contains('modal')) e.target.classList.remove('active');
  }
  
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', closeModal));
  
  document.getElementById('btnJugar').addEventListener('click', () => openModal('modalNiveles'));
  document.getElementById('btnRecords').addEventListener('click', () => { renderScores('level1'); openModal('modalRecords'); });
  document.getElementById('btnAchievements').addEventListener('click', () => { renderAchievements(); openModal('modalAchievements'); });
  document.getElementById('btnOptions').addEventListener('click', () => openModal('modalOptions'));
}

// ════ DIFICULTAD ════
const DIFF_DESCS = {
  easy: "Enemigos lentos, batería dura más, cordura estable. Ideal para aprender.",
  normal: "La experiencia completa. Equilibrio entre reto y diversión.",
  nightmare: "Enemigos agresivos, batería escasa, cordura crítica. Solo para valientes."
};

function initDifficulty() {
  const diffDescEl = document.getElementById('diffDesc');
  
  function updateDiffDesc(diff) {
    if (diffDescEl) diffDescEl.textContent = DIFF_DESCS[diff] || '';
  }
  
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sessionStorage.setItem('difficulty', btn.dataset.diff);
      updateDiffDesc(btn.dataset.diff);
    });
  });
  
  const savedDiff = sessionStorage.getItem('difficulty') || 'normal';
  const diffBtn = document.querySelector(`.diff-btn[data-diff="${savedDiff}"]`);
  if (diffBtn) diffBtn.click();
  updateDiffDesc(savedDiff);
}

// ════ RÉCORDS ════
function renderScores(level) {
  const list = document.getElementById('scoresList');
  if (!list) return;
  
  const data = localStorage.getItem('backrooms_highscores');
  const scores = data ? JSON.parse(data)[level] || [] : [];
  
  if (!scores.length) {
    list.innerHTML = '<div class="no-scores">No hay récords aún</div>';
    return;
  }
  
  const medals = ['🥇', '🥈', '🥉'];
  list.innerHTML = scores.map((s, i) => {
    const cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const time = Math.floor(s.time / 60) + ':' + (s.time % 60).toString().padStart(2, '0');
    return `<div class="score-item ${cls}">
      <span class="score-rank">${i < 3 ? medals[i] : (i + 1)}</span>
      <span class="score-pts">${s.score} pts</span>
      <span class="score-time">${time}</span>
    </div>`;
  }).join('');
}

function initScores() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderScores(btn.dataset.level);
    });
  });
}

// ════ LOGROS ════
function renderAchievements() {
  const list = document.getElementById('achievementsList');
  if (!list) return;
  
  const achievements = [
    { id: 'first_death', name: 'Primera Muerte', desc: 'Muere por primera vez' },
    { id: 'first_escape', name: 'Primer Escape', desc: 'Escapa de un nivel' },
    { id: 'speedrunner', name: 'Speedrunner', desc: 'Completa Nivel 1 en <2 min' },
    { id: 'coin_collector', name: 'Coleccionista', desc: 'Recoge 500 monedas' },
    { id: 'survivor_5', name: 'Superviviente', desc: 'Sobrevive 5 min en Ultimate' },
    { id: 'note_reader', name: 'Curioso', desc: 'Lee 10 notas' },
    { id: 'hider', name: 'Tímido', desc: 'Escondete 50 veces' },
    { id: 'battery_hoarder', name: 'Coleccionista', desc: 'Recoge 100 baterías' },
    { id: 'no_flashlight', name: 'A oscuras', desc: 'Completa Nivel 4 sin linterna' },
    { id: 'closecall', name: 'Afortunado', desc: 'Escapa de enemigo 10 veces' }
  ];
  
  const data = localStorage.getItem('backrooms_stats');
  const stats = data ? JSON.parse(data) : {};
  const unlocked = new Set(stats.achievements?.filter(a => a.unlocked).map(a => a.id) || []);
  
  list.innerHTML = achievements.map(a => `
    <div class="achievement-item ${unlocked.has(a.id) ? '' : 'locked'}">
      <span class="achievement-icon">${unlocked.has(a.id) ? '🏅' : '🔒'}</span>
      <div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>
    </div>
  `).join('');
}

// ════ OPCIONES ════
function initOptions() {
  const optMusic = document.getElementById('optMusic');
  const optSfx = document.getElementById('optSfx');
  const optFlashlight = document.getElementById('optFlashlight');
  const optSensitivity = document.getElementById('optSensitivity');
  
  if (optMusic) {
    optMusic.value = localStorage.getItem('optMusic') || 70;
    document.getElementById('optMusicVal').textContent = optMusic.value + '%';
    optMusic.addEventListener('input', () => {
      document.getElementById('optMusicVal').textContent = optMusic.value + '%';
      localStorage.setItem('optMusic', optMusic.value);
      if (droneGain) droneGain.gain.value = (parseFloat(optMusic.value) / 100) * 0.4;
    });
  }
  
  if (optSfx) {
    optSfx.value = localStorage.getItem('optSfx') || 80;
    document.getElementById('optSfxVal').textContent = optSfx.value + '%';
    optSfx.addEventListener('input', () => {
      document.getElementById('optSfxVal').textContent = optSfx.value + '%';
      localStorage.setItem('optSfx', optSfx.value);
      if (masterGain) masterGain.gain.value = (parseFloat(optSfx.value) / 100) * 0.5;
      if (windGain) windGain.gain.value = (parseFloat(optSfx.value) / 100) * 0.15;
    });
  }
  
  if (optFlashlight) {
    optFlashlight.value = localStorage.getItem('optFlashlight') || 60;
    document.getElementById('optFlashlightVal').textContent = optFlashlight.value + '%';
    optFlashlight.addEventListener('input', () => {
      document.getElementById('optFlashlightVal').textContent = optFlashlight.value + '%';
      localStorage.setItem('optFlashlight', optFlashlight.value);
    });
  }
  
  if (optSensitivity) {
    optSensitivity.value = localStorage.getItem('optSensitivity') || 5;
    document.getElementById('optSensitivityVal').textContent = optSensitivity.value;
    optSensitivity.addEventListener('input', () => {
      document.getElementById('optSensitivityVal').textContent = optSensitivity.value;
      localStorage.setItem('optSensitivity', optSensitivity.value);
    });
  }
  
  function setupToggle(id, storageKey) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    const saved = localStorage.getItem(storageKey);
    const val = saved === null ? true : saved === 'true';
    
    btn.dataset.val = val.toString();
    btn.textContent = val ? 'ON' : 'OFF';
    btn.className = 'toggle-btn ' + (val ? 'on' : 'off');
    
    btn.addEventListener('click', () => {
      const newVal = btn.dataset.val !== 'true';
      btn.dataset.val = newVal.toString();
      btn.textContent = newVal ? 'ON' : 'OFF';
      btn.className = 'toggle-btn ' + (newVal ? 'on' : 'off');
      localStorage.setItem(storageKey, newVal.toString());
      
      if (storageKey === 'toggleParticles') {
        document.querySelectorAll('.particle, .rain-container, .blood-drip').forEach(el => {
          el.style.display = newVal ? '' : 'none';
        });
      }
    });
  }
  
  setupToggle('toggleParticles', 'toggleParticles');
  setupToggle('toggleScanlines', 'toggleScanlines');
  setupToggle('toggleShadows', 'toggleShadows');
  setupToggle('toggleCompactHUD', 'toggleCompactHUD');
  
  if (localStorage.getItem('toggleParticles') === 'false') {
    document.querySelectorAll('.particle, .rain-container, .blood-drip').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// ════ INICIALIZACIÓN ════
document.addEventListener('DOMContentLoaded', () => {
  // Crear elementos visuales
  createRain();
  createBlood();
  createFloatingParticles();
  
  // Inicializar sistemas
  initHeadphonesModal();
  initLightning();
  initModals();
  initDifficulty();
  initScores();
  initOptions();
  
  // Audio lazy load - solo al primer click
  if (CONFIG.audioLazyInit) {
    document.addEventListener('click', () => initAudio(), { once: true });
  } else {
    initAudio();
  }
});
