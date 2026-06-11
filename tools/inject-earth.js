#!/usr/bin/env node
/* Splice the generated earth SVG content into index.html, replacing the
 * existing hero__planet <svg>...</svg> block. */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const earthPath = path.join(__dirname, 'earth.svg');

const html = fs.readFileSync(indexPath, 'utf8');
const earth = fs.readFileSync(earthPath, 'utf8').trim();

// indent the generated content to match the file
const indented = earth.split('\n').map((l) => l.length ? '        ' + l : l).join('\n');

const newBlock = `<svg class="hero__planet" viewBox="-72 -72 144 144" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="earth-grad" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stop-color="rgba(80, 200, 240, 0.32)" />
            <stop offset="55%" stop-color="rgba(11, 11, 30, 0.0)" />
            <stop offset="100%" stop-color="rgba(168, 85, 247, 0.18)" />
          </radialGradient>
          <clipPath id="earth-clip">
            <circle cx="0" cy="0" r="56" />
          </clipPath>
        </defs>
        <circle class="hero__planet-sphere" cx="0" cy="0" r="56" />
${indented}
        <circle class="hero__planet-sphere-outline" cx="0" cy="0" r="56" />
      </svg>`;

const startMarker = '<svg class="hero__planet"';
const endMarker = '</svg>';
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) { console.error('start marker not found'); process.exit(1); }
const endIdx = html.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('end marker not found'); process.exit(1); }
const endTagEnd = endIdx + endMarker.length;

const before = html.slice(0, startIdx);
const after = html.slice(endTagEnd);
const next = before + newBlock + after;

fs.writeFileSync(indexPath, next);
console.error(`Replaced ${endTagEnd - startIdx} bytes with ${newBlock.length} bytes`);
