export type TerrainType = 'deep_water' | 'water' | 'beach' | 'grass' | 'forest' | 'desert' | 'mountain' | 'snow' | 'river';

export interface TerrainConfig {
  type: TerrainType;
  label: string;
  color: number; // PixiJS color number
  hexColor: string; // Hex string for HTML/CSS UI
  threshold: number; // Altitude boundary guide
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  deep_water: {
    type: 'deep_water',
    label: 'Deep Ocean',
    color: 0x1E3A8A, // Navy Blue
    hexColor: '#1E3A8A',
    threshold: 0.22,
  },
  water: {
    type: 'water',
    label: 'Shallow Water',
    color: 0x3B82F6, // Blue
    hexColor: '#3B82F6',
    threshold: 0.38,
  },
  beach: {
    type: 'beach',
    label: 'Sandy Beach',
    color: 0xFEF08A, // Sand Yellow
    hexColor: '#FEF08A',
    threshold: 0.43,
  },
  grass: {
    type: 'grass',
    label: 'Grasslands',
    color: 0x10B981, // Emerald Green
    hexColor: '#10B981',
    threshold: 0.80,
  },
  forest: {
    type: 'forest',
    label: 'Forest',
    color: 0x047857, // Dark Green
    hexColor: '#047857',
    threshold: 0.80,
  },
  desert: {
    type: 'desert',
    label: 'Desert',
    color: 0xF59E0B, // Golden Orange
    hexColor: '#F59E0B',
    threshold: 0.80,
  },
  mountain: {
    type: 'mountain',
    label: 'Mountains',
    color: 0x6B7280, // Gray
    hexColor: '#6B7280',
    threshold: 0.88,
  },
  snow: {
    type: 'snow',
    label: 'Snowy Peaks',
    color: 0xF3F4F6, // White
    hexColor: '#F3F4F6',
    threshold: 1.0,
  },
  river: {
    type: 'river',
    label: 'River / Lake',
    color: 0x0EA5E9, // Sky Blue
    hexColor: '#0EA5E9',
    threshold: 0.0,
  },
};

/**
 * Whittaker-style biome selector matrix.
 * Chooses a biome dynamically based on elevation, moisture, and temperature inputs.
 */
export const getBiomeType = (
  elevation: number,
  moisture: number,
  temperature: number
): TerrainConfig => {
  // 1. Water Biomes
  if (elevation < 0.22) return TERRAIN_CONFIGS.deep_water;
  if (elevation < 0.38) return TERRAIN_CONFIGS.water;

  // 2. Coastal Biomes
  if (elevation < 0.43) return TERRAIN_CONFIGS.beach;

  // 3. Mountain/Peaks Biomes
  if (elevation >= 0.80) {
    // If extremely high elevation, or high elevation + cold temperature -> snowy peaks
    if (elevation >= 0.88 || temperature < 0.40) {
      return TERRAIN_CONFIGS.snow;
    }
    return TERRAIN_CONFIGS.mountain;
  }

  // 4. Land Biomes (0.43 <= elevation < 0.80)
  // Low moisture + hot temperature -> arid desert
  if (moisture < 0.35 && temperature > 0.65) {
    return TERRAIN_CONFIGS.desert;
  }
  // High moisture -> lush forest
  if (moisture > 0.55) {
    return TERRAIN_CONFIGS.forest;
  }
  // Fallback -> grasslands/plains
  return TERRAIN_CONFIGS.grass;
};

/**
 * Backwards compatibility helper for heightmap-only terrain selection.
 */
export const getTerrainByHeight = (height: number): TerrainConfig => {
  return getBiomeType(height, 0.5, 0.5);
};
