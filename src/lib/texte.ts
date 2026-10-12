/**
 * Alle Texte der Oberflaeche, Deutsch und Englisch.
 *
 * Je Bildschirm eine Datei unter lib/texte/, jede mit `de` und `en` in
 * derselben Form – TypeScript meldet, wenn auf Englisch etwas fehlt.
 * Komponenten holen ihre Texte mit `useT()` (lib/i18n).
 *
 * Schreibweise: Schweizer Deutsch ohne Eszett.
 */

import type { Form } from './texte/form';
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
import { kochAnimation } from './texte/kochAnimation';
import { rezept } from './texte/rezept';
import { kochen } from './texte/kochen';
import { essen } from './texte/essen';

export const TEXTE = {
  de: {
    allgemein: allgemein.de,
    app: app.de,
    einkauf: einkauf.de,
    zutatenEditor: zutatenEditor.de,
    einstellungen: einstellungen.de,
    rezeptForm: rezeptForm.de,
    fridge: fridge.de,
    ideeForm: ideeForm.de,
    neu: neu.de,
    idee: idee.de,
    cloud: cloud.de,
    start: start.de,
    ui: ui.de,
    timer: timer.de,
    kochAnimation: kochAnimation.de,
    rezept: rezept.de,
    kochen: kochen.de,
    essen: essen.de,
  },
  en: {
    allgemein: allgemein.en,
    app: app.en,
    einkauf: einkauf.en,
    zutatenEditor: zutatenEditor.en,
    einstellungen: einstellungen.en,
    rezeptForm: rezeptForm.en,
    fridge: fridge.en,
    ideeForm: ideeForm.en,
    neu: neu.en,
    idee: idee.en,
    cloud: cloud.en,
    start: start.en,
    ui: ui.en,
    timer: timer.en,
    kochAnimation: kochAnimation.en,
    rezept: rezept.en,
    kochen: kochen.en,
    essen: essen.en,
  },
};

export type Texte = Form<(typeof TEXTE)['de']>;
