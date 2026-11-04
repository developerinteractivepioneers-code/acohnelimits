/**
 * A single digit reel of the odometer.
 *
 * The reel is a vertical strip of digits (0–9, repeated three times) that is
 * moved with a damped spring. While idle it keeps re-targeting a random
 * position around its final digit, so it swings up and down without ever
 * settling. When asked to settle it spins to the final digit and stops.
 */

export type ReelMode = 'idle' | 'settling' | 'settled';

export interface ReelOptions {
  /** Final digit, 0–9. */
  readonly home: number;
  /** Max distance (in digit units) the reel wanders from `home` while idle. */
  readonly wander: number;
  /** Min/max seconds between picking a new idle target. */
  readonly retargetMin: number;
  readonly retargetMax: number;
  /** Extra full turns before landing when settling. */
  readonly spins: number;
}

interface Spring {
  readonly stiffness: number;
  readonly damping: number;
}

const DIGITS_PER_COPY = 10;
const COPIES = 3;

/** Bouncy: overshoots, so the digit visibly runs past and comes back. */
const IDLE_SPRING: Spring = { stiffness: 18, damping: 0.35 };
/** Firm: lands with a small overshoot and stops. */
const SETTLE_SPRING: Spring = { stiffness: 42, damping: 0.82 };

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

export class Reel {
  readonly element: HTMLElement;

  private readonly strip: HTMLElement;
  private readonly options: ReelOptions;

  private mode: ReelMode = 'idle';
  private position: number;
  private velocity = 0;
  private target: number;
  private untilRetarget = 0;
  private settleDelay = 0;

  constructor(options: ReelOptions) {
    this.options = options;
    this.position = options.home + randomBetween(-options.wander, options.wander);
    this.target = this.position;

    this.element = document.createElement('span');
    this.element.className = 'reel';

    this.strip = document.createElement('span');
    this.strip.className = 'reel__strip';

    for (let i = 0; i < DIGITS_PER_COPY * COPIES; i += 1) {
      const digit = document.createElement('span');
      digit.className = 'reel__digit';
      digit.textContent = String(i % DIGITS_PER_COPY);
      this.strip.appendChild(digit);
    }

    this.element.appendChild(this.strip);
    this.render();
  }

  get isSettled(): boolean {
    return this.mode === 'settled';
  }

  /** Spin to the final digit after `delay` seconds. */
  settle(delay: number): void {
    if (this.mode !== 'idle') {
      return;
    }
    this.mode = 'settling';
    this.settleDelay = delay;
    this.target = this.landingPosition();
  }

  /** Jump straight to the final digit without motion (reduced motion / reset). */
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
    this.position = this.options.home + randomBetween(-this.options.wander, this.options.wander);
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

  private updateIdle(dt: number): void {
    this.untilRetarget -= dt;
    if (this.untilRetarget <= 0) {
      const { home, wander, retargetMin, retargetMax } = this.options;
      this.target = home + randomBetween(-wander, wander);
      this.untilRetarget = randomBetween(retargetMin, retargetMax);
    }
    this.integrate(IDLE_SPRING, dt);
  }

  private updateSettling(dt: number): void {
    if (this.settleDelay > 0) {
      // Keep swinging on the old target until this reel's turn comes.
      this.settleDelay -= dt;
      this.integrate(IDLE_SPRING, dt);
      return;
    }

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

  /**
   * Next position that shows the final digit, `spins` full turns ahead in
   * the current direction (or the nearest one when no spins are requested).
   */
  private landingPosition(): number {
    const { home, spins } = this.options;
    const direction = this.velocity < 0 ? -1 : 1;
    const base = this.position + direction * spins * DIGITS_PER_COPY;
    let delta = (((home - base) % DIGITS_PER_COPY) + DIGITS_PER_COPY) % DIGITS_PER_COPY;
    if (spins === 0 ? delta > DIGITS_PER_COPY / 2 : direction < 0) {
      delta -= DIGITS_PER_COPY;
    }
    return base + delta;
  }

  private render(): void {
    // Wrap into [0, 10) and show the middle copy so neighbours exist above and below.
    const wrapped = ((this.position % DIGITS_PER_COPY) + DIGITS_PER_COPY) % DIGITS_PER_COPY;
    this.strip.style.transform = `translateY(${-(wrapped + DIGITS_PER_COPY)}em)`;
  }
}
