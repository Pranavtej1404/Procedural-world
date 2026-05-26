import type { Tile } from './terrainGenerator';
import { getSeededRandom } from './terrainGenerator';

function generatePOIForChunk(
  tiles: Tile[][],
  rand: () => number
): void {
  const chunkSize = tiles.length;
  const candidates: { lx: number; ly: number; score: number }[] = [];

  for (let lx = 0; lx < chunkSize; lx++) {
    for (let ly = 0; ly < chunkSize; ly++) {
      const tile = tiles[lx][ly];
      const isWater = tile.terrainType === 'deep_water' || tile.terrainType === 'water' || tile.terrainType === 'river';
      const isExtreme = tile.terrainType === 'snow';

      if (!isWater && !isExtreme) {
        let score = tile.elevation < 0.65 ? 10 : 3;
        if (tile.terrainType === 'grass' || tile.terrainType === 'forest') {
          score += 5;
        }
        candidates.push({ lx, ly, score });
      }
    }
  }

  if (candidates.length === 0) return;

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Pick one from the best 10 suitable tiles
  const poolSize = Math.min(10, candidates.length);
  const selectedIdx = Math.floor(rand() * poolSize);
  const selected = candidates[selectedIdx];

  const poiTypes: ('cottage' | 'campfire' | 'ruins' | 'obelisk')[] = ['cottage', 'campfire', 'ruins', 'obelisk'];
  const poiType = poiTypes[Math.floor(rand() * poiTypes.length)];

  tiles[selected.lx][selected.ly].structure = poiType;
}

/**
 * Procedurally generates settlements (city center keep, houses, and roads)
 * inside a chunk, based on flat, fertile, and water-proximate land.
 */
