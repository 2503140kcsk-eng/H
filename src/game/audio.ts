export type AudioCue = "launch" | "pause" | "resume" | "boss" | "weakpoint" | "shield" | "special" | "victory" | "defeat" | "unlock";

const NORMAL_MELODY = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 11, 9, 7, 4, 2];
const BOSS_MELODY = [0, 3, 7, 10, 7, 3, 12, 10, 0, 5, 8, 12, 10, 8, 5, 3];
const CUE_FREQUENCIES: Record<AudioCue, number> = {
  launch: 660, pause: 280, resume: 520, boss: 180, weakpoint: 1040,
  shield: 470, special: 880, victory: 990, defeat: 150, unlock: 760
};

/** Original, low-cost procedural soundtrack. Audio begins only after a player gesture. */
export class SoundDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private connected = false;
  private timer: number | null = null;
  private step = 0;
  private volume = 0.65;
  private bossMode = false;

  setVolume(value: number): void {
    this.volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume * 0.34, this.context.currentTime, 0.04);
  }

  private unlock(): AudioContext | null {
    if (!("AudioContext" in window)) return null;
    try {
      this.context ??= new AudioContext();
      this.master ??= this.context.createGain();
      if (!this.connected) {
        this.master.gain.value = this.volume * 0.34;
        this.master.connect(this.context.destination);
        this.connected = true;
      }
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  private note(frequency: number, duration: number, type: OscillatorType, level: number, at?: number): void {
    const context = this.unlock();
    if (!context || !this.master || this.volume <= 0) return;
    try {
      const start = at ?? context.currentTime + 0.012;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    } catch {
      // A browser may reject audio while suspended; gameplay remains unaffected.
    }
  }

  tone(frequency: number, duration = 0.075): void {
    this.note(frequency, duration, "triangle", 0.09 * this.volume);
  }

  cue(cue: AudioCue): void {
    const frequency = CUE_FREQUENCIES[cue];
    const type: OscillatorType = cue === "boss" || cue === "defeat" ? "sawtooth" : "triangle";
    this.note(frequency, cue === "victory" || cue === "defeat" ? 0.34 : 0.14, type, 0.12 * this.volume);
    if (cue === "victory") {
      this.note(frequency * 1.25, 0.28, "sine", 0.07 * this.volume, (this.context?.currentTime ?? 0) + 0.13);
    }
  }

  setBossMode(active: boolean): void {
    if (this.bossMode === active) return;
    this.bossMode = active;
    if (active) this.cue("boss");
  }

  startMusic(): void {
    if (this.timer !== null) return;
    if (!this.unlock()) return;
    this.step = 0;
    this.tickMusic();
    this.timer = window.setInterval(() => this.tickMusic(), 220);
  }

  private tickMusic(): void {
    const pattern = this.bossMode ? BOSS_MELODY : NORMAL_MELODY;
    const semitone = pattern[this.step % pattern.length];
    const context = this.unlock();
    if (!context) return;
    const now = context.currentTime + 0.018;
    const root = this.bossMode ? 146.83 : 196;
    this.note(root * Math.pow(2, semitone / 12), 0.16, this.bossMode ? "sawtooth" : "triangle", 0.035 * this.volume, now);
    if (this.step % 4 === 0) {
      this.note(root / 2, 0.3, "sine", 0.055 * this.volume, now);
      this.note(root * Math.pow(2, (this.bossMode ? 7 : 4) / 12), 0.26, "sine", 0.018 * this.volume, now);
    }
    this.step += 1;
  }

  stopMusic(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.bossMode = false;
  }

  dispose(): void {
    this.stopMusic();
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = null;
    this.master = null;
    this.connected = false;
  }
}
