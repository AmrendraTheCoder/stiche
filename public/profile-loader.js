// public/profile-loader.js
// Reads the permanent business profile from localStorage.
// Adapts the Trend Agent form — prefills fields, injects topic suggestions,
// and generates contextual mini-questions that vary based on the profile.
// Also appends the full profile context to every pipeline call.

(function () {
  "use strict";

  /* ─── Load profile ──────────────────────────────────────────────── */
  var P = {};
  try { P = JSON.parse(localStorage.getItem("stiche_profile") || "{}"); } catch (e) {}

  // Profile is NEVER deleted from localStorage.
  // Users update it by visiting /onboarding again.

  if (!P.shopName) return; // No profile yet — form stays default

  /* ─── Session ID (shared with onboarding) ───────────────────────── */
  var SID = localStorage.getItem("stiche_session_id") || "";

  /* ─── Category → niche mapping ──────────────────────────────────── */
  var NICHE_MAP = {
    "Crochet & Knitting":   "crochet & handmade",
    "Fashion & Clothing":   "fashion & clothing",
    "Jewellery":            "jewellery & accessories",
    "Food & Baking":        "food & baking",
    "Beauty & Skincare":    "beauty & skincare",
    "Art & Prints":         "art & prints",
    "Home Decor":           "home decor handmade",
    "Pottery & Ceramics":   "pottery & ceramics",
    "Candles & Fragrance":  "candles & fragrance",
    "Stationery & Paper":   "stationery & paper",
    "Pet Products":         "pet products handmade",
    "Other Handmade":       "crochet & handmade"
  };

  /* ─── Goal → select value mapping ───────────────────────────────── */
  var GOAL_MAP = {
    "Grow Instagram followers":            "grow followers organically",
    "Drive more direct sales":             "drive DMs for custom orders",
    "Build a recognisable brand":          "build brand awareness",
    "Expand to new cities or markets":     "build brand awareness",
    "Launch new products confidently":     "launch a new product",
    "Understand competitors better":       "get more saves and shares"
  };

  /* ─── Brand voice → hook style mapping ──────────────────────────── */
  var HOOK_MAP = {
    "Warm & friendly":          "relatable",
    "Professional & polished":  "bold claim",
    "Playful & quirky":         "curiosity",
    "Minimal & aesthetic":      "behind the scenes",
    "Inspirational & aspirational": "story"
  };

  /* ─── Topic quick-picks (contextual, based on profile) ──────────── */
  function buildTopicSuggestions() {
    var base = [];
    if (P.flagshipProduct)   base.push(P.flagshipProduct);
    if (P.category) {
      if (P.category.includes("Crochet")) {
        base.push("handcrafted crochet gift set");
        base.push("custom crochet order for festival");
        base.push("trending crochet product idea");
        base.push("gifting hamper with handmade items");
        base.push("crochet behind the scenes process");
      } else if (P.category.includes("Jewellery")) {
        base.push("handmade jewellery for festivals");
        base.push("trending earring design 2025");
        base.push("silver vs oxidised jewellery trend");
      } else if (P.category.includes("Fashion")) {
        base.push("summer collection launch");
        base.push("festival outfit trend India");
        base.push("handmade fashion vs fast fashion");
      } else if (P.category.includes("Food")) {
        base.push("artisan baked goods gifting");
        base.push("custom cake for occasions");
        base.push("healthy snack subscription box");
      } else if (P.category.includes("Beauty")) {
        base.push("organic skincare routine India");
        base.push("natural face pack for summer");
        base.push("handmade soap gifting");
      } else if (P.category.includes("Art")) {
        base.push("custom illustration commission");
        base.push("wall art for home decor");
        base.push("art print festival gifting");
      } else if (P.category.includes("Home Decor") || P.category.includes("Pottery") || P.category.includes("Candles")) {
        base.push("handmade home decor gifting");
        base.push("candle gifting collection");
        base.push("festive home decor trending items");
      }
    }
    // Goal-based suggestions
    if (P.primaryGoal === "Drive more direct sales")
      base.push("limited time offer announcement");
    if (P.primaryGoal === "Grow Instagram followers")
      base.push("viral hook for Instagram Reels");
    if (arrStr(P.buyingReason).includes("Gifting"))
      base.push("gifting solution for upcoming festivals");
    // Remove dups, cap at 6
    var seen = {};
    return base.filter(function (t) {
      if (!t || seen[t]) return false;
      seen[t] = true; return true;
    }).slice(0, 6);
  }

  /* ─── Helper: join arrays or strings ──────────────────────────────── */
  function arrStr(v) {
    if (Array.isArray(v)) return v.join(", ");
    return v || "";
  }

  function esc(s) {
    return String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  /* ─── Contextual mini-questions ──────────────────────────────────── */
  // These vary based on: goal, content weakness, buyer type, market position
  function buildContextFields() {
    var fields = [];

    // Q1: What specifically are you featuring?
    var specificHint = P.flagshipProduct ? "e.g. the " + P.flagshipProduct : "e.g. a new bag design, a seasonal hamper";
    fields.push({
      id: "ctx_specific",
      label: "What specifically is this post about?",
      hint: "The more specific, the better the hooks and hashtags. " + specificHint + ".",
      type: "text",
      placeholder: specificHint
    });

    // Q2: Post type — varies by best performing content
    var postTypeOpts;
    var bpc = arrStr(P.bestPerformingContent);
    if (bpc.includes("Reels")) {
      postTypeOpts = ["Instagram Reel", "Carousel post", "Single image", "Story sequence", "Tutorial video"];
    } else if (bpc.includes("Behind-the-scenes")) {
      postTypeOpts = ["Making process Reel", "Carousel (step-by-step)", "Before & after post", "Story series", "Single product photo"];
    } else {
      postTypeOpts = ["Instagram Reel", "Carousel post", "Single product photo", "Tutorial / Tips post", "Customer story / testimonial"];
    }
    fields.push({
      id: "ctx_postType",
      label: "What format is this post?",
      hint: "The AI will tailor the hook style, script and caption accordingly.",
      type: "chips",
      options: postTypeOpts
    });

    // Q3: Seasonal / urgency context
    var urgencyOpts = ["General (no specific occasion)", "Upcoming festival", "End of season sale", "Product launch", "Limited stock / last few pieces", "Custom order slots opening"];
    if (arrStr(P.buyingReason).includes("Gifting"))
      urgencyOpts = ["Festival gifting season", "Birthday or anniversary", "Wedding gifting", "Baby shower", "Corporate gifting", "General (none)"];
    fields.push({
      id: "ctx_urgency",
      label: "Is there a timing or urgency angle?",
      hint: "Seasonal angles get significantly more reach on Instagram.",
      type: "chips",
      options: urgencyOpts
    });

    // Q4: Target audience for this specific post (may differ from usual)
    var audienceOpts;
    if (P.customerAge && P.customerGender) {
      // Start with their profile, then add alternatives
      audienceOpts = [
        P.customerAge + " " + P.customerGender.toLowerCase(),
        "Mothers buying for family",
        "Working professionals",
        "College students",
        "Gift givers (any age)",
        "Same as usual"
      ].filter(function(o) { return !!o; });
    } else {
      audienceOpts = ["18–24 women", "25–35 women", "Mothers", "Gift buyers", "Working professionals", "All audiences"];
    }
    fields.push({
      id: "ctx_postAudience",
      label: "Who is this specific post targeting?",
      hint: "Can be a narrower slice of your usual audience — e.g. gift buyers, not followers.",
      type: "chips",
      options: audienceOpts.slice(0, 6)
    });

    // Q5: Price / offer context (only if it's a sales post)
    if (P.premiumOrBudget && P.priceMin) {
      fields.push({
        id: "ctx_priceAngle",
        label: "Is there a price or offer angle to include?",
        hint: "If yes, the AI will craft hooks that justify the price or highlight the deal.",
        type: "chips",
        options: [
          "No — just showcasing the product",
          "Highlighting value (" + P.premiumOrBudget + ")",
          "Announcing a discount",
          "Showing price vs competitor",
          "Bundle or combo deal",
          "Free shipping offer"
        ]
      });
    }

    // Q6: Customer objection to address (from onboarding) — now multi-select aware
    var topObj = arrStr(P.topObjection);
    if (topObj) {
      fields.push({
        id: "ctx_objectionAddress",
        label: "Should this post address a common hesitation?",
        hint: 'You told us buyers often hesitate because: "' + topObj + '"',
        type: "chips",
        options: [
          "Yes — address this doubt in the caption",
          "Yes — use a testimonial angle",
          "No — this is a pure showcase post",
          "Maybe — make it subtle"
        ]
      });
    }

    // Q7: Any specific hook or angle idea?
    fields.push({
      id: "ctx_hookIdea",
      label: "Do you have a specific hook idea or theme?",
      hint: "Optional. If you have something in mind, the AI will expand on it. Leave blank to let it generate.",
      type: "text",
      placeholder: "e.g. 'Show how long this takes to make' or 'Why I started this shop'"
    });

    return fields;
  }

  /* ─── Render quick picks ─────────────────────────────────────────── */
  function renderQuickPicks(suggestions) {
    var wrap  = document.getElementById("topicQuickPicks");
    var chips = document.getElementById("topicChips");
    var topic = document.getElementById("topic");
    if (!wrap || !chips || !topic) return;
    chips.innerHTML = "";
    suggestions.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "qp-chip";
      btn.textContent = s;
      btn.onclick = function () {
        topic.value = s;
        chips.querySelectorAll(".qp-chip").forEach(function (c) { c.classList.remove("active"); });
        btn.classList.add("active");
      };
      chips.appendChild(btn);
    });
    wrap.style.display = "block";
  }

  /* ─── Render context mini-fields ─────────────────────────────────── */
  function renderContextFields(fieldDefs) {
    var container = document.getElementById("contextFields");
    var expander  = document.getElementById("contextExpander");
    if (!container || !expander) return;

    container.innerHTML = "";
    var filledCount = 0;

    fieldDefs.forEach(function (def) {
      var wrap = document.createElement("div");
      wrap.className = "field";

      var lbl = document.createElement("label");
      lbl.className = "field-label";
      lbl.setAttribute("for", def.id);
      lbl.textContent = def.label;
      wrap.appendChild(lbl);

      if (def.type === "chips") {
        var chipWrap = document.createElement("div");
        chipWrap.className = "chip-grid";
        chipWrap.id = def.id;
        def.options.forEach(function (opt) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip";
          btn.textContent = opt;
          btn.dataset.key = def.id;
          btn.dataset.val = opt;
          btn.onclick = function () {
            chipWrap.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("selected"); });
            btn.classList.add("selected");
            // Track filled count for badge
            updateContextBadge();
          };
          chipWrap.appendChild(btn);
        });
        wrap.appendChild(chipWrap);
      } else {
        var input = document.createElement("input");
        input.type = "text";
        input.id = def.id;
        input.className = "field-input";
        input.placeholder = def.placeholder || "";
        input.oninput = updateContextBadge;
        wrap.appendChild(input);
      }

      if (def.hint) {
        var hint = document.createElement("div");
        hint.className = "field-hint";
        hint.textContent = def.hint;
        wrap.appendChild(hint);
      }

      container.appendChild(wrap);
    });

    expander.style.display = "block";
  }

  function updateContextBadge() {
    var badge  = document.getElementById("contextBadge");
    var filled = 0;
    document.querySelectorAll("#contextFields .chip.selected").forEach(function () { filled++; });
    document.querySelectorAll("#contextFields .field-input").forEach(function (i) { if (i.value.trim()) filled++; });
    if (badge) badge.textContent = filled > 0 ? filled + " added" : "optional";
  }

  /* ─── Toggle context panel ───────────────────────────────────────── */
  window.toggleContextPanel = function () {
    var panel  = document.getElementById("contextPanel");
    var btn    = document.getElementById("contextToggleBtn");
    if (!panel) return;
    var open = panel.style.display !== "none";
    panel.style.display = open ? "none" : "block";
    if (btn) btn.classList.toggle("open", !open);
  };

  /* ─── Collect context for pipeline ──────────────────────────────── */
  function collectContextData() {
    var ctx = {};
    // Chips
    document.querySelectorAll("#contextFields .chip.selected").forEach(function (c) {
      ctx[c.dataset.key] = c.dataset.val;
    });
    // Text inputs
    document.querySelectorAll("#contextFields .field-input").forEach(function (i) {
      if (i.id && i.value.trim()) ctx[i.id] = i.value.trim();
    });
    return ctx;
  }

  /* ─── Patch the form submit to inject profile + context ─────────── */
  function patchFormSubmit() {
    var form = document.getElementById("agentForm");
    if (!form) return;
    // Intercept form submit — capture context before it fires
    form.addEventListener("submit", function () {
      var ctx = collectContextData();
      // Append context fields to hidden inputs so app.js picks them up
      function setHidden(name, val) {
        var existing = form.querySelector('input[name="' + name + '"]');
        if (!existing) {
          existing = document.createElement("input");
          existing.type = "hidden";
          existing.name = name;
          form.appendChild(existing);
        }
        existing.value = val;
      }

      // Full business profile as JSON string
      setHidden("businessProfile", JSON.stringify(P));

      // Individual context answers
      Object.keys(ctx).forEach(function (k) { setHidden(k, ctx[k]); });

      // Session ID
      if (SID) setHidden("sessionId", SID);
    }, true); // capture phase — runs before app.js handler
  }

  /* ─── Also patch FormData construction in app.js ─────────────────── */
  // We override the submit handler's FormData append by writing hidden inputs
  // which app.js will naturally include via the form element.
  // Then extend the fetch call to pass the profile.
  // We monkey-patch formData.append during the submission.

  var _origAppend = FormData.prototype.append;
  var patchActive = false;

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "agentForm") return;
    patchActive = true;
    // The actual append will happen in app.js fetch building
  }, true);

  // Intercept fetch to add profile to FormData
  var _origFetch = window.fetch;
  window.fetch = function (url, opts) {
    if (typeof url === "string" && url.includes("/api/run-agent") && opts && opts.body instanceof FormData) {
      var fd = opts.body;
      // Inject profile
      try { fd.append("businessProfile", JSON.stringify(P)); } catch (e) {}
      // Inject context
      var ctx = collectContextData();
      Object.keys(ctx).forEach(function (k) {
        try { fd.append(k, ctx[k]); } catch (e) {}
      });
      // Session ID
      if (SID) try { fd.append("sessionId", SID); } catch (e) {}
    }
    return _origFetch.apply(window, arguments);
  };

  /* ─── Populate dashboard banner ──────────────────────────────────── */
  function populateBanner() {
    var banner   = document.getElementById("profileBanner");
    var nameEl   = document.getElementById("profileBannerName");
    var subEl    = document.getElementById("profileBannerSub");
    if (!banner) return;

    if (!P.shopName) return;
    var sub = [P.category, P.city ? P.city + (P.state ? ", " + P.state : "") : null, P.yearsActive ? P.yearsActive + " in business" : null]
              .filter(Boolean).join("   ·   ");
    nameEl.textContent = P.shopName;
    subEl.textContent  = sub;
    banner.style.display = "block";
  }

  /* ─── Prefill form fields based on profile ───────────────────────── */
  function prefillForm() {
    // Pre-select niche
    var nicheSelect = document.getElementById("niche");
    if (nicheSelect && P.category) {
      var nicheVal = NICHE_MAP[P.category];
      if (nicheVal) {
        for (var i = 0; i < nicheSelect.options.length; i++) {
          if (nicheSelect.options[i].value === nicheVal) {
            nicheSelect.selectedIndex = i; break;
          }
        }
      }
    }

    // Pre-select state & city
    var regionSelect = document.getElementById("region");
    var citySelect   = document.getElementById("city");
    if (regionSelect && P.state) {
      for (var j = 0; j < regionSelect.options.length; j++) {
        if (regionSelect.options[j].value === P.state) {
          regionSelect.selectedIndex = j;
          regionSelect.dispatchEvent(new Event("change"));
          break;
        }
      }
      if (citySelect && P.city) {
        setTimeout(function () {
          for (var k = 0; k < citySelect.options.length; k++) {
            if (citySelect.options[k].value === P.city) {
              citySelect.selectedIndex = k; break;
            }
          }
        }, 100);
      }
    }

    // Pre-select goal
    var goalSelect = document.getElementById("goal");
    if (goalSelect && P.primaryGoal) {
      var goalVal = GOAL_MAP[P.primaryGoal];
      if (goalVal) {
        for (var m = 0; m < goalSelect.options.length; m++) {
          if (goalSelect.options[m].value === goalVal) {
            goalSelect.selectedIndex = m; break;
          }
        }
      }
    }

    // Pre-select hook style — handle multi-select brandVoice array
    var hookSelect = document.getElementById("hookStyle");
    if (hookSelect && P.brandVoice) {
      var bv = Array.isArray(P.brandVoice) ? P.brandVoice[0] : P.brandVoice;
      var hookVal = HOOK_MAP[bv];
      if (hookVal) {
        for (var n = 0; n < hookSelect.options.length; n++) {
          if (hookSelect.options[n].value === hookVal) {
            hookSelect.selectedIndex = n; break;
          }
        }
      }
    }

    // Pre-fill instagram handle
    var igEl = document.getElementById("instagramHandle");
    if (igEl && P.instagramHandle && !igEl.value) {
      igEl.value = P.instagramHandle.replace("@", "");
    }
  }

  /* ─── Tagline injection ──────────────────────────────────────────── */
  function personaliseTagline() {
    var el = document.getElementById("shopNameTagline");
    if (!el || !P.shopName) return;
    el.textContent = P.shopName + " — AI Business Suite";
    localStorage.setItem("stiche_shop_name", P.shopName);
  }

  /* ─── Build Business Profile card for dashboard ──────────────────── */
  function buildProfileCard() {
    var container = document.getElementById("profileCard");
    if (!container) return;

    // Completeness score
    var filled = [P.shopName, P.category, P.city, P.yearsActive,
                  P.products, P.flagshipProduct, P.priceMin || P.priceMax, P.premiumOrBudget,
                  P.customerType, arrStr(P.buyingReason), P.repeatRate, arrStr(P.topObjection),
                  P.followerCount, arrStr(P.brandVoice), arrStr(P.bestPerformingContent),
                  P.primaryGoal, P.biggestChallenge, P.targetMonthlyRevenue].filter(Boolean).length;
    var score = Math.min(100, Math.round((filled / 18) * 100));

    // Brand persona description
    var persona = "";
    if (P.shopName && P.category) {
      persona = P.shopName + " is a " + (P.premiumOrBudget || "handmade").toLowerCase() +
        " " + P.category.toLowerCase() + " brand" +
        (P.city ? " based in " + P.city : "") +
        (P.yearsActive ? ", " + P.yearsActive.toLowerCase() + " in operation" : "") + ".";
      if (P.customerAge && P.customerGender)
        persona += " Your core buyer is " + P.customerAge + ", " + P.customerGender.toLowerCase()  + ".";
      if (P.primaryGoal)
        persona += " Current focus: " + P.primaryGoal.toLowerCase() + ".";
    }

    // Key data rows
    var rows = [];
    function add(k, v) { var s = arrStr(v); if (s.trim()) rows.push([k, s.trim()]); }
    add("Category", P.category);
    add("Location", [P.city, P.state].filter(Boolean).join(", "));
    if (P.priceMin || P.priceMax) add("Price", "₹" + (P.priceMin||"—") + " – ₹" + (P.priceMax||"—"));
    add("Market position", P.premiumOrBudget);
    add("Flagship", P.flagshipProduct);
    add("Primary goal", P.primaryGoal);
    add("Revenue target", P.targetMonthlyRevenue);
    add("Brand voice", P.brandVoice);
    add("Followers", P.followerCount);

    container.innerHTML =
      '<div class="pc-header">' +
        '<div class="pc-avatar">' + esc(P.shopName.charAt(0).toUpperCase()) + '</div>' +
        '<div class="pc-info">' +
          '<div class="pc-name">' + esc(P.shopName) + '</div>' +
          '<div class="pc-sub">' + esc(P.category + (P.city ? " · " + P.city : "")) + '</div>' +
        '</div>' +
        '<div class="pc-actions">' +
          '<a href="/onboarding" class="pc-btn pc-btn-outline">Update Profile</a>' +
          '<button onclick="document.getElementById(\"profileCardDetail\").classList.toggle(\"open\")" class="pc-btn pc-btn-solid">View Profile</button>' +
        '</div>' +
      '</div>' +

      (persona ? '<div class="pc-persona">' + esc(persona) + '</div>' : '') +

      '<div class="pc-score-row">' +
        '<span class="pc-score-label">Profile completeness</span>' +
        '<span class="pc-score-pct">' + score + '%</span>' +
      '</div>' +
      '<div class="pc-score-track"><div class="pc-score-fill" style="width:' + score + '%"></div></div>' +

      '<div class="pc-detail" id="profileCardDetail">' +
        '<div class="pc-rows">' +
          rows.map(function(r) {
            return '<div class="pc-row"><span class="pc-rk">' + r[0] + '</span><span class="pc-rv">' + esc(r[1]) + '</span></div>';
          }).join("") +
        '</div>' +
      '</div>';
    container.style.display = 'block';
  }

  /* ─── Daily motivational quote ───────────────────────────────────── */
  function buildDailyQuote() {
    var el = document.getElementById("dailyQuote");
    if (!el) return;

    // Curated quotes grouped by goal / stage — rotated daily
    var pools = {
      sales: [
        "Every sale is a vote of confidence from a real human. Make it count.",
        "Revenue is not vanity — it's the fuel that keeps your craft alive.",
        "Selling is serving. When you show up, someone finds exactly what they needed.",
        "One focused post a day beats a week of procrastination.",
        "Your most loyal customer hasn't found you yet. Post today."
      ],
      growth: [
        "Consistency is the only algorithm that never changes.",
        "Building an audience of 1,000 true fans starts with showing up today.",
        "The creator who posts daily learns what works. The one who waits — guesses.",
        "Small accounts that post with intention outperform big accounts that post from habit.",
        "You don't need to go viral. You need to be findable — every single day."
      ],
      brand: [
        "Your brand is not your logo. It's how people feel after seeing your post.",
        "Handmade is a story. Every post is a chapter. Keep writing.",
        "People don't follow products — they follow people with a point of view.",
        "Trust is built in drops and lost in buckets. Post consistently, reply quickly.",
        "The most powerful marketing is a founder who genuinely cares."
      ],
      early: [
        "Every big shop started with one order. You're closer than you think.",
        "Starting is the hardest post you'll ever make. You've already done that.",
        "The goal today is not perfection — it's one more potential customer who knows you exist.",
        "Revenue follows visibility. Visibility follows showing up.",
        "Doubt is loudest before the first sale. Then it gets quieter every week."
      ]
    };

    // Choose pool based on profile
    var pool;
    var rev = P.currentMonthlyRevenue || "";
    if (rev.includes("starting") || rev.includes("5,000")) {
      pool = pools.early;
    } else if (P.primaryGoal === "Drive more direct sales") {
      pool = pools.sales;
    } else if (P.primaryGoal === "Grow Instagram followers") {
      pool = pools.growth;
    } else if (P.primaryGoal === "Build a recognisable brand") {
      pool = pools.brand;
    } else {
      pool = pools.growth;
    }

    // Rotate daily using day-of-year index
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var quote = pool[dayOfYear % pool.length];

    el.innerHTML =
      '<div class="dq-icon">&#8220;</div>' +
      '<div class="dq-text">' + quote + '</div>' +
      (P.primaryGoal ? '<div class="dq-context">Aligned with your goal: <strong>' + esc(P.primaryGoal) + '</strong></div>' : '');
    el.style.display = 'block';
  }

  /* ─── Inject CSS once ────────────────────────────────────────────── */
  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = [
      /* Profile banner (small, above form) */
      ".profile-banner{margin-bottom:12px;background:linear-gradient(135deg,rgba(108,92,231,0.07),rgba(162,155,254,0.05));border:1px solid rgba(108,92,231,0.2);border-radius:14px;padding:14px 18px;}",
      ".profile-banner-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;}",
      ".profile-banner-name{font-size:15px;font-weight:700;color:var(--text);}",
      ".profile-banner-sub{font-size:12px;color:var(--text-sub);margin-top:2px;}",
      ".profile-banner-link{font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;white-space:nowrap;padding:6px 12px;border:1px solid rgba(108,92,231,0.25);border-radius:8px;background:var(--bg-raised);}",
      ".profile-banner-link:hover{background:rgba(108,92,231,0.06);}",
      /* Quick picks */
      ".quick-picks{margin-top:8px;}",
      ".qp-label{font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px;}",
      ".qp-chips{display:flex;flex-wrap:wrap;gap:6px;}",
      ".qp-chip{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text-sub);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit;}",
      ".qp-chip:hover,.qp-chip.active{border-color:var(--accent);color:var(--accent);background:rgba(108,92,231,0.08);}",
      /* Context expander */
      ".context-expander{margin-top:4px;}",
      ".context-toggle{display:flex;align-items:center;gap:7px;width:100%;padding:11px 14px;background:var(--bg-input);border:1px dashed var(--border);border-radius:10px;color:var(--text-sub);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;text-align:left;}",
      ".context-toggle:hover{border-color:var(--accent);color:var(--accent);background:rgba(108,92,231,0.05);}",
      ".context-toggle.open{border-style:solid;border-color:var(--accent);color:var(--accent);background:rgba(108,92,231,0.05);}",
      ".context-badge{margin-left:auto;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:rgba(108,92,231,0.12);color:var(--accent);}",
      ".context-panel{padding:16px;background:var(--bg-raised);border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;animation:fadeUp .2s ease;}",
      /* chip styles inside context (mirrors onboarding) */
      ".chip-grid{display:flex;flex-wrap:wrap;gap:6px;}",
      ".chip{padding:6px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-input);color:var(--text-sub);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit;}",
      ".chip:hover{border-color:var(--accent);color:var(--accent);background:rgba(108,92,231,0.07);}",
      ".chip.selected{background:rgba(108,92,231,0.1);border-color:var(--accent);color:var(--accent);font-weight:700;}",
      "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",

      /* ── Profile Card ───────────────────────────────── */
      ".profile-card{background:var(--bg-raised);border:1px solid var(--border);border-radius:14px;padding:18px;margin:12px 0;}",
      ".pc-header{display:flex;align-items:center;gap:12px;margin-bottom:14px;}",
      ".pc-avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0;}",
      ".pc-info{flex:1;min-width:0;}",
      ".pc-name{font-size:16px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
      ".pc-sub{font-size:12px;color:var(--text-sub);margin-top:2px;}",
      ".pc-actions{display:flex;gap:7px;flex-shrink:0;}",
      ".pc-btn{padding:7px 13px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;text-decoration:none;border:none;}",
      ".pc-btn-outline{background:transparent;border:1px solid var(--border);color:var(--text-sub);}",
      ".pc-btn-outline:hover{border-color:var(--accent);color:var(--accent);}",
      ".pc-btn-solid{background:var(--accent);color:#fff;box-shadow:0 2px 6px rgba(108,92,231,0.25);}",
      ".pc-btn-solid:hover{box-shadow:0 4px 12px rgba(108,92,231,0.35);}",
      ".pc-persona{font-size:12px;color:var(--text-sub);line-height:1.6;margin-bottom:14px;padding:10px 12px;background:var(--bg-input);border-radius:8px;border-left:3px solid var(--accent);}",
      ".pc-score-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}",
      ".pc-score-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--text-muted);}",
      ".pc-score-pct{font-size:12px;font-weight:700;color:var(--accent);}",
      ".pc-score-track{height:4px;background:var(--bg-input);border-radius:99px;overflow:hidden;margin-bottom:14px;}",
      ".pc-score-fill{height:100%;background:linear-gradient(90deg,var(--accent),#a29bfe);border-radius:99px;transition:width .6s ease;}",
      ".pc-detail{display:none;border-top:1px solid var(--border);padding-top:12px;}",
      ".pc-detail.open{display:block;animation:fadeUp .2s ease;}",
      ".pc-rows{display:flex;flex-direction:column;gap:0;}",
      ".pc-row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);gap:10px;}",
      ".pc-row:last-child{border-bottom:none;}",
      ".pc-rk{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);white-space:nowrap;padding-top:2px;}",
      ".pc-rv{font-size:12px;font-weight:600;color:var(--text);text-align:right;flex:1;max-width:65%;}",

      /* ── Daily Quote ─────────────────────────────────── */
      ".daily-quote-card{background:linear-gradient(135deg,rgba(108,92,231,0.06),rgba(162,155,254,0.04));border:1px solid rgba(108,92,231,0.18);border-radius:14px;padding:16px 18px;margin:0 0 12px;}",
      ".dq-icon{font-size:28px;line-height:1;color:rgba(108,92,231,0.3);margin-bottom:6px;font-family:serif;}",
      ".dq-text{font-size:13px;font-weight:600;color:var(--text);line-height:1.65;margin-bottom:8px;font-style:italic;}",
      ".dq-context{font-size:11px;color:var(--text-muted);}",
      ".dq-context strong{color:var(--accent);}"
    ].join("\n");
    document.head.appendChild(style);
  }

  /* ─── Boot ───────────────────────────────────────────────────────── */
  injectStyles();

  function init() {
    buildProfileCard();
    buildDailyQuote();
    populateBanner();
    personaliseTagline();
    prefillForm();

    var suggestions = buildTopicSuggestions();
    if (suggestions.length) renderQuickPicks(suggestions);

    var contextFieldDefs = buildContextFields();
    renderContextFields(contextFieldDefs);

    patchFormSubmit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

}());
