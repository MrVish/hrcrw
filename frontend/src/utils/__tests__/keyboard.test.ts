import {
  KEYS,
  isKey,
  isAnyKey,
  KeyboardNavigator,
  FocusTrap,
  announceToScreenReader,
  getFocusableElements,
  isFocusable,
  createActivationHandler,
} from '../keyboard';

// Mock DOM elements
const createMockElement = (tagName: string, attributes: Record<string, string> = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

describe('Keyboard utilities', () => {
  describe('isKey', () => {
    it('returns true for matching key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(isKey(event, KEYS.ENTER)).toBe(true);
    });

    it('returns false for non-matching key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Space' });
      expect(isKey(event, KEYS.ENTER)).toBe(false);
    });
  });

  describe('isAnyKey', () => {
    it('returns true when key matches any in array', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(isAnyKey(event, [KEYS.ENTER, KEYS.SPACE])).toBe(true);
    });

    it('returns false when key matches none in array', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      expect(isAnyKey(event, [KEYS.ENTER, KEYS.SPACE])).toBe(false);
    });
  });

  describe('KeyboardNavigator', () => {
    let mockElements: HTMLElement[];
    let navigator: KeyboardNavigator;

    beforeEach(() => {
      mockElements = [
        createMockElement('button'),
        createMockElement('button'),
        createMockElement('button'),
      ];
      
      // Mock focus method
      mockElements.forEach(el => {
        el.focus = jest.fn();
      });

      navigator = new KeyboardNavigator(mockElements);
    });

    it('initializes with correct state', () => {
      expect(navigator.getCurrentIndex()).toBe(-1);
      expect(navigator.getCurrentItem()).toBeNull();
    });

    it('focuses first item', () => {
      navigator.focusFirst();
      expect(navigator.getCurrentIndex()).toBe(0);
      expect(mockElements[0].focus).toHaveBeenCalled();
    });

    it('focuses last item', () => {
      navigator.focusLast();
      expect(navigator.getCurrentIndex()).toBe(2);
      expect(mockElements[2].focus).toHaveBeenCalled();
    });

    it('navigates to next item', () => {
      navigator.focusFirst();
      navigator.focusNext();
      expect(navigator.getCurrentIndex()).toBe(1);
      expect(mockElements[1].focus).toHaveBeenCalled();
    });

    it('navigates to previous item', () => {
      navigator.focusLast();
      navigator.focusPrevious();
      expect(navigator.getCurrentIndex()).toBe(1);
      expect(mockElements[1].focus).toHaveBeenCalled();
    });

    it('loops to first when at end and loop is enabled', () => {
      navigator.focusLast();
      navigator.focusNext();
      expect(navigator.getCurrentIndex()).toBe(0);
      expect(mockElements[0].focus).toHaveBeenCalled();
    });

    it('loops to last when at beginning and loop is enabled', () => {
      navigator.focusFirst();
      navigator.focusPrevious();
      expect(navigator.getCurrentIndex()).toBe(2);
      expect(mockElements[2].focus).toHaveBeenCalled();
    });

    it('does not loop when loop is disabled', () => {
      const noLoopNavigator = new KeyboardNavigator(mockElements, { loop: false });
      noLoopNavigator.focusLast();
      const lastIndex = noLoopNavigator.getCurrentIndex();
      
      noLoopNavigator.focusNext();
      expect(noLoopNavigator.getCurrentIndex()).toBe(lastIndex);
    });

    it('handles keyboard events correctly', () => {
      const downEvent = new KeyboardEvent('keydown', { key: KEYS.ARROW_DOWN });
      const upEvent = new KeyboardEvent('keydown', { key: KEYS.ARROW_UP });
      const homeEvent = new KeyboardEvent('keydown', { key: KEYS.HOME });
      const endEvent = new KeyboardEvent('keydown', { key: KEYS.END });

      expect(navigator.handleKeyDown(downEvent)).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(0);

      expect(navigator.handleKeyDown(upEvent)).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(2);

      expect(navigator.handleKeyDown(homeEvent)).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(0);

      expect(navigator.handleKeyDown(endEvent)).toBe(true);
      expect(navigator.getCurrentIndex()).toBe(2);
    });

    it('returns false for unhandled keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(navigator.handleKeyDown(event)).toBe(false);
    });
  });

  describe('FocusTrap', () => {
    let container: HTMLElement;
    let focusTrap: FocusTrap;
    let mockButton1: HTMLButtonElement;
    let mockButton2: HTMLButtonElement;

    beforeEach(() => {
      container = document.createElement('div');
      mockButton1 = createMockElement('button') as HTMLButtonElement;
      mockButton2 = createMockElement('button') as HTMLButtonElement;
      
      container.appendChild(mockButton1);
      container.appendChild(mockButton2);
      document.body.appendChild(container);

      // Mock focus methods
      mockButton1.focus = jest.fn();
      mockButton2.focus = jest.fn();

      focusTrap = new FocusTrap(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('focuses first element on activation', () => {
      focusTrap.activate();
      expect(mockButton1.focus).toHaveBeenCalled();
    });

    it('restores previous focus on deactivation', () => {
      const previousElement = createMockElement('input');
      previousElement.focus = jest.fn();
      document.body.appendChild(previousElement);
      
      // Simulate previous element being focused
      Object.defineProperty(document, 'activeElement', {
        value: previousElement,
        configurable: true,
      });

      focusTrap.activate();
      focusTrap.deactivate();

      expect(previousElement.focus).toHaveBeenCalled();
      
      document.body.removeChild(previousElement);
    });
  });

  describe('announceToScreenReader', () => {
    it('creates announcement element with correct attributes', () => {
      announceToScreenReader('Test announcement', 'assertive');

      const announcement = document.querySelector('[aria-live="assertive"]');
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveTextContent('Test announcement');
      expect(announcement).toHaveClass('sr-only');
    });

    it('removes announcement after timeout', (done) => {
      announceToScreenReader('Test announcement');

      setTimeout(() => {
        const announcement = document.querySelector('[aria-live="polite"]');
        expect(announcement).not.toBeInTheDocument();
        done();
      }, 1100);
    });
  });

  describe('getFocusableElements', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button>Button</button>
        <input type="text" />
        <select><option>Option</option></select>
        <textarea></textarea>
        <a href="#">Link</a>
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Non-focusable div</div>
        <button disabled>Disabled button</button>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('returns all focusable elements', () => {
      const focusableElements = getFocusableElements(container);
      expect(focusableElements).toHaveLength(5); // Excludes disabled and tabindex="-1"
    });
  });

  describe('isFocusable', () => {
    it('returns true for focusable elements', () => {
      const button = createMockElement('button');
      const input = createMockElement('input');
      const link = createMockElement('a', { href: '#' });
      const tabindexDiv = createMockElement('div', { tabindex: '0' });

      expect(isFocusable(button)).toBe(true);
      expect(isFocusable(input)).toBe(true);
      expect(isFocusable(link)).toBe(true);
      expect(isFocusable(tabindexDiv)).toBe(true);
    });

    it('returns false for non-focusable elements', () => {
      const disabledButton = createMockElement('button', { disabled: 'true' });
      const negativeTabindex = createMockElement('div', { tabindex: '-1' });
      const regularDiv = createMockElement('div');

      expect(isFocusable(disabledButton)).toBe(false);
      expect(isFocusable(negativeTabindex)).toBe(false);
      expect(isFocusable(regularDiv)).toBe(false);
    });
  });

  describe('createActivationHandler', () => {
    it('creates handler with click and keydown events', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback);

      expect(typeof handler.onClick).toBe('function');
      expect(typeof handler.onKeyDown).toBe('function');
    });

    it('calls callback on click', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback);

      handler.onClick();
      expect(callback).toHaveBeenCalled();
    });

    it('calls callback on Enter key', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback);
      const event = new KeyboardEvent('keydown', { key: KEYS.ENTER });
      
      // Mock preventDefault
      event.preventDefault = jest.fn();

      handler.onKeyDown(event);
      expect(callback).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('calls callback on Space key', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback);
      const event = new KeyboardEvent('keydown', { key: KEYS.SPACE });
      
      event.preventDefault = jest.fn();

      handler.onKeyDown(event);
      expect(callback).toHaveBeenCalled();
    });

    it('does not call callback on other keys', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback);
      const event = new KeyboardEvent('keydown', { key: 'a' });

      handler.onKeyDown(event);
      expect(callback).not.toHaveBeenCalled();
    });

    it('accepts custom activation keys', () => {
      const callback = jest.fn();
      const handler = createActivationHandler(callback, [KEYS.ESCAPE]);
      const event = new KeyboardEvent('keydown', { key: KEYS.ESCAPE });
      
      event.preventDefault = jest.fn();

      handler.onKeyDown(event);
      expect(callback).toHaveBeenCalled();
    });
  });
});