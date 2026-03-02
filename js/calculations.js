// ================================================================
// CALCULATIONS
// ================================================================

import { N, N_FREQ } from "./constants.js";
import { poles, zeros, noise, impulseMode } from "./state.js";

// Expand each user-facing pair {re, im} into both conjugate roots
export function expandRoots(items) {
  const roots = [];
  for (const item of items) {
    roots.push({ re: item.re, im: item.im });
    if (Math.abs(item.im) > 1e-10)
      roots.push({ re: item.re, im: -item.im });
  }
  return roots;
}

// Build monic polynomial from a list of roots
// Returns real coefficients in ascending power order [c0, c1, ..., cn]
export function polyFromRoots(roots) {
  let poly = [{ re:1, im:0 }];

  for (const r of roots) {
    const np = Array.from({ length: poly.length + 1 }, () => ({ re:0, im:0 }));
    for (let i = 0; i < poly.length; i++) {
      np[i+1].re += poly[i].re;
      np[i+1].im += poly[i].im;
      np[i].re -= r.re * poly[i].re - r.im * poly[i].im;
      np[i].im -= r.re * poly[i].im + r.im * poly[i].re;
    }
    poly = np;
  }

  return poly.map(c => c.re);
}

// Direct Form II ARMA difference equation
export function armaFilter(arDesc, maDesc, input) {
  const n = input.length;
  const p = arDesc.length - 1;
  const q = maDesc.length - 1;
  const y = new Float64Array(n);
  const CLIP = 1e6;

  for (let t = 0; t < n; t++) {
    let v = 0;

    for (let k = 0; k <= q && k <= t; k++) v += maDesc[k] * input[t - k];
    for (let k = 1; k <= p && k <= t; k++) v -= arDesc[k] * y[t - k];

    y[t] = Math.max(-CLIP, Math.min(CLIP, v));
  }

  return y;
}

// Build a impulse train of (q + 1) unit impulses
export function makeImpulseTrain() {
  const q = expandRoots(zeros).length;
  const numImpulses = q + 1;
  const spacing = Math.max(60, Math.floor((N - 1) / numImpulses));
  const signal = new Array(N).fill(0);

  for (let k = 0; k < numImpulses; k++) {
    const idx = k * spacing;

    if (idx < N) signal[idx] = 1.0;
  }
  return signal;
}

// Run the full ARMA filter for the current poles, zeros, and input mode
export function computeOutput() {
  const allPoles = expandRoots(poles);
  const allZeros = expandRoots(zeros);
  const arDesc = allPoles.length > 0 ? [...polyFromRoots(allPoles)].reverse() : [1];
  const maDesc = allZeros.length > 0 ? [...polyFromRoots(allZeros)].reverse() : [1];
  const input = impulseMode ? makeImpulseTrain() : noise;

  return armaFilter(arDesc, maDesc, input);
}

// Frequency magnitude response (z transform evaluated at e^{j \omega})
export function computeFreqResponse() {
  const allPoles = expandRoots(poles);
  const allZeros = expandRoots(zeros);
  const result = new Float64Array(N_FREQ);

  for (let i = 0; i < N_FREQ; i++) {
    const omega = Math.PI * i / (N_FREQ - 1);
    const eRe = Math.cos(omega);
    const eIm = Math.sin(omega);
    let num = 1, den = 1;

    for (const z of allZeros) {
      const dr = eRe - z.re, di = eIm - z.im;
      num *= Math.sqrt(dr * dr + di * di);
    }

    for (const p of allPoles) {
      const dr = eRe - p.re, di = eIm - p.im;
      const d = Math.sqrt(dr * dr + di * di);
      den *= d < 1e-8 ? 1e8 : d;
    }

    result[i] = Math.min(den < 1e-30 ? 1e6 : num / den, 1e4);
  }

  return result;
}

// Clamp (re, im) so the point lies within a circle of radius maxR
export function clampToRadius(re, im, maxR) {
  const r = Math.sqrt(re*re + im*im);
  
  if (r > maxR) { const s = maxR / r; return { re: re*s, im: im*s }; }
  return { re, im };
}