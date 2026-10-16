import type { Command, KeyBinding } from '@codemirror/view';
import {
  undo,
  redo,
  undoSelection,
  redoSelection,
  cursorCharLeft,
  cursorCharRight,
  cursorCharForward,
  cursorCharBackward,
  cursorGroupLeft,
  cursorGroupRight,
  cursorGroupForward,
  cursorGroupBackward,
  cursorLineUp,
  cursorLineDown,
  cursorPageUp,
  cursorPageDown,
  cursorLineStart,
  cursorLineEnd,
  cursorDocStart,
  cursorDocEnd,
  selectCharLeft,
  selectCharRight,
  selectGroupLeft,
  selectGroupRight,
  selectLineUp,
  selectLineDown,
  selectPageUp,
  selectPageDown,
  selectLineStart,
  selectLineEnd,
  selectDocStart,
  selectDocEnd,
  selectAll,
  selectLine,
  deleteCharBackward,
  deleteCharForward,
  deleteGroupBackward,
  deleteGroupForward,
  deleteLine,
  deleteToLineStart,
  deleteToLineEnd,
  indentMore,
  indentLess,
  indentSelection,
  insertNewlineAndIndent,
  insertBlankLine,
  transposeChars,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown
} from '@codemirror/commands';
import { foldCode, unfoldCode, toggleFold, foldAll, unfoldAll } from '@codemirror/language';
import {
  getCollapsibleHeadingSections,
  toggleCollapsibleSection
} from './headingCollapse';
import {
  resolveKeymapKeyForPlatform,
  type KeymapCommandName,
  type NormalizedKeymapBinding
} from '../../../src/shared/keymapConfig';

export type KeymapCommandHandlers = {
  openFind?: () => void;
  openReplace?: () => void;
  toggleMode?: () => void;
};

const toggleHeadingCollapseCommand: Command = (view) => {
  const head = view.state.selection.main.head;
  const sections = getCollapsibleHeadingSections(view.state);
  if (!sections.length) {
    return false;
  }

  // Prefer the heading line itself, then the deepest section containing the cursor.
  let target = sections.find((section) => {
    const line = view.state.doc.lineAt(section.lineFrom);
    return head >= line.from && head <= line.to;
  });
  if (!target) {
    target = [...sections].reverse().find(
      (section) => head > section.collapseFrom && head < section.collapseTo
    );
  }
  if (!target) {
    // Nearest heading above the cursor.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      if (sections[i].lineFrom <= head) {
        target = sections[i];
        break;
      }
    }
  }
  if (!target) {
    return false;
  }
  return toggleCollapsibleSection(view, target.lineFrom);
};

const BUILTIN_COMMANDS: Partial<Record<KeymapCommandName, Command>> = {
  undo,
  redo,
  undoSelection,
  redoSelection,
  cursorCharLeft,
  cursorCharRight,
  cursorCharForward,
  cursorCharBackward,
  cursorGroupLeft,
  cursorGroupRight,
  cursorGroupForward,
  cursorGroupBackward,
  cursorLineUp,
  cursorLineDown,
  cursorPageUp,
  cursorPageDown,
  cursorLineStart,
  cursorLineEnd,
  cursorDocStart,
  cursorDocEnd,
  selectCharLeft,
  selectCharRight,
  selectGroupLeft,
  selectGroupRight,
  selectLineUp,
  selectLineDown,
  selectPageUp,
  selectPageDown,
  selectLineStart,
  selectLineEnd,
  selectDocStart,
  selectDocEnd,
  selectAll,
  selectLine,
  deleteCharBackward,
  deleteCharForward,
  deleteGroupBackward,
  deleteGroupForward,
  deleteLine,
  deleteToLineStart,
  deleteToLineEnd,
  indentMore,
  indentLess,
  indentSelection,
  insertNewlineAndIndent,
  insertBlankLine,
  transposeChars,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown,
  foldCode,
  unfoldCode,
  toggleFold,
  foldAll,
  unfoldAll,
  toggleHeadingCollapse: toggleHeadingCollapseCommand
};

/**
 * Claim the key in CodeMirror so lower keymaps do not handle it, but allow the
 * event to bubble to VS Code's webview keybinding forwarder.
 */
const passthroughBinding = (key: string): KeyBinding => ({
  key,
  run: () => true,
  preventDefault: false,
  stopPropagation: false
});

const overridingBinding = (key: string, command: Command): KeyBinding => ({
  key,
  run: (view) => {
    command(view);
    // A configured binding owns its chord even when the command has no effect in
    // the current editor state. Do not fall through to the default keymaps.
    return true;
  },
  stopPropagation: true
});

export function buildUserKeymapBindings(
  bindings: readonly NormalizedKeymapBinding[],
  handlers: KeymapCommandHandlers = {}
): KeyBinding[] {
  if (!bindings.length) {
    return [];
  }

  const result: KeyBinding[] = [];

  for (const binding of bindings) {
    if (binding.command === 'passthrough') {
      result.push(passthroughBinding(binding.key));
      continue;
    }

    if (binding.command === 'openFind') {
      if (handlers.openFind) {
        result.push(overridingBinding(binding.key, () => {
          handlers.openFind?.();
          return true;
        }));
      }
      continue;
    }

    if (binding.command === 'openReplace') {
      if (handlers.openReplace) {
        result.push(overridingBinding(binding.key, () => {
          handlers.openReplace?.();
          return true;
        }));
      }
      continue;
    }

    if (binding.command === 'toggleMode') {
      if (handlers.toggleMode) {
        result.push(overridingBinding(binding.key, () => {
          handlers.toggleMode?.();
          return true;
        }));
      }
      continue;
    }

    const command = BUILTIN_COMMANDS[binding.command];
    if (!command) {
      continue;
    }
    result.push(overridingBinding(binding.key, command));
  }

  return result;
}

export function collectUserKeymapKeys(
  bindings: readonly NormalizedKeymapBinding[],
  isMac: boolean
): Set<string> {
  const keys = new Set<string>();
  for (const binding of bindings) {
    keys.add(resolveKeymapKeyForPlatform(binding.key, isMac));
  }
  return keys;
}
