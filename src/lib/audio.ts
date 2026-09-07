/**
 * Weckerton fuer den Kochtimer.
 *
 * Drei Dinge stehen einem Ton auf dem iPhone im Weg, und alle drei werden
 * hier behandelt:
 *
 * 1. Safari laesst Audio erst nach einer Nutzerinteraktion zu. Deshalb wird
 *    der AudioContext beim ersten Tippen irgendwo in der App erzeugt.
 * 2. Der Stummschalter am Geraet legt normalen Web-Audio-Ton lahm. Mit der
 *    Audio-Session "playback" gilt der Ton als Medienwiedergabe und kommt
 *    auch bei stumm geschaltetem Klingeln durch. Gesetzt wird das nur
 *    waehrend des Kochens, damit die App sonst niemandem die Musik wegnimmt.
 * 3. Wird die App in den Hintergrund geschoben, haelt der Browser den
 *    AudioContext an. Ein einmal im Voraus geplanter Klingelbogen waere dann
 *    verloren. Deshalb wird jede Runde einzeln geplant und der Context vor
 *    jeder Runde wieder aufgeweckt.
 */

type Ctx = AudioContext & { resume: () => Promise<void> };

let ctx: Ctx | null = null;
let laufendeNoten: OscillatorNode[] = [];
let takt: number | null = null;

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

function aufwecken(audio: Ctx): void {
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
}

/** Beim ersten Tap aufrufen – danach kann der Timer jederzeit klingeln. */
export function unlockAudio(): void {
  if (!ctx) ctx = createContext();
  if (ctx) aufwecken(ctx);
}

/**
 * Audio-Session waehrend des Kochens auf Medienwiedergabe stellen.
 *
 * Nur so klingelt der Timer auch, wenn das Klingeln am Geraet ausgeschaltet
 * ist – und genau das erwartet man von einem Wecker. Ausserhalb des
 * Kochmodus wird wieder zurueckgestellt.
 *
 * Die Audio-Session-API gibt es bisher nur in Safari; wo sie fehlt, passiert
 * schlicht nichts.
 */
export function setAlarmSession(aktiv: boolean): void {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (!session) return;
  try {
    session.type = aktiv ? 'playback' : 'auto';
  } catch {
    /* nicht unterstuetzt – dann eben ohne */
  }
}

/**
 * Eine Runde: drei kurze, helle Toene wie bei einem Digitalwecker. Kurz und
 * bestimmt, damit man sie am Herd auch neben einem Dunstabzug hoert.
 */
function planeRunde(audio: Ctx, ab: number): void {
  const toene = [0, 0.2, 0.4];
  for (const versatz of toene) {
    const at = ab + versatz;
    // Grundton plus Oktave: gibt dem Ping Schaerfe, ohne schrill zu werden.
    for (const [freq, staerke] of [
      [1046.5, 0.5],
      [2093, 0.14],
    ] as const) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(staerke, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.2);
      laufendeNoten.push(osc);
    }
  }
}

/** Abstand zwischen zwei Runden – lang genug, um dazwischen zu atmen. */
const RUNDE_MS = 1400;

/**
 * Wecker starten. Klingelt in Runden weiter, bis er gestoppt wird oder
 * `dauerMs` um ist. Gibt eine Stopp-Funktion zurueck.
 */
export function playAlarm(dauerMs = 60_000): () => void {
  stopAlarm();
  if (!ctx) ctx = createContext();
  const audio = ctx;
  if (!audio) {
    // Ohne Ton wenigstens spuerbar.
    vibrate([300, 150, 300, 150, 500]);
    return () => {};
  }

  const beginn = Date.now();
  const runde = () => {
    aufwecken(audio);
    planeRunde(audio, audio.currentTime + 0.02);
    vibrate([250, 120, 250]);
    if (Date.now() - beginn + RUNDE_MS > dauerMs) stopAlarm();
  };

  runde();
  takt = window.setInterval(runde, RUNDE_MS);
  return stopAlarm;
}

export function stopAlarm(): void {
  if (takt !== null) {
    clearInterval(takt);
    takt = null;
  }
  for (const note of laufendeNoten) {
    try {
      note.stop();
    } catch {
      /* bereits beendet */
    }
  }
  laufendeNoten = [];
}

/** Kurzes Probeklingeln, damit sich der Ton vorher pruefen laesst. */
export function testAlarm(): void {
  playAlarm(2 * RUNDE_MS);
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nicht unterstuetzt – kein Problem */
  }
}
