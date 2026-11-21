// Midnight Courier — sound, synthesized with the WebAudio API.
// No audio files: every effect is an oscillator or a burst of filtered
// noise shaped by an envelope. The context is created on the first user
// gesture (browsers block audio before that) and everything no-ops until
// then, so staged screenshots stay silent and error-free.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientStarted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.ctx = new AudioContext();
    } catch {
      return false;
    }
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone({ frequency = 440, endFrequency = null, type = 'sine', duration = 0.15, volume = 0.12, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  noiseBurst({ duration = 0.08, volume = 0.1, frequency = 1200, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.ctx.destination);
    source.start(start);
  }

  footstep(sneaking, onRug) {
    if (sneaking) {
      this.noiseBurst({ duration: 0.05, volume: 0.02, frequency: 500 });
    } else if (onRug) {
      this.noiseBurst({ duration: 0.06, volume: 0.035, frequency: 700 });
    } else {
      this.noiseBurst({ duration: 0.05, volume: 0.06, frequency: 1000 });
    }
  }

  coinClink() {
    this.tone({ frequency: 2093, duration: 0.09, volume: 0.1, type: 'triangle' });
    this.tone({ frequency: 2637, duration: 0.14, volume: 0.08, type: 'triangle', delay: 0.05 });
    this.noiseBurst({ duration: 0.05, volume: 0.05, frequency: 4000 });
  }

  sealPickup() {
    this.tone({ frequency: 523, duration: 0.12, volume: 0.1, type: 'triangle' });
    this.tone({ frequency: 784, duration: 0.2, volume: 0.1, type: 'triangle', delay: 0.09 });
  }

  suspicious() {
    this.tone({ frequency: 330, endFrequency: 415, duration: 0.22, volume: 0.09, type: 'sine' });
  }

  alert() {
    this.tone({ frequency: 220, endFrequency: 440, duration: 0.3, volume: 0.12, type: 'sawtooth' });
    this.tone({ frequency: 440, endFrequency: 220, duration: 0.3, volume: 0.08, type: 'sawtooth', delay: 0.12 });
  }

  caught() {
    this.tone({ frequency: 196, endFrequency: 98, duration: 0.5, volume: 0.14, type: 'sawtooth' });
    this.noiseBurst({ duration: 0.2, volume: 0.08, frequency: 300 });
  }

  doorUnlock() {
    this.tone({ frequency: 392, duration: 0.15, volume: 0.1, type: 'triangle' });
    this.tone({ frequency: 587, duration: 0.25, volume: 0.1, type: 'triangle', delay: 0.12 });
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((frequency, i) => {
      this.tone({ frequency, duration: 0.3, volume: 0.1, type: 'triangle', delay: i * 0.14 });
    });
  }

  click() {
    this.tone({ frequency: 660, duration: 0.06, volume: 0.07, type: 'square' });
  }

  // A low night drone that starts once, under everything else.
  startAmbient() {
    if (!this.ctx || this.ambientStarted || this.muted) return;
    this.ambientStarted = true;
    const oscillator = this.ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.025;
    const wobble = this.ctx.createOscillator();
    wobble.frequency.value = 0.07;
    const wobbleGain = this.ctx.createGain();
    wobbleGain.gain.value = 0.012;
    wobble.connect(wobbleGain).connect(gain.gain);
    oscillator.connect(gain).connect(this.ctx.destination);
    oscillator.start();
    wobble.start();
  }
}
