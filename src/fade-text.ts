/**
 * Text that cross-fades between values.
 *
 * Two stacked layers share one grid cell and alternate: the current content
 * drifts up and blurs out while the next one rises in from below.
 */

const ENTER_CLASS = 'is-entering';
const LEAVE_CLASS = 'is-leaving';
const CURRENT_CLASS = 'is-current';

export type FadeContent = string | Node;

export class FadeText {
  readonly element: HTMLElement;

  private readonly layers: [HTMLElement, HTMLElement];
  private active = 0;
  private onEntered: (() => void) | null = null;

  /** Turns `element` into a fade container; its existing children become the first value. */
  constructor(element: HTMLElement, layerClass: string) {
    this.element = element;
    const initial = Array.from(element.childNodes);
    element.textContent = '';
    element.classList.add('fade');

    this.layers = [this.createLayer(layerClass), this.createLayer(layerClass)];
    this.layers.forEach((layer) => element.appendChild(layer));

    const first = this.activeLayer();
    initial.forEach((node) => first.appendChild(node));
    first.classList.add(CURRENT_CLASS);
  }

  get text(): string {
    return this.activeLayer().textContent ?? '';
  }

  /** Cross-fade to `content`; `onEntered` fires once the new content is fully in. */
  show(content: FadeContent, onEntered?: () => void): void {
    const leaving = this.activeLayer();
    this.active = this.active === 0 ? 1 : 0;
    const entering = this.activeLayer();

    fill(entering, content);
    this.onEntered = onEntered ?? null;

    leaving.classList.remove(CURRENT_CLASS, ENTER_CLASS);
    leaving.classList.add(LEAVE_CLASS);
    entering.classList.remove(LEAVE_CLASS);
    entering.classList.add(ENTER_CLASS, CURRENT_CLASS);
  }

  /** Replace the text of the current layer in place (used while counting up). */
  updateCurrent(text: string): void {
    this.activeLayer().textContent = text;
  }

  /** Replace the content without any motion. */
  set(content: FadeContent): void {
    this.onEntered = null;
    this.layers.forEach((layer) => {
      layer.classList.remove(ENTER_CLASS, LEAVE_CLASS, CURRENT_CLASS);
      layer.textContent = '';
    });
    const layer = this.activeLayer();
    fill(layer, content);
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

const fill = (layer: HTMLElement, content: FadeContent): void => {
  layer.textContent = '';
  if (typeof content === 'string') {
    layer.textContent = content;
  } else {
    layer.appendChild(content);
  }
};
