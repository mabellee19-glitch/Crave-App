/**
 * Die Form eines Textblocks, ohne die deutschen Woerter selbst: aus
 * `'Speichern'` wird `string`, aus einer Funktion, die `'Zutat' | 'Zutaten'`
 * liefert, eine, die `string` liefert. So muss die englische Fassung dieselben
 * Schluessel haben, darf aber andere Woerter benutzen.
 */
export type Form<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Form<R>
    : T extends readonly (infer E)[]
      ? Form<E>[]
      : T extends object
        ? { [K in keyof T]: Form<T[K]> }
        : T;
