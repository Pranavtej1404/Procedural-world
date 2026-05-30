import React, { useEffect, useState } from 'react';
import { useWorldStore } from '../../app/store/useWorldStore';
import { generateChunk } from '../generation/terrainGenerator';
import type { Tile } from '../generation/terrainGenerator';

// --- CUSTOM SVG GAME COMPONENTS ---

const SVGTree: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-sway select-none pointer-events-none origin-bottom">
    {/* Shadow */}
    <ellipse cx="16" cy="27" rx="7" ry="2.5" fill="rgba(0,0,0,0.15)" />
    {/* Trunk */}
    <rect x="14" y="21" width="4" height="7" rx="1" fill="#78350F" />
    {/* Volumetric Foliage layers */}
    <path d="M16 2L6 17H26L16 2Z" fill="#064E3B" />
    <path d="M16 5L8 15H24L16 5Z" fill="#047857" />
    <path d="M16 8L10 13H22L16 8Z" fill="#10B981" />
  </svg>
);

const SVGCactus: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-sway select-none pointer-events-none origin-bottom">
    <ellipse cx="16" cy="27" rx="5" ry="2" fill="rgba(0,0,0,0.12)" />
    {/* Main trunk */}
    <rect x="14" y="6" width="4" height="22" rx="2" fill="#065F46" />
    <rect x="15" y="7" width="2" height="20" rx="1" fill="#059669" />
    {/* Left arm */}
    <path d="M14 16H10V11H12V14H14V16Z" fill="#065F46" />
    <path d="M13 15H11V12H12V14H13V15Z" fill="#059669" />
    {/* Right arm */}
    <path d="M18 13H22V8H20V11H18V13Z" fill="#065F46" />
    <path d="M19 12H21V9H20V11H19V12Z" fill="#059669" />
  </svg>
);

const SVGMineral: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none pointer-events-none">
    <ellipse cx="16" cy="26" rx="8" ry="2.5" fill="rgba(0,0,0,0.18)" />
    {/* Stone shapes */}
    <path d="M6 22L11 11L21 9L26 17L24 24H8L6 22Z" fill="#4B5563" />
    <path d="M8 21L12 13L20 11L23 17L21 23H10L8 21Z" fill="#6B7280" />
    {/* Shimmering Gold Crystals */}
    <path d="M11 15L13 13L15 15L17 12L19 14" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 2px rgba(245,158,11,0.85))" }} />
    <circle cx="12" cy="19" r="1.5" fill="#FEF08A" />
    <circle cx="21" cy="15" r="1" fill="#FEF08A" />
  </svg>
);

const SVGCottage: React.FC<{ size?: number; isNight?: boolean }> = ({ size = 42, isNight = false }) => (
  <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
    {/* Chimney smoke puffs */}
    <div className="absolute top-0 right-3 flex flex-col gap-1 z-25 pointer-events-none">
      <div className="w-2.5 h-2.5 bg-slate-400/30 rounded-full animate-smoke" style={{ animationDelay: '0s' }} />
      <div className="w-2 h-2 bg-slate-400/20 rounded-full animate-smoke" style={{ animationDelay: '1.2s' }} />
    </div>
    
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="16" cy="27" rx="10" ry="3" fill="rgba(0,0,0,0.2)" />
      {/* Timber log walls */}
      <rect x="7" y="14" width="18" height="13" rx="1.5" fill="#78350F" />
      <rect x="9" y="16" width="14" height="11" rx="0.5" fill="#A16207" />
      {/* Slanted Roof */}
      <path d="M4 14L16 3L28 14H4Z" fill="#991B1B" />
      <path d="M6 14L16 5L26 14H6Z" fill="#DC2626" />
      {/* Chimney stack */}
      <rect x="21" y="6" width="3" height="6" fill="#4B5563" />
      {/* Arch door */}
      <rect x="14" y="20" width="4" height="7" rx="1" fill="#451A03" />
      {/* Glowing Lantern/Window at Night */}
      <rect
        x="9"
        y="18"
        width="3.5"
        height="3.5"
        rx="0.5"
        fill={isNight ? "#FEF08A" : "#9CA3AF"}
        style={isNight ? { filter: "drop-shadow(0 0 5px rgba(254,240,138,0.95))" } : {}}
      />
    </svg>
  </div>
);

