import { useEffect, useState } from 'react';
import { useWorldStore } from './app/store/useWorldStore';
import { WorldCanvas } from './features/map/WorldCanvas';
import { TileInspector } from './features/map/TileInspector';
import { ChunkSandboxView } from './features/sandbox/ChunkSandboxView';

const PRESETS = [
  {
    name: '🌾 Endless Continents (Huge)',
    config: { octaves: 5, persistence: 0.5, scale: 350, redistribution: 1.1, applyIslandMask: 'none' as const, islandRadius: 96 },
  },
  {
    name: '🏔️ Highland Lakes',
    config: { octaves: 4, persistence: 0.5, scale: 50, redistribution: 1.2, applyIslandMask: 'archipelago' as const, islandRadius: 96 },
  },
  {
    name: '⛰️ Jagged Peaks',
    config: { octaves: 5, persistence: 0.6, scale: 28, redistribution: 1.9, applyIslandMask: 'none' as const, islandRadius: 64 },
  },
  {
    name: '🌟 Volcanic Archipelago',
    config: { octaves: 5, persistence: 0.55, scale: 35, redistribution: 1.5, applyIslandMask: 'archipelago' as const, islandRadius: 80 },
  },
];

function App() {
  const [error, setError] = useState<string | null>(null);
  const [layersExpanded, setLayersExpanded] = useState(true);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.message || event.error?.toString() || 'Unknown runtime error');
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setError(event.reason?.toString() || event.reason?.message || 'Unhandled promise rejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const {
    seed,
    octaves,
    persistence,
    scale,
    redistribution,
    applyIslandMask,
    islandRadius,
    mapViewMode,
    setMapViewMode,
    setSeed,
    updateConfig,
    regenerateWorld,
    visibleLayers,
    toggleLayer,
    sandboxActiveChunk,
    showMapHUD,
    showRecenterButton,
    sidebarCollapsed,
    setShowMapHUD,
    setShowRecenterButton,
    setSidebarCollapsed,
  } = useWorldStore();

  const MAP_VIEWS = [
    { mode: 'biomes', label: 'Biome View', icon: '🎨' },
    { mode: 'elevation', label: 'Elevation Map', icon: '⛰️' },
    { mode: 'moisture', label: 'Moisture Map', icon: '💧' },
    { mode: 'temperature', label: 'Temperature Map', icon: '🌡️' },
  ] as const;

  if (error) {
    return (
      <div className="p-8 bg-slate-950 text-red-400 font-mono min-h-screen flex flex-col gap-4">
        <h1 className="text-xl font-bold border-b border-red-500/30 pb-2 text-red-500 flex items-center gap-2">
          <span>⚠️</span> Runtime Error Detected
        </h1>
        <p className="text-slate-300 text-sm">
          The application crashed due to an unhandled exception. See details below:
        </p>
        <pre className="p-4 bg-slate-900 border border-red-500/20 rounded-lg text-xs overflow-auto max-h-96 text-slate-100 whitespace-pre-wrap">
          {error}
        </pre>
        <button
          onClick={() => { setError(null); window.location.reload(); }}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm cursor-pointer self-start transition-all"
        >
          Reload Application
        </button>
      </div>
    );
  }

  const handleRandomizeSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 12);
    setSeed(randomSeed);
  };

  const handlePresetSelect = (presetConfig: typeof PRESETS[0]['config']) => {
    updateConfig(presetConfig);
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar for settings and parameters */}
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 h-full shadow-2xl z-20 transition-all duration-300 ${
        sidebarCollapsed ? 'w-0 border-none overflow-hidden' : 'w-80'
      }`}>
        {/* Sidebar Header */}
        <header className="p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            <h1 className="font-extrabold text-lg tracking-wide bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Procedural World
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Phase 5: Procedural Rivers & Lakes</p>
        </header>

        {/* Scrollable Control Panels */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          
          {/* Seed Input */}
          <section className="flex flex-col gap-2.5">
            <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">World Seed</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                placeholder="Enter seed..."
              />
              <button
                onClick={handleRandomizeSeed}
                title="Randomize Seed"
                className="px-3 bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-indigo-400 text-sm font-semibold transition-all cursor-pointer"
              >
                🎲
              </button>
            </div>
          </section>

          {/* Quick Presets */}
          <section className="flex flex-col gap-2.5">
            <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Map Presets</label>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p.config)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/40 hover:bg-slate-800/80 border border-slate-800/60 hover:border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          {/* Map Visualization Layers */}
          <section className="flex flex-col gap-2.5">
            <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Visual Layers</label>
            <div className="grid grid-cols-2 gap-2">
              {MAP_VIEWS.map((v) => {
                const isActive = mapViewMode === v.mode;
                return (
                  <button
                    key={v.mode}
                    onClick={() => setMapViewMode(v.mode)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-semibold'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 hover:border-slate-700/60'
                     }`}
                  >
                    <span className="text-lg mb-1">{v.icon}</span>
                    <span className="text-[10px] leading-tight font-medium">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Map Layers Manager Accordion Panel */}
          <section className="flex flex-col gap-2.5">
            <button
              onClick={() => setLayersExpanded(!layersExpanded)}
              className="flex items-center justify-between w-full text-left cursor-pointer group"
            >
              <label className="text-xs font-bold tracking-wider text-slate-400 uppercase cursor-pointer flex items-center gap-1.5 group-hover:text-slate-200 transition-colors">
                🌐 Map Layers Manager
              </label>
              <span className="text-slate-500 group-hover:text-slate-300 text-xs transition-all duration-200">
                {layersExpanded ? '▼' : '►'}
              </span>
            </button>

            {layersExpanded && (
              <div className="flex flex-col gap-2.5 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/85 backdrop-blur-md shadow-2xl transition-all duration-300">
                
                {/* RPG Textures Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-355 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">👾</span>
                    <span>RPG Texture Pack</span>
                  </span>
                  <button
                    onClick={() => toggleLayer('textures')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.textures 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-850 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.textures ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Terrain Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-355 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🎨</span>
                    <span>Terrain Biomes</span>
                  </span>
                  <button
                    onClick={() => toggleLayer('terrain')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.terrain 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-850 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.terrain ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Rivers Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-355 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🌊</span>
                    <span>Rivers & Lakes</span>
                  </span>
                  <button
                    onClick={() => toggleLayer('rivers')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.rivers 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.rivers ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Resources Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-355 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">💎</span>
                    <span>Resource Nodes</span>
                  </span>
                  <button
                    onClick={() => toggleLayer('resources')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.resources 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.resources ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Roads Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-500 hover:text-slate-350 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🛣️</span>
                    <span className="flex items-center gap-1.5">
                      <span>Roads & Paths</span>
                      <span className="text-[9px] px-1 bg-slate-850/80 text-slate-500 rounded border border-slate-800/30 uppercase tracking-widest scale-90">Future</span>
                    </span>
                  </span>
                  <button
                    onClick={() => toggleLayer('roads')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.roads 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.roads ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* NPCs Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-500 hover:text-slate-350 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">👥</span>
                    <span className="flex items-center gap-1.5">
                      <span>NPC Simulation</span>
                      <span className="text-[9px] px-1 bg-slate-850/80 text-slate-500 rounded border border-slate-800/30 uppercase tracking-widest scale-90">Future</span>
                    </span>
                  </span>
                  <button
                    onClick={() => toggleLayer('npcs')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.npcs 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.npcs ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Buildings Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-500 hover:text-slate-350 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🏢</span>
                    <span className="flex items-center gap-1.5">
                      <span>City Buildings</span>
                      <span className="text-[9px] px-1 bg-slate-850/80 text-slate-500 rounded border border-slate-800/30 uppercase tracking-widest scale-90">Future</span>
                    </span>
                  </span>
                  <button
                    onClick={() => toggleLayer('buildings')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.buildings 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.buildings ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-slate-800/40 my-1" />

                {/* Debug Grid Layer Toggle */}
                <div className="flex items-center justify-between text-xs text-slate-355 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🌐</span>
                    <span>Debug Grid Overlay</span>
                  </span>
                  <button
                    onClick={() => toggleLayer('debugGrid')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      visibleLayers.debugGrid 
                        ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                        : 'bg-slate-855 border-slate-805'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                        visibleLayers.debugGrid ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>
            )}
          </section>

          {/* Dynamic Legend */}
          <section className="flex flex-col gap-2.5 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
            <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Map Legend</label>
            
            {mapViewMode === 'biomes' && (
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#1E3A8A] shrink-0" />
                  <span className="truncate">Deep Ocean</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#3B82F6] shrink-0" />
                  <span className="truncate">Shallow Water</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#FEF08A] shrink-0" />
                  <span className="truncate">Sandy Beach</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#10B981] shrink-0" />
                  <span className="truncate">Grasslands</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#047857] shrink-0" />
                  <span className="truncate">Dense Forest</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#F59E0B] shrink-0" />
                  <span className="truncate">Arid Desert</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#8B5E3C] shrink-0" />
                  <span className="truncate">Hills</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#F3F4F6] shrink-0" />
                  <span className="truncate">Mountains</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30">
                  <span className="w-2.5 h-2.5 rounded bg-[#FFFFFF] shrink-0 border border-slate-800" />
                  <span className="truncate">Snowy Peaks</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/30 col-span-2">
                  <span className="w-2.5 h-2.5 rounded bg-[#0EA5E9] shrink-0 animate-pulse" />
                  <span className="truncate">River / Lake (Freshwater)</span>
                </div>
              </div>
            )}

            {mapViewMode === 'elevation' && (
              <div className="flex flex-col gap-2 text-xs text-slate-300">
                <div className="h-3 w-full rounded bg-gradient-to-r from-black via-slate-500 to-white border border-slate-800" />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Sea Level (0.0)</span>
                  <span>Peaks (1.0)</span>
                </div>
              </div>
            )}

            {mapViewMode === 'moisture' && (
              <div className="flex flex-col gap-2 text-xs text-slate-300">
                <div className="h-3 w-full rounded bg-gradient-to-r from-[#DCBE78] to-[#10B9E6] border border-slate-800" />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Arid (0.0)</span>
                  <span>Lush (1.0)</span>
                </div>
              </div>
            )}

            {mapViewMode === 'temperature' && (
              <div className="flex flex-col gap-2 text-xs text-slate-300">
                <div className="h-3 w-full rounded bg-gradient-to-r from-[#1E3A8A] to-[#EF4444] border border-slate-800" />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>Freezing (0.0)</span>
                  <span>Volcanic (1.0)</span>
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-800" />

          {/* Noise Configurations */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Generation Settings</h3>
            
            {/* Island Radius Slider (Only shown in Single Island mode) */}
            {applyIslandMask === 'single' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 flex justify-between">
                  <span>Island Radius</span>
                  <span className="font-mono text-indigo-400 font-bold">{islandRadius} tiles</span>
                </label>
                <input
                  type="range"
                  min="32"
                  max="256"
                  step="8"
                  value={islandRadius}
                  onChange={(e) => {
                    updateConfig({ islandRadius: Number(e.target.value) });
                  }}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}

            {/* Scale Slider */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Scale (Frequency)</span>
                <span className="font-mono text-slate-300">{scale}</span>
              </label>
              <input
                type="range"
                min="10"
                max="600"
                step="1"
                value={scale}
                onChange={(e) => {
                  updateConfig({ scale: Number(e.target.value) });
                }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Octaves Slider */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Detail Layers (Octaves)</span>
                <span className="font-mono text-slate-300">{octaves}</span>
              </label>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={octaves}
                onChange={(e) => {
                  updateConfig({ octaves: Number(e.target.value) });
                }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Persistence Slider */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Detail Persistence</span>
                <span className="font-mono text-slate-300">{persistence.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={persistence}
                onChange={(e) => {
                  updateConfig({ persistence: Number(e.target.value) });
                }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Redistribution Slider */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 flex justify-between">
                <span>Redistribution (Power)</span>
                <span className="font-mono text-slate-300">{redistribution.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={redistribution}
                onChange={(e) => {
                  updateConfig({ redistribution: Number(e.target.value) });
                }}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* World Layout Selector */}
            <div className="flex flex-col gap-1.5 py-1">
              <span className="text-xs text-slate-400 font-medium">World Layout</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 gap-1">
                {(['none', 'single', 'archipelago'] as const).map((mode) => {
                  const label = mode === 'none' ? 'Continents' : mode === 'single' ? 'Single Island' : 'Archipelago';
                  const isActive = applyIslandMask === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => updateConfig({ applyIslandMask: mode })}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

          </section>

          {/* Interface HUD Preferences (Step 18) */}
          <section className="flex flex-col gap-2.5 bg-slate-950/30 p-3.5 rounded-xl border border-slate-800/80">
            <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">HUD Preferences</label>
            <div className="flex flex-col gap-2.5">
              {/* Toggle Recenter Button */}
              <div className="flex items-center justify-between text-xs text-slate-300 hover:text-slate-100 transition-colors">
                <span className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span>Recenter Button</span>
                </span>
                <button
                  onClick={() => setShowRecenterButton(!showRecenterButton)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showRecenterButton 
                      ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                      : 'bg-slate-850 border-slate-805'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                      showRecenterButton ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Map Viewport HUD */}
              <div className="flex items-center justify-between text-xs text-slate-300 hover:text-slate-100 transition-colors">
                <span className="flex items-center gap-2">
                  <span className="text-sm">👁️</span>
                  <span>Interactive Map HUD</span>
                </span>
                <button
                  onClick={() => setShowMapHUD(!showMapHUD)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showMapHUD 
                      ? 'bg-indigo-600/35 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                      : 'bg-slate-850 border-slate-805'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 shadow transition duration-200 ease-in-out ${
                      showMapHUD ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
        

        {/* Generate Button Section */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-2">
          <button
            onClick={() => regenerateWorld()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer text-center"
          >
            Regenerate World
          </button>
        </div>
      </aside>

      {/* Main Canvas Viewport */}
      <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
        {/* Floating Toolbar (Step 18 Toggle Menu & Standalone Recenter Camera) */}
        <div className="absolute top-4 left-4 z-30 flex gap-2 pointer-events-auto select-none">
          {/* Menu Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850/95 active:bg-slate-800/95 text-slate-100 border border-slate-800/80 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs font-bold font-sans"
            title={sidebarCollapsed ? "Expand Settings Menu" : "Collapse Settings Menu"}
          >
            <span>{sidebarCollapsed ? '➡️' : '⬅️'}</span>
            <span>{sidebarCollapsed ? 'Show Menu' : 'Hide Menu'}</span>
          </button>

          {/* Standalone Recenter Camera Button */}
          {showRecenterButton && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('recenter-camera'));
              }}
              className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850/95 active:bg-slate-800/95 text-indigo-300 border border-slate-800/80 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs font-bold font-sans"
              title="Recenter World Map Camera"
            >
              <span>🎯</span>
              <span>Recenter</span>
            </button>
          )}

          {/* Zoom In Button */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('zoom-in'));
            }}
            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850/95 active:bg-slate-800/95 text-emerald-400 border border-slate-800/80 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs font-bold font-sans"
            title="Zoom In"
          >
            <span>➕</span>
            <span>Zoom In</span>
          </button>

          {/* Zoom Out Button */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('zoom-out'));
            }}
            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850/95 active:bg-slate-800/95 text-rose-400 border border-slate-800/80 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] text-xs font-bold font-sans"
            title="Zoom Out"
          >
            <span>➖</span>
            <span>Zoom Out</span>
          </button>
        </div>

        <WorldCanvas />
        <TileInspector />
      </main>

      {/* Render detailed 16x16 interactive chunk sandbox simulation */}
      {sandboxActiveChunk && <ChunkSandboxView />}
    </div>
  );
}

export default App;
