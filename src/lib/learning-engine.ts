// src/lib/learning-engine.ts
// Aggregates behavior signals + emoji feedback into a LearningMemory document.
// Run after every search + feedback event.
// Produces plain-language insights the user can understand.

import {
  SearchHistoryEntry,
  LearningMemory,
  getRecentSearchHistory,
  getLearningMemory,
  saveLearningMemory,
} from "./db";

// ─── BEHAVIOR SCORE WEIGHTS ─────────────────────────────────────────
const WEIGHTS = {
  copiedHook:       1.0,
  copiedCaption:    1.0,
  copiedHashtags:   0.5,
  pdfDownload:      2.0,
  longSession:      1.0,   // > 3 min
  shortSession:    -1.0,   // < 30s
  repeatSearch:    -0.5,   // same topic searched again soon
  feedbackLove:     2.0,
  feedbackGood:     1.0,
  feedbackMeh:     -0.5,
  feedbackBad:     -1.5,
};

// ─── EMOJI → SCORE ──────────────────────────────────────────────────
function emojiScore(emoji: string | null): number {
  switch (emoji) {
    case "love": return WEIGHTS.feedbackLove;
    case "good": return WEIGHTS.feedbackGood;
    case "meh":  return WEIGHTS.feedbackMeh;
    case "bad":  return WEIGHTS.feedbackBad;
    default:     return 0;
  }
}

// ─── COMPUTE BEHAVIOR SCORE ─────────────────────────────────────────
export function computeBehaviorScore(entry: Partial<SearchHistoryEntry>): number {
  let score = 0;
  const copies = entry.copiedSections || [];

  if (copies.includes("hooks"))    score += WEIGHTS.copiedHook;
  if (copies.includes("caption"))  score += WEIGHTS.copiedCaption;
  if (copies.includes("hashtags")) score += WEIGHTS.copiedHashtags;
  if (copies.includes("pdf") || entry.pdfDownloaded) score += WEIGHTS.pdfDownload;

  const ms = entry.timeOnResultsMs || 0;
  if (ms > 3 * 60 * 1000) score += WEIGHTS.longSession;
  if (ms > 0 && ms < 30 * 1000) score += WEIGHTS.shortSession;

  score += emojiScore(entry.feedbackEmoji || null);

  return Math.round(score * 10) / 10;
}

// ─── FIND PREFERRED CONTENT STYLE ───────────────────────────────────
function inferContentStyle(history: SearchHistoryEntry[]): string {
  const highScoreSearches = history.filter(s => s.behaviorScore >= 2);
  if (highScoreSearches.length === 0) return "emotional";

  // Infer from topics that worked well — simple keyword heuristic
  const topics = highScoreSearches.map(s => s.input.topic.toLowerCase()).join(" ");
  if (/gift|mom|sister|diwali|festival|love|mother/.test(topics)) return "emotional";
  if (/trend|viral|latest|new|2025/.test(topics)) return "trend-driven";
  if (/price|profit|cost|margin|money/.test(topics)) return "data-driven";
  if (/instagram|reel|hook|content/.test(topics)) return "content-focused";
  return "emotional";
}

// ─── FIND MOST COPIED SECTION ───────────────────────────────────────
function findMostCopied(history: SearchHistoryEntry[]): string {
  const counts: Record<string, number> = { hooks: 0, caption: 0, hashtags: 0, pdf: 0 };
  history.forEach(s => {
    (s.copiedSections || []).forEach(section => {
      counts[section] = (counts[section] || 0) + 1;
    });
    if (s.pdfDownloaded) counts.pdf++;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "hooks";
}

// ─── GENERATE PLAIN-LANGUAGE INSIGHTS ───────────────────────────────
function generateInsights(
  history: SearchHistoryEntry[],
  memory: Partial<LearningMemory>,
): string[] {
  const insights: string[] = [];

  if (history.length >= 3) {
    insights.push(`You've done ${history.length} searches — I'm getting to know your business better each time`);
  }

  if (memory.bestPerformingTopics?.length) {
    insights.push(`Your best search topics: ${memory.bestPerformingTopics.slice(0, 2).join(" and ")}`);
  }

  if (memory.mostCopiedSection === "hooks") {
    insights.push("You copy the most hooks — I'll focus on making them more emotional and specific to your buyers");
  } else if (memory.mostCopiedSection === "caption") {
    insights.push("You love the captions — I'll keep refining them for your exact audience");
  } else if (memory.mostCopiedSection === "pdf") {
    insights.push("You download full PDF reports — I'll make sure every section is packed with useful data");
  }

  if (memory.preferredContentStyle === "emotional") {
    insights.push("Your audience responds to emotional, story-driven content — I'll lean into this");
  } else if (memory.preferredContentStyle === "trend-driven") {
    insights.push("You focus on trends — I'll make sure every search includes the latest market signals");
  }

  if (memory.learningLevel && memory.learningLevel >= 3) {
    insights.push("I now have enough data to give you highly personalized results — each search will feel like it was made just for your shop");
  }

  return insights.slice(0, 4); // max 4 insights shown
}

// ─── LEARNING LEVEL ─────────────────────────────────────────────────
function computeLearningLevel(
  searches: number,
  avgScore: number,
  hasFeedback: boolean,
): number {
  let level = 1;
  if (searches >= 3) level = 2;
  if (searches >= 6) level = 3;
  if (searches >= 10 && avgScore > 1) level = 4;
  if (searches >= 15 && avgScore > 2 && hasFeedback) level = 5;
  return level;
}

// ─── MAIN: UPDATE LEARNING MEMORY ───────────────────────────────────

export async function updateLearningMemory(sessionId: string): Promise<LearningMemory> {
  const history = await getRecentSearchHistory(sessionId, 50);
  const existing = await getLearningMemory(sessionId);

  const totalSearches = history.length;
  const avgBehaviorScore = totalSearches > 0
    ? Math.round(history.reduce((sum, s) => sum + (s.behaviorScore || 0), 0) / totalSearches * 10) / 10
    : 0;

  // Best/worst topics
  const sorted = [...history].sort((a, b) => (b.behaviorScore || 0) - (a.behaviorScore || 0));
  const bestPerformingTopics = sorted.slice(0, 3).map(s => s.input.topic).filter(Boolean);
  const worstPerformingTopics = sorted.slice(-3).map(s => s.input.topic).filter(Boolean);

  const preferredContentStyle = inferContentStyle(history);
  const mostCopiedSection = findMostCopied(history);

  const hasFeedback = history.some(s => s.feedbackEmoji !== null);
  const learningLevel = computeLearningLevel(totalSearches, avgBehaviorScore, hasFeedback);

  // Search streak
  const today = new Date().toDateString();
  const lastSearchDate = history[0]?.createdAt
    ? new Date(history[0].createdAt).toDateString()
    : "";
  const searchStreak = existing?.searchStreak
    ? (lastSearchDate === today ? existing.searchStreak : 1)
    : 1;

  const newMemory: LearningMemory = {
    sessionId,
    totalSearches,
    avgBehaviorScore,
    bestPerformingTopics,
    worstPerformingTopics,
    preferredContentStyle,
    mostCopiedSection,
    learningLevel,
    searchStreak,
    lastSearchDate: history[0]?.createdAt || new Date().toISOString(),
    insights: [],
    updatedAt: new Date().toISOString(),
  };

  newMemory.insights = generateInsights(history, newMemory);

  await saveLearningMemory(newMemory);
  console.log(`  LearningEngine: level=${learningLevel}, searches=${totalSearches}, avgScore=${avgBehaviorScore}`);
  return newMemory;
}
