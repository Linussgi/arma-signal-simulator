// ================================================================
// EVENTS AND UPDATES
// ================================================================

import { MAX_PAIRS, POLE_DEFAULTS, ZERO_DEFAULTS, N } from "./constants.js";
import {
  poles, zeros,
  nextPoleId, nextZeroId,
  impulseMode, noiseSeed,
  gaussNoise,
  setPoles, setZeros,
  setNextPoleId, setNextZeroId,
  setImpulseMode, setNoise, setNoiseSeed,
} from "./state.js";
import { expandRoots, computeOutput } from "./calculations.js";
import {
  pzSvg,
  labelText,
  updateMarkers,
  initFR, updateFR,
  initTS, updateTS,
} from "./charts.js";

// UI Updates

function updateBadges() {
  const pb = document.getElementById("pole-badges");
  pb.innerHTML = "";
  poles.forEach(p => {
    const b = document.createElement("span");
    b.className   = "badge pole";
    b.title       = "Click to remove";
    b.textContent = labelText(p, true);
    b.addEventListener("click", () => { setPoles(poles.filter(x => x.id !== p.id)); refresh(); });
    pb.appendChild(b);
  });

  const zb = document.getElementById("zero-badges");
  zb.innerHTML = "";
  zeros.forEach(z => {
    const b = document.createElement("span");
    b.className   = "badge zero";
    b.title       = "Click to remove";
    b.textContent = labelText(z, true);
    b.addEventListener("click", () => { setZeros(zeros.filter(x => x.id !== z.id)); refresh(); });
    zb.appendChild(b);
  });
}

function updateButtons() {
  document.getElementById("btn-add-pole").disabled = poles.length >= MAX_PAIRS;
  document.getElementById("btn-add-zero").disabled = zeros.length >= MAX_PAIRS;
}

function updateStatus() {
  const arOrder = expandRoots(poles).length;
  const maOrder = expandRoots(zeros).length;
  document.getElementById("ar-ord").textContent = arOrder;
  document.getElementById("ma-ord").textContent = maOrder;
}

function updateModeLabel() {
  const q = expandRoots(zeros).length;
  document.getElementById("ts-mode-label").textContent = impulseMode
    ? ` impulse response - ${q + 1} delta train`
    : " ARMA-filtered white noise";
}

// Pole zero updates

// Skips button state, used on every drag 
function updateAll() {
  updateMarkers({ onDrag: updateAll, onRemove: handleRemove });
  updateBadges();
  updateStatus();
  updateModeLabel();
  updateFR();
  updateTS(computeOutput());
}

// Full re-render: includes button state, used after add/remove
function refresh() {
  updateMarkers({ onDrag: updateAll, onRemove: handleRemove });
  updateBadges();
  updateButtons();
  updateStatus();
  updateModeLabel();
  updateFR();
  updateTS(computeOutput());
}

function handleRemove(kind, id) {
  if (kind === "pole") setPoles(poles.filter(p => p.id !== id));
  if (kind === "zero") setZeros(zeros.filter(z => z.id !== id));
  refresh();
}

// Helpers

function addPole() {
  if (poles.length >= MAX_PAIRS) return;
  const pos = POLE_DEFAULTS[poles.length % POLE_DEFAULTS.length];
  setPoles([...poles, { id: nextPoleId, re: pos.re, im: pos.im }]);
  setNextPoleId(nextPoleId + 1);
  refresh();
}

function addZero() {
  if (zeros.length >= MAX_PAIRS) return;
  const pos = ZERO_DEFAULTS[zeros.length % ZERO_DEFAULTS.length];
  setZeros([...zeros, { id: nextZeroId, re: pos.re, im: pos.im }]);
  setNextZeroId(nextZeroId + 1);
  refresh();
}

// ================================================================
// EVENT LISTENERS
// ================================================================

document.getElementById("btn-add-pole").addEventListener("click", addPole);
document.getElementById("btn-add-zero").addEventListener("click", addZero);

const btnReseed  = document.getElementById("btn-reseed");
const btnImpulse = document.getElementById("btn-impulse");

btnReseed.addEventListener("click", () => {
  setNoiseSeed(Math.floor(Math.random() * 999999));
  setNoise(gaussNoise(N, noiseSeed));
  updateTS(computeOutput());
});

btnImpulse.addEventListener("click", () => {
  setImpulseMode(!impulseMode);
  btnImpulse.classList.toggle("active", impulseMode);
  btnReseed.disabled = impulseMode;
  updateModeLabel();
  updateTS(computeOutput());
});

// Setup

initTS();
initFR();
refresh();

window.addEventListener("resize", () => {
  initTS();
  initFR();
  refresh();
});