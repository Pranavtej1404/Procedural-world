import React, { useEffect, useRef } from 'react';
import { useWorldStore } from '../../app/store/useWorldStore';
import { getResourcesForBiome } from '../../core/world/resources';
import type { TerrainType } from '../../core/world/terrain';

const BIOME_DETAILS: Record<TerrainType, { label: string; emoji: string; color: string; desc: string }> = {
  deep_water: { 
    label: 'Deep Ocean', 
    emoji: '🌊', 
    color: 'from-blue-900 to-indigo-950',
    desc: 'Brimming with ancient secrets and deep-sea creatures.'
  },
  water: { 
    label: 'Shallow Water', 
    emoji: '💧', 
    color: 'from-blue-500 to-blue-700',
    desc: 'Lush coastal waters shimmering in the sunlight.'
  },
  beach: { 
    label: 'Sandy Beach', 
    emoji: '🏖️', 
    color: 'from-yellow-400/80 to-amber-500/85',
    desc: 'Warm sands bordering the endless sea.'
  },
  grass: { 
    label: 'Grasslands', 
    emoji: '🌾', 
    color: 'from-emerald-500/80 to-teal-600/80',
    desc: 'Rolling plains of wild grass and gentle winds.'
  },
  forest: { 
    label: 'Dense Forest', 
    emoji: '🌲', 
    color: 'from-emerald-800 to-green-950',
    desc: 'An ancient canopy rich in timber and wildlife.'
  },
  desert: { 
    label: 'Arid Desert', 
    emoji: '🏜️', 
    color: 'from-amber-500 to-orange-600',
    desc: 'Dunes stretching to the horizon, baking in the heat.'
  },
  hills: {
    label: 'Hills',
    emoji: '⛰️',
    color: 'from-amber-800 to-amber-950 text-amber-200',
    desc: 'Gentle, clay-rich rising slopes with rolling trails.'
  },
  mountain: { 
    label: 'Mountains', 
    emoji: '🏔️', 
    color: 'from-slate-100 to-zinc-200 text-slate-900', // Snowy white/light gray background
    desc: 'Soaring rock structures rich in mineral ores.'
  },
  snow: { 
    label: 'Snowy Peaks', 
    emoji: '❄️', 
    color: 'from-sky-200/90 to-slate-200/90 text-slate-900',
    desc: 'Glacial heights gripped in eternal winter.'
  },
  river: { 
    label: 'River / Lake', 
    emoji: '🏞️', 
    color: 'from-cyan-500 to-sky-600',
    desc: 'Freshwater flows nourishing the surrounding terrain.'
  },
};

