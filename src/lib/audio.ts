/**
 * Weckerton fuer den Kochtimer.
 *
 * Was einem Ton auf dem iPhone im Weg steht, und wie es hier geloest ist:
 *
 * 1. Safari spielt Ton erst nach einem Tippen ab – und zaehlt dafuer nur das
 *    Loslassen (pointerup, touchend, click), nicht das Aufsetzen des Fingers.
 *    Freigegeben wird deshalb beim Loslassen, und zwar so lange bei jedem
 *    Tippen, bis es geklappt hat. Zusaetzlich direkt beim Druck auf
 *    "Timer starten" und "Start Cooking".
 * 2. Der Stummschalter am Geraet legt Web-Audio-Ton lahm. Der Wecker ist
 *    deshalb eine echte Tondatei in einem <audio>-Element: das gilt als
 *    Medienwiedergabe und klingelt auch bei stumm geschaltetem Klingeln.
 *    Die Datei wird im Browser erzeugt (WAV, drei helle Toene, Pause) und
 *    laeuft in Schleife, bis jemand "Fertig" drueckt.
 * 3. Ein <audio>-Element darf spaeter nur von selbst spielen, wenn es einmal
 *    bei einem Tippen gestartet wurde. Das geschieht stumm, gleich wieder
 *    angehalten – man hoert nichts davon.
 * 4. Klappt das Element nicht, klingelt Web Audio wie bisher, mit der
 *    Audio-Session "playback" waehrend des Kochens. Und vibriert, wo es geht.
 */

type Ctx = AudioContext & { resume: () => Promise<void> };

let ctx: Ctx | null = null;
let laufendeNoten: OscillatorNode[] = [];
let takt: number | null = null;
let ende: number | null = null;

let wecker: HTMLAudioElement | null = null;
/** Einmal bei einem Tippen gestartet – darf jetzt jederzeit klingeln. */
let weckerFrei = false;
let freigabeLaeuft = false;
/** Klingelt der Wecker gerade (oder soll er gleich)? */
let klingelt = false;

/** Drei Toene, wie bei einem Digitalwecker. */
const TOENE = [0, 0.2, 0.4];
/** Grundton plus Oktave: gibt dem Ping Schaerfe, ohne schrill zu werden. */
const KLANG = [
  [1046.5, 0.5],
  [2093, 0.14],
] as const;
/** Abstand zwischen zwei Runden – lang genug, um dazwischen zu atmen. */
const RUNDE_MS = 1400;

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

/** Safari kennt neben "suspended" auch "interrupted" (nach Anruf, Sperrbildschirm). */
function aufwecken(audio: Ctx): void {
  if (audio.state !== 'running') void audio.resume().catch(() => {});
}

/**
 * Eine Runde Weckerton als WAV: drei Toene, dann Stille bis RUNDE_MS. In
 * Schleife gespielt ergibt das genau den Takt, den Web Audio auch hat.
 */
