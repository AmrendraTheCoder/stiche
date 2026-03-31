// ─── ANALYTICS DASHBOARD ─────────────────────────────────────────────────
// Reads live order data and renders 4 Chart.js charts.
// Re-renders whenever the Analytics tab is clicked.

var anlCharts = {};

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  if (btn.dataset.tab === 'analytics') {
    btn.addEventListener('click', function() { renderAnalytics(); });
  }
});

function renderAnalytics() {
  fetch('/api/orders', { headers: { 'x-site-key': getSiteKey() } })
    .then(function(r) { return r.json(); })
    .then(function(json) {
      var orders = (json.ok ? json.data : []) || [];
      if (!orders.length) {
        document.getElementById('analyticsGrid').style.display = 'none';
        document.getElementById('anlEmpty').style.display = 'block';
        return;
      }
      document.getElementById('analyticsGrid').style.display = 'block';
      document.getElementById('anlEmpty').style.display = 'none';

      // ── KPI cards ────────────────────────────────────────────────────
      var totalRev = orders.reduce(function(s, o) { return s + (Number(o.price) || 0); }, 0);
      var avgOrder = orders.length ? Math.round(totalRev / orders.length) : 0;
      var unpaid   = orders.filter(function(o) { return o.payment === 'Pending' || o.payment === 'Partial'; })
                           .reduce(function(s, o) { return s + (Number(o.price) || 0); }, 0);

      document.getElementById('anlRevenue').textContent    = '₹' + fmt(totalRev);
      document.getElementById('anlAvgOrder').textContent   = '₹' + fmt(avgOrder);
      document.getElementById('anlTotalOrders').textContent = orders.length;
      document.getElementById('anlPendingPay').textContent = '₹' + fmt(unpaid);

      buildRevenueChart(orders);
      buildStatusChart(orders);
      buildProductsChart(orders);
      buildMonthlyChart(orders);
    });
}

function fmt(n) { return (n || 0).toLocaleString('en-IN'); }
function getSiteKey() { return localStorage.getItem('stiche_site_key') || ''; }

// ── Revenue: last 30 days daily ───────────────────────────────────────────
function buildRevenueChart(orders) {
  var days = 30;
  var labels = [], dataMap = {};
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5)); // MM-DD
    dataMap[key] = 0;
  }
  orders.forEach(function(o) {
    var key = (o.createdAt || '').slice(0, 10);
    if (dataMap[key] !== undefined) dataMap[key] += (Number(o.price) || 0);
  });
  var data = labels.map(function(l, i) {
    var fullKey = Object.keys(dataMap)[i];
    return dataMap[fullKey] || 0;
  });

  destroyChart('revenueChart');
  anlCharts['revenueChart'] = new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label: 'Revenue (₹)', data: data, borderColor: '#6c5ce7', backgroundColor: 'rgba(108,92,231,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#6c5ce7' }]
    },
    options: chartOpts({ axes: true, yPrefix: '₹' })
  });
}

// ── Orders by Status donut ────────────────────────────────────────────────
function buildStatusChart(orders) {
  var counts = { New: 0, Making: 0, Packed: 0, Shipped: 0, Delivered: 0 };
  orders.forEach(function(o) { if (counts[o.status] !== undefined) counts[o.status]++; });
  destroyChart('statusChart');
  anlCharts['statusChart'] = new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#a29bfe', '#fdcb6e', '#74b9ff', '#00cec9', '#1a9e6e'], borderWidth: 0 }]
    },
    options: Object.assign(chartOpts({ axes: false }), { cutout: '65%' })
  });
}

// ── Top products bar ──────────────────────────────────────────────────────
function buildProductsChart(orders) {
  var map = {};
  orders.forEach(function(o) {
    if (!o.item) return;
    var k = o.item.trim();
    map[k] = (map[k] || 0) + (Number(o.price) || 0);
  });
  var sorted = Object.entries(map).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 6);
  destroyChart('productsChart');
  anlCharts['productsChart'] = new Chart(document.getElementById('productsChart'), {
    type: 'bar',
    data: {
      labels: sorted.map(function(x) { return x[0].length > 16 ? x[0].slice(0, 16) + '…' : x[0]; }),
      datasets: [{ label: 'Revenue (₹)', data: sorted.map(function(x) { return x[1]; }), backgroundColor: 'rgba(108,92,231,0.75)', borderRadius: 6, borderSkipped: false }]
    },
    options: chartOpts({ axes: true, yPrefix: '₹', indexAxis: 'y' })
  });
}

// ── Monthly revenue bar ───────────────────────────────────────────────────
function buildMonthlyChart(orders) {
  var map = {};
  orders.forEach(function(o) {
    var key = (o.createdAt || '').slice(0, 7); // YYYY-MM
    if (key) map[key] = (map[key] || 0) + (Number(o.price) || 0);
  });
  var sorted = Object.entries(map).sort(function(a, b) { return a[0] > b[0] ? 1 : -1; }).slice(-12);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var labels = sorted.map(function(x) { var m = parseInt(x[0].slice(5)) - 1; return months[m] + ' ' + x[0].slice(2, 4); });
  destroyChart('monthlyChart');
  anlCharts['monthlyChart'] = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Revenue (₹)', data: sorted.map(function(x) { return x[1]; }), backgroundColor: 'rgba(108,92,231,0.7)', borderRadius: 8 }]
    },
    options: chartOpts({ axes: true, yPrefix: '₹' })
  });
}

function destroyChart(id) {
  if (anlCharts[id]) { anlCharts[id].destroy(); delete anlCharts[id]; }
}

function chartOpts(cfg) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: cfg.indexAxis || 'x',
    plugins: {
      legend: { display: cfg.axes === false, position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11, family: 'Inter' }, color: '#5a5a7a' } },
      tooltip: { callbacks: { label: function(ctx) { return (cfg.yPrefix || '') + ctx.parsed[cfg.indexAxis === 'y' ? 'x' : 'y'].toLocaleString('en-IN'); } } }
    },
    scales: cfg.axes === false ? {} : {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9090aa', font: { size: 10 }, maxRotation: 0 } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9090aa', font: { size: 10 }, callback: function(v) { return (cfg.yPrefix || '') + v.toLocaleString('en-IN'); } } }
    }
  };
}
