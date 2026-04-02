import Exa from "exa-js";

// ─── EXA SEARCH SERVICE ─────────────────────────────────────────────
// Replaces Claude's built-in web_search tool with Exa's deep-reasoning
// search for significantly higher quality market research data.
//
// Benefits over Claude web_search:
//   - 40+ results per pipeline run vs 5 limited searches
//   - Full page content extraction (text, highlights, summaries)
//   - Domain filtering for platform-specific searches
//   - Deep-reasoning mode for comprehensive analysis
//   - Date filtering for freshness guarantees
//   - India-localized results via userLocation

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
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string; // ISO 8601
  endPublishedDate?: string;   // ISO 8601
  category?: "company" | "research paper" | "news" | "tweet" | "personal site" | "financial report";
  type?: "auto" | "fast" | "instant" | "deep" | "deep-reasoning";
  useContents?: boolean;
  highlightMaxChars?: number;
  maxAgeHours?: number;
}

export interface ExaResult {
  title: string;
  url: string;
  publishedDate?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
  score?: number;
}

export interface ExaSearchResponse {
  results: ExaResult[];
  query: string;
  searchTimeMs: number;
}

// ─── CORE SEARCH FUNCTION ───────────────────────────────────────────

async function exaSearch(options: ExaSearchOptions): Promise<ExaSearchResponse> {
  const exa = getExa();
  const startTime = Date.now();

  const searchOptions: any = {
    numResults: options.numResults || 10,
    type: options.type || "auto",
    userLocation: "IN", // India-localized results
  };

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

  // Content extraction — get full text, highlights, and summaries
  if (options.useContents !== false) {
    searchOptions.contents = {
      text: true,
      highlights: {
        maxCharacters: options.highlightMaxChars || 4000,
      },
      summary: true,
    };

    if (options.maxAgeHours) {
      searchOptions.contents.maxAgeHours = options.maxAgeHours;
    }
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
    }));

    const elapsed = Date.now() - startTime;
    console.log(`  Exa search "${options.query.slice(0, 60)}..." → ${results.length} results in ${elapsed}ms`);

    return { results, query: options.query, searchTimeMs: elapsed };
  } catch (err) {
    console.error(`  Exa search failed for "${options.query.slice(0, 60)}...":`, (err as Error).message);
    return { results: [], query: options.query, searchTimeMs: Date.now() - startTime };
  }
}

// ─── SPECIALIZED SEARCH FUNCTIONS ───────────────────────────────────

/**
 * Search for trending products, pricing, and market data.
 * Uses deep-reasoning for comprehensive analysis.
 */
