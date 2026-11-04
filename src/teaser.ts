import { Counter } from './counter';

/**
 * Driving statistics teaser card.
 *
 * Cycles softly through random distances in the range a user's number could
 * fall into, until the call-to-action is clicked. Then it fades to the final
 * value from `data-value`.
 */
export class DrivingStatsTeaser {
  private readonly root: HTMLElement;
  private readonly odometer: HTMLElement;
  private readonly announce: HTMLElement | null;
  private readonly cta: HTMLButtonElement;
  private readonly counter: Counter;
  private readonly value: number;
  private readonly unit: string;
  private readonly reducedMotion: boolean;

  constructor(root: HTMLElement) {
    this.root = root;
    this.odometer = this.require('[data-odometer]');
    this.cta = this.require<HTMLButtonElement>('[data-generate]');
    this.announce = root.querySelector('[data-announce]');
    this.value = readNumber(root.dataset['value'], 0);
    this.unit = root.dataset['unit'] ?? '';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const max = readNumber(root.dataset['max'], 50000);
    this.counter = new Counter({
      home: this.value,
      min: Math.min(readNumber(root.dataset['min'], 100), max),
      max,
      holdMin: 2.4,
      holdMax: 3.6,
      format: formatNumber,
    });
    this.buildOdometer(max);
    this.cta.addEventListener('click', this.handleGenerate);

    if (this.reducedMotion) {
      this.showFinal();
      return;
    }

    this.observeVisibility();
  }

  /** Back to the idle "waiting for your numbers" state. */
  reset(): void {
    this.root.classList.remove('is-settled');
    this.cta.disabled = false;
    if (this.announce) {
      this.announce.textContent = '';
    }
    if (this.reducedMotion) {
      return;
    }
    this.counter.reset();
  }

  destroy(): void {
    this.counter.stop();
    this.cta.removeEventListener('click', this.handleGenerate);
  }

  private buildOdometer(max: number): void {
    this.odometer.appendChild(this.counter.element);
    this.reserveWidth(max);

    if (this.unit) {
      const unit = document.createElement('span');
      unit.className = 'odometer__unit';
      unit.textContent = this.unit;
      this.odometer.appendChild(unit);
    }
  }

  /** Reserve the width of the widest possible value, so the unit never moves. */
  private reserveWidth(max: number): void {
    const probe = document.createElement('span');
    probe.className = 'counter__value is-current';
    probe.style.visibility = 'hidden';
    probe.textContent = formatNumber(Math.max(max, this.value)).replace(/\d/g, '0');
    this.counter.element.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    if (width > 0) {
      this.counter.element.style.width = `${Math.ceil(width)}px`;
    }
  }

  private readonly handleGenerate = (): void => {
    if (this.root.classList.contains('is-settled') || this.cta.disabled) {
      return;
    }
    this.cta.disabled = true;

    if (this.reducedMotion) {
      this.showFinal();
      return;
    }

    this.counter.settle(() => this.finish());
  };

  private showFinal(): void {
    this.counter.snapToHome();
    this.finish();
  }

  private finish(): void {
    this.root.classList.add('is-settled');
    if (this.announce) {
      this.announce.textContent = `${formatNumber(this.value)} ${this.unit}`.trim();
    }
  }

  private observeVisibility(): void {
    if (!('IntersectionObserver' in window)) {
      this.counter.start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !this.root.classList.contains('is-settled')) {
          this.counter.start();
        } else {
          this.counter.stop();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(this.root);
  }

  private require<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`DrivingStatsTeaser: missing element "${selector}"`);
    }
    return element;
  }
}

const readNumber = (raw: string | undefined, fallback: number): number => {
  const parsed = Number((raw ?? '').replace(/\D/g, ''));
  return Number.isFinite(parsed) && raw ? parsed : fallback;
};

/** 2168 → "2.168" (German/Swiss style thousands separator). */
const formatNumber = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
