import type { Tile } from './terrainGenerator';
import { getSeededRandom, getTileTerrainAt } from './terrainGenerator';
import type { TerrainType } from '../../core/world/terrain';

export interface RoadNode {
  x: number; // absolute wx
  y: number; // absolute wy
  type: 'city' | 'village' | 'poi';
  structure: 'city_center' | 'cottage' | 'campfire' | 'ruins' | 'obelisk';
}

interface Point {
  x: number;
  y: number;
}

/**
 * Deterministically finds the settlement Keep or POI coordinate inside chunk (nx, ny).
 * This runs seed-identical spawner math to guarantee consistency across laziness.
 */
export function getNodeInChunk(nx: number, ny: number, seed: string, chunkSize: number = 16): RoadNode | null {
  const settlementSeed = `${seed}_settlement_${nx}_${ny}`;
  const rand = getSeededRandom(settlementSeed);
  
  const hasSettlement = rand() <= 0.12;
  
  // We need to evaluate chunk terrain
  const chunkTiles: { terrainType: TerrainType; elevation: number }[][] = [];
  for (let lx = 0; lx < chunkSize; lx++) {
    chunkTiles[lx] = [];
    for (let ly = 0; ly < chunkSize; ly++) {
      const wx = nx * chunkSize + lx;
      const wy = ny * chunkSize + ly;
      const { terrainType, elevation } = getTileTerrainAt(wx, wy, seed);
      chunkTiles[lx][ly] = { terrainType, elevation };
    }
  }

  if (hasSettlement) {
    const candidates: { lx: number; ly: number; score: number }[] = [];
    for (let lx = 0; lx < chunkSize; lx++) {
      for (let ly = 0; ly < chunkSize; ly++) {
        const tile = chunkTiles[lx][ly];
        const isWater = tile.terrainType === 'deep_water' || tile.terrainType === 'water' || tile.terrainType === 'river';
        const isExtreme = tile.terrainType === 'mountain' || tile.terrainType === 'snow';
        if (isWater || isExtreme) continue;

        const isFlatFertile = (tile.terrainType === 'grass' || tile.terrainType === 'forest') && tile.elevation < 0.58;
        let score = isFlatFertile ? 10 : 3;

        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const nlx = lx + dx;
            const nly = ly + dy;
            if (nlx >= 0 && nlx < chunkSize && nly >= 0 && nly < chunkSize) {
              const nTile = chunkTiles[nlx][nly];
              if (nTile.terrainType === 'water' || nTile.terrainType === 'deep_water' || nTile.terrainType === 'river') {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                score += dist === 1 ? 3 : 1;
              }
            }
          }
        }
        if (score >= 12 && isFlatFertile) {
          candidates.push({ lx, ly, score });
        }
      }
    }

    if (candidates.length < 6) return null;

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const distA = Math.pow(a.lx - 8, 2) + Math.pow(a.ly - 8, 2);
      const distB = Math.pow(b.lx - 8, 2) + Math.pow(b.ly - 8, 2);
      return distA - distB;
    });

    const cc = candidates[0];
    const ccwX = nx * chunkSize + cc.lx;
    const ccwY = ny * chunkSize + cc.ly;

    const houseCandidates = candidates.slice(1).filter((c) => {
      const dist = Math.abs(c.lx - cc.lx) + Math.abs(c.ly - cc.ly);
      return dist >= 2 && dist <= 4;
    });
    const numHouses = Math.min(houseCandidates.length, 3 + Math.floor(rand() * 5));

    return {
      x: ccwX,
      y: ccwY,
      type: numHouses >= 5 ? 'city' : 'village',
      structure: 'city_center',
    };
  } else {
    // Check for POI eligibility
    const poiSeed = `${seed}_poi_${nx}_${ny}`;
    const poiRand = getSeededRandom(poiSeed);
    if (poiRand() < 0.06) {
      const candidates: { lx: number; ly: number; score: number }[] = [];
      for (let lx = 0; lx < chunkSize; lx++) {
        for (let ly = 0; ly < chunkSize; ly++) {
          const tile = chunkTiles[lx][ly];
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

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => b.score - a.score);
      const poolSize = Math.min(10, candidates.length);
      const selectedIdx = Math.floor(poiRand() * poolSize);
      const selected = candidates[selectedIdx];

      const poiTypes: ('cottage' | 'campfire' | 'ruins' | 'obelisk')[] = ['cottage', 'campfire', 'ruins', 'obelisk'];
      const poiType = poiTypes[Math.floor(poiRand() * poiTypes.length)];

      return {
        x: nx * chunkSize + selected.lx,
        y: ny * chunkSize + selected.ly,
        type: 'poi',
        structure: poiType,
      };
    }
  }
  return null;
}

