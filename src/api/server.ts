import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { runAgentPipeline } from "../agent/pipeline";
import { runCalendarPipeline } from "../agent/calendar-pipeline";
import { getOrdersCollection } from "../lib/db";

const app = express();

// ── CORS — only allow your own Vercel domain ─────────────────────────
const ALLOWED_ORIGINS = [
  "https://sticheshop.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error("CORS: origin not allowed"));
  },
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "x-site-key"],
}));

// ── Body size limit — prevent oversized payloads ─────────────────────
app.use(express.json({ limit: "100kb" }));

// ── Auth middleware — requires X-Site-Key header ──────────────────────
// Set SITE_KEY in Vercel env vars (any random string you choose).
// Local dev: if SITE_KEY is not set, auth is skipped entirely.
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const siteKey = process.env.SITE_KEY;
  if (!siteKey) { next(); return; } // dev mode — no key set, skip
  const provided = req.headers["x-site-key"] as string | undefined;
  if (!provided || provided !== siteKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── Input sanitization helper ────────────────────────────────────────
function sanitize(val: unknown, maxLen = 200): string {
  if (typeof val !== "string") return "";
  return val
    .trim()
    .slice(0, maxLen)
    // Strip prompt-injection attempts
    .replace(/ignore (previous|above|all) instructions?/gi, "")
    .replace(/you are now|act as|system prompt/gi, "");
}

// ── In-memory result cache (TTL = 6 hours) ───────────────────────────
// Prevents re-running the full AI pipeline for identical queries.
interface CacheEntry { data: unknown; expiresAt: number; }
const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cacheKey(obj: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}
function getCached(key: string): unknown | null {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { resultCache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: unknown): void {
  // Evict oldest entry if cache is getting large (>50 entries)
  if (resultCache.size >= 50) {
    const oldest = [...resultCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) resultCache.delete(oldest[0]);
  }
  resultCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Rate Limiting ─────────────────────────────────────────────────────
const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many requests. Please wait 15 minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many message requests. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Multer ────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
});

// ── POST /api/run-agent ─────────────────────────────────────────────
app.post(
  "/api/run-agent",
  requireAuth,
  agentLimiter,
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    const rawTopic  = sanitize(req.body.topic, 150);
    const rawNiche  = sanitize(req.body.niche, 100);
    const rawRegion = sanitize(req.body.region, 80);
    const rawCity   = sanitize(req.body.city, 80);
    const rawHook   = sanitize(req.body.hookStyle, 60);
    const rawGoal   = sanitize(req.body.goal, 100);
    const useBusinessContext = req.body.useBusinessContext;

    if (!rawTopic && !useBusinessContext) {
      res.status(400).json({ error: "topic is required unless auto-tuning" }); return;
    }

    // ── Cache check ──────────────────────────────────────────────────
    const ck = cacheKey({ rawTopic, rawNiche, rawRegion, rawCity, rawHook, rawGoal });
    const cached = getCached(ck);
    if (cached) {
      console.log("Cache HIT:", ck);
      res.json({ ok: true, data: cached, cached: true }); return;
    }

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (req.file) {
        imageBase64 = req.file.buffer.toString("base64");
        imageMimeType = req.file.mimetype;
      }

      let businessContext: string | null | undefined;
      if (useBusinessContext === "true" || useBusinessContext === true) {
        businessContext = await buildBusinessContext();
      }

      const result = await runAgentPipeline({
        topic: rawTopic || (businessContext ? "My Shop's Top Selling Items" : "handmade items"),
        niche: rawNiche || "crochet & handmade",
        region: rawRegion || "Pan India",
        city: rawCity || undefined,
        hookStyle: rawHook || "curiosity",
        goal: rawGoal || "grow followers organically",
        imageBase64, imageMimeType,
        businessContext: businessContext || undefined,
      });

      setCache(ck, result);
      res.json({ ok: true, data: result });
    } catch (err: any) {
      console.error("Pipeline error:", err.message);
      res.status(500).json({ error: err.message || "Pipeline failed" });
    }
  },
);

