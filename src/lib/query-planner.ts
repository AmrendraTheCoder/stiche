// src/lib/query-planner.ts
// Claude Haiku reads the business profile + search history and dynamically
// generates custom Exa search queries instead of using hardcoded templates.
//
// This is the "self-learning" core — each search is unique, informed by:
//   - WHO the business is (profile/systemPrompt)
//   - WHAT they searched before (searchHistory)
//   - WHAT worked before (behavior scores + feedback)
//   - WHAT season/time it is right now

import Anthropic from "@anthropic-ai/sdk";
import { BusinessProfile, SearchHistoryEntry, LearningMemory } from "./db";
import { getNicheConfig } from "./niche-config";

const HAIKU = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ─── TYPES ──────────────────────────────────────────────────────────

export interface PlannedSearch {
  query: string;
  additionalQueries: string[];
  systemPrompt: string;
  includeDomains?: string[];
  category?: "news" | "financial report" | "company";
  purpose: string; // human label e.g. "market intel", "competitors", "regional"
}

export interface PlannedQueries {
  searches: PlannedSearch[];
  pinterestSearch: PlannedSearch;
  reasoning: string; // what Claude decided and why
}

// ─── CORE QUERY PLANNER ─────────────────────────────────────────────

export async function planExaQueries(
  topic: string,
  niche: string,
  region: string,
  city: string | undefined,
  goal: string,
  profile: BusinessProfile | null,
  searchHistory: SearchHistoryEntry[],
  learning: LearningMemory | null,
): Promise<PlannedQueries | null> {
  const nicheConfig = getNicheConfig(profile?.category || "other");
  const locationStr = city ? `${city}, ${region}` : region;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // Build context about what worked and what didn't
  const goodSearches = searchHistory
    .filter(s => s.behaviorScore >= 2 || s.feedbackEmoji === "love" || s.feedbackEmoji === "good")
    .slice(0, 3)
    .map(s => s.input.topic);

  const badSearches = searchHistory
    .filter(s => s.behaviorScore < 0 || s.feedbackEmoji === "bad")
    .slice(0, 3)
    .map(s => s.input.topic);

  const copiedMost = learning?.mostCopiedSection || "hooks";
  const preferredStyle = learning?.preferredContentStyle || "emotional";

  const prompt = `You are a SEARCH QUERY PLANNER for an AI market research tool for small Indian Instagram businesses.

═══ BUSINESS PROFILE ═══
Shop: ${profile?.shopName || "Unknown Shop"}
Category: ${nicheConfig.label} (${nicheConfig.emoji})
Products: ${profile?.products || topic}
Location: ${locationStr}, India
Customer Type: ${profile?.customerType || "general buyers"}
Price Range: ₹${profile?.priceMin || 200}–₹${profile?.priceMax || 2000}
Selling Duration: ${profile?.sellingDuration || "unknown"}
Instagram Followers: ${profile?.followerRange || "unknown"}
Main Goal: ${profile?.mainGoal || goal}

═══ TODAY'S SEARCH REQUEST ═══
Topic: "${topic}"
Niche: "${niche}"
Goal: "${goal}"
Today's Date: ${dateStr}

═══ WHAT WORKED BEFORE (copy more of this style) ═══
Good searches (high engagement): ${goodSearches.length ? goodSearches.join(", ") : "none yet"}
Most copied section: ${copiedMost}
Preferred content style: ${preferredStyle}

═══ WHAT DID NOT WORK (avoid these angles) ═══
Bad searches (low engagement): ${badSearches.length ? badSearches.join(", ") : "none yet"}
Recent topics to avoid repeating: ${searchHistory.slice(0, 3).map(s => s.input.topic).join(", ") || "none"}

═══ NICHE-SPECIFIC CONTEXT ═══
Best platforms for this niche: ${nicheConfig.primaryPlatforms.join(", ")}
Content angles that work: ${nicheConfig.contentAngles.join(", ")}
Recommended search domains: ${nicheConfig.marketDomains.join(", ")}

═══ YOUR TASK ═══
Generate 4 highly specific, non-repetitive Exa deep-reasoning search plans for this business RIGHT NOW.

Each search must:
1. Be DIFFERENT from each other and from recent searches
2. Be SPECIFIC to this business (not generic crochet/handmade advice)
3. Factor in the CURRENT DATE for seasonality (festivals coming up, weather trends, etc.)
4. Reference the LOCATION (${locationStr}) where relevant
5. Use the business PRICE RANGE (₹${profile?.priceMin}–₹${profile?.priceMax}) in pricing queries

Return ONLY valid JSON:
{
  "searches": [
    {
      "purpose": "market intel",
      "query": "<primary Exa query — very specific to this business>",
      "additionalQueries": ["<angle 2>", "<angle 3>", "<angle 4>"],
      "systemPrompt": "<expert persona instruction for the Exa AI agent — specific to this niche>",
      "includeDomains": ["<domain1>", "<domain2>"],
      "category": "news"
    },
    {
      "purpose": "competitor analysis",
      ...
    },
    {
      "purpose": "regional demand",
      ...
    },
    {
      "purpose": "material costs",
      ...
    }
  ],
  "pinterestSearch": {
    "purpose": "visual trends",
    "query": "<Pinterest/visual trend query>",
    "additionalQueries": ["<style angle>", "<aesthetic angle>"],
    "systemPrompt": "<visual content strategy expert instruction>",
    "includeDomains": ["pinterest.com", "instagram.com"]
  },
  "reasoning": "<1-2 sentences explaining what you focused on and why, mentioning the season/date>"
}`;

  try {
    const response = await getClient().messages.create({
      model: HAIKU,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    // Parse JSON
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) throw new Error("No JSON in query planner response");

    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    console.log(`  QueryPlanner: ${parsed.searches?.length || 0} searches planned. Reasoning: ${parsed.reasoning}`);
    return parsed as PlannedQueries;
  } catch (err) {
    console.error("QueryPlanner failed:", (err as Error).message);
    return null; // Fallback to default exa-search.ts behaviour
  }
}
