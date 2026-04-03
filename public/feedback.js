// public/feedback.js
// ─── Feedback Card + Silent Behavior Tracker ─────────────────────────
// Runs after every result render.
// - Shows a one-tap emoji feedback card
// - Silently tracks copies, PDF, scroll depth, session duration

(function () {
  var SESSION_ID = localStorage.getItem("stiche_session_id") || "";
  var currentSearchId = null;
  var resultStartTime = null;
  var feedbackGiven = false;

  // ── Get session ID ──────────────────────────────────────────────
  function getSessionId() {
    var sid = localStorage.getItem("stiche_session_id");
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("stiche_session_id", sid);
    }
    SESSION_ID = sid;
    return sid;
  }
  getSessionId();

  // ── Post behavior event (fire-and-forget) ───────────────────────
  function trackBehavior(action, extra) {
    if (!currentSearchId || !SESSION_ID) return;
    var payload = Object.assign({ sessionId: SESSION_ID, searchId: currentSearchId, action: action }, extra || {});
    fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  }

  // ── Post feedback emoji ──────────────────────────────────────────
  function submitFeedback(emoji) {
    if (!currentSearchId || !SESSION_ID || feedbackGiven) return;
    feedbackGiven = true;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, searchId: currentSearchId, emoji: emoji }),
    }).catch(function () {});
  }

  // ── Render feedback card ─────────────────────────────────────────
  function renderFeedbackCard(searchId) {
    currentSearchId = searchId;
    feedbackGiven = false;
    resultStartTime = Date.now();

    var existing = document.getElementById("feedbackCard");
    if (existing) existing.remove();

    var card = document.createElement("div");
    card.id = "feedbackCard";
    card.className = "result-block feedback-card";
    card.innerHTML = [
      '<div class="feedback-inner">',
        '<div class="feedback-label">🤖 Was this helpful for your shop?</div>',
        '<div class="feedback-emojis">',
          '<button class="feedback-emoji-btn" id="fb-love" onclick="window._feedback(\'love\')" title="Loved it">😍</button>',
          '<button class="feedback-emoji-btn" id="fb-good" onclick="window._feedback(\'good\')" title="Pretty good">👍</button>',
          '<button class="feedback-emoji-btn" id="fb-meh"  onclick="window._feedback(\'meh\')"  title="Could be better">😐</button>',
          '<button class="feedback-emoji-btn" id="fb-bad"  onclick="window._feedback(\'bad\')"  title="Not helpful">👎</button>',
        '</div>',
        '<div class="feedback-hint">(One tap, that\'s it — helps the AI learn your shop)</div>',
      '</div>',
    ].join("");

    // Insert at top of results
    var results = document.getElementById("results");
    if (results && results.firstChild) {
      results.insertBefore(card, results.firstChild);
    } else if (results) {
      results.appendChild(card);
    }
  }

  // ── Feedback tap handler ─────────────────────────────────────────
  window._feedback = function (emoji) {
    submitFeedback(emoji);
    var card = document.getElementById("feedbackCard");
    if (!card) return;
    var labels = { love: "Thank you! I'll keep this up 🙏", good: "Got it, noted! 👍", meh: "I'll do better next time 💪", bad: "Sorry! I'll adjust for next search 🔧" };
    card.querySelector(".feedback-inner").innerHTML = '<div class="feedback-thanks">' + (labels[emoji] || "Thanks!") + '</div>';
    setTimeout(function () {
      if (card && card.parentNode) card.parentNode.removeChild(card);
    }, 2000);
  };

  // ── Track session duration on unload ───────────────────────────
  window.addEventListener("beforeunload", function () {
    if (!currentSearchId || !resultStartTime) return;
    var ms = Date.now() - resultStartTime;
    trackBehavior("session_end", { timeOnResultsMs: ms });
  });

  // ── Intercept copy buttons ───────────────────────────────────────
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;

    // Detect which section was copied
    var section = null;
    if (btn.id === "copyCaptionBtn" || btn.classList.contains("copy-caption")) section = "caption";
    else if (btn.id === "copyHashtagsBtn") section = "hashtags";
    else if (btn.id === "copyAllBtn") section = "all";
    else if (btn.classList.contains("copy-sm")) {
      // Detect parent section
      var block = btn.closest("[data-section]") || btn.closest(".result-block");
      if (block) {
        var h = block.querySelector("h2");
        if (h && /hook/i.test(h.textContent)) section = "hooks";
        else if (h && /caption/i.test(h.textContent)) section = "caption";
        else if (h && /hashtag/i.test(h.textContent)) section = "hashtags";
        else section = "content";
      }
    } else if (btn.id === "exportPdfBtn") {
      trackBehavior("pdf");
      return;
    }

    if (section) trackBehavior("copy", { section: section });
  });

  // ── Public API: called from app.js after results render ─────────
  window.initFeedbackTracker = function (searchId) {
    renderFeedbackCard(searchId);
  };

  window.getFeedbackSessionId = function () { return SESSION_ID; };

})();

// ── "AI Got Smarter" Card ────────────────────────────────────────────
async function loadAISmarterCard() {
  var sid = window.getFeedbackSessionId ? window.getFeedbackSessionId() : localStorage.getItem("stiche_session_id");
  if (!sid) return;

  try {
    var res = await fetch("/api/learning-memory?sessionId=" + encodeURIComponent(sid));
    var json = await res.json();
    if (!json.ok || !json.data) return;

    var mem = json.data;
    if (mem.totalSearches < 2) return; // Only show after 2+ searches

    var existing = document.getElementById("aiSmarterCard");
    if (existing) existing.remove();

    var stars = "⭐".repeat(mem.learningLevel) + "☆".repeat(5 - mem.learningLevel);
    var insightHtml = (mem.insights || []).map(function (i) {
      return '<div class="smarter-insight">✓ ' + i + '</div>';
    }).join("");

    var card = document.createElement("div");
    card.id = "aiSmarterCard";
    card.className = "ai-smarter-card";
    card.innerHTML = [
      '<div class="smarter-header">',
        '<span class="smarter-icon">🧠</span>',
        '<div>',
          '<div class="smarter-title">Your AI knows your business now</div>',
          '<div class="smarter-stars">' + stars + ' Level ' + mem.learningLevel + '/5</div>',
        '</div>',
        '<button class="smarter-close" onclick="this.closest(\'#aiSmarterCard\').remove()">×</button>',
      '</div>',
      insightHtml ? '<div class="smarter-insights">' + insightHtml + '</div>' : '',
      '<div class="smarter-footer">',
        '<span>' + mem.totalSearches + ' searches done</span>',
        '<span>Next search will be even smarter ✨</span>',
      '</div>',
    ].join("");

    // Insert before tab bar
    var tabBar = document.getElementById("tabBar");
    if (tabBar && tabBar.parentNode) {
      tabBar.parentNode.insertBefore(card, tabBar);
    }
  } catch (e) { /* silently ignore */ }
}

// Load the smarter card on page ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAISmarterCard);
} else {
  loadAISmarterCard();
}
