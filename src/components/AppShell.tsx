'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dish, Recipe } from '@/lib/types';
import { blankDish, blankRecipe, useStore } from '@/lib/store';
import { unlockAudio } from '@/lib/audio';
import { RecipesView } from './RecipesView';
import { DishesView } from './DishesView';
import { ShoppingView } from './ShoppingView';
import { RecipeDetail } from './RecipeDetail';
import { RecipeForm } from './RecipeForm';
import { DishForm } from './DishForm';
import { CookMode } from './CookMode';
import { SettingsSheet, SyncBadge } from './SettingsSheet';
import { CloudNotice } from './CloudNotice';
import { Toast, ToastMessage } from './ui';
import { IconBook, IconCart, IconPlate, IconPlus, IconSettings } from './Icons';

type Tab = 'recipes' | 'dishes' | 'shopping';

type Overlay =
  | { kind: 'recipe'; id: string }
  | { kind: 'recipeForm'; recipe: Recipe; isNew: boolean }
  | { kind: 'dishForm'; dish: Dish; isNew: boolean }
  | { kind: 'cook'; recipeId: string; servings: number }
  | { kind: 'settings' };

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'recipes', label: 'Rezepte', icon: <IconBook size={23} /> },
  { id: 'dishes', label: 'Gerichte', icon: <IconPlate size={23} /> },
  { id: 'shopping', label: 'Einkaufsliste', icon: <IconCart size={23} /> },
];

export function AppShell() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('recipes');
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

  useEffect(() => {
    const onPop = () => setStack((current) => (current.length ? current.slice(0, -1) : current));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openOverlay = useCallback((overlay: Overlay) => {
    try {
      window.history.pushState({ crave: stackRef.current.length + 1 }, '');
    } catch {
      /* z. B. in einem Sandbox-Frame */
    }
    setStack((current) => [...current, overlay]);
  }, []);

  const closeTop = useCallback(() => {
    if (stackRef.current.length === 0) return;
    try {
      window.history.back();
    } catch {
      setStack((current) => current.slice(0, -1));
    }
  }, []);

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

  const openRecipe = useCallback(
    (id: string) => {
      setTab('recipes');
      openOverlay({ kind: 'recipe', id });
    },
    [openOverlay],
  );

  const addAction = () => {
    if (tab === 'shopping') {
      setTab('shopping');
      document.querySelector<HTMLInputElement>('input[aria-label="Zutat zur Einkaufsliste hinzufügen"]')?.focus();
      return;
    }
    if (tab === 'recipes') openOverlay({ kind: 'recipeForm', recipe: blankRecipe(), isNew: true });
    else openOverlay({ kind: 'dishForm', dish: blankDish(), isNew: true });
  };

  const counts = useMemo(
    () => ({
      recipes: store.recipes.length,
      dishes: store.dishes.length,
      shopping: store.shopping.length,
      pantry: Object.values(store.data.pantry).filter((item) => !item.deleted).length,
    }),
    [store.recipes.length, store.dishes.length, store.shopping.length, store.data.pantry],
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
            onClick={addAction}
            aria-label={
              tab === 'recipes'
                ? 'Neues Rezept'
                : tab === 'dishes'
                  ? 'Neues Gericht'
                  : 'Zutat hinzufügen'
            }
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
          <p className="muted" style={{ padding: '40px 0' }}>
            Daten werden geladen…
          </p>
        ) : tab === 'recipes' ? (
          <RecipesView
            recipes={store.recipes}
            onOpen={openRecipe}
            onNew={() => openOverlay({ kind: 'recipeForm', recipe: blankRecipe(), isNew: true })}
            onToggleFavorite={store.toggleRecipeFavorite}
          />
        ) : tab === 'dishes' ? (
          <DishesView
            dishes={store.dishes}
            recipes={store.recipes}
            onOpenRecipe={openRecipe}
            onEditDish={(dish) => openOverlay({ kind: 'dishForm', dish, isNew: false })}
            onNew={() => openOverlay({ kind: 'dishForm', dish: blankDish(), isNew: true })}
            onToggleFavorite={store.toggleDishFavorite}
          />
        ) : (
          <ShoppingView
            shopping={store.shopping}
            pantry={store.pantry}
            allPantry={allPantry}
            onAdd={(input) => {
              store.addShoppingItem(input);
              showToast(`${input.name} hinzugefügt`);
            }}
            onCheckOff={(id) => {
              const item = store.shopping.find((entry) => entry.id === id);
              store.checkOffShoppingItem(id);
              showToast(`${item?.name ?? 'Zutat'} erledigt`, 'Rückgängig', () => storeRef.current.undo?.());
            }}
            onClear={store.clearShoppingList}
            onMovePantryToCart={store.movePantryItemToCart}
            onAddPantryItem={store.addPantryItem}
            onSavePantryItem={store.savePantryItem}
            onDeletePantryItem={store.deletePantryItem}
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
  function renderOverlay(overlay: Overlay): React.ReactNode {
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
              added > 0 ? `${added} ${added === 1 ? 'Rezept' : 'Rezepte'} nachgetragen` : '',
              completed > 0 ? `${completed} um Schritte ergänzt` : '',
            ].filter(Boolean);
            showToast(teile.length ? teile.join(', ') : 'Alles schon vorhanden');
          }}
          onClose={closeTop}
        />
      );
    }

    if (overlay.kind === 'recipe') {
      const recipe = store.getRecipe(overlay.id);
      if (!recipe) {
        return null;
      }
      return (
        <RecipeDetail
          recipe={recipe}
          onClose={closeTop}
          onEdit={() => openOverlay({ kind: 'recipeForm', recipe, isNew: false })}
          onToggleFavorite={() => store.toggleRecipeFavorite(recipe.id)}
          onDelete={() => {
            store.deleteRecipe(recipe.id);
            closeTop();
            showToast('Rezept gelöscht');
          }}
          onStartCooking={(servings) =>
            openOverlay({ kind: 'cook', recipeId: recipe.id, servings })
          }
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

    if (overlay.kind === 'recipeForm') {
      return (
        <RecipeForm
          initial={overlay.recipe}
          isNew={overlay.isNew}
          onClose={closeTop}
          onSave={(recipe) => {
            store.saveRecipe(recipe);
            closeTop();
            showToast(overlay.isNew ? 'Rezept angelegt' : 'Rezept gespeichert');
          }}
        />
      );
    }

    if (overlay.kind === 'dishForm') {
      return (
        <DishForm
          initial={overlay.dish}
          isNew={overlay.isNew}
          recipes={store.recipes}
          onClose={closeTop}
          onSave={(dish) => {
            store.saveDish(dish);
            closeTop();
            showToast(overlay.isNew ? 'Gericht angelegt' : 'Gericht gespeichert');
          }}
          onDelete={() => {
            store.deleteDish(overlay.dish.id);
            closeTop();
            showToast('Gericht gelöscht');
          }}
        />
      );
    }

    const recipe = store.getRecipe(overlay.recipeId);
    if (!recipe) return null;
    return <CookMode recipe={recipe} servings={overlay.servings} onClose={closeTop} />;
  }
}
