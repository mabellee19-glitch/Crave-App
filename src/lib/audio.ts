/**
 * Signalton fuer den Kochtimer.
 *
 * Safari erlaubt Audio nur nach einer Nutzerinteraktion. Deshalb wird der
 * AudioContext beim ersten Tippen irgendwo in der App erzeugt und danach
 * offengehalten – wenn der Timer spaeter ablaeuft, ist er bereits entsperrt.
 */

type Ctx = AudioContext & { resume: () => Promise<void> };

let ctx: Ctx | null = null;
let stopCurrent: (() => void) | null = null;

function createContext(): Ctx | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor() as Ctx;
  } catch {
    return null;
  }
}

/** Beim ersten Tap aufrufen – danach kann der Timer jederzeit klingeln. */
export function unlockAudio(): void {
  if (!ctx) ctx = createContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

/** Wiederholtes, freundliches Doppel-Ping. Gibt eine Stopp-Funktion zurueck. */
export function playAlarm(repeats = 8): () => void {
  stopAlarm();
  if (!ctx) ctx = createContext();
  const audio = ctx;
  if (!audio) return () => {};
  if (audio.state === 'suspended') void audio.resume().catch(() => {});

  const nodes: Array<OscillatorNode> = [];
  const start = audio.currentTime + 0.02;

  for (let i = 0; i < repeats; i++) {
    const base = start + i * 0.85;
    for (const [offset, freq] of [
      [0, 880],
      [0.16, 1174.7],
    ] as const) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const at = base + offset;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.28, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.28);
      nodes.push(osc);
    }
  }

  stopCurrent = () => {
    for (const node of nodes) {
      try {
        node.stop();
      } catch {
        /* bereits beendet */
      }
    }
  };
  return stopAlarm;
}

export function stopAlarm(): void {
  if (stopCurrent) {
    stopCurrent();
    stopCurrent = null;
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nicht unterstuetzt – kein Problem */
  }
}