function weckerDatei(): Blob {
  const rate = 22050;
  const anzahl = Math.round((rate * RUNDE_MS) / 1000);
  const daten = new DataView(new ArrayBuffer(44 + anzahl * 2));
  const text = (stelle: number, wort: string) => {
    for (let i = 0; i < wort.length; i++) daten.setUint8(stelle + i, wort.charCodeAt(i));
  };
  text(0, 'RIFF');
  daten.setUint32(4, 36 + anzahl * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  daten.setUint32(16, 16, true);
  daten.setUint16(20, 1, true); // PCM
  daten.setUint16(22, 1, true); // mono
  daten.setUint32(24, rate, true);
  daten.setUint32(28, rate * 2, true);
  daten.setUint16(32, 2, true);
  daten.setUint16(34, 16, true);
  text(36, 'data');
  daten.setUint32(40, anzahl * 2, true);

  const anstieg = 0.012;
  const abklingen = 0.16;
  // Von voll auf 1/5000 in (abklingen - anstieg) Sekunden, wie bei Web Audio.
  const zerfall = Math.log(5000) / (abklingen - anstieg);
  const spitze = KLANG.reduce((summe, [, staerke]) => summe + staerke, 0);
  for (let i = 0; i < anzahl; i++) {
    const t = i / rate;
    let wert = 0;
    for (const beginn of TOENE) {
      const s = t - beginn;
      if (s < 0 || s > abklingen) continue;
      const huelle = s < anstieg ? s / anstieg : Math.exp(-zerfall * (s - anstieg));
      for (const [freq, staerke] of KLANG) wert += huelle * staerke * Math.sin(2 * Math.PI * freq * s);
    }
    daten.setInt16(44 + i * 2, Math.round((wert / spitze) * 0.9 * 32767), true);
  }
  return new Blob([daten.buffer], { type: 'audio/wav' });
}

function weckerElement(): HTMLAudioElement | null {
  if (wecker) return wecker;
  if (typeof window === 'undefined' || typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  try {
    const element = new Audio(URL.createObjectURL(weckerDatei()));
    element.loop = true;
    element.preload = 'auto';
    wecker = element;
  } catch {
    wecker = null;
  }
  return wecker;
}

function zumAnfang(element: HTMLAudioElement): void {
  try {
    element.currentTime = 0;
  } catch {
    /* noch nicht geladen – steht ohnehin am Anfang */
  }
}

/** Das Element einmal stumm anspielen, damit es spaeter von selbst darf. */
function weckerFreigeben(): void {
  if (weckerFrei || freigabeLaeuft || klingelt) return;
  const element = weckerElement();
  if (!element) return;
  freigabeLaeuft = true;
  element.muted = true;
  let versuch: Promise<void> | undefined;
  try {
    versuch = element.play();
  } catch {
    versuch = Promise.reject();
  }
  Promise.resolve(versuch)
    .then(() => {
      weckerFrei = true;
      if (!klingelt) {
        element.pause();
        zumAnfang(element);
      }
    })
    .catch(() => {})
    .finally(() => {
      element.muted = false;
      freigabeLaeuft = false;
    });
}

/** Bei einem Tippen aufrufen – danach kann der Timer jederzeit klingeln. */
export function unlockAudio(): void {
  if (!ctx) ctx = createContext();
  if (ctx) aufwecken(ctx);
  weckerFreigeben();
}

/** Ob alles freigegeben ist – dann braucht es keine weiteren Versuche. */
export function audioFreigegeben(): boolean {
  return weckerFrei && (ctx === null || ctx.state === 'running');
}

/**
 * Audio-Session waehrend des Kochens auf Medienwiedergabe stellen – fuer den
 * Fall, dass doch Web Audio klingelt. Ausserhalb des Kochmodus wird wieder
 * zurueckgestellt, damit die App sonst niemandem die Musik wegnimmt.
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

/** Eine Runde mit Web Audio, falls das Element nicht spielen darf. */
function planeRunde(audio: Ctx, ab: number): void {
  // Nur die Toene dieser Runde merken – der Wecker kann beliebig lange laufen.
  laufendeNoten = [];
  for (const versatz of TOENE) {
    const at = ab + versatz;
    for (const [freq, staerke] of KLANG) {
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

function mitWebAudio(): void {
  if (!ctx) ctx = createContext();
  const audio = ctx;
  if (!audio) return;
  const runde = () => {
    if (!klingelt) return;
    aufwecken(audio);
    planeRunde(audio, audio.currentTime + 0.02);
  };
  runde();
  if (takt !== null) clearInterval(takt);
  takt = window.setInterval(() => {
    runde();
    vibrate([250, 120, 250]);
  }, RUNDE_MS);
}

/**
 * Wecker starten. Klingelt weiter, bis er gestoppt wird – von selbst hoert
 * er nicht auf, genau wie ein Wecker. Gestoppt wird er ueber "Fertig", ueber
 * das Zuruecksetzen oder Neustarten des Timers und beim Verlassen des
 * Kochmodus.
 *
 * `dauerMs` begrenzt das nur fuers Probeklingeln.
 */
export function playAlarm(dauerMs = Infinity): () => void {
  stopAlarm();
  if (typeof window === 'undefined') return stopAlarm;
  klingelt = true;
  vibrate([300, 150, 300, 150, 500]);

  const element = weckerElement();
  if (element) {
    element.muted = false;
    zumAnfang(element);
    let versuch: Promise<void> | undefined;
    try {
      versuch = element.play();
    } catch {
      versuch = Promise.reject();
    }
    Promise.resolve(versuch).then(
      () => {
        weckerFrei = true;
        // Inzwischen gestoppt? Dann still sein.
        if (!klingelt) element.pause();
        else takt = window.setInterval(() => vibrate([250, 120, 250]), RUNDE_MS);
      },
      () => {
        // Das Element darf nicht – dann eben Web Audio.
        if (klingelt) mitWebAudio();
      },
    );
  } else {
    mitWebAudio();
  }

  if (Number.isFinite(dauerMs)) ende = window.setTimeout(stopAlarm, dauerMs);
  return stopAlarm;
}

export function stopAlarm(): void {
  klingelt = false;
  if (takt !== null) {
    clearInterval(takt);
    takt = null;
  }
  if (ende !== null) {
    clearTimeout(ende);
    ende = null;
  }
  if (wecker && !freigabeLaeuft) {
    wecker.pause();
    zumAnfang(wecker);
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
  unlockAudio();
  playAlarm(2 * RUNDE_MS);
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nicht unterstuetzt – kein Problem */
  }
}
