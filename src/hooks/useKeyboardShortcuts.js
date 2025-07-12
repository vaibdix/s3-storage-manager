// hooks/useKeyboardShortcuts.js - Global keyboard shortcuts for power users
import { useEffect, useCallback, useRef } from 'react';

export const useKeyboardShortcuts = (handlers = {}, options = {}) => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    ignoreInputs = true,
    scope = 'global' // 'global' | 'local'
  } = options;

  const handlersRef = useRef(handlers);
  const isModifierPressed = useRef({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false
  });
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  const isInputElement = useCallback((target) => {
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    const isContentEditable = target.contentEditable === 'true';

    return inputTypes.includes(tagName) || isContentEditable;
  }, []);
  const getShortcutString = useCallback((event) => {
    const parts = [];

    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    const key = event.key.toLowerCase();
    const specialKeys = {
      ' ': 'space',
      'escape': 'esc',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right',
      'backspace': 'backspace',
      'delete': 'del',
      'enter': 'enter',
      'tab': 'tab'
    };

    const normalizedKey = specialKeys[key] || key;
    parts.push(normalizedKey);

    return parts.join('+');
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    isModifierPressed.current = {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
    if (ignoreInputs && isInputElement(event.target)) {
      return;
    }

    const shortcut = getShortcutString(event);
    const handler = handlersRef.current[shortcut];

    if (handler) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      handler(event, {
        shortcut,
        modifiers: isModifierPressed.current,
        target: event.target
      });
    }
  }, [enabled, ignoreInputs, preventDefault, stopPropagation, isInputElement, getShortcutString]);

  const handleKeyUp = useCallback((event) => {
    isModifierPressed.current = {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
  }, []);
s
  useEffect(() => {
    if (!enabled) return;
    const target = scope === 'global' ? document : window;
    target.addEventListener('keydown', handleKeyDown);
    target.addEventListener('keyup', handleKeyUp);
    return () => {
      target.removeEventListener('keydown', handleKeyDown);
      target.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, scope, handleKeyDown, handleKeyUp]);
  return {
    isModifierPressed: isModifierPressed.current
  };
};
export const FILE_MANAGER_SHORTCUTS = {
  'ctrl+a': 'selectAll',
  'ctrl+shift+a': 'selectNone',
  'ctrl+i': 'invertSelection',
  'enter': 'openSelected',
  'space': 'preview',
  'backspace': 'navigateUp',
  'alt+up': 'navigateUp',
  'alt+left': 'goBack',
  'alt+right': 'goForward',
  'delete': 'deleteSelected',
  'shift+delete': 'deleteSelectedPermanently',
  'f2': 'renameSelected',
  'ctrl+c': 'copySelected',
  'ctrl+x': 'cutSelected',
  'ctrl+v': 'pasteClipboard',
  'ctrl+d': 'duplicateSelected',
  'f5': 'refresh',
  'ctrl+r': 'refresh',
  'ctrl+f': 'search',
  'esc': 'clearSearch',
  'ctrl+1': 'listView',
  'ctrl+2': 'gridView',
  'ctrl+3': 'detailView',
  'ctrl+u': 'uploadFiles',
  'ctrl+shift+n': 'newFolder',
  'up': 'selectPrevious',
  'down': 'selectNext',
  'home': 'selectFirst',
  'end': 'selectLast',
  'shift+up': 'extendSelectionUp',
  'shift+down': 'extendSelectionDown',
  'shift+home': 'selectToStart',
  'shift+end': 'selectToEnd'
};

export const useFileManagerShortcuts = (actions = {}, options = {}) => {
  const shortcutHandlers = {};
  Object.entries(FILE_MANAGER_SHORTCUTS).forEach(([shortcut, actionName]) => {
    if (actions[actionName]) {
      shortcutHandlers[shortcut] = actions[actionName];
    }
  });

  return useKeyboardShortcuts(shortcutHandlers, {
    preventDefault: true,
    ignoreInputs: true,
    ...options
  });
};

export const useSearchShortcuts = (actions = {}) => {
  const shortcuts = {
    'ctrl+f': actions.focusSearch,
    'esc': actions.clearSearch,
    'enter': actions.executeSearch,
    'ctrl+enter': actions.searchInFiles,
    'f3': actions.findNext,
    'shift+f3': actions.findPrevious
  };
  return useKeyboardShortcuts(shortcuts, {
    preventDefault: true,
    ignoreInputs: false // Allow in search inputs
  });
};

export const useModalShortcuts = (actions = {}) => {
  const shortcuts = {
    'esc': actions.closeModal,
    'enter': actions.confirmAction,
    'ctrl+enter': actions.forceConfirm,
    'tab': actions.nextField,
    'shift+tab': actions.previousField
  };

  return useKeyboardShortcuts(shortcuts, {
    preventDefault: false,
    stopPropagation: true
  });
};