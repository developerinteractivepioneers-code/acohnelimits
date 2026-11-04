import { Reel, type ReelOptions } from './reel';

/**
 * Driving statistics teaser card.
 *
 * Builds one odometer reel per digit of `data-value`, keeps them wandering
 * until the call-to-action is clicked, then lets them spin to the final
 * number from left to right.
 */
export class DrivingStatsTeaser {
  private readonly root: HTMLElement;
  private readonly odometer: HTMLElement;
  private readonly announce: HTMLElement | null;
  private readonly cta: HTMLButtonElement;
  private readonly reels: Reel[] = [];
  private readonly value: string;
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
    this.value = root.dataset['value'] ?? '0';
    this.unit = root.dataset['unit'] ?? '';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    this.reels.forEach((reel) => reel.reset());
    this.start();
  }

  destroy(): void {
    this.stop();
    this.cta.removeEventListener('click', this.handleGenerate);
  }

  private buildOdometer(): void {
    const digits = this.value.replace(/\D/g, '');
    const count = digits.length;

    Array.from(digits).forEach((char, index) => {
      // Leading digits wander little and slowly, trailing ones more and faster.
      const options: ReelOptions = {
        home: Number(char),
        wander: Math.min(1.2 + index * 1.6, 7),
        retargetMin: Math.max(0.45, 1.6 - index * 0.3),
        retargetMax: Math.max(0.9, 2.8 - index * 0.4),
        spins: index,
      };
      const reel = new Reel(options);
      this.reels.push(reel);
      this.odometer.appendChild(reel.element);

      const positionFromRight = count - index;
      if (positionFromRight > 1 && positionFromRight % 3 === 1) {
        const separator = document.createElement('span');
        separator.className = 'odometer__separator';
        separator.textContent = '.';
        this.odometer.appendChild(separator);
      }
    });

    if (this.unit) {
      const unit = document.createElement('span');
      unit.className = 'odometer__unit';
      unit.textContent = this.unit;
      this.odometer.appendChild(unit);
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

    this.reels.forEach((reel, index) => reel.settle(index * 0.22));
    this.start();
  };

  private showFinal(): void {
    this.reels.forEach((reel) => reel.snapToHome());
    this.finish();
  }

  private finish(): void {
    this.stop();
    this.root.classList.add('is-settled');
    if (this.announce) {
      this.announce.textContent = `${this.formattedValue()} ${this.unit}`.trim();
    }
  }

  private formattedValue(): string {
    return this.value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

    this.reels.forEach((reel) => reel.update(dt));

    if (this.reels.every((reel) => reel.isSettled)) {
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
