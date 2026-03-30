// ─── ORDER TRACKER ──────────────────────────────────────────────────
var orders = [];
var currentFilter = "all";
var STATUSES = ["New", "Making", "Packed", "Shipped", "Delivered"];

// Load orders from server
function loadOrders() {
  fetch("/api/orders")
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.ok) {
        orders = json.data;
        renderOrders();
      }
    });
}
loadOrders();

function genId() { return "ORD-" + Date.now().toString(36).toUpperCase(); }

// ─── DASHBOARD ──────────────────────────────────────────────────────
function updateDashboard() {
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var weekEnd = new Date(now.getTime() + 7 * 86400000);

  var active = 0, revenue = 0, pending = 0, dueWeek = 0;
  orders.forEach(function(o) {
    if (o.status !== "Delivered") active++;
    var orderDate = new Date(o.createdAt);
    if (orderDate >= monthStart) revenue += o.price || 0;
    if (o.payment === "Pending") pending += o.price || 0;
    if (o.status !== "Delivered" && o.deliveryDate) {
      var dd = new Date(o.deliveryDate);
      if (dd <= weekEnd) dueWeek++;
    }
  });

  document.getElementById("dashActive").textContent = active;
  document.getElementById("dashRevenue").textContent = "₹" + revenue.toLocaleString("en-IN");
  document.getElementById("dashPending").textContent = "₹" + pending.toLocaleString("en-IN");
  document.getElementById("dashDueWeek").textContent = dueWeek;
}

// ─── RENDER ORDERS ──────────────────────────────────────────────────
function renderOrders() {
  var list = document.getElementById("orderList");
  var search = (document.getElementById("orderSearch").value || "").toLowerCase();
  var now = new Date();

  var filtered = orders.filter(function(o) {
    if (currentFilter !== "all" && o.status !== currentFilter) return false;
    if (search && !(o.customerName || "").toLowerCase().includes(search) && !(o.item || "").toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort: overdue first, then by created date descending
  filtered.sort(function(a, b) {
    var aOver = a.status !== "Delivered" && a.deliveryDate && new Date(a.deliveryDate) < now;
    var bOver = b.status !== "Delivered" && b.deliveryDate && new Date(b.deliveryDate) < now;
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="order-empty">' + (orders.length === 0 ? 'No orders yet. Click "+ Add Order" to start tracking.' : "No orders match your filter.") + '</div>';
    updateDashboard();
    return;
  }

  var html = '';
  filtered.forEach(function(o) {
    var isOverdue = o.status !== "Delivered" && o.deliveryDate && new Date(o.deliveryDate) < now;
    html += '<div class="order-card' + (isOverdue ? ' overdue' : '') + '">';
    html += '<div class="order-top"><span class="order-name">' + escO(o.customerName) + (isOverdue ? ' (overdue)' : '') + '</span><span class="order-status-badge ' + o.status + '">' + o.status + '</span></div>';
    html += '<div class="order-details">';
    html += '<span class="order-detail-label">Item</span><span>' + escO(o.item) + '</span>';
    html += '<span class="order-detail-label">Price</span><span>₹' + (o.price || 0).toLocaleString("en-IN") + '</span>';
    html += '<span class="order-detail-label">Payment</span><span class="order-payment ' + o.payment + '">' + o.payment + '</span>';
    html += '<span class="order-detail-label">Delivery</span><span>' + (o.deliveryDate ? formatDate(o.deliveryDate) : "—") + '</span>';
    if (o.contact) { html += '<span class="order-detail-label">Contact</span><span>' + escO(o.contact) + '</span>'; }
    if (o.notes) { html += '<span class="order-detail-label">Notes</span><span>' + escO(o.notes) + '</span>'; }
    html += '</div>';

    html += '<div class="order-actions-row">';
    // Status change buttons
    var idx = STATUSES.indexOf(o.status);
    if (idx < STATUSES.length - 1) {
      html += '<button class="order-action-btn" onclick="updateStatus(\'' + o.id + '\',\'' + STATUSES[idx + 1] + '\')">→ ' + STATUSES[idx + 1] + '</button>';
    }
    html += '<button class="order-action-btn wa" onclick="generateWAMessage(\'' + o.id + '\')">WhatsApp</button>';
    html += '<button class="order-action-btn" onclick="editOrder(\'' + o.id + '\')">Edit</button>';
    html += '<button class="order-action-btn delete" onclick="deleteOrder(\'' + o.id + '\')">Delete</button>';
    html += '</div></div>';
  });

  list.innerHTML = html;
  updateDashboard();
}

// ─── FILTER ─────────────────────────────────────────────────────────
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".filter-chip").forEach(function(c) {
    c.classList.toggle("active", c.dataset.filter === f);
  });
  renderOrders();
}

// ─── ORDER MODAL ────────────────────────────────────────────────────
function openOrderModal(id) {
  var modal = document.getElementById("orderModal");
  var title = document.getElementById("modalTitle");
  document.getElementById("orderId").value = "";
  document.getElementById("orderName").value = "";
  document.getElementById("orderContact").value = "";
  document.getElementById("orderItem").value = "";
  document.getElementById("orderPrice").value = "";
  document.getElementById("orderPayment").value = "Paid";
  document.getElementById("orderDelivery").value = "";
  document.getElementById("orderNotes").value = "";

  if (id) {
    var o = orders.find(function(x) { return x.id === id; });
    if (o) {
      title.textContent = "Edit Order";
      document.getElementById("orderId").value = o.id;
      document.getElementById("orderName").value = o.customerName;
      document.getElementById("orderContact").value = o.contact || "";
      document.getElementById("orderItem").value = o.item;
      document.getElementById("orderPrice").value = o.price;
      document.getElementById("orderPayment").value = o.payment;
      document.getElementById("orderDelivery").value = o.deliveryDate || "";
      document.getElementById("orderNotes").value = o.notes || "";
    }
  } else {
    title.textContent = "Add New Order";
  }
  modal.classList.add("active");
}

function closeOrderModal() { document.getElementById("orderModal").classList.remove("active"); }

function saveOrder(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  var oldText = btn.textContent;
  btn.disabled = true; btn.textContent = "Saving...";

  var id = document.getElementById("orderId").value;
  var orderData = {
    id: id || genId(),
    customerName: document.getElementById("orderName").value,
    contact: document.getElementById("orderContact").value,
    item: document.getElementById("orderItem").value,
    price: parseFloat(document.getElementById("orderPrice").value) || 0,
    payment: document.getElementById("orderPayment").value,
    deliveryDate: document.getElementById("orderDelivery").value,
    notes: document.getElementById("orderNotes").value,
  };

  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  })
  .then(function(res) { return res.json(); })
  .then(function(json) {
    if (json.ok) {
      orders = json.data;
      closeOrderModal();
      renderOrders();
    }
  })
  .finally(function() { btn.disabled = false; btn.textContent = oldText; });
}

