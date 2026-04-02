import Exa from "exa-js";

// ─── EXA DEEP-REASONING SEARCH ENGINE ───────────────────────────────
// Maximum-quality search using every Exa advanced parameter:
//
//   🔥 deep-reasoning  — Multi-step agentic search with full reasoning
//   🔥 additionalQueries — Multiple parallel search angles per request
//   🔥 outputSchema    — Structured data extraction from search agent
//   🔥 systemPrompt    — Guide the Exa search agent's behavior
//   🔥 summary.schema  — Structured summary per result (JSON schema)
//   🔥 livecrawlTimeout — Live crawling for fresh pages (5s timeout)
//   🔥 subpages        — Crawl linked subpages for deeper data
//   🔥 extras.links    — Extract outbound links from each result
//   🔥 highlights 6000 — Maximum highlight extraction per page
//   🔥 maxAgeHours     — Freshness guarantee for recent data
//   🔥 userLocation IN — India-localized search results
//
// This feeds MASSIVE, structured data into Anthropic Claude —
// maximizing the tool overhead for highest quality AI output.

let _exa: Exa | null = null;

function getExa(): Exa {
  if (!_exa) {
    const key = process.env.EXA_API_KEY;
    if (!key) {
      throw new Error(
        "EXA_API_KEY is not set. Add it in .env or Vercel Dashboard > Settings > Environment Variables."
      );
    }
    _exa = new Exa(key);
  }
  return _exa;
}

// ─── TYPES ──────────────────────────────────────────────────────────

export interface ExaSearchOptions {
  query: string;
  additionalQueries?: string[];
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?: "company" | "research paper" | "news" | "tweet" | "personal site" | "financial report";
  type?: "auto" | "fast" | "instant" | "deep" | "deep-reasoning";
  systemPrompt?: string;
  outputSchema?: { type: string; description: string };
  highlightMaxChars?: number;
  maxAgeHours?: number;
  livecrawlTimeout?: number;
  subpages?: number;
  extractLinks?: number;
  summarySchema?: Record<string, any>;
  useContents?: boolean;
}

export interface ExaResult {
  title: string;
  url: string;
  publishedDate?: string;
  text?: string;
  highlights?: string[];
  summary?: any; // Can be string or structured JSON from schema
  score?: number;
  links?: string[];
  subpageContent?: string;
}

export interface ExaSearchResponse {
  results: ExaResult[];
  query: string;
  searchTimeMs: number;
  costDollars?: number;
}

// ─── DATE HELPERS ───────────────────────────────────────────────────

function getDateRange(hoursBack: number = 720): { start: string; end: string } {
  const now = new Date();
  const past = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
  return {
    start: past.toISOString(),
    end: now.toISOString(),
  };
}

// ─── CORE DEEP-REASONING SEARCH ─────────────────────────────────────

