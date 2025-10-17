/**
 * Keyboard navigation utilities for accessibility
 */

export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export type KeyCode = typeof KEYS[keyof typeof KEYS];

/**
 * Check if a key event matches a specific key
 */
export const isKey = (event: KeyboardEvent, key: KeyCode): boolean => {
  return event.key === key;
};

/**
 * Check if any of the specified keys match the event
 */
export const isAnyKey = (event: KeyboardEvent, keys: KeyCode[]): boolean => {
  return keys.includes(event.key as KeyCode);
};

/**
 * Handle keyboard navigation for lists/menus
 */
export class KeyboardNavigator {
  private items: HTMLElement[] = [];
  private currentIndex = -1;
  private loop = true;

  constructor(items: HTMLElement[] = [], options: { loop?: boolean } = {}) {
    this.items = items;
    this.loop = options.loop ?? true;
  }

  setItems(items: HTMLElement[]): void {
    this.items = items;
    this.currentIndex = -1;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentItem(): HTMLElement | null {
    return this.items[this.currentIndex] || null;
  }

  focusFirst(): void {
    if (this.items.length > 0) {
      this.currentIndex = 0;
      this.items[0].focus();
    }
  }

  focusLast(): void {
    if (this.items.length > 0) {
      this.currentIndex = this.items.length - 1;
      this.items[this.currentIndex].focus();
    }
  }

  focusNext(): void {
    if (this.items.length === 0) return;

    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    } else if (this.loop) {
      this.currentIndex = 0;
    }

    this.items[this.currentIndex].focus();
  }

  focusPrevious(): void {
    if (this.items.length === 0) return;

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else if (this.loop) {
      this.currentIndex = this.items.length - 1;
    }

    this.items[this.currentIndex].focus();
  }

  focusItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.items[index].focus();
    }
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case KEYS.ARROW_DOWN:
        event.preventDefault();
        this.focusNext();
        return true;

      case KEYS.ARROW_UP:
        event.preventDefault();
        this.focusPrevious();
        return true;

      case KEYS.HOME:
        event.preventDefault();
        this.focusFirst();
        return true;

      case KEYS.END:
        event.preventDefault();
        this.focusLast();
        return true;

      default:
        return false;
    }
  }
}

/**
 * Focus trap utility for modals and dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previousActiveElement: Element | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  private updateFocusableElements(): void {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = 
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  activate(): void {
    this.previousActiveElement = document.activeElement;
    this.updateFocusableElements();
    
    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }

    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== KEYS.TAB) return;

    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}

/**
 * Announce text to screen readers
 */
export const announceToScreenReader = (
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
};

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  if (element.offsetParent === null) return false; // Hidden element

  const focusableTags = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'];
  if (focusableTags.includes(element.tagName)) return true;
  if (element.hasAttribute('tabindex')) return true;
  if (element.getAttribute('contenteditable') === 'true') return true;

  return false;
};

/**
 * React hook for keyboard navigation
 */
export const useKeyboardNavigation = (
  items: HTMLElement[],
  options: { loop?: boolean } = {}
) => {
  const navigator = new KeyboardNavigator(items, options);

  const handleKeyDown = (event: KeyboardEvent) => {
    return navigator.handleKeyDown(event);
  };

  return {
    navigator,
    handleKeyDown,
    focusFirst: () => navigator.focusFirst(),
    focusLast: () => navigator.focusLast(),
    focusNext: () => navigator.focusNext(),
    focusPrevious: () => navigator.focusPrevious(),
    getCurrentIndex: () => navigator.getCurrentIndex(),
    getCurrentItem: () => navigator.getCurrentItem(),
  };
};

/**
 * React hook for focus trap
 */
export const useFocusTrap = (containerRef: React.RefObject<HTMLElement>) => {
  const focusTrap = containerRef.current ? new FocusTrap(containerRef.current) : null;

  const activate = () => {
    if (focusTrap) {
      focusTrap.activate();
    }
  };

  const deactivate = () => {
    if (focusTrap) {
      focusTrap.deactivate();
    }
  };

  return { activate, deactivate };
};

/**
 * Utility to handle click and keyboard activation
 */
export const createActivationHandler = (
  callback: () => void,
  keys: KeyCode[] = [KEYS.ENTER, KEYS.SPACE]
) => {
  return {
    onClick: callback,
    onKeyDown: (event: KeyboardEvent) => {
      if (isAnyKey(event, keys)) {
        event.preventDefault();
        callback();
      }
    },
  };
};

export default {
  KEYS,
  isKey,
  isAnyKey,
  KeyboardNavigator,
  FocusTrap,
  announceToScreenReader,
  getFocusableElements,
  isFocusable,
  useKeyboardNavigation,
  useFocusTrap,
  createActivationHandler,
};