import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  AgentInput,
  AgentOutput,
} from "./types";

let _anthropic: Anthropic | null = null;
let _openrouter: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

function getOpenRouter(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || "sk-placeholder",
    });
  }
  return _openrouter;
}

const SEARCH_MODEL = "claude-3-7-sonnet-20250219";
const WRITE_MODEL = "claude-3-haiku-20240307";

// ─── UTILITY ────────────────────────────────────────────────────────

function extractJSON(raw: string): any {
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    try { return JSON.parse(cleaned.slice(objStart, objEnd + 1)); } catch {}
  }
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)); } catch {}
  }
  console.warn("JSON extraction failed from:", raw.slice(0, 300));
  return null;
}

function getText(content: any[]): string {
  return content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

async function cheapWrite(prompt: string, maxTokens: number = 1500): Promise<string> {
  if (process.env.USE_OPENROUTER === "true" && process.env.OPENROUTER_API_KEY) {
    try {
      const res = await getOpenRouter().chat.completions.create({
        model: process.env.OPENROUTER_FREE_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      });
      const content = res.choices[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.warn("OpenRouter failed:", (err as Error).message);
    }
  }
  const res = await getAnthropic().messages.create({
    model: WRITE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return getText(res.content);
}

// ─── PIPELINE v2 ────────────────────────────────────────────────────
/**
 * CALL 1A — Web Search (Haiku 4.5 + web search) — gather raw intel
 * CALL 1B — Analysis (Haiku 4.5) — structure the research into JSON
 * CALL 2  — Creative (Haiku 3 / free) — hooks, caption, hashtags
 * CALL 3  — Vision (Haiku 4.5 + vision + web) — image analysis [conditional]
 */
export async function runAgentPipeline(
  input: AgentInput,
): Promise<AgentOutput> {
  // Pre-flight: verify API key exists before doing anything
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it in Vercel Dashboard > Settings > Environment Variables, then redeploy.");
  }

  const { topic, niche, region, city, hookStyle, goal, imageBase64, imageMimeType, instagramHandle } = input;
  const locationStr = city ? `${city}, ${region}` : region;
  console.log(`\nPipeline v2: "${topic}" / "${niche}" / ${locationStr}` + (instagramHandle ? ` / IG: @${instagramHandle}` : ""));

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

  // ── CALL 1A: Web Search — gather raw market intel ─────────────────
  console.log("Call 1A: Web search for raw market intel...");
  let rawResearch = "";
  try {
    const searchPrompt = `Search the web thoroughly for the following information about "${topic}" in the "${niche}" market in ${locationStr}, India:

1. Current trending crochet/handmade products on Instagram India right now  
2. Pricing of "${topic}" on Etsy India, Amazon Handmade, Instagram shops, Meesho
3. Which Indian states/cities have the highest demand for handmade crochet products
4. Demographics of crochet buyers in India — age, gender, income level
5. Best-selling crochet product categories in India right now
6. Instagram posting best practices for Indian handmade sellers — best times, formats
${city ? `7. Market data specific to ${city} — population, festivals, craft market, shopping habits` : ""}
${instagramHandle ? `8. Public analytics for Instagram account @${instagramHandle} (follower count, engagement rate, average likes, recent activity, content style).` : ""}

Search multiple sources and provide a comprehensive research report. Include actual prices in INR when found.`;

    const response = await getAnthropic().messages.create({
      model: SEARCH_MODEL,
      max_tokens: 4000,
      tools: [{
        type: "web_search_20250305" as any,
        name: "web_search",
        max_uses: 5,
      } as any],
      messages: [{ role: "user", content: searchPrompt }],
    });

    rawResearch = getText(response.content);
    console.log("  Research gathered:", rawResearch.length, "chars");
  } catch (err) {
    console.error("Call 1A failed:", (err as Error).message);
    rawResearch = `Topic: ${topic}, Niche: ${niche}, Region: ${locationStr}. No web search data available.`;
  }

  // ── CALL 1B: Structure research into comprehensive JSON ───────────
  console.log("Call 1B: Structuring research into analytics...");
  try {
    const cityBlock = city ? `
  "cityMarket": {
    "population": "<city population>",
    "avgIncome": "<average household income in INR>",
    "craftMarketSize": "<estimated craft market size or description>",
    "onlinePenetration": "<% shopping online>",
    "topPlatforms": ["platform1", "platform2", "platform3"],
    "festivalCalendar": ["Festival1 (Month)", "Festival2 (Month)", "Festival3 (Month)"],
    "competitorDensity": "low|medium|high"
  },` : `"cityMarket": null,`;

    const igBlock = instagramHandle ? `
  "instagramProfile": {
    "handle": "@${instagramHandle}",
    "followerCountStr": "<estimated or known follower count>",
    "engagementRateStr": "<estimated engagement rate e.g. 2.5%>",
    "recentActivitySummary": "<summary of posting frequency and recent activity>",
    "bestPerformingStyles": "<what they do best>",
    "growthTrend": "<up/stable/down>"
  },` : `"instagramProfile": null,`;

    const structurePrompt = `You are a business intelligence analyst. Based on the research data below, create a comprehensive JSON analytics report.

RESEARCH DATA:
${rawResearch.slice(0, 6000)}

PRODUCT: "${topic}" | NICHE: "${niche}" | LOCATION: ${locationStr}, India | GOAL: ${goal}

Return ONLY a valid JSON object with these sections filled in completely. Use realistic Indian market data. Fill in ALL fields — leave nothing empty.

{
  "trends": [
    {"trend": "trend name", "momentum": "hot", "region": "Indian state/city", "why": "1-line reason"},
    {"trend": "trend name", "momentum": "rising", "region": "Indian state/city", "why": "1-line reason"},
    {"trend": "trend name", "momentum": "hot", "region": "Indian state/city", "why": "1-line reason"},
    {"trend": "trend name", "momentum": "steady", "region": "Indian state/city", "why": "1-line reason"},
    {"trend": "trend name", "momentum": "rising", "region": "Indian state/city", "why": "1-line reason"}
  ],
  "traffic": [
    {"region": "Indian state", "score": 85, "trend": "up", "insight": "why important"},
    {"region": "Indian state", "score": 72, "trend": "up", "insight": "why important"},
    {"region": "Indian state", "score": 65, "trend": "stable", "insight": "why important"},
    {"region": "Indian state", "score": 58, "trend": "up", "insight": "why important"}
  ],
  ${cityBlock}
  ${igBlock}
  "customers": [
    {"name": "persona name", "age": "25-34", "location": "${city || 'Mumbai'}", "behavior": "detailed buying behavior specific to ${locationStr}", "buyingIntent": "high"},
    {"name": "persona name", "age": "18-24", "location": "${city || 'Bangalore'}", "behavior": "detailed behavior", "buyingIntent": "medium"},
    {"name": "persona name", "age": "30-45", "location": "${city || 'Delhi'}", "behavior": "detailed behavior", "buyingIntent": "high"},
    {"name": "persona name", "age": "22-35", "location": "${city || 'Pune'}", "behavior": "detailed behavior", "buyingIntent": "medium"}
  ],
  "purchases": [
    {"category": "product category 1", "score": 88, "trend": "up", "insight": "demand driver"},
    {"category": "product category 2", "score": 75, "trend": "up", "insight": "demand driver"},
    {"category": "product category 3", "score": 68, "trend": "stable", "insight": "demand driver"},
    {"category": "product category 4", "score": 55, "trend": "up", "insight": "demand driver"},
    {"category": "product category 5", "score": 42, "trend": "down", "insight": "demand driver"}
  ],
  "strategy": {
    "bestTime": "specific time range IST",
    "bestDay": "specific day",
    "format": "Reel/Carousel/Post",
    "contentAngle": "specific angle",
    "ctaSuggestion": "specific CTA text",
    "competitorGap": "what competitors miss"
  },
  "profit": {
    "estimatedSellingPrice": {"min": 0, "max": 0, "currency": "INR"},
    "materialCost": {"min": 0, "max": 0},
    "laborHours": {"min": 0, "max": 0},
    "laborCostPerHour": 150,
    "platformFees": [
      {"platform": "Instagram Direct", "percentage": 0},
      {"platform": "Etsy India", "percentage": 6.5},
      {"platform": "Amazon Handmade", "percentage": 15},
      {"platform": "Meesho", "percentage": 0}
    ],
    "shippingEstimate": 80,
    "profitMargin": {"min": 0, "max": 0},
    "monthlyPotential": {"units": 0, "revenue": 0, "profit": 0},
    "breakEvenUnits": 0,
    "formulae": [
      {"name": "Gross Profit", "formula": "Selling Price - Material Cost - Shipping", "explanation": "Revenue minus direct costs of goods and delivery", "example": "fill with real numbers from your analysis"},
      {"name": "Net Profit", "formula": "Gross Profit - (Price × Platform Fee%) - (Hours × ₹150/hr)", "explanation": "Take-home after platform fees and labor cost", "example": "fill with real numbers"},
      {"name": "Profit Margin %", "formula": "(Net Profit ÷ Selling Price) × 100", "explanation": "What percentage of each sale is pure profit", "example": "fill with real numbers"},
      {"name": "Monthly Revenue", "formula": "Average Selling Price × Units Sold per Month", "explanation": "Total monthly income before costs", "example": "fill with real numbers"},
      {"name": "Break-Even Units", "formula": "Monthly Fixed Costs ÷ (Selling Price - Variable Cost per Unit)", "explanation": "Minimum units to sell before making profit", "example": "fill with real numbers"},
      {"name": "ROI %", "formula": "(Total Profit ÷ Total Investment) × 100", "explanation": "Return on your material and time investment", "example": "fill with real numbers"}
    ]
  }
}

CRITICAL RULES:
- Fill ALL number fields with REALISTIC values based on the research
- Profit formulae examples MUST have actual calculated numbers, not placeholders
- Customer personas must be specific to ${locationStr} with detailed behaviors
- Use REAL prices from the research data in INR
- Return ONLY valid JSON, no other text`;

    const response = await getAnthropic().messages.create({
      model: SEARCH_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: structurePrompt }],
    });

    const raw = getText(response.content);
    console.log("  Structured response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed) {
      result.trends = Array.isArray(parsed.trends) ? parsed.trends : [];
      result.traffic = Array.isArray(parsed.traffic) ? parsed.traffic : [];
      result.customers = Array.isArray(parsed.customers) ? parsed.customers : [];
      result.purchases = Array.isArray(parsed.purchases) ? parsed.purchases : [];
      result.strategy = parsed.strategy || null;
      result.cityMarket = parsed.cityMarket || null;
      result.profit = parsed.profit || null;
      result.instagramProfile = parsed.instagramProfile || null;
    }

    console.log(`  ${result.trends.length} trends, ${result.traffic.length} regions, ${result.customers.length} personas, ${result.purchases.length} purchases, strategy: ${result.strategy ? "yes" : "no"}, profit: ${result.profit ? "yes" : "no"}, cityMarket: ${result.cityMarket ? "yes" : "no"}, IG: ${result.instagramProfile ? "yes" : "no"}`);
  } catch (err) {
    console.error("Call 1B failed:", (err as Error).message);
  }

  // ── CALL 2: Creative writing ──────────────────────────────────────
  console.log("Call 2: Hooks + caption...");
  const trendCtx = result.trends.length > 0
    ? result.trends.slice(0, 3).map(t => `${t.trend} (${t.momentum})`).join(", ")
    : `${topic} in ${region}`;

  const stratCtx = result.strategy
    ? `Best time: ${result.strategy.bestTime}. Format: ${result.strategy.format}. Angle: ${result.strategy.contentAngle}.`
    : "";

  try {
    const raw = await cheapWrite(
      `You write Instagram content for Indian ${niche} businesses.

CONTEXT:
- Product: ${topic}
- Region: ${locationStr}, India
- Trends: ${trendCtx}
- Hook style: ${hookStyle}
- Goal: ${goal}
${stratCtx ? `- Strategy: ${stratCtx}` : ""}

Return a JSON object with these exact keys:

{
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5", "hook6"],
  "caption": "150-200 word Instagram caption with hook, story, CTA. Use line breaks.",
  "hashtags": ["#tag1", "#tag2", "...up to 25 tags"],
  "agentInsight": "2-3 sentence analysis of why this content strategy works for ${locationStr}"
}

Write 6 hooks (under 15 words each, style: ${hookStyle}). Caption must have a clear CTA. Hashtags should mix popular and niche tags. JSON only, no other text.`
    );

    const parsed = extractJSON(raw);
    if (parsed) {
      result.hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];
      result.caption = parsed.caption || "";
      result.hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
      result.agentInsight = parsed.agentInsight || "";
    } else {
      const cm = raw.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
      const hm = raw.match(/HASHTAGS:\s*([\s\S]*?)(?=INSIGHT:|$)/i);
      const im = raw.match(/INSIGHT:\s*([\s\S]*?)$/i);
      result.caption = cm?.[1]?.trim() || "";
      result.hashtags = (hm?.[1]?.trim() || "").split(/\s+/).filter(t => t.startsWith("#")).slice(0, 30);
      result.agentInsight = im?.[1]?.trim() || "";
    }

    console.log(`  ${result.hooks.length} hooks, ${result.caption.length} chars caption, ${result.hashtags.length} tags`);
  } catch (err) {
    console.error("Call 2 failed:", (err as Error).message);
  }

  // ── CALL 2B: Ad Copy + ROAS + Reel Script ─────────────────────────
  console.log("Call 2B: Ad copy + ROAS + reel script...");
  const priceCtx = result.profit
    ? `Price range: ₹${result.profit.estimatedSellingPrice.min}-${result.profit.estimatedSellingPrice.max}`
    : `Product: ${topic}`;

  try {
    const raw = await cheapWrite(
      `You are an Instagram advertising expert and content creator for Indian handmade businesses.

CONTEXT:
- Product: ${topic}
- Niche: ${niche}
- Region: ${locationStr}, India
- ${priceCtx}
- Goal: ${goal}
- Trends: ${trendCtx}

Return a JSON object with these 3 sections:

{
  "adCopy": {
    "headline": "Under 40 chars — punchy ad headline",
    "primaryText": "125 chars max — main ad body for Instagram feed",
    "description": "Under 30 chars — appears below headline",
    "ctaButton": "Shop Now|Learn More|Send Message|Contact Us",
    "targetAudience": "Describe the ideal target audience for this ad",
    "adObjective": "Messages|Traffic|Conversions|Reach",
    "variants": [
      {"headline": "A/B variant 1 headline", "primaryText": "variant 1 primary text"},
      {"headline": "A/B variant 2 headline", "primaryText": "variant 2 primary text"}
    ]
  },
  "roas": {
    "dailyBudget": 200,
    "estimatedReach": {"min": 1000, "max": 3000},
    "estimatedClicks": {"min": 20, "max": 60},
    "costPerClick": {"min": 3, "max": 8},
    "estimatedConversions": {"min": 1, "max": 5},
    "costPerConversion": 150,
    "breakEvenROAS": 2.5,
    "projectedROAS": 3.8,
    "monthlyAdSpend": 6000,
    "monthlyAdRevenue": 22800,
    "formulae": [
      {"name": "ROAS", "formula": "Revenue from Ads ÷ Ad Spend", "explanation": "Return on ad spend — how many rupees you earn per rupee spent", "example": "₹22800 ÷ ₹6000 = 3.8x"},
      {"name": "CPC", "formula": "Total Ad Spend ÷ Total Clicks", "explanation": "Cost per click", "example": "₹200 ÷ 40 clicks = ₹5/click"},
      {"name": "CPM", "formula": "(Ad Spend ÷ Impressions) × 1000", "explanation": "Cost per 1000 impressions", "example": "₹200 ÷ 2000 × 1000 = ₹100 CPM"},
      {"name": "Conversion Rate", "formula": "(Conversions ÷ Clicks) × 100", "explanation": "% of clicks that become sales", "example": "3 ÷ 40 × 100 = 7.5%"},
      {"name": "Break-Even ROAS", "formula": "1 ÷ Profit Margin%", "explanation": "Minimum ROAS needed to not lose money", "example": "1 ÷ 0.40 = 2.5x"},
      {"name": "Monthly Ad ROI", "formula": "(Monthly Ad Revenue - Monthly Ad Spend) ÷ Monthly Ad Spend × 100", "explanation": "Percentage return on your ad investment", "example": "(₹22800 - ₹6000) ÷ ₹6000 × 100 = 280%"}
    ]
  },
  "reelScript": {
    "duration": "30s",
    "totalShots": 5,
    "trendingAudio": "suggest a trending audio style or song name",
    "shots": [
      {"shotNumber": 1, "duration": "3s", "visual": "what to show", "textOverlay": "text on screen", "transition": "cut/zoom/slide"},
      {"shotNumber": 2, "duration": "5s", "visual": "what to show", "textOverlay": "text on screen", "transition": "transition type"},
      {"shotNumber": 3, "duration": "7s", "visual": "what to show", "textOverlay": "text on screen", "transition": "transition type"},
      {"shotNumber": 4, "duration": "8s", "visual": "what to show", "textOverlay": "text on screen", "transition": "transition type"},
      {"shotNumber": 5, "duration": "7s", "visual": "what to show — CTA shot", "textOverlay": "CTA text", "transition": "fade"}
    ],
    "captionForReel": "Short punchy caption for the Reel post",
    "postingTip": "One specific tip for maximizing this Reel's reach"
  }
}

IMPORTANT:
- Use REALISTIC Indian Instagram ad metrics (CPM ₹80-150, CPC ₹3-10 for handmade niche)
- Ad copy must be compelling, not generic. Write as if spending real money.
- Reel script should be specific to "${topic}" — describe actual shots, not generic placeholders
- ROAS formulae examples must have real calculated numbers
- JSON only, no other text.`, 2500
    );

    const parsed = extractJSON(raw);
    if (parsed) {
      result.adCopy = parsed.adCopy || null;
      result.roas = parsed.roas || null;
      result.reelScript = parsed.reelScript || null;
    }

    console.log(`  Ad copy: ${result.adCopy ? "yes" : "no"}, ROAS: ${result.roas ? "yes" : "no"}, Reel: ${result.reelScript ? "yes" : "no"}`);
  } catch (err) {
    console.error("Call 2B failed:", (err as Error).message);
  }

  // ── CALL 3: Image Analysis + Pinterest (conditional) ──────────────
  if (imageBase64 && imageMimeType) {
    console.log("Call 3: Image analysis + Pinterest suggestions...");
    try {
      const visionPrompt = `You are an expert Instagram content strategist and product photographer for the handmade/crochet market.

Analyze this product image and search Pinterest for similar trending content.

Return ONLY a valid JSON object:

{
  "imageAnalysis": {
    "productType": "what this product is",
    "colors": ["color1", "color2", "color3"],
    "style": "minimal/boho/vintage/modern/rustic/kawaii",
    "instagramReadiness": 75,
    "lightingScore": 80,
    "compositionScore": 70,
    "colorHarmonyScore": 75,
    "productClarityScore": 80,
    "improvements": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
  },
  "pinterestSuggestions": [
    {"idea": "content idea", "whyItWorks": "reason", "searchTerms": ["term1", "term2"], "estimatedEngagement": "high"},
    {"idea": "content idea", "whyItWorks": "reason", "searchTerms": ["term1", "term2"], "estimatedEngagement": "medium"},
    {"idea": "content idea", "whyItWorks": "reason", "searchTerms": ["term1", "term2"], "estimatedEngagement": "high"},
    {"idea": "content idea", "whyItWorks": "reason", "searchTerms": ["term1", "term2"], "estimatedEngagement": "medium"},
    {"idea": "content idea", "whyItWorks": "reason", "searchTerms": ["term1", "term2"], "estimatedEngagement": "low"}
  ]
}

Scoring: instagramReadiness = (Lighting×0.30) + (Composition×0.30) + (ColorHarmony×0.20) + (ProductClarity×0.20)
90-100=Post-ready, 70-89=Good, 50-69=Needs work, 0-49=Re-shoot

Search Pinterest for trending "${topic}" and "${niche}" content ideas. Return exactly 5 suggestions. JSON only.`;

      const response = await getAnthropic().messages.create({
        model: SEARCH_MODEL,
        max_tokens: 2000,
        tools: [{
          type: "web_search_20250305" as any,
          name: "web_search",
          max_uses: 2,
        } as any],
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

  console.log("Pipeline v2 complete!\n");
  return result;
}
