import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./Admin.css";

// ── Status config ────────────────────────────────────────────────
const ALL_STATUSES = ["Confirmed", "Packed", "Shipped", "Delivered", "Delayed", "Cancelled"];

const STATUS_META = {
  confirmed: { label: "Confirmed", bg: "#e8f5e9", text: "#2e7d32", dot: "#43a047", icon: "✓" },
  packed:    { label: "Packed",    bg: "#e3f2fd", text: "#1565c0", dot: "#1e88e5", icon: "📦" },
  shipped:   { label: "Shipped",   bg: "#fff8e1", text: "#e65100", dot: "#ffb300", icon: "🚚" },
  delivered: { label: "Delivered", bg: "#e8f5e9", text: "#1b5e20", dot: "#2e7d32", icon: "✅" },
  delayed:   { label: "Delayed",   bg: "#fff3e0", text: "#bf360c", dot: "#ff6d00", icon: "⏳" },
  cancelled: { label: "Cancelled", bg: "#fce4ec", text: "#b71c1c", dot: "#e53935", icon: "✕"  },
};

const getMeta = (status) =>
  STATUS_META[status?.toLowerCase()] || STATUS_META.confirmed;

// ── Helpers ──────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return (
    d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
};

// ── Stat Card ────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: color + "22", color }}>
      {icon}
    </div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

