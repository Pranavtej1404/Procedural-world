import type { TerrainType } from './terrain';

export interface Resource {
  name: string;
  emoji: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  description: string;
}

export const BIOME_RESOURCES: Record<TerrainType, Resource[]> = {
  deep_water: [
    { name: 'Fish', emoji: '🐟', rarity: 'Common', description: 'Schools of deep-sea tuna and mackerel.' },
    { name: 'Seaweed', emoji: '🌿', rarity: 'Common', description: 'Nutritious giant kelp harvested from reefs.' },
    { name: 'Black Pearls', emoji: '🦪', rarity: 'Legendary', description: 'Exquisite, shimmering dark ocean pearls.' }
  ],
  water: [
    { name: 'Fish', emoji: '🐟', rarity: 'Common', description: 'Freshwater trout and salmon swimming near shores.' },
    { name: 'Coral Reefs', emoji: '🪸', rarity: 'Uncommon', description: 'Colorful coral structures rich in marine life.' },
    { name: 'Fine Sand', emoji: '🏖️', rarity: 'Common', description: 'Soft underwater sand perfect for glassblowing.' }
  ],
  beach: [
    { name: 'Fine Sand', emoji: '🏖️', rarity: 'Common', description: 'Silica-rich yellow sand lining the coasts.' },
    { name: 'Seashells', emoji: '🐚', rarity: 'Common', description: 'Assorted ornamental shells washed up by tides.' },
    { name: 'Coconuts', emoji: '🥥', rarity: 'Uncommon', description: 'Fresh, sweet coconuts from coastal palm trees.' }
  ],
  grass: [
    { name: 'Hemp Fiber', emoji: '🌾', rarity: 'Common', description: 'Strong organic fibers used to weave ropes and canvas.' },
    { name: 'Wild Crops', emoji: '🌽', rarity: 'Uncommon', description: 'Starch-rich wild grains and sweet corn.' },
    { name: 'Wild Herbs', emoji: '🌿', rarity: 'Uncommon', description: 'Aromatic herbs useful for brewing remedies.' }
  ],
  forest: [
    { name: 'Hardwood Timber', emoji: '🪵', rarity: 'Common', description: 'Dense, sturdy oak and pine logs for building structures.' },
    { name: 'Wild Game', emoji: '🍖', rarity: 'Common', description: 'Forest wildlife providing rich hides and fresh venison.' },
    { name: 'Chanterelle Mushrooms', emoji: '🍄', rarity: 'Rare', description: 'Highly prized edible wild mushrooms.' }
  ],
  desert: [
    { name: 'Fine Sand', emoji: '🏖️', rarity: 'Common', description: 'Dry, endless desert sand dunes.' },
    { name: 'Crude Oil', emoji: '🛢️', rarity: 'Rare', description: 'Black gold bubbling beneath the sandstone layer.' },
    { name: 'Iron Sand', emoji: '🪙', rarity: 'Uncommon', description: 'Magnetite-rich mineral deposits.' }
  ],
  mountain: [
    { name: 'Granite Stone', emoji: '🪨', rarity: 'Common', description: 'Tough volcanic rock ideal for fortressing and masoning.' },
    { name: 'Iron Ore', emoji: '🪙', rarity: 'Common', description: 'Veins of high-grade raw iron ore ready for smelting.' },
    { name: 'Bituminous Coal', emoji: '🪨', rarity: 'Uncommon', description: 'Combustible sedimentary mineral for fueling furnaces.' }
  ],
  snow: [
    { name: 'Compact Ice', emoji: '🧊', rarity: 'Common', description: 'Dense glacial ice blocks that never melt easily.' },
    { name: 'Quartz Crystal', emoji: '💎', rarity: 'Rare', description: 'Clear geode formations carrying high resonance.' },
    { name: 'Silver Ore', emoji: '🪙', rarity: 'Rare', description: 'Glimmering argentite veins frozen within glaciers.' }
  ],
  river: [
    { name: 'Fresh Water', emoji: '💧', rarity: 'Common', description: 'Pure, hydrating water running from pristine streams.' },
    { name: 'River Fish', emoji: '🐟', rarity: 'Common', description: 'Active freshwater perch and bass.' },
    { name: 'Silt Clay', emoji: '🧱', rarity: 'Uncommon', description: 'Fine sediment clay great for pottery and bricks.' }
  ]
};

export const getResourcesForBiome = (biome: TerrainType): Resource[] => {
  return BIOME_RESOURCES[biome] || [];
};
