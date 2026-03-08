import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Skeleton from "@mui/material/Skeleton";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
// ── Status config ────────────────────────────────────────────
const TIMELINE_STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "success",  chipBg: "#e8f5e9", chipColor: "#2e7d32" },
  packed:    { label: "Packed",    color: "info",     chipBg: "#e3f2fd", chipColor: "#1565c0" },
  shipped:   { label: "Shipped",   color: "warning",  chipBg: "#fff8e1", chipColor: "#e65100" },
  delivered: { label: "Delivered", color: "success",  chipBg: "#e8f5e9", chipColor: "#1b5e20" },
  delayed:   { label: "Delayed",   color: "warning",  chipBg: "#fff3e0", chipColor: "#bf360c" },
  cancelled: { label: "Cancelled", color: "error",    chipBg: "#fce4ec", chipColor: "#b71c1c" },
};

const ALL_FILTERS = ["All", "confirmed", "packed", "shipped", "delivered", "delayed", "cancelled"];

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ── StatusChip ──────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.confirmed;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.chipBg,
        color: cfg.chipColor,
        fontWeight: 700,
        fontSize: "0.7rem",
        height: 22,
        borderRadius: 1,
      }}
    />
  );
};

// ── Delivery Timeline ────────────────────────────────────────
const DeliveryTimeline = ({ status }) => {
  const lc = status?.toLowerCase();
  if (lc === "cancelled") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <Chip label="✕ Order Cancelled" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
      </Box>
    );
  }
  if (lc === "delayed") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <Chip label="⚠️ Delivery Delayed" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
      </Box>
    );
  }
  const activeStep = TIMELINE_STEPS.findIndex((s) => s.toLowerCase() === lc);
  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ pt: 1, pb: 2 }}>
      {TIMELINE_STEPS.map((label, idx) => (
        <Step key={label} completed={idx < activeStep}>
          <StepLabel
            sx={{
              "& .MuiStepLabel-label": { fontSize: "0.75rem", fontWeight: idx <= activeStep ? 700 : 400 },
              "& .MuiStepIcon-root.Mui-active":    { color: "primary.main" },
              "& .MuiStepIcon-root.Mui-completed": { color: "success.main" },
            }}
          >
            {label}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};

// ── Order Detail View ────────────────────────────────────────
const OrderDetail = ({ order, onBack }) => {
  const savings = order.discount || 0;
  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }} color="inherit">
        Back to Orders
      </Button>

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        {/* Header */}
        <Box
          sx={{
            px: 3, py: 2.5,
            background: "linear-gradient(135deg, #282c3f 0%, #1a1d2e 100%)",
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px" }}>
              ORDER ID
            </Typography>
            <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>
              {order.orderId}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Placed on {fmtDateTime(order.createdAt)}
            </Typography>
          </Box>
          <StatusChip status={order.status} />
        </Box>

        {/* Timeline */}
        <Box sx={{ px: 3, pt: 2, bgcolor: "#fafafa", borderBottom: "1px solid", borderColor: "divider" }}>
          <DeliveryTimeline status={order.status} />
        </Box>

        {/* Items */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            Items Ordered ({order.items?.length || 0})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", fontSize: "0.75rem", borderBottom: "2px solid", borderColor: "divider" } }}>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items?.map((item, idx) => (
                  <TableRow key={idx} sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 44, height: 44, bgcolor: "#fafafa", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
                          {item.image}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.brand}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.quantity}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">${item.price?.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider />

        {/* Price summary */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} smOffset={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Price Breakdown</Typography>
              {[
                { label: "Total MRP",       value: `$${((order.subtotal || 0) + savings).toFixed(2)}`, color: "text.primary" },
                { label: "Discount",        value: `− $${savings.toFixed(2)}`,                         color: "success.main" },
                { label: "Subtotal",        value: `$${(order.subtotal || 0).toFixed(2)}`,             color: "text.primary" },
                { label: "Tax",             value: `$${(order.tax || 0).toFixed(2)}`,                  color: "text.primary" },
                { label: "Delivery",        value: "FREE",                                             color: "success.main" },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color }}>{value}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Total Paid</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>${(order.total || 0).toFixed(2)}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

// ── Order Card (list view) ───────────────────────────────────
const OrderCard = ({ order, onClick }) => {
  const itemPreviews = order.items?.slice(0, 3).map((i) => i.image).join("  ") || "";
  const extraCount   = (order.items?.length || 0) - 3;
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        mb: 2,
        cursor: "pointer",
        transition: "box-shadow .2s",
        "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,.08)" },
      }}
      onClick={() => onClick(order)}
    >
      {/* Card top */}
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#fafafa", borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.75rem", color: "text.secondary" }}>
            #{order.orderId}
          </Typography>
          <StatusChip status={order.status} />
        </Box>
        <Typography variant="caption" color="text.secondary">{fmtDate(order.createdAt)}</Typography>
      </Box>

      {/* Card body */}
      <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 0.75, fontSize: "1.75rem" }}>
            {order.items?.slice(0, 3).map((item, i) => (
              <Box key={i} sx={{ width: 52, height: 52, bgcolor: "#f5f5f5", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", border: "1px solid", borderColor: "divider" }}>
                {item.image}
              </Box>
            ))}
            {extraCount > 0 && (
              <Box sx={{ width: 52, height: 52, bgcolor: "#f5f5f5", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>+{extraCount}</Typography>
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {order.items?.length} item{order.items?.length !== 1 ? "s" : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {order.items?.slice(0, 2).map((i) => i.name).join(", ")}{(order.items?.length || 0) > 2 ? "…" : ""}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "1rem" }}>
            ${(order.total || 0).toFixed(2)}
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
            View Details →
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

// ── Main Orders component ────────────────────────────────────
const Orders = () => {
  const navigate = useNavigate();
  const [authUser,       setAuthUser]       = useState(undefined);
  const [orders,         setOrders]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedOrder,  setSelectedOrder]  = useState(null);
  const [activeTab,      setActiveTab]      = useState(0);

  useEffect(() => {
    let orderUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (orderUnsub) { orderUnsub(); orderUnsub = null; }
      if (!user) { setOrders([]); setLoading(false); return; }
      setLoading(true);
      const q = query(collection(db, "orders"), where("userId", "==", user.uid));
      orderUnsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setOrders(docs);
        setLoading(false);
      }, (err) => { console.error("[ShopZone] Orders read failed:", err.message); setLoading(false); });
    });
    return () => { authUnsub(); if (orderUnsub) orderUnsub(); };
  }, []);

  // Sync selectedOrder when Firestore updates it
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find((o) => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }, [orders]);

  const filterKey = ALL_FILTERS[activeTab];
  const filtered  = filterKey === "All" ? orders : orders.filter((o) => o.status?.toLowerCase() === filterKey);
  const countOf   = (key) => key === "All" ? orders.length : orders.filter((o) => o.status?.toLowerCase() === key).length;

  // ── Auth states ─────────────────────────────────────────
  if (authUser === undefined) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: "center" }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton width="60%" sx={{ mx: "auto" }} />
      </Container>
    );
  }

  if (!authUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography sx={{ fontSize: "4rem", mb: 2 }}>🔐</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Sign in to view orders</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Your order history is tied to your account.</Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/login", { state: { from: "/orders" } })}>
          Sign In
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>My Orders</Typography>
            {!loading && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {orders.length} order{orders.length !== 1 ? "s" : ""} total
              </Typography>
            )}
          </Box>

          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} />
          ) : (
            <>
              {/* Filter Tabs */}
              <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 3, overflow: "hidden" }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ bgcolor: "#fff", "& .MuiTabs-indicator": { bgcolor: "primary.main" } }}
                >
                  {ALL_FILTERS.map((f, i) => (
                    <Tab
                      key={f}
                      label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <span style={{ textTransform: "capitalize" }}>{f}</span>
                          <Box
                            component="span"
                            sx={{
                              bgcolor: activeTab === i ? "primary.main" : "rgba(0,0,0,0.08)",
                              color:   activeTab === i ? "#fff" : "text.secondary",
                              px: 0.75, py: 0.1,
                              borderRadius: 10,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              lineHeight: 1.6,
                              minWidth: 18,
                              textAlign: "center",
                            }}
                          >
                            {countOf(f)}
                          </Box>
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
              </Paper>

              {/* Loading */}
              {loading ? (
                [0, 1, 2].map((i) => (
                  <Paper key={i} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2, overflow: "hidden" }}>
                    <Box sx={{ p: 2, bgcolor: "#fafafa", borderBottom: "1px solid", borderColor: "divider" }}>
                      <Skeleton width={200} height={20} />
                    </Box>
                    <Box sx={{ p: 2, display: "flex", gap: 2 }}>
                      {[0, 1, 2].map((j) => <Skeleton key={j} variant="rectangular" width={52} height={52} sx={{ borderRadius: 1.5 }} />)}
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="60%" height={18} />
                        <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
                      </Box>
                    </Box>
                  </Paper>
                ))
              ) : filtered.length === 0 ? (
                <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, py: 8, textAlign: "center" }}>
                  <ShoppingBagOutlinedIcon sx={{ fontSize: "4rem", color: "text.disabled", mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {orders.length === 0 ? "No orders yet" : `No ${filterKey} orders`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {orders.length === 0
                      ? "Your ordered items will appear here."
                      : "Try a different filter above."}
                  </Typography>
                  {orders.length === 0 && (
                    <Button variant="contained" onClick={() => navigate("/")}>Start Shopping</Button>
                  )}
                </Paper>
              ) : (
                filtered.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={setSelectedOrder} />
                ))
              )}
            </>
          )}
        </Container>
      </Box>
  );
};

export default Orders;
