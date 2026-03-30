import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { CalendarInput, CalendarOutput } from "./types";

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

function extractJSON(raw: string): any {
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(cleaned.slice(s, e + 1)); } catch {} }
  return null;
}

function getText(content: any[]): string {
  return content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
}

/**
 * WEEKLY CONTENT CALENDAR PIPELINE
 *
 * Call 1: Web search for this week's trends, festivals, format performance
 * Call 2: Generate 7-day calendar JSON with 4-3 content mix
 */
export async function runCalendarPipeline(input: CalendarInput): Promise<CalendarOutput> {
  const { products, audience, region, city, brandVoice, priceRange, businessContext } = input;
  const locationStr = city ? `${city}, ${region}` : region;
  console.log(`\nCalendar pipeline: ${products} / ${locationStr}`);

  const result: CalendarOutput = { days: [], trendBriefing: "", weeklyTheme: "" };

  // ── Call 1: Web Search ────────────────────────────────────────────
  console.log("Calendar Call 1: Web search for weekly trends...");
  let rawResearch = "";
  try {
    const response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search", max_uses: 3 } as any],
      messages: [{
        role: "user",
        content: `Search for: 1) What is trending on Instagram India this week for handmade/crochet products. 2) Which post formats (Reels vs carousels vs photos) get the most reach right now. 3) Any Indian festivals or cultural events in the next 10 days. 4) Trending audio or content styles on Instagram Reels. Provide a comprehensive research summary.${businessContext ? `\n\nKEEP THIS SELLER IN MIND: ${businessContext}` : "" }`,
      }],
    });
    rawResearch = getText(response.content);
    console.log("  Research:", rawResearch.length, "chars");
  } catch (err) {
    console.error("Calendar search failed:", (err as Error).message);
    rawResearch = "No web data available. Use general best practices.";
  }

  // ── Call 2: Generate 7-day calendar ───────────────────────────────
  console.log("Calendar Call 2: Generating 7-day plan...");
  try {
    const calPrompt = `You are a professional social media strategist for a handmade crochet business.

RESEARCH DATA:
${rawResearch.slice(0, 4000)}

BUSINESS DETAILS:
- Products: ${products}
- Audience: ${audience}
- Region: ${locationStr}, India
- Brand voice: ${brandVoice}
- Price range: ${priceRange}
${businessContext ? `\nCRITICAL CONTEXT:\n${businessContext}\n-> You MUST feature these specifically proven top-selling items heavily in the upcoming week's calendar to maximize revenue.\n` : ""}

Generate a complete 7-day Instagram content calendar (Monday to Sunday) using the 4-3 content mix formula:
- 2 days: Product showcase (directly drives sales)
- 1 day: Behind the scenes (builds trust)
- 1 day: Educational/tips (gets saves and shares)
- 1 day: Engagement bait (gets comments)
- 1 day: Testimonial/social proof (converts fence-sitters)
- 1 day: Trend-riding (reaches new audiences)

Return ONLY valid JSON:

{
  "weeklyTheme": "One line describing the week's overarching theme",
  "days": [
    {
      "day": "Monday",
      "format": "Reel 30s",
      "theme": "Product showcase — describe the angle",
      "hook": "Under 15 words, must stop scrolling",
      "caption": "150-220 word caption with hook, story, and CTA. Use line breaks for readability.",
      "hashtags": ["#tag1", "#tag2", "...exactly 25 hashtags — 8 niche, 12 medium, 5 broad"],
      "bestTime": "7:30pm IST",
      "story": [
        {"slide": 1, "content": "Story text", "sticker": "poll/quiz/countdown/none"},
        {"slide": 2, "content": "Story text", "sticker": "none"},
        {"slide": 3, "content": "Story text", "sticker": "link/none"}
      ]
    }
  ],
  "trendBriefing": "3 sentences about what is trending this week and how to ride it"
}

RULES:
- Include story scripts for Mon, Wed, and Fri only (3 of 7 days). Other days have no story field.
- Each caption must be unique, compelling, and in the "${brandVoice}" voice
- Hooks must be scroll-stopping — under 15 words each
- Hashtags: exactly 25 per post (8 niche like #crochetindia, 12 medium like #handmadegifts, 5 broad like #shopsmall)
- Post times should be realistic for ${locationStr}
- All content must relate to "${products}"
- JSON only, no other text.`;

    const response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{ role: "user", content: calPrompt }],
    });

    const raw = getText(response.content);
    console.log("  Calendar response:", raw.length, "chars");

    const parsed = extractJSON(raw);
    if (parsed) {
      result.days = Array.isArray(parsed.days) ? parsed.days : [];
      result.trendBriefing = parsed.trendBriefing || "";
      result.weeklyTheme = parsed.weeklyTheme || "";
    }

    console.log(`  ${result.days.length} days generated`);
  } catch (err) {
    console.error("Calendar generation failed:", (err as Error).message);
  }

  console.log("Calendar pipeline complete!\n");
  return result;
}