/**
 * Returns travel weight for A* coordinates. Encourages bridging river crossings
 * and skirting high peaks.
 */
function getMovementCost(wx: number, wy: number, seed: string): number {
  const { terrainType } = getTileTerrainAt(wx, wy, seed);
  switch (terrainType) {
    case 'grass':
      return 1.0;
    case 'forest':
      return 2.0;
    case 'beach':
      return 2.0;
    case 'desert':
      return 5.0;
    case 'mountain':
      return 8.0;
    case 'snow':
      return 12.0;
    case 'river':
      return 15.0; // Paves wooden bridges
    case 'water':
      return 35.0; // Marshland pathing
    case 'deep_water':
      return 250.0; // Strictly avoids oceans
    default:
      return 1.0;
  }
}

/**
 * Performs a seed-stable, terrain-weighted A* search.
 */
function findAStarPath(start: Point, end: Point, seed: string): Point[] {
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  
  const startKey = `${start.x},${start.y}`;
  gScore.set(startKey, 0);
  fScore.set(startKey, Math.abs(start.x - end.x) + Math.abs(start.y - end.y));
  
  const openSet: Point[] = [start];
  
  // Set generous bounding limits to allow sweeping paths
  const minX = Math.min(start.x, end.x) - 24;
  const maxX = Math.max(start.x, end.x) + 24;
  const minY = Math.min(start.y, end.y) - 24;
  const maxY = Math.max(start.y, end.y) + 24;
  
  let iterations = 0;
  
  while (openSet.length > 0) {
    iterations++;
    if (iterations > 3000) break; // safeguard
    
    let currentIdx = 0;
    let lowestF = fScore.get(`${openSet[0].x},${openSet[0].y}`) ?? Infinity;
    for (let i = 1; i < openSet.length; i++) {
      const f = fScore.get(`${openSet[i].x},${openSet[i].y}`) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentIdx = i;
      }
    }
    
    const current = openSet[currentIdx];
    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [current];
      let currKey = `${current.x},${current.y}`;
      while (cameFrom.has(currKey)) {
        const parentStr = cameFrom.get(currKey)!;
        const [px, py] = parentStr.split(',').map(Number);
        const parent = { x: px, y: py };
        path.unshift(parent);
        currKey = parentStr;
      }
      return path;
    }
    
    openSet.splice(currentIdx, 1);
    const currentKey = `${current.x},${current.y}`;
    const currentG = gScore.get(currentKey) ?? Infinity;
    
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    
    for (const neighbor of neighbors) {
      if (neighbor.x < minX || neighbor.x > maxX || neighbor.y < minY || neighbor.y > maxY) {
        continue;
      }
      
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      const terrainCost = getMovementCost(neighbor.x, neighbor.y, seed);
      const tentativeG = currentG + terrainCost;
      
      const neighborG = gScore.get(neighborKey) ?? Infinity;
      if (tentativeG < neighborG) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        
        const h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
        fScore.set(neighborKey, tentativeG + h);
        
        if (!openSet.some((p) => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  return [];
}

/**
 * Checks straight line of sight to bypass jagged block steps.
 */
function hasLineOfSight(a: Point, b: Point, seed: string): boolean {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  
  let currX = a.x;
  let currY = a.y;
  
  while (true) {
    const { terrainType, elevation } = getTileTerrainAt(currX, currY, seed);
    // Shortcut cannot jump over deep ocean, deep waters, or steep mountain ranges
    if (terrainType === 'deep_water' || terrainType === 'water' || elevation > 0.65) {
      return false;
    }
    
    if (currX === b.x && currY === b.y) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
  
  return true;
}

function getGridLine(a: Point, b: Point): Point[] {
  const line: Point[] = [];
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  
  let currX = a.x;
  let currY = a.y;
  
  while (true) {
    line.push({ x: currX, y: currY });
    if (currX === b.x && currY === b.y) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
  
  return line;
}

/**
 * Path smoothing via line-of-sight shortcutting.
 */
function smoothPath(path: Point[], seed: string): Point[] {
  if (path.length <= 2) return path;
  
  const smoothed: Point[] = [path[0]];
  let i = 0;
  
  while (i < path.length - 1) {
    let furthestClearIdx = i + 1;
    // Scan ahead up to 10 nodes
    for (let j = i + 2; j < path.length; j++) {
      if (j - i > 10) break;
      if (hasLineOfSight(path[i], path[j], seed)) {
        furthestClearIdx = j;
      } else {
        break;
      }
    }
    
    const p1 = path[i];
    const p2 = path[furthestClearIdx];
    
    const segment = getGridLine(p1, p2);
    for (let k = 1; k < segment.length; k++) {
      smoothed.push(segment[k]);
    }
    
    i = furthestClearIdx;
  }
  
  return smoothed;
}

/**
 * High-level hook. Scans the local neighborhood and overlays global highways onto the chunk.
 */
export function generateGlobalRoadsForChunk(
  tiles: Tile[][],
  seed: string,
  chunkX: number,
  chunkY: number,
  chunkSize: number = 16
): void {
  // 1. Gather all nodes in a 7x7 neighborhood of chunks
  const nodes: RoadNode[] = [];
  const radius = 3;
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const nx = chunkX + dx;
      const ny = chunkY + dy;
      const node = getNodeInChunk(nx, ny, seed, chunkSize);
      if (node) {
        nodes.push(node);
      }
    }
  }

  if (nodes.length <= 1) return;

  // 2. Build edges using K-Nearest neighbors (K = 2) within a maximum tile distance
  const maxTileDist = 56; // 3.5 chunks max length to prevent giant path calculations
  const edges: { nodeA: RoadNode; nodeB: RoadNode }[] = [];
  const edgeHashes = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    
    // Sort all other nodes by distance
    const candidates: { node: RoadNode; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nodeB = nodes[j];
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= maxTileDist) {
        candidates.push({ node: nodeB, dist });
      }
    }

    candidates.sort((a, b) => a.dist - b.dist);
    const K = Math.min(2, candidates.length);
    for (let k = 0; k < K; k++) {
      const nodeB = candidates[k].node;
      
      // Settle deterministic ordering of names to avoid duplicates
      const hash = nodeA.x < nodeB.x || (nodeA.x === nodeB.x && nodeA.y < nodeB.y)
        ? `${nodeA.x},${nodeA.y}_${nodeB.x},${nodeB.y}`
        : `${nodeB.x},${nodeB.y}_${nodeA.x},${nodeA.y}`;

      if (!edgeHashes.has(hash)) {
        edgeHashes.add(hash);
        edges.push({ nodeA, nodeB });
      }
    }
  }

  // 3. Trace and smooth paths. Project coordinates onto the active chunk.
  edges.forEach(({ nodeA, nodeB }) => {
    const start = { x: nodeA.x, y: nodeA.y };
    const end = { x: nodeB.x, y: nodeB.y };
    
    const rawPath = findAStarPath(start, end, seed);
    if (rawPath.length === 0) return;

    const smoothed = smoothPath(rawPath, seed);

    // Apply road flags to any coordinate that falls within this chunk
    smoothed.forEach((pt) => {
      const ptChunkX = Math.floor(pt.x / chunkSize);
      const ptChunkY = Math.floor(pt.y / chunkSize);
      
      if (ptChunkX === chunkX && ptChunkY === chunkY) {
        let lx = pt.x % chunkSize;
        let ly = pt.y % chunkSize;
        if (lx < 0) lx += chunkSize;
        if (ly < 0) ly += chunkSize;
        
        const tile = tiles[lx]?.[ly];
        if (tile) {
          tile.hasRoad = true;
          tile.roadType = 'highway';
        }
      }
    });
  });
}
