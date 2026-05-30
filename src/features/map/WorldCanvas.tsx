import React, { useEffect, useState, useRef } from 'react';
import { Application, Container, Sprite, Texture, Graphics } from 'pixi.js';
import { useWorldStore } from '../../app/store/useWorldStore';
import { ViewportController } from '../../core/engine/ViewportController';
import { generateChunk, getTileTerrainAt } from '../generation/terrainGenerator';
import type { Tile } from '../generation/terrainGenerator';
import { getResourcesForBiome } from '../../core/world/resources';
import type { TerrainType } from '../../core/world/terrain';

const saveToLocalStorage = (key: string, dataStr: string) => {
  try {
    localStorage.setItem(key, dataStr);
    
    // Keep total pworld_chunk_ items under 400
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pworld_chunk_')) {
        keys.push(k);
      }
    }
    if (keys.length > 400) {
      const excess = keys.slice(0, keys.length - 300);
      excess.forEach(k => localStorage.removeItem(k));
      console.log(`Evicted ${excess.length} chunks from LocalStorage to keep size bounded.`);
    }
  } catch (e) {
    console.warn('LocalStorage error, clearing all chunks from other settings/seeds first...');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pworld_chunk_') && k !== key) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    try {
      localStorage.setItem(key, dataStr);
    } catch (err) {
      console.error('Could not save chunk to localStorage even after full clear:', err);
    }
  }
};

const cleanupLegacyLocalStorage = (
  currentSeed: string,
  octs: number,
  pers: number,
  lacu: number,
  nScale: number,
  redis: number,
  islandMask: string,
  iRadius: number,
  genVer: number
) => {
  try {
    const currentPrefix = `pworld_chunk_v2_${currentSeed}_${octs}_${pers}_${lacu}_${nScale}_${redis}_${islandMask}_${iRadius}_${genVer}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('pworld_chunk_') && !key.startsWith('pworld_chunk_v2_')) {
          keysToRemove.push(key);
        } else if (key.startsWith('pworld_chunk_v2_') && !key.startsWith(currentPrefix)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} stale localStorage chunks.`);
    }
  } catch (e) {
    console.error('Error cleaning legacy localStorage:', e);
  }
};

const BIOME_RGB_VALUES: Record<TerrainType, { r: number; g: number; b: number }> = {
  deep_water: { r: 30, g: 58, b: 138 },
  water: { r: 59, g: 130, b: 246 },
  beach: { r: 254, g: 240, b: 138 },
  grass: { r: 16, g: 185, b: 129 },
  forest: { r: 4, g: 120, b: 87 },
  desert: { r: 245, g: 158, b: 11 },
  hills: { r: 139, g: 94, b: 60 },
  mountain: { r: 243, g: 244, b: 246 },
  snow: { r: 255, g: 255, b: 255 },
  river: { r: 14, g: 165, b: 233 },
};

