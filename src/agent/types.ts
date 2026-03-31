// ─── AGENT INPUT ────────────────────────────────────────────────────
export interface AgentInput {
  topic: string;
  niche: string;
  region: string;
  city?: string;
  hookStyle: string;
  goal: string;
  imageBase64?: string;
  imageMimeType?: string;
  instagramHandle?: string;
  businessContext?: string;
}

// ─── TREND AGENT OUTPUT TYPES ───────────────────────────────────────
export interface TrendSignal {
  trend: string;
  momentum: "hot" | "rising" | "steady";
  region: string;
  why: string;
  searchVolume: string;          // e.g. "12,000+ monthly searches"
  competitorCount: string;       // e.g. "Low — under 50 sellers"
  opportunityScore: number;      // 1-100 composite score
  actionTip: string;             // specific action the seller should take
}

export interface TrafficData {
  region: string;
  score: number;
  trend: "up" | "stable" | "down";
  insight: string;
  demographicBreakdown: string;  // e.g. "65% women 22-35, metro cities"
  conversionPotential: string;   // e.g. "High — 8% avg conversion for handmade"
  seasonalNote: string;          // e.g. "Peaks during Diwali, Rakhi seasons"
}

export interface CustomerPersona {
  name: string;
  age: string;
  location: string;
  behavior: string;
  buyingIntent: "high" | "medium" | "low";
  socialMediaBehavior: string;   // how they discover & interact on Instagram
  priceRange: string;            // "₹300–₹800 per purchase"
  purchaseTriggers: string[];    // ["festival gifting", "self-care", "home decor"]
  preferredPlatforms: string[];  // ["Instagram", "Meesho", "WhatsApp"]
}

export interface PurchaseSignal {
  category: string;
  score: number;
  trend: "up" | "stable" | "down";
  insight: string;
  avgPriceRange: string;         // "₹200–₹600"
  seasonalPeak: string;          // "Oct-Dec (festive season)"
  competitionLevel: string;      // "Low / Medium / High"
}

export interface ContentStrategy {
  bestTime: string;
  bestDay: string;
  format: string;
  contentAngle: string;
  ctaSuggestion: string;
  competitorGap: string;
  contentPillars: string[];      // ["Behind-the-scenes", "Customer stories", "Process reels"]
  postingFrequency: string;      // "4-5 posts/week, 2 reels, 3 stories daily"
  audienceGrowthTips: string[];  // 3-5 specific growth tactics
  engagementTactics: string[];   // interactive elements: polls, questions, etc.
}

export interface CityMarketData {
  population: string;
  avgIncome: string;
  craftMarketSize: string;
  onlinePenetration: string;
  topPlatforms: string[];
  festivalCalendar: string[];
  competitorDensity: string;
}

export interface ImageAnalysis {
  productType: string;
  colors: string[];
  style: string;
  instagramReadiness: number;
  lightingScore: number;
  compositionScore: number;
  colorHarmonyScore: number;
  productClarityScore: number;
  improvements: string[];
  moodKeywords: string[];        // ["cozy", "minimal", "artisan"]
  suggestedFilters: string[];    // ["Clarendon", "Juno", "warm tone edit"]
  bestPostingContext: string;    // "Ideal for carousel or flat-lay story"
}

export interface PinterestSuggestion {
  idea: string;
  whyItWorks: string;
  searchTerms: string[];
  estimatedEngagement: "high" | "medium" | "low";
}

export interface ProfitFormula {
  name: string;
  formula: string;
  explanation: string;
  example: string;
}

export interface CompetitorPricing {
  platform: string;
  priceRange: string;            // "₹350–₹900"
  sellerCount: string;           // "50+ sellers"
  avgRating: string;             // "4.2 stars"
  deliveryTime: string;          // "5-7 days"
}

