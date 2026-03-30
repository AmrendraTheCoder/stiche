// ─── CALENDAR TAB ───────────────────────────────────────────────────
// Populate calendar region/city dropdowns using same CITIES data
(function() {
  var calRegion = document.getElementById("calRegion");
  var calCity = document.getElementById("calCity");
  if (!calRegion || !calCity || typeof CITIES === "undefined") return;

  Object.keys(CITIES).forEach(function(state) {
    var opt = document.createElement("option");
    opt.value = state; opt.textContent = state;
    calRegion.appendChild(opt);
  });

  calRegion.addEventListener("change", function() {
    var cities = CITIES[this.value] || [];
    calCity.innerHTML = '<option value="">All Cities</option>';
    cities.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      calCity.appendChild(opt);
    });
  });
  calRegion.dispatchEvent(new Event("change"));

  // Load saved prefs
  try {
    var prefs = JSON.parse(localStorage.getItem("stiche_cal_prefs") || "{}");
    if (prefs.products) document.getElementById("calProducts").value = prefs.products;
    if (prefs.audience) document.getElementById("calAudience").value = prefs.audience;
    if (prefs.voice) document.getElementById("calVoice").value = prefs.voice;
    if (prefs.region) { calRegion.value = prefs.region; calRegion.dispatchEvent(new Event("change")); }
    if (prefs.city) calCity.value = prefs.city;
    if (prefs.price) document.getElementById("calPrice").value = prefs.price;
  } catch(e) {}
})();

// Auto pilot toggle for calendar
var calendarAutoPilot = document.getElementById("calendarAutoPilot");
if (calendarAutoPilot) {
  calendarAutoPilot.addEventListener("change", function() {
    var fields = ["calProducts", "calAudience", "calVoice", "calPrice", "calRegion", "calCity"];
    var self = this;
    fields.forEach(function(f) {
      var el = document.getElementById(f);
      if (!el || !el.parentElement) return;
      if (self.checked) {
        el.parentElement.classList.add("disabled");
        el.removeAttribute("required");
      } else {
        el.parentElement.classList.remove("disabled");
        if(f==="calProducts") el.setAttribute("required", "required");
      }
    });
  });
}

var calendarData = null;

document.getElementById("calendarForm").addEventListener("submit", function(e) {
  e.preventDefault();
  var btn = document.getElementById("calSubmitBtn");
  var loadingBox = document.getElementById("calLoadingBox");
  var errorBox = document.getElementById("calErrorBox");
  var resultsDiv = document.getElementById("calResults");

  var products = document.getElementById("calProducts").value;
  var audience = document.getElementById("calAudience").value || "women interested in handmade products";
  var region = document.getElementById("calRegion").value;
  var city = document.getElementById("calCity").value;
  var voice = document.getElementById("calVoice").value;
  var price = document.getElementById("calPrice").value || "₹500-₹2500";
  var autoPilot = document.getElementById("calendarAutoPilot").checked;

  // Save prefs
  try {
    localStorage.setItem("stiche_cal_prefs", JSON.stringify({ products: products, audience: audience, region: region, city: city, voice: voice, price: price }));
  } catch(e) {}

  btn.disabled = true; btn.textContent = "Generating...";
  errorBox.classList.remove("active");
  resultsDiv.classList.remove("active");
  resultsDiv.innerHTML = "";
  loadingBox.classList.add("active");

  fetch("/api/run-calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: products, audience: audience, region: region, city: city, brandVoice: voice, priceRange: price, useBusinessContext: autoPilot })
  })
  .then(function(res) { return res.json(); })
  .then(function(json) {
    if (json.error) throw new Error(json.error);
    calendarData = json.data;
    loadingBox.classList.remove("active");
    renderCalendar(calendarData);
  })
  .catch(function(err) {
    loadingBox.classList.remove("active");
    errorBox.classList.add("active");
    document.getElementById("calErrorMessage").textContent = err.message || "Something went wrong.";
  })
  .finally(function() {
    btn.disabled = false;
    btn.textContent = "Generate Weekly Calendar";
  });
});

