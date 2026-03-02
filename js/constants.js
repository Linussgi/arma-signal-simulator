// ================================================================
// CONSTANTS
// ================================================================

// Signal parameters (time series and frequnecy response)
export const MAX_PAIRS = 4;
export const N = 500;
export const N_FREQ = 512;

// Pole-zero plot geometry
export const PZ_SIZE = 440;
export const PM = { t:22, r:22, b:32, l:42 };
export const PW = PZ_SIZE - PM.l - PM.r;
export const PH = PZ_SIZE - PM.t - PM.b;

// Frequency response margins
export const FRM = { t:14, r:18, b:36, l:52 };

// Time series margins
export const TSM = { t:18, r:20, b:38, l:56 };

// Default positions for newly added pole/zero pairs
export const POLE_DEFAULTS = [
  { re: 0.55, im: 0.55 },
  { re:-0.50, im: 0.60 },
  { re: 0.70, im: 0.20 },
  { re:-0.30, im: 0.35 },
];

export const ZERO_DEFAULTS = [
  { re:-0.45, im: 0.38 },
  { re: 0.50, im: 0.65 },
  { re:-0.60, im: 0.20 },
  { re: 0.25, im: 0.70 },
];