export interface ProfitAnalysis {
  estimatedSellingPrice: { min: number; max: number; currency: string };
  materialCost: { min: number; max: number };
  laborHours: { min: number; max: number };
  laborCostPerHour: number;
  platformFees: { platform: string; percentage: number }[];
  shippingEstimate: number;
  packagingCost: number;
  photographyCost: number;
  profitMargin: { min: number; max: number };
  monthlyPotential: { units: number; revenue: number; profit: number };
  breakEvenUnits: number;
  competitorPricing: CompetitorPricing[];
  seasonalFactors: string[];     // ["Price 20% higher during Diwali", ...]
  scalingTips: string[];         // ["Batch production reduces cost by 15%", ...]
  pricingStrategy: string;       // "Premium positioning — emphasize handmade quality"
  formulae: ProfitFormula[];
}

// ─── INSTAGRAM AD COPY ─────────────────────────────────────────────
export interface InstagramAdCopy {
  headline: string;
  primaryText: string;
  description: string;
  ctaButton: string;
  targetAudience: string;
  adObjective: string;
  variants: { headline: string; primaryText: string }[];
}

// ─── ROAS CALCULATOR ────────────────────────────────────────────────
export interface ROASCalculator {
  dailyBudget: number;
  estimatedReach: { min: number; max: number };
  estimatedClicks: { min: number; max: number };
  costPerClick: { min: number; max: number };
  estimatedConversions: { min: number; max: number };
  costPerConversion: number;
  breakEvenROAS: number;
  projectedROAS: number;
  monthlyAdSpend: number;
  monthlyAdRevenue: number;
  weeklyProjection: { spend: number; revenue: number; profit: number };
  scalingRecommendation: string; // "Safe to scale to ₹500/day after 7 days"
  formulae: ProfitFormula[];
}

// ─── REEL SCRIPT ────────────────────────────────────────────────────
export interface ReelShot {
  shotNumber: number;
  duration: string;
  visual: string;
  textOverlay: string;
  transition: string;
  bRollSuggestion?: string;     // optional B-roll idea
}

export interface ReelScript {
  duration: string;
  totalShots: number;
  trendingAudio: string;
  shots: ReelShot[];
  captionForReel: string;
  postingTip: string;
  musicBeatSync: string;        // "Drop text at 0:03 beat, product reveal at 0:08"
}

// ─── INSTAGRAM PROFILE ──────────────────────────────────────────────
export interface InstagramProfile {
  handle: string;
  followerCountStr: string;
  engagementRateStr: string;
  recentActivitySummary: string;
  bestPerformingStyles: string;
  growthTrend: string;
}

// ─── AGENT OUTPUT ───────────────────────────────────────────────────
export interface AgentOutput {
  trends: TrendSignal[];
  traffic: TrafficData[];
  customers: CustomerPersona[];
  purchases: PurchaseSignal[];
  strategy: ContentStrategy | null;
  cityMarket: CityMarketData | null;
  hooks: string[];
  caption: string;
  hashtags: string[];
  agentInsight: string;
  imageAnalysis: ImageAnalysis | null;
  pinterestSuggestions: PinterestSuggestion[];
  profit: ProfitAnalysis | null;
  adCopy: InstagramAdCopy | null;
  roas: ROASCalculator | null;
  reelScript: ReelScript | null;
  instagramProfile: InstagramProfile | null;
}

// ─── CALENDAR TYPES ─────────────────────────────────────────────────
export interface CalendarInput {
  products: string;
  audience: string;
  region: string;
  city?: string;
  brandVoice: string;
  priceRange: string;
  businessContext?: string;
}

export interface CalendarDayStory {
  slide: number;
  content: string;
  sticker?: string;
}

export interface CalendarDay {
  day: string;
  format: string;
  theme: string;
  hook: string;
  caption: string;
  hashtags: string[];
  bestTime: string;
  story?: CalendarDayStory[];
}

export interface CalendarOutput {
  days: CalendarDay[];
  trendBriefing: string;
  weeklyTheme: string;
}
