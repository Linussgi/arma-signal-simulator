// ================================================================
// STATE
// ================================================================

import { N } from "./constants.js";

// Pole and zero pairs. Each entry represents one conjugate pair
export let poles = [{ id:0, re: 0.55, im: 0.55 }];
export let zeros = [{ id:0, re:-0.45, im: 0.38 }];

// IDs for D3 key joins
export let nextPoleId = 1;
export let nextZeroId = 1;

// Toggle: white noise input vs impulse train input
export let impulseMode = false;

// Noise
export function gaussNoise(length, seed) {
  const source = d3.randomLcg(seed);
  const rng = d3.randomNormal.source(source)(0, 1);
  return Array.from({ length }, rng);
}

export let noiseSeed = 100;
export let noise = gaussNoise(N, noiseSeed);

export function setPoles(newPoles)     { poles = newPoles; }
export function setZeros(newZeros)     { zeros = newZeros; }
export function setNextPoleId(id)      { nextPoleId = id; }
export function setNextZeroId(id)      { nextZeroId = id; }
export function setImpulseMode(val)    { impulseMode = val; }
export function setNoise(newNoise)     { noise = newNoise; }
export function setNoiseSeed(seed)     { noiseSeed = seed; }