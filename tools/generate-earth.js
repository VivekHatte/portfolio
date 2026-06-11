#!/usr/bin/env node
/*
 * Reads Natural Earth 110m land coastlines (geojson) and outputs an
 * orthographic-projected SVG fragment (continents + graticule + equator +
 * SF pin) ready to paste into index.html.
 *
 * Centered on North America so SF sits naturally in the upper-left quadrant
 * with a bit of South America visible below and the right edge sliding into
 * Africa/Europe.
 *
 * Usage:  node tools/generate-earth.js > tools/earth.svg
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'ne_110m_land.geojson');
const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

const CENTER_LON = -95;
const CENTER_LAT = 20;
const R = 56;
const DEC = 1;

const phi0 = CENTER_LAT * Math.PI / 180;
const sinPhi0 = Math.sin(phi0);
const cosPhi0 = Math.cos(phi0);

function project(lon, lat) {
  const lambda = (lon - CENTER_LON) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const cosLambda = Math.cos(lambda);
  const sinLambda = Math.sin(lambda);
  const visible = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosLambda >= -0.0001;
  const x = R * cosPhi * sinLambda;
  const y = -R * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosLambda);
  return { x, y, visible };
}

function ringToPath(coords) {
  let out = '';
  let pen = false;
  for (const [lon, lat] of coords) {
    const p = project(lon, lat);
    if (!p.visible) { pen = false; continue; }
    const x = p.x.toFixed(DEC);
    const y = p.y.toFixed(DEC);
    if (!pen) { out += `M${x} ${y}`; pen = true; }
    else { out += `L${x} ${y}`; }
  }
  return out;
}

function sampleArc(samples, fn) {
  let out = '';
  let pen = false;
  for (let i = 0; i < samples.length; i++) {
    const p = fn(samples[i]);
    if (!p.visible) { pen = false; continue; }
    const x = p.x.toFixed(DEC);
    const y = p.y.toFixed(DEC);
    if (!pen) { out += `M${x} ${y}`; pen = true; }
    else { out += `L${x} ${y}`; }
  }
  return out;
}

// ---- continents ----
const landPaths = [];
for (const feature of data.features) {
  const g = feature.geometry;
  const rings = g.type === 'Polygon' ? g.coordinates
    : g.type === 'MultiPolygon' ? [].concat(...g.coordinates)
    : [];
  for (const ring of rings) {
    const p = ringToPath(ring);
    if (p) landPaths.push(p);
  }
}

// ---- graticule ----
const grat = [];
// parallels (lat lines) every 30°, excluding poles
for (let lat = -60; lat <= 60; lat += 30) {
  const samples = [];
  for (let lon = -180; lon <= 180; lon += 2) samples.push(lon);
  grat.push(sampleArc(samples, (lon) => project(lon, lat)));
}
// meridians (lng lines) every 30°
for (let lon = -180; lon <= 150; lon += 30) {
  const samples = [];
  for (let lat = -85; lat <= 85; lat += 2) samples.push(lat);
  grat.push(sampleArc(samples, (lat) => project(lon, lat)));
}

// ---- equator (slightly bolder) ----
const eqSamples = [];
for (let lon = -180; lon <= 180; lon += 1) eqSamples.push(lon);
const equator = sampleArc(eqSamples, (lon) => project(lon, 0));

// ---- central meridian (slightly bolder; passes vertically through the disc) ----
const cmSamples = [];
for (let lat = -85; lat <= 85; lat += 1) cmSamples.push(lat);
const centralMeridian = sampleArc(cmSamples, (lat) => project(CENTER_LON, lat));

// ---- SF ----
const SF = project(-122.4194, 37.7749);

// ---- output ----
let svg = '';
svg += `<!-- generated from Natural Earth 110m, center=(${CENTER_LON}, ${CENTER_LAT}), R=${R} -->\n`;
svg += `<g class="hero__planet-grid" clip-path="url(#earth-clip)">\n`;
for (const p of grat) if (p) svg += `  <path d="${p}" />\n`;
svg += `</g>\n`;
svg += `<path class="hero__planet-meridian-major" d="${equator}" />\n`;
svg += `<path class="hero__planet-meridian-major" d="${centralMeridian}" />\n`;
svg += `<g class="hero__planet-land" clip-path="url(#earth-clip)">\n`;
for (const p of landPaths) svg += `  <path d="${p}" />\n`;
svg += `</g>\n`;
svg += `<!-- SF marker at projected (${SF.x.toFixed(2)}, ${SF.y.toFixed(2)}) -->\n`;
svg += `<g class="hero__ping" transform="translate(${SF.x.toFixed(2)} ${SF.y.toFixed(2)})">\n`;
svg += `  <circle class="hero__ping-ring" cx="0" cy="0" r="2.4" />\n`;
svg += `  <circle class="hero__ping-ring hero__ping-ring--2" cx="0" cy="0" r="2.4" />\n`;
svg += `  <circle class="hero__ping-ring hero__ping-ring--3" cx="0" cy="0" r="2.4" />\n`;
svg += `  <line class="hero__ping-label-line" x1="0" y1="0" x2="-3" y2="-7" />\n`;
svg += `  <text class="hero__ping-label" x="-4" y="-8" text-anchor="end">SFO 37.77 / -122.42</text>\n`;
svg += `  <circle class="hero__ping-dot" cx="0" cy="0" r="1.6" />\n`;
svg += `</g>\n`;

process.stdout.write(svg);
console.error(`continents: ${landPaths.length}, graticule arcs: ${grat.filter(Boolean).length}`);
console.error(`SF projected: (${SF.x.toFixed(2)}, ${SF.y.toFixed(2)})`);
console.error(`bytes: ${svg.length}`);
