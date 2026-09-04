'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './Icons';

/* -------------------------------------------------------------------------- */
/* Portal + Scroll-Sperre                                                     */
/* -------------------------------------------------------------------------- */

let lockCount = 0;

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = previous;
    };
  }, [active]);
}

export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* -------------------------------------------------------------------------- */
/* Sheet – Modal auf Desktop, von unten einfahrendes Blatt auf dem iPhone      */
/* -------------------------------------------------------------------------- */

export function Sheet({
  title,
  onClose,
  children,
  footer,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  useBodyScrollLock(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div
        className="overlay"
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => {
          if (event.target === overlayRef.current) onClose();
        }}
      >
        <div className="sheet">
          <div className="sheet__head">
            <h2 className="sheet__title">{title}</h2>
            {actions}
            <button className="iconbtn iconbtn--plain" onClick={onClose} aria-label="Schliessen">
              <IconClose />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
          {footer ? <div className="sheet__foot">{footer}</div> : null}
        </div>
      </div>
    </Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Formularfeld                                                               */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className="row__note">{hint}</span> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Leerzustand                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  glyph,
  title,
  text,
  action,
}: {
  glyph: string;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__glyph" aria-hidden="true">
        {glyph}
      </div>
      <div className="empty__title">{title}</div>
      {text ? <p style={{ marginBottom: action ? 14 : 0 }}>{text}</p> : null}
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toast mit optionaler Rueckgaengig-Aktion                                    */
/* -------------------------------------------------------------------------- */

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const handle = setTimeout(onDismiss, 5200);
    return () => clearTimeout(handle);
  }, [toast.id, onDismiss]);

  return (
    <Portal>
      <div className="toast" role="status" aria-live="polite">
        <span>{toast.text}</span>
        {toast.actionLabel && toast.onAction ? (
          <button
            className="toast__action"
            onClick={() => {
              toast.onAction?.();
              onDismiss();
            }}
          >
            {toast.actionLabel}
          </button>
        ) : null}
      </div>
    </Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Bestaetigungsdialog                                                         */
/* -------------------------------------------------------------------------- */

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useBodyScrollLock(true);
  return (
    <Portal>
      <div className="overlay" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
        <div className="sheet" style={{ maxWidth: 420 }}>
          <div className="sheet__body" style={{ paddingTop: 22 }}>
            <h2 style={{ fontSize: 19, marginBottom: 8 }}>{title}</h2>
            <p className="muted" style={{ fontSize: 14.5 }}>
              {text}
            </p>
          </div>
          <div className="sheet__foot">
            <button className="btn btn--ghost btn--block" onClick={onCancel}>
              Abbrechen
            </button>
            <button
              className="btn btn--block"
              style={{ background: 'var(--berry)', color: 'var(--accent-ink)' }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Zahleneingabe, die auch leer sein darf                                     */
/* -------------------------------------------------------------------------- */

export function NumberInput({
  value,
  onChange,
  placeholder,
  className = 'input',
  ariaLabel,
  min = 0,
  onBlur,
  id,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  min?: number;
  onBlur?: () => void;
  /** Wird eine Id gesetzt, beschriftet das zugehoerige <label> das Feld. */
  id?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const lastValue = useRef(value);

  useEffect(() => {
    if (lastValue.current !== value) {
      lastValue.current = value;
      setText(value == null ? '' : String(value));
    }
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      id={id}
      placeholder={placeholder}
      aria-label={id ? undefined : ariaLabel}
      onBlur={onBlur}
      onChange={(event) => {
        const raw = event.target.value.replace(',', '.');
        if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        if (raw.trim() === '') {
          lastValue.current = null;
          onChange(null);
          return;
        }
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed >= min) {
          lastValue.current = parsed;
          onChange(parsed);
        }
      }}
    />
  );
}
