import { getSeededRandom } from './terrainGenerator';

export interface InteriorItem {
  id: string;
  type: 'floor' | 'wall' | 'door' | 'window' | 'furniture';
  name: string;
  description: string;
  x: number; // grid local x
  y: number; // grid local y
  svgType?: 'bed' | 'throne' | 'fireplace' | 'forge' | 'counter' | 'anvil' | 'table' | 'rug' | 'chest' | 'bookshelf' | 'chair' | 'crate' | 'candle';
  style?: string; // custom visual descriptors
}

export interface BuildingInterior {
  name: string;
  description: string;
  gridSize: number; // 6 or 8
  floorMaterial: 'wood' | 'stone';
  items: InteriorItem[];
}

// Procedural word banks for immersive seed-stable names
const ADJECTIVES = ['Cozy', 'Rustic', 'Ancient', 'Secluded', 'Whispering', 'Golden', 'Shadowy', 'Misty', 'Sturdy', 'Vibrant', 'Royal', 'Dusty', 'Grand', 'Humble'];
const SURNAMES = ['Stone', 'Oak', 'Iron', 'River', 'Storm', 'Shadow', 'Ash', 'Glint', 'Gold', 'Amber', 'Glade', 'Hollow'];
const COMMERCIAL_TYPES = ['Tavern', 'Boutique', 'General Store', 'Apothecary', 'Curio Shop', 'Trading Post', 'Marketplace', 'Emporium'];
const INDUSTRIAL_TYPES = ['Smithy', 'Foundry', 'Workshop', 'Masonry', 'Granary', 'Millhouse', 'Forge', 'Tannery'];
const MILITARY_TYPES = ['Keep Ward', 'Throne Room', 'Grand Hall', 'Command Bastion', 'Sanctum', 'Garrison', 'Armory'];
const RESIDENTIAL_TYPES = ['Cabin', 'Cottage', 'Lodge', 'Abode', 'Home', 'Haven', 'Bungalow'];

