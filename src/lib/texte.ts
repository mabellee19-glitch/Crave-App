/**
 * Alle Texte der Oberflaeche – nur Deutsch.
 *
 * Je Bildschirm eine Datei unter lib/texte/. Komponenten holen ihre Texte
 * mit `useT()` (lib/i18n), statt sie fest hineinzuschreiben: so stehen alle
 * Woerter an einem Ort und lassen sich in einem Zug anpassen.
 *
 * Schreibweise: Schweizer Deutsch ohne Eszett.
 */

import { allgemein } from './texte/allgemein';
import { app } from './texte/app';
import { einkauf } from './texte/einkauf';
import { zutatenEditor } from './texte/zutatenEditor';
import { einstellungen } from './texte/einstellungen';
import { rezeptForm } from './texte/rezeptForm';
import { fridge } from './texte/fridge';
import { ideeForm } from './texte/ideeForm';
import { neu } from './texte/neu';
import { idee } from './texte/idee';
import { cloud } from './texte/cloud';
import { start } from './texte/start';
import { ui } from './texte/ui';
import { timer } from './texte/timer';
import { rezept } from './texte/rezept';
import { kochen } from './texte/kochen';
import { essen } from './texte/essen';
import { autocomplete } from './texte/autocomplete';

export const TEXTE = {
  allgemein,
  app,
  einkauf,
  zutatenEditor,
  einstellungen,
  rezeptForm,
  fridge,
  ideeForm,
  neu,
  idee,
  cloud,
  start,
  ui,
  timer,
  rezept,
  kochen,
  essen,
  autocomplete,
};

export type Texte = typeof TEXTE;
