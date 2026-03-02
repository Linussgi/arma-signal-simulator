// ================================================================
// CHARTS
// ================================================================

import { PZ_SIZE, PM, PW, PH, FRM, TSM, N, N_FREQ } from "./constants.js";
import { poles, zeros } from "./state.js";
import { clampToRadius, computeFreqResponse } from "./calculations.js";

export function labelText(item, isPositiveConjugate) {
  if (item.im > 0.02) {
    return isPositiveConjugate
      ? `${item.re.toFixed(2)}+${item.im.toFixed(2)}j`
      : `${item.re.toFixed(2)}-${item.im.toFixed(2)}j`;
  }
  return item.re.toFixed(3);
}

// ================================================================
// POLE–ZERO PLOT
// ================================================================

export const pzSvg = d3.select("#pz-wrap").append("svg")
  .attr("width",  PZ_SIZE)
  .attr("height", PZ_SIZE)
  .style("background", "var(--surface)");

// SVG filter definitions for pole/zero glow effects
{
  const defs = pzSvg.append("defs");
  ["glow-pole", "glow-zero"].forEach((id, i) => {
    const f = defs.append("filter")
      .attr("id", id)
      .attr("x", "-50%").attr("y", "-50%")
      .attr("width", "200%").attr("height", "200%");

    f.append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", i === 0 ? "3" : "2.5")
      .attr("result", "blur");

    const m = f.append("feMerge");
    m.append("feMergeNode").attr("in", "blur");
    m.append("feMergeNode").attr("in", "SourceGraphic");
  });
}

export const pzG = pzSvg.append("g").attr("transform", `translate(${PM.l},${PM.t})`);

export const xPZ = d3.scaleLinear().domain([-1.5, 1.5]).range([0, PW]);
export const yPZ = d3.scaleLinear().domain([-1.5, 1.5]).range([PH, 0]);

// Background fill inside unit circle
pzG.append("circle")
  .attr("cx", xPZ(0)).attr("cy", yPZ(0))
  .attr("r",  xPZ(1) - xPZ(0))
  .attr("fill", "#0a1018").attr("stroke", "none");

// Grid lines
[-1, -0.5, 0, 0.5, 1].forEach(v => {
  pzG.append("line")
    .attr("x1", xPZ(v)).attr("x2", xPZ(v)).attr("y1", 0).attr("y2", PH)
    .attr("stroke", v === 0 ? "#1c2530" : "#111820")
    .attr("stroke-width", v === 0 ? 1 : 0.5);

  pzG.append("line")
    .attr("y1", yPZ(v)).attr("y2", yPZ(v)).attr("x1", 0).attr("x2", PW)
    .attr("stroke", v === 0 ? "#1c2530" : "#111820")
    .attr("stroke-width", v === 0 ? 1 : 0.5);
});

// Unit circle outline
pzG.append("circle")
  .attr("cx", xPZ(0)).attr("cy", yPZ(0))
  .attr("r",  xPZ(1) - xPZ(0))
  .attr("fill", "none").attr("stroke", "#253040")
  .attr("stroke-width", 1.3).attr("stroke-dasharray", "5,3");

// Axis labels
pzG.append("text")
  .attr("x", PW - 3).attr("y", yPZ(0) - 5)
  .attr("text-anchor", "end").attr("fill", "var(--text-dim)")
  .attr("font-size", "9px").attr("font-family", "var(--mono)")
  .text("Re");

pzG.append("text")
  .attr("x", xPZ(0) + 4).attr("y", 10)
  .attr("fill", "var(--text-dim)")
  .attr("font-size", "9px").attr("font-family", "var(--mono)")
  .text("Im");

// Tick labels
[-1, -0.5, 0.5, 1].forEach(v => {
  pzG.append("text")
    .attr("x", xPZ(v)).attr("y", yPZ(0) + 14)
    .attr("text-anchor", "middle").attr("fill", "var(--text-dim)")
    .attr("font-size", "8px").attr("font-family", "var(--mono)")
    .text(v);

  pzG.append("text")
    .attr("x", xPZ(0) - 5).attr("y", yPZ(v) + 3)
    .attr("text-anchor", "end").attr("fill", "var(--text-dim)")
    .attr("font-size", "8px").attr("font-family", "var(--mono)")
    .text(v);
});

// Container for draggable markers (appended last so it sits on top)
export const markersG = pzG.append("g").attr("class", "markers");