const SVGTownHall: React.FC<{ size?: number; isNight?: boolean }> = ({ size = 42, isNight = false }) => (
  <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="16" cy="27" rx="11" ry="3" fill="rgba(0,0,0,0.22)" />
      
      {/* Base Central Keep */}
      <rect x="7" y="12" width="18" height="14" rx="1" fill="#64748B" />
      
      {/* Left & Right Towers */}
      <rect x="4" y="10" width="5" height="16" rx="0.5" fill="#475569" />
      <rect x="23" y="10" width="5" height="16" rx="0.5" fill="#475569" />
      
      {/* Tower Crenellations */}
      <path d="M4 10H6V8H7V10H9V8H9V10" stroke="#334155" strokeWidth="1" />
      <path d="M23 10H25V8H26V10H28V8H28V10" stroke="#334155" strokeWidth="1" />

      {/* Central Tower Roof / Blue Dome */}
      <path d="M7 12L16 4L25 12H7Z" fill="#1D4ED8" />
      
      {/* Flagpole & Crimson Flag */}
      <line x1="16" y1="4" x2="16" y2="0.5" stroke="#EAB308" strokeWidth="1" />
      <path d="M16 0.5L21 2L16 3.5V0.5Z" fill="#DC2626" />

      {/* Arched Door */}
      <path d="M13 26C13 23 19 23 19 26H13Z" fill="#451A03" />

      {/* Glowing Lantern/Windows */}
      <rect x="5.5" y="13" width="2" height="3" rx="0.5" fill={isNight ? "#FEF08A" : "#9CA3AF"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
      <rect x="24.5" y="13" width="2" height="3" rx="0.5" fill={isNight ? "#FEF08A" : "#9CA3AF"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
      
      <rect x="11.5" y="15" width="2.5" height="3.5" rx="0.5" fill={isNight ? "#FEF08A" : "#9CA3AF"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
      <rect x="18" y="15" width="2.5" height="3.5" rx="0.5" fill={isNight ? "#FEF08A" : "#9CA3AF"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
    </svg>
  </div>
);

const SVGHouse: React.FC<{ size?: number; isNight?: boolean; district?: string }> = ({
  size = 40,
  isNight = false,
  district = 'residential',
}) => {
  if (district === 'commercial') {
    return (
      <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
        {/* Decorative street lanterns glow at night */}
        {isNight && (
          <>
            <div className="absolute top-[18px] left-[6px] w-[5px] h-[5px] bg-yellow-200/90 rounded-full animate-pulse shadow-[0_0_8px_rgba(254,240,138,0.95)] z-25" />
            <div className="absolute top-[18px] right-[6px] w-[5px] h-[5px] bg-yellow-200/90 rounded-full animate-pulse shadow-[0_0_8px_rgba(254,240,138,0.95)] z-25" />
          </>
        )}
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="16" cy="27" rx="10" ry="2.5" fill="rgba(0,0,0,0.2)" />
          {/* Shop Body */}
          <rect x="5" y="12" width="22" height="14" rx="1" fill="#D97706" />
          <rect x="6" y="13" width="20" height="12" rx="0.5" fill="#F59E0B" />
          
          {/* Flat Slate Roof */}
          <rect x="4" y="9" width="24" height="3" rx="0.5" fill="#475569" />
          
          {/* Striped Red and White Awning */}
          <path d="M4 12 H28 L26 17 H6 Z" fill="#EF4444" />
          {/* White stripes */}
          <path d="M7 12 H10 L9 17 H6 Z" fill="#F8FAFC" />
          <path d="M14 12 H17 L16 17 H13 Z" fill="#F8FAFC" />
          <path d="M21 12 H24 L23 17 H20 Z" fill="#F8FAFC" />

          {/* Large Bay Window */}
          <rect x="7" y="18" width="10" height="6" rx="0.5" fill={isNight ? "#FEF08A" : "#E2E8F0"} style={isNight ? { filter: "drop-shadow(0 0 4px rgba(254,240,138,0.95))" } : {}} />
          <rect x="7" y="18" width="10" height="6" rx="0.5" stroke="#78350F" strokeWidth="0.75" />
          <line x1="12" y1="18" x2="12" y2="24" stroke="#78350F" strokeWidth="0.5" />
          
          {/* Potion display details */}
          <circle cx="9.5" cy="22" r="0.8" fill="#EC4899" />
          <circle cx="14.5" cy="22" r="0.8" fill="#06B6D4" />

          {/* Dark Brown door */}
          <rect x="19" y="17" width="6" height="8" rx="0.5" fill="#78350F" />
          <circle cx="21" cy="21" r="0.5" fill="#EAB308" />

          {/* Hanging sign */}
          <rect x="13" y="6" width="6" height="3" fill="#78350F" />
          <line x1="14" y1="9" x2="14" y2="12" stroke="#451A03" strokeWidth="0.75" />
          <line x1="18" y1="9" x2="18" y2="12" stroke="#451A03" strokeWidth="0.75" />
        </svg>
      </div>
    );
  }

  if (district === 'industrial') {
    return (
      <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
        {/* Smoke from industrial furnace */}
        <div className="absolute top-0 right-2.5 flex flex-col gap-1 z-25 pointer-events-none">
          <div className="w-2.5 h-2.5 bg-slate-500/30 rounded-full animate-smoke" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-slate-500/20 rounded-full animate-smoke" style={{ animationDelay: '1.1s' }} />
        </div>
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="16" cy="27" rx="10" ry="2.5" fill="rgba(0,0,0,0.22)" />
          
          {/* Brick Furnace Chimney Stack */}
          <rect x="22" y="4" width="4" height="20" fill="#4B5563" />
          <rect x="21" y="3" width="6" height="2" fill="#1F2937" />

          {/* Stone Wall Base */}
          <rect x="5" y="13" width="18" height="13" rx="1" fill="#4B5563" />
          <rect x="6" y="14" width="16" height="11" rx="0.5" fill="#6B7280" />

          {/* Brick lines detail */}
          <line x1="6" y1="17" x2="22" y2="17" stroke="#374151" strokeWidth="0.5" />
          <line x1="6" y1="21" x2="22" y2="21" stroke="#374151" strokeWidth="0.5" />
          <line x1="11" y1="14" x2="11" y2="17" stroke="#374151" strokeWidth="0.5" />
          <line x1="17" y1="14" x2="17" y2="17" stroke="#374151" strokeWidth="0.5" />
          <line x1="14" y1="17" x2="14" y2="21" stroke="#374151" strokeWidth="0.5" />
          <line x1="9" y1="21" x2="9" y2="25" stroke="#374151" strokeWidth="0.5" />
          <line x1="15" y1="21" x2="15" y2="25" stroke="#374151" strokeWidth="0.5" />

          {/* Slanted Iron Roof */}
          <path d="M3 13 L14 5 L25 13 Z" fill="#1F2937" />
          <path d="M4 13 L14 6 L24 13 Z" fill="#374151" />

          {/* Iron Gears detail */}
          <circle cx="10" cy="10" r="2" fill="#4B5563" stroke="#1F2937" strokeWidth="0.75" />
          <line x1="10" y1="8" x2="10" y2="12" stroke="#1F2937" strokeWidth="0.5" />
          <line x1="8" y1="10" x2="12" y2="10" stroke="#1F2937" strokeWidth="0.5" />

          {/* Heavy iron door */}
          <rect x="13" y="18" width="6" height="7" rx="0.5" fill="#111827" />
          <line x1="13" y1="21" x2="19" y2="21" stroke="#4B5563" strokeWidth="0.75" />
          <circle cx="17.5" cy="21.5" r="0.5" fill="#9CA3AF" />

          {/* Glowing Forge Heat Slit */}
          <rect x="8" y="19" width="3" height="3" fill={isNight ? "#F97316" : "#451A03"} style={isNight ? { filter: "drop-shadow(0 0 4px #F97316)" } : {}} />
        </svg>
      </div>
    );
  }

  // Default: Residential
  return (
    <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="16" cy="27" rx="9" ry="2.5" fill="rgba(0,0,0,0.18)" />
        
        {/* Log cabin timber logs */}
        <rect x="7" y="14" width="18" height="12" rx="1" fill="#CA8A04" />
        <line x1="7" y1="17" x2="25" y2="17" stroke="#78350F" strokeWidth="0.75" />
        <line x1="7" y1="20" x2="25" y2="20" stroke="#78350F" strokeWidth="0.75" />
        <line x1="7" y1="23" x2="25" y2="23" stroke="#78350F" strokeWidth="0.75" />

        {/* Slanted Clay-Red Roof */}
        <path d="M5 14L16 4L27 14H5Z" fill="#B91C1C" />
        <path d="M5 14L16 4L27 14" stroke="#991B1B" strokeWidth="1" />
        <path d="M9 11L16 5.5L23 11" stroke="#DC2626" strokeWidth="0.75" />

        {/* Dark Brown door */}
        <rect x="14" y="20" width="4" height="6" rx="0.5" fill="#78350F" />
        <circle cx="17.2" cy="23" r="0.4" fill="#FEF08A" />
        
        {/* Glowing windows with flower boxes */}
        <rect x="9.5" y="16.5" width="3" height="3" fill={isNight ? "#FEF08A" : "#FEF9C3"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
        <rect x="19.5" y="16.5" width="3" height="3" fill={isNight ? "#FEF08A" : "#FEF9C3"} style={isNight ? { filter: "drop-shadow(0 0 3px rgba(254,240,138,0.95))" } : {}} />
        
        <rect x="9.5" y="16.5" width="3" height="3" stroke="#78350F" strokeWidth="0.5" />
        <rect x="19.5" y="16.5" width="3" height="3" stroke="#78350F" strokeWidth="0.5" />

        {/* Flowerbox */}
        <rect x="9" y="19.5" width="4" height="1" fill="#16A34A" />
        <rect x="19" y="19.5" width="4" height="1" fill="#16A34A" />
        <circle cx="10" cy="19.5" r="0.4" fill="#EF4444" />
        <circle cx="12" cy="19.5" r="0.4" fill="#EAB308" />
        <circle cx="20" cy="19.5" r="0.4" fill="#EF4444" />
        <circle cx="22" cy="19.5" r="0.4" fill="#EAB308" />
      </svg>
    </div>
  );
};

const SVGRoad: React.FC<{ north?: boolean; south?: boolean; east?: boolean; west?: boolean }> = ({
  north = false,
  south = false,
  east = false,
  west = false,
}) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 select-none pointer-events-none">
    {/* Base road square in center */}
    <rect x="12" y="12" width="16" height="16" rx="2" fill="#78716C" />
    {/* Cobblestone texture details */}
    <rect x="14" y="14" width="5" height="5" rx="0.5" fill="#57534E" />
    <rect x="20" y="14" width="6" height="5" rx="0.5" fill="#44403C" />
    <rect x="14" y="20" width="7" height="6" rx="0.5" fill="#44403C" />
    <rect x="22" y="20" width="4" height="6" rx="0.5" fill="#57534E" />

    {/* North connector */}
    {north && (
      <>
        <rect x="12" y="0" width="16" height="12" fill="#78716C" />
        <rect x="15" y="2" width="4" height="8" rx="0.5" fill="#57534E" />
        <rect x="21" y="4" width="4" height="6" rx="0.5" fill="#44403C" />
      </>
    )}
    {/* South connector */}
    {south && (
      <>
        <rect x="12" y="28" width="16" height="12" fill="#78716C" />
        <rect x="15" y="30" width="4" height="8" rx="0.5" fill="#44403C" />
        <rect x="21" y="32" width="4" height="6" rx="0.5" fill="#57534E" />
      </>
    )}
    {/* West connector */}
    {west && (
      <>
        <rect x="0" y="12" width="12" height="16" fill="#78716C" />
        <rect x="2" y="15" width="8" height="4" rx="0.5" fill="#44403C" />
        <rect x="4" y="21" width="6" height="4" rx="0.5" fill="#57534E" />
      </>
    )}
    {/* East connector */}
    {east && (
      <>
        <rect x="28" y="12" width="12" height="16" fill="#78716C" />
        <rect x="30" y="15" width="8" height="4" rx="0.5" fill="#57534E" />
        <rect x="30" y="21" width="6" height="4" rx="0.5" fill="#44403C" />
      </>
    )}
  </svg>
);

const SVGCampfire: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none pointer-events-none">
    <ellipse cx="12" cy="20" rx="7" ry="2" fill="rgba(0,0,0,0.22)" />
    {/* Logs crossed */}
    <rect x="6" y="16" width="12" height="3.5" rx="0.5" fill="#78350F" transform="rotate(-15 12 17.5)" />
    <rect x="6" y="16" width="12" height="3.5" rx="0.5" fill="#78350F" transform="rotate(15 12 17.5)" />
    {/* Glowing Orange Flame */}
    <path
      d="M12 3C9.5 7 8.5 12 12 18C15.5 12 14.5 7 12 3Z"
      fill="#F97316"
      className="animate-pulse"
      style={{ transformOrigin: "bottom", filter: "drop-shadow(0 0 4px rgba(249,115,22,0.9))" }}
    />
    <path
      d="M12 6C10.5 9 10 12 12 16C14 12 13.5 9 12 6Z"
      fill="#FBBF24"
      className="animate-pulse"
      style={{ transformOrigin: "bottom", animationDelay: "0.25s" }}
    />
  </svg>
);

const SVGRuins: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none pointer-events-none">
    {/* Shadow */}
    <ellipse cx="16" cy="27" rx="9" ry="2.5" fill="rgba(0,0,0,0.18)" />
    
    {/* Left pillar */}
    <rect x="7" y="10" width="4" height="17" rx="0.5" fill="#64748B" />
    <rect x="7" y="10" width="1.5" height="17" fill="#94A3B8" />
    <rect x="6" y="9" width="6" height="2" fill="#475569" />
    
    {/* Right pillar (broken/shorter) */}
    <rect x="21" y="18" width="4" height="9" rx="0.5" fill="#475569" />
    <rect x="21" y="18" width="1.5" height="9" fill="#64748B" />
    <rect x="20" y="17" width="6" height="2" fill="#334155" />
    
    {/* Fallen pillar chunk */}
    <rect x="24" y="24" width="6" height="3" rx="0.5" fill="#334155" transform="rotate(15 24 24)" />
    
    {/* Broken Arch connector (connecting from left pillar but broken halfway) */}
    <path d="M9 10C9 10 12 5 16 7" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Green Ivy vines */}
    <path d="M8 12C9 15 7 18 9 21" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="14" r="1.5" fill="#16A34A" />
    <circle cx="9" cy="18" r="1.5" fill="#16A34A" />
    <circle cx="7.5" cy="22" r="1.5" fill="#16A34A" />
  </svg>
);

const SVGObelisk: React.FC<{ size?: number; isNight?: boolean }> = ({ size = 38, isNight = false }) => (
  <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="16" cy="27" rx="8" ry="3" fill="rgba(0,0,0,0.25)" />
      
      {/* Base */}
      <rect x="10" y="24" width="12" height="3" rx="0.5" fill="#334155" />
      <rect x="10" y="24" width="3" height="3" fill="#475569" />
      
      {/* Tapered Spire */}
      <path d="M12 24L14 6L16 3L18 6L20 24H12Z" fill="#1E293B" />
      <path d="M12 24L14 6L16 3L16 24H12Z" fill="#334155" /> {/* Left shade */}
      
      {/* Glowing Neon-Cyan Runes */}
      <path
        d="M16 8V21M14.5 11H17.5M17.5 15H14.5M15 18H17"
        stroke={isNight ? "#22D3EE" : "#0891B2"}
        strokeWidth="1.2"
        strokeLinecap="round"
        style={isNight ? { filter: "drop-shadow(0 0 6px #06B6D4) drop-shadow(0 0 2px #06B6D4)" } : {}}
      />
    </svg>
  </div>
);

const SVGFish: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-swim absolute pointer-events-none select-none">
    <path d="M1 8C3 6 8 5 12 8C8 11 3 10 1 8Z" fill="#F97316" />
    <path d="M12 8L15 6V10L12 8Z" fill="#EA580C" />
    <circle cx="4" cy="7.5" r="0.5" fill="white" />
  </svg>
);

