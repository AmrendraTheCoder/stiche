// ─── API HEADERS ─────────────────────────────────────────────────────
// Auth is handled server-side via CORS. No site key needed.
function apiHeaders(extra) { return extra || {}; }

// ─── TAB SWITCHING ──────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ─── CITY DATA ──────────────────────────────────────────────────────
var CITIES = {
  "Pan India": [],
  "Delhi NCR": ["New Delhi","Gurgaon","Noida","Faridabad","Ghaziabad"],
  "Maharashtra": ["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Thane"],
  "Karnataka": ["Bangalore","Mysore","Hubli","Mangalore","Belgaum"],
  "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Salem","Tiruchirappalli"],
  "Gujarat": ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar"],
  "Rajasthan": ["Jaipur","Jodhpur","Udaipur","Kota","Ajmer","Bikaner"],
  "West Bengal": ["Kolkata","Howrah","Siliguri","Durgapur","Asansol"],
  "Uttar Pradesh": ["Lucknow","Kanpur","Agra","Varanasi","Noida","Prayagraj"],
  "Telangana": ["Hyderabad","Warangal","Nizamabad","Karimnagar"],
  "Kerala": ["Kochi","Thiruvananthapuram","Kozhikode","Thrissur","Kannur"],
  "Madhya Pradesh": ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain"],
  "Punjab": ["Chandigarh","Ludhiana","Amritsar","Jalandhar","Patiala"],
  "Haryana": ["Gurgaon","Faridabad","Panipat","Ambala","Karnal"],
  "Bihar": ["Patna","Gaya","Bhagalpur","Muzaffarpur","Darbhanga"],
  "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Tirupati","Nellore"],
  "Odisha": ["Bhubaneswar","Cuttack","Rourkela","Berhampur"],
  "Assam": ["Guwahati","Silchar","Dibrugarh","Jorhat"],
  "Jharkhand": ["Ranchi","Jamshedpur","Dhanbad","Bokaro"],
  "Chhattisgarh": ["Raipur","Bhilai","Bilaspur","Korba"],
  "Uttarakhand": ["Dehradun","Haridwar","Rishikesh","Haldwani"],
  "Himachal Pradesh": ["Shimla","Manali","Dharamshala","Solan"],
  "Goa": ["Panaji","Margao","Vasco da Gama","Mapusa"],
  "Jammu & Kashmir": ["Srinagar","Jammu","Anantnag","Baramulla"],
  "Northeast India": ["Guwahati","Imphal","Shillong","Agartala","Aizawl"]
};

// ─── STATE DROPDOWN SETUP ───────────────────────────────────────────
var regionSelect = document.getElementById("region");
var citySelect = document.getElementById("city");

Object.keys(CITIES).forEach(function(state) {
  var opt = document.createElement("option");
  opt.value = state;
  opt.textContent = state;
  regionSelect.appendChild(opt);
});

regionSelect.addEventListener("change", function() {
  var cities = CITIES[this.value] || [];
  citySelect.innerHTML = '<option value="">All Cities</option>';
  cities.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    citySelect.appendChild(opt);
  });
});
regionSelect.dispatchEvent(new Event("change"));

// ─── IMAGE UPLOAD ───────────────────────────────────────────────────
var uploadZone = document.getElementById("uploadZone");
var uploadPreview = document.getElementById("uploadPreview");
var imageInput = document.getElementById("imageInput");
var uploadRemove = document.getElementById("uploadRemove");
var selectedFile = null;