function poleDisplayData() {
  const data = [];
  for (const p of poles) {
    data.push({ key:`p${p.id}+`, id:p.id, re:p.re, im: p.im });
    if (Math.abs(p.im) > 1e-10)
      data.push({ key:`p${p.id}-`, id:p.id, re:p.re, im:-p.im });
  }
  return data;
}

function zeroDisplayData() {
  const data = [];
  for (const z of zeros) {
    data.push({ key:`z${z.id}+`, id:z.id, re:z.re, im: z.im });
    if (Math.abs(z.im) > 1e-10)
      data.push({ key:`z${z.id}-`, id:z.id, re:z.re, im:-z.im });
  }
  return data;
}

// Drag behaviour
function poleDrag(onDrag) {
  return d3.drag().on("drag", function(event, d) {
    const item = poles.find(p => p.id === d.id);
    if (!item) return;

    const c = clampToRadius(xPZ.invert(event.x), yPZ.invert(event.y), 1.0);
    item.re = c.re;
    item.im = Math.abs(c.im);

    onDrag();
  });
}

function zeroDrag(onDrag) {
  return d3.drag().on("drag", function(event, d) {
    const item = zeros.find(z => z.id === d.id);
    if (!item) return;

    item.re = xPZ.invert(event.x);
    item.im = Math.abs(yPZ.invert(event.y));

    onDrag();
  });
}

// Marker rendering

export function updateMarkers({ onDrag, onRemove }) {
  // Poles rendered as red crosses
  markersG.selectAll("g.pm")
    .data(poleDisplayData(), d => d.key)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "pm").style("cursor", "grab");

        g.append("circle").attr("r", 12).attr("fill", "transparent"); // hit area

        const S = 6.5;

        // glow arms
        g.append("line")
          .attr("x1", -S).attr("y1", -S).attr("x2", S).attr("y2", S)
          .attr("stroke", "var(--red)").attr("stroke-width", 6)
          .attr("opacity", 0.15).attr("stroke-linecap", "square");

        g.append("line")
          .attr("x1", -S).attr("y1", S).attr("x2", S).attr("y2", -S)
          .attr("stroke", "var(--red)").attr("stroke-width", 6)
          .attr("opacity", 0.15).attr("stroke-linecap", "square");

        // sharp arms
        g.append("line").attr("class", "arm1")
          .attr("x1", -S).attr("y1", -S).attr("x2", S).attr("y2", S)
          .attr("stroke", "var(--red)").attr("stroke-width", 2.2).attr("stroke-linecap", "square");

        g.append("line").attr("class", "arm2")
          .attr("x1", -S).attr("y1", S).attr("x2", S).attr("y2", -S)
          .attr("stroke", "var(--red)").attr("stroke-width", 2.2).attr("stroke-linecap", "square");

        g.append("text").attr("class", "vlabel")
          .attr("fill", "var(--red)").attr("font-size", "8px")
          .attr("font-family", "var(--mono)").attr("opacity", 0.85);

        g.on("contextmenu", (event, d) => {
          event.preventDefault();
          onRemove("pole", d.id);
        });

        return g;
      },
      update => update,
      exit   => exit.remove()
    )
    .each(function(d) {
      const g    = d3.select(this);
      const pole = poles.find(p => p.id === d.id);

      g.attr("transform", `translate(${xPZ(d.re)},${yPZ(d.im)})`);
      g.call(poleDrag(onDrag));

      if (pole) {
        g.select(".vlabel")
          .attr("x", 9).attr("y", d.im >= 0 ? -9 : 16)
          .text(labelText(pole, d.im >= 0));
      }
    });

  // Zeros rendered as blue circles
  markersG.selectAll("g.zm")
    .data(zeroDisplayData(), d => d.key)
    .join(
      enter => {
        const g = enter.append("g").attr("class", "zm").style("cursor", "grab");

        g.append("circle").attr("r", 12).attr("fill", "transparent"); // hit area
        g.append("circle").attr("r", 8)
          .attr("fill", "none").attr("stroke", "var(--blue)")
          .attr("stroke-width", 6).attr("opacity", 0.15);

        g.append("circle").attr("r", 6.5)
          .attr("fill", "none").attr("stroke", "var(--blue)").attr("stroke-width", 2);
          
        g.append("text").attr("class", "vlabel")
          .attr("fill", "var(--blue)").attr("font-size", "8px")
          .attr("font-family", "var(--mono)").attr("opacity", 0.85);

        g.on("contextmenu", (event, d) => {
          event.preventDefault();
          onRemove("zero", d.id);
        });

        return g;
      },
      update => update,
      exit   => exit.remove()
    )
    .each(function(d) {
      const g    = d3.select(this);
      const zero = zeros.find(z => z.id === d.id);

      g.attr("transform", `translate(${xPZ(d.re)},${yPZ(d.im)})`);
      g.call(zeroDrag(onDrag));

      if (zero) {
        g.select(".vlabel")
          .attr("x", 10).attr("y", d.im >= 0 ? -9 : 16)
          .text(labelText(zero, d.im >= 0));
      }
    });
}