const SVGTavern: React.FC<{ size?: number; isNight?: boolean }> = ({ size = 42, isNight = false }) => (
  <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
    {/* Chimney smoke puffs */}
    <div className="absolute top-0 right-3 flex flex-col gap-1 z-25 pointer-events-none">
      <div className="w-2.5 h-2.5 bg-slate-400/30 rounded-full animate-smoke" style={{ animationDelay: '0s' }} />
      <div className="w-2 h-2 bg-slate-400/20 rounded-full animate-smoke" style={{ animationDelay: '1.2s' }} />
    </div>
    
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tavern Shadow */}
      <ellipse cx="16" cy="28" rx="11" ry="3" fill="rgba(0,0,0,0.22)" />
      
      {/* Stone foundation */}
      <rect x="5" y="21" width="22" height="6" rx="1" fill="#4B5563" />
      <rect x="6" y="22" width="20" height="4" rx="0.5" fill="#6B7280" />
      
      {/* Log Walls / Wood Body */}
      <rect x="6" y="12" width="20" height="10" fill="#78350F" />
      <rect x="7" y="13" width="18" height="8" fill="#92400E" />
      
      {/* Planks texture */}
      <line x1="7" y1="16" x2="25" y2="16" stroke="#451A03" strokeWidth="0.75" />
      <line x1="7" y1="19" x2="25" y2="19" stroke="#451A03" strokeWidth="0.75" />

      {/* Amber/Clay brick roof */}
      <path d="M3 13L16 3L29 13H3Z" fill="#9A3412" />
      <path d="M5 13L16 5L27 13H5Z" fill="#C2410C" />
      
      {/* Stone Chimney on left */}
      <rect x="7" y="5" width="3" height="8" fill="#4B5563" />
      <rect x="6" y="4" width="5" height="1.5" fill="#1F2937" />

      {/* Arched Doorway */}
      <path d="M13 20C13 17 19 17 19 20V27H13V20Z" fill="#451A03" />
      {/* Door detail */}
      <line x1="16" y1="17.5" x2="16" y2="27" stroke="#3F1B02" strokeWidth="0.75" />
      <circle cx="14.5" cy="22" r="0.5" fill="#EAB308" />

      {/* Cozy glowing golden windows */}
      <rect x="8" y="15" width="3.5" height="3.5" rx="0.5" fill={isNight ? "#F59E0B" : "#D97706"} style={isNight ? { filter: "drop-shadow(0 0 4px rgba(245,158,11,0.95))" } : {}} />
      <rect x="20.5" y="15" width="3.5" height="3.5" rx="0.5" fill={isNight ? "#F59E0B" : "#D97706"} style={isNight ? { filter: "drop-shadow(0 0 4px rgba(245,158,11,0.95))" } : {}} />
      
      {/* Hanging Signpost with foam mug */}
      <path d="M21 9V12H24" stroke="#D97706" strokeWidth="1" strokeLinecap="round" />
      <rect x="22.5" y="12" width="5" height="4" rx="0.5" fill="#FEF3C7" stroke="#78350F" strokeWidth="0.5" />
      {/* Tiny beer mug drawing inside sign */}
      <rect x="24" y="13.5" width="2" height="2" fill="#F59E0B" />
      <rect x="24" y="13" width="2" height="0.5" fill="#F8FAFC" /> {/* Foam */}
    </svg>
  </div>
);

const SVGFarm: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <div className="relative select-none pointer-events-none w-full h-full flex items-center justify-center">
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Soil base */}
      <rect x="4" y="4" width="24" height="24" rx="2" fill="#451A03" />
      <rect x="5" y="5" width="22" height="22" rx="1.5" fill="#5F270B" />
      
      {/* Neat rows/furrows of plowed soil */}
      <line x1="8" y1="5" x2="8" y2="27" stroke="#3F1B02" strokeWidth="1.5" />
      <line x1="13" y1="5" x2="13" y2="27" stroke="#3F1B02" strokeWidth="1.5" />
      <line x1="18" y1="5" x2="18" y2="27" stroke="#3F1B02" strokeWidth="1.5" />
      <line x1="23" y1="5" x2="23" y2="27" stroke="#3F1B02" strokeWidth="1.5" />

      {/* Growing green crops & wheat tips in rows */}
      {/* Row 1 */}
      <circle cx="8" cy="8" r="1.5" fill="#10B981" />
      <path d="M8 8.5V6.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="8" cy="15" r="1.5" fill="#10B981" />
      <path d="M8 15.5V13.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="8" cy="22" r="1.5" fill="#10B981" />
      <path d="M8 22.5V20.5" stroke="#F59E0B" strokeWidth="1" />

      {/* Row 2 */}
      <circle cx="13" cy="11" r="1.5" fill="#10B981" />
      <path d="M13 11.5V9.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="13" cy="18" r="1.5" fill="#10B981" />
      <path d="M13 18.5V16.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="13" cy="25" r="1.5" fill="#10B981" />
      <path d="M13 25.5V23.5" stroke="#F59E0B" strokeWidth="1" />

      {/* Row 3 */}
      <circle cx="18" cy="8" r="1.5" fill="#10B981" />
      <path d="M18 8.5V6.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="18" cy="15" r="1.5" fill="#10B981" />
      <path d="M18 15.5V13.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="18" cy="22" r="1.5" fill="#10B981" />
      <path d="M18 22.5V20.5" stroke="#F59E0B" strokeWidth="1" />

      {/* Row 4 */}
      <circle cx="23" cy="11" r="1.5" fill="#10B981" />
      <path d="M23 11.5V9.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="23" cy="18" r="1.5" fill="#10B981" />
      <path d="M23 18.5V16.5" stroke="#F59E0B" strokeWidth="1" />
      
      <circle cx="23" cy="25" r="1.5" fill="#10B981" />
      <path d="M23 25.5V23.5" stroke="#F59E0B" strokeWidth="1" />

      {/* A tiny scarecrow in the center */}
      <line x1="16" y1="12" x2="16" y2="20" stroke="#78350F" strokeWidth="1.5" />
      <line x1="13" y1="14" x2="19" y2="14" stroke="#78350F" strokeWidth="1.5" />
      <circle cx="16" cy="10.5" r="1.2" fill="#FEF08A" />
      <rect x="15" y="12" width="2" height="4" fill="#3B82F6" />
    </svg>
  </div>
);

const SVGCitizen: React.FC<{ capColor?: string }> = ({ capColor = "#3B82F6" }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none select-none">
    <ellipse cx="16" cy="27" rx="7" ry="2" fill="rgba(0,0,0,0.3)" />
    {/* Body / Shirt */}
    <path d="M9 23C9 19 23 19 23 23V27H9V23Z" fill="#1E293B" />
    <path d="M10 23C10 20 22 20 22 23V26H10V23Z" fill="#475569" />
    {/* Face */}
    <circle cx="16" cy="14" r="6.5" fill="#FDBA74" />
    {/* Eyes */}
    <circle cx="14" cy="14" r="1.2" fill="#0F172A" />
    <circle cx="18" cy="14" r="1.2" fill="#0F172A" />
    {/* Fitted Cap */}
    <path d="M9 13C9 7 23 7 23 13H9Z" fill={capColor} />
    <rect x="9" y="12" width="14" height="2" rx="0.5" fill={capColor} style={{ filter: "brightness(0.8)" }} />
  </svg>
);

interface NPC {
  id: string;
  x: number;  // horizontal coordinate (float, 0 to 15)
  y: number;  // vertical coordinate (float, 0 to 15)
  vx: number; // horizontal velocity (tiles/second)
  vy: number; // vertical velocity (tiles/second)
  tx: number | null; // target horizontal coordinate
  ty: number | null; // target vertical coordinate
  state: 'idle' | 'walking' | 'waiting';
  capColor: string;
  role: 'Farmer' | 'Worker' | 'Explorer';
  thought: string;
  stateTimer: number; // timer in seconds
  
