import { FadeText } from './fade-text';
import {
  countUpStart,
  formatValue,
  parseMetrics,
  randomValue,
  renderClaim,
  type Metric,
} from './metrics';

/** Seconds a value stays before the next transition. */
const HOLD_SECONDS = 2;
/** Below this number width (px) the two tall streaks fade out. */
const NARROW_NUMBER_WIDTH = 65;

/**
 * Driving statistics teaser card.
 *
 * Cycles through the configured metrics: for each one a random value, its
 * unit and its claim cross-fade in together while the number counts up to
 * its value. Clicking the call-to-action fades to the final value from
 * `data-value` (first metric) and stops.
 */
export class DrivingStatsTeaser {
  private readonly root: HTMLElement;
  private readonly cta: HTMLButtonElement;
  private readonly announce: HTMLElement | null;
  private readonly number: FadeText;
  private readonly unit: FadeText;
  private readonly claim: FadeText;
  private readonly stats: HTMLElement;
  private readonly odometer: HTMLElement;
  private readonly counterBox: HTMLElement;
  private readonly unitBox: HTMLElement;
  private readonly numberProbe: HTMLElement;
  private readonly unitProbe: HTMLElement;
  private readonly metrics: Metric[];
  private readonly finalValue: number;
  private readonly reducedMotion: boolean;
  private readonly fadeSeconds: number;

  private index = 0;
  private timer = 0;
  private countFrame = 0;
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
    this.odometer = this.require('[data-odometer]');
    this.fadeSeconds = parseFloat(getComputedStyle(root).getPropertyValue('--fade-duration')) || 1;

    this.counterBox = document.createElement('span');
    this.counterBox.className = 'counter';
    this.odometer.appendChild(this.counterBox);
    this.number = new FadeText(this.counterBox, 'counter__value');
    this.numberProbe = createProbe(this.counterBox, 'counter__value');
    // The streaks live inside the number box so they always sit over the digits.
    const bars = root.querySelector('[data-bars]');
    if (bars) {
      this.counterBox.insertBefore(bars, this.counterBox.firstChild);
    }

    this.unitBox = document.createElement('span');
    this.unitBox.className = 'odometer__unit';
    this.odometer.appendChild(this.unitBox);
    this.unit = new FadeText(this.unitBox, 'odometer__unit-value');
    this.unitProbe = createProbe(this.unitBox, 'odometer__unit-value');

    this.claim = new FadeText(this.require('[data-claim]'), 'teaser__claim-value');

    this.cta.addEventListener('click', this.handleGenerate);

    if (this.reducedMotion) {
      this.showFinal();
      return;
    }

    // First layout without the width transitions, so nothing slides on load.
    this.root.classList.add('is-static');
    this.applyMetric(this.metric(), randomValue(this.metric()), false);
    void this.root.offsetWidth;
    this.root.classList.remove('is-static');

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
    cancelAnimationFrame(this.countFrame);
    this.cta.removeEventListener('click', this.handleGenerate);
  }

  private metric(): Metric {
    return this.metrics[this.index] ?? this.metrics[0] ?? parseMetrics(this.root)[0]!;
  }

  /**
   * Size the stats column, the streak area and the unit box to the given
   * number and unit. Their CSS transitions animate the change in step with
   * the cross-fade, which moves the divider and the map's clip.
   */
  private fitLayout(text: string, unit: string): void {
    this.numberProbe.textContent = text;
    this.unitProbe.textContent = unit;
    const odometerStyle = getComputedStyle(this.odometer);
    const inset = parseFloat(odometerStyle.left) || 0;
    const outset = parseFloat(odometerStyle.right) || 0;
    const unitGap = parseFloat(getComputedStyle(this.unitBox).getPropertyValue('--unit-gap-size')) || 0;
    // offsetWidth is in layout pixels and unaffected by CSS zoom, unlike client rects.
    const numberWidth = this.numberProbe.offsetWidth;
    const unitWidth = unit ? this.unitProbe.offsetWidth : 0;
    const gap = unit ? unitGap : 0;

    this.stats.style.setProperty('--stats-width', `${Math.ceil(inset + numberWidth + gap + unitWidth + outset)}px`);
    this.counterBox.style.setProperty('--number-width', `${Math.ceil(numberWidth)}px`);
    this.unitBox.style.setProperty('--unit-width', `${Math.ceil(unitWidth)}px`);
    this.unitBox.style.setProperty('--unit-gap', `${gap}px`);
    this.root.classList.toggle('is-narrow', numberWidth < NARROW_NUMBER_WIDTH);
  }

  private applyMetric(metric: Metric, value: number, animate: boolean, onDone?: () => void): void {
    const decimals = metric.decimals ?? 0;
    const text = formatValue(value, decimals);
    this.fitLayout(text, metric.unit);
    cancelAnimationFrame(this.countFrame);

    if (!animate) {
      this.number.set(text);
      this.unit.set(metric.unit);
      this.claim.set(renderClaim(metric));
      onDone?.();
      return;
    }

    this.number.show(formatValue(countUpStart(value, decimals), decimals), onDone);
    this.unit.show(metric.unit);
    this.claim.show(renderClaim(metric));
    this.countUp(countUpStart(value, decimals), value, decimals);
  }

  /** Counts the entering number from `from` to `to` over the fade duration. */
  private countUp(from: number, to: number, decimals: number): void {
    if (from === to) {
      return;
    }
    const startTime = performance.now();
    const duration = this.fadeSeconds * 1000;
    const step = (now: number): void => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.number.updateCurrent(formatValue(from + (to - from) * eased, decimals));
      if (progress < 1) {
        this.countFrame = requestAnimationFrame(step);
      }
    };
    this.countFrame = requestAnimationFrame(step);
  }

  private scheduleNext(): void {
    this.timer = window.setTimeout(() => {
      if (!this.running) {
        return;
      }
      this.index = (this.index + 1) % this.metrics.length;
      this.applyMetric(this.metric(), randomValue(this.metric()), true);
      this.scheduleNext();
    }, HOLD_SECONDS * 1000);
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
