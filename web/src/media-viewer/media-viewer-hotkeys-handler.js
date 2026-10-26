// Currently global hotkeys handler, so if two of these existed there could be collision as there is no logic to handle such cases.
export class MediaViewerHotkeysHandler {
    actions = new Map;
    isListeningKeyboard = false;
    constructor() {
    }
    addEventListeners() {
        if (this.actions.size === 0) {
            return;
        }
        this.addKeyboardListener();
    }
    removeEventListeners() {
        this.removeKeyboardListener();
    }
    addAction(action) {
        this.actions.set(action.id, action);
        this.addEventListeners();
        return action;
    }
    removeAction(action) {
        const id = typeof action === 'string' ? action : action.id;
        this.actions.delete(id);
        if (this.actions.size === 0) {
            this.removeEventListeners();
        }
    }
    clearAndAddActions(actions) {
        this.actions.clear();
        for (const action of actions) {
            this.addAction(action);
        }
        if (this.actions.size === 0) {
            this.removeEventListeners();
        }
    }
    addKeyboardListener() {
        if (this.isListeningKeyboard) {
            return;
        }
        window.addEventListener('keydown', this.onKeyDown, false);
        this.isListeningKeyboard = true;
    }
    removeKeyboardListener() {
        document.removeEventListener('keydown', this.onKeyDown, false);
        this.isListeningKeyboard = false;
    }
    onKeyDown = (e) => {
        const actions = Array.from(this.actions.values()).filter(a => a.key === e.key && !a.disabled);
        if (actions.length === 0) {
            return;
        }
        for (const action of actions) {
            action.action(e);
            if (action.preventDefault) {
                e.preventDefault();
            }
        }
    };
}
