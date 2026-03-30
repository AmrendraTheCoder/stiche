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
}

export interface TrafficData {
  region: string;
  score: number;
  trend: "up" | "stable" | "down";
  insight: string;
}

export interface CustomerPersona {
  name: string;
  age: string;
  location: string;
  behavior: string;
  buyingIntent: "high" | "medium" | "low";
}

export interface PurchaseSignal {
  category: string;
  score: number;
  trend: "up" | "stable" | "down";
  insight: string;
}

export interface ContentStrategy {
  bestTime: string;
  bestDay: string;
  format: string;
  contentAngle: string;
  ctaSuggestion: string;
  competitorGap: string;
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

export interface ProfitAnalysis {
  estimatedSellingPrice: { min: number; max: number; currency: string };
  materialCost: { min: number; max: number };
  laborHours: { min: number; max: number };
  laborCostPerHour: number;
  platformFees: { platform: string; percentage: number }[];
  shippingEstimate: number;
  profitMargin: { min: number; max: number };
  monthlyPotential: { units: number; revenue: number; profit: number };
  breakEvenUnits: number;
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
  formulae: ProfitFormula[];
}

// ─── REEL SCRIPT ────────────────────────────────────────────────────
export interface ReelShot {
  shotNumber: number;
  duration: string;
  visual: string;
  textOverlay: string;
  transition: string;
}

export interface ReelScript {
  duration: string;
  totalShots: number;
  trendingAudio: string;
  shots: ReelShot[];
  captionForReel: string;
  postingTip: string;
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
