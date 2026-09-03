/**
 * Finden der Postgres-Verbindung aus der Umgebung.
 *
 * Bewusst ein eigenes Modul ohne Importe: so ist die Regel gut testbar und
 * haengt an nichts als `process.env`.
 */

/**
 * Namen, die Anbieter ueblicherweise setzen – in dieser Reihenfolge bevorzugt.
 * Gepoolte Verbindungen zuerst: in einer Serverless-Umgebung ist der Pooler
 * die richtige Wahl.
 */
export const KNOWN_URL_VARS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_POSTGRES_URL',
  'NEON_DATABASE_URL',
  'SUPABASE_DB_URL',
];

const POSTGRES_URL_RE = /^postgres(ql)?:\/\/\S+$/i;

/** Nur das, was gebraucht wird – so haengt dieses Modul an keinen Node-Typen. */
export type EnvLike = Record<string, string | undefined>;

export interface Connection {
  url?: string;
  /** Name der genutzten Umgebungsvariable – nie deren Wert. */
  source?: string;
}

/**
 * Erst die bekannten Namen, danach als Rueckfall jede Umgebungsvariable, die
 * wie eine Postgres-URL aussieht. Damit genuegt beim Hoster ein Klick auf
 * "Datenbank anlegen", unabhaengig davon, wie er die Variable nennt.
 */
export function resolveConnection(env: EnvLike): Connection {
  for (const name of KNOWN_URL_VARS) {
    const value = env[name];
    if (value && POSTGRES_URL_RE.test(value)) return { url: value, source: name };
  }

  const candidates = Object.keys(env)
    .filter((name) => POSTGRES_URL_RE.test(env[name] ?? ''))
    // Ungepoolte Varianten nur nehmen, wenn es nichts anderes gibt.
    .sort((a, b) => Number(isUnpooled(a)) - Number(isUnpooled(b)) || a.localeCompare(b));

  const name = candidates[0];
  return name ? { url: env[name], source: name } : {};
}

function isUnpooled(name: string): boolean {
  return /UNPOOLED|NON_?POOL|DIRECT/i.test(name);
}
