/**
 * Prueft den Weg vom Kamera-Knopf bis zum Modell, ohne ein Modell zu fragen.
 *
 * Die Bilderkennung ist der einzige Teil der App, den man nicht gratis testen
 * kann: jeder echte Aufruf kostet Geld. Deshalb stellt dieses Skript eine
 * Gegenstelle hin, die sich wie Vercels AI Gateway verhaelt, und schickt eine
 * echte Anfrage der App dagegen. Geprueft wird, was die App abschickt und was
 * sie aus der Antwort macht.
 *
 * Dasselbe gilt fuer das Vereinfachen uebernommener Rezepte, das ueber
 * denselben Zugang laeuft – es wird am Schluss ebenso durchgespielt.
 *
 * Aufruf: npm run build && npm run check:vision
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`);
  ok ? pass++ : fail++;
};

/** Ein 1x1-JPEG als Data-URL – Inhalt egal, Form zaehlt. */
const BILD =
  'data:image/jpeg;base64,' +
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

/** Antwort in der Form, die die Messages-API liefert. */
const ANTWORT = {
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'anthropic/claude-opus-5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_test',
      name: 'kuehlschrank_auswertung',
      input: {
        lebensmittel: ['Halloumi', 'Zucchetti'],
        ideen: [
          {
            name: 'Halloumi vom Blech',
            kategorie: 'Vegi',
            portionen: 2,
            zeitMin: 25,
            zutaten: [{ name: 'Halloumi', menge: 200, einheit: 'g' }],
            schritte: [{ text: 'Ofen auf 200 Grad vorheizen.', minuten: 10 }],
            fehlt: ['Honig'],
          },
        ],
      },
    },
  ],
  usage: { input_tokens: 10, output_tokens: 10 },
};

/** Antwort fuer das Vereinfachen eines uebernommenen Rezepts. */
const VEREINFACHT = {
  id: 'msg_test2',
  type: 'message',
  role: 'assistant',
  model: 'anthropic/claude-opus-5.5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_test2',
      name: 'rezept_vereinfacht',
      input: {
        vorbereitung: ['Zwiebel fein hacken'],
        // Die Backzeit von 20 Minuten fehlt absichtlich: die App muss das merken.
        schritte: [
          { text: 'Zwiebel 5 Minuten glasig dünsten.', minuten: 5 },
          { text: 'Bei 180 °C backen.', minuten: 0 },
        ],
      },
    },
  ],
  usage: { input_tokens: 10, output_tokens: 10 },
};

/** Antwort fuer das Lesen eines Rezepts aus Text. */
const GELESEN = {
  id: 'msg_test3',
  type: 'message',
  role: 'assistant',
  model: 'anthropic/claude-opus-5.5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_test3',
      name: 'rezept_gelesen',
      input: {
        gefunden: true,
        name: 'Pfannkuchen',
        portionen: 4,
        minuten: 0,
        zutaten: ['Teig:', '250 g Mehl', '5 dl Milch'],
        schritte: ['Alles verrühren und 30 Minuten ruhen lassen.', 'In der Pfanne ausbacken.'],
      },
    },
  ],
  usage: { input_tokens: 10, output_tokens: 10 },
};

/** Text ohne Ueberschriften, wie aus einer Nachricht kopiert – das schaffen die Regeln nicht. */
const NACHRICHT =
  'Hey, hier das Pfannkuchen-Rezept von Oma! Man nimmt Mehl, Milch und Eier, verrührt alles und lässt es ruhen. Dann ausbacken, fertig.';

/** Ein Rezept, wie es von einer Seite kommt. */
const REZEPT = {
  name: 'Zwiebelkuchen',
  servings: 4,
  ingredients: [{ name: 'Zwiebeln', amount: 500, unit: 'g' }],
  steps: [
    { text: 'Zwiebel fein hacken und in einer Pfanne 5 Minuten glasig dünsten.', durationSec: 300 },
    { text: 'Im Ofen bei 180 °C 20 Minuten backen.', durationSec: 1200 },
  ],
};

/** Einen freien Port vom Betriebssystem erfragen, statt einen zu raten. */
async function freierPort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((fertig) => server.close(fertig));
  return port;
}