export const WorldCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<Application | null>(null);
  const viewportControllerRef = useRef<ViewportController | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const hasCenteredRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);

  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const spritesheetRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Background color at top-right (RGB 24, 22, 33)
        const bgR = 24, bgG = 22, bgB = 33;
        // Grass meadow base color in sheet (RGB 85, 122, 70)
        const meadowR = 85, meadowG = 122, meadowB = 70;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Chromakey dark background
          const isBg = Math.abs(r - bgR) < 20 && Math.abs(g - bgG) < 20 && Math.abs(b - bgB) < 20;
          if (isBg) {
            data[i + 3] = 0;
            continue;
          }

          // Chromakey the grass meadow background of the edges to transparent
          const isMeadow = Math.abs(r - meadowR) < 30 && Math.abs(g - meadowG) < 30 && Math.abs(b - meadowB) < 30;
          if (isMeadow) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        spritesheetRef.current = canvas;
        setTexturesLoaded(true);
      }
    };
    img.src = '/hill_textures.png';
  }, []);

  const {
    seed,
    tileSize,
    chunkSize,
    octaves,
    persistence,
    lacunarity,
    scale: noiseScale,
    redistribution,
    applyIslandMask,
    islandRadius,
    mapViewMode,
    generationVersion,
    visibleLayers,
    showMapHUD,
  } = useWorldStore();

  const hoveredTile = useWorldStore((state) => state.hoveredTile);
  const selectedTile = useWorldStore((state) => state.selectedTile);
  const setHoveredTile = useWorldStore((state) => state.setHoveredTile);
  const setSelectedTile = useWorldStore((state) => state.setSelectedTile);

  // Keep loaded chunks in a cache Ref to prevent React state re-renders on every scroll/pan
  const loadedChunksRef = useRef<Map<string, {
    sprite: Sprite;
    texture: Texture;
    lastUsed: number;
  }>>(new Map());

  // Cache of chunk Tile arrays to support tile selection lookups at 60fps
  const chunkTilesRef = useRef<Map<string, Tile[][]>>(new Map());

  // Visible chunk boundary bounds for the asynchronous background pre-generator
  const visibleBoundsRef = useRef({ minCX: 0, maxCX: 0, minCY: 0, maxCY: 0 });

  // Pixi containers & highlights
  const chunksContainerRef = useRef<Container | null>(null);
  const hoverGraphicsRef = useRef<Graphics | null>(null);
  const selectGraphicsRef = useRef<Graphics | null>(null);

  // Capture current config values in a ref to avoid stale closures in event handlers
  const configRef = useRef({
    seed,
    tileSize,
    chunkSize,
    octaves,
    persistence,
    lacunarity,
    noiseScale,
    redistribution,
    applyIslandMask,
    islandRadius,
    mapViewMode,
    visibleLayers,
    selectedTile,
    generationVersion,
  });

  useEffect(() => {
    configRef.current = {
      seed,
      tileSize,
      chunkSize,
      octaves,
      persistence,
      lacunarity,
      noiseScale,
      redistribution,
      applyIslandMask,
      islandRadius,
      mapViewMode,
      visibleLayers,
      selectedTile,
      generationVersion,
    };
  }, [
    seed,
    tileSize,
    chunkSize,
    octaves,
    persistence,
    lacunarity,
    noiseScale,
    redistribution,
    applyIslandMask,
    islandRadius,
    mapViewMode,
    visibleLayers,
    selectedTile,
    generationVersion,
  ]);

  // Main rendering logic to load visible chunks and cull out-of-bounds chunks
  const loadVisibleChunks = () => {
    const app = pixiAppRef.current;
    const worldContainer = worldContainerRef.current;
    const chunksContainer = chunksContainerRef.current;
    if (!app || !worldContainer || !chunksContainer) return;

    const {
      seed: currentSeed,
      tileSize: tSize,
      chunkSize: cSize,
      octaves: octs,
      persistence: pers,
      lacunarity: lacu,
      noiseScale: nScale,
      redistribution: redis,
      applyIslandMask: islandMask,
      islandRadius: iRadius,
      mapViewMode: viewMode,
      visibleLayers: layers,
      selectedTile: selTile,
      generationVersion: genVer,
    } = configRef.current;

    const selectedChunkX = selTile ? Math.floor(selTile.x / cSize) : null;
    const selectedChunkY = selTile ? Math.floor(selTile.y / cSize) : null;

    const canvasWidth = app.screen.width;
    const canvasHeight = app.screen.height;

    // Viewport position and zoom level
    const zoom = worldContainer.scale.x;
    
    // Convert screen edges to absolute world pixel coordinates
    const worldLeft = -worldContainer.x / zoom;
    const worldTop = -worldContainer.y / zoom;
    const worldRight = (canvasWidth - worldContainer.x) / zoom;
    const worldBottom = (canvasHeight - worldContainer.y) / zoom;

    // Convert absolute world pixels to chunk indices
    const chunkPixelSize = cSize * tSize;
    const minCX = Math.floor(worldLeft / chunkPixelSize) - 1;
    const maxCX = Math.floor(worldRight / chunkPixelSize) + 1;
    const minCY = Math.floor(worldTop / chunkPixelSize) - 1;
    const maxCY = Math.floor(worldBottom / chunkPixelSize) + 1;

    // Update the ref to track visible bounds for background pre-generation
    visibleBoundsRef.current = { minCX, maxCX, minCY, maxCY };

    const now = Date.now();
    const chunkCache = loadedChunksRef.current;

    // 1. Generate and draw all visible chunks
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const chunkKey = `${cx},${cy}`;

        if (chunkCache.has(chunkKey)) {
          // Chunk is already loaded, update its timestamp
          const cached = chunkCache.get(chunkKey)!;
          cached.lastUsed = now;
          
          if (!chunksContainer.children.includes(cached.sprite)) {
            chunksContainer.addChild(cached.sprite);
          }
        } else {
           // Read chunk from persistent cache or generate new chunk
           let tiles: Tile[][];
           const prefix = `pworld_chunk_v2_${currentSeed}_${octs}_${pers}_${lacu}_${nScale}_${redis}_${islandMask}_${iRadius}_${genVer}_`;
           const cacheKey = `${prefix}${cx}_${cy}`;
           const cachedData = localStorage.getItem(cacheKey);

           if (cachedData) {
             try {
               const compressed = JSON.parse(cachedData);
               tiles = compressed.map((row: any, lx: number) => row.map((c: any, ly: number) => {
                 const wx = cx * cSize + lx;
                 const wy = cy * cSize + ly;
                 const tile: Tile = {
                   x: wx,
                   y: wy,
                   height: c.e,
                   elevation: c.e,
                   moisture: c.m,
                   temperature: c.t,
                   terrainType: c.ty,
                   baseTerrainType: c.bt || c.ty,
                 };
                 if (c.s) tile.structure = c.s;
                 if (c.d) tile.district = c.d;
                 if (c.r) {
                   tile.hasRoad = true;
                   if (c.rt) tile.roadType = c.rt;
                 }
                 return tile;
               }));
             } catch (err) {
               console.error('Failed to parse cached chunk data, regenerating...', err);
               tiles = generateChunk({
                 chunkX: cx,
                 chunkY: cy,
                 chunkSize: cSize,
                 seed: currentSeed,
                 octaves: octs,
                 persistence: pers,
                 lacunarity: lacu,
                 scale: nScale,
                 redistribution: redis,
                 applyIslandMask: islandMask,
                 islandRadius: iRadius,
               });
             }
           } else {
             tiles = generateChunk({
               chunkX: cx,
               chunkY: cy,
               chunkSize: cSize,
               seed: currentSeed,
               octaves: octs,
               persistence: pers,
               lacunarity: lacu,
               scale: nScale,
               redistribution: redis,
               applyIslandMask: islandMask,
               islandRadius: iRadius,
             });

             // Compress and store in localStorage
             const compressed = tiles.map(row => row.map(tile => {
               const c: any = {
                 e: parseFloat(tile.elevation.toFixed(3)),
                 m: parseFloat(tile.moisture.toFixed(3)),
                 t: parseFloat(tile.temperature.toFixed(3)),
                 ty: tile.terrainType
               };
               if (tile.baseTerrainType !== tile.terrainType) c.bt = tile.baseTerrainType;
               if (tile.structure) c.s = tile.structure;
               if (tile.district) c.d = tile.district;
               if (tile.hasRoad) {
                 c.r = 1;
                 if (tile.roadType) c.rt = tile.roadType;
               }
               return c;
             }));
             saveToLocalStorage(cacheKey, JSON.stringify(compressed));
           }

           // Cache tile data for interaction lookups
           chunkTilesRef.current.set(chunkKey, tiles);

          // Draw chunk on an offscreen canvas
          const canvasElement = document.createElement('canvas');
          const size = cSize * tSize;
          canvasElement.width = size;
          canvasElement.height = size;
          const ctx = canvasElement.getContext('2d');

          if (ctx) {
            ctx.imageSmoothingEnabled = false;

            // Draw tiles
            for (let lx = 0; lx < cSize; lx++) {
              for (let ly = 0; ly < cSize; ly++) {
                const tile = tiles[lx][ly];
                const E = tile.elevation;
                const M = tile.moisture;
                const T = tile.temperature;
                
                // Renders neutral dark background (#0B0F19) by default (so objects can float)
                let r = 11, g = 15, b = 25;
                
                const drawTerrain = layers.terrain;
                const drawRivers = layers.rivers;
                const isRiver = tile.terrainType === 'river';

                if (drawTerrain || (drawRivers && isRiver)) {
                  if (isRiver && drawRivers) {
                    // Draw River tile
                    if (viewMode === 'elevation') {
                      const val = Math.round(E * 255);
                      r = val; g = val; b = val;
                    } else if (viewMode === 'moisture') {
                      r = Math.round(220 * (1 - M) + 16 * M);
                      g = Math.round(190 * (1 - M) + 185 * M);
                      b = Math.round(120 * (1 - M) + 230 * M);
                    } else if (viewMode === 'temperature') {
                      r = Math.round(30 * (1 - T) + 239 * T);
                      g = Math.round(58 * (1 - T) + 68 * T);
                      b = Math.round(138 * (1 - T) + 68 * T);
                    } else {
                      const river = { r: 14, g: 165, b: 233 };
                      r = river.r; g = river.g; b = river.b;
                    }
                  } else {
                    // Draw Terrain tile (or river base biome when rivers is off)
                    const targetType = isRiver ? tile.baseTerrainType : tile.terrainType;

                    if (viewMode === 'elevation') {
                      const val = Math.round((isRiver ? 0.45 : E) * 255);
                      r = val; g = val; b = val;
                    } else if (viewMode === 'moisture') {
                      r = Math.round(220 * (1 - M) + 16 * M);
                      g = Math.round(190 * (1 - M) + 185 * M);
                      b = Math.round(120 * (1 - M) + 230 * M);
                    } else if (viewMode === 'temperature') {
                      r = Math.round(30 * (1 - T) + 239 * T);
                      g = Math.round(58 * (1 - T) + 68 * T);
                      b = Math.round(138 * (1 - T) + 68 * T);
                    } else {
                      // Biomes view solid colors or watercolor blended logic
                      const deepOcean = { r: 30, g: 58, b: 138 };
                      const shallowWater = { r: 59, g: 130, b: 246 };
                      const beach = { r: 254, g: 240, b: 138 };
                      const grassland = { r: 16, g: 185, b: 129 };
                      const forest = { r: 4, g: 120, b: 87 };
                      const desert = { r: 245, g: 158, b: 11 };
                      const hills = { r: 139, g: 94, b: 60 }; // Warm clay brown foothills
                      const mountain = { r: 243, g: 244, b: 246 }; // White mountain peaks
                      const snow = { r: 243, g: 244, b: 246 };

                      if (targetType === 'deep_water') {
                        r = deepOcean.r; g = deepOcean.g; b = deepOcean.b;
                      } else if (targetType === 'water') {
                        r = shallowWater.r; g = shallowWater.g; b = shallowWater.b;
                      } else if (targetType === 'beach') {
                        r = beach.r; g = beach.g; b = beach.b;
                      } else if (targetType === 'grass') {
                        r = grassland.r; g = grassland.g; b = grassland.b;
                      } else if (targetType === 'forest') {
                        r = forest.r; g = forest.g; b = forest.b;
                      } else if (targetType === 'desert') {
                        r = desert.r; g = desert.g; b = desert.b;
                      } else if (targetType === 'hills') {
                        r = hills.r; g = hills.g; b = hills.b;
                      } else if (targetType === 'mountain') {
                        r = mountain.r; g = mountain.g; b = mountain.b;
                      } else if (targetType === 'snow') {
                        r = snow.r; g = snow.g; b = snow.b;
                      } else {
                        // Watercolor blended transitions for any unmapped
                        const fForest = Math.min(1, Math.max(0, (M - 0.38) / 0.2));
                        const fDesert = Math.min(1, Math.max(0, (0.48 - M) / 0.2)) * Math.min(1, Math.max(0, (T - 0.52) / 0.2));
                        const fGrass = Math.max(0, 1 - fForest - fDesert);
                        const sum = fForest + fDesert + fGrass;
                        
                        const wForest = fForest / (sum || 1);
                        const wDesert = fDesert / (sum || 1);
                        const wGrass = fGrass / (sum || 1);

                        const landR = grassland.r * wGrass + forest.r * wForest + desert.r * wDesert;
                        const landG = grassland.g * wGrass + forest.g * wForest + desert.g * wDesert;
                        const landB = grassland.b * wGrass + forest.b * wForest + desert.b * wDesert;

                        if (E < 0.18) {
                          r = deepOcean.r; g = deepOcean.g; b = deepOcean.b;
                        } else if (E < 0.26) {
                          const t = (E - 0.18) / 0.08;
                          r = Math.round(deepOcean.r * (1 - t) + shallowWater.r * t);
                          g = Math.round(deepOcean.g * (1 - t) + shallowWater.g * t);
                          b = Math.round(deepOcean.b * (1 - t) + shallowWater.b * t);
                        } else if (E < 0.35) {
                          r = shallowWater.r; g = shallowWater.g; b = shallowWater.b;
                        } else if (E < 0.38) {
                          const t = (E - 0.35) / 0.03;
                          r = Math.round(shallowWater.r * (1 - t) + beach.r * t);
                          g = Math.round(shallowWater.g * (1 - t) + beach.g * t);
                          b = Math.round(shallowWater.b * (1 - t) + beach.b * t);
                        } else if (E < 0.43) {
                          const t = (E - 0.38) / 0.05;
                          r = Math.round(beach.r * (1 - t) + landR * t);
                          g = Math.round(beach.g * (1 - t) + landG * t);
                          b = Math.round(beach.b * (1 - t) + landB * t);
                        } else if (E < 0.70) {
                          r = Math.round(landR); g = Math.round(landG); b = Math.round(landB);
                        } else if (E < 0.74) {
                          const t = (E - 0.70) / 0.04;
                          r = Math.round(landR * (1 - t) + hills.r * t);
                          g = Math.round(landG * (1 - t) + hills.g * t);
                          b = Math.round(landB * (1 - t) + hills.b * t);
                        } else if (E < 0.82) {
                          r = hills.r; g = hills.g; b = hills.b;
                        } else if (E < 0.85) {
                          const t = (E - 0.82) / 0.03;
                          r = Math.round(hills.r * (1 - t) + mountain.r * t);
                          g = Math.round(hills.g * (1 - t) + mountain.g * t);
                          b = Math.round(hills.b * (1 - t) + mountain.b * t);
                        } else {
                          const sElev = Math.min(1, Math.max(0, (E - 0.85) / 0.12));
                          const sCold = Math.min(1, Math.max(0, (0.45 - T) / 0.15));
                          const s = Math.max(sElev, sCold);
                          
                          r = Math.round(mountain.r * (1 - s) + snow.r * s);
                          g = Math.round(mountain.g * (1 - s) + snow.g * s);
                          b = Math.round(mountain.b * (1 - s) + snow.b * s);
                        }
                      }
                    }
                  }
                }
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(lx * tSize, ly * tSize, tSize, tSize);

                // --- PROCEDURAL RPG TEXTURE PACK ---
                if (layers.textures && viewMode === 'biomes' && (drawTerrain || (drawRivers && isRiver))) {
                  const tx = tile.x;
                  const ty = tile.y;
                  const x = lx * tSize;
                  const y = ly * tSize;
                  const activeType = isRiver ? tile.baseTerrainType : tile.terrainType;

                  // Deterministic pseudo-random seed hash for the tile
                  const hash = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;

                  if (isRiver && drawRivers) {
                    // River flowing water current ripples
                    if (hash < 0.25) {
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                      ctx.lineWidth = 1;
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.2, y + tSize * 0.5);
                      ctx.lineTo(x + tSize * 0.8, y + tSize * 0.5);
                      ctx.stroke();
                    }
                  } else if (activeType === 'grass') {
                    // Cute grass blades or clovers
                    if (hash < 0.20) {
                      ctx.strokeStyle = '#047857'; // Darker forest green
                      ctx.lineWidth = 1.5;
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.3, y + tSize * 0.7);
                      ctx.lineTo(x + tSize * 0.35, y + tSize * 0.45);
                      ctx.moveTo(x + tSize * 0.5, y + tSize * 0.75);
                      ctx.lineTo(x + tSize * 0.45, y + tSize * 0.35);
                      ctx.moveTo(x + tSize * 0.65, y + tSize * 0.7);
                      ctx.lineTo(x + tSize * 0.72, y + tSize * 0.5);
                      ctx.stroke();
                    } else if (hash < 0.32) {
                      // Small yellow flower
                      ctx.fillStyle = '#FBBF24'; // Yellow
                      ctx.beginPath();
                      ctx.arc(x + tSize * 0.5, y + tSize * 0.5, 2, 0, Math.PI * 2);
                      ctx.fill();
                      ctx.strokeStyle = '#047857';
                      ctx.lineWidth = 1;
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.5, y + tSize * 0.5);
                      ctx.lineTo(x + tSize * 0.5, y + tSize * 0.85);
                      ctx.stroke();
                    }
                  } else if (activeType === 'desert') {
                    // Elegant sand ripples
                    ctx.strokeStyle = '#D97706'; // Dark amber
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    if (hash < 0.5) {
                      ctx.moveTo(x + tSize * 0.15, y + tSize * 0.4);
                      ctx.quadraticCurveTo(x + tSize * 0.4, y + tSize * 0.25, x + tSize * 0.65, y + tSize * 0.4);
                    } else {
                      ctx.moveTo(x + tSize * 0.35, y + tSize * 0.7);
                      ctx.quadraticCurveTo(x + tSize * 0.6, y + tSize * 0.55, x + tSize * 0.85, y + tSize * 0.7);
                    }
                    ctx.stroke();
                  } else if (activeType === 'beach') {
                    // Grains of sand details
                    if (hash < 0.35) {
                      ctx.fillStyle = '#D97706'; // Golden amber
                      ctx.fillRect(x + tSize * 0.3, y + tSize * 0.45, 1.5, 1.5);
                      ctx.fillRect(x + tSize * 0.68, y + tSize * 0.65, 1.5, 1.5);
                    }
                  } else if (activeType === 'water' || activeType === 'deep_water') {
                    // White Crest waves
                    if (hash < 0.12) {
                      ctx.strokeStyle = activeType === 'deep_water' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.25)';
                      ctx.lineWidth = 1;
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.2, y + tSize * 0.5);
                      ctx.quadraticCurveTo(x + tSize * 0.35, y + tSize * 0.4, x + tSize * 0.5, y + tSize * 0.5);
                      ctx.stroke();
                    }
                  }
                }

                // --- ROAD RENDERING ---
                if (layers.roads && tile.hasRoad) {
                  const cx = lx * tSize + tSize / 2;
                  const cy = ly * tSize + tSize / 2;

                  if (tile.roadType === 'highway') {
                    // Draw a thick stone-gray winding line connecting the centers of adjacent highway tiles
                    ctx.strokeStyle = '#78716C';
                    ctx.lineWidth = tSize * 0.35;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Draw a small dot at the center first
                    ctx.fillStyle = '#78716C';
                    ctx.beginPath();
                    ctx.arc(cx, cy, tSize * 0.175, 0, Math.PI * 2);
                    ctx.fill();

                    // Check neighbors to draw paths
                    const drawDir = (dx: number, dy: number, isEdge: boolean, neighborRoad: boolean) => {
                      if (neighborRoad || isEdge) {
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + dx * tSize * 0.5, cy + dy * tSize * 0.5);
                        ctx.stroke();
                      }
                    };

                    drawDir(0, -1, ly === 0, ly > 0 && !!tiles[lx][ly - 1].hasRoad);
                    drawDir(0, 1, ly === cSize - 1, ly < cSize - 1 && !!tiles[lx][ly + 1].hasRoad);
                    drawDir(-1, 0, lx === 0, lx > 0 && !!tiles[lx - 1][ly].hasRoad);
                    drawDir(1, 0, lx === cSize - 1, lx < cSize - 1 && !!tiles[lx + 1][ly].hasRoad);
                  } else {
                    // Draw local streets (traditional blocky road)
                    ctx.fillStyle = '#78716C'; // stone-gray
                    const pad = tSize * 0.3;
                    const roadWidth = tSize - 2 * pad;
                    const rx = lx * tSize + pad;
                    const ry = ly * tSize + pad;
                    ctx.fillRect(rx, ry, roadWidth, roadWidth);
                    
                    // Connect to neighbors within chunk that have roads or any structure
                    if (ly > 0 && (tiles[lx][ly - 1].hasRoad || tiles[lx][ly - 1].structure)) {
                      ctx.fillRect(rx, ly * tSize, roadWidth, pad + 1);
                    }
                    if (ly < cSize - 1 && (tiles[lx][ly + 1].hasRoad || tiles[lx][ly + 1].structure)) {
                      ctx.fillRect(rx, ry + roadWidth - 1, roadWidth, pad + 1);
                    }
                    if (lx > 0 && (tiles[lx - 1][ly].hasRoad || tiles[lx - 1][ly].structure)) {
                      ctx.fillRect(lx * tSize, ry, pad + 1, roadWidth);
                    }
                    if (lx < cSize - 1 && (tiles[lx + 1][ly].hasRoad || tiles[lx + 1][ly].structure)) {
                      ctx.fillRect(rx + roadWidth - 1, ry, pad + 1, roadWidth);
                    }
                  }
                }

                // --- STRUCTURE RENDERING ---
                if (layers.buildings && tile.structure) {
                  const x = lx * tSize;
                  const y = ly * tSize;

                  if (tile.structure === 'city_center') {
                    // 1. Shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                    ctx.fillRect(x + tSize * 0.1, y + tSize * 0.8, tSize * 0.8, tSize * 0.12);
                    
                    // 2. Base building / central tower walls (slate-gray walls #64748B)
                    ctx.fillStyle = '#64748B';
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.35, tSize * 0.6, tSize * 0.45);
                    
                    // Left and Right towers
                    ctx.fillStyle = '#475569'; // Slightly darker slate gray for depth
                    ctx.fillRect(x + tSize * 0.1, y + tSize * 0.3, tSize * 0.15, tSize * 0.5);
                    ctx.fillRect(x + tSize * 0.75, y + tSize * 0.3, tSize * 0.15, tSize * 0.5);
                    
                    // 3. Tower crenellations
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(x + tSize * 0.1, y + tSize * 0.25, tSize * 0.05, tSize * 0.05);
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.25, tSize * 0.05, tSize * 0.05);
                    ctx.fillRect(x + tSize * 0.75, y + tSize * 0.25, tSize * 0.05, tSize * 0.05);
                    ctx.fillRect(x + tSize * 0.85, y + tSize * 0.25, tSize * 0.05, tSize * 0.05);

                    // 4. Central tower roof (Royal Blue triangular dome roof #1D4ED8)
                    ctx.fillStyle = '#1D4ED8';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.2, y + tSize * 0.35);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.15);
                    ctx.lineTo(x + tSize * 0.8, y + tSize * 0.35);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 5. Gold flagpole & crimson red flag
                    ctx.strokeStyle = '#EAB308';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.5, y + tSize * 0.15);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.03);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#DC2626';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.5, y + tSize * 0.03);
                    ctx.lineTo(x + tSize * 0.66, y + tSize * 0.07);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.11);
                    ctx.closePath();
                    ctx.fill();
                    
                    // 6. Arched Dark Brown door
                    ctx.fillStyle = '#451A03';
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.8, tSize * 0.1, Math.PI, 0, false);
                    ctx.fillRect(x + tSize * 0.4, y + tSize * 0.7, tSize * 0.2, tSize * 0.1);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Door handle
                    ctx.fillStyle = '#F59E0B';
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.45, y + tSize * 0.75, tSize * 0.015, 0, Math.PI * 2);
                    ctx.fill();
 
                    // 7. Glowing golden windows
                    ctx.fillStyle = '#F59E0B';
                    ctx.fillRect(x + tSize * 0.15, y + tSize * 0.45, tSize * 0.05, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.8, y + tSize * 0.45, tSize * 0.05, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.32, y + tSize * 0.48, tSize * 0.06, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.62, y + tSize * 0.48, tSize * 0.06, tSize * 0.08);

                  } else if (tile.structure === 'house') {
                    // Check tile district type
                    const dist = tile.district || 'residential';
                    
                    if (dist === 'commercial') {
                      // Shadow
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                      ctx.fillRect(x + tSize * 0.15, y + tSize * 0.8, tSize * 0.7, tSize * 0.1);

                      // Commercial structure: Shop with striped red-and-white awning
                      // Body: warm tan (#CA8A04)
                      ctx.fillStyle = '#CA8A04';
                      ctx.fillRect(x + tSize * 0.2, y + tSize * 0.45, tSize * 0.6, tSize * 0.35);

                      // Flat roof: Dark grey (#334155)
                      ctx.fillStyle = '#334155';
                      ctx.fillRect(x + tSize * 0.18, y + tSize * 0.4, tSize * 0.64, tSize * 0.06);

                      // Striped red-and-white canvas awning on front
                      const awningWidth = tSize * 0.56;
                      const stripeWidth = awningWidth / 6;
                      for (let i = 0; i < 6; i++) {
                        ctx.fillStyle = i % 2 === 0 ? '#EF4444' : '#F8FAFC';
                        ctx.fillRect(x + tSize * 0.22 + i * stripeWidth, y + tSize * 0.46, stripeWidth, tSize * 0.12);
                      }

                      // Large display window (glowing)
                      ctx.fillStyle = '#FEF08A';
                      ctx.fillRect(x + tSize * 0.25, y + tSize * 0.6, tSize * 0.22, tSize * 0.16);
                      ctx.strokeStyle = '#78350F';
                      ctx.lineWidth = 0.75;
                      ctx.strokeRect(x + tSize * 0.25, y + tSize * 0.6, tSize * 0.22, tSize * 0.16);

                      // Window cross-grids
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.36, y + tSize * 0.6);
                      ctx.lineTo(x + tSize * 0.36, y + tSize * 0.76);
                      ctx.moveTo(x + tSize * 0.25, y + tSize * 0.68);
                      ctx.lineTo(x + tSize * 0.47, y + tSize * 0.68);
                      ctx.stroke();

                      // Shop door
                      ctx.fillStyle = '#78350F';
                      ctx.fillRect(x + tSize * 0.54, y + tSize * 0.58, tSize * 0.18, tSize * 0.22);
                      ctx.fillStyle = '#F59E0B';
                      ctx.beginPath();
                      ctx.arc(x + tSize * 0.58, y + tSize * 0.69, tSize * 0.015, 0, Math.PI * 2);
                      ctx.fill();

                    } else if (dist === 'industrial') {
                      // Shadow
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                      ctx.fillRect(x + tSize * 0.15, y + tSize * 0.8, tSize * 0.7, tSize * 0.1);

                      // Industrial: stone masonry blocks with double chimneys emitting dark smoke particles
                      // Double chimneys first (so body is in front)
                      ctx.fillStyle = '#4B5563'; // Slate stone chimney color
                      ctx.fillRect(x + tSize * 0.28, y + tSize * 0.22, tSize * 0.08, tSize * 0.25);
                      ctx.fillRect(x + tSize * 0.64, y + tSize * 0.22, tSize * 0.08, tSize * 0.25);
                      
                      // Chimney caps
                      ctx.fillStyle = '#1F2937';
                      ctx.fillRect(x + tSize * 0.26, y + tSize * 0.19, tSize * 0.12, tSize * 0.04);
                      ctx.fillRect(x + tSize * 0.62, y + tSize * 0.19, tSize * 0.12, tSize * 0.04);

                      // Overlapping smoke puff clouds (translucent gray)
                      ctx.fillStyle = 'rgba(156, 163, 175, 0.45)';
                      ctx.beginPath();
                      ctx.arc(x + tSize * 0.32, y + tSize * 0.13, tSize * 0.07, 0, Math.PI * 2);
                      ctx.arc(x + tSize * 0.36, y + tSize * 0.08, tSize * 0.09, 0, Math.PI * 2);
                      ctx.arc(x + tSize * 0.68, y + tSize * 0.13, tSize * 0.07, 0, Math.PI * 2);
                      ctx.arc(x + tSize * 0.72, y + tSize * 0.08, tSize * 0.09, 0, Math.PI * 2);
                      ctx.fill();

                      // Stone Block Body
                      ctx.fillStyle = '#6B7280'; // Stone masonry gray
                      ctx.fillRect(x + tSize * 0.2, y + tSize * 0.45, tSize * 0.6, tSize * 0.35);

                      // Masonry bricks lines detail
                      ctx.strokeStyle = '#374151';
                      ctx.lineWidth = 0.5;
                      ctx.strokeRect(x + tSize * 0.2, y + tSize * 0.45, tSize * 0.6, tSize * 0.35);
                      
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.2, y + tSize * 0.62);
                      ctx.lineTo(x + tSize * 0.8, y + tSize * 0.62);
                      ctx.stroke();

                      // Dark metal roof
                      ctx.fillStyle = '#374151';
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.18, y + tSize * 0.45);
                      ctx.lineTo(x + tSize * 0.5, y + tSize * 0.26);
                      ctx.lineTo(x + tSize * 0.82, y + tSize * 0.45);
                      ctx.closePath();
                      ctx.fill();

                      // Industrial heavy door
                      ctx.fillStyle = '#1F2937';
                      ctx.fillRect(x + tSize * 0.42, y + tSize * 0.58, tSize * 0.16, tSize * 0.22);

                    } else {
                      // Residential (or fallback default house)
                      // Shadow
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                      ctx.fillRect(x + tSize * 0.15, y + tSize * 0.8, tSize * 0.7, tSize * 0.1);

                      // Cozy suburban house (wood yellow base #CA8A04, brick-red roof #B91C1C)
                      ctx.fillStyle = '#CA8A04';
                      ctx.fillRect(x + tSize * 0.2, y + tSize * 0.45, tSize * 0.6, tSize * 0.35);

                      ctx.fillStyle = '#B91C1C';
                      ctx.beginPath();
                      ctx.moveTo(x + tSize * 0.15, y + tSize * 0.45);
                      ctx.lineTo(x + tSize * 0.5, y + tSize * 0.2);
                      ctx.lineTo(x + tSize * 0.85, y + tSize * 0.45);
                      ctx.closePath();
                      ctx.fill();

                      ctx.strokeStyle = '#991B1B';
                      ctx.lineWidth = 1;
                      ctx.stroke();

                      // Dark brown doorway
                      ctx.fillStyle = '#78350F';
                      ctx.fillRect(x + tSize * 0.42, y + tSize * 0.6, tSize * 0.16, tSize * 0.2);

                      ctx.fillStyle = '#F59E0B';
                      ctx.beginPath();
                      ctx.arc(x + tSize * 0.45, y + tSize * 0.7, tSize * 0.015, 0, Math.PI * 2);
                      ctx.fill();

                      // Glowing windows
                      ctx.fillStyle = '#FEF08A';
                      const wx1 = x + tSize * 0.28;
                      const wx2 = x + tSize * 0.62;
                      const wy = y + tSize * 0.52;
                      const wSize = tSize * 0.1;
                      
                      ctx.fillRect(wx1, wy, wSize, wSize);
                      ctx.fillRect(wx2, wy, wSize, wSize);

                      ctx.strokeStyle = '#CA8A04';
                      ctx.lineWidth = 0.75;
                      ctx.strokeRect(wx1, wy, wSize, wSize);
                      ctx.strokeRect(wx2, wy, wSize, wSize);

                      ctx.beginPath();
                      ctx.moveTo(wx1 + wSize / 2, wy);
                      ctx.lineTo(wx1 + wSize / 2, wy + wSize);
                      ctx.moveTo(wx1, wy + wSize / 2);
                      ctx.lineTo(wx1 + wSize, wy + wSize / 2);
                      ctx.moveTo(wx2 + wSize / 2, wy);
                      ctx.lineTo(wx2 + wSize / 2, wy + wSize);
                      ctx.moveTo(wx2, wy + wSize / 2);
                      ctx.lineTo(wx2 + wSize, wy + wSize / 2);
                      ctx.stroke();
                    }

                  } else if (tile.structure === 'cottage') {
                    // Shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.75, tSize * 0.6, tSize * 0.1);
                    
                    // Wood cottage (warm wood brown base, straw-yellow roof)
                    ctx.fillStyle = '#D97706';
                    ctx.fillRect(x + tSize * 0.25, y + tSize * 0.5, tSize * 0.5, tSize * 0.3);
                    
                    ctx.fillStyle = '#F59E0B';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.2, y + tSize * 0.5);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.25);
                    ctx.lineTo(x + tSize * 0.8, y + tSize * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Dark brown doorway
                    ctx.fillStyle = '#451A03';
                    ctx.fillRect(x + tSize * 0.44, y + tSize * 0.62, tSize * 0.12, tSize * 0.18);

                  } else if (tile.structure === 'tavern') {
                    // Tavern shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
                    ctx.fillRect(x + tSize * 0.15, y + tSize * 0.8, tSize * 0.7, tSize * 0.12);

                    // Stone foundation
                    ctx.fillStyle = '#4B5563';
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.7, tSize * 0.6, tSize * 0.15);

                    // Wood body
                    ctx.fillStyle = '#78350F';
                    ctx.fillRect(x + tSize * 0.22, y + tSize * 0.45, tSize * 0.56, tSize * 0.25);

                    // Amber/red brick roof
                    ctx.fillStyle = '#9A3412';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.15, y + tSize * 0.45);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.18);
                    ctx.lineTo(x + tSize * 0.85, y + tSize * 0.45);
                    ctx.closePath();
                    ctx.fill();

                    // Dark arched doorway
                    ctx.fillStyle = '#451A03';
                    ctx.fillRect(x + tSize * 0.43, y + tSize * 0.6, tSize * 0.14, tSize * 0.25);

                    // Hanging sign board
                    ctx.fillStyle = '#FBBF24';
                    ctx.fillRect(x + tSize * 0.38, y + tSize * 0.25, tSize * 0.24, tSize * 0.1);
                    ctx.strokeStyle = '#451A03';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x + tSize * 0.38, y + tSize * 0.25, tSize * 0.24, tSize * 0.1);

                  } else if (tile.structure === 'farm') {
                    // Soil area base
                    ctx.fillStyle = '#451A03';
                    ctx.fillRect(x + tSize * 0.1, y + tSize * 0.1, tSize * 0.8, tSize * 0.8);

                    // Horizontal green rows/furrows
                    ctx.fillStyle = '#10B981';
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.22, tSize * 0.6, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.42, tSize * 0.6, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.62, tSize * 0.6, tSize * 0.08);
                    ctx.fillRect(x + tSize * 0.2, y + tSize * 0.82, tSize * 0.6, tSize * 0.08);

                    // Gold wheat dots
                    ctx.fillStyle = '#F59E0B';
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.3, y + tSize * 0.26, tSize * 0.04, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.6, y + tSize * 0.26, tSize * 0.04, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.4, y + tSize * 0.46, tSize * 0.04, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.7, y + tSize * 0.46, tSize * 0.04, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.66, tSize * 0.04, 0, Math.PI * 2);
                    ctx.fill();

                  } else if (tile.structure === 'campfire') {
                    // Campfire
                    ctx.fillStyle = '#94A3B8';
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.65, tSize * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.65, tSize * 0.13, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#78350F';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.4, y + tSize * 0.7);
                    ctx.lineTo(x + tSize * 0.6, y + tSize * 0.58);
                    ctx.moveTo(x + tSize * 0.6, y + tSize * 0.7);
                    ctx.lineTo(x + tSize * 0.4, y + tSize * 0.58);
                    ctx.stroke();
                    
                    // Flame
                    ctx.fillStyle = '#EF4444';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.4, y + tSize * 0.62);
                    ctx.quadraticCurveTo(x + tSize * 0.5, y + tSize * 0.35, x + tSize * 0.5, y + tSize * 0.35);
                    ctx.quadraticCurveTo(x + tSize * 0.6, y + tSize * 0.62, x + tSize * 0.6, y + tSize * 0.62);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#F97316';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.44, y + tSize * 0.62);
                    ctx.quadraticCurveTo(x + tSize * 0.5, y + tSize * 0.45, x + tSize * 0.5, y + tSize * 0.45);
                    ctx.quadraticCurveTo(x + tSize * 0.56, y + tSize * 0.62, x + tSize * 0.56, y + tSize * 0.62);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#FACC15';
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.6, tSize * 0.05, 0, Math.PI * 2);
                    ctx.fill();

                  } else if (tile.structure === 'ruins') {
                    // Shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                    ctx.fillRect(x + tSize * 0.15, y + tSize * 0.75, tSize * 0.7, tSize * 0.1);

                    // Left Column (Crumbling)
                    ctx.fillStyle = '#64748B'; // slate gray
                    ctx.fillRect(x + tSize * 0.25, y + tSize * 0.4, tSize * 0.15, tSize * 0.35);
                    ctx.fillStyle = '#94A3B8'; // lighter slate
                    ctx.fillRect(x + tSize * 0.25, y + tSize * 0.4, tSize * 0.05, tSize * 0.35);
                    // Column cap
                    ctx.fillStyle = '#475569';
                    ctx.fillRect(x + tSize * 0.22, y + tSize * 0.36, tSize * 0.21, tSize * 0.05);

                    // Right Column (Broken/Lower)
                    ctx.fillStyle = '#475569';
                    ctx.fillRect(x + tSize * 0.6, y + tSize * 0.55, tSize * 0.15, tSize * 0.2);
                    ctx.fillStyle = '#64748B';
                    ctx.fillRect(x + tSize * 0.6, y + tSize * 0.55, tSize * 0.05, tSize * 0.2);
                    // Fallen column top next to it
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(x + tSize * 0.78, y + tSize * 0.65, tSize * 0.12, tSize * 0.1);

                    // Stone arch connecting top (cracked/broken)
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = tSize * 0.06;
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.5, y + tSize * 0.4, tSize * 0.25, Math.PI, Math.PI * 1.5); // Left half of arch only (broken!)
                    ctx.stroke();

                    // Ivy/Vines wrapping the left column
                    ctx.fillStyle = '#15803D'; // forest green
                    ctx.beginPath();
                    ctx.arc(x + tSize * 0.35, y + tSize * 0.5, tSize * 0.06, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.28, y + tSize * 0.6, tSize * 0.07, 0, Math.PI * 2);
                    ctx.arc(x + tSize * 0.32, y + tSize * 0.42, tSize * 0.05, 0, Math.PI * 2);
                    ctx.fill();

                  } else if (tile.structure === 'obelisk') {
                    // Shadow
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.3, y + tSize * 0.85);
                    ctx.lineTo(x + tSize * 0.7, y + tSize * 0.85);
                    ctx.lineTo(x + tSize * 0.9, y + tSize * 0.95);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.95);
                    ctx.closePath();
                    ctx.fill();

                    // Base Block
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(x + tSize * 0.3, y + tSize * 0.75, tSize * 0.4, tSize * 0.1);
                    ctx.fillStyle = '#475569';
                    ctx.fillRect(x + tSize * 0.3, y + tSize * 0.75, tSize * 0.08, tSize * 0.1);

                    // Tapered Spire
                    ctx.fillStyle = '#1E293B'; // Very dark slate
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.35, y + tSize * 0.75);
                    ctx.lineTo(x + tSize * 0.42, y + tSize * 0.25);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.18); // top tip
                    ctx.lineTo(x + tSize * 0.58, y + tSize * 0.25);
                    ctx.lineTo(x + tSize * 0.65, y + tSize * 0.75);
                    ctx.closePath();
                    ctx.fill();

                    // Spire Left Facet Highlight
                    ctx.fillStyle = '#334155';
                    ctx.beginPath();
                    ctx.moveTo(x + tSize * 0.35, y + tSize * 0.75);
                    ctx.lineTo(x + tSize * 0.42, y + tSize * 0.25);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.18);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.75);
                    ctx.closePath();
                    ctx.fill();

                    // Glowing Cyan Runes (using shadow blur for pulse effect)
                    ctx.save();
                    ctx.shadowColor = '#06B6D4';
                    ctx.shadowBlur = 6;
                    ctx.strokeStyle = '#22D3EE';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    // Vertical runic line down the center
                    ctx.moveTo(x + tSize * 0.5, y + tSize * 0.3);
                    ctx.lineTo(x + tSize * 0.5, y + tSize * 0.7);
                    
                    // Cross rune ticks
                    ctx.moveTo(x + tSize * 0.46, y + tSize * 0.38);
                    ctx.lineTo(x + tSize * 0.54, y + tSize * 0.42);
                    
                    ctx.moveTo(x + tSize * 0.54, y + tSize * 0.48);
                    ctx.lineTo(x + tSize * 0.46, y + tSize * 0.52);

                    ctx.moveTo(x + tSize * 0.47, y + tSize * 0.6);
                    ctx.lineTo(x + tSize * 0.53, y + tSize * 0.6);
                    
                    ctx.stroke();
                    ctx.restore();
                  }
                }
              }
            }

            // --- TILE EDGE TRANSITIONS & CLIFFS OVERLAY (autotiling) ---
            if (texturesLoaded && spritesheetRef.current && layers.textures && viewMode === 'biomes') {
              const sheet = spritesheetRef.current;
              for (let lx = 0; lx < cSize; lx++) {
                for (let ly = 0; ly < cSize; ly++) {
                  const tile = tiles[lx][ly];
                  const activeType = tile.terrainType === 'river' ? tile.baseTerrainType : tile.terrainType;

                  if (activeType === 'hills') {
                    // Helper to get neighbor biome types
                    const getNeighborType = (dx: number, dy: number): TerrainType => {
                      const nx = lx + dx;
                      const ny = ly + dy;
                      if (nx >= 0 && nx < cSize && ny >= 0 && ny < cSize) {
                        const nTile = tiles[nx][ny];
                        return nTile.terrainType === 'river' ? nTile.baseTerrainType : nTile.terrainType;
                      }
                      const { terrainType } = getTileTerrainAt(tile.x + dx, tile.y + dy, currentSeed, {
                        octaves: octs,
                        persistence: pers,
                        lacunarity: lacu,
                        scale: nScale,
                        redistribution: redis,
                        applyIslandMask: islandMask,
                        islandRadius: iRadius,
                      });
                      return terrainType;
                    };

                    const nNotHill = getNeighborType(0, -1) !== 'hills';
                    const sNotHill = getNeighborType(0, 1) !== 'hills';
                    const wNotHill = getNeighborType(-1, 0) !== 'hills';
                    const eNotHill = getNeighborType(1, 0) !== 'hills';

                    const tx = lx * tSize;
                    const ty = ly * tSize;

                    // 1. South Cliff descend (overlapping down into the tile below)
                    if (sNotHill) {
                      // Cliff Face (Column 1): x = 733, y = 259, w = 26, h = 54 -> scaled to fit tSize
                      ctx.drawImage(sheet, 733, 259, 26, 54, tx, ty + tSize, tSize, tSize);
                      // Cliff Bottom details: x = 733, y = 313, w = 26, h = 20 -> scaled to fit tSize
                      ctx.drawImage(sheet, 733, 313, 26, 20, tx, ty + tSize * 1.5, tSize, tSize * 0.4);
                    }

                    // 2. North Edge Transition (meadow top border)
                    if (nNotHill) {
                      const nType = getNeighborType(0, -1);
                      const nColor = BIOME_RGB_VALUES[nType] || BIOME_RGB_VALUES.grass;
                      const hillColor = BIOME_RGB_VALUES.hills;

                      ctx.save();
                      
                      // 1. Draw top part (neighbor biome color)
                      ctx.fillStyle = `rgb(${nColor.r}, ${nColor.g}, ${nColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty);
                      ctx.lineTo(tx + tSize, ty);
                      ctx.lineTo(tx + tSize, ty + tSize * 0.5);
                      // Bezier curve to make a nice organic curved cliff path
                      ctx.bezierCurveTo(
                        tx + tSize * 0.7, ty + tSize * 0.58,
                        tx + tSize * 0.3, ty + tSize * 0.42,
                        tx, ty + tSize * 0.5
                      );
                      ctx.closePath();
                      ctx.fill();

                      // 2. Draw bottom part (hill color)
                      ctx.fillStyle = `rgb(${hillColor.r}, ${hillColor.g}, ${hillColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty + tSize);
                      ctx.lineTo(tx + tSize, ty + tSize);
                      ctx.lineTo(tx + tSize, ty + tSize * 0.5);
                      ctx.bezierCurveTo(
                        tx + tSize * 0.7, ty + tSize * 0.58,
                        tx + tSize * 0.3, ty + tSize * 0.42,
                        tx, ty + tSize * 0.5
                      );
                      ctx.closePath();
                      ctx.fill();

                      // 3. Draw a dark hand-drawn styled rock ridge/cliff line
                      ctx.strokeStyle = '#4e3321'; // Dark earthy tone for cliff edge
                      ctx.lineWidth = 1.75;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty + tSize * 0.5);
                      ctx.bezierCurveTo(
                        tx + tSize * 0.3, ty + tSize * 0.42,
                        tx + tSize * 0.7, ty + tSize * 0.58,
                        tx + tSize, ty + tSize * 0.5
                      );
                      ctx.stroke();

                      // 4. Highlight line just below to give it 3D bevel look
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                      ctx.lineWidth = 0.75;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty + tSize * 0.52);
                      ctx.bezierCurveTo(
                        tx + tSize * 0.3, ty + tSize * 0.44,
                        tx + tSize * 0.7, ty + tSize * 0.60,
                        tx + tSize, ty + tSize * 0.52
                      );
                      ctx.stroke();

                      ctx.restore();
                    }

                    // 3. West Edge Transition (left slope)
                    if (wNotHill) {
                      // Grid 2 Row 2 Col 1: x = 356, y = 309, w = 58, h = 55
                      ctx.drawImage(sheet, 356, 309, 58, 55, tx, ty, tSize, tSize);
                    }

                    // 4. East Edge Transition (right slope)
                    if (eNotHill) {
                      // Grid 2 Row 2 Col 3: x = 472, y = 309, w = 58, h = 55
                      ctx.drawImage(sheet, 472, 309, 58, 55, tx, ty, tSize, tSize);
                    }

                    // 5. Corners
                    if (nNotHill && wNotHill) {
                      const nType = getNeighborType(0, -1);
                      const nColor = BIOME_RGB_VALUES[nType] || BIOME_RGB_VALUES.grass;
                      const hillColor = BIOME_RGB_VALUES.hills;

                      ctx.save();
                      
                      // 1. Top-left neighbor region
                      ctx.fillStyle = `rgb(${nColor.r}, ${nColor.g}, ${nColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty);
                      ctx.lineTo(tx + tSize * 0.5, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.45, ty + tSize * 0.45, tx, ty + tSize * 0.5);
                      ctx.closePath();
                      ctx.fill();

                      // 2. Bottom-right hill region
                      ctx.fillStyle = `rgb(${hillColor.r}, ${hillColor.g}, ${hillColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty + tSize);
                      ctx.lineTo(tx + tSize, ty + tSize);
                      ctx.lineTo(tx + tSize, ty);
                      ctx.lineTo(tx + tSize * 0.5, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.45, ty + tSize * 0.45, tx, ty + tSize * 0.5);
                      ctx.lineTo(tx, ty + tSize);
                      ctx.closePath();
                      ctx.fill();

                      // 3. Cliff edge outline
                      ctx.strokeStyle = '#4e3321';
                      ctx.lineWidth = 1.75;
                      ctx.beginPath();
                      ctx.moveTo(tx + tSize * 0.5, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.45, ty + tSize * 0.45, tx, ty + tSize * 0.5);
                      ctx.stroke();

                      // 4. Highlight
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                      ctx.lineWidth = 0.75;
                      ctx.beginPath();
                      ctx.moveTo(tx + tSize * 0.52, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.47, ty + tSize * 0.47, tx, ty + tSize * 0.52);
                      ctx.stroke();

                      ctx.restore();
                    }
                    if (nNotHill && eNotHill) {
                      const nType = getNeighborType(0, -1);
                      const nColor = BIOME_RGB_VALUES[nType] || BIOME_RGB_VALUES.grass;
                      const hillColor = BIOME_RGB_VALUES.hills;

                      ctx.save();
                      
                      // 1. Top-right neighbor region
                      ctx.fillStyle = `rgb(${nColor.r}, ${nColor.g}, ${nColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx + tSize, ty);
                      ctx.lineTo(tx + tSize * 0.5, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.55, ty + tSize * 0.45, tx + tSize, ty + tSize * 0.5);
                      ctx.closePath();
                      ctx.fill();

                      // 2. Bottom-left hill region
                      ctx.fillStyle = `rgb(${hillColor.r}, ${hillColor.g}, ${hillColor.b})`;
                      ctx.beginPath();
                      ctx.moveTo(tx, ty);
                      ctx.lineTo(tx, ty + tSize);
                      ctx.lineTo(tx + tSize, ty + tSize);
                      ctx.lineTo(tx + tSize, ty + tSize * 0.5);
                      ctx.quadraticCurveTo(tx + tSize * 0.55, ty + tSize * 0.45, tx + tSize * 0.5, ty);
                      ctx.closePath();
                      ctx.fill();

                      // 3. Cliff edge outline
                      ctx.strokeStyle = '#4e3321';
                      ctx.lineWidth = 1.75;
                      ctx.beginPath();
                      ctx.moveTo(tx + tSize * 0.5, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.55, ty + tSize * 0.45, tx + tSize, ty + tSize * 0.5);
                      ctx.stroke();

                      // 4. Highlight
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                      ctx.lineWidth = 0.75;
                      ctx.beginPath();
                      ctx.moveTo(tx + tSize * 0.48, ty);
                      ctx.quadraticCurveTo(tx + tSize * 0.53, ty + tSize * 0.47, tx + tSize, ty + tSize * 0.52);
                      ctx.stroke();

                      ctx.restore();
                    }

                    // Little random details (stumps, stones) placed deterministically
                    const hash = Math.abs(Math.sin(tile.x * 12.9898 + tile.y * 78.233) * 43758.5453) % 1;
                    if (hash < 0.08) {
                      // Stump: x = 902, y = 264, w = 41, h = 41
                      ctx.drawImage(sheet, 902, 264, 41, 41, tx + tSize * 0.15, ty + tSize * 0.15, tSize * 0.7, tSize * 0.7);
                    } else if (hash < 0.16) {
                      // Stone piles: x = 880, y = 114, w = 32, h = 25
                      ctx.drawImage(sheet, 880, 114, 32, 25, tx + tSize * 0.2, ty + tSize * 0.3, tSize * 0.6, tSize * 0.5);
                    }
                  }
                }
              }
            }

            // Draw resources if toggled on and this is the selected chunk containing the clicked tile
            const isSelectedChunk = selTile !== null && cx === selectedChunkX && cy === selectedChunkY;
            if (layers.resources && isSelectedChunk) {
              for (let lx = 0; lx < cSize; lx++) {
                for (let ly = 0; ly < cSize; ly++) {
                  const tile = tiles[lx][ly];
                  const tx = cx * cSize + lx;
                  const ty = cy * cSize + ly;
                  const hash = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
                  
                  if (hash < 0.15) {
                    const activeType = (tile.terrainType === 'river' && !layers.rivers) ? tile.baseTerrainType : tile.terrainType;
                    const resList = getResourcesForBiome(activeType);
                    if (resList.length > 0) {
                      const res = resList[Math.floor(hash * 100) % resList.length];
                      ctx.font = '14px Outfit, Inter, sans-serif';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillText(res.emoji, lx * tSize + tSize / 2, ly * tSize + tSize / 2);
                    }
                  }
                }
              }
            }

            // Draw debug overlays if toggled on
            if (layers.debugGrid) {
              // 1. Draw fine white borders around each tile
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.lineWidth = 1;
              for (let lx = 0; lx < cSize; lx++) {
                for (let ly = 0; ly < cSize; ly++) {
                  ctx.strokeRect(lx * tSize, ly * tSize, tSize, tSize);
                }
              }

              // 2. Draw thicker red border around the chunk boundary
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
              ctx.lineWidth = 4;
              ctx.strokeRect(0, 0, size, size);

              // 3. Write chunk coordinates [cx, cy] in bold red monospace font in the center
              ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
              ctx.font = 'bold 16px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`[${cx}, ${cy}]`, size / 2, size / 2);
            }
          }

          // Create PixiJS texture & sprite and position at absolute world coords
          const texture = Texture.from(canvasElement);
          const sprite = new Sprite(texture);
          sprite.x = cx * size;
          sprite.y = cy * size;

          chunksContainer.addChild(sprite);

          // Save chunk reference
          chunkCache.set(chunkKey, {
            sprite,
            texture,
            lastUsed: now,
          });
        }
      }
    }

    // 2. Least Recently Used (LRU) Culling of distant off-screen chunks
    if (chunkCache.size > 220) {
      const visibleKeys = new Set<string>();
      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cy = minCY; cy <= maxCY; cy++) {
          visibleKeys.add(`${cx},${cy}`);
        }
      }

      // Collect all chunks that are currently off-screen
      const candidates: { key: string; lastUsed: number }[] = [];
      for (const [key, val] of chunkCache.entries()) {
        if (!visibleKeys.has(key)) {
          candidates.push({ key, lastUsed: val.lastUsed });
        }
      }

      // Sort candidate chunks by last used time (oldest first)
      candidates.sort((a, b) => a.lastUsed - b.lastUsed);

      // Keep only up to 180 chunks (purging down to safety)
       const toRemoveCount = chunkCache.size - 180;
       for (let i = 0; i < Math.min(toRemoveCount, candidates.length); i++) {
         const key = candidates[i].key;
         const cached = chunkCache.get(key);
         if (cached) {
           if (chunksContainer.children.includes(cached.sprite)) {
             chunksContainer.removeChild(cached.sprite);
           }
           // Destroy both sprite and WebGL texture to release GPU memory completely
           cached.sprite.destroy({ children: true });
           cached.texture.destroy(true);
           chunkCache.delete(key);
           chunkTilesRef.current.delete(key); // Remove from tile grid cache
         }
       }
    }
  };

  // Maintain loadVisibleChunks in a ref so Pixi event handlers never hold old closures
  const loadVisibleChunksRef = useRef<() => void>(loadVisibleChunks);
  useEffect(() => {
    loadVisibleChunksRef.current = loadVisibleChunks;
  });

  const getTileAtScreenPosition = (clientX: number, clientY: number) => {
    const app = pixiAppRef.current;
    const worldContainer = worldContainerRef.current;
    if (!app || !worldContainer) return null;

    const rect = app.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const zoom = worldContainer.scale.x;
    
    // Map screen pixel coordinate to absolute world coordinate:
    const worldX = (screenX - worldContainer.x) / zoom;
    const worldY = (screenY - worldContainer.y) / zoom;

    // Map absolute world pixels to grid coordinate:
    const { tileSize: tSize, chunkSize: cSize } = configRef.current;
    const tileX = Math.floor(worldX / tSize);
    const tileY = Math.floor(worldY / tSize);

    // Map to chunk coordinates:
    const chunkX = Math.floor(tileX / cSize);
    const chunkY = Math.floor(tileY / cSize);
    const chunkKey = `${chunkX},${chunkY}`;

    const chunkGrid = chunkTilesRef.current.get(chunkKey);
    if (!chunkGrid) return null;

    // Get relative coordinate inside chunk:
    let lx = tileX % cSize;
    let ly = tileY % cSize;
    if (lx < 0) lx += cSize;
    if (ly < 0) ly += cSize;

    if (chunkGrid[lx] && chunkGrid[lx][ly]) {
      return chunkGrid[lx][ly];
    }
    return null;
  };

  // PixiJS Initialization
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let isMounted = true;
    let app: Application | null = null;
    let frameId: number | null = null;

    const initPixi = async () => {
      try {
        app = new Application();
        
        await app.init({
          resizeTo: container || window,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          antialias: false, // Sharp pixel art scaling
          backgroundColor: 0x0B0F19,
        });

        if (!isMounted) {
          app.destroy(true, { children: true });
          return;
        }

        pixiAppRef.current = app;
        container.appendChild(app.canvas);
        
        app.canvas.style.position = 'absolute';
        app.canvas.style.top = '0';
        app.canvas.style.left = '0';
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';
        app.canvas.style.display = 'block';

        const worldContainer = new Container();
        app.stage.addChild(worldContainer);
        worldContainerRef.current = worldContainer;

        const chunksContainer = new Container();
        worldContainer.addChild(chunksContainer);
        chunksContainerRef.current = chunksContainer;

        const hoverGraphics = new Graphics();
        worldContainer.addChild(hoverGraphics);
        hoverGraphicsRef.current = hoverGraphics;

        const selectGraphics = new Graphics();
        worldContainer.addChild(selectGraphics);
        selectGraphicsRef.current = selectGraphics;

        const viewportController = new ViewportController(
          worldContainer,
          app.canvas,
          () => {
            if (frameId === null) {
              frameId = requestAnimationFrame(() => {
                loadVisibleChunksRef.current();
                frameId = null;
              });
            }
          }
        );
        viewportControllerRef.current = viewportController;

        setIsReady(true);
      } catch (err: any) {
        console.error('PixiJS Initialization failed:', err);
        if (isMounted) {
          setCanvasError(err?.message || String(err));
        }
      }
    };

    initPixi();

    return () => {
      isMounted = false;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      if (viewportControllerRef.current) {
        viewportControllerRef.current.destroy();
      }
      
      const chunkCache = loadedChunksRef.current;
      for (const [_, cached] of chunkCache.entries()) {
        cached.sprite.destroy({ children: true });
        cached.texture.destroy(true);
      }
      chunkCache.clear();

      if (hoverGraphicsRef.current) {
        try { hoverGraphicsRef.current.destroy({ children: true }); } catch (e) {}
        hoverGraphicsRef.current = null;
      }
      if (selectGraphicsRef.current) {
        try { selectGraphicsRef.current.destroy({ children: true }); } catch (e) {}
        selectGraphicsRef.current = null;
      }
      if (chunksContainerRef.current) {
        try { chunksContainerRef.current.destroy({ children: true }); } catch (e) {}
        chunksContainerRef.current = null;
      }

      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // Ignore destruction errors
        }
      }
      pixiAppRef.current = null;
      viewportControllerRef.current = null;
      worldContainerRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Listen to configuration or version resets to purge all loaded chunks
  useEffect(() => {
    if (!isReady || !worldContainerRef.current || !chunksContainerRef.current) return;
    
    const chunksContainer = chunksContainerRef.current;
    const chunkCache = loadedChunksRef.current;
    
    // Destroy all current chunk sprites and textures
    for (const [_, cached] of chunkCache.entries()) {
      if (chunksContainer.children.includes(cached.sprite)) {
        chunksContainer.removeChild(cached.sprite);
      }
      cached.sprite.destroy({ children: true });
      cached.texture.destroy(true);
    }
    chunkCache.clear();
    
    // Preserves the camera viewport zoom/pan and simply loads new chunks at current view
    loadVisibleChunks();
  }, [generationVersion, isReady, selectedTile, texturesLoaded]);

  // Clean up legacy localStorage caches when the configuration changes
  useEffect(() => {
    cleanupLegacyLocalStorage(seed, octaves, persistence, lacunarity, noiseScale, redistribution, applyIslandMask, islandRadius, generationVersion);
  }, [seed, octaves, persistence, lacunarity, noiseScale, redistribution, applyIslandMask, islandRadius, generationVersion]);

  // Non-blocking asynchronous border chunk pre-generator background thread
  useEffect(() => {
    if (!isReady) return;

    let timeoutId: any = null;
    let active = true;

    const pregenerateLoop = () => {
      if (!active) return;

      const { minCX, maxCX, minCY, maxCY } = visibleBoundsRef.current;
      const {
        seed: currentSeed,
        chunkSize: cSize,
        octaves: octs,
        persistence: pers,
        lacunarity: lacu,
        noiseScale: nScale,
        redistribution: redis,
        applyIslandMask: islandMask,
        islandRadius: iRadius,
        generationVersion: genVer,
      } = configRef.current;

      // We pre-generate chunks in a 2-chunk buffer border around the viewport
      const border = 2;
      const bufferMinCX = minCX - border;
      const bufferMaxCX = maxCX + border;
      const bufferMinCY = minCY - border;
      const bufferMaxCY = maxCY + border;

      const prefix = `pworld_chunk_v2_${currentSeed}_${octs}_${pers}_${lacu}_${nScale}_${redis}_${islandMask}_${iRadius}_${genVer}_`;

      let chunkToGenerate: { cx: number; cy: number } | null = null;

      outerLoop:
      for (let cx = bufferMinCX; cx <= bufferMaxCX; cx++) {
        for (let cy = bufferMinCY; cy <= bufferMaxCY; cy++) {
          // Skip if the chunk is already in the visible area
          if (cx >= minCX && cx <= maxCX && cy >= minCY && cy <= maxCY) {
            continue;
          }

          const chunkKey = `${cx},${cy}`;
          const cacheKey = `${prefix}${cx}_${cy}`;

          // Check if it is already in memory or localStorage cache
          if (!chunkTilesRef.current.has(chunkKey) && !localStorage.getItem(cacheKey)) {
            chunkToGenerate = { cx, cy };
            break outerLoop;
          }
        }
      }

      if (chunkToGenerate) {
        const { cx, cy } = chunkToGenerate;
        
        // Generate chunk in background
        const tiles = generateChunk({
          chunkX: cx,
          chunkY: cy,
          chunkSize: cSize,
          seed: currentSeed,
          octaves: octs,
          persistence: pers,
          lacunarity: lacu,
          scale: nScale,
          redistribution: redis,
          applyIslandMask: islandMask,
          islandRadius: iRadius,
        });

        // Cache tile data for interaction lookups
        const chunkKey = `${cx},${cy}`;
        chunkTilesRef.current.set(chunkKey, tiles);

        // Compress and store in localStorage
        const compressed = tiles.map(row => row.map(tile => {
          const c: any = {
            e: parseFloat(tile.elevation.toFixed(3)),
            m: parseFloat(tile.moisture.toFixed(3)),
            t: parseFloat(tile.temperature.toFixed(3)),
            ty: tile.terrainType
          };
          if (tile.baseTerrainType !== tile.terrainType) c.bt = tile.baseTerrainType;
          if (tile.structure) c.s = tile.structure;
          if (tile.district) c.d = tile.district;
          if (tile.hasRoad) {
            c.r = 1;
            if (tile.roadType) c.rt = tile.roadType;
          }
          return c;
        }));

        const cacheKey = `${prefix}${cx}_${cy}`;
        saveToLocalStorage(cacheKey, JSON.stringify(compressed));

        // Schedule next chunk pre-generation quickly
        timeoutId = setTimeout(pregenerateLoop, 30);
      } else {
        // Nothing to pre-generate, wait and check again later
        timeoutId = setTimeout(pregenerateLoop, 300);
      }
    };

    // Initial delay before starting the pre-generator loop
    timeoutId = setTimeout(pregenerateLoop, 500);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isReady, seed, octaves, persistence, lacunarity, noiseScale, redistribution, applyIslandMask, islandRadius]);

  // Center camera when container becomes visible and gets non-zero dimensions
  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const container = containerRef.current;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && viewportControllerRef.current) {
          if (!hasCenteredRef.current) {
            const worldContainer = worldContainerRef.current;
            if (worldContainer) {
              worldContainer.scale.set(1.0);
              worldContainer.x = w / 2;
              worldContainer.y = h / 2;
              loadVisibleChunks();
              hasCenteredRef.current = true;
            }
          }
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isReady]);

  // Canvas interaction listeners
  useEffect(() => {
    const app = pixiAppRef.current;
    if (!isReady || !app) return;

    const canvas = app.canvas;
    
    // Store drag start coordinates
    let dragStartPos = { x: 0, y: 0 };
    let isMouseDown = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only track left clicks
      dragStartPos = { x: e.clientX, y: e.clientY };
      isMouseDown = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const tile = getTileAtScreenPosition(e.clientX, e.clientY);
      
      const currentHovered = useWorldStore.getState().hoveredTile;
      if (tile) {
        if (!currentHovered || currentHovered.x !== tile.x || currentHovered.y !== tile.y) {
          setHoveredTile(tile);
        }
      } else {
        if (currentHovered !== null) {
          setHoveredTile(null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Threshold: if dragged less than 5px, it's a click selection!
      if (dist < 5) {
        const tile = getTileAtScreenPosition(e.clientX, e.clientY);
        setSelectedTile(tile);
      }
    };

    const onPointerLeave = () => {
      isMouseDown = false;
      setHoveredTile(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [isReady]);

  // Render hover highlight
  useEffect(() => {
    const hoverGraphics = hoverGraphicsRef.current;
    if (!hoverGraphics) return;

    hoverGraphics.clear();

    if (hoveredTile) {
      const { tileSize: tSize } = configRef.current;
      const x = hoveredTile.x * tSize;
      const y = hoveredTile.y * tSize;

      hoverGraphics
        .rect(x, y, tSize, tSize)
        .fill({ color: 0x06B6D4, alpha: 0.12 })
        .stroke({ width: 2, color: 0x06B6D4, alpha: 0.75 });
    }
  }, [hoveredTile]);

  // Pulse animation & render selection highlight
  useEffect(() => {
    const app = pixiAppRef.current;
    if (!app) return;

    let pulseTime = 0;
    const pulseSpeed = 0.06;

    const pulseCallback = () => {
      const selectGraphics = selectGraphicsRef.current;
      if (!selectGraphics) return;

      if (!selectedTile) {
        selectGraphics.clear();
        return;
      }

      pulseTime += pulseSpeed;
      const alphaPulse = 0.5 + Math.sin(pulseTime) * 0.25; // pulse alpha between 0.25 and 0.75
      const { tileSize: tSize } = configRef.current;
      const x = selectedTile.x * tSize;
      const y = selectedTile.y * tSize;

      selectGraphics.clear()
        .rect(x, y, tSize, tSize)
        .fill({ color: 0x8B5CF6, alpha: 0.15 })
        .stroke({ width: 3, color: 0x8B5CF6, alpha: alphaPulse });
    };

    app.ticker.add(pulseCallback);
    return () => {
      app.ticker.remove(pulseCallback);
    };
  }, [selectedTile]);

  // Listen for teleport and zoom events from floating inspector / toolbar
  useEffect(() => {
    const handleCenterOnTile = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number }>;
      const { x, y } = customEvent.detail;
      
      const app = pixiAppRef.current;
      const worldContainer = worldContainerRef.current;
      if (!app || !worldContainer) return;

      const { tileSize: tSize } = configRef.current;
      const canvasWidth = app.canvas.clientWidth;
      const canvasHeight = app.canvas.clientHeight;

      // Absolute world center coordinates for the target tile
      const targetWorldX = (x + 0.5) * tSize;
      const targetWorldY = (y + 0.5) * tSize;

      // Smoothly zoom in to a premium viewing scale (e.g. 1.5x)
      const targetZoom = 1.5;
      worldContainer.scale.set(targetZoom);

      // Recenter viewport container so the target tile is at the screen center
      worldContainer.x = canvasWidth / 2 - targetWorldX * targetZoom;
      worldContainer.y = canvasHeight / 2 - targetWorldY * targetZoom;

      // Trigger chunk rendering for the new viewport position
      loadVisibleChunks();
    };

    const handleZoomIn = () => {
      const app = pixiAppRef.current;
      const worldContainer = worldContainerRef.current;
      if (!app || !worldContainer) return;

      const canvasWidth = app.canvas.clientWidth;
      const canvasHeight = app.canvas.clientHeight;
      const mouseX = canvasWidth / 2;
      const mouseY = canvasHeight / 2;

      // Center the zoom on the center of the screen
      const worldX = (mouseX - worldContainer.x) / worldContainer.scale.x;
      const worldY = (mouseY - worldContainer.y) / worldContainer.scale.y;

      let newScale = worldContainer.scale.x * 1.35;
      newScale = Math.min(24.0, newScale);

      worldContainer.scale.set(newScale);
      worldContainer.x = mouseX - worldX * newScale;
      worldContainer.y = mouseY - worldY * newScale;
      loadVisibleChunks();
    };

    const handleZoomOut = () => {
      const app = pixiAppRef.current;
      const worldContainer = worldContainerRef.current;
      if (!app || !worldContainer) return;

      const canvasWidth = app.canvas.clientWidth;
      const canvasHeight = app.canvas.clientHeight;
      const mouseX = canvasWidth / 2;
      const mouseY = canvasHeight / 2;

      // Center the zoom on the center of the screen
      const worldX = (mouseX - worldContainer.x) / worldContainer.scale.x;
      const worldY = (mouseY - worldContainer.y) / worldContainer.scale.y;

      let newScale = worldContainer.scale.x / 1.35;
      newScale = Math.max(0.1, newScale);

      worldContainer.scale.set(newScale);
      worldContainer.x = mouseX - worldX * newScale;
      worldContainer.y = mouseY - worldY * newScale;
      loadVisibleChunks();
    };

    window.addEventListener('center-on-tile', handleCenterOnTile);
    
    const handleRecenterEvent = () => {
      handleRecenter();
    };
    window.addEventListener('recenter-camera', handleRecenterEvent);
    window.addEventListener('zoom-in', handleZoomIn);
    window.addEventListener('zoom-out', handleZoomOut);

    return () => {
      window.removeEventListener('center-on-tile', handleCenterOnTile);
      window.removeEventListener('recenter-camera', handleRecenterEvent);
      window.removeEventListener('zoom-in', handleZoomIn);
      window.removeEventListener('zoom-out', handleZoomOut);
    };
  }, []);

  function handleRecenter() {
    const worldContainer = worldContainerRef.current;
    const app = pixiAppRef.current;
    if (worldContainer && app) {
      const canvasWidth = app.canvas.clientWidth;
      const canvasHeight = app.canvas.clientHeight;
      
      worldContainer.scale.set(1.0);
      worldContainer.x = canvasWidth / 2;
      worldContainer.y = canvasHeight / 2;
      
      loadVisibleChunks();
    }
  }

  if (canvasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-bold text-red-400">Map Rendering Failed</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          PixiJS WebGL/WebGPU context could not be initialized. Please check if hardware acceleration is enabled in your browser.
        </p>
        <pre className="mt-4 p-3 bg-slate-900 border border-red-500/20 rounded text-xs font-mono text-slate-300 max-w-md overflow-auto whitespace-pre-wrap">
          {canvasError}
        </pre>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {/* HUD overlay for user interactions */}
      {showMapHUD && (
        <div className="absolute top-[72px] left-4 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl text-slate-100 flex flex-col gap-2 max-w-xs pointer-events-auto">
          <h2 className="font-bold text-lg tracking-wide text-indigo-400">Interactive Map View</h2>
          <div className="text-xs text-slate-400 font-mono">
            <p>World: Infinite</p>
            <p>Scale: {tileSize}px / tile</p>
            <p>Format: {
              applyIslandMask === 'none'
                ? 'Infinite Continents'
                : applyIslandMask === 'single'
                ? 'Endless Central Island'
                : 'Infinite Archipelago'
            }</p>
            {applyIslandMask === 'single' && <p>Island Radius: {islandRadius} tiles</p>}
          </div>
          <button
            onClick={handleRecenter}
            className="mt-3 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md cursor-pointer hover:shadow-indigo-500/20 text-center"
          >
            Recenter Camera
          </button>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/40 text-[11px] text-slate-400 font-mono pointer-events-none select-none">
        Drag to Pan • Scroll to Zoom
      </div>
    </div>
  );
};
