const fs = require('fs');
const { PNG } = require('pngjs');

const data = fs.readFileSync('public/hill_textures.png');
const png = PNG.sync.read(data);
const width = png.width;
const height = png.height;

const bgR = png.data[0];
const bgG = png.data[1];
const bgB = png.data[2];

function isBg(x, y) {
  const idx = (y * width + x) * 4;
  const r = png.data[idx];
  const g = png.data[idx+1];
  const b = png.data[idx+2];
  return Math.abs(r - bgR) < 15 && Math.abs(g - bgG) < 15 && Math.abs(b - bgB) < 15;
}

// Let's scan the middle grid (Grid 2) between x = 320 and x = 700, y = 200 and y = 450
// Let's print out the column positions that have vertical grid lines or spaces
const grid2XStart = 320;
const grid2XEnd = 700;
const grid2YStart = 200;
const grid2YEnd = 450;

console.log('Scanning Grid 2 Columns for Dividers:');
for (let x = grid2XStart; x < grid2XEnd; x++) {
  let bgCount = 0;
  for (let y = grid2YStart; y < grid2YEnd; y++) {
    if (isBg(x, y)) bgCount++;
  }
  const pct = bgCount / (grid2YEnd - grid2YStart);
  if (pct > 0.95) {
    console.log(`  Col ${x}: ${Math.round(pct * 100)}% background`);
  }
}

console.log('Scanning Grid 2 Rows for Dividers:');
for (let y = grid2YStart; y < grid2YEnd; y++) {
  let bgCount = 0;
  for (let x = grid2XStart; x < grid2XEnd; x++) {
    if (isBg(x, y)) bgCount++;
  }
  const pct = bgCount / (grid2XEnd - grid2XStart);
  if (pct > 0.95) {
    console.log(`  Row ${y}: ${Math.round(pct * 100)}% background`);
  }
}
