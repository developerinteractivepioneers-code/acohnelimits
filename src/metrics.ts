/**
 * The statistics the teaser cycles through, and how to render their values.
 */

export interface Metric {
  /** Question shown below the visual, e.g. "Ready to explore your curves?" */
  readonly claim: string;
  /** Unit label next to the number; empty for plain counts. */
  readonly unit: string;
  /** Range random idle values are drawn from. */
  readonly min: number;
  readonly max: number;
  /** Decimal places, default 0. */
  readonly decimals?: number;
}

export const DEFAULT_METRIC: Metric = {
  claim: 'Ready to explore your kilometres?',
  unit: 'km',
  min: 100,
  max: 50000,
};

/** 2168 → "2.168", 0.8 → "0,8" (German/Swiss style separators). */
export const formatValue = (value: number, decimals = 0): string => {
  const [integer = '0', fraction] = value.toFixed(decimals).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction ? `${grouped},${fraction}` : grouped;
};

/** Widest string a metric can produce, for reserving layout width. */
export const widestValue = (metric: Metric): string =>
  formatValue(metric.max, metric.decimals).replace(/\d/g, '0');

/**
 * Log-uniform pick between min and max, so three-, four- and five-digit
 * values show up about equally often instead of mostly five-digit ones.
 */
export const randomValue = (metric: Metric): number => {
  const decimals = metric.decimals ?? 0;
  const min = Math.max(metric.min, Math.pow(10, -decimals));
  const max = Math.max(metric.max, min);
  const picked = Math.exp(Math.log(min) + Math.random() * (Math.log(max) - Math.log(min)));
  return Number(picked.toFixed(decimals));
};

/** Parses the JSON metric list embedded in the teaser markup. */
export const parseMetrics = (root: HTMLElement): Metric[] => {
  const script = root.querySelector<HTMLScriptElement>('script[data-metrics]');
  if (!script) {
    return [DEFAULT_METRIC];
  }
  try {
    const parsed: unknown = JSON.parse(script.textContent ?? '');
    if (!Array.isArray(parsed)) {
      return [DEFAULT_METRIC];
    }
    const metrics = parsed.filter(isMetric);
    return metrics.length > 0 ? metrics : [DEFAULT_METRIC];
  } catch {
    return [DEFAULT_METRIC];
  }
};

const isMetric = (candidate: unknown): candidate is Metric => {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const record = candidate as Record<string, unknown>;
  return (
    typeof record['claim'] === 'string' &&
    typeof record['unit'] === 'string' &&
    typeof record['min'] === 'number' &&
    typeof record['max'] === 'number' &&
    (record['decimals'] === undefined || typeof record['decimals'] === 'number')
  );
};
