'use client';

import React, { Activity, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dish, Recipe } from '@/lib/types';
import { blankDish, blankRecipe, useStore } from '@/lib/store';
import { audioFreigegeben, audioVorbereiten, tonFreigeben } from '@/lib/audio';
import { scrollAnkerStarten } from '@/lib/scrollAnker';
import { KiKuerzung } from '@/lib/useKiKuerzung';
import { useT } from '@/lib/i18n';
import { useInhalt } from '@/lib/inhalt';
import { Wordmark } from './Logo';
import { EssenView } from './EssenView';
import { ShoppingView } from './ShoppingView';
import { IdeaDetail } from './IdeaDetail';
import { NeuArt, NewSheet } from './NewSheet';
import { ideenAus } from '@/lib/essen';
import { DISH_CATEGORY_LABEL } from '@/lib/types';
import { randomId } from '@/lib/id';
import { RecipeDetail } from './RecipeDetail';
import { RecipeForm } from './RecipeForm';
import { DishForm } from './DishForm';
import { CookMode } from './CookMode';
import { SettingsSheet, SyncBadge } from './SettingsSheet';
import { FridgeSheet } from './FridgeSheet';
import { CloudNotice } from './CloudNotice';
import { Toast, ToastMessage, VerdecktKontext } from './ui';
import { IconBook, IconCamera, IconCart, IconPlus, IconSettings } from './Icons';

/*
 * Zwei Bereiche: alles, was man kochen kann, und der Einkauf. Rezepte und
 * Gerichte waren frueher getrennt – und fast jedes Gericht stand doppelt da.
 */
type Tab = 'essen' | 'shopping';

type Overlay =
  | { kind: 'new' }
  | { kind: 'recipe'; id: string }
  | { kind: 'idea'; id: string }
  | {
      kind: 'recipeForm';
      recipe: Recipe;
      isNew: boolean;
      /** Fokus gleich ins Link-Feld – "Rezept über Link" im Plus-Blatt. */
      mitLink?: boolean;
      /** Gewaehlt ueber "Rezept aus Text": das Textfeld steht gleich offen. */
      mitText?: boolean;
      /** Das Rezept entsteht aus dieser Idee. */
      ausIdee?: string;
    }
  | { kind: 'dishForm'; dish: Dish; isNew: boolean }
  | { kind: 'cook'; recipeId: string; servings: number }
  | { kind: 'fridge' }
  | { kind: 'settings' };

const TABS: Array<{ id: Tab; icon: React.ReactNode }> = [
  { id: 'essen', icon: <IconBook size={23} /> },
  { id: 'shopping', icon: <IconCart size={23} /> },
];

