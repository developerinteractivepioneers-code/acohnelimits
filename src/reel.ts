/**
 * Odometer reel that scrolls the whole number as one unit.
 *
 * The reel shows a window of consecutive values (…, 2167, 2168, 2169, …)
 * stacked vertically and moves them with a damped spring. While idle it keeps
 * re-targeting a random value around the final number, so the number swings
 * up and down without ever settling. When asked to settle it eases onto the
 * final value and stops.
 */

export type ReelMode = 'idle' | 'settling' | 'settled';

export interface ReelOptions {
  /** Final value. */
  readonly home: number;
  /** Max distance the value wanders from `home` while idle. */
  readonly wander: number;
  /** Min/max seconds between picking a new idle target. */
  readonly retargetMin: number;
  readonly retargetMax: number;
  /** Formats a value for display (thousands separators etc.). */
  readonly format: (value: number) => string;
}

interface Spring {
  readonly stiffness: number;
  readonly damping: number;
}

/** Rows rendered above and below the current one. */
const ROWS_AROUND = 3;

/** Bouncy: overshoots, so the number visibly runs past and comes back. */
const IDLE_SPRING: Spring = { stiffness: 11, damping: 0.4 };
/** Firm: lands with a small overshoot and stops. */
const SETTLE_SPRING: Spring = { stiffness: 36, damping: 0.85 };

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

export class Reel {
  readonly element: HTMLElement;

  private readonly strip: HTMLElement;
  private readonly rows: HTMLElement[] = [];
  private readonly options: ReelOptions;

  private mode: ReelMode = 'idle';
  private position: number;
  private velocity = 0;
  private target: number;
  private untilRetarget = 0;
  private renderedCenter = Number.NaN;

  constructor(options: ReelOptions) {
    this.options = options;
    this.position = this.randomIdleValue();
    this.target = this.position;

    this.element = document.createElement('span');
    this.element.className = 'reel';

    this.strip = document.createElement('span');
    this.strip.className = 'reel__strip';

    for (let i = 0; i < ROWS_AROUND * 2 + 1; i += 1) {
      const row = document.createElement('span');
      row.className = 'reel__row';
      this.rows.push(row);
      this.strip.appendChild(row);
    }

    this.element.appendChild(this.strip);
    this.render();
  }

  get isSettled(): boolean {
    return this.mode === 'settled';
  }

  /** Ease onto the final value. */
  settle(): void {
    if (this.mode !== 'idle') {
      return;
    }
    this.mode = 'settling';
    this.target = this.options.home;
  }

  /** Jump straight to the final value without motion (reduced motion). */
  snapToHome(): void {
    this.mode = 'settled';
    this.position = this.options.home;
    this.velocity = 0;
    this.target = this.position;
    this.render();
  }

  /** Return to the idle wandering state. */
  reset(): void {
    this.mode = 'idle';
    this.velocity = 0;
    this.position = this.randomIdleValue();
    this.target = this.position;
    this.untilRetarget = 0;
    this.render();
  }

  /** Advance the simulation by `dt` seconds. */
  update(dt: number): void {
    switch (this.mode) {
      case 'idle':
        this.updateIdle(dt);
        break;
      case 'settling':
        this.updateSettling(dt);
        break;
      case 'settled':
        return;
    }
    this.render();
  }

  private randomIdleValue(): number {
    const { home, wander } = this.options;
    return Math.max(0, home + randomBetween(-wander, wander));
  }

  private updateIdle(dt: number): void {
    this.untilRetarget -= dt;
    if (this.untilRetarget <= 0) {
      this.target = this.randomIdleValue();
      this.untilRetarget = randomBetween(this.options.retargetMin, this.options.retargetMax);
    }
    this.integrate(IDLE_SPRING, dt);
  }

  private updateSettling(dt: number): void {
    this.integrate(SETTLE_SPRING, dt);

    const atRest = Math.abs(this.velocity) < 0.01 && Math.abs(this.target - this.position) < 0.004;
    if (atRest) {
      this.position = this.target;
      this.velocity = 0;
      this.mode = 'settled';
    }
  }

  /** Semi-implicit Euler step of a damped spring towards `target`. */
  private integrate(spring: Spring, dt: number): void {
    const omega = Math.sqrt(spring.stiffness);
    const acceleration =
      spring.stiffness * (this.target - this.position) - 2 * spring.damping * omega * this.velocity;
    this.velocity += acceleration * dt;
    this.position += this.velocity * dt;
  }

  private render(): void {
    const center = Math.floor(this.position);
    const fraction = this.position - center;

    if (center !== this.renderedCenter) {
      this.renderedCenter = center;
      this.rows.forEach((row, index) => {
        const value = center + index - ROWS_AROUND;
        row.textContent = value < 0 ? '' : this.options.format(value);
      });
    }

    // Row `ROWS_AROUND` sits in the window; higher values are stacked above it.
    this.strip.style.transform = `translateY(${-(ROWS_AROUND + fraction)}em)`;
  }
}
