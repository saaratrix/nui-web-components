export const defaultFullpageDnDCSS = `
.drag-drop-area {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 9999;
  opacity: var(--dnd-on, 1) var(--dnd-off, 0);
  pointer-events: var(--dnd-on, all) var(--dnd-off, none);
  transition: opacity 0.15s ease-in;
  background-color: var(--drag-drop-area-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  text-shadow: 1px 1px 2px black;
}
`;
export class FullpageDragAndDrop {
    _dragAndDropElement;
    bodyDragClass = 'drag';
    onDrop;
    eventsAdded = false;
    componentCreatedElement = false;
    constructor(dragAndDropElement, events) {
        if (!dragAndDropElement) {
            this._dragAndDropElement = document.createElement("div");
            this.componentCreatedElement = true;
        }
        else {
            this._dragAndDropElement = dragAndDropElement;
        }
        this.onDrop = events.onDrop;
    }
    get dragAndDropElement() {
        return this._dragAndDropElement;
    }
    tryAddEventListeners() {
        if (this.eventsAdded) {
            return;
        }
        this.eventsAdded = true;
        document.addEventListener('dragover', this.handleDocumentDragOver);
        document.addEventListener("keyup", this.handleKeyUp);
        this.dragAndDropElement.addEventListener('click', this.handleClick);
        this.dragAndDropElement.addEventListener('dragleave', this.handleDragLeave);
        this.dragAndDropElement.addEventListener('drop', this.handleDrop);
        window.addEventListener('dragover', this.handleWindowDragOver);
        window.addEventListener('drop', this.handleWindowDrop);
        this.removeDndState();
    }
    removeEventListeners() {
        this.eventsAdded = false;
        document.removeEventListener('dragover', this.handleDocumentDragOver);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.dragAndDropElement.removeEventListener('click', this.handleClick);
        this.dragAndDropElement.removeEventListener('dragleave', this.handleDragLeave);
        this.dragAndDropElement.removeEventListener('drop', this.handleDrop);
        window.removeEventListener('dragover', this.handleWindowDragOver);
        window.removeEventListener('drop', this.handleWindowDrop);
        this.removeDndState();
    }
    destroy() {
        if (this.componentCreatedElement) {
            const parentElement = this._dragAndDropElement.parentElement || this._dragAndDropElement.parentNode;
            parentElement?.removeChild(this.dragAndDropElement);
        }
        this.removeEventListeners();
    }
    handleDocumentDragOver = (event) => {
        this.addDndState();
        event.preventDefault();
    };
    handleClick = () => {
        this.removeDndState();
    };
    handleKeyUp = (event) => {
        if (event.key === "Escape") {
            this.removeDndState();
        }
    };
    handleDragLeave = () => {
        this.removeDndState();
    };
    handleDrop = (event) => {
        this.removeDndState();
        event.preventDefault();
        this.onDrop(event);
    };
    handleWindowDragOver = (event) => {
        event.preventDefault();
    };
    handleWindowDrop = (event) => {
        event.preventDefault();
    };
    addDndState() {
        document.body.style.setProperty('--dnd-on', 'initial');
        document.body.style.setProperty('--dnd-off', ' ');
        document.body.classList.add(this.bodyDragClass);
    }
    removeDndState() {
        document.body.classList.remove(this.bodyDragClass);
        document.body.style.setProperty('--dnd-on', ' ');
        document.body.style.setProperty('--dnd-off', 'initial');
    }
}