async function exaDeepSearch(options: ExaSearchOptions): Promise<ExaSearchResponse> {
  const exa = getExa();
  const startTime = Date.now();

  // Build the maximum-power search options
  const searchOptions: any = {
    numResults: options.numResults || 25,
    type: options.type || "deep-reasoning",
    userLocation: "IN",
  };

  // Additional queries — multiple search angles in one API call
  if (options.additionalQueries?.length) {
    searchOptions.additionalQueries = options.additionalQueries;
  }

  // System prompt — guide the Exa search agent
  if (options.systemPrompt) {
    searchOptions.systemPrompt = options.systemPrompt;
  }

  // Output schema — structured extraction from deep search
  if (options.outputSchema) {
    searchOptions.outputSchema = options.outputSchema;
  }

  // Domain filtering
  if (options.includeDomains?.length) {
    searchOptions.includeDomains = options.includeDomains;
  }
  if (options.excludeDomains?.length) {
    searchOptions.excludeDomains = options.excludeDomains;
  }

  // Date filtering
  if (options.startPublishedDate) {
    searchOptions.startPublishedDate = options.startPublishedDate;
  }
  if (options.endPublishedDate) {
    searchOptions.endPublishedDate = options.endPublishedDate;
  }

  // Category
  if (options.category) {
    searchOptions.category = options.category;
  }

  // Content extraction — MAXIMUM quality settings
  if (options.useContents !== false) {
    const contents: any = {
      text: true,
      highlights: {
        maxCharacters: options.highlightMaxChars || 6000,
      },
      livecrawlTimeout: options.livecrawlTimeout || 5000,
      subpages: options.subpages ?? 1,
      extras: {
        links: options.extractLinks ?? 1,
      },
    };

    // Structured summary schema — extract specific JSON fields from each result
    if (options.summarySchema) {
      contents.summary = {
        schema: options.summarySchema,
      };
    } else {
      // Default structured summary — always extract a concise answer
      contents.summary = {
        schema: {
          type: "object",
          required: ["answer", "keyData", "relevance"],
          additionalProperties: false,
          properties: {
            answer: {
              type: "string",
              description: "1-2 sentence answer summarizing the key finding from this page",
            },
            keyData: {
              type: "string",
              description: "Specific numbers, prices, statistics, or data points found (e.g. '₹500-₹1200 price range, 45% growth YoY')",
            },
            relevance: {
              type: "string",
              description: "How relevant this result is to the search query: high, medium, or low",
            },
          },
        },
      };
    }

    // Freshness constraint
    if (options.maxAgeHours) {
      contents.maxAgeHours = options.maxAgeHours;
    }

    searchOptions.contents = contents;
  }

  try {
    const response = await exa.search(options.query, searchOptions);

    const results: ExaResult[] = (response.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      publishedDate: r.publishedDate || undefined,
      text: r.text || undefined,
      highlights: r.highlights || undefined,
      summary: r.summary || undefined,
      score: r.score || undefined,
      links: r.extras?.links || undefined,
      subpageContent: r.subpages?.[0]?.text || undefined,
    }));

    const elapsed = Date.now() - startTime;
    const cost = (response as any).costDollars?.total;
    console.log(
      `  Exa deep-reasoning "${options.query.slice(0, 50)}..." → ${results.length} results in ${elapsed}ms` +
      (cost ? ` ($${cost.toFixed(4)})` : "")
    );

    return {
      results,
      query: options.query,
      searchTimeMs: elapsed,
      costDollars: cost,
    };
  } catch (err) {
    console.error(`  Exa deep search failed for "${options.query.slice(0, 50)}...":`, (err as Error).message);
    return { results: [], query: options.query, searchTimeMs: Date.now() - startTime };
  }
}

// ─── SPECIALIZED DEEP-REASONING SEARCHES ────────────────────────────

/**
 * SEARCH 1: Trending Products, Pricing & Market Intelligence
 * Uses deep-reasoning + additionalQueries for multi-angle market research
 * + structured summary schema for data extraction
 */
