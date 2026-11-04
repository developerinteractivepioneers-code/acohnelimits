/**
 * Text that cross-fades between values.
 *
 * Two stacked layers share one grid cell and alternate: the current text
 * drifts up and blurs out while the next one rises in from below.
 */

const ENTER_CLASS = 'is-entering';
const LEAVE_CLASS = 'is-leaving';
const CURRENT_CLASS = 'is-current';

export class FadeText {
  readonly element: HTMLElement;

  private readonly layers: [HTMLElement, HTMLElement];
  private active = 0;
  private onEntered: (() => void) | null = null;

  /** Turns `element` into a fade container; its text content becomes the first value. */
  constructor(element: HTMLElement, layerClass: string) {
    this.element = element;
    const initial = element.textContent?.trim() ?? '';
    element.textContent = '';
    element.classList.add('fade');

    this.layers = [this.createLayer(layerClass), this.createLayer(layerClass)];
    this.layers.forEach((layer) => element.appendChild(layer));

    const first = this.activeLayer();
    first.textContent = initial;
    first.classList.add(CURRENT_CLASS);
  }

  get text(): string {
    return this.activeLayer().textContent ?? '';
  }

  /** Cross-fade to `text`; `onEntered` fires once the new text is fully in. */
  show(text: string, onEntered?: () => void): void {
    const leaving = this.activeLayer();
    this.active = this.active === 0 ? 1 : 0;
    const entering = this.activeLayer();

    entering.textContent = text;
    this.onEntered = onEntered ?? null;

    leaving.classList.remove(CURRENT_CLASS, ENTER_CLASS);
    leaving.classList.add(LEAVE_CLASS);
    entering.classList.remove(LEAVE_CLASS);
    entering.classList.add(ENTER_CLASS, CURRENT_CLASS);
  }

  /** Replace the text without any motion. */
  set(text: string): void {
    this.onEntered = null;
    this.layers.forEach((layer) => {
      layer.classList.remove(ENTER_CLASS, LEAVE_CLASS, CURRENT_CLASS);
      layer.textContent = '';
    });
    const layer = this.activeLayer();
    layer.textContent = text;
    layer.classList.add(CURRENT_CLASS);
  }

  private activeLayer(): HTMLElement {
    return this.active === 0 ? this.layers[0] : this.layers[1];
  }

  private createLayer(layerClass: string): HTMLElement {
    const layer = document.createElement('span');
    layer.className = `fade__layer ${layerClass}`;
    layer.addEventListener('animationend', (event) => {
      if (event.target !== layer) {
        return;
      }
      if (layer.classList.contains(LEAVE_CLASS)) {
        layer.classList.remove(LEAVE_CLASS);
        layer.textContent = '';
      } else if (layer.classList.contains(ENTER_CLASS)) {
        layer.classList.remove(ENTER_CLASS);
        const callback = this.onEntered;
        this.onEntered = null;
        callback?.();
      }
    });
    return layer;
  }
}
