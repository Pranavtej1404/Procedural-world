import { createNoise2D } from 'simplex-noise';
import { getBiomeType } from '../../core/world/terrain';
import type { TerrainType } from '../../core/world/terrain';
import { generateSettlementsForChunk } from './settlementGenerator';
import { generateGlobalRoadsForChunk } from './roadGenerator';

export interface Tile {
  x: number;
  y: number;
  height: number; // elevation fallback
  elevation: number;
  moisture: number;
  temperature: number;
  terrainType: TerrainType;
  baseTerrainType: TerrainType;
  structure?: 'cottage' | 'campfire' | 'city_center' | 'house' | 'ruins' | 'obelisk' | 'tavern' | 'farm';
  district?: 'residential' | 'commercial' | 'industrial' | 'military';
  hasRoad?: boolean;
  roadType?: 'highway' | 'local';
}

// FNV-1a hash + LCG/Mulberry32-like generator for reproducible seeds
export function getSeededRandom(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function() {
    h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Map cache for multiple active seeds
const noiseCache = new Map<string, (x: number, y: number) => number>();

export function getNoise2DForSeed(seed: string): (x: number, y: number) => number {
  if (noiseCache.has(seed)) {
    return noiseCache.get(seed)!;
  }
  const prng = getSeededRandom(seed);
  const noise2D = createNoise2D(prng);
  noiseCache.set(seed, noise2D);
  return noise2D;
}

export function getTileTerrainAt(
  wx: number,
  wy: number,
  seed: string,
  options: Partial<Omit<ChunkGeneratorOptions, 'chunkX' | 'chunkY'>> = {}
): { terrainType: TerrainType; elevation: number; baseTerrainType: TerrainType } {
  const octaves = options.octaves ?? 4;
  const persistence = options.persistence ?? 0.5;
  const lacunarity = options.lacunarity ?? 2.0;
  const scale = options.scale ?? 64.0;
  const redistribution = options.redistribution ?? 1.3;
  const applyIslandMask = options.applyIslandMask ?? 'single';
  const islandRadius = options.islandRadius ?? 64;

  const elevationNoise = getNoise2DForSeed(seed);
  const moistureNoise = getNoise2DForSeed(seed + '-moisture');
  const temperatureNoise = getNoise2DForSeed(seed + '-temperature');
  const archipelagoNoise = getNoise2DForSeed(seed + '-archipelago');
  const riverNoise = getNoise2DForSeed(seed + '-river');
  const lakeNoise = getNoise2DForSeed(seed + '-lake');

  let elevationVal = 0;
  let moistureVal = 0;
  let temperatureVal = 0;

  let amplitude = 1.0;
  let frequency = 1.0;
  let maxAmplitude = 0;

  for (let o = 0; o < octaves; o++) {
    const nx = (wx / scale) * frequency;
    const ny = (wy / scale) * frequency;
    
    elevationVal += elevationNoise(nx, ny) * amplitude;
    moistureVal += moistureNoise(nx, ny) * amplitude;
    temperatureVal += temperatureNoise(nx, ny) * amplitude;

    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  let elevation = (elevationVal / maxAmplitude + 1) / 2;
  let moisture = (moistureVal / maxAmplitude + 1) / 2;
  let temperature = (temperatureVal / maxAmplitude + 1) / 2;

  elevation = Math.pow(elevation, redistribution);

  if (elevation > 0.43) {
    const altitudeCooling = (elevation - 0.43) * 0.6;
    temperature = Math.max(0, temperature - altitudeCooling);
  }

  if (applyIslandMask === 'archipelago') {
    let maskValVal = 0;
    let amp = 1.0;
    let freq = 1.0;
    let maxAmp = 0;
    for (let o = 0; o < 2; o++) {
      const nx = (wx / (scale * 3.5)) * freq;
      const ny = (wy / (scale * 3.5)) * freq;
      maskValVal += archipelagoNoise(nx, ny) * amp;
      maxAmp += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    const maskVal = (maskValVal / maxAmp + 1) / 2;
    const archMask = Math.min(1, Math.max(0, (maskVal - 0.46) / 0.14));
    elevation *= archMask;
  } else if (applyIslandMask === 'single') {
    const distance = Math.sqrt(wx * wx + wy * wy);
    const normDistance = Math.min(1, distance / islandRadius);
    const mask = 1 - Math.pow(normDistance, 2.5);
    elevation *= mask;
  }

  const rVal = riverNoise(wx / 32, wy / 32);
  const lVal = (lakeNoise(wx / 96, wy / 96) + 1) / 2;
  const catchmentVal = (riverNoise(wx / 200, wy / 200) + 1) / 2;
  const riverGating = Math.max(0, Math.min(1, (catchmentVal * 1.6) * (1.2 - Math.abs(elevation - 0.55))));

  const baseTRiver = 0.05 * Math.max(0, Math.min(1, (0.85 - elevation) / 0.45));
  const tRiver = baseTRiver * riverGating;

  const pRiver = Math.max(0, Math.min(1, 1 - Math.abs(rVal) / (tRiver * 2.5 + 0.01))) * riverGating;
  const pLake = Math.max(0, Math.min(1, (lVal - 0.55) / 0.09));
  const pWater = Math.max(pRiver, pLake);
  moisture = Math.min(1, moisture + pWater * 0.40);

  const biome = getBiomeType(elevation, moisture, temperature);
  let terrainType = biome.type;
  const baseTerrainType = terrainType;

  let isLake = false;
  if (lVal > 0.64 && elevation >= 0.38 && elevation < 0.65) {
    elevation = 0.34;
    isLake = true;
    terrainType = 'river';
  }

  if (!isLake && Math.abs(rVal) < tRiver && elevation >= 0.38) {
    elevation = 0.32 + 0.04 * Math.pow(Math.abs(rVal) / (tRiver + 0.001), 2);
    terrainType = 'river';
  }

  return { terrainType, elevation, baseTerrainType };
}

export interface ChunkGeneratorOptions {
  chunkX: number;
  chunkY: number;
  chunkSize: number;
  seed: string;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  scale?: number; // Base frequency scale
  redistribution?: number; // Power value to flatten valleys
  applyIslandMask?: 'none' | 'single' | 'archipelago';
  islandRadius?: number; // Radius in tiles
}

export function generateChunk(options: ChunkGeneratorOptions): Tile[][] {
  const {
    chunkX,
    chunkY,
    chunkSize,
    seed,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.0,
    scale = 64.0,
    redistribution = 1.3,
    applyIslandMask = 'single',
    islandRadius = 64,
  } = options;

  // Initialize distinct seedable noise generators
  const elevationNoise = getNoise2DForSeed(seed);
  const moistureNoise = getNoise2DForSeed(seed + '-moisture');
  const temperatureNoise = getNoise2DForSeed(seed + '-temperature');
  const archipelagoNoise = getNoise2DForSeed(seed + '-archipelago');
  const riverNoise = getNoise2DForSeed(seed + '-river');
  const lakeNoise = getNoise2DForSeed(seed + '-lake');

  const grid: Tile[][] = [];

  for (let lx = 0; lx < chunkSize; lx++) {
    grid[lx] = [];
    for (let ly = 0; ly < chunkSize; ly++) {
      const wx = chunkX * chunkSize + lx;
      const wy = chunkY * chunkSize + ly;

      let elevationVal = 0;
      let moistureVal = 0;
      let temperatureVal = 0;

      let amplitude = 1.0;
      let frequency = 1.0;
      let maxAmplitude = 0;

      // Layered Octaves of Simplex Noise for all three layers
      for (let o = 0; o < octaves; o++) {
        const nx = (wx / scale) * frequency;
        const ny = (wy / scale) * frequency;
        
        elevationVal += elevationNoise(nx, ny) * amplitude;
        moistureVal += moistureNoise(nx, ny) * amplitude;
        temperatureVal += temperatureNoise(nx, ny) * amplitude;

        maxAmplitude += amplitude;

        amplitude *= persistence;
        frequency *= lacunarity;
      }

      // Normalize noise to [0, 1] range
      let elevation = (elevationVal / maxAmplitude + 1) / 2;
      let moisture = (moistureVal / maxAmplitude + 1) / 2;
      let temperature = (temperatureVal / maxAmplitude + 1) / 2;

      // Apply redistribution (power curve) to elevation to flatten valleys
      elevation = Math.pow(elevation, redistribution);

      // Physical temperature lapse rate: altitude cooling effect
      // Higher elevations are colder, creating snowy peaks dynamically
      if (elevation > 0.43) {
        const altitudeCooling = (elevation - 0.43) * 0.6;
        temperature = Math.max(0, temperature - altitudeCooling);
      }

      // Apply layout masking to shape the landmasses
      if (applyIslandMask === 'archipelago') {
        let maskValVal = 0;
        let amp = 1.0;
        let freq = 1.0;
        let maxAmp = 0;
        for (let o = 0; o < 2; o++) {
          const nx = (wx / (scale * 3.5)) * freq;
          const ny = (wy / (scale * 3.5)) * freq;
          maskValVal += archipelagoNoise(nx, ny) * amp;
          maxAmp += amp;
          amp *= 0.5;
          freq *= 2.0;
        }
        const maskVal = (maskValVal / maxAmp + 1) / 2;
        const archMask = Math.min(1, Math.max(0, (maskVal - 0.46) / 0.14));
        elevation *= archMask;
      } else if (applyIslandMask === 'single') {
        const distance = Math.sqrt(wx * wx + wy * wy);
        const normDistance = Math.min(1, distance / islandRadius);
        const mask = 1 - Math.pow(normDistance, 2.5);
        elevation *= mask;
      }

      // 1. Calculate River and Lake noises
      const rVal = riverNoise(wx / 32, wy / 32);
      const lVal = (lakeNoise(wx / 96, wy / 96) + 1) / 2;
      const catchmentVal = (riverNoise(wx / 200, wy / 200) + 1) / 2;
      const riverGating = Math.max(0, Math.min(1, (catchmentVal * 1.6) * (1.2 - Math.abs(elevation - 0.55))));

      const baseTRiver = 0.05 * Math.max(0, Math.min(1, (0.85 - elevation) / 0.45));
      const tRiver = baseTRiver * riverGating;

      // 2. Moisture Enrichment along riverbanks and lake shores (Riparian zones)
      const pRiver = Math.max(0, Math.min(1, 1 - Math.abs(rVal) / (tRiver * 2.5 + 0.01))) * riverGating;
      const pLake = Math.max(0, Math.min(1, (lVal - 0.55) / 0.09));
      const pWater = Math.max(pRiver, pLake);
      moisture = Math.min(1, moisture + pWater * 0.40);

      // 3. Evaluate Base Biome Type with enriched moisture
      const biome = getBiomeType(elevation, moisture, temperature);
      let terrainType: TerrainType = biome.type;
      const baseTerrainType = terrainType;

      // 4. Carve Lake Basins (flat-bottomed in low-elevation valley depressions)
      let isLake = false;
      if (lVal > 0.64 && elevation >= 0.38 && elevation < 0.65) {
        elevation = 0.34;
        isLake = true;
        terrainType = 'river';
      }

      // 5. Carve U-Shaped Rivers (using downhill-gated channel widening)
      if (!isLake && Math.abs(rVal) < tRiver && elevation >= 0.38) {
        elevation = 0.32 + 0.04 * Math.pow(Math.abs(rVal) / (tRiver + 0.001), 2);
        terrainType = 'river';
      }

      grid[lx][ly] = {
        x: wx,
        y: wy,
        height: elevation,
        elevation,
        moisture,
        temperature,
        terrainType,
        baseTerrainType,
      };
    }
  }

  // Generate cities and structures deterministically inside the chunk
  generateSettlementsForChunk(grid, seed, chunkX, chunkY);

  // Generate global cross-chunk road network
  generateGlobalRoadsForChunk(grid, seed, chunkX, chunkY, chunkSize);

  return grid;
}