function renderCalendar(data) {
  var resultsDiv = document.getElementById("calResults");
  var html = '';

  // Export bar
  html += '<div class="result-block export-bar"><button class="btn-export" onclick="exportCalendarText()">Export Calendar as Text</button></div>';

  // Weekly theme
  if (data.weeklyTheme) {
    html += '<div class="result-block"><div class="insight"><div class="insight-label">This Week\'s Theme</div><div class="insight-text">' + esc(data.weeklyTheme) + '</div></div></div>';
  }

  // Days
  if (data.days && data.days.length) {
    html += '<div class="result-block"><div class="cal-week">';
    var dayLabels = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

    data.days.forEach(function(day, i) {
      html += '<div class="cal-day-card" id="calDay' + i + '">';
      html += '<div class="cal-day-header"><span class="cal-day-name">' + esc(day.day) + '</span><span class="cal-format">' + esc(day.format) + '</span></div>';
      html += '<div class="cal-theme">' + esc(day.theme) + '</div>';
      html += '<div class="cal-hook">' + esc(day.hook) + '</div>';
      html += '<div class="cal-caption">' + esc(day.caption) + '</div>';
      if (day.bestTime) html += '<div class="cal-time">Best time: <strong>' + esc(day.bestTime) + '</strong></div>';

      if (day.hashtags && day.hashtags.length) {
        html += '<div class="tag-cloud" style="margin-bottom:10px">';
        day.hashtags.forEach(function(tag) { html += '<span class="tag">' + esc(tag) + '</span>'; });
        html += '</div>';
      }

      if (day.story && day.story.length) {
        html += '<div class="cal-story"><div class="cal-story-label">Story Script</div>';
        day.story.forEach(function(s) {
          html += '<div class="cal-story-slide">Slide ' + s.slide + ': ' + esc(s.content) + '</div>';
          if (s.sticker && s.sticker !== "none") html += '<div class="cal-story-sticker">Sticker: ' + esc(s.sticker) + '</div>';
        });
        html += '</div>';
      }

      html += '<div class="cal-btns"><button class="copy-sm" onclick="copyCalDay(' + i + ')">Copy Day</button></div>';
      html += '</div>';
    });
    html += '</div></div>';
  }

  // Trend briefing
  if (data.trendBriefing) {
    html += '<div class="result-block"><div class="cal-briefing"><div class="cal-briefing-label">Weekly Trend Briefing</div><div class="cal-briefing-text">' + esc(data.trendBriefing) + '</div></div></div>';
  }

  resultsDiv.innerHTML = html;
  resultsDiv.classList.add("active");
  resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

function copyCalDay(idx) {
  if (!calendarData || !calendarData.days || !calendarData.days[idx]) return;
  var d = calendarData.days[idx];
  var text = d.day + " — " + d.format + "\n\n";
  text += d.hook + "\n\n" + d.caption + "\n\n";
  if (d.hashtags) text += d.hashtags.join(" ") + "\n\n";
  if (d.bestTime) text += "Best time: " + d.bestTime;
  navigator.clipboard.writeText(text);
}

function exportCalendarText() {
  if (!calendarData) return;
  var text = "STICHE WEEKLY CONTENT CALENDAR\n";
  text += "Generated: " + new Date().toLocaleDateString() + "\n";
  if (calendarData.weeklyTheme) text += "Theme: " + calendarData.weeklyTheme + "\n";
  text += "═".repeat(50) + "\n\n";

  if (calendarData.days) {
    calendarData.days.forEach(function(d) {
      text += "──── " + d.day.toUpperCase() + " (" + d.format + ") ────\n";
      text += "Theme: " + d.theme + "\n";
      text += "Hook: " + d.hook + "\n\n";
      text += d.caption + "\n\n";
      if (d.hashtags) text += d.hashtags.join(" ") + "\n\n";
      if (d.bestTime) text += "Best time: " + d.bestTime + "\n";
      if (d.story) {
        text += "\nStory Script:\n";
        d.story.forEach(function(s) { text += "  Slide " + s.slide + ": " + s.content + "\n"; });
      }
      text += "\n";
    });
  }

  if (calendarData.trendBriefing) text += "\nTREND BRIEFING:\n" + calendarData.trendBriefing + "\n";

  var blob = new Blob([text], { type: "text/plain" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stiche-calendar-" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click();
}

// Use esc from app.js
if (typeof esc === "undefined") {
  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
}
