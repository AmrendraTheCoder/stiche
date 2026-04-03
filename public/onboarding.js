// public/onboarding.js  v3
// Deep branching questions designed to build a rich AI system prompt.
// Each step asks progressively more specific questions that vary based on
// what the user has already told us — so no two profiles will be identical.

(function () {
  "use strict";

  /* ── Session ─────────────────────────────────────────────────── */
  var SID = localStorage.getItem("stiche_session_id") ||
    ("sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  localStorage.setItem("stiche_session_id", SID);

  /* ── Profile object  ─────────────────────────────────────────── */
  // All fields the system prompt generator will use
  var P = {
    sessionId: SID,
    // Step 1
    shopName: "", category: "", city: "", state: "",
    yearsActive: "",
    // Step 2
    products: "", flagshipProduct: "",
    priceMin: 0, priceMax: 0, premiumOrBudget: "",
    customOrReady: "", leadTime: "", materialSource: "",
    // Step 3
    customerAge: "", customerGender: "", customerType: "",
    buyingReason: "", avgOrderValue: "", repeatRate: "",
    topObjection: "",
    // Step 4
    instagramHandle: "", followerCount: "",
    postFrequency: "", bestPerformingContent: "",
    brandVoice: "", contentWeakness: "",
    // Step 5
    primaryGoal: "", biggestChallenge: "", competitorAwareness: "",
    currentMonthlyRevenue: "", targetMonthlyRevenue: "",
  };

  /* ── Step definitions ────────────────────────────────────────── */
  var TOTAL = 6; // steps 0–5 + done
  var step = 0;

  /* ── Static option sets ──────────────────────────────────────── */
  var CATEGORIES = [
    "Crochet & Knitting","Fashion & Clothing","Jewellery","Food & Baking",
    "Beauty & Skincare","Art & Prints","Home Decor","Pottery & Ceramics",
    "Candles & Fragrance","Stationery & Paper","Pet Products","Other Handmade"
  ];
  var YEARS = ["Less than 6 months","6–12 months","1–2 years","3–5 years","Over 5 years"];
  var PREMIUM = ["Budget-friendly (value for money)","Mid-range (quality + price balance)","Premium (craft & quality first)","Luxury (exclusive, high-ticket)"];
  var CUSTOM_READY = ["Fully custom / made to order","Mix of ready-made and custom","Ready-made only — no customisation"];
  var LEAD_TIMES = ["Same day / 1–2 days","3–7 days","1–2 weeks","Over 2 weeks"];
  var MATERIAL = ["Locally sourced","Online marketplaces (Indiamart, Amazon B2B)","Imported materials","Recycled or upcycled materials","Mix of sources"];

  var CUSTOMER_AGE   = ["18–24","25–34","35–44","45+","Broad — all ages"];
  var CUSTOMER_GENDER = ["Predominantly women","Predominantly men","Gender-neutral / all","Couples & families"];
  var BUY_REASON = ["Gifting for others","Treating themselves","Home decoration","Daily-use utility","Resale / dropshipping","Bulk / corporate orders"];
  var AOV = ["Under ₹200","₹200–₹500","₹500–₹1,000","₹1,000–₹3,000","Over ₹3,000"];
  var REPEAT_RATE = ["Almost no repeat customers","Some come back (20–40%)","Good repeat rate (40–60%)","Strong loyalty (60%+)"];
  var OBJECTIONS = ["Price too high","Not sure about quality online","Shipping time or cost","No local presence / trust gap","Competition from bigger brands"];

  var FOLLOWER_RANGES = ["Under 500","500–2,000","2,000–10,000","10,000–50,000","Over 50,000"];
  var POST_FREQ = ["Rarely (once a month or less)","1–2 times a week","3–5 times a week","Every day"];
  var BEST_CONTENT = ["Behind-the-scenes / making process","Finished product showcase","Customer testimonials / UGC","Reels / trending audio","Educational / tips content","Discount announcements"];
  var BRAND_VOICE = ["Warm & friendly","Professional & polished","Playful & quirky","Minimal & aesthetic","Inspirational & aspirational"];
  var CONTENT_WEAKNESS = ["I don't know what to post","My posts don't get engagement","I have no time to create content","My photography / visuals are weak","I can't write captions confidently"];

  var GOALS = ["Grow Instagram followers","Drive more direct sales","Build a recognisable brand","Expand to new cities or markets","Launch new products confidently","Understand competitors better"];
  var CHALLENGES = ["Getting discovered by new customers","Converting followers into buyers","Pricing without underselling myself","Managing orders alongside content","Standing out in a crowded niche","Building trust without a physical store"];
  var REVENUE_NOW = ["Just starting — no revenue yet","Under ₹5,000/month","₹5,000–₹20,000/month","₹20,000–₹60,000/month","₹60,000–₹1,50,000/month","Over ₹1,50,000/month"];
  var REVENUE_TARGET = ["₹10,000/month","₹25,000/month","₹50,000/month","₹1,00,000/month","Over ₹2,00,000/month"];

  /* ── DOM refs ─────────────────────────────────────────────────── */
  var formArea     = document.getElementById("formArea");
  var summaryEl    = document.getElementById("summaryContent");
  var aiCardEl     = document.getElementById("aiCard");
  var aiInsightsEl = document.getElementById("aiInsights");
  var cBarEl       = document.getElementById("cBar");
  var cPctEl       = document.getElementById("cPct");

  /* ── Render engine ───────────────────────────────────────────── */
  function render(s) {
    formArea.innerHTML = "";
    updateSteps(s);
    var fn = [renderWelcome, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderDone][s];
    if (fn) fn();
    updateSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Step 0: Welcome ─────────────────────────────────────────── */
  function renderWelcome() {
    formArea.innerHTML = card(0, "", "",
      "Your AI Business Partner",
      "Stiché builds a detailed intelligence profile of your shop. The AI uses this to generate market research, trend alerts, and content that is specific to your business — not generic advice that anyone could Google.",
      '<div class="welcome-grid">' +
        wFeat("Personalised Research", "The AI searches with your exact niche, city, and price point in mind — not generic crochet or fashion queries.") +
        wFeat("System Prompt Engineering", "Your answers generate a business-grade AI brief that sets the context for every search you run.") +
        wFeat("Adaptive Learning", "As you interact, the AI tracks what you copy, rate, and use — refining itself silently over time.") +
        wFeat("Contextual content", "Hooks, captions, and hashtags will match your brand voice and speak directly to your customer type.") +
      '</div>' +
      navRow("Get Started", false)
    );
  }

  /* ── Step 1: Shop identity ───────────────────────────────────── */
  function renderStep1() {
    formArea.innerHTML = card(1, "Step 1 of 6", "pct25",
      "Your shop identity",
      "This sets the foundation of the AI's understanding of who you are in the market.",
      '<div class="form-stack">' +
        field("Shop Name", 'input', "shopName", "What is your shop called?", "", P.shopName) +
        field("Business Category", 'chips', "category", "", "", CATEGORIES) +
        '<div class="form-row">' +
          field("State", 'input', "state", "e.g. Rajasthan", "", P.state) +
          field("City or Town", 'input', "city", "e.g. Jaipur", "", P.city) +
        '</div>' +
        field("How long has this business been active?", 'chips', "yearsActive", "", "", YEARS) +
      '</div>' +
      navRow("Continue", true)
    );
  }

  /* ── Step 2: Products & Pricing ─────────────────────────────── */
  function renderStep2() {
    // Branch: if premium or luxury, ask about material sourcing (more relevant)
    var isHandcraft = ["Crochet & Knitting","Jewellery","Art & Prints","Pottery & Ceramics","Candles & Fragrance","Stationery & Paper"].indexOf(P.category) > -1;
    var materialQuestion = isHandcraft
      ? field("Where do you source your materials?", 'chips', "materialSource", "", "", MATERIAL)
      : "";

    formArea.innerHTML = card(2, "Step 2 of 6", "pct42",
      "Products & pricing",
      "Understanding what you sell and how you price it lets the AI find the right market benchmarks, competitor pricing, and profit angles for your research.",
      '<div class="form-stack">' +
        field("Describe your products in your own words", 'textarea', "products",
          "e.g. Hand-crocheted bags and home accessories for gifting. Festival specials in October–November.", "", P.products) +
        field("What is your single best-selling or flagship product?", 'input', "flagshipProduct",
          "e.g. Macramé wall hanging, hand-painted silk dupatta…", "", P.flagshipProduct) +
        '<div class="form-row">' +
          field("Lowest price point (₹)", 'number', "priceMin", "e.g. 350", "", P.priceMin || "") +
          field("Highest price point (₹)", 'number', "priceMax", "e.g. 4500", "", P.priceMax || "") +
        '</div>' +
        field("Where does your brand sit in the market?", 'chips', "premiumOrBudget", "", "", PREMIUM) +
        field("Are your products made to order or ready-made?", 'chips', "customOrReady", "", "", CUSTOM_READY) +
        field("Typical production lead time for an order?", 'chips', "leadTime", "", "", LEAD_TIMES) +
        materialQuestion +
      '</div>' +
      navRow("Continue", true)
    );
  }

  /* ── Step 3: Customers ───────────────────────────────────────── */
  function renderStep3() {
    // Branching: if buying reason is 'gifting', add a follow-up hint
    var giftingNote = "";

    formArea.innerHTML = card(3, "Step 3 of 6", "pct58",
      "Your customers",
      "The more specifically you describe your buyer, the more precisely the AI can surface trends, personas, and content angles that match who is actually opening their wallet for you.",
      '<div class="form-stack">' +
        field("What age range are most of your buyers?", 'chips', "customerAge", "", "", CUSTOMER_AGE) +
        field("Who buys from you most?", 'chips', "customerGender", "", "", CUSTOMER_GENDER) +
        field("Describe your ideal customer in a sentence or two", 'textarea', "customerType",
          "e.g. Working women in metros who want unique gifting options — not mass-produced items from Amazon.", "", P.customerType) +
        field("Why do they primarily buy from you?", 'chips', "buyingReason", "", "Select the main reason", BUY_REASON) +
        field("What is the typical order value per transaction?", 'chips', "avgOrderValue", "", "", AOV) +
        field("How often do buyers come back for a second purchase?", 'chips', "repeatRate", "", "", REPEAT_RATE) +
        field("What is the single biggest reason someone hesitates to buy from you?", 'chips', "topObjection", "",
          "Knowing this helps the AI write content that overcomes it proactively.", OBJECTIONS) +
      '</div>' +
      navRow("Continue", true)
    );
  }

  /* ── Step 4: Instagram & Content ────────────────────────────── */
  function renderStep4() {
    // Branch: if under 500 followers, show encouragement insight
    var smallAcctNote = (P.followerCount === "Under 500" || P.followerCount === "500–2,000")
      ? '<div class="field-insight">Small account? The AI will focus on high-reach hashtag strategies and hook writing to maximise organic discovery — which matters most at this stage.</div>'
      : "";

    formArea.innerHTML = card(4, "Step 4 of 6", "pct75",
      "Instagram & content",
      "Your content context shapes the hooks, caption style, and hashtag strategy the AI will recommend. Be honest about where you are now, not where you want to be.",
      '<div class="form-stack">' +
        '<div class="form-row">' +
          field("Instagram handle <span class=\"field-optional\">(optional)</span>", 'input', "instagramHandle", "@yourhandle", "", P.instagramHandle) +
          field("Current follower count", 'select', "followerCount", "", "", FOLLOWER_RANGES) +
        '</div>' +
        smallAcctNote +
        field("How often do you currently post?", 'chips', "postFrequency", "", "", POST_FREQ) +
        field("What type of content performs best for you right now?", 'chips', "bestPerformingContent", "", "Select your top performer", BEST_CONTENT) +
        field("How would you describe your brand's voice & aesthetic?", 'chips', "brandVoice", "", "This sets the tone for all AI-generated captions and hooks.", BRAND_VOICE) +
        field("What is your biggest content challenge?", 'chips', "contentWeakness", "", "The AI will prioritise solving this.", CONTENT_WEAKNESS) +
      '</div>' +
      navRow("Continue", true)
    );
  }

  /* ── Step 5: Goal ────────────────────────────────────────────── */
  function renderStep5() {
    // Branch: show competitor awareness only if they have some traction
    var hasFollowers = ["2,000–10,000","10,000–50,000","Over 50,000"].indexOf(P.followerCount) > -1;
    var compQ = hasFollowers
      ? field("Are you aware of direct competitors on Instagram?", 'textarea', "competitorAwareness",
          "Name 1–3 Instagram accounts or shop names that sell similar things. The AI will use these as reference benchmarks.", "", P.competitorAwareness)
      : field("Are there any shops or brands you admire or want to be like?", 'textarea', "competitorAwareness",
          "Name any accounts — local or global — that inspire you. The AI uses these to understand the market you want to reach.", "", P.competitorAwareness);

    formArea.innerHTML = card(5, "Step 6 of 6", "pct92",
      "Your goal & current business",
      "This is the most important step. Your primary goal becomes the north star of the AI's system prompt — every recommendation will be optimised for this.",
      '<div class="form-stack">' +
        field("What is your primary goal right now?", 'chips', "primaryGoal", "", "Choose the one that matters most", GOALS) +
        field("What is the biggest thing stopping you from reaching it?", 'chips', "biggestChallenge", "", "", CHALLENGES) +
        field("Approximate current monthly revenue from this business", 'chips', "currentMonthlyRevenue", "", "Honest answer helps calibrate advice.", REVENUE_NOW) +
        field("What monthly revenue would make you feel you've succeeded?", 'chips', "targetMonthlyRevenue", "", "This sets the scale of ambition for the AI's recommendations.", REVENUE_TARGET) +
        compQ +
      '</div>' +
      navRow("Save My Profile", true, true)
    );
  }

  /* ── Done ─────────────────────────────────────────────────────── */
  function renderDone() {
    formArea.innerHTML =
      '<div class="onb-card" style="animation:fadeUp .3s ease">' +
        '<div class="onb-progress-strip"><div class="onb-progress-fill" style="width:100%"></div></div>' +
        '<div class="onb-card-body">' +
          '<div class="done-icon">&#10003;</div>' +
          '<div class="done-title">Profile saved</div>' +
          '<div class="done-sub">' +
            'Stiché now has a detailed understanding of your business. Every search, trend report, and content suggestion will be personalised to ' +
            (P.shopName ? '<strong>' + esc(P.shopName) + '</strong>' : 'your shop') + '.' +
          '</div>' +
          '<button class="btn-launch" onclick="window.location.href=\'/dashboard\'">Open the Dashboard</button>' +
        '</div>' +
      '</div>';
    updateSteps(6);
  }

  /* ── HTML builders ──────────────────────────────────────────── */
  function card(s, eyebrow, pctClass, title, sub, content) {
    var pctMap = { pct25: 25, pct42: 42, pct58: 58, pct75: 75, pct92: 92 };
    var pct = pctMap[pctClass] || (s === 0 ? 0 : Math.round((s / 6) * 100));
    return '<div class="onb-card">' +
      '<div class="onb-progress-strip"><div class="onb-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="onb-card-body">' +
        (eyebrow ? '<div class="onb-step-eyebrow">' + eyebrow + '</div>' : '') +
        '<div class="onb-card-title">' + title + '</div>' +
        '<div class="onb-card-sub">' + sub + '</div>' +
        content +
      '</div>' +
    '</div>';
  }

  function wFeat(t, s) {
    return '<div class="welcome-feat"><div class="welcome-feat-title">' + t + '</div><div class="welcome-feat-sub">' + s + '</div></div>';
  }

  function navRow(label, showBack, isSave) {
    var back = showBack ? '<button class="btn-back" onclick="window._back()">Back</button>' : '';
    var fn   = isSave ? "window._save()" : "window._next()";
    return '<div class="onb-nav-row">' + back + '<button class="btn-next" id="primaryBtn" onclick="' + fn + '">' + label + '</button></div>';
  }

  function field(label, type, key, placeholder, hint, opts) {
    // opts: string = placeholder-like extra, array = chips, otherwise ignored
    var id    = "f_" + key;
    var value = P[key];
    var inner = "";

    if (type === 'chips') {
      var options = Array.isArray(opts) ? opts : [];
      inner = '<div class="chip-grid" id="' + id + '">' +
        options.map(function (o) {
          var sel = (value === o) ? ' selected' : '';
          return '<button type="button" class="chip' + sel + '" data-key="' + key + '" data-val="' + esc(o) + '" onclick="window._chip(this)">' + esc(o) + '</button>';
        }).join("") +
      '</div>';
    } else if (type === 'textarea') {
      inner = '<textarea class="field-input" id="' + id + '" placeholder="' + esc(placeholder) + '" oninput="window._set(\'' + key + '\',this.value)">' + esc(value || "") + '</textarea>';
    } else if (type === 'select') {
      var options2 = Array.isArray(opts) ? opts : [];
      inner = '<select class="field-select" id="' + id + '" onchange="window._set(\'' + key + '\',this.value)">' +
        '<option value="">Select…</option>' +
        options2.map(function (o) {
          return '<option value="' + esc(o) + '"' + (value === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join("") +
      '</select>';
    } else if (type === 'number') {
      inner = '<input class="field-input" type="number" id="' + id + '" placeholder="' + esc(placeholder) + '" min="0" value="' + (value || "") + '" oninput="window._setN(\'' + key + '\',this.value)" />';
    } else {
      inner = '<input class="field-input" type="text" id="' + id + '" placeholder="' + esc(placeholder) + '" value="' + esc(value || "") + '" oninput="window._set(\'' + key + '\',this.value)" />';
    }

    var hintHtml = hint ? '<div class="field-hint">' + hint + '</div>' : '';
    return '<div class="field">' +
      '<label class="field-label" for="' + id + '">' + label + '</label>' +
      inner + hintHtml +
    '</div>';
  }

  /* ── Chip click ──────────────────────────────────────────────── */
  window._chip = function (btn) {
    var key  = btn.dataset.key;
    var val  = btn.dataset.val;
    var grid = btn.parentElement;
    grid.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("selected"); });
    btn.classList.add("selected");
    P[key] = val;
    updateSummary();
    // Re-render the step if a branching field changed
    if (key === "followerCount" || key === "category") render(step);
  };

  /* ── Field setters ───────────────────────────────────────────── */
  window._set  = function (k, v) { P[k] = v; updateSummary(); };
  window._setN = function (k, v) { P[k] = parseInt(v, 10) || 0; updateSummary(); };

  /* ── Navigation ──────────────────────────────────────────────── */
  window._next = function () {
    if (!validate()) return;
    step++;
    render(step);
  };
  window._back = function () {
    if (step > 0) { step--; render(step); }
  };
  window._save = async function () {
    if (!validate()) return;
    var btn = document.getElementById("primaryBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    try {
      var res  = await fetch("/api/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(P),
      });
      var json = await res.json();
      if (json.ok) localStorage.setItem("stiche_profile", JSON.stringify(json.data));
    } catch (e) {
      localStorage.setItem("stiche_profile", JSON.stringify(P));
    }
    step = 6;
    render(step);
  };

  /* ── Validation ──────────────────────────────────────────────── */
  function validate() {
    if (step === 1 && !P.shopName.trim())  { alert("Please enter your shop name."); return false; }
    if (step === 1 && !P.category)         { alert("Please select a business category."); return false; }
    if (step === 5 && !P.primaryGoal)      { alert("Please select your primary goal."); return false; }
    return true;
  }

  /* ── Step indicators ─────────────────────────────────────────── */
  function updateSteps(active) {
    for (var i = 0; i <= 5; i++) {
      var el = document.getElementById("si-" + i);
      var cn = document.getElementById("sc-" + i);
      if (!el) continue;
      el.classList.remove("active", "done");
      var dotEl = el.querySelector(".step-dot");
      if (i < active) {
        el.classList.add("done");
        if (dotEl) dotEl.innerHTML = "&#10003;";
        if (cn) cn.classList.add("filled");
      } else if (i === active) {
        el.classList.add("active");
        if (dotEl) dotEl.innerHTML = "<span>" + (i + 1) + "</span>";
      } else {
        if (dotEl) dotEl.innerHTML = "<span>" + (i + 1) + "</span>";
        if (cn) cn.classList.remove("filled");
      }
    }
  }

  /* ── Live summary ─────────────────────────────────────────────── */
  function updateSummary() {
    var rows = [];
    function add(k, v) { if (v && String(v).trim()) rows.push({ k: k, v: String(v).trim() }); }

    add("Shop", P.shopName);
    add("Category", P.category);
    add("Location", [P.city, P.state].filter(Boolean).join(", "));
    add("Trading since", P.yearsActive);
    add("Flagship product", P.flagshipProduct);
    if (P.priceMin || P.priceMax) add("Price range", "₹" + (P.priceMin||"—") + " – ₹" + (P.priceMax||"—"));
    add("Market position", P.premiumOrBudget);
    add("Fulfilment", P.customOrReady);
    add("Buyer type", trunc(P.customerType, 44));
    add("Key buyer age", P.customerAge);
    add("Buying reason", P.buyingReason);
    add("Avg order value", P.avgOrderValue);
    add("Repeat rate", P.repeatRate);
    add("Followers", P.followerCount);
    add("Brand voice", P.brandVoice);
    add("Primary goal", P.primaryGoal);
    add("Revenue target", P.targetMonthlyRevenue);

    if (rows.length === 0) {
      summaryEl.innerHTML = '<div class="summary-empty">' +
        '<div class="summary-empty-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9090aa" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg></div>' +
        'Start filling the form — your profile builds here in real time.</div>';
      aiCardEl.style.display = "none";
      return;
    }

    summaryEl.innerHTML = rows.map(function (r) {
      return '<div class="s-row"><div class="s-key">' + r.k + '</div><div class="s-val">' + esc(r.v) + '</div></div>';
    }).join("");

    // AI insights panel
    aiCardEl.style.display = "block";
    var insights = buildInsights();
    aiInsightsEl.innerHTML = insights.map(function (i) {
      return '<div class="ai-insight-item">' + i + '</div>';
    }).join("");

    // Completeness score
    var filled = [P.shopName, P.category, P.city, P.yearsActive,
                  P.products, P.flagshipProduct, P.priceMin || P.priceMax, P.premiumOrBudget,
                  P.customerType, P.buyingReason, P.repeatRate, P.topObjection,
                  P.followerCount, P.brandVoice, P.bestPerformingContent,
                  P.primaryGoal, P.biggestChallenge, P.targetMonthlyRevenue].filter(Boolean).length;
    var score = Math.min(100, Math.round((filled / 18) * 100));
    cBarEl.style.width = score + "%";
    cPctEl.textContent = score + "%";
  }

  function buildInsights() {
    var out = [];
    if (P.shopName && P.category)
      out.push('Searches will focus on the <strong>' + esc(P.category) + '</strong> segment of the Indian handmade market');
    if (P.city)
      out.push('Trend data filtered for <strong>' + esc(P.city) + (P.state ? ', ' + esc(P.state) : '') + '</strong> — city-level signals, not pan-India averages');
    if (P.priceMin && P.priceMax)
      out.push('Competitor pricing scanned in the <strong>₹' + P.priceMin + ' – ₹' + P.priceMax + '</strong> range');
    if (P.premiumOrBudget)
      out.push('Positioning angle set: <strong>' + esc(P.premiumOrBudget) + '</strong>');
    if (P.customerType || P.customerAge)
      out.push('Content skewed for <strong>' + esc(P.customerAge || "your audience") + '</strong>' + (P.buyingReason ? ' buying for <em>' + esc(P.buyingReason.toLowerCase()) + '</em>' : ''));
    if (P.brandVoice)
      out.push('All captions and hooks will match a <strong>' + esc(P.brandVoice.toLowerCase()) + '</strong> tone');
    if (P.primaryGoal)
      out.push('Every recommendation optimised for: <strong>' + esc(P.primaryGoal) + '</strong>');
    if (P.topObjection)
      out.push('Content will proactively address: <em>' + esc(P.topObjection.toLowerCase()) + '</em>');
    if (out.length === 0) out.push('Fill in more details to see how the AI will personalise your experience');
    return out.slice(0, 5);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function trunc(s, n) { s = s || ""; return s.length > n ? s.slice(0, n) + "…" : s; }
  function esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  window.skipOnboarding = function () {
    localStorage.setItem("stiche_onboarding_skipped", "1");
    window.location.href = "/dashboard";
  };

  /* ── Profile is NEVER auto-deleted — users can re-run onboarding to update ─────── */
  // No auto-redirect. Each time onboarding runs, it updates the saved profile.
  // This ensures the AI always has the latest, most accurate business context.

  /* ── Boot ─────────────────────────────────────────────────────── */
  render(0);

}());
