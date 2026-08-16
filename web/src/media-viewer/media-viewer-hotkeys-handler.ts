export type MediaViewerHotkeys = 'ArrowLeft' | 'ArrowRight' | ' ';

export interface MediaViewerHotkeyAction {
  id: string;
  disabled?: boolean;
  key: MediaViewerHotkeys;
  action: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

// Currently global hotkeys handler, so if two of these existed there could be collision as there is no logic to handle such cases.
export class MediaViewerHotkeysHandler {

  private actions = new Map<string, MediaViewerHotkeyAction>;
  private isListeningKeyboard = false;

  constructor() {
  }

  addEventListeners(): void {
    if (this.actions.size === 0) {
      return;
    }

    this.addKeyboardListener();
  }

  removeEventListeners(): void {
    this.removeKeyboardListener();
  }

  addAction(action: MediaViewerHotkeyAction): MediaViewerHotkeyAction {
    this.actions.set(action.id, action);
    this.addEventListeners();
    return action;
  }

  removeAction(action: string | MediaViewerHotkeyAction): void {
    const id = typeof action === 'string' ? action : action.id;
    this.actions.delete(id);
    if (this.actions.size === 0) {
      this.removeEventListeners();
    }
  }

  clearAndAddActions(actions: MediaViewerHotkeyAction[]): void {
    this.actions.clear();
    for (const action of actions) {
      this.addAction(action);
    }

    if (this.actions.size === 0) {
      this.removeEventListeners();
    }
  }

  private addKeyboardListener(): void {
    if (this.isListeningKeyboard) {
      return;
    }

    window.addEventListener('keydown', this.onKeyDown, { capture: true });
    this.isListeningKeyboard = true;
  }

  private removeKeyboardListener(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.isListeningKeyboard = false;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const actions =  Array.from(this.actions.values()).filter(a => a.key === e.key && !a.disabled);
    if (actions.length === 0) {
      return;
    }

    for (const action of actions) {
      action.action(e);
      if (action.preventDefault) {
        e.preventDefault();
      }
    }
  }
}