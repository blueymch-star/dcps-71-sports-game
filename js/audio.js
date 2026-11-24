window.RelayGame = window.RelayGame || {};

(function (G) {
  "use strict";

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.bgmEnabled = true;
      this.sfxEnabled = true;
      this.bgmMode = "none"; // "none" | "stage" | "boss" | "victory"
      this._bgmTimer = null;
      this._step = 0;
    }

    unlock() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    setBgmEnabled(val) {
      this.bgmEnabled = !!val;
      if (!this.bgmEnabled) {
        this._stopLoop();
      } else if (this.bgmMode !== "none") {
        this._startLoop();
      }
    }

    setSfxEnabled(val) {
      this.sfxEnabled = !!val;
    }

    setBgm(mode) {
      if (this.bgmMode === mode && this._bgmTimer) return;
      this.bgmMode = mode;
      this._step = 0;
      this._stopLoop();
      if (this.bgmEnabled && mode !== "none") {
        this._startLoop();
      }
    }

    _stopLoop() {
      if (this._bgmTimer) {
        clearInterval(this._bgmTimer);
        this._bgmTimer = null;
      }
    }

    _startLoop() {
      this._stopLoop();
      const tempoMs = this.bgmMode === "boss" ? 135 : this.bgmMode === "victory" ? 190 : 165;
      this._bgmTimer = setInterval(() => this._tickBgm(), tempoMs);
    }

    _tone(freq, dur, type = "square", gainVal = 0.06, slideTo = null) {
      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    }

    _tickBgm() {
      if (!this.bgmEnabled || !this.ctx || this.ctx.state !== "running") return;
      const s = this._step++;
      if (this.bgmMode === "stage") {
        // Cheerful sports-day march melody
        const lead = [523, 659, 784, 659, 880, 784, 659, 587, 523, 659, 784, 880, 1046, 880, 784, 659];
        const bass = [131, 196, 165, 196, 175, 196, 165, 147];
        const n = lead[s % lead.length];
        const b = bass[s % bass.length];
        if (s % 2 === 0 || s % 4 === 3) {
          this._tone(n, 0.12, "square", 0.028);
        }
        this._tone(b, 0.14, "triangle", 0.036);
      } else if (this.bgmMode === "boss") {
        // Energetic boss battle riff
        const lead = [330, 392, 440, 494, 440, 392, 349, 392, 330, 294, 330, 392, 523, 494, 440, 392];
        const bass = [110, 110, 147, 131, 110, 110, 165, 147];
        this._tone(lead[s % lead.length], 0.1, "sawtooth", 0.025);
        this._tone(bass[s % bass.length], 0.12, "triangle", 0.04);
      } else if (this.bgmMode === "victory") {
        const fanfare = [523, 659, 784, 1046, 784, 1046, 1318, 0];
        const f = fanfare[s % fanfare.length];
        if (f > 0) this._tone(f, 0.16, "square", 0.032);
      }
    }

    play(name) {
      if (!this.sfxEnabled) return;
      this.unlock();
      switch (name) {
        case "jump":
          this._tone(260, 0.14, "square", 0.06, 620);
          break;
        case "doubleJump":
          this._tone(380, 0.15, "triangle", 0.07, 860);
          break;
        case "dash":
          this._tone(540, 0.11, "sawtooth", 0.05, 140);
          break;
        case "shoot":
          this._tone(740, 0.08, "square", 0.045, 220);
          break;
        case "shootLaser":
          this._tone(1120, 0.12, "sawtooth", 0.05, 420);
          break;
        case "hit":
          this._tone(210, 0.08, "sawtooth", 0.055, 90);
          break;
        case "hurt":
          this._tone(190, 0.22, "sawtooth", 0.08, 70);
          break;
        case "slip":
          this._tone(620, 0.2, "triangle", 0.07, 180);
          break;
        case "calm":
          this._tone(523, 0.12, "sine", 0.06, 784);
          setTimeout(() => this._tone(784, 0.15, "sine", 0.06, 1046), 70);
          break;
        case "pickup":
          this._tone(523, 0.09, "square", 0.055);
          setTimeout(() => this._tone(659, 0.09, "square", 0.055), 65);
          setTimeout(() => this._tone(880, 0.14, "square", 0.06), 130);
          break;
        case "super":
          this._tone(330, 0.25, "sawtooth", 0.07, 1280);
          setTimeout(() => this._tone(660, 0.3, "square", 0.07, 1560), 100);
          break;
        case "warning":
          this._tone(440, 0.18, "sawtooth", 0.07, 320);
          break;
        case "perfect":
          this._tone(659, 0.1, "square", 0.07);
          setTimeout(() => this._tone(880, 0.12, "square", 0.07), 80);
          setTimeout(() => this._tone(1318, 0.25, "square", 0.075), 160);
          break;
        case "confirm":
          this._tone(620, 0.08, "square", 0.05, 840);
          break;
        default:
          break;
      }
    }
  }

  G.Audio = new SoundEngine();
})(window.RelayGame);
