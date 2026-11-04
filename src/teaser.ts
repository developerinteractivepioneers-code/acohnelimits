import { Reel } from './reel';

/**
 * Driving statistics teaser card.
 *
 * Shows the number from `data-value` on an odometer reel that keeps wandering
 * until the call-to-action is clicked, then eases onto the final value.
 */
export class DrivingStatsTeaser {
  private readonly root: HTMLElement;
  private readonly odometer: HTMLElement;
  private readonly announce: HTMLElement | null;
  private readonly cta: HTMLButtonElement;
  private readonly reel: Reel;
  private readonly value: number;
  private readonly unit: string;
  private readonly reducedMotion: boolean;

  private frame = 0;
  private lastTime = 0;
  private running = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.odometer = this.require('[data-odometer]');
    this.cta = this.require<HTMLButtonElement>('[data-generate]');
    this.announce = root.querySelector('[data-announce]');
    this.value = Number((root.dataset['value'] ?? '0').replace(/\D/g, ''));
    this.unit = root.dataset['unit'] ?? '';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.reel = new Reel({
      home: this.value,
      wander: 14,
      retargetMin: 0.5,
      retargetMax: 1.4,
      format: formatNumber,
    });
    this.buildOdometer();
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
    this.reel.reset();
    this.start();
  }

  destroy(): void {
    this.stop();
    this.cta.removeEventListener('click', this.handleGenerate);
  }

  private buildOdometer(): void {
    this.odometer.appendChild(this.reel.element);
    this.reserveWidth();

    if (this.unit) {
      const unit = document.createElement('span');
      unit.className = 'odometer__unit';
      unit.textContent = this.unit;
      this.odometer.appendChild(unit);
    }
  }

  /** Reserve the width of the widest value the reel can show, so nothing reflows. */
  private reserveWidth(): void {
    const probe = document.createElement('span');
    probe.className = 'reel__row';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.textContent = formatNumber(this.value + 14).replace(/\d/g, '0');
    this.reel.element.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    if (width > 0) {
      this.reel.element.style.width = `${Math.ceil(width)}px`;
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

    this.reel.settle();
    this.start();
  };

  private showFinal(): void {
    this.reel.snapToHome();
    this.finish();
  }

  private finish(): void {
    this.stop();
    this.root.classList.add('is-settled');
    if (this.announce) {
      this.announce.textContent = `${formatNumber(this.value)} ${this.unit}`.trim();
    }
  }

  private observeVisibility(): void {
    if (!('IntersectionObserver' in window)) {
      this.start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible && !this.root.classList.contains('is-settled')) {
          this.start();
        } else {
          this.stop();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(this.root);
  }

  private start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) {
      return;
    }
    // Clamp so a backgrounded tab does not produce one giant jump on return.
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.reel.update(dt);

    if (this.reel.isSettled) {
      this.finish();
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private require<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`DrivingStatsTeaser: missing element "${selector}"`);
    }
    return element;
  }
}

/** 2168 → "2.168" (German/Swiss style thousands separator). */
const formatNumber = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
