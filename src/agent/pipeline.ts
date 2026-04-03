import Anthropic from "@anthropic-ai/sdk";
import {
  AgentInput,
  AgentOutput,
} from "./types";
import { runExaResearch, runExaPinterestResearch, runExaWithPlannedQueries } from "../lib/exa-search";
import { planExaQueries } from "../lib/query-planner";
import { getBusinessProfile, getRecentSearchHistory, saveSearchHistory, getLearningMemory } from "../lib/db";
import crypto from "crypto";

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ─── MODEL ROUTING STRATEGY (cost-optimized) ────────────────────────
// Haiku 4.5: $1/$5 per MTok  — research, analytics, structured JSON
// Sonnet 4.6: $3/$15 per MTok — creative content (hooks, captions, ads, reels)
// Result: ~65% cost reduction per run vs all-Sonnet
const HAIKU  = "claude-haiku-4-5-20251001";   // Data gathering, structured JSON
const SONNET = "claude-sonnet-4-6";            // Creative: hooks, captions, ad copy, reels

// ─── UTILITY ────────────────────────────────────────────────────────

function extractJSON(raw: string): any {
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first (fastest, works when response is not truncated)
  try { return JSON.parse(cleaned); } catch {}

  // Find the outermost { } block
  const objStart = cleaned.indexOf("{");
  if (objStart < 0) { console.warn("No JSON object found"); return null; }

  // Walk through chars counting depth — handles truncated JSON
  let depth = 0;
  let inString = false;
  let escape = false;
  let objEnd = -1;

  for (let i = objStart; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') { depth--; if (depth === 0) { objEnd = i; break; } }
  }

  if (objEnd > objStart) {
    try { return JSON.parse(cleaned.slice(objStart, objEnd + 1)); } catch {}
  }

  // JSON was truncated — repair by closing all open brackets
  const fragment = cleaned.slice(objStart);
  const repaired = repairTruncatedJSON(fragment);
  if (repaired) {
    try { return JSON.parse(repaired); } catch {}
  }

  console.warn("JSON extraction failed from:", raw.slice(0, 300));
  return null;
}

function repairTruncatedJSON(fragment: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastValidPos = 0;

  for (let i = 0; i < fragment.length; i++) {
    const ch = fragment[i];
    if (escape) { escape = false; lastValidPos = i; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; if (!inString) lastValidPos = i; continue; }
    if (inString) continue;
    if (ch === '{') { stack.push('}'); lastValidPos = i; }
    else if (ch === '[') { stack.push(']'); lastValidPos = i; }
    else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) { stack.pop(); lastValidPos = i; }
    } else if (ch !== ' ' && ch !== '\n' && ch !== '\r' && ch !== '\t') {
      lastValidPos = i;
    }
  }

  if (stack.length === 0) return fragment;

  let tail = fragment.slice(0, lastValidPos + 1).trimEnd();
  if (tail.endsWith(',')) tail = tail.slice(0, -1);
  return tail + stack.reverse().join('');
}