export function generateInteriorForBuilding(
  wx: number,
  wy: number,
  seed: string,
  structureType: 'city_center' | 'house' | 'cottage' | 'ruins' | 'obelisk',
  district?: 'residential' | 'commercial' | 'industrial' | 'military'
): BuildingInterior {
  // Deterministic seed for this specific building based on its global coordinates
  const buildingSeed = `${seed}_interior_${wx}_${wy}`;
  const rand = getSeededRandom(buildingSeed);

  // 1. Determine size & style based on structureType and district
  const gridSize = structureType === 'city_center' ? 8 : 6;
  const actualDistrict = district || (structureType === 'city_center' ? 'military' : 'residential');
  
  const floorMaterial = (actualDistrict === 'military' || actualDistrict === 'industrial') ? 'stone' : 'wood';

  // 2. Procedural Name Generation
  let name = '';
  const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const sur = SURNAMES[Math.floor(rand() * SURNAMES.length)];
  
  if (actualDistrict === 'commercial') {
    const type = COMMERCIAL_TYPES[Math.floor(rand() * COMMERCIAL_TYPES.length)];
    name = `${adj} ${sur} ${type}`;
  } else if (actualDistrict === 'industrial') {
    const type = INDUSTRIAL_TYPES[Math.floor(rand() * INDUSTRIAL_TYPES.length)];
    name = `${sur} ${type}`;
  } else if (actualDistrict === 'military') {
    const type = MILITARY_TYPES[Math.floor(rand() * MILITARY_TYPES.length)];
    name = `Eldoria ${adj} ${type}`;
  } else {
    const type = RESIDENTIAL_TYPES[Math.floor(rand() * RESIDENTIAL_TYPES.length)];
    name = `${adj} ${sur} ${type}`;
  }

  const description = `A robust, seed-stable interior of a ${actualDistrict} building, paved with smooth ${floorMaterial} tiles. The air inside smells of ${
    actualDistrict === 'industrial' ? 'coal, ash, and heated metal' :
    actualDistrict === 'commercial' ? 'spices, old parchment, and dried herbs' :
    actualDistrict === 'military' ? 'beeswax, stone dust, and polished iron' :
    'pine needles, wool blankets, and sweet smoke'
  }.`;

  const items: InteriorItem[] = [];

  // 3. Populate floor grid
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      items.push({
        id: `floor_${x}_${y}`,
        type: 'floor',
        name: floorMaterial === 'stone' ? 'Flagstones' : 'Oak Planks',
        description: `Sturdy ${floorMaterial} paving, worn smooth by heavy footsteps.`,
        x,
        y
      });
    }
  }

  // 4. Populate walls
  // Top Wall (y = 0)
  for (let x = 0; x < gridSize; x++) {
    const hasWindow = x === 2 || x === gridSize - 3;
    items.push({
      id: `wall_top_${x}`,
      type: hasWindow ? 'window' : 'wall',
      name: hasWindow ? 'Glass Window' : 'Stone Boundary Wall',
      description: hasWindow ? 'A lead-lined glass window letting in soft external lighting.' : 'A solid load-bearing wall dividing this room from the wilderness.',
      x,
      y: 0
    });
  }
  // Bottom Wall (y = gridSize - 1)
  // Door is always in the center: x = Math.floor(gridSize / 2)
  const doorX = Math.floor(gridSize / 2);
  for (let x = 0; x < gridSize; x++) {
    if (x === doorX) {
      items.push({
        id: `door_bottom`,
        type: 'door',
        name: 'Oak Threshold',
        description: 'A heavy iron-banded door leading back out to the settlement.',
        x,
        y: gridSize - 1
      });
    } else {
      items.push({
        id: `wall_bottom_${x}`,
        type: 'wall',
        name: 'Stone Boundary Wall',
        description: 'A solid stone-paved boundary wall.',
        x,
        y: gridSize - 1
      });
    }
  }
  // Left Wall (x = 0, avoiding corners already drawn by top/bottom walls)
  for (let y = 1; y < gridSize - 1; y++) {
    items.push({
      id: `wall_left_${y}`,
      type: 'wall',
      name: 'Stone Boundary Wall',
      description: 'A solid stone boundary wall.',
      x: 0,
      y
    });
  }
  // Right Wall (x = gridSize - 1, avoiding corners)
  for (let y = 1; y < gridSize - 1; y++) {
    const hasWindow = y === Math.floor(gridSize / 2);
    items.push({
      id: hasWindow ? `window_right` : `wall_right_${y}`,
      type: hasWindow ? 'window' : 'wall',
      name: hasWindow ? 'Glass Window' : 'Stone Boundary Wall',
      description: hasWindow ? 'A window venting air and letting in diagonal amber sunlight.' : 'A solid load-bearing wall.',
      x: gridSize - 1,
      y
    });
  }

  // 5. Place furniture deterministically based on District rules
  // We specify absolute local coordinate cells inside the boundary walls (1 to gridSize-2)
  if (actualDistrict === 'residential') {
    // Cozy bed in top left corner (1, 1)
    items.push({
      id: 'furniture_bed',
      type: 'furniture',
      svgType: 'bed',
      name: 'Straw Mattress Bed',
      description: 'A cozy double bed made of robust pine frames and soft goose-feather quilts.',
      x: 1,
      y: 1
    });

    // Fireplace in top right (gridSize-2, 1)
    items.push({
      id: 'furniture_fireplace',
      type: 'furniture',
      svgType: 'fireplace',
      name: 'Brick Fireplace',
      description: 'A roaring, warm stone hearth that casts active dancing light flickers.',
      x: gridSize - 2,
      y: 1
    });

    // Dining table in the center
    items.push({
      id: 'furniture_table',
      type: 'furniture',
      svgType: 'table',
      name: 'Oak Trestle Table',
      description: 'A solid wood dining table smelling of home-cooked meals.',
      x: 3,
      y: 3
    });

    // Chairs around table
    items.push({
      id: 'furniture_chair_1',
      type: 'furniture',
      svgType: 'chair',
      name: 'Carved Spindle Chair',
      description: 'A matching rustic wood spindle chair.',
      x: 2,
      y: 3
    });
    items.push({
      id: 'furniture_chair_2',
      type: 'furniture',
      svgType: 'chair',
      name: 'Carved Spindle Chair',
      description: 'A matching rustic wood spindle chair.',
      x: 4,
      y: 3
    });

    // Storage chest next to bed (1, 2)
    items.push({
      id: 'furniture_chest',
      type: 'furniture',
      svgType: 'chest',
      name: 'Bound Travel Chest',
      description: 'A heavy brass-reinforced cedar chest containing woven garments and heirloom relics.',
      x: 1,
      y: 2
    });

    // Circular rug in the middle (3, 2)
    items.push({
      id: 'furniture_rug',
      type: 'furniture',
      svgType: 'rug',
      name: 'Woven Woolen Rug',
      description: 'A beautifully circular woven wool rug with blue and teal concentric spirals.',
      x: 3,
      y: 2
    });

    // Bookshelf against the wall (gridSize-2, 3)
    items.push({
      id: 'furniture_bookshelf',
      type: 'furniture',
      svgType: 'bookshelf',
      name: 'Scholarly Bookshelf',
      description: 'A tall wooden bookcase stacked with old lore maps, historical chronicles, and spell scrolls.',
      x: gridSize - 2,
      y: 3
    });
  } 
  
  else if (actualDistrict === 'commercial') {
    // L-shaped merchant counter
    items.push({
      id: 'furniture_counter_1',
      type: 'furniture',
      svgType: 'counter',
      name: 'Polished Sales Counter',
      description: 'A high-top mahogany vendor counter displaying shop scales and sales records.',
      x: 2,
      y: 2
    });
    items.push({
      id: 'furniture_counter_2',
      type: 'furniture',
      svgType: 'counter',
      name: 'Polished Sales Counter',
      description: 'A high-top mahogany vendor counter with a slot for the cash till.',
      x: 2,
      y: 3
    });

    // Fireplace in top right for warmth
    items.push({
      id: 'furniture_fireplace',
      type: 'furniture',
      svgType: 'fireplace',
      name: 'Ornate Stone Hearth',
      description: 'A cozy fireplace keeping the shop floor warm for customers.',
      x: gridSize - 2,
      y: 1
    });

    // Ledger desk with merchant chair (1, 2)
    items.push({
      id: 'furniture_chair',
      type: 'furniture',
      svgType: 'chair',
      name: 'High-back Shop stool',
      description: 'A cushioned stool used by the resident shopkeeper.',
      x: 1,
      y: 2
    });

    // Display shelves loaded with potions/wares (gridSize-2, 2)
    items.push({
      id: 'furniture_bookshelf',
      type: 'furniture',
      svgType: 'bookshelf',
      name: 'Display Shelves',
      description: 'A shelving unit stocked with colorful glass bottles, textiles, and spices.',
      x: gridSize - 2,
      y: 2
    });

    // Heavy iron chest for cash/inventory (1, 4)
    items.push({
      id: 'furniture_chest',
      type: 'furniture',
      svgType: 'chest',
      name: 'Reinforced Vault Chest',
      description: 'A heavy dual-locked iron chest bolted directly to the wooden floorboards.',
      x: 1,
      y: 4
    });

    // Street lantern or candle inside (3, 1)
    items.push({
      id: 'furniture_candle',
      type: 'furniture',
      svgType: 'candle',
      name: 'Merchant Candelabra',
      description: 'A three-pronged brass candelabra shedding a bright golden glow.',
      x: 3,
      y: 1
    });
  } 
  
  else if (actualDistrict === 'industrial') {
    // Heavy Brick Forge (top left/center: 2, 1)
    items.push({
      id: 'furniture_forge',
      type: 'furniture',
      svgType: 'forge',
      name: 'Coal-fired Blast Forge',
      description: 'A massive brick furnace that burns super-heated coal to melt steel ingots.',
      x: 2,
      y: 1
    });

    // Heavy Iron Anvil (3, 3)
    items.push({
      id: 'furniture_anvil',
      type: 'furniture',
      svgType: 'anvil',
      name: 'Hardened Steel Anvil',
      description: 'A massive 200lb iron anvil showing heavy hammer marks and soot.',
      x: 3,
      y: 3
    });

    // Tool Rack / Bookshelf styled as metal rack (gridSize-2, 2)
    items.push({
      id: 'furniture_bookshelf',
      type: 'furniture',
      svgType: 'bookshelf',
      name: 'Metal Tool Rack',
      description: 'A steel grid rack organizing heavy hammers, tongs, chisels, and blueprints.',
      x: gridSize - 2,
      y: 2
    });

    // Wooden cargo crates stacked in corner (1, gridSize-2)
    items.push({
      id: 'furniture_crate_1',
      type: 'furniture',
      svgType: 'crate',
      name: 'Supply Cargo Crate',
      description: 'A pine shipping crate filled with raw copper ore and leather straps.',
      x: 1,
      y: gridSize - 2
    });
    items.push({
      id: 'furniture_crate_2',
      type: 'furniture',
      svgType: 'crate',
      name: 'Coal Storage Bin',
      description: 'A rough-cut wooden container overflowing with charcoal blocks.',
      x: 2,
      y: gridSize - 2
    });

    // Water barrel/Trough for quenching (gridSize-2, gridSize-2)
    items.push({
      id: 'furniture_table',
      type: 'furniture',
      svgType: 'table',
      name: 'Quenching Trough',
      description: 'A heavy stone trough filled with murky cold water to temper glowing hot metal.',
      x: gridSize - 2,
      y: gridSize - 2
    });
  } 
  
  else if (actualDistrict === 'military') {
    // Grand Golden Throne at the top center of Keep (4, 2 in 8x8 grid)
    items.push({
      id: 'furniture_throne',
      type: 'furniture',
      svgType: 'throne',
      name: 'Royal Gold Keep Throne',
      description: 'An elegant high-backed throne made of polished gold, lined with plush crimson velvet.',
      x: 4,
      y: 2
    });

    // Long royal velvet carpet leading to throne (4, 3 to 4, 6)
    for (let cy = 3; cy <= 5; cy++) {
      items.push({
        id: `furniture_carpet_${cy}`,
        type: 'furniture',
        svgType: 'rug',
        name: 'Crimson Velvet Carpet',
        description: 'A luxurious royal red carpet lined with gold brocade.',
        x: 4,
        y: cy
      });
    }

    // Grand fireplace in top right (6, 1)
    items.push({
      id: 'furniture_fireplace',
      type: 'furniture',
      svgType: 'fireplace',
      name: 'Grand Stone Hearth',
      description: 'An massive limestone fireplace carved with shields and banners.',
      x: 6,
      y: 1
    });

    // Royal Banner / shield rack in top left (1, 1)
    items.push({
      id: 'furniture_rack',
      type: 'furniture',
      svgType: 'bookshelf',
      name: 'Banner Display Shield Stand',
      description: 'An oak frame holding broadswords, shields, and silk coats of arms.',
      x: 1,
      y: 1
    });

    // War meeting table (2, 4)
    items.push({
      id: 'furniture_table',
      type: 'furniture',
      svgType: 'table',
      name: 'Tactical War Table',
      description: 'A large table laid out with coordinate maps and lead soldier figurines.',
      x: 2,
      y: 4
    });

    // War council chairs
    items.push({
      id: 'furniture_chair_1',
      type: 'furniture',
      svgType: 'chair',
      name: 'Grand High-back Chair',
      description: 'An oak high-backed chair reserved for generals and dukes.',
      x: 1,
      y: 4
    });
    items.push({
      id: 'furniture_chair_2',
      type: 'furniture',
      svgType: 'chair',
      name: 'Grand High-back Chair',
      description: 'An oak high-backed chair reserved for generals and dukes.',
      x: 3,
      y: 4
    });

    // Candle stands (2, 2) and (6, 2)
    items.push({
      id: 'furniture_candle_left',
      type: 'furniture',
      svgType: 'candle',
      name: 'Iron Guard Candelabra',
      description: 'A heavy iron pole candelabra holding five burning beeswax candles.',
      x: 2,
      y: 2
    });
    items.push({
      id: 'furniture_candle_right',
      type: 'furniture',
      svgType: 'candle',
      name: 'Iron Guard Candelabra',
      description: 'A heavy iron pole candelabra holding five burning beeswax candles.',
      x: 6,
      y: 2
    });
  }

  return {
    name,
    description,
    gridSize,
    floorMaterial,
    items
  };
}