  // Daily Schedule Fields
  homeTile: { lx: number; ly: number } | null;
  workTile: { lx: number; ly: number } | null;
  tavernTile: { lx: number; ly: number } | null;
  currentScheduleState: 'sleep' | 'work' | 'socialize' | 'wander';

  // Needs System Fields (Step 17)
  hunger: number; // 0 to 100
  energy: number; // 0 to 100
  social: number; // 0 to 100
  goal: 'none' | 'food' | 'sleep' | 'socialize';
}

function assignNPCSchedules(npc: NPC, tiles: Tile[][], chunkSize: number): NPC {
  let homeTile: { lx: number; ly: number } | null = null;
  let workTile: { lx: number; ly: number } | null = null;
  let tavernTile: { lx: number; ly: number } | null = null;

  const homes: { lx: number; ly: number; dist: number }[] = [];
  const works: { lx: number; ly: number; dist: number }[] = [];
  const taverns: { lx: number; ly: number; dist: number }[] = [];

  for (let lx = 0; lx < chunkSize; lx++) {
    for (let ly = 0; ly < chunkSize; ly++) {
      const tile = tiles[lx]?.[ly];
      if (tile) {
        // Manhattan distance from current location
        const dist = Math.abs(lx - npc.y) + Math.abs(ly - npc.x);
        
        // Homes: cottage or house
        if (tile.structure === 'cottage' || tile.structure === 'house') {
          homes.push({ lx, ly, dist });
        }

        // Taverns: tavern or campfire fallback
        if (tile.structure === 'tavern') {
          taverns.push({ lx, ly, dist });
        } else if (tile.structure === 'campfire') {
          taverns.push({ lx, ly, dist: dist + 12 }); // slight penalty to prefer tavern
        }

        // Work based on role
        if (npc.role === 'Farmer') {
          if (tile.structure === 'farm') {
            works.push({ lx, ly, dist });
          } else if (tile.terrainType === 'grass' && tile.structure === undefined) {
            works.push({ lx, ly, dist: dist + 6 });
          }
        } else if (npc.role === 'Worker') {
          if (tile.terrainType === 'forest' || tile.terrainType === 'mountain' || tile.terrainType === 'hills') {
            works.push({ lx, ly, dist });
          }
        } else if (npc.role === 'Explorer') {
          if (tile.structure === 'ruins' || tile.structure === 'obelisk' || tile.structure === 'campfire') {
            works.push({ lx, ly, dist });
          }
        }
      }
    }
  }

  // Assign nearest home or fallback to integer coordinate
  if (homes.length > 0) {
    homes.sort((a, b) => a.dist - b.dist);
    homeTile = { lx: homes[0].lx, ly: homes[0].ly };
  } else {
    homeTile = { lx: Math.floor(npc.y), ly: Math.floor(npc.x) };
  }

  // Assign nearest tavern or fallback
  if (taverns.length > 0) {
    taverns.sort((a, b) => a.dist - b.dist);
    tavernTile = { lx: taverns[0].lx, ly: taverns[0].ly };
  } else {
    // Try to find city center or fallback to center of chunk
    let foundCityCenter = false;
    for (let lx = 0; lx < chunkSize; lx++) {
      for (let ly = 0; ly < chunkSize; ly++) {
        if (tiles[lx]?.[ly]?.structure === 'city_center') {
          tavernTile = { lx, ly };
          foundCityCenter = true;
          break;
        }
      }
      if (foundCityCenter) break;
    }
    if (!tavernTile) {
      tavernTile = { lx: Math.floor(chunkSize / 2), ly: Math.floor(chunkSize / 2) };
    }
  }

  // Assign nearest work or fallback
  if (works.length > 0) {
    works.sort((a, b) => a.dist - b.dist);
    workTile = { lx: works[0].lx, ly: works[0].ly };
  } else {
    // Find first safe land tile
    for (let lx = 0; lx < chunkSize; lx++) {
      for (let ly = 0; ly < chunkSize; ly++) {
        const t = tiles[lx]?.[ly];
        if (t && t.terrainType !== 'deep_water' && t.terrainType !== 'water' && t.terrainType !== 'river') {
          workTile = { lx, ly };
          break;
        }
      }
      if (workTile) break;
    }
    if (!workTile) {
      workTile = { lx: Math.floor(npc.y), ly: Math.floor(npc.x) };
    }
  }

  return {
    ...npc,
    homeTile,
    workTile,
    tavernTile,
  };
}

