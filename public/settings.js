// ─── SETTINGS PANEL + CSV EXPORT + FESTIVAL WIDGET ───────────────────────

var FESTIVALS = [
  { name: "Holi",            date: "2026-03-14", days: 10 },
  { name: "Ram Navami",      date: "2026-04-06", days: 10 },
  { name: "Eid ul-Fitr",     date: "2026-04-01", days: 10 },
  { name: "Akshaya Tritiya", date: "2026-04-29", days: 12 },
  { name: "Mother's Day",    date: "2026-05-10", days: 12 },
  { name: "Eid ul-Adha",     date: "2026-06-07", days: 10 },
  { name: "Raksha Bandhan",  date: "2026-08-09", days: 14 },
  { name: "Janmashtami",     date: "2026-08-23", days: 10 },
  { name: "Ganesh Chaturthi",date: "2026-09-11", days: 12 },
  { name: "Navratri",        date: "2026-09-22", days: 14 },
  { name: "Dussehra",        date: "2026-10-02", days: 12 },
  { name: "Karwa Chauth",    date: "2026-10-18", days: 10 },
  { name: "Diwali",          date: "2026-10-20", days: 21 },
  { name: "Bhai Dooj",       date: "2026-10-23", days: 10 },
  { name: "Christmas",       date: "2026-12-25", days: 14 },
  { name: "New Year",        date: "2027-01-01", days: 10 },
];

// ── Init settings on page load ────────────────────────────────────────────
(function initSettings() {
  var shopName = localStorage.getItem('stiche_shop_name') || '';
  if (shopName) {
    var tagline = document.getElementById('shopNameTagline');
    if (tagline) tagline.textContent = shopName;
    var inp = document.getElementById('shopNameInput');
    if (inp) inp.value = shopName;
  }
  renderFestivalWidget();
})();

// ── Toggle settings drawer ────────────────────────────────────────────────
function toggleSettings() {
  var drawer = document.getElementById('settingsDrawer');
  if (!drawer) return;
  drawer.classList.toggle('open');
  // Populate shop name input
  var inp = document.getElementById('shopNameInput');
  if (inp) inp.value = localStorage.getItem('stiche_shop_name') || '';
}

// ── Save settings ─────────────────────────────────────────────────────────
function saveSettings() {
  var shopName = (document.getElementById('shopNameInput').value || '').trim();
  if (shopName) {
    localStorage.setItem('stiche_shop_name', shopName);
    var tagline = document.getElementById('shopNameTagline');
    if (tagline) tagline.textContent = shopName;
  }
  toggleSettings();
}

// ── Reset site key ────────────────────────────────────────────────────────
function resetSiteKey() {
  localStorage.removeItem('stiche_site_key');
  var newKey = prompt('Enter new site access key:') || '';
  if (newKey) {
    localStorage.setItem('stiche_site_key', newKey);
    alert('Site key updated. The page will reload.');
    window.location.reload();
  }
}

// ── Festival Widget ───────────────────────────────────────────────────────
function renderFestivalWidget() {
  var el = document.getElementById('festivalWidget');
  if (!el) return;
  var now = new Date();
  var upcoming = FESTIVALS
    .map(function(f) {
      var fd = new Date(f.date);
      var diffMs = fd - now;
      var diffDays = Math.ceil(diffMs / 86400000);
      return Object.assign({}, f, { diffDays: diffDays });
    })
    .filter(function(f) { return f.diffDays > 0 && f.diffDays <= 60; })
    .sort(function(a, b) { return a.diffDays - b.diffDays; })
    .slice(0, 4);

  if (!upcoming.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">No major festivals in the next 60 days.</div>'; return; }

  el.innerHTML = upcoming.map(function(f) {
    var urgent = f.diffDays <= f.days;
    return '<div class="festival-item' + (urgent ? ' urgent' : '') + '">' +
      '<div class="festival-name">' + f.name + '</div>' +
      '<div class="festival-days">' + f.diffDays + ' days away' + (urgent ? ' — start content now!' : '') + '</div>' +
    '</div>';
  }).join('');
}

// ── CSV Export ────────────────────────────────────────────────────────────
function exportCSV() {
  if (!window.orders || !orders.length) {
    alert('No orders to export yet.'); return;
  }
  var headers = ['Order ID', 'Customer', 'Contact', 'Item', 'Price (₹)', 'Status', 'Payment', 'Delivery Date', 'Notes', 'Created At'];
  var rows = orders.map(function(o) {
    return [
      o.id || '', o.customerName || '', o.contact || '', o.item || '',
      o.price || '0', o.status || '', o.payment || '',
      o.deliveryDate || '', (o.notes || '').replace(/,/g, ';'),
      (o.createdAt || '').slice(0, 10)
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  });

  var csv = [headers.join(',')].concat(rows).join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'stiche-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}
