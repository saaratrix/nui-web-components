export interface FullpageDragAndDropEvents {
  onDrop: (event: DragEvent) => void;
}

export const defaultFullpageDnDCSS = `
:host-context(body.drag) {
  .drag-drop-area {
    opacity: 1;
    pointer-events: all;
  }
}
.drag-drop-area {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
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
  private _dragAndDropElement: HTMLElement;

  public bodyDragClass = 'drag';
  public onDrop: (event: DragEvent) => void;

  private eventsAdded = false;

  constructor(
    dragAndDropElement: HTMLElement | null,
    events: FullpageDragAndDropEvents
  ) {
    if (!dragAndDropElement) {
      this._dragAndDropElement = document.createElement("div");
    } else {
      this._dragAndDropElement = dragAndDropElement;
    }

    this.onDrop = events.onDrop;
  }

  get dragAndDropElement() {
    return this._dragAndDropElement;
  }

  tryAddEventListeners(): void {
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
  }

  removeEventListeners(): void {
    this.eventsAdded = false;

    document.removeEventListener('dragover', this.handleDocumentDragOver);
    document.removeEventListener('keyup', this.handleKeyUp);

    this.dragAndDropElement.removeEventListener('click', this.handleClick);
    this.dragAndDropElement.removeEventListener('dragleave', this.handleDragLeave);
    this.dragAndDropElement.removeEventListener('drop', this.handleDrop);

    window.removeEventListener('dragover', this.handleWindowDragOver);
    window.removeEventListener('drop', this.handleWindowDrop);
  }

  private handleDocumentDragOver = (event: DragEvent): void => {
    document.body.classList.add(this.bodyDragClass);
    event.preventDefault();
  };

  private handleClick = (): void => {
    document.body.classList.remove(this.bodyDragClass);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      document.body.classList.remove(this.bodyDragClass);
    }
  }

  private handleDragLeave = (): void => {
    document.body.classList.remove(this.bodyDragClass);
  };

  private handleDrop = (event: DragEvent): void => {
    document.body.classList.remove(this.bodyDragClass);
    event.preventDefault();

    this.onDrop(event);
  };

  private handleWindowDragOver = (event: DragEvent): void => {
    event.preventDefault();
  };

  private handleWindowDrop = (event: DragEvent): void => {
    event.preventDefault();
  };
}