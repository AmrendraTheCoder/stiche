import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { runAgentPipeline } from "../agent/pipeline";
import { runCalendarPipeline } from "../agent/calendar-pipeline";

const app = express();

app.use(cors());
app.use(express.json());
// Static files are served by Vercel directly from /public — no express.static needed

// ── Rate Limiting ───────────────────────────────────────────────────
const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

// ── Multer ──────────────────────────────────────────────────────────
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
  agentLimiter,
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    const { topic, niche, region, city, hookStyle, goal, useBusinessContext } = req.body;
    if (!topic && !useBusinessContext) { res.status(400).json({ error: "topic is required unless auto-tuning" }); return; }

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (req.file) {
        imageBase64 = req.file.buffer.toString("base64");
        imageMimeType = req.file.mimetype;
      }

      let businessContext;
      if (useBusinessContext === "true" || useBusinessContext === true) {
        businessContext = await buildBusinessContext();
      }

      const result = await runAgentPipeline({
        topic: topic || (businessContext ? "My Shop's Top Selling Items" : "handmade items"), 
        niche: niche || "crochet & handmade",
        region: region || "Pan India", city: city || undefined,
        hookStyle: hookStyle || "curiosity", goal: goal || "grow followers organically",
        imageBase64, imageMimeType,
        businessContext: businessContext || undefined
      });
      res.json({ ok: true, data: result });
    } catch (err: any) {
      console.error("Pipeline error:", err);
      res.status(500).json({ error: err.message || "Pipeline failed" });
    }
  },
);

// ── POST /api/run-calendar ──────────────────────────────────────────
app.post(
  "/api/run-calendar",
  agentLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { products, audience, region, city, brandVoice, priceRange, useBusinessContext } = req.body;
    if (!products && !useBusinessContext) { res.status(400).json({ error: "products is required unless auto-tuning" }); return; }

    try {
      let businessContext;
      if (useBusinessContext === true) {
        businessContext = await buildBusinessContext();
      }

      const result = await runCalendarPipeline({
        products: products || (businessContext ? "My Current Best Sellers" : ""),
        audience: audience || "women 20-40 interested in handmade products",
        region: region || "Pan India",
        city: city || undefined,
        brandVoice: brandVoice || "warm, personal, friendly",
        priceRange: priceRange || "₹500-₹2500",
        businessContext: businessContext || undefined
      });
      res.json({ ok: true, data: result });
    } catch (err: any) {
      console.error("Calendar error:", err);
      res.status(500).json({ error: err.message || "Calendar generation failed" });
    }
  },
);

// ── POST /api/generate-message ──────────────────────────────────────
app.post(
  "/api/generate-message",
  messageLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { customerName, item, status, language, recentTrends } = req.body;
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
const isVercel = process.env.VERCEL === "1";
const ORDERS_FILE = isVercel 
  ? path.resolve("/tmp", "orders.json")
  : path.resolve(process.cwd(), "data/orders.json");

async function readOrders() {
  try {
    const data = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
      await fs.writeFile(ORDERS_FILE, "[]");
      return [];
    }
    return [];
  }
}

async function buildBusinessContext() {
  const orders = await readOrders();
  if (!orders || orders.length === 0) return null;

  const validOrders = orders.filter((o: any) => o.status === "Delivered" || o.status === "Shipped" || o.status === "Packed");
  const base = validOrders.length > 0 ? validOrders : orders;

  const items: Record<string, number> = {};
  let rev = 0;
  base.forEach((o: any) => {
    if (o.item) {
      const i = o.item.toLowerCase().trim();
      items[i] = (items[i] || 0) + 1;
    }
    rev += (Number(o.price) || 0);
  });

  const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const avg = Math.round(rev / (base.length || 1));

  return `BUSINESS PROFILE: Top selling items: ${top.join(", ")}. Average unit price: ₹${avg}.`;
}

async function writeOrders(orders: any[]) {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

app.get("/api/orders", async (_req: Request, res: Response) => {
  const orders = await readOrders();
  res.json({ ok: true, data: orders });
});

app.post("/api/orders", async (req: Request, res: Response) => {
  const orders = await readOrders();
  const order = req.body;
  if (!order.id) { res.status(400).json({ error: "id is required" }); return; }
  const index = orders.findIndex((o: any) => o.id === order.id);
  if (index >= 0) {
    orders[index] = { ...orders[index], ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.push({ ...order, createdAt: order.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  await writeOrders(orders);
  res.json({ ok: true, data: orders });
});

app.delete("/api/orders/:id", async (req: Request, res: Response) => {
  const orders = await readOrders();
  const filtered = orders.filter((o: any) => o.id !== req.params.id);
  await writeOrders(filtered);
  res.json({ ok: true, data: filtered });
});

// ── GET /api/health ─────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "4.0.0",
    environment: process.env.VERCEL ? "vercel" : "local",
    keys: {
      anthropic: hasAnthropic ? "set" : "MISSING - set ANTHROPIC_API_KEY in Vercel dashboard",
      openrouter: hasOpenRouter ? "set" : "not set (optional)",
    },
    endpoints: ["/api/run-agent", "/api/run-calendar", "/api/generate-message", "/api/orders"],
  });
});

export { app };
export default app;
