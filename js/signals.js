import { CONFIG } from './config.js';

export function percentChange(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export function classifyMomentum(current, previous) {
  const absolute = current - previous;
  const percent = percentChange(current, previous);
  const t = CONFIG.lowBase;
  if (percent === null) return { label: 'NEW BASELINE', level: 'watch', absolute, percent };
  if (current >= t.minCurrent && absolute >= t.minAbsoluteIncrease && percent >= t.minPercentIncrease) {
    return { label: 'ACCELERATING', level: 'high', absolute, percent };
  }
  if (percent <= -30 && previous >= t.minCurrent) return { label: 'DECELERATING', level: 'low', absolute, percent };
  return { label: 'STABLE / MIXED', level: 'normal', absolute, percent };
}

function normalize(values, value) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return max > 0 ? 50 : 0;
  return ((value - min) / (max - min)) * 100;
}

export function computeHisi(countries) {
  const volumes = countries.map(c => c.reports30d || 0);
  const momenta = countries.map(c => Math.max(-100, Math.min(200, c.change7d ?? 0)));
  const sources = countries.map(c => c.uniqueSources || 0);
  const themes = countries.map(c => c.themeBreadth || 0);

  return countries.map(c => {
    const parts = {
      volume: normalize(volumes, c.reports30d || 0),
      momentum: normalize(momenta, Math.max(-100, Math.min(200, c.change7d ?? 0))),
      sourceDiversity: normalize(sources, c.uniqueSources || 0),
      themeBreadth: normalize(themes, c.themeBreadth || 0)
    };
    const w = CONFIG.hisiWeights;
    const score = Math.round(parts.volume*w.volume + parts.momentum*w.momentum + parts.sourceDiversity*w.sourceDiversity + parts.themeBreadth*w.themeBreadth);
    return { ...c, hisi: score, hisiParts: parts };
  });
}