// ── POST /api/run-calendar ─────────────────────────────────────────
app.post(
  "/api/run-calendar",
  requireAuth,
  agentLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const rawProducts  = sanitize(req.body.products, 150);
    const rawAudience  = sanitize(req.body.audience, 150);
    const rawRegion    = sanitize(req.body.region, 80);
    const rawCity      = sanitize(req.body.city, 80);
    const rawVoice     = sanitize(req.body.brandVoice, 100);
    const rawPrice     = sanitize(req.body.priceRange, 60);
    const useBusinessContext = req.body.useBusinessContext;

    if (!rawProducts && !useBusinessContext) {
      res.status(400).json({ error: "products is required unless auto-tuning" }); return;
    }

    // Cache check
    const ck = cacheKey({ rawProducts, rawAudience, rawRegion, rawCity, rawVoice, rawPrice });
    const cached = getCached(ck);
    if (cached) {
      res.json({ ok: true, data: cached, cached: true }); return;
    }

    try {
      let businessContext: string | null | undefined;
      if (useBusinessContext === true) {
        businessContext = await buildBusinessContext();
      }

      const result = await runCalendarPipeline({
        products: rawProducts || (businessContext ? "My Current Best Sellers" : ""),
        audience: rawAudience || "women 20-40 interested in handmade products",
        region: rawRegion || "Pan India",
        city: rawCity || undefined,
        brandVoice: rawVoice || "warm, personal, friendly",
        priceRange: rawPrice || "\u20b9500-\u20b92500",
        businessContext: businessContext || undefined,
      });

      setCache(ck, result);
      res.json({ ok: true, data: result });
    } catch (err: any) {
      console.error("Calendar error:", err.message);
      res.status(500).json({ error: err.message || "Calendar generation failed" });
    }
  },
);