// ── Status Badge ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const m = getMeta(status);
  return (
    <span className="status-badge" style={{ background: m.bg, color: m.text }}>
      <span className="status-dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

// ── Status Action Buttons ────────────────────────────────────────
const TRANSITIONS = {
  confirmed: ["Packed",    "Cancelled"],
  packed:    ["Shipped",   "Cancelled"],
  shipped:   ["Delivered", "Delayed",  "Cancelled"],
  delayed:   ["Shipped",   "Delivered","Cancelled"],
  delivered: [],
  cancelled: [],
};

const ActionButtons = ({ order, onStatusChange, updating }) => {
  const current  = order.status?.toLowerCase() || "confirmed";
  const nextSteps = TRANSITIONS[current] || [];

  if (nextSteps.length === 0) {
    return (
      <span className="action-final">
        {current === "delivered" ? "✅ Fulfilled" : "✕ Cancelled"}
      </span>
    );
  }

  return (
    <div className="action-buttons">
      {nextSteps.map((s) => {
        const m = getMeta(s);
        const isCancelBtn = s.toLowerCase() === "cancelled";
        return (
          <button
            key={s}
            className={`action-btn ${isCancelBtn ? "action-btn-cancel" : "action-btn-primary"}`}
            onClick={() => onStatusChange(order.id, s)}
            disabled={updating === order.id}
            title={`Mark as ${s}`}
          >
            {updating === order.id ? "…" : `→ ${s}`}
          </button>
        );
      })}
    </div>
  );
};

// ── Order Row (expanded / collapsed) ────────────────────────────
const OrderRow = ({ order, onStatusChange, updating }) => {
  const [expanded, setExpanded] = useState(false);
  const m = getMeta(order.status);

  return (
    <div className={`order-row ${expanded ? "expanded" : ""}`}>
      {/* Main row */}
      <div className="order-row-main" onClick={() => setExpanded((v) => !v)}>
        <div className="col-id">
          <span className="order-id-text">#{order.orderId}</span>
          <span className="order-date">{fmtDate(order.createdAt)}</span>
        </div>

        <div className="col-customer">
          <span className="customer-email">{order.userEmail || "—"}</span>
          <span className="customer-uid" title={order.userId}>
            {order.userId?.slice(0, 8)}…
          </span>
        </div>

        <div className="col-items">
          <span className="items-count">
            {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
          </span>
          <span className="items-preview">
            {order.items?.slice(0, 2).map((i) => i.image).join(" ")}
            {order.items?.length > 2 ? ` +${order.items.length - 2}` : ""}
          </span>
        </div>

        <div className="col-total">
          <strong>${(order.total || 0).toFixed(2)}</strong>
        </div>

        <div className="col-status">
          <StatusBadge status={order.status} />
        </div>

        <div className="col-actions" onClick={(e) => e.stopPropagation()}>
          <ActionButtons
            order={order}
            onStatusChange={onStatusChange}
            updating={updating}
          />
        </div>

        <button className="expand-btn" aria-label="Toggle details">
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="order-row-detail">
          <div className="detail-cols">
            {/* Items */}
            <div className="detail-items">
              <h4>Items</h4>
              {order.items?.map((item, i) => (
                <div key={i} className="detail-item">
                  <span className="detail-emoji">{item.image}</span>
                  <div className="detail-item-info">
                    <div className="detail-item-name">{item.name}</div>
                    <div className="detail-item-meta">
                      {item.brand} · Qty {item.quantity} · ${item.price?.toLocaleString()} each
                    </div>
                  </div>
                  <div className="detail-item-total">
                    ${(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="detail-summary">
              <h4>Order Summary</h4>
              <div className="summary-row"><span>Subtotal</span><span>${(order.subtotal || 0).toFixed(2)}</span></div>
              {order.discount > 0 && (
                <div className="summary-row discount"><span>Discount</span><span>−${(order.discount || 0).toFixed(2)}</span></div>
              )}
              <div className="summary-row"><span>Tax</span><span>${(order.tax || 0).toFixed(2)}</span></div>
              <div className="summary-row total"><span>Total Paid</span><span>${(order.total || 0).toFixed(2)}</span></div>

              <h4 style={{ marginTop: "1rem" }}>Timeline</h4>
              <div className="summary-row"><span>Placed</span><span>{fmtDateTime(order.createdAt)}</span></div>
              {order.statusUpdatedAt && (
                <div className="summary-row">
                  <span>Last Updated</span>
                  <span>{fmtDateTime(order.statusUpdatedAt)}</span>
                </div>
              )}
              {order.statusHistory?.slice().reverse().map((h, i) => (
                <div key={i} className="history-entry">
                  <StatusBadge status={h.status} />
                  <span className="history-date">{fmtDateTime(h.at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All status action buttons in detail */}
          <div className="detail-status-change">
            <span className="detail-status-label">Change status to:</span>
            {ALL_STATUSES.filter(
              (s) => s.toLowerCase() !== order.status?.toLowerCase()
            ).map((s) => {
              const sm = getMeta(s);
              return (
                <button
                  key={s}
                  className="detail-status-btn"
                  style={{ borderColor: sm.dot, color: sm.text, background: sm.bg }}
                  onClick={() => onStatusChange(order.id, s)}
                  disabled={updating === order.id}
                >
                  {sm.icon} {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Admin Component ─────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();

  const [authUser,   setAuthUser]   = useState(undefined);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [authLoading,setAuthLoading]= useState(true);

  const [orders,     setOrders]     = useState([]);
  const [ordLoading, setOrdLoading] = useState(true);

  const [search,     setSearch]     = useState("");
  const [filterSt,   setFilterSt]   = useState("All");
  const [sortBy,     setSortBy]     = useState("newest");
  const [updating,   setUpdating]   = useState(null);  // orderId being updated
  const [toast,      setToast]      = useState(null);  // { msg, type }

  // ── Auth + admin role check ──────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user) { setIsAdmin(false); setAuthLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : "user";
        setIsAdmin(role === "admin");
      } catch (e) {
        console.error("[Admin] Role check failed:", e.message);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Real-time orders listener (admin sees ALL orders) ────────
  useEffect(() => {
    if (!isAdmin) return;

    setOrdLoading(true);
    const q = query(collection(db, "orders"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(data);
        setOrdLoading(false);
      },
      (err) => {
        console.error("[Admin] Orders listener error:", err.message);
        setOrdLoading(false);
      }
    );
    return unsub;
  }, [isAdmin]);

  // ── Status change ─────────────────────────────────────────────
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      const orderRef  = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      const prev      = orderSnap.data();

      // Build status history entry
      const historyEntry = {
        status: prev.status,
        at:     prev.statusUpdatedAt || prev.createdAt || new Date().toISOString(),
      };

      await updateDoc(orderRef, {
        status:            newStatus.toLowerCase(),
        statusUpdatedAt:   serverTimestamp(),
        statusHistory:     [...(prev.statusHistory || []), historyEntry],
        updatedAt:         serverTimestamp(),
      });

      showToast(`Order #${prev.orderId} → ${newStatus}`, "success");
    } catch (e) {
      console.error("[Admin] Status update failed:", e.message);
      showToast("Update failed: " + e.message, "error");
    }
    setUpdating(null);
  }, []);

  // ── Toast helper ─────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived stats ────────────────────────────────────────────
  const revenue    = orders.reduce((s, o) => s + (o.total || 0), 0);
  const today      = new Date().toDateString();
  const todayCount = orders.filter((o) => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    return d.toDateString() === today;
  }).length;
  const activeOrders = orders.filter((o) =>
    ["confirmed","packed","shipped","delayed"].includes(o.status?.toLowerCase())
  ).length;

  // ── Filter + search + sort ───────────────────────────────────
  const visible = orders
    .filter((o) => {
      if (filterSt !== "All" && o.status?.toLowerCase() !== filterSt.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.orderId?.toLowerCase().includes(q) ||
          o.userEmail?.toLowerCase().includes(q) ||
          o.items?.some((i) => i.name?.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      if (sortBy === "newest")  return tb - ta;
      if (sortBy === "oldest")  return ta - tb;
      if (sortBy === "highest") return (b.total || 0) - (a.total || 0);
      if (sortBy === "lowest")  return (a.total || 0) - (b.total || 0);
      return 0;
    });

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status?.toLowerCase() === s.toLowerCase()).length;
    return acc;
  }, {});

  // ── Render: resolving auth ───────────────────────────────────
  if (authLoading || authUser === undefined) {
    return (
      <div className="adm-root">
        <div className="adm-loading"><div className="adm-spinner" />Loading…</div>
      </div>
    );
  }

  // ── Render: not logged in ────────────────────────────────────
  if (!authUser) {
    return (
      <div className="adm-root">
        <div className="adm-gate">
          <div className="gate-icon">🔐</div>
          <h2>Admin Access</h2>
          <p>Please sign in with an admin account to continue.</p>
          <button className="adm-btn-primary" onClick={() => navigate("/login")}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Render: not admin ────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="adm-root">
        <div className="adm-gate">
          <div className="gate-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>
            Your account <strong>({authUser.email})</strong> does not have
            admin privileges.
          </p>
          <p className="gate-hint">
            To grant admin access, update the <code>role</code> field in<br />
            Firestore → <code>users/{authUser.uid}</code> → <code>role: "admin"</code>
          </p>
          <button className="adm-btn-primary" onClick={() => navigate("/")}>
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  // ── Render: admin dashboard ──────────────────────────────────
  return (
    <div className="adm-root">
      {/* ── Top bar ── */}
      <header className="adm-header">
        <div className="adm-header-left">
          <span className="adm-logo">🛍️</span>
          <div>
            <div className="adm-title">ShopZone Admin</div>
            <div className="adm-subtitle">Order Management Portal</div>
          </div>
        </div>
        <div className="adm-header-right">
          <span className="adm-user-badge">👤 {authUser.email}</span>
          <button className="adm-btn-ghost" onClick={() => navigate("/")}>
            ← Back to Store
          </button>
        </div>
      </header>

      <div className="adm-body">
        {/* ── Stats Row ── */}
        <div className="stats-row">
          <StatCard icon="📋" label="Total Orders"  value={orders.length}         color="#282c3f" />
          <StatCard icon="💰" label="Total Revenue" value={`$${revenue.toFixed(2)}`} color="#2e7d32"
            sub={`avg $${orders.length ? (revenue / orders.length).toFixed(0) : 0}/order`} />
          <StatCard icon="🔄" label="Active Orders" value={activeOrders}           color="#1e88e5"
            sub="confirmed + packed + shipped" />
          <StatCard icon="🆕" label="Orders Today"  value={todayCount}             color="#ff3f6c" />
        </div>

        {/* ── Status Filter Strip ── */}
        <div className="filter-strip">
          <button
            className={`filter-chip ${filterSt === "All" ? "active" : ""}`}
            onClick={() => setFilterSt("All")}
          >
            All
            <span className="chip-count">{orders.length}</span>
          </button>
          {ALL_STATUSES.map((s) => {
            const m = getMeta(s);
            const cnt = statusCounts[s] || 0;
            return (
              <button
                key={s}
                className={`filter-chip ${filterSt === s ? "active" : ""}`}
                style={filterSt === s ? { background: m.bg, color: m.text, borderColor: m.dot } : {}}
                onClick={() => setFilterSt(s)}
              >
                {m.icon} {s}
                {cnt > 0 && <span className="chip-count">{cnt}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Search + Sort ── */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by order ID, customer email or product name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest value</option>
            <option value="lowest">Lowest value</option>
          </select>
        </div>

        {/* ── Table header ── */}
        {!ordLoading && visible.length > 0 && (
          <div className="orders-table-header">
            <div className="col-id">ORDER ID</div>
            <div className="col-customer">CUSTOMER</div>
            <div className="col-items">ITEMS</div>
            <div className="col-total">TOTAL</div>
            <div className="col-status">STATUS</div>
            <div className="col-actions">ACTIONS</div>
            <div style={{ width: 32 }} />
          </div>
        )}

        {/* ── Orders list ── */}
        {ordLoading ? (
          <div className="adm-loading">
            <div className="adm-spinner" /> Loading orders…
          </div>
        ) : visible.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">{search || filterSt !== "All" ? "🔍" : "📭"}</div>
            <p>
              {search
                ? `No orders match "${search}"`
                : filterSt !== "All"
                ? `No ${filterSt} orders`
                : "No orders have been placed yet."}
            </p>
            {(search || filterSt !== "All") && (
              <button
                className="adm-btn-ghost"
                onClick={() => { setSearch(""); setFilterSt("All"); }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            <div className="results-meta">
              Showing {visible.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
            </div>
            {visible.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                updating={updating}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Admin;
