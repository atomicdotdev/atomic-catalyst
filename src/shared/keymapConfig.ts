/**
 * Shared keymap config for catalystIntent.keymap.
 * Used by the extension host (settings parse) and the webview (bindings).
 */

export const KEYMAP_SETTING_KEY = 'keymap';

export const KEYMAP_COMMAND_WHITELIST = [
  'passthrough',
  // History
  'undo',
  'redo',
  'undoSelection',
  'redoSelection',
  // Cursor and selection
  'cursorCharLeft',
  'cursorCharRight',
  'cursorCharForward',
  'cursorCharBackward',
  'cursorGroupLeft',
  'cursorGroupRight',
  'cursorGroupForward',
  'cursorGroupBackward',
  'cursorLineUp',
  'cursorLineDown',
  'cursorPageUp',
  'cursorPageDown',
  'cursorLineStart',
  'cursorLineEnd',
  'cursorDocStart',
  'cursorDocEnd',
  'selectCharLeft',
  'selectCharRight',
  'selectGroupLeft',
  'selectGroupRight',
  'selectLineUp',
  'selectLineDown',
  'selectPageUp',
  'selectPageDown',
  'selectLineStart',
  'selectLineEnd',
  'selectDocStart',
  'selectDocEnd',
  'selectAll',
  'selectLine',
  // Editing
  'deleteCharBackward',
  'deleteCharForward',
  'deleteGroupBackward',
  'deleteGroupForward',
  'deleteLine',
  'deleteToLineStart',
  'deleteToLineEnd',
  'indentMore',
  'indentLess',
  'indentSelection',
  'insertNewlineAndIndent',
  'insertBlankLine',
  'transposeChars',
  'moveLineUp',
  'moveLineDown',
  'copyLineUp',
  'copyLineDown',
  // CodeMirror language folding
  'foldCode',
  'unfoldCode',
  'toggleFold',
  'foldAll',
  'unfoldAll',
  // MEO commands
  'toggleHeadingCollapse',
  'openFind',
  'openReplace',
  'toggleMode'
] as const;

export type KeymapCommandName = typeof KEYMAP_COMMAND_WHITELIST[number];

/** Canonical CodeMirror key, such as Alt-ArrowUp or Mod-Shift-f. */
export type NormalizedKeymapBinding = {
  key: string;
  command: KeymapCommandName;
};

const commandSet = new Set<string>(KEYMAP_COMMAND_WHITELIST);

const SPECIAL_KEY_ALIASES: Record<string, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  enter: 'Enter',
  return: 'Enter',
  escape: 'Escape',
  esc: 'Escape',
  space: 'Space',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  pgup: 'PageUp',
  pgdn: 'PageDown'
};

const MODIFIER_ALIASES: Record<string, string> = {
  mod: 'Mod',
  cmd: 'Cmd',
  command: 'Cmd',
  meta: 'Cmd',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift'
};

/**
 * Normalize user key strings ("alt+up", "Ctrl-Shift-F", "mod+shift+f") to CodeMirror form ("Alt-ArrowUp").
 */
export function normalizeKeymapKey(raw: string): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed
    .split(/[+\-\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const modifiers: string[] = [];
  let mainKey: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (MODIFIER_ALIASES[lower]) {
      const mod = MODIFIER_ALIASES[lower];
      if (!modifiers.includes(mod)) {
        modifiers.push(mod);
      }
      continue;
    }
    if (mainKey) {
      // Multiple main keys are invalid.
      return null;
    }
    if (SPECIAL_KEY_ALIASES[lower]) {
      mainKey = SPECIAL_KEY_ALIASES[lower];
      continue;
    }
    // Single character → keep letter lowercase for CM (f not F), except when length > 1
    if (part.length === 1) {
      mainKey = part.toLowerCase();
    } else if (/^f\d{1,2}$/i.test(part)) {
      mainKey = part.toUpperCase();
    } else {
      // Pascal-case unknowns (ArrowUp already handled)
      mainKey = part[0].toUpperCase() + part.slice(1);
    }
  }

  if (!mainKey) {
    return null;
  }

  const order = ['Mod', 'Ctrl', 'Cmd', 'Alt', 'Shift'];
  modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return [...modifiers, mainKey].join('-');
}

export function normalizeKeymapCommand(raw: unknown): KeymapCommandName | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const command = raw.trim();
  if (!commandSet.has(command)) {
    return null;
  }
  return command as KeymapCommandName;
}

export function parseKeymapBindings(raw: unknown): NormalizedKeymapBinding[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seenKeys = new Set<string>();
  const result: NormalizedKeymapBinding[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const key = normalizeKeymapKey(typeof record.key === 'string' ? record.key : '');
    const command = normalizeKeymapCommand(record.command);
    if (!key || !command) {
      continue;
    }
    // Last binding for a key wins.
    if (seenKeys.has(key)) {
      const index = result.findIndex((item) => item.key === key);
      if (index >= 0) {
        result.splice(index, 1);
      }
    }
    seenKeys.add(key);
    result.push({ key, command });
  }

  return result;
}

export function resolveKeymapKeyForPlatform(key: string, isMac: boolean): string {
  const parts = key.split('-');
  if (parts.length === 1) {
    return key;
  }

  const main = parts.pop() as string;
  const order = ['Ctrl', 'Cmd', 'Alt', 'Shift'];
  const modifiers = parts
    .map((modifier) => modifier === 'Mod' ? (isMac ? 'Cmd' : 'Ctrl') : modifier)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [...new Set(modifiers), main].join('-');
}

/** Build a normalized physical key string from a browser KeyboardEvent. */
export function keyEventToNormalizedKey(event: KeyboardEvent): string {
  const modifiers: string[] = [];
  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }
  if (event.metaKey) {
    modifiers.push('Cmd');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  let main: string;
  const code = event.code || '';
  const key = event.key || '';

  if (code.startsWith('Arrow') || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    main = key.startsWith('Arrow') ? key : code;
  } else if (code.startsWith('Key') && code.length === 4) {
    main = code.slice(3).toLowerCase();
  } else if (code.startsWith('Digit') && code.length === 6) {
    main = code.slice(5);
  } else if (/^F\d{1,2}$/.test(code)) {
    main = code;
  } else if (key === ' ') {
    main = 'Space';
  } else if (key.length === 1) {
    main = key.toLowerCase();
  } else {
    main = key.length ? key[0].toUpperCase() + key.slice(1) : code;
  }

  const order = ['Ctrl', 'Cmd', 'Alt', 'Shift'];
  const uniqueMods = [...new Set(modifiers)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [...uniqueMods, main].join('-');
}