export const TileInspector: React.FC = () => {
  const selectedTile = useWorldStore((state) => state.selectedTile);
  const hoveredTile = useWorldStore((state) => state.hoveredTile);
  const setSelectedTile = useWorldStore((state) => state.setSelectedTile);
  const setSandboxActiveChunk = useWorldStore((state) => state.setSandboxActiveChunk);
  const chunkSize = useWorldStore((state) => state.chunkSize);

  const handleEnterSandbox = () => {
    if (!selectedTile) return;
    const cx = Math.floor(selectedTile.x / chunkSize);
    const cy = Math.floor(selectedTile.y / chunkSize);
    setSandboxActiveChunk({ cx, cy });
  };

  const tooltipRef = useRef<HTMLDivElement>(null);

  // Smooth mouse tracking for the tooltip using direct DOM manipulation to maintain locked 60FPS
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const x = e.clientX + 15;
      const y = e.clientY + 15;

      // Adjust tooltip position to stay within window boundaries
      const tooltipWidth = 200;
      const tooltipHeight = 110;
      const adjustedX = x + tooltipWidth > window.innerWidth ? e.clientX - tooltipWidth - 15 : x;
      const adjustedY = y + tooltipHeight > window.innerHeight ? e.clientY - tooltipHeight - 15 : y;

      tooltip.style.transform = `translate3d(${adjustedX}px, ${adjustedY}px, 0)`;
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  const handleCenterOnTile = () => {
    if (!selectedTile) return;
    const event = new CustomEvent('center-on-tile', {
      detail: { x: selectedTile.x, y: selectedTile.y },
    });
    window.dispatchEvent(event);
  };

  const selectedBiome = selectedTile ? BIOME_DETAILS[selectedTile.terrainType] : null;
  const hoveredBiome = hoveredTile ? BIOME_DETAILS[hoveredTile.terrainType] : null;
  const resources = selectedTile ? getResourcesForBiome(selectedTile.terrainType) : [];

  return (
    <>
      {/* 1. Performant Cursor Hover Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed top-0 left-0 z-50 pointer-events-none select-none w-52 p-3.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-2xl transition-opacity duration-200 flex flex-col gap-1.5 ${
          hoveredTile && !selectedTile ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ willChange: 'transform' }}
      >
        {hoveredTile && hoveredBiome && (
          <>
            <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
              <span className="text-lg">{hoveredBiome.emoji}</span>
              <span className="font-bold text-xs text-slate-100 tracking-wide">
                {hoveredBiome.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex flex-col gap-0.5">
              <p className="flex justify-between">
                <span>Coord:</span>
                <span className="text-slate-200">({hoveredTile.x}, {hoveredTile.y})</span>
              </p>
              <p className="flex justify-between">
                <span>Elevation:</span>
                <span className="text-emerald-400">{(hoveredTile.elevation).toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Moisture:</span>
                <span className="text-sky-400">{(hoveredTile.moisture).toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Temp:</span>
                <span className="text-rose-400">{(hoveredTile.temperature).toFixed(2)}</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* 2. Glassmorphic Detail Inspector Card */}
      <div
        className={`fixed bottom-4 right-4 z-40 w-80 sm:w-96 bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col gap-4 overflow-hidden ${
          selectedTile ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
        }`}
      >
        {selectedTile && selectedBiome && (
          <>
            {/* Header with Biome gradient and Emoji */}
            <div className={`p-4 bg-gradient-to-r ${selectedBiome.color} relative overflow-hidden flex items-center justify-between shadow-lg`}>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-80 font-mono">
                  Selected Biome
                </span>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <span>{selectedBiome.emoji}</span>
                  <span>{selectedBiome.label}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedTile(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/35 text-white/80 hover:text-white transition-all cursor-pointer font-bold border border-white/10"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="px-5 pb-5 flex flex-col gap-4 text-slate-200">
              {/* Short Bio */}
              <p className="text-xs text-slate-400 italic leading-relaxed border-b border-slate-800/60 pb-3">
                "{selectedBiome.desc}"
              </p>

              {/* Physical Variables */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Physical Statistics
                </h4>

                {/* Elevation progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">⛰️ Elevation</span>
                    <span className="font-semibold text-slate-200">{(selectedTile.elevation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      style={{ width: `${selectedTile.elevation * 100}%` }}
                    />
                  </div>
                </div>

                {/* Moisture progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">💧 Moisture</span>
                    <span className="font-semibold text-slate-200">{(selectedTile.moisture * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      style={{ width: `${selectedTile.moisture * 100}%` }}
                    />
                  </div>
                </div>

                {/* Temperature progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">🔥 Temperature</span>
                    <span className="font-semibold text-slate-200">{(selectedTile.temperature * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden border border-slate-800/40">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                      style={{ width: `${selectedTile.temperature * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates Panel */}
              <div className="bg-slate-950/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Grid Coordinates</span>
                <span className="font-bold text-indigo-400">
                  X: {selectedTile.x} &bull; Y: {selectedTile.y}
                </span>
              </div>

              {/* Resources Panel */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Available Resources
                </h4>
                {resources.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                    {resources.map((res, index) => {
                      // Custom Tailwind badge classes based on rarity
                      let badgeClass = 'bg-slate-800/60 text-slate-300 border border-slate-700/50';
                      if (res.rarity === 'Legendary') {
                        badgeClass = 'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse';
                      } else if (res.rarity === 'Rare') {
                        badgeClass = 'bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30';
                      } else if (res.rarity === 'Uncommon') {
                        badgeClass = 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30';
                      }
                      
                      return (
                        <div
                          key={index}
                          className="flex items-start gap-2.5 p-2 bg-slate-950/30 hover:bg-slate-950/50 border border-slate-850 rounded-xl transition-all duration-200"
                        >
                          <span className="text-xl mt-0.5">{res.emoji}</span>
                          <div className="flex flex-col flex-1 gap-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-100">{res.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.25 rounded-md uppercase tracking-wider font-mono ${badgeClass}`}>
                                {res.rarity}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">{res.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No resources found in this barren land.</p>
                )}
              </div>

              {/* Sandbox Simulation Trigger */}
              <button
                onClick={handleEnterSandbox}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:from-violet-700 active:to-indigo-700 text-white rounded-xl font-bold text-xs tracking-wider shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer border border-violet-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                🎮 Enter Detailed Sandbox View
              </button>

              {/* Action Buttons */}
              <div className="flex gap-2.5 border-t border-slate-800/60 pt-3">
                <button
                  onClick={handleCenterOnTile}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-medium text-xs tracking-wide transition-all duration-200 shadow-md cursor-pointer hover:shadow-indigo-500/20 text-center flex items-center justify-center gap-1.5"
                >
                  🎯 Teleport Camera
                </button>
                <button
                  onClick={() => setSelectedTile(null)}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-300 rounded-xl font-medium text-xs transition-all duration-200 border border-slate-700/50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
