import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./Orders.css";

// ── Status config ───────────────────────────────────────────────
const STATUS_STEPS  = ["Confirmed", "Packed", "Shipped", "Delivered"];
const STATUS_COLORS = {
  confirmed: { bg: "#e8f5e9", text: "#2e7d32", dot: "#43a047" },
  packed:    { bg: "#e3f2fd", text: "#1565c0", dot: "#1e88e5" },
  shipped:   { bg: "#fff8e1", text: "#e65100", dot: "#ffb300" },
  delivered: { bg: "#e8f5e9", text: "#1b5e20", dot: "#2e7d32" },
  delayed:   { bg: "#fff3e0", text: "#bf360c", dot: "#ff6d00" },
  cancelled: { bg: "#fce4ec", text: "#b71c1c", dot: "#e53935" },
};

const statusStep = (status) =>
  STATUS_STEPS.findIndex((s) => s.toLowerCase() === status?.toLowerCase());

// ── Helpers ─────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const fmtTime = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

// ─── Delivery Timeline ───────────────────────────────────────────
const Timeline = ({ status }) => {
  const current = statusStep(status);
  if (status?.toLowerCase() === "cancelled") {
    return (
      <div className="order-timeline">
        <span className="timeline-cancelled-badge">✕ Order Cancelled</span>
      </div>
    );
  }
  return (
    <div className="order-timeline">
      {STATUS_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className={`timeline-step ${i <= current ? "done" : ""} ${i === current ? "active" : ""}`}
          >
            <div className="timeline-dot">
              {i < current ? "✓" : i === current ? "●" : ""}
            </div>
            <div className="timeline-label">{step}</div>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`timeline-line ${i < current ? "done" : ""}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Order Detail ────────────────────────────────────────────────
const OrderDetail = ({ order, onBack }) => {
  const sc      = STATUS_COLORS[order.status?.toLowerCase()] || STATUS_COLORS.confirmed;
  const savings = order.discount || 0;

  return (
    <div className="order-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back to Orders</button>
        <div className="detail-meta">
          <div className="detail-order-id">Order #{order.orderId}</div>
          <div className="detail-date">
            Placed on {fmtDate(order.createdAt)} at {fmtTime(order.createdAt)}
          </div>
        </div>
        <span className="status-badge" style={{ background: sc.bg, color: sc.text }}>
          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
        </span>
      </div>

      {/* Delivery timeline */}
      <div className="detail-card">
        <h3 className="section-title">Delivery Status</h3>
        <Timeline status={order.status} />
      </div>

      {/* Items */}
      <div className="detail-card">
        <h3 className="section-title">
          Items Ordered
          <span className="item-count-badge">{order.items?.length}</span>
        </h3>
        <div className="order-items-list">
          {order.items?.map((item, idx) => (
            <div key={idx} className="order-item-row">
              <div className="order-item-emoji">{item.image}</div>
              <div className="order-item-info">
                <div className="order-item-name">{item.name}</div>
                <div className="order-item-brand">{item.brand} · {item.category}</div>
                <div className="order-item-meta">
                  <span className="order-item-qty">Qty: {item.quantity}</span>
                  <span className="order-item-unit-price">${item.price?.toLocaleString()} each</span>
                </div>
              </div>
              <div className="order-item-total">
                ${(item.price * item.quantity).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="detail-card">
        <h3 className="section-title">Price Details</h3>
        <div className="price-summary">
          <div className="price-row">
            <span>Price ({order.items?.length} item{order.items?.length !== 1 ? "s" : ""})</span>
            <span>${((order.subtotal || 0) + savings).toFixed(2)}</span>
          </div>
          {savings > 0 && (
            <div className="price-row discount-row">
              <span>Discount</span>
              <span>− ${savings.toFixed(2)}</span>
            </div>
          )}
          <div className="price-row">
            <span>Subtotal</span>
            <span>${(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="price-row">
            <span>Delivery</span>
            <span className="free-text">FREE</span>
          </div>
          <div className="price-row">
            <span>Tax (8%)</span>
            <span>${(order.tax || 0).toFixed(2)}</span>
          </div>
          <div className="price-row total-row">
            <span>Total Paid</span>
            <span>${(order.total || 0).toFixed(2)}</span>
          </div>
          {savings > 0 && (
            <div className="savings-note">
              🎉 You saved ${savings.toFixed(2)} on this order!
            </div>
          )}
        </div>
      </div>

      {/* Delivery info */}
      <div className="detail-card">
        <h3 className="section-title">Delivery Information</h3>
        <div className="delivery-info">
          <div className="delivery-email">
            📧 Confirmation sent to: <strong>{order.userEmail}</strong>
          </div>
          <div className="delivery-note">🏠 Delivered to your saved address</div>
        </div>
      </div>
    </div>
  );
};

// ─── Order Card (list item) ──────────────────────────────────────
const OrderCard = ({ order, onClick }) => {
  const sc      = STATUS_COLORS[order.status?.toLowerCase()] || STATUS_COLORS.confirmed;
  const step    = statusStep(order.status);
  const preview = order.items?.slice(0, 3) || [];

  return (
    <div className="order-card" onClick={onClick}>
      {/* Header row */}
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-order-id">#{order.orderId}</div>
          <div className="card-date">{fmtDate(order.createdAt)}</div>
        </div>
        <span className="status-badge" style={{ background: sc.bg, color: sc.text }}>
          <span className="status-dot" style={{ background: sc.dot }} />
          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
        </span>
      </div>

      {/* Mini progress bar */}
      {order.status?.toLowerCase() !== "cancelled" && (
        <div className="card-timeline-mini">
          {STATUS_STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div
                className="mini-dot"
                style={{
                  background: i <= step ? sc.dot : "#e0e0e0",
                  transform: i === step ? "scale(1.3)" : "scale(1)",
                }}
              />
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className="mini-line"
                  style={{ background: i < step ? sc.dot : "#e0e0e0" }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Item previews */}
      <div className="card-items-preview">
        <div className="card-emojis">
          {preview.map((item, i) => (
            <span key={i} className="card-emoji">{item.image}</span>
          ))}
          {(order.items?.length || 0) > 3 && (
            <span className="card-emoji-more">+{order.items.length - 3}</span>
          )}
        </div>
        <div className="card-items-text">
          {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
          {order.items?.length > 0 && (
            <span className="card-item-names">
              {" · "}
              {order.items.slice(0, 2).map((i) => i.name).join(", ")}
              {order.items.length > 2 ? ` & ${order.items.length - 2} more` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div>
          <span className="card-total-label">Order Total</span>
          <span className="card-total-value">${(order.total || 0).toFixed(2)}</span>
        </div>
        <button className="card-details-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          View Details →
        </button>
      </div>
    </div>
  );
};

// ─── Main Orders Component ────────────────────────────────────────
const Orders = () => {
  const navigate = useNavigate();

  const [authUser,      setAuthUser]      = useState(undefined);   // undefined = resolving
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus,  setFilterStatus]  = useState("All");

  // Subscribe to auth + orders
  useEffect(() => {
    let ordersUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (ordersUnsub) { ordersUnsub(); ordersUnsub = null; }

      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));

      ordersUnsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
              const tb = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
              return tb - ta;
            });
          setOrders(data);
          setLoading(false);
        },
        (err) => {
          console.error("[ShopZone] Orders fetch error:", err.message);
          setLoading(false);
        }
      );
    });

    return () => { authUnsub(); if (ordersUnsub) ordersUnsub(); };
  }, []);

  const FILTER_TABS = ["All", "Confirmed", "Packed", "Shipped", "Delivered", "Delayed", "Cancelled"];
  const filtered = filterStatus === "All"
    ? orders
    : orders.filter((o) => o.status?.toLowerCase() === filterStatus.toLowerCase());

  // ── Auth resolving (flash prevention) ───────────────────────
  if (authUser === undefined) {
    return (
      <div className="orders-page-root">
        <div className="orders-loading">
          <div className="orders-spinner" />
          Loading…
        </div>
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────────
  if (!authUser) {
    return (
      <div className="orders-page-root">
        <div className="orders-state-wrapper">
          <div className="orders-empty-card">
            <span className="empty-illustration">🔐</span>
            <h2>Sign in to see your orders</h2>
            <p>
              Your complete order history is saved to your account.
              <br />Sign in to track deliveries and view past purchases.
            </p>
            <button
              className="ord-btn-primary"
              onClick={() => navigate("/login", { state: { from: "/orders" } })}
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Order detail ─────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <div className="orders-page-root">
        <div className="orders-container">
          <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
        </div>
      </div>
    );
  }

  // ── Loading orders ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="orders-page-root">
        <div className="orders-loading">
          <div className="orders-spinner" />
          Loading your orders…
        </div>
      </div>
    );
  }

  // ── Orders list ──────────────────────────────────────────────
  return (
    <div className="orders-page-root">
      <div className="orders-container">
        {/* Page header */}
        <div className="orders-page-header">
          <div>
            <h1 className="orders-title">My Orders</h1>
            <p className="orders-subtitle">
              {orders.length === 0
                ? "No orders placed yet"
                : `${orders.length} order${orders.length !== 1 ? "s" : ""} placed`}
            </p>
          </div>
        </div>

        {/* Zero orders → big empty state */}
        {orders.length === 0 ? (
          <div className="orders-state-wrapper" style={{ minHeight: "60vh" }}>
            <div className="orders-empty-card">
              <span className="empty-illustration">📦</span>
              <h2>No orders yet</h2>
              <p>
                Looks like you haven't placed any orders yet.
                <br />Browse our products and find something you love!
              </p>
              <button className="ord-btn-primary" onClick={() => navigate("/")}>
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="orders-filter-tabs">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab === "All"
                    ? orders.length
                    : orders.filter(
                        (o) => o.status?.toLowerCase() === tab.toLowerCase()
                      ).length;
                if (tab !== "All" && count === 0) return null;
                return (
                  <button
                    key={tab}
                    className={`filter-tab ${filterStatus === tab ? "active" : ""}`}
                    onClick={() => setFilterStatus(tab)}
                  >
                    {tab}
                    <span className="filter-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Filtered empty */}
            {filtered.length === 0 ? (
              <div className="orders-empty-inline">
                <p>
                  No <strong>{filterStatus}</strong> orders found.
                </p>
                <button className="ord-btn-link" onClick={() => setFilterStatus("All")}>
                  Show all orders
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {filtered.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