function editOrder(id) { openOrderModal(id); }

function deleteOrder(id) {
  if (!confirm("Delete this order?")) return;
  fetch("/api/orders/" + id, { method: "DELETE" })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.ok) { orders = json.data; renderOrders(); }
    });
}

// ─── STATUS UPDATE ──────────────────────────────────────────────────
function updateStatus(id, newStatus) {
  var o = orders.find(function(x) { return x.id === id; });
  if (!o) return;
  
  fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({}, o, { status: newStatus }))
  })
  .then(function(res) { return res.json(); })
  .then(function(json) {
    if (json.ok) {
      orders = json.data;
      renderOrders();
      generateWAMessage(id);
    }
  });
}

// ─── WHATSAPP MESSAGE ───────────────────────────────────────────────
function generateWAMessage(id) {
  var o = orders.find(function(x) { return x.id === id; });
  if (!o) return;

  var modal = document.getElementById("whatsappModal");
  var statusBar = document.getElementById("waStatusBar");
  var msgText = document.getElementById("waMessageText");

  statusBar.innerHTML = '<span class="order-status-badge ' + o.status + '">' + o.status + '</span> <span style="font-size:12px;color:var(--text-sub)">' + escO(o.customerName) + ' · ' + escO(o.item) + '</span>';
  msgText.textContent = "";
  modal.classList.add("active");

  var recentTrends = [];
  try { recentTrends = JSON.parse(localStorage.getItem("stiche_recent_trends") || "[]"); } catch(e){}

  fetch("/api/generate-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName: o.customerName, item: o.item, status: o.status, language: "English", recentTrends: recentTrends })
  })
  .then(function(res) { return res.json(); })
  .then(function(json) {
    if (json.error) throw new Error(json.error);
    msgText.textContent = json.message;
  })
  .catch(function(err) {
    msgText.textContent = "Error: " + err.message;
  });
}

function closeWhatsappModal() { document.getElementById("whatsappModal").classList.remove("active"); }

function copyWAMessage() {
  var msg = document.getElementById("waMessageText").textContent;
  var btn = document.getElementById("waCopyBtn");
  if (!msg) return;
  navigator.clipboard.writeText(msg).then(function() {
    btn.textContent = "Copied!"; btn.classList.add("copied");
    setTimeout(function() { btn.textContent = "Copy Message"; btn.classList.remove("copied"); }, 2000);
  });
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────
function exportCSV() {
  if (!orders.length) { alert("No orders to export."); return; }
  var rows = [["Order ID", "Customer", "Contact", "Item", "Price", "Payment", "Status", "Delivery Date", "Notes", "Created"]];
  orders.forEach(function(o) {
    rows.push([o.id, o.customerName, o.contact || "", o.item, o.price, o.payment, o.status, o.deliveryDate || "", o.notes || "", o.createdAt]);
  });
  var csv = rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  var blob = new Blob([csv], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stiche-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
}

// ─── UTILITIES ──────────────────────────────────────────────────────
function escO(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function formatDate(d) {
  var dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Initial render is handled by loadOrders()
