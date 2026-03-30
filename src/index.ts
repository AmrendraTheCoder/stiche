import "dotenv/config";
import { app } from "./api/server";

const PORT = process.env.PORT || 3000;

// Trim any whitespace from API keys (common .env issue)
if (process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY.trim();
}

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  Stiche — Crochet Trend Instagram Agent              ║`);
  console.log(`║  Server running on http://localhost:${PORT}             ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);

  const key = process.env.ANTHROPIC_API_KEY || "";
  if (!key || key === "your_anthropic_key_here") {
    console.warn(
      "WARNING: ANTHROPIC_API_KEY not set. Add it to your .env file.",
    );
  } else {
    console.log(
      `API Key loaded: ${key.slice(0, 10)}...${key.slice(-4)} (${key.length} chars)`,
    );
  }

  if (
    process.env.USE_OPENROUTER === "true" &&
    !process.env.OPENROUTER_API_KEY
  ) {
    console.warn(
      "WARNING: USE_OPENROUTER=true but OPENROUTER_API_KEY not set.",
    );
  }
});
