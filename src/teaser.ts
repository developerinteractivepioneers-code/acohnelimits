import { FadeText } from './fade-text';
import { formatValue, parseMetrics, randomValue, type Metric } from './metrics';

/**
 * Driving statistics teaser card.
 *
 * Cycles through the configured metrics: for each one a random value, its
 * unit and its claim cross-fade in together. Clicking the call-to-action
 * fades to the final value from `data-value` (first metric) and stops.
 */
export class DrivingStatsTeaser {
  private readonly root: HTMLElement;
  private readonly cta: HTMLButtonElement;
  private readonly announce: HTMLElement | null;
  private readonly number: FadeText;
  private readonly unit: FadeText;
  private readonly claim: FadeText;
  private readonly stats: HTMLElement;
  private readonly numberProbe: HTMLElement;
  private readonly unitProbe: HTMLElement;
  private readonly metrics: Metric[];
  private readonly finalValue: number;
  private readonly reducedMotion: boolean;

  private readonly holdMin = 1.6;
  private readonly holdMax = 2.4;

  private index = 0;
  private timer = 0;
  private running = false;
  private settled = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.cta = this.require<HTMLButtonElement>('[data-generate]');
    this.announce = root.querySelector('[data-announce]');
    this.metrics = parseMetrics(root);
    this.finalValue = Number((root.dataset['value'] ?? '0').replace(/[^\d.]/g, '')) || 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stats = this.require('[data-stats]');
    const odometer = this.require('[data-odometer]');
    const numberBox = document.createElement('span');
    numberBox.className = 'counter';
    odometer.appendChild(numberBox);
    this.number = new FadeText(numberBox, 'counter__value');
    this.numberProbe = createProbe(numberBox, 'counter__value');

    const unitBox = document.createElement('span');
    unitBox.className = 'odometer__unit';
    odometer.appendChild(unitBox);
    this.unit = new FadeText(unitBox, 'odometer__unit-value');
    this.unitProbe = createProbe(unitBox, 'odometer__unit-value');

    this.claim = new FadeText(this.require('[data-claim]'), 'teaser__claim-value');

    this.cta.addEventListener('click', this.handleGenerate);

    if (this.reducedMotion) {
      this.showFinal();
      return;
    }

    this.applyMetric(this.metric(), randomValue(this.metric()), false);
    this.observeVisibility();
  }

  /** Back to the idle cycling state. */
  reset(): void {
    this.settled = false;
    this.root.classList.remove('is-settled');
    this.cta.disabled = false;
    if (this.announce) {
      this.announce.textContent = '';
    }
    if (!this.reducedMotion) {
      this.start();
    }
  }

  destroy(): void {
    this.stop();
    this.cta.removeEventListener('click', this.handleGenerate);
  }

  private metric(): Metric {
    return this.metrics[this.index] ?? this.metrics[0] ?? parseMetrics(this.root)[0]!;
  }

  /**
   * Size the stats column to the given number and unit. The CSS transition
   * on the column animates the change, map and divider follow.
   */
  private fitStats(text: string, unit: string): void {
    this.numberProbe.textContent = text;
    this.unitProbe.textContent = unit;
    const odometer = this.require('[data-odometer]');
    const unitBox = this.unitProbe.parentElement;
    const inset = parseFloat(getComputedStyle(odometer).left) || 0;
    const unitGap = unitBox ? parseFloat(getComputedStyle(unitBox).marginLeft) || 0 : 0;
    const numberWidth = this.numberProbe.getBoundingClientRect().width;
    const unitWidth = unit ? unitGap + this.unitProbe.getBoundingClientRect().width : 0;
    const width = inset + numberWidth + unitWidth;
    if (width > 0) {
      this.stats.style.setProperty('--stats-width', `${Math.ceil(width)}px`);
    }
  }

  private applyMetric(metric: Metric, value: number, animate: boolean, onDone?: () => void): void {
    const text = formatValue(value, metric.decimals);
    this.fitStats(text, metric.unit);
    if (!animate) {
      this.number.set(text);
      this.unit.set(metric.unit);
      this.claim.set(metric.claim);
      onDone?.();
      return;
    }
    this.number.show(text, onDone);
    this.unit.show(metric.unit);
    this.claim.show(metric.claim);
  }

  private scheduleNext(): void {
    const hold = this.holdMin + Math.random() * (this.holdMax - this.holdMin);
    this.timer = window.setTimeout(() => {
      if (!this.running) {
        return;
      }
      this.index = (this.index + 1) % this.metrics.length;
      this.applyMetric(this.metric(), randomValue(this.metric()), true);
      this.scheduleNext();
    }, hold * 1000);
  }

  private start(): void {
    if (this.running || this.settled) {
      return;
    }
    this.running = true;
    this.scheduleNext();
  }

  private stop(): void {
    this.running = false;
    window.clearTimeout(this.timer);
  }

  private readonly handleGenerate = (): void => {
    if (this.settled || this.cta.disabled) {
      return;
    }
    this.cta.disabled = true;
    this.stop();
    this.settled = true;

    if (this.reducedMotion) {
      this.showFinal();
      return;
    }
    this.index = 0;
    this.applyMetric(this.metric(), this.finalValue, true, () => this.finish());
  };

  private showFinal(): void {
    this.settled = true;
    this.index = 0;
    this.applyMetric(this.metric(), this.finalValue, false);
    this.finish();
  }

  private finish(): void {
    this.root.classList.add('is-settled');
    if (this.announce) {
      const metric = this.metric();
      this.announce.textContent = `${formatValue(this.finalValue, metric.decimals)} ${metric.unit}`.trim();
    }
  }

  private observeVisibility(): void {
    if (!('IntersectionObserver' in window)) {
      this.start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.start();
        } else {
          this.stop();
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

/** Hidden copy of a fade layer used to measure text width without affecting layout. */
const createProbe = (container: HTMLElement, layerClass: string): HTMLElement => {
  const probe = document.createElement('span');
  probe.className = `fade__probe ${layerClass}`;
  probe.setAttribute('aria-hidden', 'true');
  container.appendChild(probe);
  return probe;
};