function pickTargetTile(npc: NPC, tiles: Tile[][], chunkSize: number): { lx: number; ly: number } | null {
  const candidates: { lx: number; ly: number }[] = [];
  for (let lx = 0; lx < chunkSize; lx++) {
    for (let ly = 0; ly < chunkSize; ly++) {
      const tile = tiles[lx]?.[ly];
      if (tile) {
        const isWater = tile.terrainType === 'deep_water' || tile.terrainType === 'water' || tile.terrainType === 'river';
        if (!isWater) {
          // Prefer tiles that are nearby (within 5 tiles) to look more organic
          const dist = Math.abs(lx - npc.y) + Math.abs(ly - npc.x);
          if (dist > 0 && dist <= 5) {
            candidates.push({ lx, ly });
          }
        }
      }
    }
  }

  // Fallback to any non-deep-water tile in the chunk if no close candidate found
  if (candidates.length === 0) {
    for (let lx = 0; lx < chunkSize; lx++) {
      for (let ly = 0; ly < chunkSize; ly++) {
        const tile = tiles[lx]?.[ly];
        if (tile && tile.terrainType !== 'deep_water') {
          candidates.push({ lx, ly });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// --- SYNTHESIZED AUDIO MANAGER (HTML5 Web Audio API) ---

let audioCtx: AudioContext | null = null;

const playSynthSound = (type: 'beep' | 'pop' | 'chime' | 'rumble') => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'beep') {
      // Select tool
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'pop') {
      // Plant / Build / Clean
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'chime') {
      // Spawn citizen
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.08); // C6
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.setValueAtTime(0.06, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'rumble') {
      // Lightning / Meteor
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.6);
      
      // Tremolo effect using LFO simulation
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      osc.start(now);
      osc.stop(now + 0.7);
    }
  } catch (err) {
    // Fail silently if browser blocks Web Audio API
  }
};

export const ChunkSandboxView: React.FC = () => {
  const {
    seed,
    chunkSize,
    octaves,
    persistence,
    lacunarity,
    scale: noiseScale,
    redistribution,
    applyIslandMask,
    islandRadius,
    sandboxActiveChunk,
    setSandboxActiveChunk,
    sandboxTiles,
    setSandboxTiles,
    updateSandboxTile,
  } = useWorldStore();

  const [activeTool, setActiveTool] = useState<'inspect' | 'tree' | 'house' | 'campfire' | 'road' | 'water' | 'lightning' | 'spawn' | 'clear' | 'tavern' | 'farm'>('inspect');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shakeActive, setShakeActive] = useState(false);
  const [hoveredSandboxTile, setHoveredSandboxTile] = useState<Tile | null>(null);
  const [citizens, setCitizens] = useState<NPC[]>([]);
  const [lightningHitCoords, setLightningHitCoords] = useState<{ lx: number; ly: number } | null>(null);

  // Initialize micro-simulation tiles
  useEffect(() => {
    if (!sandboxActiveChunk) {
      setSandboxTiles(null);
      setCitizens([]);
      return;
    }

    const { cx, cy } = sandboxActiveChunk;
    const tiles = generateChunk({
      chunkX: cx,
      chunkY: cy,
      chunkSize,
      seed,
      octaves,
      persistence,
      lacunarity,
      scale: noiseScale,
      redistribution,
      applyIslandMask,
      islandRadius,
    });

    setSandboxTiles(tiles);

    // Seed 3 citizens on safe land tiles
    const safeTiles: { lx: number; ly: number }[] = [];
    for (let lx = 0; lx < chunkSize; lx++) {
      for (let ly = 0; ly < chunkSize; ly++) {
        const t = tiles[lx][ly];
        if (t.terrainType !== 'deep_water' && t.terrainType !== 'water' && t.terrainType !== 'river') {
          safeTiles.push({ lx, ly });
        }
      }
    }

    const initialCitizens: NPC[] = [];
    const roles: ('Farmer' | 'Worker' | 'Explorer')[] = ['Farmer', 'Worker', 'Explorer'];
    const capColors = ['#EF4444', '#10B981', '#3B82F6'];

    const count = Math.min(3, safeTiles.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.abs(Math.sin(i * 45.3) * safeTiles.length));
      const pt = safeTiles.splice(idx % safeTiles.length, 1)[0];
      let npc: NPC = {
        id: Math.random().toString(36).substring(2, 9),
        x: pt.ly + 0.5,
        y: pt.lx + 0.5,
        vx: 0,
        vy: 0,
        tx: null,
        ty: null,
        state: 'idle',
        stateTimer: 0.5 + Math.random() * 1.5,
        capColor: capColors[i % capColors.length],
        role: roles[i % roles.length],
        thought: 'Exploring the new land... 🧭',
        homeTile: null,
        workTile: null,
        tavernTile: null,
        currentScheduleState: 'wander',
        hunger: 70 + Math.random() * 30,
        energy: 80 + Math.random() * 20,
        social: 60 + Math.random() * 40,
        goal: 'none',
      };
      npc = assignNPCSchedules(npc, tiles, chunkSize);
      initialCitizens.push(npc);
    }

    setCitizens(initialCitizens);
  }, [sandboxActiveChunk]);

  // Reactively re-assign NPC paths/claims when tiles or citizens change
  useEffect(() => {
    if (!sandboxTiles) return;
    setCitizens((prev) =>
      prev.map((npc) => assignNPCSchedules(npc, sandboxTiles, chunkSize))
    );
  }, [sandboxTiles, chunkSize]);

  // Continuous real-time loop for physics updates and NPC state transitions
  useEffect(() => {
    if (!sandboxActiveChunk || !sandboxTiles) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // cap dt to prevent huge jumps on tab sleep/resume
      lastTime = time;

      setCitizens((prev) =>
        prev.map((npc) => {
          let { x, y, vx, vy, tx, ty, state, stateTimer, thought, currentScheduleState, hunger, energy, social, goal } = npc;

          // 1. Decay Needs (Step 17)
          const hungerDecay = 1.6;
          const energyDecay = currentScheduleState === 'work' ? 1.8 : 1.2;
          const socialDecay = 1.4;

          hunger = Math.max(0, hunger - hungerDecay * dt);
          energy = Math.max(0, energy - energyDecay * dt);
          social = Math.max(0, social - socialDecay * dt);

          // 2. Time-of-Day Schedule State Update
          let expectedState: 'sleep' | 'work' | 'socialize' | 'wander' = 'wander';
          if (timeOfDay === 'day') expectedState = 'work';
          else if (timeOfDay === 'sunset') expectedState = 'socialize';
          else if (timeOfDay === 'night') expectedState = 'sleep';

          if (currentScheduleState !== expectedState) {
            currentScheduleState = expectedState;
            // Only override schedule path if not in an active urgent needs goal state
            if (goal === 'none') {
              state = 'idle';
              stateTimer = 0;
              tx = null;
              ty = null;
              thought = expectedState === 'work'
                ? 'Time for work! 🔨'
                : expectedState === 'socialize'
                ? 'Work day is over, heading to the tavern! 🍺'
                : 'Getting dark, heading home to sleep... 💤';
            }
          }

          // 3. Goal overriding triggers (below 30%)
          if (goal === 'none') {
            if (hunger <= 30) {
              goal = 'food';
              state = 'idle';
              stateTimer = 0;
              tx = null;
              ty = null;
              thought = 'So hungry! Searching for food... 🥣';
            } else if (energy <= 30) {
              goal = 'sleep';
              state = 'idle';
              stateTimer = 0;
              tx = null;
              ty = null;
              thought = 'So tired... heading home to sleep 🛌';
            } else if (social <= 30) {
              goal = 'socialize';
              state = 'idle';
              stateTimer = 0;
              tx = null;
              ty = null;
              thought = 'Bored... looking for some company 🍻';
            }
          } else {
            // Restore goal to none if need is satisfied (>= 95)
            if (goal === 'food' && hunger >= 95) {
              goal = 'none';
              state = 'idle';
              stateTimer = 0.5;
              tx = null;
              ty = null;
              thought = 'Fully fed! Back to schedule. 😊';
            } else if (goal === 'sleep' && energy >= 95) {
              goal = 'none';
              state = 'idle';
              stateTimer = 0.5;
              tx = null;
              ty = null;
              thought = 'Fully rested! Back to schedule. ☀️';
            } else if (goal === 'socialize' && social >= 95) {
              goal = 'none';
              state = 'idle';
              stateTimer = 0.5;
              tx = null;
              ty = null;
              thought = 'Had a great time! Back to schedule. 😄';
            }
          }

          // State Machine: idle -> walking -> waiting -> idle
          if (state === 'idle') {
            vx = 0;
            vy = 0;
            stateTimer -= dt;
            if (stateTimer <= 0) {
              // Calculate destination based on goal overrides or time-of-day schedules
              let dest: { lx: number; ly: number } | null = null;
              if (goal === 'food') {
                // Find nearest farm or tavern dynamically
                const foodSpots: { lx: number; ly: number; dist: number }[] = [];
                for (let lx = 0; lx < chunkSize; lx++) {
                  for (let ly = 0; ly < chunkSize; ly++) {
                    const t = sandboxTiles[lx]?.[ly];
                    if (t && (t.structure === 'farm' || t.structure === 'tavern')) {
                      const dist = Math.abs(lx - y) + Math.abs(ly - x);
                      foodSpots.push({ lx, ly, dist });
                    }
                  }
                }
                if (foodSpots.length > 0) {
                  foodSpots.sort((a, b) => a.dist - b.dist);
                  dest = { lx: foodSpots[0].lx, ly: foodSpots[0].ly };
                } else {
                  dest = npc.homeTile;
                }
              } else if (goal === 'sleep') {
                dest = npc.homeTile;
              } else if (goal === 'socialize') {
                // Find nearest tavern or campfire dynamically
                const socialSpots: { lx: number; ly: number; dist: number }[] = [];
                for (let lx = 0; lx < chunkSize; lx++) {
                  for (let ly = 0; ly < chunkSize; ly++) {
                    const t = sandboxTiles[lx]?.[ly];
                    if (t && (t.structure === 'tavern' || t.structure === 'campfire')) {
                      const dist = Math.abs(lx - y) + Math.abs(ly - x);
                      socialSpots.push({ lx, ly, dist });
                    }
                  }
                }
                if (socialSpots.length > 0) {
                  socialSpots.sort((a, b) => a.dist - b.dist);
                  dest = { lx: socialSpots[0].lx, ly: socialSpots[0].ly };
                } else {
                  dest = npc.tavernTile;
                }
              } else {
                // Normal time-of-day schedule target
                if (currentScheduleState === 'work') dest = npc.workTile;
                else if (currentScheduleState === 'socialize') dest = npc.tavernTile;
                else if (currentScheduleState === 'sleep') dest = npc.homeTile;
              }

              if (dest) {
                // Check if we are already there
                const curLX = Math.floor(y);
                const curLY = Math.floor(x);
                if (curLX === dest.lx && curLY === dest.ly) {
                  state = 'waiting';
                  stateTimer = 3.0 + Math.random() * 4.0;

                  const currentTile = sandboxTiles[dest.lx]?.[dest.ly];
                  if (goal === 'food') {
                    if (currentTile?.structure === 'tavern') {
                      thought = 'Eating hot stew at the tavern... 🍲';
                    } else if (currentTile?.structure === 'farm') {
                      thought = 'Snacking on fresh crops... 🌾';
                    } else {
                      thought = 'Eating stored food... 🍞';
                    }
                  } else if (goal === 'sleep') {
                    thought = 'Zzz... sleeping deeply... 🛌';
                  } else if (goal === 'socialize') {
                    if (currentTile?.structure === 'tavern') {
                      thought = 'Drinking cider and chatting! 🍻';
                    } else {
                      thought = 'Sharing stories by the campfire! 🔥';
                    }
                  } else {
                    // Normal schedule already there thoughts
                    if (currentScheduleState === 'sleep') {
                      thought = 'Zzz... sleeping peacefully 💤';
                    } else if (currentScheduleState === 'socialize') {
                      if (currentTile?.structure === 'tavern') {
                        thought = 'Sipping frosty cider at the tavern! 🍺';
                      } else {
                        thought = 'Sharing stories by the warm campfire! 🔥';
                      }
                    } else { // work
                      if (npc.role === 'Farmer') {
                        thought = 'Tending to the golden wheat crops... 🌾';
                      } else if (npc.role === 'Worker') {
                        if (currentTile?.terrainType === 'forest') {
                          thought = 'Felling trees and gathering timber... 🪓';
                        } else if (currentTile?.terrainType === 'mountain' || currentTile?.terrainType === 'hills') {
                          thought = 'Mining iron and prospecting gold... ⛏️';
                        } else {
                          thought = 'Doing manual labor... 🔨';
                        }
                      } else { // Explorer
                        if (currentTile?.structure === 'ruins') {
                          thought = 'Studying mysterious ancient ruins... 📜';
                        } else if (currentTile?.structure === 'obelisk') {
                          thought = 'Decoding glowing cyan obelisk runes... 🔮';
                        } else {
                          thought = 'Searching for lost treasures... 🧭';
                        }
                      }
                    }
                  }
                } else {
                  // Walk to destination
                  tx = dest.ly + 0.5;
                  ty = dest.lx + 0.5;
                  state = 'walking';
                  stateTimer = 0;

                  if (goal === 'food') {
                    thought = 'Heading to search for food... 🥣';
                  } else if (goal === 'sleep') {
                    thought = 'Heading home to sleep... 🛌';
                  } else if (goal === 'socialize') {
                    thought = 'Looking for tavern or campfire... 🍻';
                  } else {
                    if (currentScheduleState === 'sleep') {
                      thought = 'Heading home to sleep... 🏠';
                    } else if (currentScheduleState === 'socialize') {
                      thought = 'Going to socialize at the tavern... 🍺';
                    } else { // work
                      thought = npc.role === 'Farmer'
                        ? 'Heading to the wheat farm... 🌾'
                        : npc.role === 'Worker'
                        ? 'Going to start the work shift... ⚒️'
                        : 'Heading out to explore the wilds... 🧭';
                    }
                  }
                }
              } else {
                // Wander fallback (Step 15)
                const target = pickTargetTile(npc, sandboxTiles, chunkSize);
                if (target) {
                  tx = target.ly + 0.5;
                  ty = target.lx + 0.5;
                  state = 'walking';
                  stateTimer = 0;

                  const thoughts = [
                    'Going for a wander... 🚶',
                    'Checking out the area... 🧭',
                    'Heading to a new spot... 🌿',
                  ];
                  thought = thoughts[Math.floor(Math.random() * thoughts.length)];
                } else {
                  stateTimer = 1.0 + Math.random() * 2.0;
                }
              }
            }
          } else if (state === 'walking') {
            if (tx !== null && ty !== null) {
              const dx = tx - x;
              const dy = ty - y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 0.05) {
                // Arrived at destination
                x = tx;
                y = ty;
                tx = null;
                ty = null;
                vx = 0;
                vy = 0;
                state = 'waiting';
                stateTimer = 3.0 + Math.random() * 4.0; // wait at destination

                const currentTile = sandboxTiles[Math.floor(y)]?.[Math.floor(x)];
                if (goal === 'food') {
                  if (currentTile?.structure === 'tavern') {
                    thought = 'Munching on hot pub roast... 🍲';
                  } else if (currentTile?.structure === 'farm') {
                    thought = 'Eating raw sweet berries... 🍓';
                  } else {
                    thought = 'Eating warm bread from storage... 🍞';
                  }
                } else if (goal === 'sleep') {
                  thought = 'Zzz... sleeping deeply... 🛌';
                } else if (goal === 'socialize') {
                  if (currentTile?.structure === 'tavern') {
                    thought = 'Sipping frosty cider and chatting! 🍺';
                  } else {
                    thought = 'Laughing by the warm campfire! 🔥';
                  }
                } else {
                  if (currentScheduleState === 'sleep') {
                    thought = 'Zzz... sleeping peacefully 💤';
                  } else if (currentScheduleState === 'socialize') {
                    if (currentTile?.structure === 'tavern') {
                      thought = 'Sipping frosty cider at the tavern! 🍺';
                    } else {
                      thought = 'Sharing stories by the warm campfire! 🔥';
                    }
                  } else if (currentScheduleState === 'work') {
                    if (npc.role === 'Farmer') {
                      thought = 'Tending to the golden wheat crops... 🌾';
                    } else if (npc.role === 'Worker') {
                      if (currentTile?.terrainType === 'forest') {
                        thought = 'Felling trees and gathering timber... 🪓';
                      } else if (currentTile?.terrainType === 'mountain' || currentTile?.terrainType === 'hills') {
                        thought = 'Mining iron and prospecting gold... ⛏️';
                      } else {
                        thought = 'Doing manual labor... 🔨';
                      }
                    } else { // Explorer
                      if (currentTile?.structure === 'ruins') {
                        thought = 'Studying mysterious ancient ruins... 📜';
                      } else if (currentTile?.structure === 'obelisk') {
                        thought = 'Decoding glowing cyan obelisk runes... 🔮';
                      } else {
                        thought = 'Searching for lost treasures... 🧭';
                      }
                    }
                  } else {
                    if (currentTile) {
                      if (currentTile.terrainType === 'forest') {
                        thought = 'Harvesting fresh timber... 🪵';
                      } else if (currentTile.terrainType === 'mountain' || currentTile.terrainType === 'hills') {
                        thought = 'Prospecting mineral deposits... 🪙';
                      } else if (currentTile.terrainType === 'beach') {
                        thought = 'Looking for shiny seashells... 🐚';
                      } else if (currentTile.structure === 'cottage') {
                        thought = 'Resting in the cottage... 🪑';
                      } else {
                        thought = 'Stopping to enjoy the view... 🌄';
                      }
                    } else {
                      thought = 'Enjoying this spot... 🌸';
                    }
                  }
                }
              } else {
                // Continue walking towards target
                const speed = 1.2; // tiles per second
                vx = (dx / dist) * speed;
                vy = (dy / dist) * speed;
                x += vx * dt;
                y += vy * dt;
              }
            } else {
              state = 'idle';
              stateTimer = 0.5;
            }
          } else if (state === 'waiting') {
            vx = 0;
            vy = 0;
            stateTimer -= dt;

            // Need recoveries during wait state (Step 17)
            if (goal === 'food') {
              hunger = Math.min(100, hunger + 30 * dt);
            } else if (goal === 'sleep') {
              energy = Math.min(100, energy + 25 * dt);
            } else if (goal === 'socialize') {
              social = Math.min(100, social + 28 * dt);
            } else {
              // Standard schedule recovery as a minor benefit
              if (currentScheduleState === 'sleep') {
                energy = Math.min(100, energy + 25 * dt);
              } else if (currentScheduleState === 'socialize') {
                social = Math.min(100, social + 28 * dt);
              }
            }

            // Immediately break waiting if needs are satisfied, or if waiting timer completes
            const hungerSatisfied = goal === 'food' && hunger >= 95;
            const energySatisfied = goal === 'sleep' && energy >= 95;
            const socialSatisfied = goal === 'socialize' && social >= 95;
            const needFulfillBreak = hungerSatisfied || energySatisfied || socialSatisfied;

            if (stateTimer <= 0 || needFulfillBreak) {
              state = 'idle';
              stateTimer = 0.5 + Math.random() * 1.5;
              
              if (needFulfillBreak) {
                goal = 'none';
                tx = null;
                ty = null;
                if (hungerSatisfied) {
                  thought = 'Fully fed! Back to schedule. 😊';
                  stateTimer = 0.8;
                } else if (energySatisfied) {
                  thought = 'Fully rested! Back to schedule. ☀️';
                  stateTimer = 0.8;
                } else if (socialSatisfied) {
                  thought = 'Had a great time! Back to schedule. 😄';
                  stateTimer = 0.8;
                }
              } else {
                thought = 'Thinking of what to do... 🤔';
              }
            }
          }

          return {
            ...npc,
            x,
            y,
            vx,
            vy,
            tx,
            ty,
            state,
            stateTimer,
            thought,
            currentScheduleState,
            hunger,
            energy,
            social,
            goal,
          };
        })
      );

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sandboxActiveChunk, sandboxTiles, timeOfDay]);

  if (!sandboxActiveChunk || !sandboxTiles) return null;

  const { cx, cy } = sandboxActiveChunk;

  const handleToolSelect = (tool: typeof activeTool) => {
    setActiveTool(tool);
    if (soundEnabled) playSynthSound('beep');
  };

  const handleTileClick = (lx: number, ly: number) => {
    const tile = sandboxTiles[lx][ly];
    if (!tile) return;

    if (activeTool === 'tree') {
      updateSandboxTile(lx, ly, { terrainType: 'forest', structure: undefined, hasRoad: false });
      if (soundEnabled) playSynthSound('pop');
    } else if (activeTool === 'house') {
      if (tile.terrainType !== 'deep_water' && tile.terrainType !== 'water' && tile.terrainType !== 'river') {
        updateSandboxTile(lx, ly, { structure: 'cottage', hasRoad: false });
        if (soundEnabled) playSynthSound('pop');
      }
    } else if (activeTool === 'tavern') {
      if (tile.terrainType !== 'deep_water' && tile.terrainType !== 'water' && tile.terrainType !== 'river') {
        updateSandboxTile(lx, ly, { structure: 'tavern', hasRoad: false });
        if (soundEnabled) playSynthSound('pop');
      }
    } else if (activeTool === 'farm') {
      if (tile.terrainType !== 'deep_water' && tile.terrainType !== 'water' && tile.terrainType !== 'river') {
        updateSandboxTile(lx, ly, { structure: 'farm', hasRoad: false });
        if (soundEnabled) playSynthSound('pop');
      }
    } else if (activeTool === 'campfire') {
      if (tile.terrainType !== 'deep_water' && tile.terrainType !== 'water' && tile.terrainType !== 'river') {
        updateSandboxTile(lx, ly, { structure: 'campfire', hasRoad: false });
        if (soundEnabled) playSynthSound('pop');
      }
    } else if (activeTool === 'road') {
      if (tile.terrainType !== 'deep_water' && tile.terrainType !== 'water' && tile.terrainType !== 'river') {
        updateSandboxTile(lx, ly, { hasRoad: true, structure: undefined });
        if (soundEnabled) playSynthSound('pop');
      }
    } else if (activeTool === 'water') {
      updateSandboxTile(lx, ly, { terrainType: 'water', structure: undefined, hasRoad: false });
      if (soundEnabled) playSynthSound('pop');
    } else if (activeTool === 'clear') {
      updateSandboxTile(lx, ly, { terrainType: tile.baseTerrainType || 'grass', structure: undefined, hasRoad: false });
      if (soundEnabled) playSynthSound('pop');
    } else if (activeTool === 'spawn') {
      if (tile.terrainType !== 'deep_water') {
        const colors = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
        const roles: ('Farmer' | 'Worker' | 'Explorer')[] = ['Farmer', 'Worker', 'Explorer'];
        let newCitizen: NPC = {
          id: Math.random().toString(36).substring(2, 9),
          x: ly + 0.5,
          y: lx + 0.5,
          vx: 0,
          vy: 0,
          tx: null,
          ty: null,
          state: 'idle',
          stateTimer: 1.0,
          capColor: colors[Math.floor(Math.random() * colors.length)],
          role: roles[Math.floor(Math.random() * roles.length)],
          thought: 'Hello micro-world! 🐣',
          homeTile: null,
          workTile: null,
          tavernTile: null,
          currentScheduleState: 'wander',
          hunger: 80 + Math.random() * 20,
          energy: 90 + Math.random() * 10,
          social: 70 + Math.random() * 30,
          goal: 'none',
        };
        newCitizen = assignNPCSchedules(newCitizen, sandboxTiles, chunkSize);
        setCitizens((prev) => [...prev, newCitizen]);
        if (soundEnabled) playSynthSound('chime');
      }
    } else if (activeTool === 'lightning') {
      // Visual Strike trigger
      setLightningHitCoords({ lx, ly });
      setShakeActive(true);
      if (soundEnabled) playSynthSound('rumble');

      // Scorched Earth logic: target and neighbors become scorched desert sand, structures/trees/roads wiped out!
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nlx = lx + dx;
          const nly = ly + dy;
          if (nlx >= 0 && nlx < chunkSize && nly >= 0 && nly < chunkSize) {
            updateSandboxTile(nlx, nly, { terrainType: 'desert', structure: undefined, hasRoad: false });
          }
        }
      }

      // Evaporate citizens in the blast radius (lx corresponds to y, ly corresponds to x)
      setCitizens((prev) =>
        prev.filter((cit) => Math.abs(cit.y - lx) > 1.5 || Math.abs(cit.x - ly) > 1.5)
      );

      // Clear strike details after animations finish
      setTimeout(() => {
        setShakeActive(false);
        setLightningHitCoords(null);
      }, 500);
    }
  };

  const getTileColorClasses = (tile: Tile) => {
    switch (tile.terrainType) {
      case 'deep_water':
        return 'bg-gradient-to-br from-blue-900 to-indigo-950';
      case 'water':
        return 'bg-gradient-to-br from-blue-500 to-blue-600';
      case 'beach':
        return 'bg-gradient-to-br from-yellow-200 to-amber-300';
      case 'grass':
        return 'bg-gradient-to-br from-emerald-500 to-teal-500';
      case 'forest':
        return 'bg-gradient-to-br from-emerald-700 to-green-800';
      case 'desert':
        return 'bg-gradient-to-br from-amber-400 to-orange-400';
      case 'hills':
        return 'bg-gradient-to-br from-amber-800 to-amber-950 text-amber-200';
      case 'mountain':
        return 'bg-gradient-to-br from-slate-100 to-zinc-200 text-slate-900';
      case 'snow':
        return 'bg-gradient-to-br from-white to-slate-100 text-slate-950';
      case 'river':
        return 'bg-gradient-to-br from-cyan-400 to-sky-500';
      default:
        return 'bg-slate-800';
    }
  };

  const handleClose = () => {
    setSandboxActiveChunk(null);
    setSandboxTiles(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/98 backdrop-blur-2xl text-slate-100 overflow-hidden font-sans transition-all duration-300">
      
      {/* Inline styles for custom Micro-Animations & Screen-Shake */}
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(3deg); }
        }
        .animate-sway {
          animation: sway 2.8s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-3px, -2px) rotate(-0.5deg); }
          20% { transform: translate(3px, 2px) rotate(0.5deg); }
          30% { transform: translate(-2px, 3px) rotate(0deg); }
          40% { transform: translate(2px, -1px) rotate(0.5deg); }
          50% { transform: translate(-3px, 2px) rotate(-0.5deg); }
          60% { transform: translate(3px, -3px) rotate(0deg); }
          75% { transform: translate(-1px, -2px) rotate(0.5deg); }
          90% { transform: translate(2px, 1px) rotate(0deg); }
        }
        .animate-shake {
          animation: shake 0.45s ease-in-out;
        }
        @keyframes swim {
          0% { transform: translate(0, 0) scaleX(1); }
          45% { transform: translate(14px, -3px) scaleX(1); }
          50% { transform: translate(14px, -3px) scaleX(-1); }
          95% { transform: translate(0, 0) scaleX(-1); }
          100% { transform: translate(0, 0) scaleX(1); }
        }
        .animate-swim {
          animation: swim 7s ease-in-out infinite;
        }
        @keyframes smoke {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { opacity: 0.5; }
          80% { transform: translateY(-18px) scale(1.3); opacity: 0; }
          100% { transform: translateY(-24px) scale(1.5); opacity: 0; }
        }
        .animate-smoke {
          animation: smoke 2.2s ease-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* 1. Sidebar Control Panel */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-6 select-none shrink-0 h-full overflow-y-auto">
        <header className="flex flex-col gap-1 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Chunk Sandbox
            </h1>
          </div>
          <p className="text-xs text-slate-400">Micro-simulation &bull; Chunk [{cx}, {cy}]</p>
        </header>

        {/* Sandbox Tool Palette */}
        <section className="flex flex-col gap-2.5">
          <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Sandbox Tools</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleToolSelect('inspect')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'inspect'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🧭</span>
              <span>Inspect</span>
            </button>
            <button
              onClick={() => handleToolSelect('tree')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'tree'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🌲</span>
              <span>Plant Forest</span>
            </button>
            <button
              onClick={() => handleToolSelect('house')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'house'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🏡</span>
              <span>Build Cottage</span>
            </button>
            <button
              onClick={() => handleToolSelect('tavern')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'tavern'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🍺</span>
              <span>Cozy Tavern</span>
            </button>
            <button
              onClick={() => handleToolSelect('farm')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'farm'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🌾</span>
              <span>Wheat Farm</span>
            </button>
            <button
              onClick={() => handleToolSelect('campfire')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'campfire'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🔥</span>
              <span>Campfire</span>
            </button>
            <button
              onClick={() => handleToolSelect('road')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'road'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🛣️</span>
              <span>Pave Road</span>
            </button>
            <button
              onClick={() => handleToolSelect('water')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'water'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🌊</span>
              <span>Carve Water</span>
            </button>
            <button
              onClick={() => handleToolSelect('spawn')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTool === 'spawn'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🧑‍🌾</span>
              <span>Spawn Citizen</span>
            </button>
            <button
              onClick={() => handleToolSelect('lightning')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all border-red-500/10 hover:border-red-500/30 cursor-pointer col-span-2 ${
                activeTool === 'lightning'
                  ? 'bg-red-600/15 border-red-500 text-red-300 font-semibold shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : 'bg-slate-950/30 border-slate-800 text-red-400 hover:text-red-300 hover:bg-red-950/10'
              }`}
            >
              <span className="text-lg">⚡</span>
              <span>Lightning Strike</span>
            </button>
            <button
              onClick={() => handleToolSelect('clear')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer col-span-2 ${
                activeTool === 'clear'
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-semibold shadow-md'
                  : 'bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-lg">🧹</span>
              <span>Clear / Bulldoze</span>
            </button>
          </div>
        </section>

        {/* Time of Day Cycle */}
        <section className="flex flex-col gap-2.5">
          <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Time of Day</label>
          <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 gap-1 text-[10px] font-semibold text-center select-none">
            {(['day', 'sunset', 'night'] as const).map((mode) => {
              const label = mode === 'day' ? '☀️ Day' : mode === 'sunset' ? '🌅 Sunset' : '🌙 Night';
              const isActive = timeOfDay === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setTimeOfDay(mode)}
                  className={`flex-1 py-2 px-1 rounded-lg transition-all cursor-pointer ${
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
        </section>

        {/* Citizen Registry with Live Needs (Step 17) */}
        <section className="flex flex-col gap-2.5">
          <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Citizen Registry</label>
          <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 max-h-60 overflow-y-auto select-none">
            {citizens.length === 0 ? (
              <p className="text-slate-500 italic text-[10px] text-center py-2">No citizens spawned. Use the spawner tool!</p>
            ) : (
              citizens.map((cit) => (
                <div key={cit.id} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/50 flex flex-col gap-1.5 text-[10px] shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.1)] border-[0.5px] border-white/20" style={{ backgroundColor: cit.capColor }} />
                      {cit.role} ({cit.id})
                    </span>
                    <span className={`px-1.5 py-0.5 bg-slate-950/80 text-[7px] rounded border uppercase font-extrabold tracking-wide ${
                      cit.goal === 'food' ? 'text-amber-400 border-amber-500/20 bg-amber-950/20' :
                      cit.goal === 'sleep' ? 'text-sky-400 border-sky-500/20 bg-sky-950/20' :
                      cit.goal === 'socialize' ? 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20' :
                      'text-slate-400 border-slate-800 bg-slate-900/40'
                    }`}>
                      {cit.goal === 'none' ? cit.currentScheduleState : `seek ${cit.goal}`}
                    </span>
                  </div>
                  
                  {/* Thought */}
                  <p className="text-slate-400 italic leading-tight truncate">"{cit.thought}"</p>
                  
                  {/* Needs Progress Bars */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    {/* Hunger */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[7px] text-slate-400 font-mono font-bold">
                        <span>🍗 Hunger</span>
                        <span>{Math.round(cit.hunger)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            cit.hunger <= 30 ? 'bg-red-500 animate-pulse' : cit.hunger <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${cit.hunger}%` }}
                        />
                      </div>
                    </div>
                    {/* Energy */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[7px] text-slate-400 font-mono font-bold">
                        <span>⚡ Energy</span>
                        <span>{Math.round(cit.energy)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            cit.energy <= 30 ? 'bg-red-500 animate-pulse' : cit.energy <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${cit.energy}%` }}
                        />
                      </div>
                    </div>
                    {/* Social */}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[7px] text-slate-400 font-mono font-bold">
                        <span>💬 Social</span>
                        <span>{Math.round(cit.social)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            cit.social <= 30 ? 'bg-red-500 animate-pulse' : cit.social <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${cit.social}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Audio / population utilities */}
        <section className="bg-slate-950/30 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">🔊 Sound FX</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none ${
                soundEnabled ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-slate-100 transition duration-200 ${
                soundEnabled ? 'translate-x-3.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className="border-t border-slate-800/40 my-0.5" />
          <div className="flex justify-between">
            <span className="text-slate-400">🧑‍🌾 Active Citizens</span>
            <span className="font-bold text-indigo-400 font-mono">{citizens.length}</span>
          </div>
        </section>

        {/* Return Button */}
        <div className="mt-auto border-t border-slate-800/40 pt-4">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition-all cursor-pointer text-center"
          >
            Return to World Map
          </button>
        </div>
      </aside>

      {/* 2. Central Simulator Game Board */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        
        {/* Floating details HUD overlay */}
        <div className="absolute top-6 left-6 z-30 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-4 py-3 rounded-xl shadow-2xl flex flex-col gap-1 max-w-xs text-xs pointer-events-none select-none">
          <h4 className="font-bold text-indigo-300 flex items-center gap-1">
            <span>🗺️</span> Region Inspector
          </h4>
          {hoveredSandboxTile ? (
            <div className="font-mono text-slate-300 flex flex-col gap-0.5 text-[10px]">
              <p>Type: <span className="text-slate-100 font-bold uppercase">{hoveredSandboxTile.terrainType}</span></p>
              <p>Coords: ({hoveredSandboxTile.x}, {hoveredSandboxTile.y})</p>
              <p>Structure: <span className="text-slate-100 uppercase">{hoveredSandboxTile.structure || 'None'}</span></p>
              <p>Elevation: {hoveredSandboxTile.elevation.toFixed(2)}</p>
              <p>Moisture: {hoveredSandboxTile.moisture.toFixed(2)}</p>
              <p>Temp: {hoveredSandboxTile.temperature.toFixed(2)}</p>
            </div>
          ) : (
            <p className="text-slate-400 italic text-[10px]">Hover tiles to inspect attributes</p>
          )}
        </div>

        {/* Interactive Game Board Grid */}
        <div className="relative p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] flex items-center justify-center select-none overflow-hidden">
          
          <div
            className={`grid grid-cols-16 grid-rows-16 gap-0 border border-slate-950 overflow-hidden relative shadow-2xl select-none ${
              shakeActive ? 'animate-shake' : ''
            }`}
            style={{
              width: '640px',
              height: '640px',
            }}
          >
            {/* Visual Time-of-Day Lighting Overlay Filter */}
            <div
              className={`absolute inset-0 z-20 pointer-events-none transition-all duration-1000 ${
                timeOfDay === 'sunset'
                  ? 'bg-amber-600/15 mix-blend-color-burn'
                  : timeOfDay === 'night'
                  ? 'bg-indigo-950/35 mix-blend-multiply'
                  : 'bg-transparent'
              }`}
            />

            {/* Lightning Strike Flash Overlay */}
            {shakeActive && (
              <div className="absolute inset-0 bg-white/95 z-30 pointer-events-none select-none" />
            )}

            {/* Render Tiles */}
            {sandboxTiles.map((row, lx) =>
              row.map((tile, ly) => {
                const isWater = tile.terrainType === 'water' || tile.terrainType === 'deep_water' || tile.terrainType === 'river';
                const hasTree = tile.terrainType === 'forest';
                const hasCactus = tile.terrainType === 'desert' && (Math.abs(Math.sin(lx * 42.1 + ly * 9.5) * 100) % 10 < 2);
                const hasCampfire = tile.structure === 'campfire';
                const hasCottage = tile.structure === 'cottage';
                const hasKeep = tile.structure === 'city_center';
                const hasHouse = tile.structure === 'house';
                const hasRuins = tile.structure === 'ruins';
                const hasObelisk = tile.structure === 'obelisk';
                const hasRoad = tile.hasRoad;
                const hasMinerals = (tile.terrainType === 'mountain' || tile.terrainType === 'hills') && (Math.abs(Math.sin(lx * 12.9 + ly * 78.2) * 100) % 10 < 3);
                const hasTavern = tile.structure === 'tavern';
                const hasFarm = tile.structure === 'farm';

                // Check if this tile has an active fish swimming
                const hasFish = isWater && (Math.abs(Math.sin(lx * 89.2 + ly * 23.4) * 100) % 10 < 1.5);

                return (
                  <div
                    key={`${lx}-${ly}`}
                    onPointerEnter={() => setHoveredSandboxTile(tile)}
                    onPointerLeave={() => setHoveredSandboxTile(null)}
                    onClick={() => handleTileClick(lx, ly)}
                    className={`relative flex items-center justify-center border-[0.5px] border-slate-950/20 cursor-pointer overflow-hidden transition-all duration-200 select-none group ${getTileColorClasses(
                      tile
                    )}`}
                    style={{
                      width: '40px',
                      height: '40px',
                    }}
                  >
                    {/* Hover Tile Border */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-white/20 z-10 pointer-events-none transition-opacity" />

                    {/* Rendering volumetric visual game assets instead of emojis */}
                    
                    {/* Swimming Fish (only on water) */}
                    {hasFish && (
                      <div className="absolute w-3 h-3 flex items-center justify-center animate-swim">
                        <SVGFish />
                      </div>
                    )}

                    {/* Cobblestone road paths connecting organically to neighbors */}
                    {hasRoad && (
                      <SVGRoad
                        north={lx > 0 && (sandboxTiles[lx - 1][ly].hasRoad || sandboxTiles[lx - 1][ly].structure !== undefined)}
                        south={lx < chunkSize - 1 && (sandboxTiles[lx + 1][ly].hasRoad || sandboxTiles[lx + 1][ly].structure !== undefined)}
                        west={ly > 0 && (sandboxTiles[lx][ly - 1].hasRoad || sandboxTiles[lx][ly - 1].structure !== undefined)}
                        east={ly < chunkSize - 1 && (sandboxTiles[lx][ly + 1].hasRoad || sandboxTiles[lx][ly + 1].structure !== undefined)}
                      />
                    )}

                    {/* Swaying Pine/Oak Tree */}
                    {hasTree && <SVGTree />}

                    {/* Swaying Desert Cactus */}
                    {hasCactus && <SVGCactus />}

                    {/* Gray Stone Boulder with Glistening Gold crystals */}
                    {hasMinerals && <SVGMineral />}

                    {/* Layered Wood Cottage with Smoking Chimney and lit windows at night */}
                    {hasCottage && (
                      <SVGCottage isNight={timeOfDay === 'night'} />
                    )}

                    {/* Tavern */}
                    {hasTavern && (
                      <SVGTavern isNight={timeOfDay === 'night'} />
                    )}

                    {/* Farm */}
                    {hasFarm && (
                      <SVGFarm />
                    )}

                    {/* Grand Keep / Town Hall */}
                    {hasKeep && (
                      <SVGTownHall isNight={timeOfDay === 'night'} />
                    )}

                    {/* Suburban House */}
                    {hasHouse && (
                      <SVGHouse district={tile.district} isNight={timeOfDay === 'night'} />
                    )}

                    {/* Glowing logs Campfire */}
                    {hasCampfire && <SVGCampfire />}

                    {/* Ancient Crumbling Ruins */}
                    {hasRuins && <SVGRuins />}

                    {/* Mystical glowing Obelisk */}
                    {hasObelisk && (
                      <SVGObelisk isNight={timeOfDay === 'night'} />
                    )}

                    {/* Scorched lightning particle visual overlay */}
                    {lightningHitCoords &&
                      Math.abs(lightningHitCoords.lx - lx) <= 1 &&
                      Math.abs(lightningHitCoords.ly - ly) <= 1 && (
                        <div className="absolute inset-0 bg-yellow-400/25 animate-ping z-10 pointer-events-none" />
                      )}
                  </div>
                );
              })
            )}

            {/* Floating Wandering Citizen NPCs Layer */}
            {citizens.map((cit) => (
              <div
                key={cit.id}
                className="absolute z-24 flex flex-col items-center justify-center select-none pointer-events-none"
                style={{
                  left: `${cit.x * 40 - 14}px`,
                  top: `${cit.y * 40 - 14}px`,
                  width: '28px',
                  height: '28px',
                  willChange: 'left, top',
                }}
              >
                {/* Active Thought speech bubble */}
                <div
                  className="absolute bottom-full mb-1 bg-slate-900/90 border border-slate-700/60 px-2 py-0.5 rounded-lg text-[8px] font-bold text-slate-100 whitespace-nowrap shadow-2xl flex items-center gap-1 scale-90 select-none opacity-90 transition-opacity duration-300"
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                  }}
                >
                  {cit.thought}
                </div>

                {/* Pixel animated citizen body */}
                <div className="animate-bounce" style={{ animationDuration: '1.4s' }}>
                  <SVGCitizen capColor={cit.capColor} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sandbox gameplay bottom status bar */}
        <div className="mt-4 bg-slate-900/60 border border-slate-800/80 px-6 py-2.5 rounded-full flex gap-4 text-xs font-mono text-slate-400">
          <p>
            Current Tool:{' '}
            <span className="text-indigo-400 font-bold uppercase">
              {activeTool === 'inspect' ? 'Inspection Mode' : `${activeTool} tool`}
            </span>
          </p>
          <span>&bull;</span>
          <p>Click on grid tiles to edit and paint sandbox layers.</p>
        </div>
      </main>
    </div>
  );
};
