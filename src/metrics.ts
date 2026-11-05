/**
 * The statistics the teaser cycles through, and how to render their values.
 */

export interface Metric {
  /** Question shown below the visual; `{entity}` is replaced by the bold entity. */
  readonly claim: string;
  /** The emphasised part of the claim, e.g. "curves". */
  readonly entity: string;
  /** Unit label next to the number; empty for plain counts. */
  readonly unit: string;
  /** Range random idle values are drawn from. */
  readonly min: number;
  readonly max: number;
  /** Decimal places, default 0. */
  readonly decimals?: number;
}

export const DEFAULT_METRIC: Metric = {
  claim: 'Ready to explore your {entity}?',
  entity: 'kilometres',
  unit: 'km',
  min: 100,
  max: 50000,
};

/** 2168 → "2.168", 0.7 → "0.7" (thousands dot, decimal dot as in the design). */
export const formatValue = (value: number, decimals = 0): string => {
  const [integer = '0', fraction] = value.toFixed(decimals).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction ? `${grouped}.${fraction}` : grouped;
};

/** Builds the claim with the entity wrapped in <strong>. */
export const renderClaim = (metric: Metric): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  const [before = '', after = ''] = metric.claim.split('{entity}');
  fragment.appendChild(document.createTextNode(before));
  const strong = document.createElement('strong');
  strong.textContent = metric.entity;
  fragment.appendChild(strong);
  fragment.appendChild(document.createTextNode(after));
  return fragment;
};

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

/**
 * Value the count-up starts from: a bit below `value`, but with the same
 * number of characters when formatted, so the digits never jump in width.
 */
export const countUpStart = (value: number, decimals = 0): number => {
  const targetLength = formatValue(value, decimals).length;
  let start = Number((value * 0.85).toFixed(decimals));
  for (let i = 0; i < 8 && formatValue(start, decimals).length !== targetLength; i += 1) {
    start = Number(((start + value) / 2).toFixed(decimals));
  }
  return formatValue(start, decimals).length === targetLength ? start : value;
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
    typeof record['entity'] === 'string' &&
    typeof record['unit'] === 'string' &&
    typeof record['min'] === 'number' &&
    typeof record['max'] === 'number' &&
    (record['decimals'] === undefined || typeof record['decimals'] === 'number')
  );
};
