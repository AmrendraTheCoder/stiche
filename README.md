# Stiché — AI Business Suite for Indian Handmade Sellers

> Stop guessing what to post. Let AI plan your trends, content calendar, orders and ads — built exclusively for India's crochet and handmade sellers.

**Live:** [sticheshop.vercel.app](https://sticheshop.vercel.app)  
**Stack:** Node.js · TypeScript · Express · Anthropic Claude · MongoDB · Vercel Serverless

---

## What Is Stiché?

Stiché is an AI-powered business intelligence platform for Indian handmade sellers — crochet makers, knitters, and craft entrepreneurs who sell on Instagram, WhatsApp, Meesho, and Etsy India.

Instead of spending hours on market research, content planning, and order management, sellers describe their product, pick their city, and get a full business report in under 60 seconds.

---

## Features

### 🔍 AI Trend Agent
- Real-time web research across Indian e-commerce platforms (Etsy India, Meesho, Amazon Handmade)
- City-level demand scores — Mumbai ≠ Jaipur
- 7 data-backed trends with opportunity scores, competitor density, and actionable tips
- Regional traffic analysis with demographic breakdowns

### 📅 Content Calendar
- 7-day weekly post plan generated in one click
- Per-day: hook, caption, format (reel/carousel/single), posting time in IST, hashtag set
- Aligned to brand voice and Indian festivals/seasons

### 💰 Profit Calculator
- Material cost + labor hours + platform fee breakdown
- Competitor pricing across Instagram, Etsy India, Meesho, Amazon Handmade
- Break-even units, monthly revenue potential, pricing strategy
- 8 transparent business formulae with example calculations

### 📣 Ad & Reel Engine
- Facebook/Instagram ad copy with 3 A/B variants
- ROAS calculator with Indian ad benchmarks (CPM ₹80–200, CPC ₹3–12)
- 7-shot fully scripted reel with visuals, text overlays, transitions, and audio suggestions

### 📦 Order Tracker
- New → Making → Packed → Shipped → Delivered status flow
- AI-generated WhatsApp messages for each milestone (1-click copy)
- Dual storage: MongoDB (production) / JSON file (local dev)
- Upsell suggestions on Delivered orders using recent trend data

### 📸 Image Analysis (Vision)
- Instagram Readiness Score (weighted: lighting 30% + composition 30% + colour harmony 20% + clarity 20%)
- Specific improvement tips for each product photo
- Pinterest-inspired content ideas matching the product aesthetic

### 📄 PDF Report Export
- Full 17-section business report exportable as a clean PDF
- Sections: Trends, Buyer Personas, Regional Traffic, Profit Calculator, Ad Copy, Reel Script, Content Strategy, and more

---

## Architecture

```
stiche/
├── api/
│   └── index.ts            # Vercel serverless entry point — exports Express app
├── public/                 # Static frontend (served by Vercel CDN)
│   ├── index.html          # Landing page
│   ├── dashboard.html      # App shell
│   ├── app.js              # Main dashboard logic (tabs, pipeline runner, PDF export)
│   ├── analytics.js        # Trend/traffic/persona rendering
│   ├── calendar.js         # Content calendar UI
│   ├── orders.js           # Order tracker UI
│   ├── settings.js         # Settings panel
│   ├── styles.css          # Dashboard styles
│   └── landing.css         # Landing page styles
├── src/
│   ├── agent/
│   │   ├── pipeline.ts     # Main AI pipeline (6-call architecture)
│   │   ├── calendar-pipeline.ts  # Calendar-specific pipeline
│   │   └── types.ts        # Shared TypeScript types
│   ├── api/
│   │   └── server.ts       # Express app — all API routes
│   ├── lib/
│   │   └── db.ts           # MongoDB singleton client
│   └── index.ts            # Local dev server entry (not used on Vercel)
├── vercel.json             # Vercel config (maxDuration, rewrites)
├── tsconfig.json
└── package.json
```

### Pipeline v3 — 6-Call Parallel Architecture

```
Phase 1:  Call 1A  — Deep web search (5 searches, Haiku)          ~15-20s
Phase 2:  Call 1B  — Market analytics JSON (Haiku, 6k tokens)     ↓ parallel
          Call 1C  — Financial intelligence (Haiku, 3k tokens)     ↓ parallel ~15s
Phase 3:  Call 2A  — Content strategy (Sonnet, 4k tokens)         ↓ parallel
          Call 2B  — Ad & Reel engine (Sonnet, 4k tokens)          ↓ parallel ~20s
Phase 4:  Call 3   — Image vision + Pinterest (Sonnet, conditional)          ~10s
```

**Model routing:**  
- `claude-haiku-4-5-20251001` — research, analytics, structured JSON (3× cheaper)  
- `claude-sonnet-4-6` — creative content, hooks, captions, ad copy (higher quality)

**Total time:** ~45–55s on Vercel Hobby (60s limit)

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/run-agent` | Run the full 6-call AI pipeline |
| `POST` | `/api/run-calendar` | Generate a 7-day content calendar |
| `POST` | `/api/generate-message` | Generate a WhatsApp message for an order status |
| `GET`  | `/api/orders` | Fetch all orders |
| `POST` | `/api/orders` | Create or update an order (upsert by `id`) |
| `DELETE` | `/api/orders/:id` | Delete an order |
| `GET`  | `/api/health` | Health check + API key status |

### POST `/api/run-agent` — Request Body

```json
{
  "topic": "crochet lamp shades",
  "niche": "crochet home decor",
  "region": "Pan India",
  "city": "New Delhi, Delhi NCR",
  "hookStyle": "curiosity",
  "goal": "grow followers organically",
  "useBusinessContext": false,
  "image": "(multipart/form-data — optional product photo)"
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key — all AI calls |
| `MONGODB_URI` | ⚠️ Recommended | MongoDB Atlas connection string — orders persistence |
| `OPENROUTER_API_KEY` | ❌ Optional | Alternative model routing (not active) |
| `PORT` | ❌ Local only | Port for local dev server (default: 3000) |

**Set on Vercel:** Dashboard → Project Settings → Environment Variables → Redeploy

---

## Local Development

### Prerequisites
- Node.js 18+
- `npm`
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional) MongoDB Atlas cluster

### Setup

```bash
# Clone the repo
git clone https://github.com/AmrendraTheCoder/stiche.git
cd stiche

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build   # Compiles TypeScript to dist/
npm start       # Runs compiled dist/index.js
```

---

## Deployment (Vercel)

The project is pre-configured for Vercel serverless deployment.

### Auto-deploy via GitHub (recommended)

1. Push to `master` → Vercel automatically redeploys
2. Set env vars in **Vercel Dashboard → Settings → Environment Variables**

### Manual deploy via CLI

```bash
npx vercel --prod
```

### vercel.json

```json
{
  "version": 2,
  "outputDirectory": "public",
  "rewrites": [
    { "source": "/dashboard", "destination": "/dashboard.html" },
    { "source": "/api/(.*)", "destination": "/api/index" }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 300
    }
  }
}
```

> **Note:** `maxDuration: 300` requires Vercel Pro. On Hobby plan the effective limit is **60 seconds** — the pipeline is optimised to stay within this.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18 (Vercel Serverless) |
| Language | TypeScript |
| Framework | Express 5 |
| AI | Anthropic Claude (`claude-haiku-4-5`, `claude-sonnet-4-6`) |
| Database | MongoDB Atlas (orders), `/tmp` JSON fallback (local) |
| Auth | None (open access) — Clerk planned in v2 |
| Payments | None — Razorpay planned in v2 |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Hosting | Vercel (Hobby) |
| Rate limiting | `express-rate-limit` (15 req / 15 min per IP) |

---

## Roadmap

### ✅ v1 — Current (shipped)
- [x] Full 6-call AI pipeline (trends + analytics + financial + content + ads + vision)
- [x] City-level market intelligence
- [x] Order tracker with WhatsApp message generator
- [x] 7-day content calendar
- [x] Profit calculator with transparent formulae
- [x] Ad copy + ROAS calculator + reel script
- [x] Image analysis + Pinterest suggestions
- [x] PDF report export
- [x] MongoDB persistence for orders
- [x] Vercel serverless deployment
- [x] Rate limiting + trust proxy fix

### 🔄 v2 — In Progress (next branch)
- [ ] **Clerk auth** — Google/email sign-up, user sessions
- [ ] **Razorpay payments** — ₹299/month subscription
- [ ] **Waitlist + freemium model** — Basic features free, analytics behind paywall
- [ ] **Free tier:** Order tracker, basic trend keywords, content calendar (limited)
- [ ] **Pro tier:** Full 6-call pipeline, image analysis, PDF export, profit calculator

### 🔮 v3 — Future
- [ ] Multi-user accounts with isolated data
- [ ] Saved reports history
- [ ] Instagram DM automation hook
- [ ] WhatsApp Business API integration
- [ ] Mobile-optimised PWA

---

## Contributing

This is a private project. For issues or suggestions, open a GitHub Issue.

---

## License

ISC © 2026 Stiché