uploadZone.addEventListener("click", function(e) {
  if (e.target === uploadRemove || e.target.closest(".upload-remove")) return;
  imageInput.click();
});
uploadZone.addEventListener("dragover", function(e) { e.preventDefault(); uploadZone.classList.add("dragover"); });
uploadZone.addEventListener("dragleave", function() { uploadZone.classList.remove("dragover"); });
uploadZone.addEventListener("drop", function(e) {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
imageInput.addEventListener("change", function() { if (this.files.length) handleFile(this.files[0]); });
uploadRemove.addEventListener("click", function(e) {
  e.stopPropagation();
  selectedFile = null;
  imageInput.value = "";
  uploadZone.classList.remove("has-image");
  uploadPreview.src = "";
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) return;
  if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
  selectedFile = file;
  var reader = new FileReader();
  reader.onload = function(e) { uploadPreview.src = e.target.result; uploadZone.classList.add("has-image"); };
  reader.readAsDataURL(file);
}

// ─── MAIN FORM LOGIC ───────────────────────────────────────────────
var isRunning = false;
var abortController = null;
var cancelState = 0;
var cancelTimer = null;
var resultData = null;

var submitBtn = document.getElementById("submitBtn");
var cancelBtn = document.getElementById("cancelBtn");
var loadingBox = document.getElementById("loadingBox");
var errorBox = document.getElementById("errorBox");
var errorMessage = document.getElementById("errorMessage");
var resultsDiv = document.getElementById("results");
var stepsList = document.getElementById("stepsList");

function buildSteps(hasImage) {
  var steps = [
    { id: "ls1", text: "Searching web for trends, pricing & market data" },
    { id: "ls2", text: "Building analytics — personas, demand & profit" },
    { id: "ls3", text: "Writing hooks, caption & hashtags" }
  ];
  if (hasImage) steps.push({ id: "ls4", text: "Analyzing image + Pinterest search" });
  stepsList.innerHTML = "";
  steps.forEach(function(s, i) {
    var div = document.createElement("div");
    div.className = "step-item";
    div.id = s.id;
    div.innerHTML = '<span class="step-num">' + (i + 1) + "</span> " + s.text;
    stepsList.appendChild(div);
  });
  return steps.length;
}

function setStep(n, state) {
  var el = document.getElementById("ls" + n);
  if (!el) return;
  el.className = "step-item" + (state ? " " + state : "");
  if (state === "done") el.querySelector(".step-num").textContent = "\u2713";
}

function animateSteps(count) {
  var delays = count === 4 ? [0, 10000, 20000, 30000] : [0, 10000, 22000];
  for (var i = 0; i < count; i++) {
    (function(idx) {
      setTimeout(function() {
        if (!isRunning) return;
        if (idx > 0) setStep(idx, "done");
        setStep(idx + 1, "active");
      }, delays[idx]);
    })(i);
  }
}

// Auto pilot toggle
var trendAutoPilot = document.getElementById("trendAutoPilot");
trendAutoPilot.addEventListener("change", function() {
  var topicField = document.getElementById("topic").parentElement;
  if (this.checked) {
    topicField.classList.add("disabled");
    document.getElementById("topic").removeAttribute("required");
  } else {
    topicField.classList.remove("disabled");
    document.getElementById("topic").setAttribute("required", "required");
  }
});

// Cancel button
cancelBtn.addEventListener("click", function() {
  if (cancelState === 0) {
    cancelState = 1;
    cancelBtn.textContent = "Sure? Tap again";
    cancelBtn.classList.add("confirming");
    cancelTimer = setTimeout(function() { cancelState = 0; cancelBtn.textContent = "Cancel"; cancelBtn.classList.remove("confirming"); }, 3000);
  } else {
    if (cancelTimer) clearTimeout(cancelTimer);
    cancelState = 0;
    if (abortController) abortController.abort();
    cancelBtn.textContent = "Cancelled";
    cancelBtn.classList.remove("confirming");
    setTimeout(function() { cancelBtn.classList.remove("visible"); cancelBtn.textContent = "Cancel"; }, 1500);
  }
});

// Form submit
document.getElementById("agentForm").addEventListener("submit", function(e) {
  e.preventDefault();
  if (isRunning) return;
  isRunning = true;
  abortController = new AbortController();
  cancelState = 0;

  var autoPilot = document.getElementById("trendAutoPilot").checked;

  errorBox.classList.remove("active");
  resultsDiv.classList.remove("active");
  resultsDiv.innerHTML = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Running...";
  cancelBtn.classList.add("visible");
  cancelBtn.textContent = "Cancel";
  cancelBtn.classList.remove("confirming");
  loadingBox.classList.add("active");

  var hasImage = !!selectedFile;
  var stepCount = buildSteps(hasImage);
  animateSteps(stepCount);

  var formData = new FormData();
  formData.append("topic", document.getElementById("topic").value);
  formData.append("niche", document.getElementById("niche").value);
  formData.append("region", document.getElementById("region").value);
  formData.append("city", document.getElementById("city").value);
  formData.append("hookStyle", document.getElementById("hookStyle").value);
  formData.append("goal", document.getElementById("goal").value);
  if (autoPilot) formData.append("useBusinessContext", "true");
  // Pass sessionId for self-learning profile lookup
  var sid = localStorage.getItem("stiche_session_id") || "";
  if (!sid) { sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("stiche_session_id", sid); }
  formData.append("sessionId", sid);
  var igHandle = document.getElementById("instagramHandle").value.trim();
  if (igHandle) formData.append("instagramHandle", igHandle);
  if (selectedFile) formData.append("image", selectedFile);

  document.getElementById("loadingSub").textContent = hasImage ? "This takes 40-90 seconds (image analysis adds time)" : "This takes 30-60 seconds";

  fetch("/api/run-agent", { method: "POST", body: formData, headers: apiHeaders(), signal: abortController.signal })
    .then(function(res) {
      var status = res.status;
      return res.text().then(function(text) {
        // Safely attempt JSON parse — Vercel 504/502 returns HTML, not JSON
        var json;
        try { json = JSON.parse(text); } catch(e) {
          // Non-JSON response = gateway error
          if (status === 504 || status === 502 || status === 503) {
            throw new Error("The analysis took too long and the server timed out. Try a shorter description or try again in a moment.");
          }
          if (status === 500) {
            throw new Error("Server error — check that your API key is set correctly in Vercel environment variables.");
          }
          throw new Error("Server returned an unexpected response (status " + status + "). Please try again.");
        }
        if (!res.ok || json.error) throw new Error(json.error || "Pipeline failed (status " + status + ")");
        return json;
      });
    })
    .then(function(json) {
      resultData = json.data;
      for (var i = 1; i <= stepCount; i++) setStep(i, "done");
      // Generate a client-side searchId for feedback tracking
      var searchId = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      setTimeout(function() {
        loadingBox.classList.remove("active");
        renderResults(resultData);
        if (window.initFeedbackTracker) window.initFeedbackTracker(searchId);
      }, 300);
    })
    .catch(function(err) {
      loadingBox.classList.remove("active");
      if (err.name !== "AbortError") { errorBox.classList.add("active"); errorMessage.textContent = err.message || "Something went wrong. Please try again."; }
    })
    .finally(function() {
      isRunning = false;
      abortController = null;
      submitBtn.disabled = false;
      submitBtn.textContent = "Run Agent Pipeline";
      cancelBtn.classList.remove("visible", "confirming");
      cancelBtn.textContent = "Cancel";
      cancelState = 0;
    });
});

// ─── RENDER RESULTS ─────────────────────────────────────────────────
function renderResults(d) {
  var html = '';

  // Export bar
  html += '<div class="result-block export-bar"><button class="btn-export" id="exportPdfBtn" onclick="exportPDF()">Export PDF Report</button></div>';

  // Instagram Profile
  if (d.instagramProfile) {
    html += '<div class="result-block"><div class="trend-header"><h2>Your Instagram Profile</h2><span>@' + esc(d.instagramProfile.handle).replace('@', '') + '</span></div>';
    html += '<div class="score-grid">';
    html += '<div class="score-card"><div class="score-label">Followers (approx)</div><div class="score-val">' + esc(d.instagramProfile.followerCountStr) + '</div></div>';
    html += '<div class="score-card"><div class="score-label">Engagement Rate</div><div class="score-val">' + esc(d.instagramProfile.engagementRateStr) + '</div></div>';
    html += '</div>';
    html += '<div class="insight" style="margin-top:16px"><div class="insight-label">Recent Activity</div><div class="insight-text">' + esc(d.instagramProfile.recentActivitySummary) + '</div></div>';
    html += '<div class="strategy-grid" style="margin-top:12px"><div class="strat-card"><div class="strat-label">Best Performing Styles</div><div class="strat-val">' + esc(d.instagramProfile.bestPerformingStyles) + '</div></div><div class="strat-card"><div class="strat-label">Growth Trend</div><div class="strat-val highlight">' + esc(d.instagramProfile.growthTrend) + '</div></div></div>';
    html += '</div>';
  }

  // Trends — Enhanced with opportunity scores, search volume, action tips
  if (d.trends && d.trends.length) {
    try { localStorage.setItem("stiche_recent_trends", JSON.stringify(d.trends)); } catch(e){}
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Live Trends (' + d.trends.length + ')</h2></div><div class="trend-list">';
    d.trends.forEach(function(t) {
      html += '<div class="trend-card">';
      html += '<div class="trend-name">' + esc(t.trend);
      if (t.opportunityScore) html += ' <span class="opportunity-score" title="Opportunity Score">' + t.opportunityScore + '/100</span>';
      html += '</div>';
      html += '<div class="trend-meta"><span class="momentum ' + t.momentum + '">' + t.momentum + '</span><span class="trend-region">' + esc(t.region) + '</span></div>';
      html += '<div class="trend-why">' + esc(t.why) + '</div>';
      // New enhanced fields
      if (t.searchVolume || t.competitorCount) {
        html += '<div class="trend-details">';
        if (t.searchVolume) html += '<span class="trend-detail-item">📊 ' + esc(t.searchVolume) + '</span>';
        if (t.competitorCount) html += '<span class="trend-detail-item">👥 ' + esc(t.competitorCount) + '</span>';
        html += '</div>';
      }
      if (t.actionTip) {
        html += '<div class="trend-action-tip">💡 ' + esc(t.actionTip) + '</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  }

  // Traffic — Enhanced with demographics, conversion, seasonal notes
  if (d.traffic && d.traffic.length) {
    var dirL = { up: "Growing", stable: "Stable", down: "Declining" };
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Audience Traffic (' + d.traffic.length + ' regions)</h2></div><div class="card"><div class="traffic-items">';
    d.traffic.forEach(function(t) {
      var dir = t.trend || "stable";
      html += '<div><div class="traffic-top"><span class="traffic-label">' + esc(t.region) + ' <span class="traffic-dir ' + dir + '">' + (dirL[dir] || dir) + '</span></span><span class="traffic-score">' + t.score + '/100</span></div><div class="bar-track"><div class="bar-fill" data-w="' + t.score + '"></div></div><div class="traffic-note">' + esc(t.insight) + '</div>';
      // New enhanced fields
      if (t.demographicBreakdown || t.conversionPotential || t.seasonalNote) {
        html += '<div class="traffic-enhanced">';
        if (t.demographicBreakdown) html += '<div class="traffic-detail"><span class="detail-icon">👤</span> ' + esc(t.demographicBreakdown) + '</div>';
        if (t.conversionPotential) html += '<div class="traffic-detail"><span class="detail-icon">🎯</span> ' + esc(t.conversionPotential) + '</div>';
        if (t.seasonalNote) html += '<div class="traffic-detail"><span class="detail-icon">📅</span> ' + esc(t.seasonalNote) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div></div></div>';
  }

  // City Market
  if (d.cityMarket) {
    var cm = d.cityMarket;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">City Market Intelligence</h2></div><div class="city-grid">';
    html += '<div class="city-card"><div class="city-label">Population</div><div class="city-value">' + esc(cm.population) + '</div></div>';
    html += '<div class="city-card"><div class="city-label">Avg Income</div><div class="city-value">' + esc(cm.avgIncome) + '</div></div>';
    html += '<div class="city-card"><div class="city-label">Craft Market</div><div class="city-value">' + esc(cm.craftMarketSize) + '</div></div>';
    html += '<div class="city-card"><div class="city-label">Online Penetration</div><div class="city-value">' + esc(cm.onlinePenetration) + '</div></div>';
    html += '<div class="city-card"><div class="city-label">Competition</div><div class="city-value">' + esc(cm.competitorDensity) + '</div></div>';
    if (cm.topPlatforms && cm.topPlatforms.length) {
      html += '<div class="city-card"><div class="city-label">Top Platforms</div><div class="city-tags">';
      cm.topPlatforms.forEach(function(p) { html += '<span class="city-tag">' + esc(p) + '</span>'; });
      html += '</div></div>';
    }
    if (cm.festivalCalendar && cm.festivalCalendar.length) {
      html += '<div class="city-card wide"><div class="city-label">Festival Calendar</div><div class="city-tags">';
      cm.festivalCalendar.forEach(function(f) { html += '<span class="city-tag">' + esc(f) + '</span>'; });
      html += '</div></div>';
    }
    html += '</div></div>';
  }

  // Customer Personas — Enhanced with social media behavior, triggers, platforms
  if (d.customers && d.customers.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Customer Personas (' + d.customers.length + ')</h2></div><div class="persona-list">';
    d.customers.forEach(function(c) {
      var intent = c.buyingIntent || "medium";
      html += '<div class="persona-card">';
      html += '<div class="persona-header"><div><div class="persona-name">' + esc(c.name) + '</div><div class="persona-age">' + esc(c.age) + '</div></div><span class="intent-badge ' + intent + '">' + intent + ' intent</span></div>';
      html += '<div class="persona-location">' + esc(c.location) + '</div>';
      html += '<div class="persona-behavior">' + esc(c.behavior) + '</div>';
      // New enhanced fields
      if (c.socialMediaBehavior) {
        html += '<div class="persona-detail"><span class="detail-label">📱 Social Media:</span> ' + esc(c.socialMediaBehavior) + '</div>';
      }
      if (c.priceRange) {
        html += '<div class="persona-detail"><span class="detail-label">💰 Budget:</span> ' + esc(c.priceRange) + '</div>';
      }
      if (c.purchaseTriggers && c.purchaseTriggers.length) {
        html += '<div class="persona-triggers"><span class="detail-label">🎯 Triggers:</span> ';
        c.purchaseTriggers.forEach(function(tr) { html += '<span class="trigger-tag">' + esc(tr) + '</span>'; });
        html += '</div>';
      }
      if (c.preferredPlatforms && c.preferredPlatforms.length) {
        html += '<div class="persona-platforms"><span class="detail-label">🛒 Buys on:</span> ';
        c.preferredPlatforms.forEach(function(pl) { html += '<span class="platform-tag">' + esc(pl) + '</span>'; });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  }

  // Purchase Demand — Enhanced with price range, seasonal peak, competition
  if (d.purchases && d.purchases.length) {
    var dirS = { up: "Up", stable: "Stable", down: "Down" };
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Purchase Demand (' + d.purchases.length + ' categories)</h2></div><div class="card"><div class="chart-container">';
    d.purchases.forEach(function(p) {
      var dir = p.trend || "stable";
      html += '<div class="chart-bar-row"><div class="chart-label">' + esc(p.category) + ' <span class="chart-trend-tag ' + dir + '">' + (dirS[dir] || dir) + '</span></div><div class="chart-bar-wrapper"><div class="chart-bar-track"><div class="chart-bar-fill ' + dir + '" data-w="' + p.score + '">' + p.score + '</div></div><div class="chart-insight">' + esc(p.insight) + '</div>';
      // New enhanced fields
      if (p.avgPriceRange || p.seasonalPeak || p.competitionLevel) {
        html += '<div class="purchase-enhanced">';
        if (p.avgPriceRange) html += '<span class="purchase-meta">₹ ' + esc(p.avgPriceRange) + '</span>';
        if (p.seasonalPeak) html += '<span class="purchase-meta">📅 ' + esc(p.seasonalPeak) + '</span>';
        if (p.competitionLevel) html += '<span class="purchase-meta">⚔️ ' + esc(p.competitionLevel) + '</span>';
        html += '</div>';
      }
      html += '</div></div>';
    });
    html += '</div></div></div>';
  }

  // Strategy — Enhanced with content pillars, posting frequency, growth tips, engagement tactics
  if (d.strategy) {
    var s = d.strategy;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Content Strategy Blueprint</h2></div><div class="strategy-grid">';
    html += '<div class="strat-card"><div class="strat-label">Best Time</div><div class="strat-value">' + esc(s.bestTime) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Best Day</div><div class="strat-value">' + esc(s.bestDay) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Format</div><div class="strat-value">' + esc(s.format) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Content Angle</div><div class="strat-value">' + esc(s.contentAngle) + '</div></div>';
    html += '<div class="strat-card strat-wide"><div class="strat-label">CTA Suggestion</div><div class="strat-value">' + esc(s.ctaSuggestion) + '</div></div>';
    html += '<div class="strat-card strat-wide"><div class="strat-label">Competitor Gap</div><div class="strat-value strat-highlight">' + esc(s.competitorGap) + '</div></div>';
    html += '</div>';
    // New: Posting Frequency
    if (s.postingFrequency) {
      html += '<div class="strat-extra"><div class="strat-label">📆 Posting Schedule</div><div class="strat-value">' + esc(s.postingFrequency) + '</div></div>';
    }
    // New: Content Pillars
    if (s.contentPillars && s.contentPillars.length) {
      html += '<div class="strat-section"><div class="section-label">Content Pillars</div><div class="pillars-list">';
      s.contentPillars.forEach(function(p, i) { html += '<div class="pillar-item"><span class="pillar-num">' + (i + 1) + '</span>' + esc(p) + '</div>'; });
      html += '</div></div>';
    }
    // New: Audience Growth Tips
    if (s.audienceGrowthTips && s.audienceGrowthTips.length) {
      html += '<div class="strat-section"><div class="section-label">🚀 Growth Tips</div><div class="tips-list">';
      s.audienceGrowthTips.forEach(function(tip) { html += '<div class="growth-tip-item">✦ ' + esc(tip) + '</div>'; });
      html += '</div></div>';
    }
    // New: Engagement Tactics
    if (s.engagementTactics && s.engagementTactics.length) {
      html += '<div class="strat-section"><div class="section-label">💬 Engagement Tactics</div><div class="tactics-list">';
      s.engagementTactics.forEach(function(tac) { html += '<div class="tactic-item">→ ' + esc(tac) + '</div>'; });
      html += '</div></div>';
    }
    html += '</div>';
  }

  // Image Analysis — Enhanced with mood, filters, posting context
  if (d.imageAnalysis) {
    var ia = d.imageAnalysis;
    var readinessLabel = ia.instagramReadiness >= 90 ? "Post-ready" : ia.instagramReadiness >= 70 ? "Good — minor tweaks" : ia.instagramReadiness >= 50 ? "Needs improvement" : "Re-shoot recommended";
    var readinessColor = ia.instagramReadiness >= 70 ? "var(--steady)" : ia.instagramReadiness >= 50 ? "var(--rising)" : "var(--hot)";

    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Image Analysis</h2></div>';
    html += '<div class="overall-score"><div class="overall-num" style="color:' + readinessColor + '">' + ia.instagramReadiness + '<span style="font-size:16px;opacity:0.6">/100</span></div><div class="overall-label">Instagram Readiness Score</div><div class="overall-badge" style="background:' + readinessColor + ';color:#fff">' + readinessLabel + '</div></div>';
    html += '<div class="score-grid">';
    var scores = [
      { label: "Lighting", val: ia.lightingScore },
      { label: "Composition", val: ia.compositionScore },
      { label: "Color", val: ia.colorHarmonyScore },
      { label: "Clarity", val: ia.productClarityScore }
    ];
    scores.forEach(function(sc) { html += renderScoreRing(sc.label, sc.val); });
    html += '</div>';
    // New: Mood & Filters
    if (ia.moodKeywords && ia.moodKeywords.length) {
      html += '<div class="image-detail-row"><span class="detail-label">🎨 Mood:</span> ';
      ia.moodKeywords.forEach(function(k) { html += '<span class="mood-tag">' + esc(k) + '</span>'; });
      html += '</div>';
    }
    if (ia.suggestedFilters && ia.suggestedFilters.length) {
      html += '<div class="image-detail-row"><span class="detail-label">✨ Filters:</span> ';
      ia.suggestedFilters.forEach(function(f) { html += '<span class="filter-tag">' + esc(f) + '</span>'; });
      html += '</div>';
    }
    if (ia.bestPostingContext) {
      html += '<div class="image-detail-row"><span class="detail-label">📸 Best Use:</span> ' + esc(ia.bestPostingContext) + '</div>';
    }
    if (ia.improvements && ia.improvements.length) {
      html += '<div class="improvements-list">';
      ia.improvements.forEach(function(tip) { html += '<div class="improvement-item"><span class="improvement-icon">*</span>' + esc(tip) + '</div>'; });
      html += '</div>';
    }
    html += '</div>';
  }

  // Pinterest Suggestions
  if (d.pinterestSuggestions && d.pinterestSuggestions.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Pinterest-Inspired Ideas (' + d.pinterestSuggestions.length + ')</h2></div><div class="pinterest-list">';
    d.pinterestSuggestions.forEach(function(p) {
      html += '<div class="pinterest-card"><div class="pin-idea">' + esc(p.idea) + '</div><div class="pin-why">' + esc(p.whyItWorks) + '</div><div class="pin-meta">';
      if (p.searchTerms) p.searchTerms.forEach(function(t) { html += '<span class="pin-term">' + esc(t) + '</span>'; });
      html += '<span class="engagement-badge ' + (p.estimatedEngagement || "medium") + '">' + (p.estimatedEngagement || "medium") + '</span></div></div>';
    });
    html += '</div></div>';
  }

  // Profit Calculator — Enhanced with competitor pricing, seasonal factors, scaling tips, pricing strategy
  if (d.profit) {
    var pr = d.profit;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Profit & Financial Intelligence</h2></div>';
    html += '<div class="profit-summary">';
    html += '<div class="profit-card"><div class="profit-label">Selling Price</div><div class="profit-val">₹' + pr.estimatedSellingPrice.min + '–' + pr.estimatedSellingPrice.max + '</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Material Cost</div><div class="profit-val">₹' + pr.materialCost.min + '–' + pr.materialCost.max + '</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Labor Hours</div><div class="profit-val">' + pr.laborHours.min + '–' + pr.laborHours.max + 'h</div><div class="profit-range">@ ₹' + pr.laborCostPerHour + '/hr</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Shipping</div><div class="profit-val">₹' + pr.shippingEstimate + '</div></div>';
    if (pr.packagingCost) html += '<div class="profit-card"><div class="profit-label">Packaging</div><div class="profit-val">₹' + pr.packagingCost + '</div></div>';
    if (pr.photographyCost != null) html += '<div class="profit-card"><div class="profit-label">Photography</div><div class="profit-val">₹' + pr.photographyCost + '</div></div>';
    html += '<div class="profit-card highlight"><div class="profit-label">Profit Margin</div><div class="profit-val green">' + pr.profitMargin.min + '–' + pr.profitMargin.max + '%</div></div>';
    html += '<div class="profit-card highlight"><div class="profit-label">Monthly Potential</div><div class="profit-val green">₹' + formatNum(pr.monthlyPotential.profit) + '</div><div class="profit-range">' + pr.monthlyPotential.units + ' units · ₹' + formatNum(pr.monthlyPotential.revenue) + ' rev</div></div>';
    html += '</div>';

    // New: Pricing Strategy
    if (pr.pricingStrategy) {
      html += '<div class="pricing-strategy"><div class="section-label">💡 Pricing Strategy</div><div class="strategy-text">' + esc(pr.pricingStrategy) + '</div></div>';
    }

    // New: Competitor Pricing
    if (pr.competitorPricing && pr.competitorPricing.length) {
      html += '<div class="competitor-pricing"><div class="section-label">⚔️ Competitor Pricing</div><div class="competitor-grid">';
      pr.competitorPricing.forEach(function(cp) {
        html += '<div class="competitor-card"><div class="comp-platform">' + esc(cp.platform) + '</div>';
        html += '<div class="comp-price">' + esc(cp.priceRange) + '</div>';
        if (cp.sellerCount) html += '<div class="comp-meta">' + esc(cp.sellerCount) + ' sellers</div>';
        if (cp.avgRating) html += '<div class="comp-meta">⭐ ' + esc(cp.avgRating) + '</div>';
        if (cp.deliveryTime) html += '<div class="comp-meta">📦 ' + esc(cp.deliveryTime) + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    if (pr.platformFees && pr.platformFees.length) {
      html += '<div class="platform-fees">';
      pr.platformFees.forEach(function(f) {
        html += '<div class="fee-row"><span class="fee-name">' + esc(f.platform) + '</span><span class="fee-pct">' + f.percentage + '%</span></div>';
      });
      html += '</div>';
    }

    // New: Seasonal Factors
    if (pr.seasonalFactors && pr.seasonalFactors.length) {
      html += '<div class="strat-section"><div class="section-label">📅 Seasonal Pricing Factors</div><div class="seasonal-list">';
      pr.seasonalFactors.forEach(function(sf) { html += '<div class="seasonal-item">📌 ' + esc(sf) + '</div>'; });
      html += '</div></div>';
    }

    // New: Scaling Tips
    if (pr.scalingTips && pr.scalingTips.length) {
      html += '<div class="strat-section"><div class="section-label">📈 Scaling Tips</div><div class="scaling-list">';
      pr.scalingTips.forEach(function(st) { html += '<div class="scaling-item">✦ ' + esc(st) + '</div>'; });
      html += '</div></div>';
    }

    if (pr.formulae && pr.formulae.length) {
      html += '<button class="formulas-toggle" onclick="toggleFormulas()">Show All Formulas & Logic (' + pr.formulae.length + ')</button>';
      html += '<div class="formulas-content" id="formulasContent">';
      pr.formulae.forEach(function(f) {
        html += '<div class="formula-card"><div class="formula-name">' + esc(f.name) + '</div><div class="formula-expr">' + esc(f.formula) + '</div><div class="formula-explain">' + esc(f.explanation) + '</div><div class="formula-example">Example: ' + esc(f.example) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Ad Copy
  if (d.adCopy) {
    var ac = d.adCopy;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Instagram Ad Copy</h2></div>';
    html += '<div class="ad-preview"><div class="ad-headline">' + esc(ac.headline) + '</div><div class="ad-primary">' + esc(ac.primaryText) + '</div><div class="ad-desc">' + esc(ac.description) + '</div><div class="ad-cta">' + esc(ac.ctaButton) + '</div></div>';
    html += '<div class="ad-meta-grid"><div class="ad-meta-card"><div class="ad-meta-label">Target Audience</div><div class="ad-meta-val">' + esc(ac.targetAudience) + '</div></div><div class="ad-meta-card"><div class="ad-meta-label">Ad Objective</div><div class="ad-meta-val">' + esc(ac.adObjective) + '</div></div></div>';
    if (ac.variants && ac.variants.length) {
      html += '<div class="section-label" style="margin-top:12px">A/B Test Variants (' + ac.variants.length + ')</div>';
      ac.variants.forEach(function(v, i) {
        html += '<div class="variant-card"><div class="variant-label">Variant ' + String.fromCharCode(65 + i) + '</div><div class="variant-headline">' + esc(v.headline) + '</div><div class="variant-text">' + esc(v.primaryText) + '</div></div>';
      });
    }
    html += '</div>';
  }

  // ROAS Calculator — Enhanced with weekly projection and scaling
  if (d.roas) {
    var ro = d.roas;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Ad Budget & ROAS Calculator</h2></div>';
    html += '<div class="roas-grid">';
    html += '<div class="roas-card"><div class="profit-label">Daily Budget</div><div class="roas-val">₹' + ro.dailyBudget + '</div></div>';
    html += '<div class="roas-card"><div class="profit-label">Monthly Spend</div><div class="roas-val">₹' + formatNum(ro.monthlyAdSpend) + '</div></div>';
    html += '<div class="roas-card"><div class="profit-label">Est. Reach</div><div class="roas-val">' + formatNum(ro.estimatedReach.min) + '–' + formatNum(ro.estimatedReach.max) + '</div><div class="roas-range">per day</div></div>';
    html += '<div class="roas-card"><div class="profit-label">Est. Clicks</div><div class="roas-val">' + ro.estimatedClicks.min + '–' + ro.estimatedClicks.max + '</div><div class="roas-range">per day</div></div>';
    html += '<div class="roas-card"><div class="profit-label">Cost Per Click</div><div class="roas-val">₹' + ro.costPerClick.min + '–' + ro.costPerClick.max + '</div></div>';
    html += '<div class="roas-card"><div class="profit-label">Cost Per Conversion</div><div class="roas-val">₹' + ro.costPerConversion + '</div></div>';
    html += '<div class="roas-card highlight"><div class="profit-label">Projected ROAS</div><div class="roas-val green">' + ro.projectedROAS + 'x</div></div>';
    html += '<div class="roas-card highlight"><div class="profit-label">Monthly Ad Revenue</div><div class="roas-val green">₹' + formatNum(ro.monthlyAdRevenue) + '</div></div>';
    html += '</div>';
    // New: Weekly Projection
    if (ro.weeklyProjection) {
      html += '<div class="weekly-projection"><div class="section-label">📊 Weekly Projection</div><div class="weekly-grid">';
      html += '<div class="weekly-card"><div class="profit-label">Weekly Spend</div><div class="roas-val">₹' + formatNum(ro.weeklyProjection.spend) + '</div></div>';
      html += '<div class="weekly-card"><div class="profit-label">Weekly Revenue</div><div class="roas-val">₹' + formatNum(ro.weeklyProjection.revenue) + '</div></div>';
      html += '<div class="weekly-card highlight"><div class="profit-label">Weekly Profit</div><div class="roas-val green">₹' + formatNum(ro.weeklyProjection.profit) + '</div></div>';
      html += '</div></div>';
    }
    // New: Scaling Recommendation
    if (ro.scalingRecommendation) {
      html += '<div class="scaling-rec"><div class="section-label">🚀 Scaling Strategy</div><div class="strategy-text">' + esc(ro.scalingRecommendation) + '</div></div>';
    }
    if (ro.formulae && ro.formulae.length) {
      html += '<button class="formulas-toggle" onclick="toggleROASFormulas()">Show ROAS Formulas (' + ro.formulae.length + ')</button>';
      html += '<div class="formulas-content" id="roasFormulasContent">';
      ro.formulae.forEach(function(f) {
        html += '<div class="formula-card"><div class="formula-name">' + esc(f.name) + '</div><div class="formula-expr">' + esc(f.formula) + '</div><div class="formula-explain">' + esc(f.explanation) + '</div><div class="formula-example">Example: ' + esc(f.example) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Reel Script — Enhanced with B-roll and beat sync
  if (d.reelScript) {
    var rs = d.reelScript;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Reel Script</h2></div>';
    html += '<div class="reel-header"><span class="reel-badge">' + esc(rs.duration) + ' / ' + rs.totalShots + ' shots</span><span class="reel-audio">Audio: <strong>' + esc(rs.trendingAudio) + '</strong></span></div>';
    // New: Music Beat Sync
    if (rs.musicBeatSync) {
      html += '<div class="beat-sync"><span class="detail-label">🎵 Beat Sync:</span> ' + esc(rs.musicBeatSync) + '</div>';
    }
    if (rs.shots && rs.shots.length) {
      html += '<div class="reel-timeline">';
      rs.shots.forEach(function(sh) {
        html += '<div class="shot-card"><div class="shot-top"><span class="shot-num">Shot ' + sh.shotNumber + '</span><span class="shot-dur">' + esc(sh.duration) + '</span></div><div class="shot-visual">🎬 ' + esc(sh.visual) + '</div><div class="shot-text">📝 "' + esc(sh.textOverlay) + '"</div><div class="shot-trans">↗ ' + esc(sh.transition) + '</div>';
        // New: B-Roll Suggestion
        if (sh.bRollSuggestion) {
          html += '<div class="broll-suggestion">🎞️ Alt: ' + esc(sh.bRollSuggestion) + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }
    if (rs.captionForReel) {
      html += '<div class="caption-box" style="margin-top:12px"><div class="strat-label">Reel Caption</div><div class="caption-text">' + esc(rs.captionForReel) + '</div></div>';
    }
    if (rs.postingTip) {
      html += '<div class="reel-tip"><strong>💡 Tip:</strong> ' + esc(rs.postingTip) + '</div>';
    }
    html += '</div>';
  }

  // Hooks
  if (d.hooks && d.hooks.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Scroll-Stopping Hooks (' + d.hooks.length + ')</h2></div><div class="hooks-list">';
    d.hooks.forEach(function(h, i) {
      html += '<div class="hook-item"><span class="hook-num">' + (i + 1) + '</span><span class="hook-text">' + esc(h) + '</span><button class="copy-sm" onclick="copyText(this,\'' + escAttr(h) + '\')">Copy</button></div>';
    });
    html += '</div></div>';
  }

  // Caption
  if (d.caption) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Ready-to-Post Caption</h2></div><div class="caption-box"><div class="caption-text" id="captionText">' + esc(d.caption) + '</div><div class="caption-btns"><button class="btn-action primary" id="copyCaptionBtn" onclick="copyCaption()">Copy Caption</button><button class="btn-action secondary" id="copyAllBtn" onclick="copyAll()">Copy Everything</button></div></div></div>';
  }

  // Hashtags
  if (d.hashtags && d.hashtags.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Hashtags (' + d.hashtags.length + ')</h2><button class="copy-sm" id="copyHashtagsBtn" onclick="copyHashtags()">Copy All</button></div><div class="tag-cloud">';
    d.hashtags.forEach(function(tag) { html += '<span class="tag">' + esc(tag) + '</span>'; });
    html += '</div></div>';
  }

  // Insight — Enhanced multiline display
  if (d.agentInsight) {
    html += '<div class="result-block"><div class="insight"><div class="insight-label">🤖 AI Strategy Brief</div><div class="insight-text" style="white-space:pre-line">' + esc(d.agentInsight) + '</div></div></div>';
  }

  resultsDiv.innerHTML = html;
  resultsDiv.classList.add("active");

  requestAnimationFrame(function() {
    document.querySelectorAll(".bar-fill, .chart-bar-fill").forEach(function(b) {
      if (b.dataset.w) b.style.width = b.dataset.w + "%";
    });
  });

  resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── SCORE RING SVG ─────────────────────────────────────────────────
function renderScoreRing(label, value) {
  var r = 23, c = 2 * Math.PI * r;
  var offset = c - (value / 100) * c;
  var color = value >= 70 ? "var(--steady)" : value >= 50 ? "var(--rising)" : "var(--hot)";
  return '<div class="score-card"><div class="score-ring"><svg width="56" height="56" viewBox="0 0 56 56"><circle class="score-ring-bg" cx="28" cy="28" r="' + r + '"/><circle class="score-ring-fill" cx="28" cy="28" r="' + r + '" stroke="' + color + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"/></svg><div class="score-ring-text" style="color:' + color + '">' + value + '</div></div><div class="score-label">' + label + '</div></div>';
}

// ─── COPY FUNCTIONS ─────────────────────────────────────────────────
function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(function() {
    btn.classList.add("copied"); btn.textContent = "Copied";
    setTimeout(function() { btn.classList.remove("copied"); btn.textContent = "Copy"; }, 1500);
  });
}
function copyCaption() {
  var btn = document.getElementById("copyCaptionBtn"), txt = document.getElementById("captionText");
  if (!btn || !txt) return;
  navigator.clipboard.writeText(txt.textContent).then(function() {
    btn.classList.add("copied"); btn.textContent = "Copied";
    setTimeout(function() { btn.classList.remove("copied"); btn.textContent = "Copy Caption"; }, 2000);
  });
}
function copyHashtags() {
  if (!resultData || !resultData.hashtags) return;
  var btn = document.getElementById("copyHashtagsBtn");
  navigator.clipboard.writeText(resultData.hashtags.join(" ")).then(function() {
    btn.classList.add("copied"); btn.textContent = "Copied";
    setTimeout(function() { btn.classList.remove("copied"); btn.textContent = "Copy All"; }, 2000);
  });
}
function copyAll() {
  if (!resultData) return;
  var btn = document.getElementById("copyAllBtn");
  var text = (resultData.caption || "") + "\n\n" + (resultData.hashtags || []).join(" ");
  navigator.clipboard.writeText(text).then(function() {
    btn.classList.add("copied"); btn.textContent = "Copied";
    setTimeout(function() { btn.classList.remove("copied"); btn.textContent = "Copy Everything"; }, 2000);
  });
}

function toggleFormulas() {
  var el = document.getElementById("formulasContent");
  if (el) el.classList.toggle("active");
}
function toggleROASFormulas() {
  var el = document.getElementById("roasFormulasContent");
  if (el) el.classList.toggle("active");
}

// ─── PDF EXPORT ─────────────────────────────────────────────────────
// Generates a professional, complete Business Intelligence report.
// Uses Blob URL to avoid popup blockers. All field names match pipeline output.
function exportPDF() {
  if (!resultData) { alert("Run the agent first to generate a report."); return; }
  var d = resultData;
  var topic  = (document.getElementById("topic")  || {}).value || "Crochet Report";
  var region = (document.getElementById("region") || {}).value || "India";
  var city   = (document.getElementById("city")   || {}).value || "";
  var shopName = localStorage.getItem("stiche_shop_name") || "Stiché";
  var dateStr  = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  var location = city ? city + ", " + region : region;

  // ── Helpers ────────────────────────────────────────────────────
  function e(s) { // escape HTML
    var d2 = document.createElement("div"); d2.textContent = s || ""; return d2.innerHTML;
  }
  function moneyRange(obj) {
    if (!obj) return "—";
    return "\u20B9" + (obj.min || 0) + " \u2013 \u20B9" + (obj.max || 0);
  }
  function fmt(n) {
    if (!n && n !== 0) return "0";
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function badge(txt, cls) {
    return '<span class="badge ' + cls + '">' + e(txt) + '</span>';
  }
  function momentumBadge(m) {
    var cls = m === "hot" ? "b-hot" : m === "rising" ? "b-rising" : "b-steady";
    return badge(m, cls);
  }
  function intentBadge(i) {
    var cls = i === "high" ? "b-high" : i === "low" ? "b-low" : "b-medium";
    return badge(i + " intent", cls);
  }
  function table(headers, rows) {
    var h = headers.map(function(h2) { return '<th>' + e(h2) + '</th>'; }).join('');
    return '<table><tr>' + h + '</tr>' + rows + '</table>';
  }
  function sec(icon, title, body) {
    return '<div class="sec"><div class="sec-hd"><span class="sec-ico">' + icon + '</span><div class="sec-ttl">' + e(title) + '</div></div><div class="sec-bd">' + body + '</div></div>';
  }
  function kv(label, val) {
    return val ? '<tr><td class="kl">' + e(label) + '</td><td class="kv"><strong>' + (typeof val === "string" ? e(val) : val) + '</strong></td></tr>' : '';
  }

  var secs = [];

  // ── 01  Trends ──────────────────────────────────────────────────
  if (d.trends && d.trends.length) {
    var rows = d.trends.map(function(t) {
      return '<tr><td><strong>' + e(t.trend) + '</strong></td><td>' + momentumBadge(t.momentum) + '</td><td>' + e(t.region) + '</td><td class="sm">' + e(t.why) + '</td></tr>';
    }).join('');
    secs.push(sec("📈", "Live Market Trends", table(["Trend","Momentum","Region","Insight"], rows)));
  }

  // ── 02  Traffic ─────────────────────────────────────────────────
  if (d.traffic && d.traffic.length) {
    var rows = d.traffic.map(function(t) {
      var sc = t.score || 0;
      var bar = '<div class="bar-wrap"><div class="bar" style="width:' + sc + '%"></div></div>';
      var dir = t.trend === "up" ? "↑ Growing" : t.trend === "down" ? "↓ Declining" : "→ Stable";
      return '<tr><td>' + e(t.region) + '</td><td>' + bar + sc + '/100</td><td class="sm">' + e(dir) + '</td><td class="sm">' + e(t.insight) + '</td></tr>';
    }).join('');
    secs.push(sec("🌐", "Audience Traffic by Region", table(["Region","Score","Direction","Insight"], rows)));
  }

  // ── 03  City Market ─────────────────────────────────────────────
  if (d.cityMarket) {
    var cm = d.cityMarket;
    var rows = [
      kv("Population", cm.population),
      kv("Avg Household Income", cm.avgIncome),
      kv("Craft Market Size", cm.craftMarketSize),
      kv("Online Penetration", cm.onlinePenetration),
      kv("Competitor Density", cm.competitorDensity)
    ].join('');
    if (cm.topPlatforms && cm.topPlatforms.length) {
      rows += '<tr><td class="kl">Top Platforms</td><td class="kv">' + cm.topPlatforms.map(function(p) { return '<span class="tag">' + e(p) + '</span>'; }).join(' ') + '</td></tr>';
    }
    if (cm.festivalCalendar && cm.festivalCalendar.length) {
      rows += '<tr><td class="kl">Key Festivals</td><td class="kv">' + cm.festivalCalendar.map(function(f) { return '<span class="tag">' + e(f) + '</span>'; }).join(' ') + '</td></tr>';
    }
    secs.push(sec("🏙️", "City Market Intelligence — " + location, '<table>' + rows + '</table>'));
  }

  // ── 04  Customer Personas ────────────────────────────────────────
  if (d.customers && d.customers.length) {
    var cards = d.customers.map(function(c) {
      return '<div class="persona-blk">' +
        '<div class="p-top"><strong>' + e(c.name) + '</strong>&nbsp;' + intentBadge(c.buyingIntent || "medium") + '</div>' +
        '<div class="p-meta">' + e(c.age) + ' &nbsp;·&nbsp; 📍 ' + e(c.location) + '</div>' +
        '<div class="p-behavior">' + e(c.behavior) + '</div>' +
        '</div>';
    }).join('');
    secs.push(sec("👥", "Customer Personas", cards));
  }

  // ── 05  Purchase Demand ──────────────────────────────────────────
  if (d.purchases && d.purchases.length) {
    var rows = d.purchases.map(function(p) {
      var sc = p.score || 0;
      var trendCls = p.trend === "up" ? "b-high" : p.trend === "down" ? "b-low" : "b-medium";
      var bar = '<div class="bar-wrap"><div class="bar" style="width:' + sc + '%"></div></div>';
      return '<tr><td>' + e(p.category) + '</td><td>' + bar + sc + '/100</td><td>' + badge(p.trend || "stable", trendCls) + '</td><td class="sm">' + e(p.insight) + '</td></tr>';
    }).join('');
    secs.push(sec("🛒", "Purchase Demand by Category", table(["Category","Score","Trend","Insight"], rows)));
  }

  // ── 06  Content Strategy ─────────────────────────────────────────
  if (d.strategy) {
    var s = d.strategy;
    var rows = [
      kv("Best Posting Time", s.bestTime),
      kv("Best Day", s.bestDay),
      kv("Recommended Format", s.format),
      kv("Content Angle", s.contentAngle),
      kv("CTA Suggestion", s.ctaSuggestion),
      kv("Competitor Gap", s.competitorGap)
    ].join('');
    secs.push(sec("🎯", "Content Strategy Blueprint", '<table>' + rows + '</table>'));
  }

  // ── 07  Profit Calculator ────────────────────────────────────────
  if (d.profit) {
    var p = d.profit;
    var lhours = p.laborHours ? p.laborHours.min + "–" + p.laborHours.max + "h @ ₹" + p.laborCostPerHour + "/hr" : "";
    var mlyPotential = p.monthlyPotential ? "₹" + fmt(p.monthlyPotential.profit) + " profit on " + p.monthlyPotential.units + " units (₹" + fmt(p.monthlyPotential.revenue) + " revenue)" : "";
    var rows = [
      kv("Selling Price Range", moneyRange(p.estimatedSellingPrice)),
      kv("Material Cost Range", moneyRange(p.materialCost)),
      kv("Labor", lhours),
      kv("Shipping Estimate", p.shippingEstimate ? "₹" + p.shippingEstimate : ""),
      kv("Profit Margin", p.profitMargin ? p.profitMargin.min + "–" + p.profitMargin.max + "%" : ""),
      kv("Monthly Potential", mlyPotential)
    ].join('');
    var pfees = "";
    if (p.platformFees && p.platformFees.length) {
      pfees = '<div class="sub-hd">Platform Fees</div>' +
        table(["Platform","Commission %"],
          p.platformFees.map(function(f) {
            return '<tr><td>' + e(f.platform) + '</td><td>' + f.percentage + '%</td></tr>';
          }).join(''));
    }
    secs.push(sec("💰", "Profit Analysis", '<table>' + rows + '</table>' + pfees));
  }

  // ── 08  Instagram Ad Copy ────────────────────────────────────────
  if (d.adCopy) {
    var a = d.adCopy;
    var content = '';
    if (a.headline) content += '<div class="ad-hl">' + e(a.headline) + '</div>';
    if (a.primaryText) content += '<div class="ad-body">' + e(a.primaryText) + '</div>';
    if (a.description) content += '<div class="sm muted" style="margin-top:4px;">' + e(a.description) + '</div>';
    var meta = [
      kv("CTA Button", a.ctaButton),
      kv("Target Audience", a.targetAudience),
      kv("Ad Objective", a.adObjective)
    ].join('');
    if (meta) content += '<table style="margin-top:10px;">' + meta + '</table>';
    if (a.variants && a.variants.length) {
      content += '<div class="sub-hd">A/B Test Variants</div>';
      a.variants.forEach(function(v, i) {
        content += '<div class="variant"><strong>Variant ' + String.fromCharCode(65 + i) + ':</strong> ' + e(v.headline) + '<div class="muted sm">' + e(v.primaryText || "") + '</div></div>';
      });
    }
    secs.push(sec("📣", "Instagram Ad Copy", content));
  }

  // ── 09  ROAS Calculator ──────────────────────────────────────────
  if (d.roas) {
    var r = d.roas;
    var rows = [
      kv("Daily Budget", r.dailyBudget ? "₹" + r.dailyBudget : ""),
      kv("Monthly Ad Spend", r.monthlyAdSpend ? "₹" + fmt(r.monthlyAdSpend) : ""),
      kv("Estimated Daily Reach", r.estimatedReach ? fmt(r.estimatedReach.min) + " – " + fmt(r.estimatedReach.max) : ""),
      kv("Estimated Daily Clicks", r.estimatedClicks ? r.estimatedClicks.min + " – " + r.estimatedClicks.max : ""),
      kv("Cost Per Click", r.costPerClick ? "₹" + r.costPerClick.min + " – ₹" + r.costPerClick.max : ""),
      kv("Cost Per Conversion", r.costPerConversion ? "₹" + r.costPerConversion : ""),
      kv("Projected ROAS", r.projectedROAS ? r.projectedROAS + "x" : ""),
      kv("Monthly Ad Revenue", r.monthlyAdRevenue ? "₹" + fmt(r.monthlyAdRevenue) : "")
    ].join('');
    secs.push(sec("📊", "Ad Budget & ROAS Calculator", '<table>' + rows + '</table>'));
  }

  // ── 10  Reel Script ──────────────────────────────────────────────
  if (d.reelScript) {
    var rs = d.reelScript;
    var content = '<div class="reel-meta">⏱ ' + e(rs.duration) + ' &nbsp;·&nbsp; 🎬 ' + (rs.totalShots || 0) + ' shots &nbsp;·&nbsp; 🎵 ' + e(rs.trendingAudio) + '</div>';
    if (rs.shots && rs.shots.length) {
      var rows = rs.shots.map(function(sh) {
        return '<tr><td>' + sh.shotNumber + '</td><td class="sm">' + e(sh.duration) + '</td><td>' + e(sh.visual) + '</td><td><em>"' + e(sh.textOverlay) + '"</em></td><td class="sm">' + e(sh.transition) + '</td></tr>';
      }).join('');
      content += table(["#","Dur","Visual","Text Overlay","Transition"], rows);
    }
    if (rs.captionForReel) content += '<div class="caption-box" style="margin-top:10px;">' + e(rs.captionForReel).replace(/\n/g,"<br>") + '</div>';
    if (rs.postingTip) content += '<div class="tip">💡 ' + e(rs.postingTip) + '</div>';
    secs.push(sec("🎬", "Reel Script", content));
  }

  // ── 11  Scroll-Stopping Hooks ────────────────────────────────────
  if (d.hooks && d.hooks.length) {
    var list = '<ol>' + d.hooks.map(function(h) { return '<li>' + e(h) + '</li>'; }).join('') + '</ol>';
    secs.push(sec("🪝", "Scroll-Stopping Hooks", list));
  }

  // ── 12  Caption ──────────────────────────────────────────────────
  if (d.caption) {
    secs.push(sec("✍️", "Ready-to-Post Caption", '<div class="caption-box">' + e(d.caption).replace(/\n/g,"<br>") + '</div>'));
  }

  // ── 13  Pinterest Ideas ──────────────────────────────────────────
  if (d.pinterestSuggestions && d.pinterestSuggestions.length) {
    var cards = d.pinterestSuggestions.map(function(p) {
      var terms = (p.searchTerms || []).map(function(t) { return '<span class="tag">' + e(t) + '</span>'; }).join('');
      var engCls = p.estimatedEngagement === "high" ? "b-high" : p.estimatedEngagement === "low" ? "b-low" : "b-medium";
      return '<div class="persona-blk"><strong>' + e(p.idea) + '</strong> ' + badge(p.estimatedEngagement || "medium", engCls) + '<div class="muted sm">' + e(p.whyItWorks) + '</div><div style="margin-top:5px;">' + terms + '</div></div>';
    }).join('');
    secs.push(sec("📌", "Pinterest Content Ideas", cards));
  }

  // ── 14  Hashtags ─────────────────────────────────────────────────
  if (d.hashtags && d.hashtags.length) {
    var cloud = '<div class="tag-cloud">' + d.hashtags.map(function(t) { return '<span class="htag">' + e(t) + '</span>'; }).join('') + '</div>';
    secs.push(sec("#", "Hashtag Strategy (" + d.hashtags.length + " tags)", cloud));
  }

  // ── 15  Image Analysis ───────────────────────────────────────────
  if (d.imageAnalysis) {
    var ia = d.imageAnalysis;
    var score = ia.instagramReadiness || 0;
    var label = score >= 90 ? "Post-Ready ✓" : score >= 70 ? "Good — minor tweaks" : score >= 50 ? "Needs Improvement" : "Re-shoot Recommended";
    var scoreColor = score >= 70 ? "#1a9e6e" : score >= 50 ? "#c47f17" : "#e5484d";
    var content = '<div class="score-row"><div class="big-score" style="color:' + scoreColor + '">' + score + '</div><div><div class="score-lbl">Instagram Readiness Score</div><div class="muted">' + label + '</div></div></div>';
    var rows = [
      kv("Lighting", ia.lightingScore != null ? ia.lightingScore + "/100" : ""),
      kv("Composition", ia.compositionScore != null ? ia.compositionScore + "/100" : ""),
      kv("Color Harmony", ia.colorHarmonyScore != null ? ia.colorHarmonyScore + "/100" : ""),
      kv("Product Clarity", ia.productClarityScore != null ? ia.productClarityScore + "/100" : "")
    ].join('');
    if (rows) content += '<table style="margin-top:10px;">' + rows + '</table>';
    if (ia.improvements && ia.improvements.length) {
      content += '<div class="sub-hd">Suggested Improvements</div><ul>' + ia.improvements.map(function(tip) { return '<li>' + e(tip) + '</li>'; }).join('') + '</ul>';
    }
    secs.push(sec("📸", "Image Analysis", content));
  }

  // ── 16  Instagram Profile ────────────────────────────────────────
  if (d.instagramProfile) {
    var ig = d.instagramProfile;
    var rows = [
      kv("Handle", "@" + (ig.handle || "").replace("@","")),
      kv("Followers (approx)", ig.followerCountStr),
      kv("Engagement Rate", ig.engagementRateStr),
      kv("Growth Trend", ig.growthTrend),
      kv("Recent Activity", ig.recentActivitySummary),
      kv("Best Performing Styles", ig.bestPerformingStyles)
    ].join('');
    secs.push(sec("📱", "Your Instagram Profile", '<table>' + rows + '</table>'));
  }

  // ── 17  Agent Insight ────────────────────────────────────────────
  if (d.agentInsight) {
    secs.push(sec("🤖", "AI Agent Insight", '<div class="insight">' + e(d.agentInsight) + '</div>'));
  }

  // ── Build the full HTML document ────────────────────────────────
  var css = [
    '* { box-sizing:border-box; margin:0; padding:0; }',
    'body { font-family:"Inter","Segoe UI",sans-serif; color:#1a1a2e; font-size:10.5pt; line-height:1.55; background:#fff; padding:20mm 18mm; }',
    'h1,h2,h3 { margin:0; }',

    /* Cover */
    '.cover { text-align:center; padding:36px 0 28px; border-bottom:3px solid #6c5ce7; margin-bottom:30px; page-break-after:always; }',
    '.cover-logo { font-size:30pt; font-weight:900; color:#6c5ce7; letter-spacing:-1.5px; margin-bottom:6px; }',
    '.cover-sub { font-size:11pt; color:#8888aa; margin-bottom:14px; font-weight:500; letter-spacing:.4px; }',
    '.cover-title { font-size:22pt; font-weight:800; color:#1a1a2e; margin-bottom:6px; }',
    '.cover-meta { display:flex; justify-content:center; gap:12px; flex-wrap:wrap; }',
    '.meta-pill { display:inline-block; border:1px solid #e2e2ea; border-radius:100px; padding:5px 14px; font-size:10pt; color:#8888aa; }',
    '.cover-shop { font-size:12pt; font-weight:600; color:#6c5ce7; margin-bottom:4px; }',

    /* Sections */
    '.sec { margin-bottom:18px; border:1px solid #e8e8f0; border-radius:10px; page-break-inside:avoid; overflow:hidden; }',
    '.sec-hd { display:flex; align-items:center; gap:8px; padding:10px 14px; background:#f8f7ff; border-bottom:1px solid #e8e8f0; }',
    '.sec-ico { font-size:14pt; }',
    '.sec-ttl { font-size:11.5pt; font-weight:800; color:#4a3f78; }',
    '.sec-bd { padding:12px 14px; }',
    '.sub-hd { font-size:10pt; font-weight:700; color:#6c5ce7; margin-top:12px; margin-bottom:6px; border-top:1px dashed #e2e2ea; padding-top:10px; }',

    /* Tables */
    'table { width:100%; border-collapse:collapse; font-size:9.5pt; }',
    'th { background:#f4f3ff; color:#6c5ce7; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; border-bottom:2px solid #e2e2ea; }',
    'td { padding:7px 10px; border-bottom:1px solid #f0f0f8; vertical-align:top; }',
    'tr:last-child td { border-bottom:none; }',
    'td.kl { width:36%; color:#5a5a7a; font-weight:500; }',
    'td.kv { width:64%; }',
    'td.sm { font-size:9pt; color:#5a5a7a; }',

    /* Badges */
    '.badge { display:inline-block; padding:2px 8px; border-radius:100px; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:.3px; white-space:nowrap; }',
    '.b-hot { background:#fde8e8; color:#e5484d; }',
    '.b-rising { background:#fff3e2; color:#c47f17; }',
    '.b-steady { background:#e8f5f0; color:#1a9e6e; }',
    '.b-high { background:#e8f5f0; color:#1a9e6e; }',
    '.b-medium { background:#fff3e2; color:#c47f17; }',
    '.b-low { background:#fde8e8; color:#e5484d; }',

    /* Progress bars */
    '.bar-wrap { display:inline-block; width:100px; height:8px; background:#f0f0f8; border-radius:100px; vertical-align:middle; margin-right:6px; overflow:hidden; }',
    '.bar { height:100%; background:linear-gradient(90deg,#6c5ce7,#a29bfe); border-radius:100px; }',

    /* Personas */
    '.persona-blk { padding:10px 0; border-bottom:1px solid #f0f0f8; }',
    '.persona-blk:last-child { border-bottom:none; }',
    '.p-top { font-size:11pt; margin-bottom:2px; }',
    '.p-meta { font-size:9pt; color:#8888aa; margin-bottom:3px; }',
    '.p-behavior { font-size:9.5pt; color:#5a5a7a; line-height:1.6; }',

    /* Caption */
    '.caption-box { background:#f8f7ff; border-left:3px solid #6c5ce7; padding:10px 14px; border-radius:4px; white-space:pre-wrap; line-height:1.75; font-size:10pt; }',

    /* Tags */
    '.tag-cloud { display:flex; flex-wrap:wrap; gap:4px; }',
    '.tag { display:inline-block; background:#f0edff; color:#6c5ce7; padding:2px 9px; border-radius:100px; font-size:8.5pt; font-weight:500; }',
    '.htag { display:inline-block; background:#f0edff; color:#6c5ce7; padding:2px 9px; border-radius:100px; font-size:8.5pt; font-weight:500; margin:2px; }',

    /* Ad copy */
    '.ad-hl { font-size:13pt; font-weight:800; margin-bottom:6px; color:#1a1a2e; }',
    '.ad-body { font-size:10pt; color:#3d3d5a; line-height:1.65; }',

    /* Reel */
    '.reel-meta { font-size:10pt; font-weight:600; color:#6c5ce7; margin-bottom:10px; }',

    /* Variant */
    '.variant { padding:9px; background:#fafafe; border:1px solid #e8e8f0; border-radius:6px; margin-bottom:7px; }',

    /* Score */
    '.score-row { display:flex; align-items:center; gap:16px; margin-bottom:12px; }',
    '.big-score { font-size:32pt; font-weight:900; }',
    '.score-lbl { font-size:11pt; font-weight:700; }',

    /* Insight */
    '.insight { background:#f8f7ff; border:1px solid rgba(108,92,231,.2); border-radius:8px; padding:12px; line-height:1.75; }',
    '.tip { margin-top:10px; font-size:9.5pt; color:#5a5a7a; border-top:1px dashed #e2e2ea; padding-top:8px; }',

    /* Lists */
    'ol { padding-left:18px; } ol li { padding:5px 0; border-bottom:1px solid #f5f5f7; } ol li:last-child { border-bottom:none; }',
    'ul { padding-left:18px; } ul li { padding:4px 0; }',

    /* Print */
    '.muted { color:#8888aa; } .sm { font-size:9pt; }',
    '@media print { body { padding:0; } .no-print { display: none; } @page { margin:15mm 15mm; } }'
  ].join('\n');

  var printBtn = '<div class="no-print" style="position:fixed;top:18px;right:18px;display:flex;gap:8px;">' +
    '<button onclick="window.print()" style="background:#6c5ce7;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:11pt;font-weight:700;cursor:pointer;">🖨️ Print / Save as PDF</button>' +
    '<button onclick="window.close()" style="background:#f0f0f4;color:#3d3d5a;border:none;padding:10px 16px;border-radius:8px;font-size:11pt;cursor:pointer;">✕ Close</button>' +
    '</div>';

  var cover = '<div class="cover">' +
    '<div class="cover-logo">Stiché</div>' +
    '<div class="cover-sub">AI Business Intelligence Report</div>' +
    '<h1 class="cover-title">' + e(topic) + '</h1>' +
    '<div class="cover-meta">' +
      '<div class="meta-pill">📍 ' + e(location) + '</div>' +
      '<div class="meta-pill">📅 ' + dateStr + '</div>' +
      (shopName !== "Stiché" ? '<div class="meta-pill">🏪 ' + e(shopName) + '</div>' : '') +
      '<div class="meta-pill">' + secs.length + ' sections</div>' +
    '</div>' +
    '</div>';

  var fullHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Sticheé Report — ' + e(topic) + ' — ' + dateStr + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style></head><body>' +
    printBtn + cover + secs.join('') +
    '</body></html>';

  // Use Blob URL — avoids popup blockers entirely
  var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, '_blank');
  if (!win) {
    // Fallback: create a download link
    var a = document.createElement('a');
    a.href = url;
    a.download = 'stiche-report-' + new Date().toISOString().slice(0,10) + '.html';
    a.click();
  }
  setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
}

// ─── UTILITIES ──────────────────────────────────────────────────────
function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function escAttr(s) { return (s || "").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, " "); }
function formatNum(n) { if (!n) return "0"; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }



