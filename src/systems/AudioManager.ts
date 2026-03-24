import * as THREE from 'three';

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isInitialized = false;
  private listener: THREE.AudioListener | null = null;
  private playerName = '';
  private lastEnemySpeechTime = 0;

  private droneOsc: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private dangerOsc: OscillatorNode | null = null;
  private fluorescentOsc: OscillatorNode | null = null;
  private windNoise: AudioBufferSourceNode | null = null;

  // Audio de proximidad — nodo persistente, volumen actualizado cada frame
  private proximityOsc: OscillatorNode | null = null;
  private proximityGain: GainNode | null = null;
  private proximityLfo: OscillatorNode | null = null;

  setPlayerName(name: string): void {
    this.playerName = name;
    console.log('[AudioManager] Player name set:', this.playerName);
  }

  whisperPlayerName(): void {
    if (!this.playerName || typeof window === 'undefined') return;
    
    const synth = window.speechSynthesis;
    if (!synth) {
      console.log('[AudioManager] Speech synthesis not available');
      return;
    }

    const phrases = [
      `¿${this.playerName}?`,
      `${this.playerName}...`,
      `Te veo, ${this.playerName}`,
      `${this.playerName}, ven aquí`,
      `No puedes escapar, ${this.playerName}`,
      `¿Me buscas, ${this.playerName}?`,
      `${this.playerName}, ¿dónde estás?`,
    ];
    
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    console.log('[AudioManager] Whispering:', phrase);
    
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'es-ES';
    utterance.rate = 0.6;
    utterance.pitch = 0.2;
    utterance.volume = 0.8;
    
    const speak = () => {
      synth.cancel();
      synth.speak(utterance);
    };
    
    if (synth.getVoices().length > 0) {
      const spanishVoice = synth.getVoices().find(v => v.lang.includes('es')) || synth.getVoices()[0];
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
      speak();
    } else {
      synth.addEventListener('voiceschanged', () => {
        const spanishVoice = synth.getVoices().find(v => v.lang.includes('es')) || synth.getVoices()[0];
        if (spanishVoice) {
          utterance.voice = spanishVoice;
        }
        speak();
      }, { once: true });
      setTimeout(speak, 100);
    }
  }

  playEnemySpeech(distance: number): void {
    const now = Date.now();
    if (now - this.lastEnemySpeechTime < 8000) return;
    if (distance > 20) return;
    
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    this.lastEnemySpeechTime = now;
    
    const phrases = [
      'Hay una librería',
      'Soy Jonathan',
      'Está en desarrollo',
      'Nahuevoná'
    ];
    
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    console.log('[AudioManager] Enemy speaks:', phrase, 'distance:', distance);
    
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'es-ES';
    utterance.rate = 0.7;
    utterance.pitch = 0.4;
    
    const volume = Math.max(0.3, Math.min(1.0, 1.0 - (distance - 3) / 17));
    utterance.volume = volume;
    
    if (synth.getVoices().length > 0) {
      const voice = synth.getVoices().find(v => v.lang.includes('es')) || synth.getVoices()[0];
      if (voice) utterance.voice = voice;
    }
    
    synth.cancel();
    synth.speak(utterance);
  }

  whisperRandomCall(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const phrases = [
      '¿Estás ahí?',
      'Ayúdame',
      'No me ignores',
      'Ven aquí',
      '¿Por qué huyes?'
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const words = phrase.split(' ');
    
    words.forEach((_word, idx) => { // _word unused, índice necesario
      const osc = this.context!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 120 + Math.random() * 60;

      const lfo = this.context!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 4 + Math.random() * 4;

      const lfoGain = this.context!.createGain();
      lfoGain.gain.value = 25;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = this.context!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 350;
      filter.Q.value = 8;

      const gain = this.context!.createGain();
      const startTime = now + idx * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.12);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.25);

      const panner = this.context!.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 1.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain!);

      osc.start(startTime);
      lfo.start(startTime);
      osc.stop(startTime + 0.3);
      lfo.stop(startTime + 0.3);

      // Desconectar nodos al terminar para evitar memory leak
      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
      };
    });
  }

  private loadOptions(): void {
    const musicVol = parseFloat(localStorage.getItem('optMusic') || '70');
    const sfxVol = parseFloat(localStorage.getItem('optSfx') || '80');
    
    const musicGain = musicVol / 100;
    const sfxGain = sfxVol / 100;
    
    if (this.musicGain) this.musicGain.gain.value = musicGain;
    if (this.ambientGain) this.ambientGain.gain.value = musicGain * 0.5;
    if (this.sfxGain) this.sfxGain.gain.value = sfxGain;
  }

  setMusicVolume(vol: number): void {
    const gain = Math.max(0, Math.min(1, vol / 100));
    if (this.musicGain) this.musicGain.gain.value = gain;
    if (this.ambientGain) this.ambientGain.gain.value = gain * 0.5;
  }

  setSfxVolume(vol: number): void {
    const gain = Math.max(0, Math.min(1, vol / 100));
    if (this.sfxGain) this.sfxGain.gain.value = gain;
  }

  async init(camera: THREE.Camera): Promise<void> {
    if (this.isInitialized) return;

    this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    await this.context.resume();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.context.destination);

    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.7;
    this.musicGain.connect(this.masterGain);

    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.3;
    this.ambientGain.connect(this.masterGain);

    this.sfxGain = this.context.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.masterGain);

    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.startProximitySound();

    this.loadOptions();

    this.isInitialized = true;
    console.log('[AudioManager] Audio terrorífico inicializado');
  }

  private startProximitySound(): void {
    if (!this.context || !this.sfxGain) return;

    // LFO que modula la frecuencia del oscilador — da sensación de respiración orgánica
    this.proximityLfo = this.context.createOscillator();
    this.proximityLfo.type = 'sine';
    this.proximityLfo.frequency.value = 0.4; // ~0.4 Hz = ciclo de respiración

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 20;
    this.proximityLfo.connect(lfoGain);

    this.proximityOsc = this.context.createOscillator();
    this.proximityOsc.type = 'sawtooth';
    this.proximityOsc.frequency.value = 55;
    lfoGain.connect(this.proximityOsc.frequency);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 4;

    this.proximityGain = this.context.createGain();
    this.proximityGain.gain.value = 0; // empieza silencioso

    this.proximityOsc.connect(filter);
    filter.connect(this.proximityGain);
    this.proximityGain.connect(this.sfxGain);

    this.proximityOsc.start();
    this.proximityLfo.start();
  }

  /** Silla que se arrastra — golpe seco + chirrido metálico corto */
  playChairDrag(): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    const bump = this.context.createOscillator();
    bump.type = 'sine';
    bump.frequency.setValueAtTime(120, now);
    bump.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    const bGain = this.context.createGain();
    bGain.gain.setValueAtTime(0.22, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    bump.connect(bGain); bGain.connect(this.sfxGain);
    bump.start(now); bump.stop(now + 0.22);
    bump.onended = () => { bump.disconnect(); bGain.disconnect(); };

    const scrape = this.context.createOscillator();
    scrape.type = 'sawtooth';
    scrape.frequency.setValueAtTime(500 + Math.random() * 300, now + 0.05);
    scrape.frequency.linearRampToValueAtTime(180, now + 0.55);
    const sFilter = this.context.createBiquadFilter();
    sFilter.type = 'bandpass';
    sFilter.frequency.value = 700;
    sFilter.Q.value = 6;
    const sGain = this.context.createGain();
    sGain.gain.setValueAtTime(0, now + 0.05);
    sGain.gain.linearRampToValueAtTime(0.07, now + 0.1);
    sGain.gain.linearRampToValueAtTime(0, now + 0.6);
    const pan = this.context.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 2;
    scrape.connect(sFilter); sFilter.connect(sGain); sGain.connect(pan); pan.connect(this.sfxGain);
    scrape.start(now + 0.05); scrape.stop(now + 0.65);
    scrape.onended = () => { scrape.disconnect(); sFilter.disconnect(); sGain.disconnect(); pan.disconnect(); };
  }

  /** TV estática — ráfaga de ruido blanco filtrado */
  playTVStatic(): void {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    const duration = 0.4 + Math.random() * 1.2;
    const bufSize = Math.ceil(this.context.sampleRate * duration);
    const buf = this.context.createBuffer(1, bufSize, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.context.createBufferSource();
    src.buffer = buf;
    const hiFilter = this.context.createBiquadFilter();
    hiFilter.type = 'bandpass';
    hiFilter.frequency.value = 3000 + Math.random() * 2000;
    hiFilter.Q.value = 0.5;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.05, now + 0.03);
    gain.gain.setValueAtTime(0.07, now + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.8;
    src.connect(hiFilter); hiFilter.connect(gain); gain.connect(panner); panner.connect(this.ambientGain);
    src.start(now);
    src.onended = () => { src.disconnect(); hiFilter.disconnect(); gain.disconnect(); panner.disconnect(); };
  }

  /** Ráfaga de ventilación — viento que pasa por el conducto */
  playVentGust(): void {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    const duration = 0.8 + Math.random() * 1.5;
    const bufSize = Math.ceil(this.context.sampleRate * duration);
    const buf = this.context.createBuffer(1, bufSize, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.context.createBufferSource();
    src.buffer = buf;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.05, now + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.5;
    src.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(this.ambientGain);
    src.start(now);
    src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
  }

  /** Sonido de puerta cerrándose/abriéndose (público) */
  playDoorCreak(): void {
    if (!this.context || !this.ambientGain) return;
    const now = this.context.currentTime;
    this.playDoorCreakInternal(now);
  }

  /** Sonido de click para UI */
  playUIClick(): void {
    if (!this.context || !this.sfxGain) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('[AudioManager] Error playing UI click:', e);
    }
  }

  /** Sonido de hover para UI */
  playUIHover(): void {
    if (!this.context || !this.sfxGain) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(700, now + 0.03);
      
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('[AudioManager] Error playing UI hover:', e);
    }
  }

  // Llamar cada frame desde Game.ts con la distancia al enemigo más cercano
  updateEnemyProximity(closestDist: number): void {
    if (!this.context || !this.proximityGain || !this.proximityLfo) return;

    const maxDist = 18;
    const targetVol = closestDist < maxDist
      ? Math.pow(1 - closestDist / maxDist, 2.5) * 0.35
      : 0;

    // Transición suave de 0.3s para evitar clicks
    this.proximityGain.gain.setTargetAtTime(targetVol, this.context.currentTime, 0.3);

    // Frecuencia del LFO más rápida cuando el enemigo está cerca (respiración más agitada)
    const lfoFreq = 0.4 + (1 - Math.min(closestDist, maxDist) / maxDist) * 1.2;
    this.proximityLfo.frequency.setTargetAtTime(lfoFreq, this.context.currentTime, 0.5);
  }

  startAmbientMusic(): void {
    if (!this.context || !this.musicGain) return;

    this.droneOsc = this.context.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 40;

    const droneFilter = this.context.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 100;
    droneFilter.Q.value = 5;

    const droneGain = this.context.createGain();
    droneGain.gain.value = 0.25;

    this.droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.musicGain);
    this.droneOsc.start();

    this.droneOsc2 = this.context.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.value = 35;

    const drone2Gain = this.context.createGain();
    drone2Gain.gain.value = 0.15;

    this.droneOsc2.connect(drone2Gain);
    drone2Gain.connect(this.musicGain);
    this.droneOsc2.start();

    this.tensionOsc = this.context.createOscillator();
    this.tensionOsc.type = 'sine';
    this.tensionOsc.frequency.value = 80;

    const tensionFilter = this.context.createBiquadFilter();
    tensionFilter.type = 'bandpass';
    tensionFilter.frequency.value = 200;
    tensionFilter.Q.value = 10;

    const tensionGain = this.context.createGain();
    tensionGain.gain.value = 0;

    this.tensionOsc.connect(tensionFilter);
    tensionFilter.connect(tensionGain);
    tensionGain.connect(this.musicGain);
    this.tensionOsc.start();

    this.dangerOsc = this.context.createOscillator();
    this.dangerOsc.type = 'square';
    this.dangerOsc.frequency.value = 60;

    const dangerFilter = this.context.createBiquadFilter();
    dangerFilter.type = 'lowpass';
    dangerFilter.frequency.value = 150;

    const dangerGain = this.context.createGain();
    dangerGain.gain.value = 0;

    this.dangerOsc.connect(dangerFilter);
    dangerFilter.connect(dangerGain);
    dangerGain.connect(this.musicGain);
    this.dangerOsc.start();

    console.log('[AudioManager] Música terrorífica iniciada');
  }

  startAtmosphericAmbience(): void {
    if (!this.context || !this.ambientGain) return;

    this.startWindNoise();
    this.startFluorescentHum();
  }

  private startWindNoise(): void {
    if (!this.context || !this.ambientGain) return;

    const bufferSize = this.context.sampleRate * 4;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    this.windNoise = this.context.createBufferSource();
    this.windNoise.buffer = buffer;
    this.windNoise.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.context.createGain();
    gain.gain.value = 0.08;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.03;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    this.windNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    this.windNoise.start();
  }

  startFluorescentHum(): void {
    if (!this.context || !this.ambientGain || this.fluorescentOsc) return;

    this.fluorescentOsc = this.context.createOscillator();
    this.fluorescentOsc.type = 'sawtooth';
    this.fluorescentOsc.frequency.value = 100;

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 100;
    filter.Q.value = 20;

    const gain = this.context.createGain();
    gain.gain.value = 0.03;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 15;

    lfo.connect(lfoGain);
    lfoGain.connect(this.fluorescentOsc.frequency);
    lfo.start();

    this.fluorescentOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    this.fluorescentOsc.start();
  }

  updateDynamicMusic(distance: number): void {
    if (!this.context || !this.musicGain) return;

    const tensionValue = Math.max(0, (1 - distance / 12)) * 0.4;
    const dangerValue = Math.max(0, (1 - distance / 5)) * 0.35;

    const now = this.context.currentTime;
    this.musicGain.gain.linearRampToValueAtTime(tensionValue, now + 0.2);
    this.musicGain.gain.linearRampToValueAtTime(dangerValue, now + 0.1);
  }

  playHeartbeat(distance: number): void {
    if (!this.context || !this.sfxGain || distance > 6) return;

    const intensity = 1 - (distance / 6);
    const now = this.context.currentTime;
    
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.15;
      
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 50 + intensity * 20;

      const gain = this.context.createGain();
      const vol = 0.2 + intensity * 0.3;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 80 + intensity * 40;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  playMonsterFootstep(position: THREE.Vector3, enemyType: string = 'stalker'): void {
    if (!this.context || !this.sfxGain || !this.listener) return;

    let duration: number;
    let volume: number;
    
    switch (enemyType) {
      case 'runner':
        duration = 0.06;
        volume = 0.5;
        break;
      case 'teleporter':
        duration = 0.1;
        volume = 0.35;
        break;
      default:
        duration = 0.12;
        volume = 0.3;
    }

    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 30);
      const noise = (Math.random() * 2 - 1);
      const tone = Math.sin(t * 80 * Math.PI * 2) * 0.4;
      data[i] = (noise * 0.6 + tone) * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 30;
    panner.rolloffFactor = 1.5;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.context.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.sfxGain);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      panner.disconnect();
      gain.disconnect();
    };
    source.start();
  }

  playEnemyBreathing(distance: number, enemyType: string = 'stalker'): void {
    if (!this.context || !this.sfxGain || distance > 12) return;
    
    const now = this.context.currentTime;
    const volume = Math.max(0, 0.2 * (1 - distance / 12));
    
    const osc = this.context.createOscillator();
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    switch (enemyType) {
      case 'runner':
        osc.type = 'sawtooth';
        osc.frequency.value = 60;
        lfo.frequency.value = 12;
        break;
      case 'teleporter':
        osc.type = 'sine';
        osc.frequency.value = 30;
        lfo.frequency.value = 2;
        break;
      default:
        osc.type = 'sawtooth';
        osc.frequency.value = 50;
        lfo.frequency.value = 6;
    }

    lfoGain.gain.value = 25;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.4);
    gain.gain.linearRampToValueAtTime(0, now + 1.2);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.2);
    lfo.stop(now + 1.2);
    osc.onended = () => { osc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playPlayerFootstep(): void {
    if (!this.context || !this.sfxGain) return;

    const bufferSize = this.context.sampleRate * 0.06;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 40);
      data[i] = (Math.random() * 2 - 1) * 0.4 * envelope;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const gain = this.context.createGain();
    gain.gain.value = 0.12;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start();
  }

  playBreathSound(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 4;

    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 40;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 3;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.5);
    lfo.stop(now + 1.5);
    osc.onended = () => { osc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playFlashlightOn(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.15);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;

    const distortion = this.context.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;

    osc.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
    osc.onended = () => { osc.disconnect(); distortion.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playFlashlightOff(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.3);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.35);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playBatteryEmpty(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc1 = this.context.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.linearRampToValueAtTime(100, now + 0.5);

    const osc2 = this.context.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.linearRampToValueAtTime(50, now + 0.6);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);
    osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playFootstepsBehind(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.35 + Math.random() * 0.1;
      
      const bufferSize = this.context.sampleRate * 0.08;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let j = 0; j < bufferSize; j++) {
        const t = j / bufferSize;
        const envelope = Math.exp(-t * 25);
        data[j] = (Math.random() * 2 - 1) * 0.5 * envelope;
      }

      const source = this.context.createBufferSource();
      source.buffer = buffer;

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.55, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

      const panner = this.context.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.8;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);

      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
      source.start(now + delay);
    }
  }

  playVoiceCall(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    const phrases = ['¿Estás ahí?', 'Ayúdame', 'No me ignores', 'Ven aquí', '¿Por qué huís?'];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    const words = phrase.split(' ');
    
    words.forEach((_word, idx) => {
      const wordOsc = this.context!.createOscillator();
      wordOsc.type = 'sine';
      wordOsc.frequency.value = 150 + Math.random() * 80;

      const lfo = this.context!.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5 + Math.random() * 3;

      const lfoGain = this.context!.createGain();
      lfoGain.gain.value = 20;

      lfo.connect(lfoGain);
      lfoGain.connect(wordOsc.frequency);

      const filter = this.context!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 400 + Math.random() * 200;
      filter.Q.value = 8;

      const wordGain = this.context!.createGain();
      const startTime = now + idx * 0.25;
      wordGain.gain.setValueAtTime(0, startTime);
      wordGain.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
      wordGain.gain.linearRampToValueAtTime(0.08, startTime + 0.15);
      wordGain.gain.linearRampToValueAtTime(0, startTime + 0.3);

      const panner = this.context!.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 1.2;

      wordOsc.connect(filter);
      filter.connect(wordGain);
      wordGain.connect(panner);
      panner.connect(this.sfxGain!);

      wordOsc.start(startTime);
      lfo.start(startTime);
      wordOsc.stop(startTime + 0.35);
      lfo.stop(startTime + 0.35);
      wordOsc.onended = () => { wordOsc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); filter.disconnect(); wordGain.disconnect(); panner.disconnect(); };
    });
  }

  playCreepyLaugh(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.3 + Math.random() * 0.15;
      
      const osc = this.context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200 + Math.random() * 100, now + delay);
      osc.frequency.linearRampToValueAtTime(80 + Math.random() * 50, now + delay + 0.2);

      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 300;
      filter.Q.value = 10;

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.25);

      const panner = this.context.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 1.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
    }
  }

  playItemPickup(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playPowerUpPickup(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    // Usar solo 2 osciladores para reducir carga
    const frequencies = [659.25, 1046.50];
    frequencies.forEach((freq, i) => {
      const osc = this.context!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.context!.createGain();
      const startTime = now + i * 0.06;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });

    // Ruido corto y simple
    const bufferSize = this.context.sampleRate * 0.15;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.15;
    }
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    noise.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.15);
    noise.onended = () => { noise.disconnect(); };
  }

  playNoteFound(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    osc.frequency.linearRampToValueAtTime(400, now + 0.3);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.55);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playRandomWhisper(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    const duration = 1 + Math.random() * 2;

    const osc1 = this.context.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 150 + Math.random() * 100;

    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 100 + Math.random() * 50;

    const modOsc = this.context.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.value = 3 + Math.random() * 5;

    const modGain = this.context.createGain();
    modGain.gain.value = 30;

    modOsc.connect(modGain);
    modGain.connect(osc1.frequency);

    const mod2Osc = this.context.createOscillator();
    mod2Osc.type = 'sine';
    mod2Osc.frequency.value = 2 + Math.random() * 3;

    const mod2Gain = this.context.createGain();
    mod2Gain.gain.value = 20;

    mod2Osc.connect(mod2Gain);
    mod2Gain.connect(osc2.frequency);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.05, now + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.5;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    modOsc.start(now);
    mod2Osc.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    modOsc.stop(now + duration);
    mod2Osc.stop(now + duration);
    osc1.onended = () => { osc1.disconnect(); osc2.disconnect(); modOsc.disconnect(); mod2Osc.disconnect(); modGain.disconnect(); mod2Gain.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
  }

  playRandomAmbientSound(): void {
    if (!this.context || !this.ambientGain) return;

    const now = this.context.currentTime;
    const soundType = Math.floor(Math.random() * 4);

    switch (soundType) {
      case 0:
        this.playDrip(now);
        break;
      case 1:
        this.playDoorCreakInternal(now);
        break;
      case 2:
        this.playMurmur(now);
        break;
      case 3:
        this.playThump(now);
        break;
    }
  }

  private playDrip(now: number): void {
    if (!this.context || !this.ambientGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800 + Math.random() * 400;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.3);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  private playDoorCreakInternal(now: number): void {
    if (!this.context || !this.ambientGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.02, now + 0.8);
    gain.gain.linearRampToValueAtTime(0, now + 1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 1);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  private playMurmur(now: number): void {
    if (!this.context || !this.ambientGain) return;

    for (let i = 0; i < 3; i++) {
      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 80 + Math.random() * 40;

      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200;
      filter.Q.value = 10;

      const gain = this.context.createGain();
      const startTime = now + Math.random() * 0.5;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.03, startTime + 0.3);
      gain.gain.linearRampToValueAtTime(0, startTime + 1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(startTime);
      osc.stop(startTime + 1);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
  }

  private playThump(now: number): void {
    if (!this.context || !this.ambientGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.5);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playJumpscareSound(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.context.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(300 - i * 50 + Math.random() * 100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 1);

      const distortion = this.context.createWaveShaper();
      const curve = new Float32Array(256);
      for (let j = 0; j < 256; j++) {
        const x = (j - 128) / 128;
        curve[j] = Math.tanh(x * 8);
      }
      distortion.curve = curve;

      osc.connect(distortion);
      distortion.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 1.5);
      osc.onended = () => { osc.disconnect(); distortion.disconnect(); filter.disconnect(); gain.disconnect(); };
    }

    const noiseBuffer = this.createNoiseBuffer(2);
    const noise = this.context.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(4000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 1.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 2);
    noise.onended = () => { noise.disconnect(); noiseFilter.disconnect(); noiseGain.disconnect(); };
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.context) throw new Error('Audio context not initialized');
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    return buffer;
  }

  playDripSound(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 10;

    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };

    if (Math.random() < 0.4) {
      setTimeout(() => {
        const osc2 = this.context!.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000 + Math.random() * 600, this.context!.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(150, this.context!.currentTime + 0.1);

        const gain2 = this.context!.createGain();
        gain2.gain.setValueAtTime(0.1, this.context!.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.context!.currentTime + 0.12);

        osc2.connect(gain2);
        gain2.connect(panner);
        osc2.start();
        osc2.stop(this.context!.currentTime + 0.15);
        osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
      }, 100 + Math.random() * 200);
    }
  }

  playMetalCreak(): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 40, now);
    osc.frequency.linearRampToValueAtTime(40 + Math.random() * 20, now + 0.5);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 15;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    const distortion = this.context.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      curve[i] = Math.tanh(x * 3);
    }
    distortion.curve = curve;

    osc.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.7);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); distortion.disconnect(); gain.disconnect(); };
  }

  playHideEnter(): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    // Susurro grave — "agacharse en la oscuridad"
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.6);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  playHideExit(): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  stop(): void {
    this.droneOsc?.stop();
    this.droneOsc2?.stop();
    this.tensionOsc?.stop();
    this.dangerOsc?.stop();
    this.fluorescentOsc?.stop();
    this.windNoise?.stop();
    this.context?.close();
    this.isInitialized = false;
  }

  /** Sonidos ambientes específicos por nivel. Llamar una vez al iniciar. */
  startLevelAmbience(level: string): void {
    if (!this.context || !this.ambientGain) return;

    switch (level) {
      case 'level1':
        this._startVentilationHum(120, 0.04);
        this._startDistantPipe(0.025);
        break;
      case 'level2':
        // Más electrónico / industrial — solo ventilación suave
        this._startVentilationHum(150, 0.035);
        break;
      case 'level3':
        // Salas abiertas — más eco, viento lejano más fuerte
        this._startVentilationHum(90, 0.06);
        this._startDistantPipe(0.04);
        this._startElectricBuzz(0.015);
        break;
      case 'ultimate':
        // Todo en máximo — presión máxima
        this._startVentilationHum(60, 0.07);
        this._startDistantPipe(0.05);
        this._startElectricBuzz(0.04);
        this._startLowRumble(0.06);
        break;
    }
  }

  /** Zumbido de ventilación — tono periódico tipo conducto de aire */
  private _startVentilationHum(baseFreq: number, vol: number): void {
    if (!this.context || !this.ambientGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = baseFreq;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq * 1.5;
    filter.Q.value = 8;

    const gain = this.context.createGain();
    gain.gain.value = vol;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    osc.start();
    lfo.start();
  }

  /** Golpe lejano de cañería/tubo — boom periódico irregular */
  private _startDistantPipe(vol: number): void {
    if (!this.context || !this.ambientGain) return;

    const schedulePipe = () => {
      if (!this.context || !this.ambientGain) return;
      const delay = 4 + Math.random() * 8;
      const now = this.context.currentTime + delay;

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55 + Math.random() * 20, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ambientGain);
      osc.start(now);
      osc.stop(now + 0.65);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); schedulePipe(); };
    };
    schedulePipe();
  }

  /** Zumbido eléctrico tipo transformador / fluorescente roto */
  private _startElectricBuzz(vol: number): void {
    if (!this.context || !this.ambientGain) return;

    const osc = this.context.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 60;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 200;

    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 3 + Math.random() * 5;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = vol * 0.5;
    lfo.connect(lfoGain);

    const gain = this.context.createGain();
    gain.gain.value = vol;
    lfoGain.connect(gain.gain);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    osc.start();
    lfo.start();
  }

  // ── Mini-sustos: sonidos fuertes ambientales ───────────────────────────────

  /** Golpe seco MUY fuerte: puerta que se cierra de golpe, algo que cae */
  playLoudBang(): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    // Sub-golpe de impacto grave
    const subOsc = this.context.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35);
    const subGain = this.context.createGain();
    subGain.gain.setValueAtTime(0.92, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    subOsc.connect(subGain); subGain.connect(this.sfxGain);
    subOsc.start(now); subOsc.stop(now + 0.6);
    subOsc.onended = () => { subOsc.disconnect(); subGain.disconnect(); };

    // Ruido blanco de impacto (la "madera" del golpe)
    const bufSize = Math.ceil(this.context.sampleRate * 0.25);
    const buf = this.context.createBuffer(1, bufSize, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / bufSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.85;
    }
    const noise = this.context.createBufferSource();
    noise.buffer = buf;
    const nFilter = this.context.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.value = 2000;
    const nGain = this.context.createGain();
    nGain.gain.setValueAtTime(0.85, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    const nPan = this.context.createStereoPanner();
    nPan.pan.value = (Math.random() - 0.5) * 1.6;
    noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(nPan); nPan.connect(this.sfxGain);
    noise.start(now); noise.stop(now + 0.3);
    noise.onended = () => { noise.disconnect(); nFilter.disconnect(); nGain.disconnect(); nPan.disconnect(); };

    // Reverb corto: eco del pasillo
    const revBufSize = Math.ceil(this.context.sampleRate * 0.5);
    const revBuf = this.context.createBuffer(1, revBufSize, this.context.sampleRate);
    const revData = revBuf.getChannelData(0);
    for (let i = 0; i < revBufSize; i++) {
      const t = i / revBufSize;
      revData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.3;
    }
    const rev = this.context.createBufferSource();
    rev.buffer = revBuf;
    const revGain = this.context.createGain();
    revGain.gain.value = 0.45;
    rev.connect(revGain); revGain.connect(this.sfxGain);
    rev.start(now + 0.05); rev.stop(now + 0.6);
    rev.onended = () => { rev.disconnect(); revGain.disconnect(); };
  }

  /** Zumbido eléctrico cuando una luz se apaga/enciende de golpe */
  playLightBuzz(): void {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const duration = 0.5 + Math.random() * 0.4;

    // Ruido blanco pulsante tipo tubo fluorescente
    const bufSize = Math.ceil(this.context.sampleRate * duration);
    const buf = this.context.createBuffer(1, bufSize, this.context.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t   = i / this.context.sampleRate;
      const env = Math.abs(Math.sin(t * Math.PI * 40)) > 0.25 ? 1 : 0.08;
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.context.createBufferSource();
    noise.buffer = buf;

    const hiFilter = this.context.createBiquadFilter();
    hiFilter.type = 'bandpass';
    hiFilter.frequency.value = 4000 + Math.random() * 2000;
    hiFilter.Q.value = 1.5;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.015);
    gain.gain.setValueAtTime(0.65, now + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    const panner = this.context.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.8;

    noise.connect(hiFilter); hiFilter.connect(gain); gain.connect(panner); panner.connect(this.sfxGain);
    noise.start(now);
    noise.onended = () => { noise.disconnect(); hiFilter.disconnect(); gain.disconnect(); panner.disconnect(); };
  }

  /** Rumble grave continuo — sensación de que las paredes vibran */
  private _startLowRumble(vol: number): void {
    if (!this.context || !this.ambientGain) return;

    const bufSize = this.context.sampleRate * 2;
    const buf = this.context.createBuffer(1, bufSize, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

    const noise = this.context.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 60;

    const gain = this.context.createGain();
    gain.gain.value = vol;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();
  }
}
