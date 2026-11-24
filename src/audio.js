const ANNOUNCER_LINES = {
  goal: [
    'GOOOOL! Harika bir penaltı vuruşu!',
    'Top ağlarla buluştu! Muhteşem bir gol!',
    'Kaleci çaresiz, top filelerde! Gol!',
    'Soğukkanlı bir bitiriş, GOOOL!',
  ],
  panenka: [
    'İNANILMAZ! Panenka! Kaleciyi ters köşeye yatırdı!',
    'Usta işi bir Panenka vuruşu! Tribünler ayakta!',
    'Ne cesaret! Şık bir Panenka ile gol!',
  ],
  topCorner: [
    'DOKSANA ASTI! Örümcek ağlarını aldı, muhteşem gol!',
    'Tam köşeye, doksana giden füze! İnanılmaz gol!',
    'Çatala gitti! Durdurulması imkansız bir şut!',
  ],
  save: [
    'MUHTEŞEM KURTARIŞ! Kaleci gole izin vermedi!',
    'İnanılmaz bir refleks! Kaleci devleşti!',
    'Kurtardı! Bu gece kaleyi gole kapattı!',
    'Harika uzandı ve topu çeldi!',
  ],
  post: [
    'DİREK! Top direkten döndü, ne şanssızlık!',
    'Direkten patladı! Santimlerle gol kaçtı!',
    'İnanılmaz an, top direğe çarpıp oyun dışına çıktı!',
  ],
  miss: [
    'AUT! Top üstten dışarı gitti!',
    'Çerçeveyi bulamadı, tribünlerden derin bir iç çekiş!',
    'Çok sert vurdu ama isabet yok, aut!',
  ],
  champion: [
    'ŞAMPİYON! Kupa ellerde yükseliyor, büyük zafer!',
    'TARİHİ ZAFER! Turnuvanın şampiyonu belli oldu!',
  ],
  stutter: [
    'Vuruş öncesi harika bir şaşırtma!',
    'Bekledi, kaleciyi tarttı!',
  ],
};