// ================================================================
// FREQUENCY RESPONSE PLOT
// ================================================================

let frSvg, frG, frChartG, xFR, yFR, frPath, frGlowPath;
let frW = 0, frH = 0;

function piFormat(d) {
  const f = d / Math.PI;
  if (Math.abs(f)        < 0.01) return "0";
  if (Math.abs(f - 0.25) < 0.01) return "1/4";
  if (Math.abs(f - 0.5)  < 0.01) return "1/2";
  if (Math.abs(f - 0.75) < 0.01) return "3/4";
  if (Math.abs(f - 1)    < 0.01) return "1";
  return "";
}

export function initFR() {
  const wrap = document.getElementById("fr-wrap");
  const W = wrap.clientWidth, H = wrap.clientHeight;
  frW = W - FRM.l - FRM.r;
  frH = H - FRM.t - FRM.b;
  if (frW <= 0 || frH <= 0) return;

  d3.select("#fr-wrap").selectAll("*").remove();

  frSvg = d3.select("#fr-wrap").append("svg")
    .attr("width", W).attr("height", H)
    .style("background", "var(--surface)");

  const defs = frSvg.append("defs");

  const fg = defs.append("filter").attr("id", "fr-glow")
    .attr("x", "-10%").attr("y", "-30%").attr("width", "120%").attr("height", "160%");
  fg.append("feGaussianBlur")
    .attr("in", "SourceGraphic").attr("stdDeviation", "2.5").attr("result", "blur");
  const mg = fg.append("feMerge");
  mg.append("feMergeNode").attr("in", "blur");
  mg.append("feMergeNode").attr("in", "SourceGraphic");

  defs.append("clipPath").attr("id", "fr-clip")
    .append("rect").attr("width", frW).attr("height", frH);

  frG = frSvg.append("g").attr("transform", `translate(${FRM.l},${FRM.t})`);

  xFR = d3.scaleLinear().domain([0, Math.PI]).range([0, frW]);
  yFR = d3.scaleLinear().range([frH, 0]);

  frG.append("g").attr("class", "fr-grid");

  frG.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${frH})`)
    .call(d3.axisBottom(xFR)
      .tickValues([0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI])
      .tickFormat(piFormat).tickSize(4));

  frG.append("g").attr("class", "axis y-axis")
    .call(d3.axisLeft(yFR).ticks(4).tickSize(4));

  frG.append("text")
    .attr("x", frW / 2).attr("y", frH + 30)
    .attr("text-anchor", "middle").attr("fill", "var(--text-dim)")
    .attr("font-size", "9px").attr("font-family", "var(--mono)").attr("letter-spacing", "0.12em")
    .text("ANGULAR FREQUENCY");

  frG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -frH / 2).attr("y", -42)
    .attr("text-anchor", "middle").attr("fill", "var(--text-dim)")
    .attr("font-size", "9px").attr("font-family", "var(--mono)").attr("letter-spacing", "0.12em")
    .text("MAGNITUDE");

  frChartG = frG.append("g").attr("clip-path", "url(#fr-clip)");

  frGlowPath = frChartG.append("path")
    .attr("fill", "none").attr("stroke", "var(--yellow)")
    .attr("stroke-width", 5).attr("opacity", 0.18);

  frPath = frChartG.append("path")
    .attr("fill", "none").attr("stroke", "var(--yellow)").attr("stroke-width", 1.6);
}

export function updateFR() {
  if (!frSvg || frW <= 0) return;

  const mag  = computeFreqResponse();
  const arr  = Array.from(mag);
  const maxV = Math.max(...arr.filter(isFinite), 0.01);

  yFR.domain([0, maxV * 1.12]);
  frG.select(".y-axis").call(d3.axisLeft(yFR).ticks(4).tickSize(4));

  const gridG = frG.select(".fr-grid");
  gridG.selectAll("line").remove();
  yFR.ticks(4).forEach(v => {
    gridG.append("line")
      .attr("x1", 0).attr("x2", frW).attr("y1", yFR(v)).attr("y2", yFR(v))
      .attr("stroke", "var(--surface2)").attr("stroke-width", 0.6);
  });

  const defined = d => isFinite(d) && d < 1e4;
  const lineGen = d3.line()
    .x((_, i) => xFR(Math.PI * i / (N_FREQ - 1)))
    .y(d => yFR(d))
    .defined(defined);

  const pathD = lineGen(arr);
  frPath.attr("d", pathD);
  frGlowPath.attr("d", pathD);
}

// ================================================================
// TIME SERIES PLOT
// ================================================================

let tsSvg, tsG, tsChartG, xTS, yTS, tsPath, tsZeroLine, tsGlowPath;
let tsW = 0, tsH = 0;

export function initTS() {
  const wrap = document.getElementById("ts-wrap");
  const W = wrap.clientWidth, H = wrap.clientHeight;
  tsW = W - TSM.l - TSM.r;
  tsH = H - TSM.t - TSM.b;
  if (tsW <= 0 || tsH <= 0) return;

  d3.select("#ts-wrap").selectAll("*").remove();

  tsSvg = d3.select("#ts-wrap").append("svg")
    .attr("width", W).attr("height", H)
    .style("background", "var(--surface)");

  const defs = tsSvg.append("defs");

  const f = defs.append("filter").attr("id", "ts-glow")
    .attr("x", "-10%").attr("y", "-20%").attr("width", "120%").attr("height", "140%");
  f.append("feGaussianBlur")
    .attr("in", "SourceGraphic").attr("stdDeviation", "2.5").attr("result", "blur");
  const m = f.append("feMerge");
  m.append("feMergeNode").attr("in", "blur");
  m.append("feMergeNode").attr("in", "SourceGraphic");

  defs.append("clipPath").attr("id", "ts-clip")
    .append("rect").attr("width", tsW).attr("height", tsH);

  tsG = tsSvg.append("g").attr("transform", `translate(${TSM.l},${TSM.t})`);

  xTS = d3.scaleLinear().domain([0, N - 1]).range([0, tsW]);
  yTS = d3.scaleLinear().range([tsH, 0]);

  tsG.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${tsH})`)
    .call(d3.axisBottom(xTS).ticks(8).tickSize(4));

  tsG.append("g").attr("class", "axis y-axis")
    .call(d3.axisLeft(yTS).ticks(6).tickSize(4));

  tsG.append("text")
    .attr("x", tsW / 2).attr("y", tsH + 32)
    .attr("text-anchor", "middle").attr("fill", "var(--text-dim)")
    .attr("font-size", "9px").attr("font-family", "var(--mono)").attr("letter-spacing", "0.12em")
    .text("TIME STEP");

  tsG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -tsH / 2).attr("y", -46)
    .attr("text-anchor", "middle").attr("fill", "var(--text-dim)")
    .attr("font-size", "9px").attr("font-family", "var(--mono)").attr("letter-spacing", "0.12em")
    .text("AMPLITUDE");

  tsChartG = tsG.append("g").attr("clip-path", "url(#ts-clip)");

  tsZeroLine = tsChartG.append("line")
    .attr("x1", 0).attr("x2", tsW)
    .attr("stroke", "var(--border2)").attr("stroke-width", 0.8).attr("stroke-dasharray", "3,4");

  tsGlowPath = tsChartG.append("path")
    .attr("fill", "none").attr("stroke", "var(--green-dim)")
    .attr("stroke-width", 4).attr("opacity", 0.3);

  tsPath = tsChartG.append("path")
    .attr("fill", "none").attr("stroke", "var(--green)").attr("stroke-width", 1.4);
}

export function updateTS(output) {
  if (!tsSvg || tsW <= 0) return;

  const arr    = Array.from(output);
  const finite = arr.filter(isFinite);
  if (!finite.length) return;

  const sorted = [...finite].sort((a, b) => a - b);
  const lo  = sorted[Math.floor(sorted.length * 0.01)];
  const hi  = sorted[Math.floor(sorted.length * 0.99)];
  const pad = Math.max((hi - lo) * 0.22, 0.01);

  yTS.domain([lo - pad, hi + pad]);
  tsG.select(".y-axis").call(d3.axisLeft(yTS).ticks(6).tickSize(4));
  tsZeroLine.attr("y1", yTS(0)).attr("y2", yTS(0));

  const lineGen = d3.line()
    .x((_, i) => xTS(i)).y(d => yTS(d))
    .defined(d => isFinite(d));

  const pathD = lineGen(arr);
  tsPath.attr("d", pathD);
  tsGlowPath.attr("d", pathD);
}