export function generateSettlementsForChunk(
  tiles: Tile[][],
  seed: string,
  chunkX: number,
  chunkY: number
): void {
  const chunkSize = tiles.length;
  if (chunkSize === 0) return;

  // 1. Establish deterministic eligibility based on seed + chunk coords
  const settlementSeed = `${seed}_settlement_${chunkX}_${chunkY}`;
  const rand = getSeededRandom(settlementSeed);

  // 20% probability of spawning a settlement in this chunk
  if (rand() > 0.20) {
    const poiSeed = `${seed}_poi_${chunkX}_${chunkY}`;
    const poiRand = getSeededRandom(poiSeed);
    if (poiRand() < 0.06) {
      generatePOIForChunk(tiles, poiRand);
    }
    return;
  }

  // 2. Scan tiles and score suitability
  const suitabilityGrid: number[][] = Array(chunkSize)
    .fill(null)
    .map(() => Array(chunkSize).fill(0));

  interface Candidate {
    lx: number;
    ly: number;
    score: number;
  }

  const candidates: Candidate[] = [];

  for (let lx = 0; lx < chunkSize; lx++) {
    for (let ly = 0; ly < chunkSize; ly++) {
      const tile = tiles[lx][ly];
      
      // Exclude water bodies, mountains, and snowy peaks
      const isWater = tile.terrainType === 'deep_water' || tile.terrainType === 'water' || tile.terrainType === 'river';
      const isExtreme = tile.terrainType === 'mountain' || tile.terrainType === 'snow';
      
      if (isWater || isExtreme) {
        suitabilityGrid[lx][ly] = 0;
        continue;
      }

      // Base score: 10 points for flat, fertile land (grass or forest biomes with low elevation)
      const isFlatFertile = (tile.terrainType === 'grass' || tile.terrainType === 'forest') && tile.elevation < 0.72;
      let score = isFlatFertile ? 10 : 3; // Deserts or beaches get less base score

      // Water proximity bonus: Scan 5x5 neighborhood around the tile (radius = 2)
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const nlx = lx + dx;
          const nly = ly + dy;
          if (nlx >= 0 && nlx < chunkSize && nly >= 0 && nly < chunkSize) {
            const nTile = tiles[nlx][nly];
            if (nTile.terrainType === 'water' || nTile.terrainType === 'deep_water' || nTile.terrainType === 'river') {
              // Proximity bonus: adjacent water is +3, distant is +1
              const dist = Math.max(Math.abs(dx), Math.abs(dy));
              score += dist === 1 ? 3 : 1;
            }
          }
        }
      }

      suitabilityGrid[lx][ly] = score;

      // Filter as candidate if score is high enough (requires water neighbors & fertile land)
      if (score >= 10 && isFlatFertile) {
        candidates.push({ lx, ly, score });
      }
    }
  }

  // 3. Spawning Gate: require at least 4 suitable tiles to form a viable city
  if (candidates.length < 4) return;

  // 4. Select the single absolute best candidate as the City Center
  // Sort candidates by score descending, then by distance to center of chunk for aesthetics
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const distA = Math.pow(a.lx - 8, 2) + Math.pow(a.ly - 8, 2);
    const distB = Math.pow(b.lx - 8, 2) + Math.pow(b.ly - 8, 2);
    return distA - distB; // Prefer coordinates closer to the chunk center
  });

  const cityCenter = candidates[0];
  const { lx: ccx, ly: ccy } = cityCenter;
  tiles[ccx][ccy].structure = 'city_center';
  tiles[ccx][ccy].district = 'military';

  // 5. Gather potential house candidates (within 1 to 4 distance from city center)
  const houseCandidates: Candidate[] = candidates.slice(1).filter((c) => {
    const dist = Math.abs(c.lx - ccx) + Math.abs(c.ly - ccy); // Manhattan distance
    return dist >= 2 && dist <= 4;
  });

  if (houseCandidates.length === 0) return;

  // Determine number of houses to spawn: 3 to 7 houses
  const numHouses = Math.min(
    houseCandidates.length,
    3 + Math.floor(rand() * 5)
  );

  const spawnedHouses: { lx: number; ly: number }[] = [];

  for (let i = 0; i < numHouses; i++) {
    // Pick house candidate, avoiding placing adjacent to each other for nicer scattering
    let bestIdx = 0;
    let maxSpacing = -1;

    for (let j = 0; j < houseCandidates.length; j++) {
      const hc = houseCandidates[j];
      // Compute spacing from already placed houses
      let minSpacing = 999;
      spawnedHouses.forEach((sh) => {
        const d = Math.abs(hc.lx - sh.lx) + Math.abs(hc.ly - sh.ly);
        if (d < minSpacing) minSpacing = d;
      });

      if (minSpacing > maxSpacing) {
        maxSpacing = minSpacing;
        bestIdx = j;
      }
    }

    const selectedHouse = houseCandidates.splice(bestIdx, 1)[0];
    tiles[selectedHouse.lx][selectedHouse.ly].structure = 'house';
    
    // Assign district deterministically based on house order
    let district: 'commercial' | 'industrial' | 'residential' = 'residential';
    if (i === 0) district = 'commercial';
    else if (i === 1) district = 'industrial';
    
    tiles[selectedHouse.lx][selectedHouse.ly].district = district;
    spawnedHouses.push({ lx: selectedHouse.lx, ly: selectedHouse.ly });
  }

  // 6. Connect each house to the City Center with organic road pathing
  spawnedHouses.forEach((house) => {
    let currX = house.lx;
    let currY = house.ly;

    // Simple L-shaped pathing towards the City Center
    while (currX !== ccx || currY !== ccy) {
      // Step closer to City Center
      const dx = ccx - currX;
      const dy = ccy - currY;

      if (Math.abs(dx) > Math.abs(dy)) {
        currX += Math.sign(dx);
      } else {
        currY += Math.sign(dy);
      }

      // Check boundaries and only pave roads on dry land tiles
      if (currX >= 0 && currX < chunkSize && currY >= 0 && currY < chunkSize) {
        const t = tiles[currX][currY];
        const isCenterOrHouse = (currX === ccx && currY === ccy) || (currX === house.lx && currY === house.ly);
        
        // Pave roads only if it's not the house/center itself, and not deep ocean or river
        if (!isCenterOrHouse && t.terrainType !== 'deep_water' && t.terrainType !== 'water' && t.terrainType !== 'river') {
          t.hasRoad = true;
        }
      }
    }
  });
}
