/**
 * Soft cross-fading number.
 *
 * Two stacked layers alternate: the current value drifts up and blurs out
 * while the next one drifts in from below. While idle a new random value from
 * `[min, max]` is picked after every hold; `settle()` fades to the final value
 * and stops.
 */

export interface CounterOptions {
  /** Final value. */
  readonly home: number;
  /** Range the idle value is drawn from. */
  readonly min: number;
  readonly max: number;
  /** Seconds a value stays before the next transition (randomised in between). */
  readonly holdMin: number;
  readonly holdMax: number;
  /** Formats a value for display. */
  readonly format: (value: number) => string;
}

type CounterMode = 'idle' | 'settling' | 'settled';

const ENTER_CLASS = 'is-entering';
const LEAVE_CLASS = 'is-leaving';

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

export class Counter {
  readonly element: HTMLElement;

  private readonly layers: [HTMLElement, HTMLElement];
  private readonly options: CounterOptions;

  private mode: CounterMode = 'idle';
  private active = 0;
  private current: number;
  private timer = 0;
  private running = false;
  private onSettled: (() => void) | null = null;

  constructor(options: CounterOptions) {
    this.options = options;
    this.current = this.randomValue();

    this.element = document.createElement('span');
    this.element.className = 'counter';

    this.layers = [this.createLayer(), this.createLayer()];
    this.layers.forEach((layer) => this.element.appendChild(layer));

    const first = this.activeLayer();
    first.textContent = options.format(this.current);
    first.classList.add('is-current');
  }

  get isSettled(): boolean {
    return this.mode === 'settled';
  }

  /** Begin cycling through random values. */
  start(): void {
    if (this.running || this.mode !== 'idle') {
      return;
    }
    this.running = true;
    this.scheduleNext();
  }

  /** Pause cycling, keeping the current value on screen. */
  stop(): void {
    this.running = false;
    window.clearTimeout(this.timer);
  }

  /** Fade to the final value, then call `onSettled`. */
  settle(onSettled: () => void): void {
    if (this.mode !== 'idle') {
      return;
    }
    this.stop();
    this.mode = 'settling';
    this.onSettled = onSettled;
    this.transitionTo(this.options.home);
  }

  /** Show the final value without motion (reduced motion). */
  snapToHome(): void {
    this.stop();
    this.mode = 'settled';
    this.current = this.options.home;
    this.layers.forEach((layer) => {
      layer.classList.remove(ENTER_CLASS, LEAVE_CLASS, 'is-current');
      layer.textContent = '';
    });
    const layer = this.activeLayer();
    layer.textContent = this.options.format(this.current);
    layer.classList.add('is-current');
  }

  /** Back to idle cycling. */
  reset(): void {
    this.stop();
    this.mode = 'idle';
    this.onSettled = null;
    this.start();
  }

  private activeLayer(): HTMLElement {
    return this.active === 0 ? this.layers[0] : this.layers[1];
  }

  private createLayer(): HTMLElement {
    const layer = document.createElement('span');
    layer.className = 'counter__value';
    layer.addEventListener('animationend', (event) => {
      if (event.target !== layer) {
        return;
      }
      if (layer.classList.contains(LEAVE_CLASS)) {
        layer.classList.remove(LEAVE_CLASS);
        layer.textContent = '';
      } else if (layer.classList.contains(ENTER_CLASS)) {
        layer.classList.remove(ENTER_CLASS);
        if (this.mode === 'settling') {
          this.mode = 'settled';
          this.onSettled?.();
        }
      }
    });
    return layer;
  }

  private scheduleNext(): void {
    const { holdMin, holdMax } = this.options;
    this.timer = window.setTimeout(() => {
      if (!this.running) {
        return;
      }
      this.transitionTo(this.randomValue());
      this.scheduleNext();
    }, randomBetween(holdMin, holdMax) * 1000);
  }

  private transitionTo(value: number): void {
    const leaving = this.activeLayer();
    this.active = this.active === 0 ? 1 : 0;
    const entering = this.activeLayer();

    this.current = value;
    entering.textContent = this.options.format(value);

    leaving.classList.remove('is-current', ENTER_CLASS);
    leaving.classList.add(LEAVE_CLASS);
    entering.classList.remove(LEAVE_CLASS);
    entering.classList.add(ENTER_CLASS, 'is-current');
  }

  /**
   * Log-uniform pick between min and max, so three-, four- and five-digit
   * values show up about equally often instead of mostly five-digit ones.
   */
  private randomValue(): number {
    const { min, max } = this.options;
    const value = Math.exp(randomBetween(Math.log(min), Math.log(max)));
    const picked = Math.round(value);
    // Avoid showing the same number twice in a row.
    return picked === this.current ? Math.min(max, picked + 1) : picked;
  }
}