export function AppShell() {
  const store = useStore();
  const texte = useT();
  const t = texte.app;
  const inhalt = useInhalt();
  const tabLabel = (id: Tab) => (id === 'essen' ? texte.allgemein.bereichRezepte : texte.allgemein.bereichEinkauf);
  const [tab, setTab] = useState<Tab>('essen');
  const [stack, setStack] = useState<Overlay[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  // Der Toast wird erzeugt, bevor React den neuen Undo-Handler gesetzt hat –
  // ueber die Referenz greift er immer auf den aktuellen zu.
  const storeRef = useRef(store);
  storeRef.current = store;

  /*
   * Overlays haengen am Verlauf: die Zurueck-Geste in Safari schliesst sie.
   *
   * Die Scrollposition verwaltet dabei die App selbst. Sonst setzt der Browser
   * beim Zurueckgehen seine eigene gemerkte Position – und die stammt aus dem
   * Moment, in dem die Seite hinter dem Overlay eingefroren und damit nur noch
   * fensterhoch war.
   */
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  /*
   * Jeder Verlaufseintrag kennt die Zahl der Overlays, die zu ihm gehoeren.
   * So kommt der Stapel auch dann richtig an, wenn mehrere auf einmal gehen –
   * etwa beim Loeschen einer Idee aus ihrem Formular heraus.
   */
  // Nach dem Neuladen traegt der aktuelle Eintrag noch die Tiefe von vorher,
  // obwohl kein Overlay mehr offen ist. Gezaehlt wird deshalb ab dort – sonst
  // haelt das Zurueck aus dem naechsten Overlay bei dieser alten Tiefe an, und
  // "Schliessen" tut beim ersten Tippen nichts.
  const grundtiefe = useRef(0);

  useEffect(() => {
    const vorher = window.history.state?.crave;
    grundtiefe.current = typeof vorher === 'number' ? vorher : 0;
    const onPop = (event: PopStateEvent) => {
      const roh = typeof event.state?.crave === 'number' ? event.state.crave : 0;
      const tiefe = Math.max(0, roh - grundtiefe.current);
      const offen = stackRef.current.length;
      // Vorwaerts in einen Eintrag, zu dem kein Overlay mehr gehoert (Safari
      // im Browser: zurueck, dann vor): gleich wieder dorthin, wo der Stapel
      // steht. Sonst schloss das naechste "Schliessen" nichts.
      if (tiefe > offen) {
        window.history.go(offen - tiefe);
        return;
      }
      setStack((current) => (current.length > tiefe ? current.slice(0, tiefe) : current));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openOverlay = useCallback((overlay: Overlay) => {
    try {
      window.history.pushState({ crave: grundtiefe.current + stackRef.current.length + 1 }, '');
    } catch {
      /* z. B. in einem Sandbox-Frame */
    }
    setStack((current) => [...current, overlay]);
  }, []);

  /** Die obersten `anzahl` Overlays schliessen – ueber den Verlauf. */
  const closeOverlays = useCallback((anzahl: number) => {
    const schritte = Math.min(anzahl, stackRef.current.length);
    if (schritte <= 0) return;
    try {
      window.history.go(-schritte);
    } catch {
      setStack((current) => current.slice(0, -schritte));
    }
  }, []);

  // Ohne Parameter: wird oft direkt als Klick-Handler weitergegeben.
  const closeTop = useCallback(() => closeOverlays(1), [closeOverlays]);

  /*
   * Audio bei einem Tippen entsperren, damit der Kochtimer spaeter klingeln
   * darf. Safari zaehlt nur das Loslassen als Tippen, nicht das Aufsetzen –
   * und es wird so lange versucht, bis es geklappt hat.
   */
  useEffect(() => {
    const ereignisse = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    audioVorbereiten();
    const unlock = () => {
      tonFreigeben();
      if (audioFreigegeben()) {
        for (const ereignis of ereignisse) window.removeEventListener(ereignis, unlock, true);
      }
    };
    for (const ereignis of ereignisse) window.addEventListener(ereignis, unlock, true);
    return () => {
      for (const ereignis of ereignisse) window.removeEventListener(ereignis, unlock, true);
    };
  }, []);

  // Safari verschiebt sonst die Liste, wenn oberhalb etwas dazukommt.
  const hauptRef = useRef<HTMLElement>(null);
  const kopfRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!hauptRef.current) return;
    return scrollAnkerStarten(hauptRef.current, () => kopfRef.current);
  }, []);

  /*
   * Die Linie unter der Kopfleiste direkt am Element umschalten: als Zustand
   * zeichnete der erste Wisch die ganze App neu – genau dann, wenn das
   * Scrollen anlaeuft.
   */
  useEffect(() => {
    const onScroll = () => kopfRef.current?.classList.toggle('topbar--scrolled', window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showToast = useCallback((text: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ id: Date.now(), text, actionLabel, onAction });
  }, []);


  /**
   * Namen fuer eine Meldung kuerzen. Zutaten heissen auch mal "Tomaten,
   * stückige (mit Kräutern, z. B. aus dem Tetrapack)" – ungekuerzt fuellt das
   * den halben Bildschirm.
   */
  const kurz = (name: string, max = 28) =>
    name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;

  /*
   * Jeder Bereich merkt sich, wie weit er gescrollt war. Vorher behielt der
   * neue Bereich die Position des alten – die Einkaufsliste oeffnete mitten
   * in der Liste, Ueberschrift und Eingabefeld ausserhalb des Bildes. Ein
   * Tipp auf den Bereich, in dem man schon ist, fuehrt nach oben.
   */
  const scrollProTab = useRef<Record<Tab, number>>({ essen: 0, shopping: 0 });
  const waehleTab = (ziel: Tab) => {
    if (ziel === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollProTab.current[tab] = window.scrollY;
    setTab(ziel);
  };
  useLayoutEffect(() => {
    window.scrollTo(0, scrollProTab.current[tab]);
  }, [tab]);

  // Ohne Tabwechsel: wer ein Rezept aus der Einkaufsliste oeffnet, will
  // beim Schliessen wieder dort sein – an derselben Stelle.
  const openRecipe = useCallback((id: string) => openOverlay({ kind: 'recipe', id }), [openOverlay]);

  const openIdea = useCallback((id: string) => openOverlay({ kind: 'idea', id }), [openOverlay]);
  const neuOeffnen = useCallback(() => openOverlay({ kind: 'new' }), [openOverlay]);

  /** Die Gerichte, die als eigene Idee in der Liste stehen. */
  const ideen = useMemo(() => ideenAus(store.recipes, store.dishes), [store.recipes, store.dishes]);

  /**
   * Die Vorschau ueber der Einkaufsliste: was fuer die naechsten Tage geplant
   * ist. Gerichte ohne eigenes Rezept bleiben aussen vor – sie brauchen keinen
   * Einkauf und waeren dort nur Beiwerk.
   */
  const geplant = useMemo(() => {
    const lebendeRezepte = new Set(store.recipes.map((recipe) => recipe.id));
    return [
      ...store.recipes
        .filter((recipe) => recipe.cookNext)
        .map((recipe) => ({ id: recipe.id, name: recipe.name, kind: 'recipe' as const })),
      // Gerichte mit Rezept stuenden sonst doppelt da – ihre Zutaten kommen
      // ohnehin vom Rezept.
      ...store.dishes
        .filter(
          (dish) =>
            dish.cookNext && !(dish.recipeId && lebendeRezepte.has(dish.recipeId)),
        )
        .map((dish) => ({ id: dish.id, name: dish.name, kind: 'dish' as const })),
    ];
  }, [store.recipes, store.dishes]);

  const addAction = () => {
    if (tab === 'shopping') {
      document.querySelector<HTMLInputElement>('.einkauf__eingabe input')?.focus();
      return;
    }
    openOverlay({ kind: 'new' });
  };

  /** Aus dem Plus-Blatt: das Blatt wird durch das gewaehlte Formular ersetzt. */
  const neuAnlegen = (art: NeuArt) => {
    const formular: Overlay =
      art === 'idee'
        ? { kind: 'dishForm', dish: blankDish(), isNew: true }
        : {
            kind: 'recipeForm',
            recipe: blankRecipe(),
            isNew: true,
            mitLink: art === 'link',
            mitText: art === 'text',
          };
    setStack((current) => [...current.slice(0, -1), formular]);
  };

  const counts = useMemo(
    () => ({
      recipes: store.recipes.length,
      ideen: ideen.length,
      shopping: store.shopping.length,
      pantry: Object.values(store.data.pantry).filter((item) => !item.deleted).length,
    }),
    [store.recipes.length, ideen.length, store.shopping.length, store.data.pantry],
  );

  const allPantry = useMemo(
    () =>
      Object.values(store.data.pantry)
        .filter((item) => !item.deleted)
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [store.data.pantry],
  );
  // Fest gehalten: eine neue Liste bei jedem Neuzeichnen liess das Foto-Blatt
  // seine Rezeptvorschlaege jedes Mal neu rechnen.
  const pantryNamen = useMemo(() => allPantry.map((item) => item.name), [allPantry]);

  return (
    <div className="app">
      <header ref={kopfRef} className="topbar">
        <div className="topbar__inner">
          <span className="brand">
            <Wordmark hoehe={30} />
          </span>

          <nav className="desknav" aria-label={t.bereiche}>
            {TABS.map((item) => (
              <button
                key={item.id}
                className={`desknav__item${tab === item.id ? ' desknav__item--active' : ''}`}
                onClick={() => waehleTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                {tabLabel(item.id)}
              </button>
            ))}
          </nav>

          <span className="topbar__spacer" />

          <button
            className="iconbtn"
            onClick={() => openOverlay({ kind: 'fridge' })}
            aria-label={t.foto}
          >
            <IconCamera />
          </button>
          <button
            className={`iconbtn${tab === 'essen' ? ' iconbtn--primary' : ''}`}
            onClick={addAction}
            aria-label={tab === 'essen' ? t.neu : t.zutatHinzufuegen}
          >
            <IconPlus />
          </button>
          <button
            className="iconbtn"
            onClick={() => openOverlay({ kind: 'settings' })}
            aria-label={t.einstellungen}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      <main ref={hauptRef} className="app__main">
        <CloudNotice onOpenSettings={() => openOverlay({ kind: 'settings' })} />

        {!store.ready ? (
          // Nur beim allerersten Oeffnen auf einem Geraet: danach steht der
          // lokale Stand sofort da. Die Form der Seite ist schon erkennbar.
          <div className="skeleton" role="status" aria-label={t.laedt}>
            <div className="skeleton__title" />
            <div className="skeleton__line" />
            <div className="skeleton__search" />
            {[0, 1, 2, 3, 4].map((index) => (
              <div className="skeleton__card" key={index} />
            ))}
          </div>
        ) : (
          /*
            Beide Bereiche bleiben stehen; der verborgene ruht. So bleiben
            Suche und Filter beim Wechsel erhalten, und nichts wird neu gebaut.
          */
          <>
            <Activity mode={tab === 'essen' ? 'visible' : 'hidden'}>
              <EssenView
                recipes={store.recipes}
                ideen={ideen}
                onOpenRecipe={openRecipe}
                onOpenIdea={openIdea}
                onNew={neuOeffnen}
                onToggleRecipeCookNext={store.toggleRecipeCookNext}
                onToggleIdeaCookNext={store.toggleDishCookNext}
              />
            </Activity>
            <Activity mode={tab === 'shopping' ? 'visible' : 'hidden'}>
              <ShoppingView
                shopping={store.shopping}
                pantry={store.pantry}
                allPantry={allPantry}
                onAdd={(input) => {
                  store.addShoppingItem(input);
                  showToast(t.hinzugefuegt(kurz(inhalt.zutat(input.name))));
                }}
                onCheckOff={(id) => {
                  const item = store.shopping.find((entry) => entry.id === id);
                  store.checkOffShoppingItem(id);
                  showToast(
                    t.erledigt(kurz(item ? inhalt.zutat(item.name) : t.zutat)),
                    t.rueckgaengig,
                    () => storeRef.current.undo?.(),
                  );
                }}
                onClear={store.clearShoppingList}
                onMovePantryToCart={store.movePantryItemToCart}
                onAddPantryItem={store.addPantryItem}
                onSavePantryItem={store.savePantryItem}
                onDeletePantryItem={store.deletePantryItem}
                cookNext={geplant}
                onOpenPlanned={(eintrag) =>
                  eintrag.kind === 'recipe' ? openRecipe(eintrag.id) : openIdea(eintrag.id)
                }
                onAddSuggestions={() => {
                  const { added, categorised } = store.addPantrySuggestions();
                  showToast(
                    added === 0 && categorised === 0
                      ? t.allesVorhanden
                      : t.vorschlaegeErgaenzt(added, categorised),
                  );
                }}
              />
            </Activity>
          </>
        )}

        <div style={{ height: 26 }} />
        <div className="rowline" style={{ justifyContent: 'center' }}>
          <SyncBadge />
        </div>
      </main>

      <nav className="tabbar" aria-label={t.hauptnavigation}>
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tabbar__item${tab === item.id ? ' tabbar__item--active' : ''}`}
            onClick={() => waehleTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span className="tabbar__iconwrap">
              {item.icon}
              {item.id === 'shopping' && store.shopping.length > 0 ? (
                <span className="tabbar__badge">{store.shopping.length}</span>
              ) : null}
            </span>
            {tabLabel(item.id)}
          </button>
        ))}
      </nav>

      {/* ------------------------------ Overlays ------------------------------ */}

      {/*
        Alle Ebenen bleiben stehen, nur die oberste ist zu sehen. Der Index
        als Schluessel genuegt: der Stapel waechst und schrumpft nur oben.
      */}
      {stack.map((overlay, ebene) => (
        <VerdecktKontext.Provider key={ebene} value={ebene < stack.length - 1}>
          {renderOverlay(overlay)}
        </VerdecktKontext.Provider>
      ))}

      <KiKuerzung />

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );

  /* --------------------------------------------------------------------- */

  /**
   * Bewusst eine einfache Funktion und keine innere Komponente: eine innere
   * Komponente bekaeme bei jedem Render eine neue Identitaet und React wuerde
   * das Formular samt Eingaben neu aufbauen.
   */
  function renderRecipe(recipe: Recipe): React.ReactNode {
    return (
      <RecipeDetail
        recipe={recipe}
        onClose={closeTop}
        onEdit={() => openOverlay({ kind: 'recipeForm', recipe, isNew: false })}
        onToggleCookNext={(servings) => store.toggleRecipeCookNext(recipe.id, servings)}
        onFillSteps={() => {
          const geklappt = store.fillRecipeSteps(recipe.id);
          showToast(
            geklappt
              ? t.vorlageNachgetragen
              : t.keineVorlage,
          );
        }}
        onRestoreOriginal={() => {
          store.originalWiederherstellen(recipe.id);
          showToast(t.originalZurueck);
        }}
        onDelete={() => {
          store.deleteRecipe(recipe.id);
          closeTop();
          showToast(t.rezeptGeloescht);
        }}
        onStartCooking={(servings) => openOverlay({ kind: 'cook', recipeId: recipe.id, servings })}
        onAddToShopping={(servings) => {
          const count = store.addRecipeToShopping(recipe, servings);
          showToast(
            t.inDerBeute(count),
            t.rueckgaengig,
            () => storeRef.current.undo?.(),
          );
        }}
      />
    );
  }

  function renderOverlay(overlay: Overlay): React.ReactNode {
    if (overlay.kind === 'new') {
      return <NewSheet onPick={neuAnlegen} onClose={closeTop} />;
    }

    if (overlay.kind === 'idea') {
      const dish = store.dishes.find((entry) => entry.id === overlay.id);
      if (!dish) return null;
      // Ist aus der Idee inzwischen ein Rezept geworden, zeigt dieselbe
      // Ansicht jetzt das Rezept.
      const recipe = store.getRecipe(dish.recipeId);
      if (recipe) return renderRecipe(recipe);
      return (
        <IdeaDetail
          dish={dish}
          onClose={closeTop}
          onEdit={() => openOverlay({ kind: 'dishForm', dish, isNew: false })}
          onToggleCookNext={() => {
            store.toggleDishCookNext(dish.id);
            showToast(
              dish.cookNext
                ? t.vonCookNext(kurz(dish.name))
                : t.aufCookNext(kurz(dish.name)),
            );
          }}
          onMakeRecipe={() => {
            const base = blankRecipe();
            const zutaten = (dish.ingredients ?? []).filter((zutat) => zutat.name.trim());
            openOverlay({
              kind: 'recipeForm',
              isNew: true,
              ausIdee: dish.id,
              recipe: {
                ...base,
                name: dish.name,
                category: DISH_CATEGORY_LABEL[dish.category],
                ingredients: zutaten.length
                  ? zutaten.map((zutat) => ({ ...zutat, id: randomId() }))
                  : base.ingredients,
                notes: dish.notes,
              },
            });
          }}
        />
      );
    }

    if (overlay.kind === 'settings') {
      return (
        <SettingsSheet
          spaceId={store.spaceId}
          counts={counts}
          onSyncNow={store.syncNow}
          onAddMissingRecipes={() => {
            const { added, completed } = store.addMissingRecipes();
            const teile = [
              added > 0 ? t.nachgetragen(added) : '',
              completed > 0 ? t.ergaenzt(completed) : '',
            ].filter(Boolean);
            showToast(teile.length ? teile.join(', ') : t.allesVorhanden);
          }}
          onClose={closeTop}
        />
      );
    }

    if (overlay.kind === 'fridge') {
      return (
        <FridgeSheet
          recipes={store.recipes}
          pantry={pantryNamen}
          onClose={closeTop}
          onOpenRecipe={(id) => {
            // Das Foto-Blatt durch das Rezept ersetzen, ohne den Verlauf
            // anzufassen. closeTop() und gleich danach openRecipe() liefen
            // gegeneinander: das spaete Zurueck schloss das Rezept wieder.
            setStack((current) => [...current.slice(0, -1), { kind: 'recipe', id }]);
          }}
          onSaveIdea={(recipe) => {
            store.saveRecipe(recipe);
            showToast(t.gespeichert(recipe.name));
          }}
          onAddMissing={(names) => {
            for (const name of names) store.addShoppingItem({ name });
            showToast(t.inDerBeute(names.length));
          }}
        />
      );
    }

    if (overlay.kind === 'recipe') {
      const recipe = store.getRecipe(overlay.id);
      if (!recipe) {
        return null;
      }
      return renderRecipe(recipe);
    }

    if (overlay.kind === 'recipeForm') {
      return (
        <RecipeForm
          initial={overlay.recipe}
          isNew={overlay.isNew}
          mitLink={overlay.mitLink}
          mitText={overlay.mitText}
          onClose={closeTop}
          onSave={(recipe) => {
            if (overlay.ausIdee) store.ideeAlsRezept(overlay.ausIdee, recipe);
            else store.saveRecipe(recipe);
            closeTop();
            showToast(
              overlay.ausIdee
                ? t.ausIdee
                : overlay.isNew
                  ? t.rezeptAngelegt
                  : t.rezeptGespeichert,
            );
          }}
        />
      );
    }

    if (overlay.kind === 'dishForm') {
      return (
        <DishForm
          initial={overlay.dish}
          isNew={overlay.isNew}
          onClose={closeTop}
          onSave={(dish) => {
            store.saveDish(dish);
            closeTop();
            showToast(overlay.isNew ? t.ideeAngelegt : t.ideeGespeichert);
          }}
          onDelete={() => {
            store.deleteDish(overlay.dish.id);
            // Liegt die Ansicht der Idee darunter, geht sie mit.
            const darunter = stack[stack.length - 2];
            closeOverlays(darunter?.kind === 'idea' && darunter.id === overlay.dish.id ? 2 : 1);
            showToast(t.ideeGeloescht);
          }}
        />
      );
    }

    const recipe = store.getRecipe(overlay.recipeId);
    if (!recipe) return null;
    return <CookMode recipe={recipe} servings={overlay.servings} onClose={closeTop} />;
  }
}