/**
 * Gegenstelle. `modus` steuert, wie sie sich beim ersten Versuch verhaelt:
 * 'ok' antwortet sofort, 'meckert' weist den ersten Versuch wegen eines
 * unbekannten Feldes ab – so wie es ein Gateway koennte, das `thinking` nicht
 * kennt. Die App muss dann schlichter nachfragen statt aufzugeben.
 */
async function starteGateway(modus) {
  const anfragen = [];
  const server = createServer((req, res) => {
    let roh = '';
    req.on('data', (teil) => (roh += teil));
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(roh);
      } catch {
        /* egal – die Pruefungen unten schlagen dann an */
      }
      anfragen.push({ url: req.url, headers: req.headers, body });

      if (modus === 'karte') {
        // So antwortet Vercels Gateway, solange keine Zahlungskarte hinterlegt
        // ist – der haeufigste Stolperstein beim Einrichten.
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            error: {
              type: 'customer_verification_required',
              message: 'AI Gateway requires a valid credit card on file to service requests.',
            },
          }),
        );
        return;
      }

      if (body?.tools?.[0]?.name === 'rezept_gelesen') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(GELESEN));
        return;
      }

      if (body?.tools?.[0]?.name === 'rezept_vereinfacht') {
        // 'unbekannt': das Gateway kennt die neuere Modellfassung (noch) nicht.
        if (modus === 'unbekannt' && body.model === 'anthropic/claude-opus-5.5') {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              type: 'error',
              error: { type: 'not_found_error', message: 'model not found' },
            }),
          );
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(VEREINFACHT));
        return;
      }

      if (modus === 'meckert' && anfragen.length === 1) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            type: 'error',
            error: { type: 'invalid_request_error', message: 'unknown field: thinking' },
          }),
        );
        return;
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(ANTWORT));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, anfragen, port: server.address().port };
}

/**
 * Die gebaute App starten, mit der Gegenstelle als Ziel. `direkt` schaltet auf
 * den zweiten Weg um: Schluessel direkt von Anthropic, ohne Gateway.
 */
