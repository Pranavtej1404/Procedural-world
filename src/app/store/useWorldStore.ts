import { create } from 'zustand';
import type { Tile } from '../../features/generation/terrainGenerator';

export interface LayerVisibility {
  terrain: boolean;
  rivers: boolean;
  resources: boolean;
  roads: boolean;
  npcs: boolean;
  buildings: boolean;
  textures: boolean;
  debugGrid: boolean;
}

export interface WorldState {
  seed: string;
  tileSize: number;
  chunkSize: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  scale: number;
  redistribution: number;
  applyIslandMask: 'none' | 'single' | 'archipelago';
  islandRadius: number; // in tiles
  mapViewMode: 'biomes' | 'elevation' | 'moisture' | 'temperature';
  generationVersion: number; // incremented to force cache purges
  hoveredTile: Tile | null;
  selectedTile: Tile | null;
  visibleLayers: LayerVisibility;
  sandboxActiveChunk: { cx: number; cy: number } | null;
  sandboxTiles: Tile[][] | null;
  showMapHUD: boolean;
  showRecenterButton: boolean;
  sidebarCollapsed: boolean;

  // Actions
  setSeed: (seed: string) => void;
  updateConfig: (config: Partial<Omit<WorldState, 'setSeed' | 'updateConfig' | 'regenerateWorld' | 'setMapViewMode' | 'hoveredTile' | 'selectedTile' | 'setHoveredTile' | 'setSelectedTile' | 'visibleLayers' | 'toggleLayer' | 'sandboxActiveChunk' | 'setSandboxActiveChunk' | 'sandboxTiles' | 'setSandboxTiles' | 'updateSandboxTile' | 'setShowMapHUD' | 'setShowRecenterButton' | 'setSidebarCollapsed'>>) => void;
  setMapViewMode: (mode: 'biomes' | 'elevation' | 'moisture' | 'temperature') => void;
  regenerateWorld: () => void;
  setHoveredTile: (tile: Tile | null) => void;
  setSelectedTile: (tile: Tile | null) => void;
  toggleLayer: (layerKey: keyof LayerVisibility) => void;
  setSandboxActiveChunk: (chunk: { cx: number; cy: number } | null) => void;
  setSandboxTiles: (tiles: Tile[][] | null) => void;
  updateSandboxTile: (lx: number, ly: number, tileUpdate: Partial<Tile>) => void;
  setShowMapHUD: (show: boolean) => void;
  setShowRecenterButton: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  seed: 'procedural-adventures',
  tileSize: 32,
  chunkSize: 16,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2.0,
  scale: 350,
  redistribution: 1.1,
  applyIslandMask: 'none',
  islandRadius: 96, // 96 tiles radius (~3072px)
  mapViewMode: 'biomes',
  generationVersion: 0,
  hoveredTile: null,
  selectedTile: null,
  visibleLayers: {
    terrain: true,
    rivers: true,
    resources: true,
    roads: true,
    npcs: true,
    buildings: true,
    textures: true,
    debugGrid: false,
  },
  sandboxActiveChunk: null,
  sandboxTiles: null,
  showMapHUD: true,
  showRecenterButton: true,
  sidebarCollapsed: false,

  setSeed: (seed) => set((state) => ({ 
    seed, 
    hoveredTile: null,
    selectedTile: null,
    generationVersion: state.generationVersion + 1 
  })),
  
  updateConfig: (config) => set((state) => ({ 
    ...state, 
    ...config, 
    hoveredTile: null,
    selectedTile: null,
    generationVersion: state.generationVersion + 1 
  })),

  setMapViewMode: (mapViewMode) => set((state) => ({
    mapViewMode,
    generationVersion: state.generationVersion + 1
  })),

  regenerateWorld: () => set((state) => ({ 
    hoveredTile: null,
    selectedTile: null,
    generationVersion: state.generationVersion + 1 
  })),

  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
  setSelectedTile: (selectedTile) => set({ selectedTile }),
  toggleLayer: (layerKey) => set((state) => ({
    visibleLayers: {
      ...state.visibleLayers,
      [layerKey]: !state.visibleLayers[layerKey]
    },
    generationVersion: state.generationVersion + 1
  })),

  setSandboxActiveChunk: (sandboxActiveChunk) => set({ sandboxActiveChunk }),
  setSandboxTiles: (sandboxTiles) => set({ sandboxTiles }),
  updateSandboxTile: (lx, ly, tileUpdate) => set((state) => {
    if (!state.sandboxTiles) return {};
    const newTiles = [...state.sandboxTiles];
    newTiles[lx] = [...newTiles[lx]];
    newTiles[lx][ly] = {
      ...newTiles[lx][ly],
      ...tileUpdate,
    };
    return { sandboxTiles: newTiles };
  }),
  setShowMapHUD: (showMapHUD) => set({ showMapHUD }),
  setShowRecenterButton: (showRecenterButton) => set({ showRecenterButton }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