export async function searchMarketIntel(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<ExaSearchResponse> {
  const locationStr = city ? `${city} ${region}` : region;
  const dates = getDateRange(720); // Last 30 days

  return exaDeepSearch({
    query: `trending ${topic} ${niche} India handmade market pricing demand 2025`,
    additionalQueries: [
      `${topic} price range India handmade sellers INR ₹`,
      `best selling ${niche} products India online marketplace 2025`,
      `${topic} ${niche} ${locationStr} wholesale retail price comparison`,
    ],
    systemPrompt: `You are a senior market research analyst for the Indian handmade & artisan economy. Focus on finding SPECIFIC data: exact prices in INR (₹), seller counts, platform-specific data from Etsy/Meesho/Amazon/Instagram, demand trends, and growth percentages. Prioritize recent data from India. Always extract real numbers, not vague descriptions.`,
    outputSchema: {
      type: "text",
      description: "Detailed market research data with specific prices, trends, and statistics for the Indian handmade market",
    },
    numResults: 25,
    type: "deep-reasoning",
    category: "news",
    startPublishedDate: dates.start,
    endPublishedDate: dates.end,
    highlightMaxChars: 6000,
    livecrawlTimeout: 5000,
    subpages: 1,
    extractLinks: 1,
    maxAgeHours: 720, // 30 days
    summarySchema: {
      type: "object",
      required: ["answer", "priceData", "trendDirection"],
      additionalProperties: false,
      properties: {
        answer: {
          type: "string",
          description: "1-2 sentence summary of the key market insight from this page",
        },
        priceData: {
          type: "string",
          description: "Specific prices in INR found on this page (e.g. '₹350-₹1200 for crochet bags'). Write 'none found' if no prices.",
        },
        trendDirection: {
          type: "string",
          description: "Is demand going up, down, or stable based on this source? Include evidence.",
        },
      },
    },
  });
}

/**
 * SEARCH 2: Competitor & Social Media Intelligence
 * Deep-reasoning search across Instagram, Reddit, YouTube for competitor data
 */
export async function searchCompetitors(
  topic: string,
  niche: string,
  region: string,
): Promise<ExaSearchResponse> {
  const dates = getDateRange(2160); // Last 90 days

  return exaDeepSearch({
    query: `top ${niche} ${topic} sellers Instagram India followers engagement strategy`,
    additionalQueries: [
      `${niche} handmade business India Instagram success story`,
      `${topic} seller review India customer feedback`,
      `best ${niche} accounts to follow India 2025 handmade creators`,
    ],
    systemPrompt: `You are a competitive intelligence analyst for Indian Instagram handmade brands. Find SPECIFIC data: follower counts, engagement rates, pricing strategies, content formats that work, posting frequency, and growth tactics. Look for real account names and metrics. Prioritize accounts that sell ${topic} in India.`,
    outputSchema: {
      type: "text",
      description: "Competitor analysis data with follower counts, engagement rates, pricing, and content strategies",
    },
    numResults: 20,
    type: "deep-reasoning",
    startPublishedDate: dates.start,
    endPublishedDate: dates.end,
    highlightMaxChars: 6000,
    livecrawlTimeout: 5000,
    subpages: 1,
    extractLinks: 1,
    summarySchema: {
      type: "object",
      required: ["answer", "competitorData", "strategyInsight"],
      additionalProperties: false,
      properties: {
        answer: {
          type: "string",
          description: "1-2 sentence summary of the competitive insight from this page",
        },
        competitorData: {
          type: "string",
          description: "Specific competitor metrics: follower counts, prices, engagement rates. Write 'none found' if no data.",
        },
        strategyInsight: {
          type: "string",
          description: "What content strategy or business tactic is mentioned? What works for competitors?",
        },
      },
    },
  });
}

/**
 * SEARCH 3: Regional Market Data, Demographics & Festival Calendar
 * Deep-reasoning for city/region-specific craft market intelligence
 */
export async function searchRegionalData(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<ExaSearchResponse> {
  const locationStr = city ? `${city} ${region}` : region;
  const dates = getDateRange(4320); // Last 6 months

  return exaDeepSearch({
    query: `${locationStr} India handmade ${niche} craft market demand demographics statistics`,
    additionalQueries: [
      `${locationStr} festival calendar 2025 2026 gifting season`,
      `India craft industry statistics market size ${niche} growth report`,
      `online shopping demographics India ${locationStr} handmade products buyer profile`,
    ],
    systemPrompt: `You are a regional market analyst specializing in India's craft and handmade industry. Find SPECIFIC regional data: city population, average income, online shopping penetration, festival dates, craft market sizes, buyer demographics (age, gender, income brackets). Focus on ${locationStr} and surrounding areas. Extract real statistics and government/industry report data where possible.`,
    outputSchema: {
      type: "text",
      description: "Regional market intelligence with demographics, festival calendars, and craft industry statistics for India",
    },
    numResults: 15,
    type: "deep-reasoning",
    category: "news",
    startPublishedDate: dates.start,
    endPublishedDate: dates.end,
    highlightMaxChars: 6000,
    livecrawlTimeout: 5000,
    subpages: 1,
    extractLinks: 1,
    summarySchema: {
      type: "object",
      required: ["answer", "demographics", "seasonalData"],
      additionalProperties: false,
      properties: {
        answer: {
          type: "string",
          description: "1-2 sentence summary of the regional market insight",
        },
        demographics: {
          type: "string",
          description: "Population, income, or buyer demographic data found. Write 'none found' if no data.",
        },
        seasonalData: {
          type: "string",
          description: "Festival dates, seasonal demand patterns, or gifting occasions mentioned.",
        },
      },
    },
  });
}

/**
 * SEARCH 4: Material Costs & Supply Chain Intelligence
 * Deep-reasoning for wholesale pricing, supplier data
 */
export async function searchMaterialCosts(
  topic: string,
  niche: string,
): Promise<ExaSearchResponse> {
  return exaDeepSearch({
    query: `${niche} ${topic} raw material cost India wholesale price 2025`,
    additionalQueries: [
      `yarn wool cotton price India wholesale per kg 2025`,
      `handmade ${niche} packaging material cost India`,
      `${topic} making cost breakdown India artisan`,
    ],
    systemPrompt: `You are a supply chain analyst for India's handmade goods industry. Find EXACT prices in INR for raw materials: yarn (per kg/per ball), fabric, accessories, packaging materials, tools. Compare wholesale vs retail prices. Include supplier platforms like IndiaMart, local wholesale markets. All prices must be in Indian Rupees (₹).`,
    numResults: 15,
    type: "deep-reasoning",
    includeDomains: [
      "indiamart.com",
      "amazon.in",
      "flipkart.com",
      "meesho.com",
    ],
    highlightMaxChars: 6000,
    livecrawlTimeout: 5000,
    subpages: 1,
    extractLinks: 1,
    summarySchema: {
      type: "object",
      required: ["answer", "priceData"],
      additionalProperties: false,
      properties: {
        answer: {
          type: "string",
          description: "1 sentence summary of material pricing found",
        },
        priceData: {
          type: "string",
          description: "Exact material prices in ₹ (e.g. '₹200-₹450 per kg for cotton yarn, ₹50-₹80 per crochet hook')",
        },
      },
    },
  });
}

/**
 * SEARCH 5: Pinterest & Visual Content Trends
 * Deep-reasoning for trending visual styles and content ideas
 */
export async function searchPinterestTrends(
  topic: string,
  niche: string,
): Promise<ExaSearchResponse> {
  return exaDeepSearch({
    query: `${topic} ${niche} trending Pinterest Instagram aesthetic ideas 2025`,
    additionalQueries: [
      `${niche} product photography ideas flat lay handmade`,
      `trending ${topic} color palette aesthetic mood board 2025`,
      `Instagram reel ideas ${niche} handmade makers small business`,
    ],
    systemPrompt: `You are a visual content strategist for handmade brands on Instagram and Pinterest. Find SPECIFIC trending visual styles: color palettes, photography angles, popular aesthetic categories (cottagecore, minimalist, boho, etc.), viral content formats, and specific content ideas that are getting high engagement. Focus on what's trending NOW for ${topic} ${niche}.`,
    numResults: 15,
    type: "deep-reasoning",
    highlightMaxChars: 6000,
    livecrawlTimeout: 5000,
    subpages: 1,
    extractLinks: 1,
    summarySchema: {
      type: "object",
      required: ["answer", "visualTrend"],
      additionalProperties: false,
      properties: {
        answer: {
          type: "string",
          description: "1 sentence summary of the visual/content trend found",
        },
        visualTrend: {
          type: "string",
          description: "Specific visual trend, color palette, or content format that's performing well",
        },
      },
    },
  });
}

/**
 * Get full content from a specific URL with maximum extraction.
 */
export async function getPageContent(url: string): Promise<ExaResult | null> {
  try {
    const exa = getExa();
    const response = await exa.getContents([url], {
      text: true,
      highlights: { maxCharacters: 6000 } as any,
      summary: true,
      livecrawlTimeout: 5000,
      subpages: 1,
    } as any);

    if (response.results && response.results.length > 0) {
      const r = response.results[0] as any;
      return {
        title: r.title || "",
        url: r.url || url,
        text: r.text || undefined,
        highlights: r.highlights || undefined,
        summary: r.summary || undefined,
        links: r.extras?.links || undefined,
      };
    }
    return null;
  } catch (err) {
    console.error(`  Exa getContents failed for "${url}":`, (err as Error).message);
    return null;
  }
}

// ─── AGGREGATED DEEP RESEARCH ───────────────────────────────────────

/**
 * Run ALL research searches in parallel using deep-reasoning mode
 * and merge into a MASSIVE, structured research corpus for Claude.
 *
 * 4 parallel deep-reasoning searches → 75+ results with:
 *   - Full page text
 *   - 6000-char highlights per page
 *   - Structured JSON summaries (answer, keyData, relevance)
 *   - Subpage content (linked pages crawled)
 *   - Outbound links extracted
 *   - Live-crawled for freshness
 *
 * This maximizes the data fed into Claude's context window,
 * giving it the richest possible research to work with.
 */
export async function runExaResearch(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<string> {
  console.log("  Exa: Running 4 deep-reasoning searches in parallel...");
  const startTime = Date.now();

  const [marketRes, competitorRes, regionalRes, materialRes] = await Promise.all([
    searchMarketIntel(topic, niche, region, city),
    searchCompetitors(topic, niche, region),
    searchRegionalData(topic, niche, region, city),
    searchMaterialCosts(topic, niche),
  ]);

  const totalResults =
    marketRes.results.length +
    competitorRes.results.length +
    regionalRes.results.length +
    materialRes.results.length;

  const totalCost =
    (marketRes.costDollars || 0) +
    (competitorRes.costDollars || 0) +
    (regionalRes.costDollars || 0) +
    (materialRes.costDollars || 0);

  const elapsed = Date.now() - startTime;
  console.log(
    `  Exa: ${totalResults} total results gathered in ${elapsed}ms` +
    (totalCost > 0 ? ` (total cost: $${totalCost.toFixed(4)})` : "")
  );

  // Build MAXIMUM research text from all results
  const sections: string[] = [];

  // Helper: format a single result with all available data
  function formatResult(r: ExaResult): string {
    const parts: string[] = [];
    parts.push(`📄 [${r.title}](${r.url})`);
    if (r.publishedDate) parts.push(`   Published: ${r.publishedDate}`);

    // Structured summary (from schema) — highest value data
    if (r.summary && typeof r.summary === "object") {
      if (r.summary.answer) parts.push(`   ✦ INSIGHT: ${r.summary.answer}`);
      if (r.summary.priceData && r.summary.priceData !== "none found") parts.push(`   ✦ PRICES: ${r.summary.priceData}`);
      if (r.summary.keyData && r.summary.keyData !== "none found") parts.push(`   ✦ DATA: ${r.summary.keyData}`);
      if (r.summary.trendDirection) parts.push(`   ✦ TREND: ${r.summary.trendDirection}`);
      if (r.summary.competitorData && r.summary.competitorData !== "none found") parts.push(`   ✦ COMPETITORS: ${r.summary.competitorData}`);
      if (r.summary.strategyInsight) parts.push(`   ✦ STRATEGY: ${r.summary.strategyInsight}`);
      if (r.summary.demographics && r.summary.demographics !== "none found") parts.push(`   ✦ DEMOGRAPHICS: ${r.summary.demographics}`);
      if (r.summary.seasonalData) parts.push(`   ✦ SEASONAL: ${r.summary.seasonalData}`);
      if (r.summary.visualTrend) parts.push(`   ✦ VISUAL: ${r.summary.visualTrend}`);
      if (r.summary.relevance) parts.push(`   ✦ RELEVANCE: ${r.summary.relevance}`);
    } else if (typeof r.summary === "string" && r.summary) {
      parts.push(`   Summary: ${r.summary}`);
    }

    // Highlights — key passages from the page
    if (r.highlights?.length) {
      parts.push(`   Key excerpts: ${r.highlights.slice(0, 3).join(" │ ")}`);
    }

    // Full text — truncated to fit context window
    if (r.text) {
      parts.push(`   Content: ${r.text.slice(0, 2000)}`);
    }

    // Subpage content — data from linked pages
    if (r.subpageContent) {
      parts.push(`   Subpage data: ${r.subpageContent.slice(0, 800)}`);
    }

    // Extracted links — for reference
    if (r.links?.length) {
      parts.push(`   Related links: ${r.links.slice(0, 5).join(", ")}`);
    }

    return parts.join("\n");
  }

  // Section 1: Market & Pricing Intelligence
  if (marketRes.results.length > 0) {
    sections.push("╔══════════════════════════════════════════════════════════╗");
    sections.push("║  SECTION 1: MARKET & PRICING INTELLIGENCE               ║");
    sections.push("╚══════════════════════════════════════════════════════════╝");
    sections.push(`(${marketRes.results.length} sources, search time: ${marketRes.searchTimeMs}ms)\n`);
    for (const r of marketRes.results) {
      sections.push(formatResult(r));
    }
  }

  // Section 2: Competitor & Social Media Intelligence
  if (competitorRes.results.length > 0) {
    sections.push("\n╔══════════════════════════════════════════════════════════╗");
    sections.push("║  SECTION 2: COMPETITOR & SOCIAL MEDIA ANALYSIS           ║");
    sections.push("╚══════════════════════════════════════════════════════════╝");
    sections.push(`(${competitorRes.results.length} sources, search time: ${competitorRes.searchTimeMs}ms)\n`);
    for (const r of competitorRes.results) {
      sections.push(formatResult(r));
    }
  }

  // Section 3: Regional Market Data & Demographics
  if (regionalRes.results.length > 0) {
    sections.push("\n╔══════════════════════════════════════════════════════════╗");
    sections.push("║  SECTION 3: REGIONAL MARKET DATA & DEMOGRAPHICS          ║");
    sections.push("╚══════════════════════════════════════════════════════════╝");
    sections.push(`(${regionalRes.results.length} sources, search time: ${regionalRes.searchTimeMs}ms)\n`);
    for (const r of regionalRes.results) {
      sections.push(formatResult(r));
    }
  }

  // Section 4: Material Costs & Supply Chain
  if (materialRes.results.length > 0) {
    sections.push("\n╔══════════════════════════════════════════════════════════╗");
    sections.push("║  SECTION 4: MATERIAL COSTS & SUPPLY CHAIN                ║");
    sections.push("╚══════════════════════════════════════════════════════════╝");
    sections.push(`(${materialRes.results.length} sources, search time: ${materialRes.searchTimeMs}ms)\n`);
    for (const r of materialRes.results) {
      sections.push(formatResult(r));
    }
  }

  // Fallback if all searches returned nothing
  if (totalResults === 0) {
    return `Topic: ${topic}, Niche: ${niche}, Region: ${region}${city ? `, City: ${city}` : ""}. Exa deep-reasoning returned no results — generate analysis from domain knowledge.`;
  }

  const fullResearch = sections.join("\n\n");
  console.log(`  Exa: Research corpus built: ${fullResearch.length} chars from ${totalResults} sources`);
  return fullResearch;
}

/**
 * Run Pinterest-specific deep-reasoning research for image analysis phase.
 * Returns rich visual trend data for Claude's vision analysis.
 */
export async function runExaPinterestResearch(
  topic: string,
  niche: string,
): Promise<string> {
  console.log("  Exa: Deep-reasoning Pinterest trend search...");
  const res = await searchPinterestTrends(topic, niche);

  if (res.results.length === 0) {
    return `No Pinterest trend data found for ${topic} ${niche}. Use general knowledge.`;
  }

  const sections: string[] = [];
  sections.push("╔══════════════════════════════════════════════════════════╗");
  sections.push("║  PINTEREST & VISUAL CONTENT TRENDS (deep-reasoning)     ║");
  sections.push("╚══════════════════════════════════════════════════════════╝");
  sections.push(`(${res.results.length} sources found)\n`);

  for (const r of res.results) {
    const parts: string[] = [];
    parts.push(`📌 [${r.title}](${r.url})`);

    if (r.summary && typeof r.summary === "object") {
      if (r.summary.answer) parts.push(`   ✦ INSIGHT: ${r.summary.answer}`);
      if (r.summary.visualTrend) parts.push(`   ✦ TREND: ${r.summary.visualTrend}`);
    } else if (typeof r.summary === "string" && r.summary) {
      parts.push(`   Summary: ${r.summary}`);
    }

    if (r.highlights?.length) {
      parts.push(`   Key excerpts: ${r.highlights.slice(0, 3).join(" │ ")}`);
    }

    if (r.text) {
      parts.push(`   Content: ${r.text.slice(0, 1000)}`);
    }

    sections.push(parts.join("\n"));
  }

  return sections.join("\n\n");
}