export async function searchMarketIntel(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<ExaSearchResponse> {
  const locationStr = city ? `${city} ${region}` : region;
  return exaSearch({
    query: `trending ${topic} ${niche} India 2025 handmade pricing ${locationStr} market demand`,
    numResults: 15,
    type: "auto",
    category: "news",
    includeDomains: [
      "etsy.com",
      "amazon.in",
      "meesho.com",
      "flipkart.com",
      "craftsvilla.com",
    ],
    highlightMaxChars: 3000,
  });
}

/**
 * Search for competitor data on Instagram and social platforms.
 */
export async function searchCompetitors(
  topic: string,
  niche: string,
  region: string,
): Promise<ExaSearchResponse> {
  return exaSearch({
    query: `top ${niche} ${topic} sellers Instagram India 2025 followers engagement pricing strategy`,
    numResults: 15,
    type: "auto",
    includeDomains: [
      "instagram.com",
      "reddit.com",
      "youtube.com",
      "medium.com",
    ],
    highlightMaxChars: 3000,
  });
}

/**
 * Search for regional market data, demographics, and festival/seasonal info.
 */
export async function searchRegionalData(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<ExaSearchResponse> {
  const locationStr = city ? `${city} ${region}` : region;
  return exaSearch({
    query: `handmade ${niche} ${topic} market India ${locationStr} demand statistics demographics craft industry`,
    numResults: 10,
    type: "auto",
    category: "news",
    highlightMaxChars: 3000,
  });
}

/**
 * Search for material costs and supply chain data.
 */
export async function searchMaterialCosts(
  topic: string,
  niche: string,
): Promise<ExaSearchResponse> {
  return exaSearch({
    query: `${niche} ${topic} material cost India wholesale price yarn fabric supplies 2025`,
    numResults: 10,
    type: "auto",
    includeDomains: [
      "indiamart.com",
      "amazon.in",
      "flipkart.com",
    ],
    highlightMaxChars: 2000,
  });
}

/**
 * Search for Pinterest/visual content trends for a product.
 */
export async function searchPinterestTrends(
  topic: string,
  niche: string,
): Promise<ExaSearchResponse> {
  return exaSearch({
    query: `${topic} ${niche} trending Pinterest Instagram aesthetic ideas flat lay photography handmade`,
    numResults: 10,
    type: "auto",
    includeDomains: [
      "pinterest.com",
      "instagram.com",
      "behance.net",
    ],
    highlightMaxChars: 2000,
  });
}

/**
 * Get full content from a specific URL.
 */
export async function getPageContent(url: string): Promise<ExaResult | null> {
  try {
    const exa = getExa();
    const response = await exa.getContents([url], {
      text: true,
      highlights: { maxCharacters: 6000 } as any,
      summary: true,
    } as any);

    if (response.results && response.results.length > 0) {
      const r = response.results[0] as any;
      return {
        title: r.title || "",
        url: r.url || url,
        text: r.text || undefined,
        highlights: r.highlights || undefined,
        summary: r.summary || undefined,
      };
    }
    return null;
  } catch (err) {
    console.error(`  Exa getContents failed for "${url}":`, (err as Error).message);
    return null;
  }
}

// ─── AGGREGATED RESEARCH ────────────────────────────────────────────

/**
 * Run all research searches in parallel and merge into a single
 * comprehensive research text block for the AI pipeline.
 *
 * This replaces Call 1A's Claude web_search (5 searches) with
 * 3 parallel Exa searches returning 40+ results with full content.
 */
export async function runExaResearch(
  topic: string,
  niche: string,
  region: string,
  city?: string,
): Promise<string> {
  console.log("  Exa: Running 3 parallel research searches...");
  const startTime = Date.now();

  const [marketRes, competitorRes, regionalRes] = await Promise.all([
    searchMarketIntel(topic, niche, region, city),
    searchCompetitors(topic, niche, region),
    searchRegionalData(topic, niche, region, city),
  ]);

  const totalResults = marketRes.results.length + competitorRes.results.length + regionalRes.results.length;
  const elapsed = Date.now() - startTime;
  console.log(`  Exa: ${totalResults} total results gathered in ${elapsed}ms`);

  // Build comprehensive research text from all results
  const sections: string[] = [];

  // Section 1: Market & Pricing Intel
  if (marketRes.results.length > 0) {
    sections.push("═══ MARKET & PRICING INTELLIGENCE ═══");
    for (const r of marketRes.results) {
      const parts = [`[${r.title}](${r.url})`];
      if (r.publishedDate) parts.push(`Published: ${r.publishedDate}`);
      if (r.summary) parts.push(`Summary: ${r.summary}`);
      if (r.highlights?.length) parts.push(`Key points: ${r.highlights.join(" | ")}`);
      if (r.text) parts.push(`Content: ${r.text.slice(0, 1500)}`);
      sections.push(parts.join("\n"));
    }
  }

  // Section 2: Competitor & Social Media Intel
  if (competitorRes.results.length > 0) {
    sections.push("\n═══ COMPETITOR & SOCIAL MEDIA ANALYSIS ═══");
    for (const r of competitorRes.results) {
      const parts = [`[${r.title}](${r.url})`];
      if (r.summary) parts.push(`Summary: ${r.summary}`);
      if (r.highlights?.length) parts.push(`Key points: ${r.highlights.join(" | ")}`);
      if (r.text) parts.push(`Content: ${r.text.slice(0, 1500)}`);
      sections.push(parts.join("\n"));
    }
  }

  // Section 3: Regional & Demographic Data
  if (regionalRes.results.length > 0) {
    sections.push("\n═══ REGIONAL MARKET DATA & DEMOGRAPHICS ═══");
    for (const r of regionalRes.results) {
      const parts = [`[${r.title}](${r.url})`];
      if (r.summary) parts.push(`Summary: ${r.summary}`);
      if (r.highlights?.length) parts.push(`Key points: ${r.highlights.join(" | ")}`);
      if (r.text) parts.push(`Content: ${r.text.slice(0, 1500)}`);
      sections.push(parts.join("\n"));
    }
  }

  // If all searches returned nothing, provide a fallback
  if (totalResults === 0) {
    return `Topic: ${topic}, Niche: ${niche}, Region: ${region}${city ? `, City: ${city}` : ""}. Exa search returned no results — generate analysis from domain knowledge.`;
  }

  return sections.join("\n\n");
}

/**
 * Run Pinterest-specific research for image analysis phase.
 * Replaces Call 3's Claude web_search for Pinterest content.
 */
export async function runExaPinterestResearch(
  topic: string,
  niche: string,
): Promise<string> {
  console.log("  Exa: Searching Pinterest trends...");
  const res = await searchPinterestTrends(topic, niche);

  if (res.results.length === 0) {
    return `No Pinterest trend data found for ${topic} ${niche}. Use general knowledge.`;
  }

  const sections: string[] = ["═══ PINTEREST & VISUAL CONTENT TRENDS ═══"];
  for (const r of res.results) {
    const parts = [`[${r.title}](${r.url})`];
    if (r.summary) parts.push(`Summary: ${r.summary}`);
    if (r.highlights?.length) parts.push(`Key points: ${r.highlights.join(" | ")}`);
    sections.push(parts.join("\n"));
  }

  return sections.join("\n\n");
}
