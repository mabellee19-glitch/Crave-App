'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dish, Recipe } from '@/lib/types';
import { blankDish, blankRecipe, useStore } from '@/lib/store';
import { unlockAudio } from '@/lib/audio';
import { useKiKuerzung } from '@/lib/useKiKuerzung';
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
import { Toast, ToastMessage } from './ui';
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
      /** Das Rezept entsteht aus dieser Idee. */
      ausIdee?: string;
    }
  | { kind: 'dishForm'; dish: Dish; isNew: boolean }
  | { kind: 'cook'; recipeId: string; servings: number }
  | { kind: 'fridge' }
  | { kind: 'settings' };

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'essen', label: 'Essen', icon: <IconBook size={23} /> },
  { id: 'shopping', label: 'Einkaufsliste', icon: <IconCart size={23} /> },
];

export function AppShell() {
  const store = useStore();
  useKiKuerzung();
  const [tab, setTab] = useState<Tab>('essen');
  const [stack, setStack] = useState<Overlay[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [scrolled, setScrolled] = useState(false);
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

  /* Audio beim ersten Tap entsperren, damit der Kochtimer spaeter klingeln darf. */
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showToast = useCallback((text: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ id: Date.now(), text, actionLabel, onAction });
  }, []);

  const top = stack[stack.length - 1] ?? null;

  /**
   * Namen fuer eine Meldung kuerzen. Zutaten heissen auch mal "Tomaten,
   * stückige (mit Kräutern, z. B. aus dem Tetrapack)" – ungekuerzt fuellt das
   * den halben Bildschirm.
   */
  const kurz = (name: string, max = 28) =>
    name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;

  const openRecipe = useCallback(
    (id: string) => {
      setTab('essen');
      openOverlay({ kind: 'recipe', id });
    },
    [openOverlay],
  );

  const openIdea = useCallback(
    (id: string) => {
      setTab('essen');
      openOverlay({ kind: 'idea', id });
    },
    [openOverlay],
  );

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
      document.querySelector<HTMLInputElement>('input[aria-label="Zutat zur Einkaufsliste hinzufügen"]')?.focus();
      return;
    }
    openOverlay({ kind: 'new' });
  };

  /** Aus dem Plus-Blatt: das Blatt wird durch das gewaehlte Formular ersetzt. */
  const neuAnlegen = (art: NeuArt) => {
    const formular: Overlay =
      art === 'idee'
        ? { kind: 'dishForm', dish: blankDish(), isNew: true }
        : { kind: 'recipeForm', recipe: blankRecipe(), isNew: true, mitLink: art === 'link' };
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

  return (
    <div className="app">
      <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}`}>
        <div className="topbar__inner">
          <span className="brand">
            Cr<em>a</em>ve
          </span>

          <nav className="desknav" aria-label="Bereiche">
            {TABS.map((item) => (
              <button
                key={item.id}
                className={`desknav__item${tab === item.id ? ' desknav__item--active' : ''}`}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <span className="topbar__spacer" />

          <button
            className="iconbtn"
            onClick={() => openOverlay({ kind: 'fridge' })}
            aria-label="Foto vom Kühlschrank aufnehmen"
          >
            <IconCamera />
          </button>
          <button
            className={`iconbtn${tab === 'essen' ? ' iconbtn--primary' : ''}`}
            onClick={addAction}
            aria-label={tab === 'essen' ? 'Neu anlegen' : 'Zutat hinzufügen'}
          >
            <IconPlus />
          </button>
          <button
            className="iconbtn"
            onClick={() => openOverlay({ kind: 'settings' })}
            aria-label="Einstellungen und Synchronisation"
          >
            <IconSettings />
          </button>
        </div>
      </header>

      <main className="app__main">
        {store.sync.cloud === false || store.sync.dbUnreachable ? (
          <div style={{ paddingTop: 18 }}>
            <CloudNotice
              sync={store.sync}
              onOpenSettings={() => openOverlay({ kind: 'settings' })}
            />
          </div>
        ) : null}

        {!store.ready ? (
          // Nur beim allerersten Oeffnen auf einem Geraet: danach steht der
          // lokale Stand sofort da. Die Form der Seite ist schon erkennbar.
          <div className="skeleton" role="status" aria-label="Daten werden geladen">
            <div className="skeleton__title" />
            <div className="skeleton__line" />
            <div className="skeleton__search" />
            {[0, 1, 2, 3, 4].map((index) => (
              <div className="skeleton__card" key={index} />
            ))}
          </div>
        ) : tab === 'essen' ? (
          <EssenView
            recipes={store.recipes}
            ideen={ideen}
            onOpenRecipe={openRecipe}
            onOpenIdea={openIdea}
            onNew={() => openOverlay({ kind: 'new' })}
            onToggleRecipeCookNext={store.toggleRecipeCookNext}
            onToggleIdeaCookNext={store.toggleDishCookNext}
          />
        ) : (
          <ShoppingView
            shopping={store.shopping}
            pantry={store.pantry}
            allPantry={allPantry}
            onAdd={(input) => {
              store.addShoppingItem(input);
              showToast(`${kurz(input.name)} hinzugefügt`);
            }}
            onCheckOff={(id) => {
              const item = store.shopping.find((entry) => entry.id === id);
              store.checkOffShoppingItem(id);
              showToast(
                `${kurz(item?.name ?? 'Zutat')} erledigt`,
                'Rückgängig',
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
                  ? 'Alles schon vorhanden'
                  : `${added} ${added === 1 ? 'Zutat' : 'Zutaten'} ergänzt` +
                      (categorised > 0 ? `, ${categorised} eingeordnet` : ''),
              );
            }}
          />
        )}

        <div style={{ height: 26 }} />
        <div className="rowline" style={{ justifyContent: 'center' }}>
          <SyncBadge sync={store.sync} />
        </div>
      </main>

      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tabbar__item${tab === item.id ? ' tabbar__item--active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span className="tabbar__iconwrap">
              {item.icon}
              {item.id === 'shopping' && store.shopping.length > 0 ? (
                <span className="tabbar__badge">{store.shopping.length}</span>
              ) : null}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* ------------------------------ Overlays ------------------------------ */}

      {top ? renderOverlay(top) : null}

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
              ? 'Aus der Vorlage nachgetragen'
              : 'Für dieses Rezept ist keine Vorlage hinterlegt',
          );
        }}
        onRestoreOriginal={() => {
          store.originalWiederherstellen(recipe.id);
          showToast('Ursprüngliche Schritte wiederhergestellt');
        }}
        onDelete={() => {
          store.deleteRecipe(recipe.id);
          closeTop();
          showToast('Rezept gelöscht');
        }}
        onStartCooking={(servings) => openOverlay({ kind: 'cook', recipeId: recipe.id, servings })}
        onAddToShopping={(servings) => {
          const count = store.addRecipeToShopping(recipe, servings);
          showToast(
            `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} zur Einkaufsliste`,
            'Rückgängig',
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
                ? `${kurz(dish.name)} von Cook Next genommen`
                : `${kurz(dish.name)} auf Cook Next – Zutaten stehen auf der Liste`,
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
          sync={store.sync}
          counts={counts}
          onSyncNow={store.syncNow}
          onAddMissingRecipes={() => {
            const { added, completed } = store.addMissingRecipes();
            const teile = [
              added > 0 ? `${added} nachgetragen` : '',
              completed > 0 ? `${completed} ergänzt` : '',
            ].filter(Boolean);
            showToast(teile.length ? teile.join(', ') : 'Alles schon vorhanden');
          }}
          onClose={closeTop}
        />
      );
    }

    if (overlay.kind === 'fridge') {
      return (
        <FridgeSheet
          recipes={store.recipes}
          pantry={allPantry.map((item) => item.name)}
          onClose={closeTop}
          onOpenRecipe={(id) => {
            closeTop();
            openRecipe(id);
          }}
          onSaveIdea={(recipe) => {
            store.saveRecipe(recipe);
            showToast(`„${recipe.name}“ gespeichert`);
          }}
          onAddMissing={(names) => {
            for (const name of names) store.addShoppingItem({ name });
            showToast(
              `${names.length} ${names.length === 1 ? 'Zutat' : 'Zutaten'} zur Einkaufsliste`,
            );
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
          onClose={closeTop}
          onSave={(recipe) => {
            if (overlay.ausIdee) store.ideeAlsRezept(overlay.ausIdee, recipe);
            else store.saveRecipe(recipe);
            closeTop();
            showToast(
              overlay.ausIdee
                ? 'Aus der Idee ist ein Rezept geworden'
                : overlay.isNew
                  ? 'Rezept angelegt'
                  : 'Rezept gespeichert',
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
            showToast(overlay.isNew ? 'Idee angelegt' : 'Idee gespeichert');
          }}
          onDelete={() => {
            store.deleteDish(overlay.dish.id);
            // Liegt die Ansicht der Idee darunter, geht sie mit.
            const darunter = stack[stack.length - 2];
            closeOverlays(darunter?.kind === 'idea' && darunter.id === overlay.dish.id ? 2 : 1);
            showToast('Idee gelöscht');
          }}
        />
      );
    }

    const recipe = store.getRecipe(overlay.recipeId);
    if (!recipe) return null;
    return <CookMode recipe={recipe} servings={overlay.servings} onClose={closeTop} />;
  }
}