async function starteApp(gatewayPort, port, direkt) {
  const zugang = direkt
    ? {
        AI_GATEWAY_API_KEY: '',
        VERCEL_OIDC_TOKEN: '',
        ANTHROPIC_API_KEY: 'testschluessel',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${gatewayPort}`,
      }
    : {
        AI_GATEWAY_API_KEY: 'testschluessel',
        AI_GATEWAY_BASE_URL: `http://127.0.0.1:${gatewayPort}`,
        ANTHROPIC_API_KEY: '',
      };

  const kind = spawn('npx', ['next', 'start', '-p', String(port)], {
    env: { ...process.env, ...zugang, CRAVE_DATA_DIR: '.vision-check-data' },
    stdio: 'ignore',
  });

  let gestorben = false;
  kind.on('exit', () => (gestorben = true));

  const frist = Date.now() + 30_000;
  while (Date.now() < frist) {
    if (gestorben) throw new Error(`App auf Port ${port} ist sofort beendet worden`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (res.ok) return kind;
    } catch {
      /* noch nicht da */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  kind.kill();
  throw new Error('App ist nicht gestartet');
}

async function durchlauf(modus) {
  const direkt = modus === 'direkt';
  const gateway = await starteGateway(direkt ? 'ok' : modus);
  const appPort = await freierPort();
  const app = await starteApp(gateway.port, appPort, direkt);

  try {
    const status = await (await fetch(`http://127.0.0.1:${appPort}/api/status`)).json();
    check(`[${modus}] /api/status meldet die Bilderkennung als eingerichtet`, status.vision === true);

    const res = await fetch(`http://127.0.0.1:${appPort}/api/vision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: BILD }),
    });
    const daten = await res.json();

    if (modus === 'karte') {
      check('[karte] die fehlende Zahlungskarte wird als solche erkannt', daten.error === 'billing', daten.error);
      check('[karte] der Rohtext des Anbieters bleibt draussen', !JSON.stringify(daten).includes('credit card'));
      return;
    }

    check(`[${modus}] die Route antwortet mit 200`, res.status === 200, `war ${res.status}`);
    check(`[${modus}] erkannte Lebensmittel kommen an`, daten.lebensmittel?.[0] === 'Halloumi');
    check(`[${modus}] die Idee ist vollstaendig`, daten.ideen?.[0]?.name === 'Halloumi vom Blech');
    check(`[${modus}] fehlende Zutaten sind dabei`, daten.ideen?.[0]?.fehlt?.[0] === 'Honig');

    const erste = gateway.anfragen[0];
    check(`[${modus}] Anfrage geht an /v1/messages`, erste?.url === '/v1/messages', erste?.url);
    check(
      `[${modus}] der Schluessel wird mitgeschickt`,
      String(erste?.headers?.authorization ?? '').includes('testschluessel') ||
        String(erste?.headers?.['x-api-key'] ?? '').includes('testschluessel'),
    );
    check(
      `[${modus}] das Modell heisst richtig`,
      erste?.body?.model === (direkt ? 'claude-opus-5' : 'anthropic/claude-opus-5'),
      erste?.body?.model,
    );
    check(
      `[${modus}] das Bild ist als base64 dabei`,
      erste?.body?.messages?.[0]?.content?.[0]?.type === 'image',
    );
    check(
      `[${modus}] das Werkzeug ist angemeldet`,
      erste?.body?.tools?.[0]?.name === 'kuehlschrank_auswertung',
    );
    check(
      direkt
        ? '[direkt] output_config laeuft mit'
        : `[${modus}] ueber das Gateway laeuft kein output_config mit`,
      direkt
        ? erste?.body?.output_config?.effort === 'medium'
        : erste?.body?.output_config === undefined,
    );

    if (modus === 'meckert') {
      check('[meckert] die App fragt ein zweites Mal', gateway.anfragen.length === 2);
      check(
        '[meckert] der zweite Versuch laesst thinking weg',
        gateway.anfragen[1]?.body?.thinking === undefined,
      );
    } else {
      check(`[${modus}] ein einziger Aufruf genuegt`, gateway.anfragen.length === 1);
      check(
        `[${modus}] thinking laeuft mit`,
        gateway.anfragen[0]?.body?.thinking?.type === 'adaptive',
      );
    }
  } finally {
    app.kill();
    gateway.server.close();
  }
}

/**
 * Dasselbe fuer das Vereinfachen uebernommener Rezepte. Hier zaehlt vor
 * allem: die Zutaten gehen mit, das Ergebnis kommt in der Form der App an,
 * und eine verlorene Zahl aus dem Original wird gemeldet.
 */
async function vereinfachen(modus) {
  const direkt = modus === 'direkt';
  const gateway = await starteGateway(direkt ? 'ok' : modus);
  const appPort = await freierPort();
  const app = await starteApp(gateway.port, appPort, direkt);

  try {
    const res = await fetch(`http://127.0.0.1:${appPort}/api/simplify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipe: REZEPT }),
    });
    const daten = await res.json();

    check(`[vereinfachen ${modus}] die Route antwortet mit 200`, res.status === 200, `war ${res.status} ${daten.error ?? ''}`);
    check(`[vereinfachen ${modus}] die Vorbereitung kommt an`, daten.prep?.[0] === 'Zwiebel fein hacken');
    check(`[vereinfachen ${modus}] Timer aus den Minuten`, daten.steps?.[0]?.durationSec === 300);
    check(
      `[vereinfachen ${modus}] die verlorene Backzeit wird gemeldet`,
      JSON.stringify(daten.missingNumbers) === '["20"]',
      JSON.stringify(daten.missingNumbers),
    );

    const letzte = gateway.anfragen[gateway.anfragen.length - 1];
    check(
      `[vereinfachen ${modus}] Anfrage geht an /v1/messages`,
      String(letzte?.url).startsWith('/v1/messages'),
      letzte?.url,
    );
    check(
      `[vereinfachen ${modus}] die Zutaten gehen mit`,
      JSON.stringify(letzte?.body?.messages ?? '').includes('500 g Zwiebeln'),
    );
    check(
      `[vereinfachen ${modus}] das Werkzeug ist angemeldet`,
      letzte?.body?.tools?.[0]?.name === 'rezept_vereinfacht',
    );

    if (direkt) {
      check('[vereinfachen direkt] das Modell heisst richtig', letzte?.body?.model === 'claude-opus-5-5', letzte?.body?.model);
      check('[vereinfachen direkt] wenig Nachdenken', letzte?.body?.output_config?.effort === 'low');
      check('[vereinfachen direkt] Ersatzmodell bei Ablehnung', letzte?.body?.fallbacks === 'default');
      check(
        '[vereinfachen direkt] mit dem passenden Beta-Kopf',
        String(letzte?.headers?.['anthropic-beta'] ?? '').includes('server-side-fallback-2026-07-01'),
        letzte?.headers?.['anthropic-beta'],
      );
    } else if (modus === 'unbekannt') {
      check('[vereinfachen unbekannt] zwei Versuche', gateway.anfragen.length === 2, String(gateway.anfragen.length));
      check(
        '[vereinfachen unbekannt] zuerst die neuere Fassung, dann die bewaehrte',
        gateway.anfragen[0]?.body?.model === 'anthropic/claude-opus-5.5' &&
          gateway.anfragen[1]?.body?.model === 'anthropic/claude-opus-5',
      );
    } else {
      check(`[vereinfachen ${modus}] das Modell heisst richtig`, letzte?.body?.model === 'anthropic/claude-opus-5.5', letzte?.body?.model);
      check(`[vereinfachen ${modus}] ueber das Gateway kein output_config`, letzte?.body?.output_config === undefined);
    }
    if (!direkt) {
      // Derselbe schlichte Weg wie beim Foto: ohne Beta-Pfad und Beta-Kopf.
      check(`[vereinfachen ${modus}] ohne Beta-Pfad`, letzte?.url === '/v1/messages', letzte?.url);
      check(`[vereinfachen ${modus}] ohne Ersatzmodell-Feld`, letzte?.body?.fallbacks === undefined);
    }
  } finally {
    app.kill();
    gateway.server.close();
  }
}

/**
 * Ein Rezept aus Text lesen: was die Regeln nicht schaffen, liest die KI.
 * Ohne Zahlungskarte sagt die Route, woran es liegt.
 */
async function lesen(modus) {
  const gateway = await starteGateway(modus);
  const appPort = await freierPort();
  const app = await starteApp(gateway.port, appPort, false);

  try {
    const res = await fetch(`http://127.0.0.1:${appPort}/api/import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: NACHRICHT }),
    });
    const daten = await res.json();

    if (modus === 'karte') {
      check('[lesen karte] kein Rezept, mit Grund', res.status === 422 && daten.ki === 'billing', `${res.status} ${daten.ki}`);
      return;
    }

    check(`[lesen ${modus}] die Route antwortet mit 200`, res.status === 200, `war ${res.status} ${daten.error ?? ''}`);
    check(`[lesen ${modus}] von der KI gelesen`, daten.recipe?.herkunft === 'ki');
    check(`[lesen ${modus}] der Name kommt an`, daten.recipe?.name === 'Pfannkuchen');
    check(
      `[lesen ${modus}] Zutaten mit Gruppe und Menge`,
      daten.recipe?.ingredients?.[0]?.name === 'Mehl (Teig)' && daten.recipe?.ingredients?.[0]?.amount === 250,
      JSON.stringify(daten.recipe?.ingredients?.[0]),
    );
    check(`[lesen ${modus}] Timer aus dem Schritt`, daten.recipe?.steps?.[0]?.durationSec === 1800);
    const letzte = gateway.anfragen[gateway.anfragen.length - 1];
    check(`[lesen ${modus}] das Werkzeug ist angemeldet`, letzte?.body?.tools?.[0]?.name === 'rezept_gelesen');
    check(
      `[lesen ${modus}] der Text geht mit`,
      JSON.stringify(letzte?.body?.messages ?? '').includes('Pfannkuchen-Rezept von Oma'),
    );
  } finally {
    app.kill();
    gateway.server.close();
  }
}

await durchlauf('ok');
await durchlauf('meckert');
await durchlauf('direkt');
await durchlauf('karte');
await vereinfachen('ok');
await vereinfachen('unbekannt');
await vereinfachen('direkt');
await lesen('ok');
await lesen('karte');

console.log(`\n${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
