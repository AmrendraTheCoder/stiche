// ─── AUTH HELPER ────────────────────────────────────────────────────
// The SITE_KEY is set once by you in Vercel env vars.
// In the browser it's stored in localStorage after first prompt.
// This prevents random people from using your API endpoints.
function getSiteKey() {
  var k = localStorage.getItem("stiche_site_key");
  if (!k) {
    k = prompt("Enter site access key:") || "";
    if (k) localStorage.setItem("stiche_site_key", k);
  }
  return k || "";
}
function apiHeaders(extra) {
  var h = { "x-site-key": getSiteKey() };
  return Object.assign(h, extra || {});
}

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
  var igHandle = document.getElementById("instagramHandle").value.trim();
  if (igHandle) formData.append("instagramHandle", igHandle);
  if (selectedFile) formData.append("image", selectedFile);

  document.getElementById("loadingSub").textContent = hasImage ? "This takes 40-70 seconds (image analysis adds time)" : "This takes 30-50 seconds";

  fetch("/api/run-agent", { method: "POST", body: formData, headers: apiHeaders(), signal: abortController.signal })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.error) throw new Error(json.error);
      resultData = json.data;
      for (var i = 1; i <= stepCount; i++) setStep(i, "done");
      setTimeout(function() { loadingBox.classList.remove("active"); renderResults(resultData); }, 300);
    })
    .catch(function(err) {
      loadingBox.classList.remove("active");
      if (err.name !== "AbortError") { errorBox.classList.add("active"); errorMessage.textContent = err.message || "Something went wrong."; }
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

  // Trends
  if (d.trends && d.trends.length) {
    try { localStorage.setItem("stiche_recent_trends", JSON.stringify(d.trends)); } catch(e){}
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Live Trends</h2></div><div class="trend-list">';
    d.trends.forEach(function(t) {
      html += '<div class="trend-card"><div class="trend-name">' + esc(t.trend) + '</div><div class="trend-meta"><span class="momentum ' + t.momentum + '">' + t.momentum + '</span><span class="trend-region">' + esc(t.region) + '</span></div><div class="trend-why">' + esc(t.why) + '</div></div>';
    });
    html += '</div></div>';
  }

  // Traffic
  if (d.traffic && d.traffic.length) {
    var dirL = { up: "Growing", stable: "Stable", down: "Declining" };
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Audience Traffic</h2></div><div class="card"><div class="traffic-items">';
    d.traffic.forEach(function(t) {
      var dir = t.trend || "stable";
      html += '<div><div class="traffic-top"><span class="traffic-label">' + esc(t.region) + ' <span class="traffic-dir ' + dir + '">' + (dirL[dir] || dir) + '</span></span><span class="traffic-score">' + t.score + '/100</span></div><div class="bar-track"><div class="bar-fill" data-w="' + t.score + '"></div></div><div class="traffic-note">' + esc(t.insight) + '</div></div>';
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

  // Customer Personas
  if (d.customers && d.customers.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Customer Personas</h2></div><div class="persona-list">';
    d.customers.forEach(function(c) {
      var intent = c.buyingIntent || "medium";
      html += '<div class="persona-card"><div class="persona-header"><div><div class="persona-name">' + esc(c.name) + '</div><div class="persona-age">' + esc(c.age) + '</div></div><span class="intent-badge ' + intent + '">' + intent + ' intent</span></div><div class="persona-location">' + esc(c.location) + '</div><div class="persona-behavior">' + esc(c.behavior) + '</div></div>';
    });
    html += '</div></div>';
  }

  // Purchase Demand
  if (d.purchases && d.purchases.length) {
    var dirS = { up: "Up", stable: "Stable", down: "Down" };
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Purchase Demand</h2></div><div class="card"><div class="chart-container">';
    d.purchases.forEach(function(p) {
      var dir = p.trend || "stable";
      html += '<div class="chart-bar-row"><div class="chart-label">' + esc(p.category) + ' <span class="chart-trend-tag ' + dir + '">' + (dirS[dir] || dir) + '</span></div><div class="chart-bar-wrapper"><div class="chart-bar-track"><div class="chart-bar-fill ' + dir + '" data-w="' + p.score + '">' + p.score + '</div></div><div class="chart-insight">' + esc(p.insight) + '</div></div></div>';
    });
    html += '</div></div></div>';
  }

  // Strategy
  if (d.strategy) {
    var s = d.strategy;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Content Strategy</h2></div><div class="strategy-grid">';
    html += '<div class="strat-card"><div class="strat-label">Best Time</div><div class="strat-value">' + esc(s.bestTime) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Best Day</div><div class="strat-value">' + esc(s.bestDay) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Format</div><div class="strat-value">' + esc(s.format) + '</div></div>';
    html += '<div class="strat-card"><div class="strat-label">Content Angle</div><div class="strat-value">' + esc(s.contentAngle) + '</div></div>';
    html += '<div class="strat-card strat-wide"><div class="strat-label">CTA Suggestion</div><div class="strat-value">' + esc(s.ctaSuggestion) + '</div></div>';
    html += '<div class="strat-card strat-wide"><div class="strat-label">Competitor Gap</div><div class="strat-value strat-highlight">' + esc(s.competitorGap) + '</div></div>';
    html += '</div></div>';
  }

  // Image Analysis
  if (d.imageAnalysis) {
    var ia = d.imageAnalysis;
    var readinessLabel = ia.instagramReadiness >= 90 ? "Post-ready" : ia.instagramReadiness >= 70 ? "Good -- minor tweaks" : ia.instagramReadiness >= 50 ? "Needs improvement" : "Re-shoot recommended";
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
    if (ia.improvements && ia.improvements.length) {
      html += '<div class="improvements-list">';
      ia.improvements.forEach(function(tip) { html += '<div class="improvement-item"><span class="improvement-icon">*</span>' + esc(tip) + '</div>'; });
      html += '</div>';
    }
    html += '</div>';
  }

  // Pinterest Suggestions
  if (d.pinterestSuggestions && d.pinterestSuggestions.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Pinterest-Inspired Ideas</h2></div><div class="pinterest-list">';
    d.pinterestSuggestions.forEach(function(p) {
      html += '<div class="pinterest-card"><div class="pin-idea">' + esc(p.idea) + '</div><div class="pin-why">' + esc(p.whyItWorks) + '</div><div class="pin-meta">';
      if (p.searchTerms) p.searchTerms.forEach(function(t) { html += '<span class="pin-term">' + esc(t) + '</span>'; });
      html += '<span class="engagement-badge ' + (p.estimatedEngagement || "medium") + '">' + (p.estimatedEngagement || "medium") + '</span></div></div>';
    });
    html += '</div></div>';
  }

  // Profit Calculator
  if (d.profit) {
    var pr = d.profit;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Profit Calculator</h2></div>';
    html += '<div class="profit-summary">';
    html += '<div class="profit-card"><div class="profit-label">Selling Price</div><div class="profit-val">₹' + pr.estimatedSellingPrice.min + '–' + pr.estimatedSellingPrice.max + '</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Material Cost</div><div class="profit-val">₹' + pr.materialCost.min + '–' + pr.materialCost.max + '</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Labor Hours</div><div class="profit-val">' + pr.laborHours.min + '–' + pr.laborHours.max + 'h</div><div class="profit-range">@ ₹' + pr.laborCostPerHour + '/hr</div></div>';
    html += '<div class="profit-card"><div class="profit-label">Shipping</div><div class="profit-val">₹' + pr.shippingEstimate + '</div></div>';
    html += '<div class="profit-card highlight"><div class="profit-label">Profit Margin</div><div class="profit-val green">' + pr.profitMargin.min + '–' + pr.profitMargin.max + '%</div></div>';
    html += '<div class="profit-card highlight"><div class="profit-label">Monthly Potential</div><div class="profit-val green">₹' + formatNum(pr.monthlyPotential.profit) + '</div><div class="profit-range">' + pr.monthlyPotential.units + ' units · ₹' + formatNum(pr.monthlyPotential.revenue) + ' rev</div></div>';
    html += '</div>';

    if (pr.platformFees && pr.platformFees.length) {
      html += '<div class="platform-fees">';
      pr.platformFees.forEach(function(f) {
        html += '<div class="fee-row"><span class="fee-name">' + esc(f.platform) + '</span><span class="fee-pct">' + f.percentage + '%</span></div>';
      });
      html += '</div>';
    }

    if (pr.formulae && pr.formulae.length) {
      html += '<button class="formulas-toggle" onclick="toggleFormulas()">Show All Formulas & Logic</button>';
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
      html += '<div class="section-label" style="margin-top:12px">A/B Test Variants</div>';
      ac.variants.forEach(function(v, i) {
        html += '<div class="variant-card"><div class="variant-label">Variant ' + String.fromCharCode(65 + i) + '</div><div class="variant-headline">' + esc(v.headline) + '</div><div class="variant-text">' + esc(v.primaryText) + '</div></div>';
      });
    }
    html += '</div>';
  }

  // ROAS Calculator
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
    if (ro.formulae && ro.formulae.length) {
      html += '<button class="formulas-toggle" onclick="toggleROASFormulas()">Show ROAS Formulas</button>';
      html += '<div class="formulas-content" id="roasFormulasContent">';
      ro.formulae.forEach(function(f) {
        html += '<div class="formula-card"><div class="formula-name">' + esc(f.name) + '</div><div class="formula-expr">' + esc(f.formula) + '</div><div class="formula-explain">' + esc(f.explanation) + '</div><div class="formula-example">Example: ' + esc(f.example) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Reel Script
  if (d.reelScript) {
    var rs = d.reelScript;
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Reel Script</h2></div>';
    html += '<div class="reel-header"><span class="reel-badge">' + esc(rs.duration) + ' / ' + rs.totalShots + ' shots</span><span class="reel-audio">Audio: <strong>' + esc(rs.trendingAudio) + '</strong></span></div>';
    if (rs.shots && rs.shots.length) {
      html += '<div class="reel-timeline">';
      rs.shots.forEach(function(sh) {
        html += '<div class="shot-card"><div class="shot-top"><span class="shot-num">Shot ' + sh.shotNumber + '</span><span class="shot-dur">' + esc(sh.duration) + '</span></div><div class="shot-visual">Visual: ' + esc(sh.visual) + '</div><div class="shot-text">Text: "' + esc(sh.textOverlay) + '"</div><div class="shot-trans">Transition: ' + esc(sh.transition) + '</div></div>';
      });
      html += '</div>';
    }
    if (rs.captionForReel) {
      html += '<div class="caption-box" style="margin-top:12px"><div class="strat-label">Reel Caption</div><div class="caption-text">' + esc(rs.captionForReel) + '</div></div>';
    }
    if (rs.postingTip) {
      html += '<div class="reel-tip"><strong>Tip:</strong> ' + esc(rs.postingTip) + '</div>';
    }
    html += '</div>';
  }

  // Hooks
  if (d.hooks && d.hooks.length) {
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Scroll-Stopping Hooks</h2></div><div class="hooks-list">';
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
    html += '<div class="result-block"><div class="block-header"><h2 class="block-title">Hashtags</h2><button class="copy-sm" id="copyHashtagsBtn" onclick="copyHashtags()">Copy All</button></div><div class="tag-cloud">';
    d.hashtags.forEach(function(tag) { html += '<span class="tag">' + esc(tag) + '</span>'; });
    html += '</div></div>';
  }

  // Insight
  if (d.agentInsight) {
    html += '<div class="result-block"><div class="insight"><div class="insight-label">Agent Insight</div><div class="insight-text">' + esc(d.agentInsight) + '</div></div></div>';
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
function exportPDF() {
  if (!resultData) return;
  var d = resultData;
  var topic  = document.getElementById("topic").value || "Crochet Report";
  var region = document.getElementById("region").value || "India";
  var city   = document.getElementById("city").value || "";
  var dateStr  = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
  var location = city ? city + ", " + region : region;
  var html = "";

  // Cover page
  html += '<div class="cover"><div class="cover-logo">Stiche</div><div class="cover-title">' + esc(topic) + '</div><div class="cover-sub">Business Intelligence Report</div><div class="cover-meta">' + esc(location) + ' &nbsp;|&nbsp; ' + dateStr + '</div></div>';

  // Trends
  if (d.trends && d.trends.length) {
    html += '<div class="section"><div class="section-title">Live Market Trends</div><table><tr><th>Trend</th><th>Momentum</th><th>Region</th><th>Insight</th></tr>';
    d.trends.forEach(function(t) { html += '<tr><td><strong>' + esc(t.trend) + '</strong></td><td><span class="badge badge-' + esc(t.momentum) + '">' + esc(t.momentum) + '</span></td><td>' + esc(t.region) + '</td><td>' + esc(t.why) + '</td></tr>'; });
    html += '</table></div>';
  }
  // Personas
  if (d.customers && d.customers.length) {
    html += '<div class="section"><div class="section-title">Customer Personas</div>';
    d.customers.forEach(function(c) {
      html += '<div class="persona-block"><div class="persona-name">' + esc(c.name) + ' &mdash; <span class="muted">' + esc(c.ageRange) + '</span>';
      if (c.buyIntent) html += ' <span class="badge badge-' + esc(c.buyIntent) + '">' + esc(c.buyIntent) + '</span>';
      html += '</div>';
      if (c.location) html += '<div class="muted small">' + esc(c.location) + '</div>';
      if (c.behavior) html += '<div class="sub-text">' + esc(c.behavior) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }
  // Hooks
  if (d.hooks && d.hooks.length) {
    html += '<div class="section"><div class="section-title">Content Hooks</div><ol>';
    d.hooks.forEach(function(h) { html += '<li>' + esc(h) + '</li>'; });
    html += '</ol></div>';
  }
  // Caption
  if (d.caption) html += '<div class="section"><div class="section-title">Ready-to-Post Caption</div><div class="caption-box">' + esc(d.caption).replace(/\n/g, '<br>') + '</div></div>';
  // Hashtags
  if (d.hashtags && d.hashtags.length) {
    html += '<div class="section"><div class="section-title">Hashtag Strategy (' + d.hashtags.length + ' tags)</div><div class="tag-cloud">';
    d.hashtags.forEach(function(t) { html += '<span class="htag">' + esc(t) + '</span>'; });
    html += '</div></div>';
  }
  // Profit
  if (d.profit) {
    var p = d.profit;
    html += '<div class="section"><div class="section-title">Profit Analysis</div><table>';
    if (p.sellingPrice) html += '<tr><td>Selling Price</td><td><strong>' + esc(String(p.sellingPrice)) + '</strong></td></tr>';
    if (p.materialCost) html += '<tr><td>Material Cost</td><td>' + esc(String(p.materialCost)) + '</td></tr>';
    if (p.netProfit)    html += '<tr><td><strong>Net Profit</strong></td><td><strong class="green">' + esc(String(p.netProfit)) + '</strong></td></tr>';
    if (p.marginPct)    html += '<tr><td>Margin</td><td>' + esc(String(p.marginPct)) + '</td></tr>';
    if (p.breakEvenQty) html += '<tr><td>Break-Even Qty</td><td>' + esc(String(p.breakEvenQty)) + ' units</td></tr>';
    html += '</table></div>';
  }
  // Ad Copy
  if (d.adCopy) {
    var a = d.adCopy;
    html += '<div class="section"><div class="section-title">Instagram Ad Copy</div>';
    if (a.headline) html += '<div class="big-text">' + esc(a.headline) + '</div>';
    if (a.primaryText) html += '<div class="sub-text">' + esc(a.primaryText) + '</div>';
    if (a.variants && a.variants.length) {
      a.variants.forEach(function(v, i) { html += '<div class="variant"><strong>Variant ' + (i+1) + ':</strong> ' + esc(v.headline) + '<div class="sub-text">' + esc(v.text) + '</div></div>'; });
    }
    html += '</div>';
  }
  // ROAS
  if (d.roas) {
    var r = d.roas;
    html += '<div class="section"><div class="section-title">ROAS Calculator</div><table>';
    if (r.adSpend)       html += '<tr><td>Recommended Ad Spend</td><td>' + esc(String(r.adSpend)) + '</td></tr>';
    if (r.expectedROAS)  html += '<tr><td>Expected ROAS</td><td><strong>' + esc(String(r.expectedROAS)) + '</strong></td></tr>';
    if (r.revenueTarget) html += '<tr><td>Revenue Target</td><td>' + esc(String(r.revenueTarget)) + '</td></tr>';
    if (r.cpc)           html += '<tr><td>Est. CPC</td><td>' + esc(String(r.cpc)) + '</td></tr>';
    html += '</table></div>';
  }
  // Instagram Profile
  if (d.instagramProfile) {
    var ig = d.instagramProfile;
    html += '<div class="section"><div class="section-title">Instagram Profile — ' + esc(ig.handle) + '</div><table>';
    if (ig.followerCountStr)      html += '<tr><td>Followers</td><td>' + esc(ig.followerCountStr) + '</td></tr>';
    if (ig.engagementRateStr)     html += '<tr><td>Engagement Rate</td><td>' + esc(ig.engagementRateStr) + '</td></tr>';
    if (ig.growthTrend)           html += '<tr><td>Growth Trend</td><td>' + esc(ig.growthTrend) + '</td></tr>';
    if (ig.recentActivitySummary) html += '<tr><td>Recent Activity</td><td>' + esc(ig.recentActivitySummary) + '</td></tr>';
    if (ig.bestPerformingStyles)  html += '<tr><td>Best Styles</td><td>' + esc(ig.bestPerformingStyles) + '</td></tr>';
    html += '</table></div>';
  }
  // Insight
  if (d.agentInsight) html += '<div class="section"><div class="section-title">AI Agent Insight</div><div class="insight">' + esc(d.agentInsight) + '</div></div>';

  // Open print window
  var win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to export the PDF."); return; }
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Stiche Report</title>');
  win.document.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">');
  win.document.write('<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:"Inter",sans-serif;color:#1a1a2e;font-size:10.5pt;line-height:1.5;padding:20px;background:#fff;}');
  win.document.write('.cover{text-align:center;padding:48px 0 36px;border-bottom:3px solid #6c5ce7;margin-bottom:28px;page-break-after:always;}');
  win.document.write('.cover-logo{font-size:32pt;font-weight:900;color:#6c5ce7;letter-spacing:-1px;margin-bottom:10px;}');
  win.document.write('.cover-title{font-size:20pt;font-weight:800;margin-bottom:4px;}.cover-sub{font-size:13pt;color:#5a5a7a;margin-bottom:12px;}');
  win.document.write('.cover-meta{display:inline-block;padding:8px 18px;border:1px solid #e2e2ea;border-radius:8px;font-size:10.5pt;color:#9090aa;}');
  win.document.write('.section{margin-bottom:20px;padding:16px 18px;border:1px solid #e2e2ea;border-radius:10px;page-break-inside:avoid;}');
  win.document.write('.section-title{font-size:12.5pt;font-weight:800;color:#6c5ce7;padding-bottom:7px;border-bottom:2px solid rgba(108,92,231,0.18);margin-bottom:12px;}');
  win.document.write('table{width:100%;border-collapse:collapse;font-size:10pt;}th{background:#f5f5ff;color:#666;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;padding:7px 10px;border-bottom:2px solid #e2e2ea;}');
  win.document.write('td{padding:8px 10px;border-bottom:1px solid #f0f0f6;vertical-align:top;}tr:last-child td{border-bottom:none;}');
  win.document.write('.badge{display:inline-block;padding:2px 8px;border-radius:100px;font-size:8pt;font-weight:700;text-transform:uppercase;}');
  win.document.write('.badge-hot{background:#fde8e8;color:#e5484d;}.badge-rising{background:#fef3e2;color:#c47f17;}.badge-steady{background:#e8f5f0;color:#1a9e6e;}');
  win.document.write('.badge-high{background:#e8f5f0;color:#1a9e6e;}.badge-medium{background:#fef3e2;color:#c47f17;}.badge-low{background:#fde8e8;color:#e5484d;}');
  win.document.write('.persona-block{padding:9px 0;border-bottom:1px solid #f0f0f6;}.persona-block:last-child{border-bottom:none;}');
  win.document.write('.persona-name{font-size:11pt;font-weight:700;margin-bottom:2px;}.muted{font-weight:400;color:#9090aa;}.small{font-size:9pt;}');
  win.document.write('.sub-text{font-size:10pt;color:#5a5a7a;line-height:1.6;margin-top:3px;}');
  win.document.write('.caption-box{background:#f5f5ff;border-left:3px solid #6c5ce7;padding:10px 14px;border-radius:4px;white-space:pre-wrap;line-height:1.7;font-size:10pt;}');
  win.document.write('.tag-cloud{display:flex;flex-wrap:wrap;gap:4px;padding-top:4px;}.htag{background:#f0edff;color:#6c5ce7;padding:2px 9px;border-radius:100px;font-size:9pt;font-weight:500;}');
  win.document.write('.big-text{font-size:13pt;font-weight:800;margin-bottom:6px;}.green{color:#1a9e6e;}');
  win.document.write('.variant{padding:9px;background:#fafafe;border:1px solid #e2e2ea;border-radius:6px;margin-bottom:7px;}');
  win.document.write('.insight{background:#f5f5ff;border:1px solid rgba(108,92,231,0.2);border-radius:8px;padding:12px;line-height:1.7;}');
  win.document.write('ol{padding-left:20px;}ol li{padding:5px 0;border-bottom:1px solid #f5f5f7;font-size:10.5pt;}ol li:last-child{border-bottom:none;}');
  win.document.write('@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0;}}</style>');
  win.document.write('</head><body>' + html + '</body></html>');
  win.document.close();
  setTimeout(function() { win.focus(); win.print(); }, 600);
}


// ─── UTILITIES ──────────────────────────────────────────────────────
function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function escAttr(s) { return (s || "").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, " "); }
function formatNum(n) { if (!n) return "0"; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
