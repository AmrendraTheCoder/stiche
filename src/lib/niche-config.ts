// src/lib/niche-config.ts
// Per-niche configuration for Exa searches, content angles, and profit logic.
// Enables Stiché to serve ANY small-scale Indian Instagram business.

export type NicheKey =
  | "crochet"
  | "fashion"
  | "jewellery"
  | "food"
  | "skincare"
  | "art"
  | "homedecor"
  | "other";

export interface NicheConfig {
  key: NicheKey;
  label: string;
  emoji: string;
  description: string;

  // Exa search domains — platform-specific for this niche
  marketDomains: string[];
  competitorDomains: string[];
  visualDomains: string[];

  // Exa category for market intel
  marketCategory: "news" | "financial report" | "company";

  // Material cost query terms
  materialCostQuery: string;

  // Primary selling platforms
  primaryPlatforms: string[];

  // Content angles that work for this niche
  contentAngles: string[];

  // Hook style templates
  hookStyleOptions: string[];

  // Profit formula overrides
  laborRateRange: { min: number; max: number }; // ₹/hour
  packagingCostRange: { min: number; max: number }; // ₹

  // Form fields to show (dynamic form generation)
  formFields: {
    productLabel: string;        // "What do you make/sell?"
    productPlaceholder: string;  // "e.g. tote bags, baby sets, flower bouquets"
    nicheOptions: string[];      // dropdown options for niche
  };
}

export const NICHE_CONFIGS: Record<NicheKey, NicheConfig> = {
  crochet: {
    key: "crochet",
    label: "Crochet & Knitting",
    emoji: "🧶",
    description: "Handmade crochet bags, home decor, baby items, clothing",
    marketDomains: ["etsy.com", "amazon.in", "meesho.com", "craftsvilla.com", "flipkart.com"],
    competitorDomains: ["instagram.com", "reddit.com", "pinterest.com"],
    visualDomains: ["pinterest.com", "instagram.com", "behance.net"],
    marketCategory: "news",
    materialCostQuery: "crochet yarn wool cotton price India wholesale per kg 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Meesho", "Etsy India"],
    contentAngles: ["process videos", "before-after reveals", "gifting stories", "cozy aesthetic", "festival drops"],
    hookStyleOptions: ["Curiosity", "Emotional story", "FOMO/Scarcity", "Behind the scenes", "Transformation"],
    laborRateRange: { min: 80, max: 200 },
    packagingCostRange: { min: 30, max: 80 },
    formFields: {
      productLabel: "What do you make?",
      productPlaceholder: "e.g. crochet bags, baby sets, wall hangings, flower bouquets",
      nicheOptions: ["Crochet bags & totes", "Baby & kids items", "Home decor", "Clothing & accessories", "Gift sets", "Seasonal/festival items"],
    },
  },

  fashion: {
    key: "fashion",
    label: "Fashion & Clothing",
    emoji: "👗",
    description: "Boutique fashion, ethnic wear, kurtas, indo-western, accessories",
    marketDomains: ["meesho.com", "myntra.com", "amazon.in", "ajio.com", "instagram.com"],
    competitorDomains: ["instagram.com", "reddit.com", "nykaa.com"],
    visualDomains: ["pinterest.com", "instagram.com", "vogue.in"],
    marketCategory: "news",
    materialCostQuery: "fabric wholesale price India cotton silk chiffon per meter 2025",
    primaryPlatforms: ["Instagram", "Meesho", "WhatsApp", "Myntra"],
    contentAngles: ["styling lookbook", "ethnic fusion", "festival outfits", "affordable vs luxury", "behind the stitch"],
    hookStyleOptions: ["Styling tips", "Festival outfit ideas", "Affordable fashion", "Transformation lookbook", "Trend alert"],
    laborRateRange: { min: 100, max: 300 },
    packagingCostRange: { min: 40, max: 100 },
    formFields: {
      productLabel: "What do you sell?",
      productPlaceholder: "e.g. kurtas, co-ord sets, sarees, indo-western tops",
      nicheOptions: ["Kurtas & ethnic wear", "Co-ord sets & western", "Sarees & dupattas", "Kids fashion", "Festival & bridal", "Accessories"],
    },
  },

  jewellery: {
    key: "jewellery",
    label: "Jewellery & Accessories",
    emoji: "💍",
    description: "Handmade jewellery, terracotta, oxidised, beaded, statement pieces",
    marketDomains: ["etsy.com", "amazon.in", "flipkart.com", "jaypore.com", "meesho.com"],
    competitorDomains: ["instagram.com", "pinterest.com", "reddit.com"],
    visualDomains: ["pinterest.com", "instagram.com", "behance.net"],
    marketCategory: "news",
    materialCostQuery: "jewellery beads wire terracotta clay wholesale price India 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Etsy India", "Meesho"],
    contentAngles: ["bridal & wedding", "daily wear styling", "festival looks", "gifting sets", "custom orders"],
    hookStyleOptions: ["Bridal styling", "Festival look", "Gifting ideas", "Behind the craft", "Mix & match styling"],
    laborRateRange: { min: 80, max: 250 },
    packagingCostRange: { min: 30, max: 80 },
    formFields: {
      productLabel: "What do you make?",
      productPlaceholder: "e.g. oxidised earrings, terracotta sets, beaded bracelets",
      nicheOptions: ["Terracotta & clay", "Oxidised metal", "Beaded jewellery", "Resin & acrylic", "Macramé accessories", "Bridal sets"],
    },
  },

  food: {
    key: "food",
    label: "Home Baker & Food Business",
    emoji: "🎂",
    description: "Home bakers, cloud kitchens, tiffin services, artisan food products",
    marketDomains: ["zomato.com", "swiggy.com", "instagram.com", "justdial.com"],
    competitorDomains: ["instagram.com", "justdial.com", "reddit.com"],
    visualDomains: ["pinterest.com", "instagram.com", "foodnetwork.com"],
    marketCategory: "news",
    materialCostQuery: "food ingredients flour sugar butter eggs wholesale price India 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Swiggy", "Zomato"],
    contentAngles: ["making process reels", "before-after cake reveals", "custom order stories", "festive specials", "behind the kitchen"],
    hookStyleOptions: ["Food reveal", "Customer reaction", "Process time-lapse", "Festival special", "Customisation showcase"],
    laborRateRange: { min: 80, max: 200 },
    packagingCostRange: { min: 50, max: 150 },
    formFields: {
      productLabel: "What do you make?",
      productPlaceholder: "e.g. custom cakes, brownies, mithai, tiffin service, chocolates",
      nicheOptions: ["Custom cakes & cupcakes", "Brownies & cookies", "Mithai & sweets", "Tiffin service", "Artisan chocolates", "Healthy snacks"],
    },
  },

  skincare: {
    key: "skincare",
    label: "Beauty & Skincare",
    emoji: "🌸",
    description: "Handmade skincare, natural beauty products, soaps, candles, wellness",
    marketDomains: ["nykaa.com", "amazon.in", "flipkart.com", "instagram.com"],
    competitorDomains: ["instagram.com", "reddit.com", "quora.com"],
    visualDomains: ["pinterest.com", "instagram.com", "mindbodygreen.com"],
    marketCategory: "news",
    materialCostQuery: "natural ingredients aloe vera essential oils beeswax wholesale India 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Nykaa", "Amazon India"],
    contentAngles: ["ingredient education", "before-after skin results", "self-care routines", "natural vs chemical", "sustainability story"],
    hookStyleOptions: ["Ingredient reveal", "Skin transformation", "Self-care ritual", "Natural beauty tip", "Product unboxing"],
    laborRateRange: { min: 80, max: 200 },
    packagingCostRange: { min: 50, max: 150 },
    formFields: {
      productLabel: "What do you make?",
      productPlaceholder: "e.g. face serums, soaps, lip balms, candles, body butter",
      nicheOptions: ["Face care (serums, creams)", "Body care", "Natural soaps", "Candles & aromatherapy", "Hair care", "Wellness & supplements"],
    },
  },

  art: {
    key: "art",
    label: "Art & Prints",
    emoji: "🎨",
    description: "Digital art, paintings, prints, illustrations, custom portraits",
    marketDomains: ["etsy.com", "amazon.in", "instagram.com", "society6.com"],
    competitorDomains: ["instagram.com", "behance.net", "reddit.com"],
    visualDomains: ["pinterest.com", "behance.net", "instagram.com"],
    marketCategory: "news",
    materialCostQuery: "canvas paper acrylic watercolour paint price India wholesale 2025",
    primaryPlatforms: ["Instagram", "Etsy India", "WhatsApp", "Amazon India"],
    contentAngles: ["making process timelapse", "custom portrait reveals", "gifting ideas", "workspace tour", "style evolution"],
    hookStyleOptions: ["Art reveal", "Commission process", "Gifting idea", "Before-after", "Style showcase"],
    laborRateRange: { min: 150, max: 500 },
    packagingCostRange: { min: 60, max: 200 },
    formFields: {
      productLabel: "What do you create?",
      productPlaceholder: "e.g. custom portraits, abstract paintings, digital prints, illustrations",
      nicheOptions: ["Custom portraits", "Abstract paintings", "Digital prints", "Watercolour art", "Wall art & decor", "Greeting cards & stationery"],
    },
  },

  homedecor: {
    key: "homedecor",
    label: "Home Decor",
    emoji: "🏠",
    description: "Handmade home decor, macramé, candles, planters, wall art, furniture upcycling",
    marketDomains: ["amazon.in", "flipkart.com", "meesho.com", "urban-company.com", "instagram.com"],
    competitorDomains: ["instagram.com", "pinterest.com", "reddit.com"],
    visualDomains: ["pinterest.com", "instagram.com", "houzz.com"],
    marketCategory: "news",
    materialCostQuery: "macrame rope clay pot decor material wholesale price India 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Amazon India", "Flipkart"],
    contentAngles: ["room makeover reveal", "DIY tips", "before-after decor", "gifting sets", "festive styling"],
    hookStyleOptions: ["Room reveal", "DIY tip", "Before-after", "Festival decor", "Trending style"],
    laborRateRange: { min: 100, max: 250 },
    packagingCostRange: { min: 60, max: 180 },
    formFields: {
      productLabel: "What do you make?",
      productPlaceholder: "e.g. macramé wall hangings, scented candles, painted pots, resin decor",
      nicheOptions: ["Macramé & woven decor", "Candles & aromatherapy", "Pottery & planters", "Resin art & decor", "Wall art & frames", "Festival & occasion decor"],
    },
  },

  other: {
    key: "other",
    label: "Other Business",
    emoji: "✨",
    description: "Any small-scale Indian Instagram business not listed above",
    marketDomains: ["instagram.com", "meesho.com", "amazon.in", "flipkart.com"],
    competitorDomains: ["instagram.com", "reddit.com"],
    visualDomains: ["pinterest.com", "instagram.com"],
    marketCategory: "news",
    materialCostQuery: "handmade product raw material cost India wholesale 2025",
    primaryPlatforms: ["Instagram", "WhatsApp", "Meesho"],
    contentAngles: ["product showcase", "behind the scenes", "customer stories", "festival drops", "process reveal"],
    hookStyleOptions: ["Curiosity", "Emotional story", "FOMO/Scarcity", "Behind the scenes", "Transformation"],
    laborRateRange: { min: 80, max: 200 },
    packagingCostRange: { min: 30, max: 100 },
    formFields: {
      productLabel: "What do you sell?",
      productPlaceholder: "e.g. describe your products",
      nicheOptions: [],
    },
  },
};

export function getNicheConfig(category: string): NicheConfig {
  return NICHE_CONFIGS[category as NicheKey] || NICHE_CONFIGS.other;
}

export function getAllNiches(): NicheConfig[] {
  return Object.values(NICHE_CONFIGS).filter(n => n.key !== "other");
}