// ── POST /api/generate-message ──────────────────────────────────────
app.post(
  "/api/generate-message",
  requireAuth,
  messageLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const customerName = sanitize(req.body.customerName, 80);
    const item        = sanitize(req.body.item, 100);
    const status      = sanitize(req.body.status, 20);
    const language    = sanitize(req.body.language, 30);
    const recentTrends = req.body.recentTrends;

    if (!customerName || !item || !status) {
      res.status(400).json({ error: "customerName, item, and status are required" });
      return;
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      let upsellInstruction = "";
      if (status === "Delivered" && recentTrends && recentTrends.length > 0) {
        const topTrend = recentTrends[0].trend || recentTrends[0];
        upsellInstruction = `\nCRITICAL UPSELL: Since the status is Delivered, include a very soft, friendly 1-sentence upsell at the end suggesting they might also like "${topTrend}" which is currently trending in our shop.`;
      }

      const statusMessages: Record<string, string> = {
        New: "Order just confirmed — write a warm, excited confirmation",
        Making: "Started crocheting — write a progress update with excitement",
        Packed: "All packed up, ready to ship — write an anticipation builder",
        Shipped: "Dispatched today — write a tracking/shipping notification",
        Delivered: "Customer received it — ask for a review/photo gently",
      };

      const response = await client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Write a short, warm WhatsApp message for a handmade crochet business.
Customer: ${customerName}
Item: ${item}
Status: ${status} — ${statusMessages[status] || "general update"}
Language: ${language || "English"}${upsellInstruction}
Tone: personal, warm, like a friend — NOT corporate
Keep it under 4 lines. Include 1 relevant emoji. Do NOT include any subject line or greeting like "Subject:". Just the message text.`,
        }],
      });

      const msg = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
      res.json({ ok: true, message: msg });
    } catch (err: any) {
      console.error("Message generation error:", err);
      res.status(500).json({ error: err.message || "Message generation failed" });
    }
  },
);

// ── ORDERS DB ───────────────────────────────────────────────────────
// Dual-mode: MongoDB when MONGODB_URI is set (production), JSON file otherwise (local dev).
// On Vercel, /tmp is the only writable directory — data/ would cause EPERM.
const ORDERS_FILE = process.env.VERCEL
  ? "/tmp/stiche-orders.json"
  : path.resolve(process.cwd(), "data/orders.json");

async function readOrders(): Promise<any[]> {
  if (process.env.MONGODB_URI) {
    const col = await getOrdersCollection();
    return (await col.find({}).toArray()).map(({ _id, ...rest }) => rest);
  }
  try {
    const data = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      try {
        await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
        await fs.writeFile(ORDERS_FILE, "[]");
      } catch (_) { /* /tmp may already exist, ignore */ }
    }
    return [];
  }
}

async function writeOrders(orders: any[]): Promise<void> {
  if (!process.env.MONGODB_URI) {
    try {
      await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch (_) { /* ignore write errors on read-only fs */ }
  }
}

async function buildBusinessContext(): Promise<string | null> {
  const orders = await readOrders();
  if (!orders || orders.length === 0) return null;

  const validOrders = orders.filter((o: any) =>
    ["Delivered", "Shipped", "Packed"].includes(o.status)
  );
  const base = validOrders.length > 0 ? validOrders : orders;

  const items: Record<string, number> = {};
  let rev = 0;
  base.forEach((o: any) => {
    if (o.item) { const i = o.item.toLowerCase().trim(); items[i] = (items[i] || 0) + 1; }
    rev += (Number(o.price) || 0);
  });

  const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const avg = Math.round(rev / (base.length || 1));
  return `BUSINESS PROFILE: Top selling items: ${top.join(", ")}. Average unit price: \u20b9${avg}.`;
}

app.get("/api/orders", async (_req: Request, res: Response) => {
  try {
    const orders = await readOrders();
    res.json({ ok: true, data: orders });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/orders", async (req: Request, res: Response) => {
  const order = req.body;
  if (!order.id) { res.status(400).json({ error: "id is required" }); return; }
  try {
    if (process.env.MONGODB_URI) {
      const col = await getOrdersCollection();
      await col.replaceOne(
        { id: order.id },
        { ...order, updatedAt: new Date().toISOString() },
        { upsert: true }
      );
      const orders = (await col.find({}).toArray()).map(({ _id, ...rest }) => rest);
      res.json({ ok: true, data: orders });
    } else {
      const orders = await readOrders();
      const index = orders.findIndex((o: any) => o.id === order.id);
      if (index >= 0) {
        orders[index] = { ...orders[index], ...order, updatedAt: new Date().toISOString() };
      } else {
        orders.push({ ...order, createdAt: order.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      await writeOrders(orders);
      res.json({ ok: true, data: orders });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    if (process.env.MONGODB_URI) {
      const col = await getOrdersCollection();
      await col.deleteOne({ id: req.params.id });
      const orders = (await col.find({}).toArray()).map(({ _id, ...rest }) => rest);
      res.json({ ok: true, data: orders });
    } else {
      const orders = await readOrders();
      const filtered = orders.filter((o: any) => o.id !== req.params.id);
      await writeOrders(filtered);
      res.json({ ok: true, data: filtered });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/waitlist ───────────────────────────────────────────────
app.post("/api/waitlist", async (req: Request, res: Response) => {
  const name  = sanitize(req.body.name, 80);
  const email = sanitize(req.body.email, 120);
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" }); return;
  }
  try {
    if (process.env.MONGODB_URI) {
      const col = (await import("../lib/db")).getOrdersCollection;
      // Use same client for a waitlist collection
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const collection = client.db("stiche").collection("waitlist");
      await collection.updateOne(
        { email },
        { $set: { name, email, joinedAt: new Date().toISOString() } },
        { upsert: true }
      );
      await client.close();
    }
    // Always return success (even if no DB — UX first)
    res.json({ ok: true, message: "You're on the waitlist!" });
  } catch (e: any) {
    // DB error shouldn't block the user
    console.error("Waitlist error:", e.message);
    res.json({ ok: true, message: "You're on the waitlist!" });
  }
});

// ── GET /api/health ─────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "6.0.0",
    environment: process.env.VERCEL ? "vercel" : "local",
    keys: {
      anthropic: hasAnthropic ? "set" : "MISSING - set ANTHROPIC_API_KEY in Vercel dashboard",
      openrouter: hasOpenRouter ? "set" : "not set (optional)",
      mongodb: !!process.env.MONGODB_URI ? "set" : "not set (orders use local file)",
    },
  });
});

export { app };
export default app;