function getText(content: any[]): string {
  return content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

// ─── PIPELINE v4 — EXA DEEP-REASONING + ANTHROPIC MAX-QUALITY ───────
/**
 * 5-PHASE ARCHITECTURE (Exa deep-reasoning + Anthropic smart routing):
 *
 * PHASE 0 — Exa Deep Research (4 parallel deep-reasoning searches)
 *           → 75+ results with full text, structured summaries,
 *             subpage content, outbound links, 6000-char highlights
 *           → Feeds MASSIVE research corpus into all Claude calls
 *
 * CALL 1B — Market Analytics (HAIKU, 8000 tokens) → trends, traffic, city, personas
 * CALL 1C — Financial Intel  (HAIKU, 5000 tokens) → profit, pricing, competitor analysis
 * CALL 2A — Content Strategy (SONNET, 4000 tokens) → hooks, caption, hashtags, insight
 * CALL 2B — Ad & Reel Engine (SONNET, 4000 tokens) → ad copy, ROAS, reel script
 * CALL 3  — Image+Pinterest  (SONNET + vision + Exa Pinterest, 3000 tokens) [conditional]
 *
 * PARALLEL EXECUTION:
 *   Phase 0: Exa runs 4 deep-reasoning searches in parallel (~5-15s)
 *   Phase 1: 1B + 1C run in parallel (both use Exa research, independent outputs)
 *   Phase 2: 2A + 2B run in parallel (both use Phase 1 outputs, independent outputs)
 *   Phase 3: Call 3 runs alone (Exa Pinterest + Claude vision, conditional)
 *
 * Exa deep-reasoning: $7/1k requests + $1/1k pages content
 * Claude: Haiku $1/$5, Sonnet $3/$15 per MTok
 * Result: Maximum data quality at optimized cost
 */
export async function runAgentPipeline(
  input: AgentInput,
): Promise<AgentOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it in Vercel Dashboard > Settings > Environment Variables, then redeploy.");
  }

  const { topic, niche, region, city, hookStyle, goal, imageBase64, imageMimeType, instagramHandle } = input;
  const locationStr = city ? `${city}, ${region}` : region;
  console.log(`\nPipeline v4 (Exa-powered): "${topic}" / "${niche}" / ${locationStr}` + (instagramHandle ? ` / IG: @${instagramHandle}` : ""));

  const result: AgentOutput = {
    trends: [],
    traffic: [],
    customers: [],
    purchases: [],
    strategy: null,
    cityMarket: null,
    hooks: [],
    caption: "",
    hashtags: [],
    agentInsight: "",
    imageAnalysis: null,
    pinterestSuggestions: [],
    profit: null,
    adCopy: null,
    roas: null,
    reelScript: null,
    instagramProfile: null,
  };

  // ══════════════════════════════════════════════════════════════════
  // PHASE 0: Query Planner → Exa Deep-Reasoning
  // Step 1: Load business profile + learning memory from MongoDB
  // Step 2: Claude Haiku plans dynamic, personalized Exa queries
  // Step 3: Exa runs planned queries in parallel (deep-reasoning)
  // ══════════════════════════════════════════════════════════════════
  console.log("Phase 0: Loading profile + planning queries...");

  // Generate a searchId for tracking this run
  const searchId = `s_${crypto.randomBytes(6).toString("hex")}`;
  const sessionId = input.businessContext || "anonymous";

  // Load profile + history + memory (non-blocking if DB unavailable)
  let profile = null;
  let searchHistory: any[] = [];
  let learning = null;
  let businessSystemPrompt = "";

  try {
    [profile, searchHistory, learning] = await Promise.all([
      getBusinessProfile(sessionId),
      getRecentSearchHistory(sessionId, 8),
      getLearningMemory(sessionId),
    ]);
    businessSystemPrompt = profile?.systemPrompt || "";
    console.log(`  Profile: ${profile ? profile.shopName : "none"} | History: ${searchHistory.length} searches | Level: ${learning?.learningLevel || 1}`);
  } catch (err) {
    console.warn("  Profile load skipped (DB unavailable):", (err as Error).message);
  }

  // Save initial search history entry (updates later via /api/behavior)
  if (sessionId !== "anonymous") {
    saveSearchHistory({
      sessionId,
      searchId,
      input: { topic, niche, region, city, goal },
      feedbackEmoji: null,
      behaviorScore: 0,
      copiedSections: [],
      pdfDownloaded: false,
      timeOnResultsMs: 0,
      topicsSearched: [topic],
      createdAt: new Date().toISOString(),
    }).catch(() => {});
  }

  // Run query planner (Claude Haiku generates dynamic Exa queries)
  let rawResearch = "";
  try {
    const planned = await planExaQueries(topic, niche, region, city, goal, profile, searchHistory, learning);

    if (planned?.searches?.length) {
      console.log(`  QueryPlanner: Using dynamic queries. Reasoning: ${planned.reasoning}`);
      rawResearch = await runExaWithPlannedQueries(planned.searches);
    } else {
      // Fallback to hardcoded searches
      console.log("  QueryPlanner: Returned nothing, falling back to default Exa searches...");
      rawResearch = await runExaResearch(topic, niche, region, city);
    }
    console.log("  Exa research gathered:", rawResearch.length, "chars");
  } catch (err) {
    console.error("Exa/QueryPlanner error:", (err as Error).message);
    rawResearch = `Topic: ${topic}, Niche: ${niche}, Region: ${locationStr}. Exa unavailable — generate from domain knowledge.`;
  }

  // Prepend business system context to all research for Claude calls
  if (businessSystemPrompt) {
    rawResearch = `═══ BUSINESS PROFILE CONTEXT ═══\n${businessSystemPrompt}\n\n${rawResearch}`;
  }

  // ══════════════════════════════════════════════════════════════════
  // PHASE 1: Run 1B (Market Analytics) + 1C (Financial) in parallel
  // Both receive the MASSIVE Exa research corpus for maximum quality
  // ══════════════════════════════════════════════════════════════════
  console.log("Phase 1: Running calls 1B + 1C in parallel (Exa-enriched)...");
  await Promise.all([
    // ─── CALL 1B: Market Analytics ───────────────────────────────────────────────────
    (async () => {
      console.log("Call 1B: Structuring market analytics (trends, traffic, personas)...");
      try {
    const cityBlock = city ? `
  "cityMarket": {
    "population": "<city population from research, e.g. '3.4 million'>",
    "avgIncome": "<average household income in INR from research, e.g. '₹45,000/month'>",
    "craftMarketSize": "<estimated craft/handmade market value or description, e.g. '₹120 crore annual handmade market'>",
    "onlinePenetration": "<% shopping online, e.g. '62% of 18-35 age group'>",
    "topPlatforms": ["platform1", "platform2", "platform3", "platform4"],
    "festivalCalendar": ["Festival1 (Month)", "Festival2 (Month)", "Festival3 (Month)", "Festival4 (Month)", "Festival5 (Month)"],
    "competitorDensity": "low|medium|high — with explanation"
  },` : `"cityMarket": null,`;

    const igBlock = instagramHandle ? `
  "instagramProfile": {
    "handle": "@${instagramHandle}",
    "followerCountStr": "<estimated or found follower count>",
    "engagementRateStr": "<estimated engagement rate, e.g. '2-4%'>",
    "recentActivitySummary": "<detailed summary of posting frequency, last active, content types posted>",
    "bestPerformingStyles": "<what content types work best for them — reels, carousels, flat-lays, etc.>",
    "growthTrend": "<up/stable/down with context>"
  },` : `"instagramProfile": null,`;

    const structurePrompt = `You are a SENIOR MARKET RESEARCH ANALYST at a top Indian e-commerce consultancy specializing in handmade & artisan products. You have 15 years of experience analyzing the Indian craft market.

Your task: Transform the comprehensive Exa deep-reasoning research data below into a precisely structured analytics report. This data includes structured summaries with SPECIFIC prices, competitor metrics, demographics, and trend data extracted by the Exa AI search agent. Use ALL of this data — every field must contain REAL, SPECIFIC, ACTIONABLE data from the research.

═══ EXA DEEP-REASONING RESEARCH DATA ═══
${rawResearch.slice(0, 30000)}

═══ ANALYSIS PARAMETERS ═══
PRODUCT: "${topic}" | NICHE: "${niche}" | LOCATION: ${locationStr}, India | GOAL: ${goal}

═══ OUTPUT FORMAT ═══
Return ONLY a valid JSON object. Fill EVERY field with substantive, research-backed data.

{
  "trends": [
    {
      "trend": "<specific product/style trend name — NOT generic>",
      "momentum": "hot",
      "region": "<specific Indian state or city where this is trending>",
      "why": "<2-sentence explanation citing the market driver behind this trend>",
      "searchVolume": "<estimated monthly searches, e.g. '15,000+ monthly' or 'High — growing 40% MoM'>",
      "competitorCount": "<how crowded this trend is, e.g. 'Low — fewer than 30 active sellers on Instagram'>",
      "opportunityScore": 85,
      "actionTip": "<one precise action the seller should take, e.g. 'List this product at ₹599 on Instagram with carousel showing process'>"
    },
    <provide exactly 7 trends — mix of hot, rising, and steady>
  ],
  "traffic": [
    {
      "region": "<specific Indian state>",
      "score": 88,
      "trend": "up",
      "insight": "<why this region matters for this product — cite specific market data>",
      "demographicBreakdown": "<who's buying in this region, e.g. '70% women 22-34, primarily IT professionals and college students'>",
      "conversionPotential": "<how likely traffic converts, e.g. 'High — 6-9% conversion rate for handmade on Instagram'>",
      "seasonalNote": "<when this region peaks, e.g. 'Strongest Oct-Dec (Diwali, Christmas) and Feb (Valentine gifting)'>"
    },
    <provide exactly 6 regions>
  ],
  ${cityBlock}
  ${igBlock}
  "customers": [
    {
      "name": "<realistic Indian persona name, e.g. 'Priya Sharma'>",
      "age": "24-32",
      "location": "${city || 'Mumbai'}",
      "behavior": "<DETAILED buying behavior — 4-5 sentences minimum. Include: how they discover products, what makes them buy, their budget cycle, gifting patterns, brand loyalty traits>",
      "buyingIntent": "high",
      "socialMediaBehavior": "<how they use Instagram: browsing reels during lunch break, saving posts for later, DMing sellers for custom orders, checking stories for new drops>",
      "priceRange": "₹400–₹1200 per purchase",
      "purchaseTriggers": ["trigger1", "trigger2", "trigger3", "trigger4"],
      "preferredPlatforms": ["Instagram", "WhatsApp", "Meesho"]
    },
    <provide exactly 5 distinct personas across different demographics and locations>
  ],
  "purchases": [
    {
      "category": "<specific product category, e.g. 'Crochet Tote Bags' NOT just 'bags'>",
      "score": 92,
      "trend": "up",
      "insight": "<why this category is performing this way — cite demand drivers>",
      "avgPriceRange": "₹350–₹800",
      "seasonalPeak": "Oct-Dec (festive season gifting)",
      "competitionLevel": "Medium — ~100 active sellers on Instagram India"
    },
    <provide exactly 6 product categories with realistic demand scores>
  ],
  "strategy": {
    "bestTime": "<specific time ranges in IST with reasoning, e.g. '12:00-1:30 PM IST (lunch break scrolling) and 8:30-10:00 PM IST (evening relaxation)'>",
    "bestDay": "<specific days with reasoning, e.g. 'Wednesday and Sunday — highest engagement for lifestyle/handmade content'>",
    "format": "<specific format with explanation, e.g. 'Reel (15-30s process videos) for reach; Carousel (5-7 slides) for saves'>",
    "contentAngle": "<specific angle tailored to this product and audience>",
    "ctaSuggestion": "<exact CTA text to use, e.g. 'DM us \"WANT\" to order 💌 — limited pieces handmade just for you'>",
    "competitorGap": "<specific gap found in competitor analysis — what they're NOT doing that this seller should do>",
    "contentPillars": ["pillar1 — brief description", "pillar2 — brief description", "pillar3 — brief description", "pillar4 — brief description", "pillar5 — brief description"],
    "postingFrequency": "<specific schedule, e.g. '5 posts/week: 2 Reels, 2 Carousels, 1 Single. Stories: 5-7 daily. Lives: 1 per week on Sunday'>",
    "audienceGrowthTips": [
      "<tip 1 — specific, actionable, not generic>",
      "<tip 2>",
      "<tip 3>",
      "<tip 4>",
      "<tip 5>"
    ],
    "engagementTactics": [
      "<tactic 1 — e.g. 'Use Instagram Polls in stories asking followers to pick between 2 color options'>",
      "<tactic 2>",
      "<tactic 3>",
      "<tactic 4>"
    ]
  }
}

═══ QUALITY RULES ═══
1. EVERY trend must have a unique, specific name — NOT "Crochet Trend 1"
2. Customer persona behaviors must be 4-5 sentences MINIMUM with Indian cultural context
3. Purchase triggers should reflect Indian buying psychology (gifting culture, festivals, Instagram influence)
4. ALL scores must be realistic and differentiated (not all 80-90)
5. Action tips must be specific enough to implement TODAY
6. Use ACTUAL data from research — prices in ₹, real platform names, real Indian cities
7. Return ONLY valid JSON — no markdown, no commentary`;

    const response = await getAnthropic().messages.create({
      model: HAIKU, // Analytics: structured JSON output — Haiku excels at this
      max_tokens: 8000,
      messages: [{ role: "user", content: structurePrompt }],
    });

    const raw = getText(response.content);
    console.log("  Market analytics response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed) {
      result.trends = Array.isArray(parsed.trends) ? parsed.trends : [];
      result.traffic = Array.isArray(parsed.traffic) ? parsed.traffic : [];
      result.customers = Array.isArray(parsed.customers) ? parsed.customers : [];
      result.purchases = Array.isArray(parsed.purchases) ? parsed.purchases : [];
      result.strategy = parsed.strategy || null;
      result.cityMarket = parsed.cityMarket || null;
      result.instagramProfile = parsed.instagramProfile || null;
    }

    console.log(`  ${result.trends.length} trends, ${result.traffic.length} regions, ${result.customers.length} personas, ${result.purchases.length} purchases, strategy: ${result.strategy ? "yes" : "no"}, cityMarket: ${result.cityMarket ? "yes" : "no"}, IG: ${result.instagramProfile ? "yes" : "no"}`);
      } catch (err) {
        const msg = (err as Error).message || String(err);
        console.error("Call 1B FAILED:", msg);
        throw new Error(`Market analytics failed: ${msg}`);
      }
    })(),

    // ─── CALL 1C: Financial Intelligence ────────────────────────────────────────────
    (async () => {
      console.log("Call 1C: Financial intelligence — profit, pricing, competitors...");
      try {
    const financialPrompt = `You are a FINANCIAL ANALYST specializing in pricing strategy for Indian handmade & artisan businesses. You help small sellers maximize profit through smart pricing, cost control, and platform selection.

═══ RESEARCH CONTEXT ═══
Product: "${topic}" | Niche: "${niche}" | Location: ${locationStr}, India
Goal: ${goal}

Exa deep-reasoning research data (includes structured pricing, competitor, and material cost data):
${rawResearch.slice(0, 15000)}

═══ YOUR TASK ═══
Create a comprehensive financial analysis. Every number must be REALISTIC for the Indian handmade market. Show your work in the formulae examples.

Return ONLY a valid JSON object:

{
  "profit": {
    "estimatedSellingPrice": {"min": <realistic low price in INR>, "max": <realistic high price in INR>, "currency": "INR"},
    "materialCost": {"min": <actual minimum material cost in INR>, "max": <actual maximum material cost>},
    "laborHours": {"min": <minimum hours to make>, "max": <maximum hours>},
    "laborCostPerHour": <realistic hourly rate for Indian artisan, typically ₹100-250>,
    "platformFees": [
      {"platform": "Instagram Direct (DM orders)", "percentage": 0},
      {"platform": "WhatsApp Business", "percentage": 0},
      {"platform": "Etsy India", "percentage": 6.5},
      {"platform": "Amazon Handmade India", "percentage": 15},
      {"platform": "Meesho", "percentage": 0},
      {"platform": "InstaMojo", "percentage": 2}
    ],
    "shippingEstimate": <average shipping cost in INR for India>,
    "packagingCost": <cost of premium packaging — box, tissue paper, thank-you card>,
    "photographyCost": <per-product photography cost, or 0 if DIY>,
    "profitMargin": {"min": <minimum profit margin %>, "max": <maximum profit margin %>},
    "monthlyPotential": {
      "units": <realistic monthly units for a small Instagram seller>,
      "revenue": <monthly revenue in INR>,
      "profit": <monthly NET profit in INR>
    },
    "breakEvenUnits": <units needed to cover monthly fixed costs>,
    "competitorPricing": [
      {"platform": "Instagram Sellers", "priceRange": "₹X–₹Y", "sellerCount": "<estimated active sellers>", "avgRating": "<if applicable>", "deliveryTime": "3-5 days via DM"},
      {"platform": "Etsy India", "priceRange": "₹X–₹Y", "sellerCount": "<count>", "avgRating": "4.X stars", "deliveryTime": "5-10 days"},
      {"platform": "Amazon Handmade", "priceRange": "₹X–₹Y", "sellerCount": "<count>", "avgRating": "4.X stars", "deliveryTime": "3-7 days"},
      {"platform": "Meesho", "priceRange": "₹X–₹Y", "sellerCount": "<count>", "avgRating": "3.X stars", "deliveryTime": "5-9 days"}
    ],
    "seasonalFactors": [
      "<factor 1, e.g. 'Diwali season (Oct-Nov): Can price 20-30% higher for gift-wrapped versions'>",
      "<factor 2, e.g. 'Valentine's Week (Feb 7-14): Couples themed items sell 3x normal volume'>",
      "<factor 3, e.g. 'Summer (May-Jun): Slower season — offer 10% early-bird discounts'>",
      "<factor 4, e.g. 'Raksha Bandhan (Aug): Customized items command 25% premium'>"
    ],
    "scalingTips": [
      "<tip 1 — specific cost-saving advice, e.g. 'Buy yarn in 5kg bulk from wholesale markets — saves 35% vs retail'>",
      "<tip 2 — e.g. 'Batch-produce top 3 sellers in sets of 10 — reduces per-unit time by 20%'>",
      "<tip 3 — e.g. 'Negotiate shipping rates with Delhivery/Shiprocket after 30+ monthly orders'>",
      "<tip 4 — e.g. 'Offer pre-orders to fund material costs — zero inventory risk'>",
      "<tip 5 — e.g. 'Create a \"ready to ship\" collection for impulse buyers willing to pay 15% more'>"
    ],
    "pricingStrategy": "<2-3 sentence strategic recommendation — e.g. 'Position as premium handmade at ₹X-₹Y. Instagram direct sales give highest margin. Use Meesho for volume/discovery but price 10% higher to cover customer acquisition cost.'>",
    "formulae": [
      {
        "name": "Material Cost Per Unit",
        "formula": "Total Material Cost ÷ Units Produced from Material",
        "explanation": "How much raw material goes into each product",
        "example": "₹<actual> yarn + ₹<actual> accessories = ₹<total> per unit (based on current Indian market prices)"
      },
      {
        "name": "Total Production Cost",
        "formula": "Material Cost + (Labor Hours × ₹<rate>/hr) + Packaging Cost",
        "explanation": "All costs to produce one finished, packaged product",
        "example": "₹<mat> + (<hours>h × ₹<rate>) + ₹<pkg> = ₹<total> production cost"
      },
      {
        "name": "Gross Profit (per unit)",
        "formula": "Selling Price − Production Cost − Shipping − (Selling Price × Platform Fee%)",
        "explanation": "Profit before monthly fixed costs",
        "example": "₹<price> − ₹<prod> − ₹<ship> − ₹<fee> = ₹<gross> per unit"
      },
      {
        "name": "Net Profit Margin %",
        "formula": "(Gross Profit ÷ Selling Price) × 100",
        "explanation": "What percentage of each sale is actual profit",
        "example": "(₹<gross> ÷ ₹<price>) × 100 = <margin>%"
      },
      {
        "name": "Monthly Net Profit",
        "formula": "Gross Profit Per Unit × Monthly Units Sold − Monthly Fixed Costs",
        "explanation": "Take-home profit after everything — your actual earnings",
        "example": "₹<gross> × <units> − ₹<fixed> = ₹<monthly> per month"
      },
      {
        "name": "Break-Even Units",
        "formula": "Monthly Fixed Costs ÷ Gross Profit Per Unit",
        "explanation": "Minimum units you must sell to not lose money. Fixed costs = phone bill, internet, packaging supplies, Instagram promotion",
        "example": "₹<fixed> ÷ ₹<gross> = <units> units per month minimum"
      },
      {
        "name": "Return on Investment (ROI)",
        "formula": "(Monthly Net Profit ÷ Total Monthly Investment) × 100",
        "explanation": "How much you earn relative to what you invest — includes materials, time, and overhead",
        "example": "(₹<profit> ÷ ₹<invest>) × 100 = <roi>% monthly ROI"
      },
      {
        "name": "Price Elasticity Suggestion",
        "formula": "If competitor avg price is ₹X, price at 0.9X for penetration or 1.15X for premium positioning",
        "explanation": "Strategic pricing relative to competitors — underprice to gain market share, overprice with quality story",
        "example": "Competitors avg ₹<avg>. Penetration price: ₹<low>. Premium price: ₹<high> (with handmade story + premium packaging)"
      }
    ]
  }
}

═══ CRITICAL RULES ═══
1. ALL ₹ amounts must be realistic for the INDIAN market (not USD converted)
2. Formulae examples MUST contain ACTUAL CALCULATED numbers — never "<fill in>" or "X"
3. Material costs should reflect current Indian wholesale/retail yarn prices
4. Labor rates should reflect Indian market (₹100-250/hr depending on skill)
5. Return ONLY valid JSON — no other text`;

    const response = await getAnthropic().messages.create({
      model: HAIKU, // Financial data: Haiku handles math and structured output perfectly
      max_tokens: 5000,
      messages: [{ role: "user", content: financialPrompt }],
    });

    const raw = getText(response.content);
    console.log("  Financial intelligence response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed?.profit) {
      result.profit = parsed.profit;
    }

    console.log(`  Profit: ${result.profit ? "yes" : "no"}, Formulae: ${result.profit?.formulae?.length || 0}, Competitors: ${result.profit?.competitorPricing?.length || 0}`);
      } catch (err) {
        console.error("Call 1C failed:", (err as Error).message);
        // 1C is soft — don't rethrow, profit section is optional
      }
    })(),
  ]); // end Phase 2 Promise.all

  // ══════════════════════════════════════════════════════════════════
  // PHASE 3: Run 2A (Content) + 2B (Ads) in parallel — both need Phase 2 results
  // ══════════════════════════════════════════════════════════════════
  console.log("Phase 3: Running calls 2A + 2B in parallel...");
  const trendCtx = result.trends.length > 0
    ? result.trends.slice(0, 5).map(t => `${t.trend} (${t.momentum}, opportunity: ${t.opportunityScore || 'high'})`).join("; ")
    : `${topic} in ${region}`;

  const stratCtx = result.strategy
    ? `Best time: ${result.strategy.bestTime}. Format: ${result.strategy.format}. Angle: ${result.strategy.contentAngle}. Pillars: ${(result.strategy.contentPillars || []).join(", ")}.`
    : "";

  const profitCtx = result.profit
    ? `Price range: ₹${result.profit.estimatedSellingPrice.min}-${result.profit.estimatedSellingPrice.max}. Strategy: ${result.profit.pricingStrategy || 'premium handmade positioning'}.`
    : "";

  await Promise.all([
    // ─── CALL 2A: Content Strategy ─────────────────────────────────────────────
    (async () => {
      console.log("Call 2A: Content strategy — hooks, caption, hashtags...");
      try {
    const contentPrompt = `You are a TOP-TIER Instagram content strategist who has grown 50+ Indian handmade brands from 0 to 100K+ followers. You specialize in scroll-stopping hooks and high-converting captions for the Indian market.

═══ BRAND CONTEXT ═══
Product: "${topic}"
Niche: ${niche}
Location: ${locationStr}, India
Current trends: ${trendCtx}
Hook style preference: ${hookStyle}
Business goal: ${goal}
${stratCtx ? `Strategy context: ${stratCtx}` : ""}
${profitCtx ? `Pricing context: ${profitCtx}` : ""}

═══ YOUR TASK ═══
Create content that STOPS the scroll, drives DMs, and converts followers into buyers. Every piece of content must feel authentic, warm, and specifically Indian — not generic Western marketing.

Return ONLY a valid JSON object:

{
  "hooks": [
    "<hook 1 — curiosity-based, under 12 words, makes them NEED to read more>",
    "<hook 2 — bold claim or contrarian take>",
    "<hook 3 — personal story opener>",
    "<hook 4 — question that targets a pain point>",
    "<hook 5 — number/statistic-based hook>",
    "<hook 6 — emotional hook targeting Indian gifting culture>",
    "<hook 7 — FOMO/scarcity hook>",
    "<hook 8 — behind-the-scenes teaser>",
    "<hook 9 — transformation/before-after hook>",
    "<hook 10 — trend-jacking hook referencing a current trend>"
  ],
  "caption": "<250-300 word Instagram caption with this structure:\\n\\n🪝 [HOOK LINE — first line must stop the scroll]\\n\\n[STORY/BODY — 3-4 paragraphs telling a micro-story or sharing value. Include emotional triggers, sensory details about the product, and social proof. Reference Indian cultural context — festivals, gifting, self-care rituals.]\\n\\n[CTA — clear, warm, non-pushy call to action that feels like a friend suggesting something, not a salesperson demanding action]\\n\\n[Use line breaks and emojis strategically — not overloaded, just enough to make it scannable]>",
  "hashtags": [
    "<5 viral/high-reach hashtags — 500K+ posts>",
    "<5 medium-reach niche hashtags — 50K-500K posts>",
    "<5 micro-niche hashtags — 5K-50K posts>",
    "<5 local/community hashtags specific to ${locationStr}>",
    "<5 branded/unique hashtags>"
  ],
  "agentInsight": "<DETAILED 5-point strategic brief:\\n\\n1. WHY THIS WORKS: Explain the psychology behind the content strategy\\n2. AUDIENCE TRIGGER: What emotional button this content presses for the target buyer\\n3. ALGORITHM PLAY: How this content will perform with Instagram's algorithm (saves, shares, watch time)\\n4. CONVERSION PATH: The journey from seeing this post to making a purchase\\n5. WEEKLY PLAN: How to build on this content across the week for compounding growth>"
}

═══ CONTENT RULES ═══
1. Hooks MUST be under 12 words — ruthlessly concise  
2. Every hook must make someone STOP scrolling — test: would YOU stop?
3. Caption must feel like a friend talking, NOT a brand announcing
4. Hashtags must be organized from high-reach to micro-niche (25 total, organized in 5 groups)
5. Agent insight must be 5+ sentences with SPECIFIC, actionable advice
6. Reference Indian culture naturally — Diwali, chai conversations, "mummy ka gift", monsoon cozy vibes
7. Use Hinglish sprinkles where natural (but keep primary language English)
8. Return ONLY valid JSON`;

    const response = await getAnthropic().messages.create({
      model: SONNET,
      max_tokens: 4000,
      messages: [{ role: "user", content: contentPrompt }],
    });

    const raw = getText(response.content);
    console.log("  Content strategy response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed) {
      result.hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];
      result.caption = parsed.caption || "";
      result.hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.flat() : [];
      result.agentInsight = parsed.agentInsight || "";
    }

    console.log(`  ${result.hooks.length} hooks, ${result.caption.length} chars caption, ${result.hashtags.length} tags`);
      } catch (err) {
        // 2A is critical — content is the core output, rethrow
        const msg = (err as Error).message || String(err);
        console.error("Call 2A FAILED:", msg);
        throw new Error(`Content strategy failed: ${msg}`);
      }
    })(),

    // ─── CALL 2B: Ad & Reel Engine ─────────────────────────────────────────────
    (async () => {
      console.log("Call 2B: Ad copy + ROAS calculator + reel script...");
      const priceCtx = result.profit
        ? `Price range: ₹${result.profit.estimatedSellingPrice.min}-${result.profit.estimatedSellingPrice.max}. Profit margin: ${result.profit.profitMargin.min}-${result.profit.profitMargin.max}%.`
        : `Product: ${topic}`;
      try {
    const adPrompt = `You are an expert INSTAGRAM ADVERTISING STRATEGIST and REEL DIRECTOR who has managed ₹50 lakh+ in ad spend for Indian D2C and handmade brands. You know Indian Instagram ad metrics inside-out.

═══ BRAND CONTEXT ═══
Product: "${topic}" | Niche: ${niche} | Location: ${locationStr}, India
${priceCtx}
Goal: ${goal}
Trending now: ${trendCtx}

═══ YOUR TASK ═══
Create a complete ad strategy package + a viral reel script. Everything must be specific to "${topic}" — no generic templates.

Return ONLY a valid JSON object:

{
  "adCopy": {
    "headline": "<under 40 chars — punchy, benefit-focused, creates curiosity>",
    "primaryText": "<125 chars max — main ad text that speaks to the buyer's desire, not the product features>",
    "description": "<under 30 chars — urgency or social proof>",
    "ctaButton": "Shop Now|Learn More|Send Message|Contact Us",
    "targetAudience": "<detailed targeting — demographics, interests, behaviors, lookalike base. Be specific: 'Women 22-38 in ${locationStr}, interested in handmade, sustainable fashion, home decor, gifting. Custom audiences: engaged with similar handmade accounts.'>",
    "adObjective": "Messages|Traffic|Conversions|Reach",
    "variants": [
      {"headline": "<A/B variant 1 — different emotional angle>", "primaryText": "<variant 1 body — test different hook>"},
      {"headline": "<A/B variant 2 — different benefit focus>", "primaryText": "<variant 2 body — test different CTA style>"},
      {"headline": "<A/B variant 3 — social proof angle>", "primaryText": "<variant 3 body — test testimonial-style>"}
    ]
  },
  "roas": {
    "dailyBudget": <realistic daily budget in INR for a small seller, typically ₹150-500>,
    "estimatedReach": {"min": <conservative daily reach>, "max": <optimistic daily reach>},
    "estimatedClicks": {"min": <conservative>, "max": <optimistic>},
    "costPerClick": {"min": <lowest CPC in INR>, "max": <highest CPC>},
    "estimatedConversions": {"min": <conservative daily conversions>, "max": <optimistic>},
    "costPerConversion": <average cost per conversion in INR>,
    "breakEvenROAS": <calculated from profit margin — 1 ÷ margin%>,
    "projectedROAS": <realistic ROAS for Indian handmade niche>,
    "monthlyAdSpend": <daily × 30>,
    "monthlyAdRevenue": <projected monthly revenue from ads>,
    "weeklyProjection": {
      "spend": <weekly ad spend>,
      "revenue": <weekly projected revenue>,
      "profit": <weekly projected profit from ads>
    },
    "scalingRecommendation": "<specific advice on when and how to scale — e.g. 'Start at ₹200/day for 7 days. If ROAS > 3x, increase to ₹400/day. After 14 profitable days, test ₹600/day with broader audience.'>",
    "formulae": [
      {"name": "ROAS", "formula": "Revenue from Ads ÷ Ad Spend", "explanation": "Return on ad spend — below 1x means losing money, 3x+ is profitable", "example": "₹<revenue> ÷ ₹<spend> = <roas>x"},
      {"name": "CPC (Cost Per Click)", "formula": "Total Ad Spend ÷ Total Clicks", "explanation": "How much each click costs — lower is better", "example": "₹<spend> ÷ <clicks> = ₹<cpc> per click"},
      {"name": "CPM (Cost Per 1000 Views)", "formula": "(Ad Spend ÷ Impressions) × 1000", "explanation": "Cost to show your ad to 1000 people", "example": "(₹<spend> ÷ <impressions>) × 1000 = ₹<cpm>"},
      {"name": "Conversion Rate", "formula": "(Conversions ÷ Clicks) × 100", "explanation": "What % of people who click actually buy", "example": "(<conv> ÷ <clicks>) × 100 = <rate>%"},
      {"name": "Break-Even ROAS", "formula": "1 ÷ Profit Margin (as decimal)", "explanation": "The minimum ROAS needed to not lose money on ads", "example": "1 ÷ <margin> = <beroas>x minimum"},
      {"name": "Monthly Ad ROI", "formula": "(Monthly Ad Revenue − Monthly Ad Spend) ÷ Monthly Ad Spend × 100", "explanation": "Percentage return on your ad investment", "example": "(₹<rev> − ₹<spend>) ÷ ₹<spend> × 100 = <roi>%"}
    ]
  },
  "reelScript": {
    "duration": "30s",
    "totalShots": 7,
    "trendingAudio": "<suggest a specific trending audio style or song — e.g. 'Soft lo-fi beat with text reveal timing' or 'Oh No by Kreepa — product reveal format'>",
    "shots": [
      {"shotNumber": 1, "duration": "2s", "visual": "<SPECIFIC visual for THIS product — not generic. e.g. 'Close-up of hands pulling yarn through a loop, warm golden-hour lighting on a wooden table'>", "textOverlay": "<exact text on screen>", "transition": "quick zoom in", "bRollSuggestion": "<optional alternative shot>"},
      {"shotNumber": 2, "duration": "4s", "visual": "<specific visual>", "textOverlay": "<text>", "transition": "smooth slide left", "bRollSuggestion": "<alt shot>"},
      {"shotNumber": 3, "duration": "5s", "visual": "<specific visual>", "textOverlay": "<text>", "transition": "beat drop cut", "bRollSuggestion": "<alt shot>"},
      {"shotNumber": 4, "duration": "5s", "visual": "<specific visual>", "textOverlay": "<text>", "transition": "slow zoom out", "bRollSuggestion": "<alt shot>"},
      {"shotNumber": 5, "duration": "5s", "visual": "<specific visual>", "textOverlay": "<text>", "transition": "whip pan", "bRollSuggestion": "<alt shot>"},
      {"shotNumber": 6, "duration": "5s", "visual": "<specific visual>", "textOverlay": "<text>", "transition": "smooth fade", "bRollSuggestion": "<alt shot>"},
      {"shotNumber": 7, "duration": "4s", "visual": "<CTA shot — product styled beautifully with clear call to action>", "textOverlay": "<CTA text — DM/link/comment>", "transition": "fade to black", "bRollSuggestion": "<alt shot>"}
    ],
    "captionForReel": "<short, punchy reel caption with 1-2 relevant hashtags>",
    "postingTip": "<one specific, expert tip for maximizing THIS reel's reach>",
    "musicBeatSync": "<specific timing notes — e.g. 'Drop text at 0:03 on first beat. Product reveal at 0:08 on bass drop. Final CTA on last 4 seconds during audio fadeout.'>"
  }
}

═══ CRITICAL RULES ═══
1. ALL metrics must reflect INDIAN Instagram ad benchmarks: CPM ₹80-200, CPC ₹3-12, conversion rate 2-8% for handmade
2. Ad copy must be business-grade — as if spending real money. No fluff.
3. Reel script visuals must describe ACTUAL shots for "${topic}" — not "show the product"
4. ROAS formulae must have REAL calculated numbers matching the metrics above
5. Include 3 ad variants (not 2) for proper A/B testing
6. Return ONLY valid JSON`;

    const response = await getAnthropic().messages.create({
      model: SONNET,
      max_tokens: 4000,
      messages: [{ role: "user", content: adPrompt }],
    });

    const raw = getText(response.content);
    console.log("  Ad & reel response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed) {
      result.adCopy = parsed.adCopy || null;
      result.roas = parsed.roas || null;
      result.reelScript = parsed.reelScript || null;
    }

    console.log(`  Ad copy: ${result.adCopy ? "yes" : "no"}, ROAS: ${result.roas ? "yes" : "no"}, Reel: ${result.reelScript ? "yes" : "no"}`);
      } catch (err) {
        // 2B is critical — ad copy + reel is core output, rethrow
        const msg = (err as Error).message || String(err);
        console.error("Call 2B FAILED:", msg);
        throw new Error(`Ad & reel engine failed: ${msg}`);
      }
    })(),
  ]); // end Phase 3 Promise.all

  // ══════════════════════════════════════════════════════════════════
  // PHASE 4: Call 3 — Image Analysis + Pinterest (conditional)
  // ══════════════════════════════════════════════════════════════════
  if (imageBase64 && imageMimeType) {
    console.log("Call 3: Image analysis + Pinterest (Exa-powered)...");

    // Run Exa Pinterest search in parallel with Claude vision analysis
    const [pinterestData] = await Promise.all([
      runExaPinterestResearch(topic, niche).catch(err => {
        console.error("  Exa Pinterest search failed:", (err as Error).message);
        return "No Pinterest data available.";
      }),
    ]);

    try {
      const visionPrompt = `You are an expert INSTAGRAM VISUAL STRATEGIST and PRODUCT PHOTOGRAPHER who has styled 1000+ product photoshoots for Indian handmade brands. You know exactly what makes a product photo go viral on Instagram.

Analyze this product image with an expert eye. Use the Pinterest trend data below to generate inspired content ideas.

═══ CONTEXT ═══
Product niche: "${topic}" / "${niche}"
Target market: ${locationStr}, India

═══ PINTEREST TREND DATA (from Exa search) ═══
${typeof pinterestData === 'string' ? pinterestData.slice(0, 5000) : 'No Pinterest data available.'}

═══ YOUR TASK ═══
Return ONLY a valid JSON object:

{
  "imageAnalysis": {
    "productType": "<detailed description of what this product is>",
    "colors": ["<color 1>", "<color 2>", "<color 3>", "<color 4>"],
    "style": "<aesthetic category: minimal/boho/vintage/modern/rustic/kawaii/cottagecore/maximalist>",
    "instagramReadiness": <calculated score = (Lighting×0.30) + (Composition×0.30) + (ColorHarmony×0.20) + (ProductClarity×0.20)>,
    "lightingScore": <0-100>,
    "compositionScore": <0-100>,
    "colorHarmonyScore": <0-100>,
    "productClarityScore": <0-100>,
    "improvements": [
      "<improvement 1 — SPECIFIC, actionable, not generic. e.g. 'Move the product 2 inches left and add a small dried flower sprig for visual balance'>",
      "<improvement 2>",
      "<improvement 3>",
      "<improvement 4>",
      "<improvement 5>",
      "<improvement 6>"
    ],
    "moodKeywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>"],
    "suggestedFilters": ["<Instagram/editing filter 1>", "<filter 2>", "<filter 3>"],
    "bestPostingContext": "<specific recommendation — e.g. 'Best for: Instagram carousel (slide 1 as hero). Use as first image with 4 lifestyle context shots following.'>"
  },
  "pinterestSuggestions": [
    {
      "idea": "<specific content idea inspired by Pinterest trends above>",
      "whyItWorks": "<psychology behind why this type of content performs>",
      "searchTerms": ["<Pinterest search term 1>", "<term 2>", "<term 3>"],
      "estimatedEngagement": "high"
    },
    <provide exactly 6 Pinterest-inspired content ideas — use REAL data from the Pinterest trends above>
  ]
}

═══ SCORING GUIDE ═══
- 90-100: Post-ready — professional quality, no edits needed
- 70-89: Good — minor tweaks will make it great
- 50-69: Needs work — specific improvements needed
- 0-49: Re-shoot recommended — fundamental issues

Be HONEST in scoring. Most phone photos score 55-75. Don't inflate.
Return ONLY valid JSON.`;

      const response = await getAnthropic().messages.create({
        model: SONNET,
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: visionPrompt },
          ],
        }],
      });

      const raw = getText(response.content);
      console.log("  Vision response:", raw.length, "chars");

      const parsed = extractJSON(raw);
      if (parsed) {
        result.imageAnalysis = parsed.imageAnalysis || null;
        result.pinterestSuggestions = Array.isArray(parsed.pinterestSuggestions) ? parsed.pinterestSuggestions : [];
      }

      console.log(`  Image: ${result.imageAnalysis ? "yes" : "no"}, ${result.pinterestSuggestions.length} Pinterest suggestions`);
    } catch (err) {
      console.error("Call 3 failed:", (err as Error).message);
    }
  }

  console.log("Pipeline v4 (Exa-powered) complete!\n");
  return result;
}