export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let muted = false;

  // Ambient crowd nodes
  let crowdRunning = false;
  let crowdIntensity = 0.25;
  let crowdSource = null;
  let crowdFilter = null;
  let crowdGain = null;

  // Weather ambience nodes (rain)
  let currentWeather = 'clear';
  let rainSource = null;
  let rainGain = null;

  // Tension heartbeat + drumbeat
  let tensionLevel = 0;
  let tensionTimer = null;
  let beatStep = 0;

  // Turkish Web Speech API announcer
  let announcerEnabled = true;
  let cachedTrVoice = null;

  function resolveTrVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    cachedTrVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('tr')) || null;
    return cachedTrVoice;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    resolveTrVoice();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', resolveTrVoice);
    }
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.85;
    masterGain.connect(ctx.destination);

    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3;
    noiseBuffer = ctx.createBuffer(1, length, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
      b6 = white * 0.115926;
    }

    return ctx;
  }

  function unlock() {
    const c = ensureContext();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(() => {});
    }
    if (crowdRunning && !crowdSource) {
      startCrowdNodes();
    }
    if (currentWeather === 'rain' && !rainSource) {
      startRainNodes();
    }
  }

  function setMuted(bool) {
    muted = Boolean(bool);
    if (masterGain && ctx) {
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.03);
    }
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
  }

  function whistle() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;
    const dur = 0.46;

    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.025);
    env.gain.setValueAtTime(0.20, now + dur - 0.08);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    env.connect(masterGain);

    const osc1 = c.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2860, now);
    osc1.frequency.linearRampToValueAtTime(2940, now + 0.08);
    osc1.frequency.linearRampToValueAtTime(2800, now + dur);

    const osc2 = c.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(3090, now);
    osc2.frequency.linearRampToValueAtTime(3140, now + 0.08);

    const lfo = c.createOscillator();
    lfo.frequency.setValueAtTime(29, now);
    const lfoPitch = c.createGain();
    lfoPitch.gain.setValueAtTime(95, now);
    lfo.connect(lfoPitch);
    lfoPitch.connect(osc1.frequency);
    lfoPitch.connect(osc2.frequency);

    const mix2 = c.createGain();
    mix2.gain.value = 0.35;

    osc1.connect(env);
    osc2.connect(mix2);
    mix2.connect(env);

    const air = c.createBufferSource();
    air.buffer = noiseBuffer;
    const airFilter = c.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.setValueAtTime(3000, now);
    airFilter.Q.value = 4.0;
    const airGain = c.createGain();
    airGain.gain.value = 0.14;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(env);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    air.start(now);

    osc1.stop(now + dur + 0.02);
    osc2.stop(now + dur + 0.02);
    lfo.stop(now + dur + 0.02);
    air.stop(now + dur + 0.02);
  }

  function kick(power0to1 = 0.7) {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const p = Math.max(0.15, Math.min(1, Number(power0to1) || 0.7));
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125 + p * 55, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

    const oscGain = c.createGain();
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.45 + p * 0.4, now + 0.006);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.17);

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700 + p * 750, now);
    filter.Q.value = 1.4;

    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.28 + p * 0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.07);
  }

  function postHit() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    const partials = [
      { f: 385, g: 0.28, d: 0.75 },
      { f: 748, g: 0.22, d: 0.62 },
      { f: 1192, g: 0.16, d: 0.48 },
      { f: 1830, g: 0.10, d: 0.34 },
      { f: 2640, g: 0.06, d: 0.22 },
    ];

    for (const part of partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(part.f, now);

      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(part.g, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + part.d);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + part.d + 0.03);
    }

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1400, now);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.25, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  function netHit() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    filter.Q.value = 1.1;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.35);
  }

  function save() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.085);

    const og = c.createGain();
    og.gain.setValueAtTime(0.38, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(og);
    og.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.13);

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1350, now);
    bp.Q.value = 1.6;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.5, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.09);
  }

  function goalCheer() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(950, now + 2.8);
    filter.Q.value = 0.65;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.62, now + 0.32);
    gain.gain.setValueAtTime(0.54, now + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 3.1);

    const freqs = [261.63, 329.63, 392.0];
    for (const f of freqs) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(750, now);

      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.028, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(lp);
      lp.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.7);
    }
  }

  function missGroan() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(860, now);
    filter.frequency.exponentialRampToValueAtTime(310, now + 1.15);
    filter.Q.value = 2.4;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 1.4);
  }

  function pyroPop() {
    const c = ensureContext();
    if (!c || c.state === 'suspended') return;
    const now = c.currentTime;

    // Cannon thump
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.16);
    const og = c.createGain();
    og.gain.setValueAtTime(0.42, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(og);
    og.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Flare fizzle & sparkle burst
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(1800, now);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.32, now + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    noise.connect(hp);
    hp.connect(ng);
    ng.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.7);
  }

  function playTensionPulse() {
    const c = ensureContext();
    if (!c || c.state === 'suspended' || muted || tensionLevel < 0.2) return;
    const now = c.currentTime;
    const lvl = tensionLevel;

    // Heartbeat lub-dub
    const beat1 = c.createOscillator();
    beat1.type = 'sine';
    beat1.frequency.setValueAtTime(58, now);
    beat1.frequency.exponentialRampToValueAtTime(34, now + 0.09);
    const g1 = c.createGain();
    g1.gain.setValueAtTime(0.001, now);
    g1.gain.linearRampToValueAtTime(0.18 * lvl, now + 0.012);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    beat1.connect(g1);
    g1.connect(masterGain);
    beat1.start(now);
    beat1.stop(now + 0.15);

    const beat2 = c.createOscillator();
    beat2.type = 'sine';
    beat2.frequency.setValueAtTime(50, now + 0.17);
    beat2.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.001, now + 0.17);
    g2.gain.linearRampToValueAtTime(0.12 * lvl, now + 0.185);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);
    beat2.connect(g2);
    g2.connect(masterGain);
    beat2.start(now + 0.17);
    beat2.stop(now + 0.31);

    // Stadium rhythmic bass drum when tension is high (> 0.5)
    if (lvl > 0.48 && beatStep % 2 === 0) {
      const drum = c.createOscillator();
      drum.type = 'triangle';
      drum.frequency.setValueAtTime(105, now);
      drum.frequency.exponentialRampToValueAtTime(48, now + 0.14);
      const dg = c.createGain();
      dg.gain.setValueAtTime(0.001, now);
      dg.gain.linearRampToValueAtTime(0.16 * (lvl - 0.3), now + 0.008);
      dg.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      drum.connect(dg);
      dg.connect(masterGain);
      drum.start(now);
      drum.stop(now + 0.2);
    }
    beatStep++;
  }

  function scheduleTensionLoop() {
    if (tensionTimer) {
      clearTimeout(tensionTimer);
      tensionTimer = null;
    }
    if (tensionLevel < 0.2) return;
    playTensionPulse();
    const intervalMs = Math.round(920 - tensionLevel * 420);
    tensionTimer = setTimeout(scheduleTensionLoop, Math.max(420, intervalMs));
  }

  function setTension(v0to1) {
    const prev = tensionLevel;
    tensionLevel = Math.max(0, Math.min(1, Number(v0to1) || 0));
    if (tensionLevel >= 0.2 && prev < 0.2) {
      scheduleTensionLoop();
    } else if (tensionLevel < 0.2 && tensionTimer) {
      clearTimeout(tensionTimer);
      tensionTimer = null;
    }
  }

  function startCrowdNodes() {
    const c = ensureContext();
    if (!c || crowdSource) return;

    crowdSource = c.createBufferSource();
    crowdSource.buffer = noiseBuffer;
    crowdSource.loop = true;

    crowdFilter = c.createBiquadFilter();
    crowdFilter.type = 'lowpass';
    crowdFilter.frequency.value = 420 + crowdIntensity * 1200;

    crowdGain = c.createGain();
    crowdGain.gain.setValueAtTime(0.0001, c.currentTime);
    crowdGain.gain.setTargetAtTime(0.07 + crowdIntensity * 0.24, c.currentTime, 0.35);

    crowdSource.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(masterGain);
    crowdSource.start();
  }

  function stopCrowdNodes() {
    if (!crowdSource || !ctx) return;
    const src = crowdSource;
    const g = crowdGain;
    crowdSource = null;
    crowdFilter = null;
    crowdGain = null;

    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0.0001, now, 0.15);
    setTimeout(() => {
      try { src.stop(); src.disconnect(); } catch (_) {}
    }, 550);
  }

  function crowdAmbience(on) {
    crowdRunning = Boolean(on);
    if (crowdRunning) {
      const c = ensureContext();
      if (c && c.state === 'running') {
        startCrowdNodes();
      }
    } else {
      stopCrowdNodes();
    }
  }

  function setCrowdIntensity(v0to1) {
    crowdIntensity = Math.max(0, Math.min(1, Number(v0to1) || 0));
    if (ctx && crowdFilter && crowdGain) {
      const now = ctx.currentTime;
      crowdFilter.frequency.setTargetAtTime(420 + crowdIntensity * 1300, now, 0.3);
      crowdGain.gain.setTargetAtTime(0.07 + crowdIntensity * 0.26, now, 0.3);
    }
  }

  function startRainNodes() {
    const c = ensureContext();
    if (!c || rainSource) return;

    rainSource = c.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const hp = c.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2400;
    hp.Q.value = 0.55;

    rainGain = c.createGain();
    rainGain.gain.setValueAtTime(0.0001, c.currentTime);
    rainGain.gain.setTargetAtTime(0.11, c.currentTime, 0.4);

    rainSource.connect(hp);
    hp.connect(rainGain);
    rainGain.connect(masterGain);
    rainSource.start();
  }

  function stopRainNodes() {
    if (!rainSource || !ctx) return;
    const src = rainSource;
    const g = rainGain;
    rainSource = null;
    rainGain = null;

    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0.0001, now, 0.2);
    setTimeout(() => {
      try { src.stop(); src.disconnect(); } catch (_) {}
    }, 650);
  }

  function setWeatherAmbience(weather) {
    currentWeather = weather || 'clear';
    if (currentWeather === 'rain') {
      const c = ensureContext();
      if (c && c.state === 'running') {
        startRainNodes();
      }
    } else {
      stopRainNodes();
    }
  }

  function setAnnouncerEnabled(bool) {
    announcerEnabled = Boolean(bool);
    if (!announcerEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
  }

  function speak(event, extra) {
    if (!announcerEnabled || muted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const pool = ANNOUNCER_LINES[event];
    if (!pool || pool.length === 0) return;

    let line = pool[Math.floor(Math.random() * pool.length)];
    if (typeof extra === 'string' && extra.trim()) {
      line = `${line} ${extra.trim()}`;
    } else if (extra && typeof extra === 'object' && extra.speedKmh && extra.speedKmh >= 100 && (event === 'goal' || event === 'topCorner')) {
      line = `${line} Saatte ${Math.round(extra.speedKmh)} kilometre hızla!`;
    }

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(line);
      u.lang = 'tr-TR';
      const voice = cachedTrVoice || resolveTrVoice();
      if (voice) u.voice = voice;
      u.rate = 1.12;
      u.pitch = 1.06;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  return {
    unlock,
    setMuted,
    whistle,
    kick,
    postHit,
    netHit,
    save,
    goalCheer,
    missGroan,
    crowdAmbience,
    setCrowdIntensity,
    setTension,
    setWeatherAmbience,
    pyroPop,
    setAnnouncerEnabled,
    speak,
  };
}
