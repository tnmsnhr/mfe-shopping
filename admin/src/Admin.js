import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, getDoc, onSnapshot,
  updateDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
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
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
// ── Config ───────────────────────────────────────────────────
const ALL_STATUSES = ["confirmed", "packed", "shipped", "delivered", "delayed", "cancelled"];
const FILTER_TABS  = ["All", ...ALL_STATUSES.map((s) => s.charAt(0).toUpperCase() + s.slice(1))];

const STATUS_META = {
  confirmed: { label: "Confirmed", chipBg: "#e8f5e9", chipColor: "#2e7d32" },
  packed:    { label: "Packed",    chipBg: "#e3f2fd", chipColor: "#1565c0" },
  shipped:   { label: "Shipped",   chipBg: "#fff8e1", chipColor: "#e65100" },
  delivered: { label: "Delivered", chipBg: "#e8f5e9", chipColor: "#1b5e20" },
  delayed:   { label: "Delayed",   chipBg: "#fff3e0", chipColor: "#bf360c" },
  cancelled: { label: "Cancelled", chipBg: "#fce4ec", chipColor: "#b71c1c" },
};

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const StatusChip = ({ status }) => {
  const m = STATUS_META[status?.toLowerCase()] || STATUS_META.confirmed;
  return (
    <Chip
      label={m.label}
      size="small"
      sx={{ bgcolor: m.chipBg, color: m.chipColor, fontWeight: 700, fontSize: "0.7rem", height: 22, borderRadius: 1 }}
    />
  );
};

// ── Stat card ────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary" }}>{value}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25, color: "text.secondary" }}>{label}</Typography>
          {sub && <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: "block" }}>{sub}</Typography>}
        </Box>
        <Box sx={{ bgcolor: color + "22", borderRadius: 2, p: 1.25, color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Main Admin component ──────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();
  const [authUser,      setAuthUser]      = useState(undefined);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState("newest");
  const [activeTab,     setActiveTab]     = useState(0);
  const [dialogOrder,   setDialogOrder]   = useState(null);
  const [newStatus,     setNewStatus]     = useState("");
  const [updating,      setUpdating]      = useState(false);
  const [toast,         setToast]         = useState({ open: false, msg: "", severity: "success" });

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  // ── Auth + admin check ─────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user) { setIsAdmin(false); setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(snap.exists() && snap.data().role === "admin");
      } catch {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Live orders listener (admin sees ALL orders) ───────────
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("[Admin] Orders listener error:", err.message));
    return unsub;
  }, [isAdmin]);

  const handleUpdateStatus = async () => {
    if (!dialogOrder || !newStatus || updating) return;
    setUpdating(true);
    try {
      const ref = doc(db, "orders", dialogOrder.id);
      await updateDoc(ref, {
        status: newStatus,
        statusUpdatedAt: serverTimestamp(),
        statusHistory: [
          ...(dialogOrder.statusHistory || []),
          { status: newStatus, at: new Date().toISOString(), updatedBy: authUser.email },
        ],
      });
      showToast(`Order ${dialogOrder.orderId} → ${newStatus}`);
      setDialogOrder(null);
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────
  const filterKey = FILTER_TABS[activeTab];
  const tabFiltered = filterKey === "All" ? orders : orders.filter((o) => o.status?.toLowerCase() === filterKey.toLowerCase());
  const searched = tabFiltered.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.orderId?.toLowerCase().includes(s) || o.userEmail?.toLowerCase().includes(s);
  });
  const sorted = [...searched].sort((a, b) => {
    if (sortBy === "newest")   return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    if (sortBy === "oldest")   return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
    if (sortBy === "highest")  return (b.total || 0) - (a.total || 0);
    if (sortBy === "lowest")   return (a.total || 0) - (b.total || 0);
    return 0;
  });

  const stats = {
    total:     orders.length,
    revenue:   orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0),
    customers: new Set(orders.map((o) => o.userId)).size,
    pending:   orders.filter((o) => ["confirmed", "packed", "shipped"].includes(o.status?.toLowerCase())).length,
  };
  const countOf = (key) => key === "All" ? orders.length : orders.filter((o) => o.status?.toLowerCase() === key.toLowerCase()).length;

  // ── Guards ─────────────────────────────────────────────────
  if (authUser === undefined || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  if (!authUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography sx={{ fontSize: "4rem", mb: 2 }}>🔐</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Authentication required</Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/login")}>Sign In</Button>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography sx={{ fontSize: "4rem", mb: 2 }}>🚫</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Access Denied</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>This portal is restricted to administrators.</Typography>
        <Button variant="contained" onClick={() => navigate("/")}>Go Home</Button>
      </Container>
    );
  }

  return (
    <>
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        {/* Admin top bar */}
        <Box sx={{ bgcolor: "secondary.main", py: 2, px: 3 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <AdminPanelSettingsOutlinedIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.1 }}>
                    Admin Portal
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                    Order Management Dashboard
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/orders")}
                  sx={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.3)", "&:hover": { borderColor: "#fff" } }}
                >
                  My Orders
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate("/")}
                  sx={{ color: "rgba(255,255,255,0.8)", borderColor: "rgba(255,255,255,0.3)", "&:hover": { borderColor: "#fff" } }}
                >
                  Storefront
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          {/* Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Total Orders",   value: stats.total,                                          sub: "All time",          color: "#1976d2", icon: <TrendingUpIcon />                },
              { label: "Total Revenue",  value: `$${stats.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, sub: "excl. cancelled", color: "#388e3c", icon: <AttachMoneyIcon />              },
              { label: "Unique Buyers",  value: stats.customers,                                      sub: "distinct users",    color: "#7b1fa2", icon: <PeopleOutlineIcon />              },
              { label: "In Progress",    value: stats.pending,                                        sub: "need attention",    color: "#e65100", icon: <LocalShippingOutlinedIcon />      },
            ].map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>

          {/* Toolbar */}
          <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                placeholder="Search order ID or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Sort by</InputLabel>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
                  <MenuItem value="newest">Newest first</MenuItem>
                  <MenuItem value="oldest">Oldest first</MenuItem>
                  <MenuItem value="highest">Highest value</MenuItem>
                  <MenuItem value="lowest">Lowest value</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {/* Filter Tabs */}
          <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2, overflow: "hidden" }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ bgcolor: "#fff", "& .MuiTabs-indicator": { bgcolor: "primary.main" } }}
            >
              {FILTER_TABS.map((f, i) => (
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
                          px: 0.75, py: 0.1, borderRadius: 10,
                          fontSize: "0.65rem", fontWeight: 700, lineHeight: 1.6,
                          minWidth: 18, textAlign: "center",
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

          {/* Orders Table */}
          <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafafa", "& th": { fontWeight: 700, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px", py: 1.5 } }}>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">No orders match your filter.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((order) => (
                      <TableRow
                        key={order.id}
                        sx={{ "&:hover": { bgcolor: "rgba(255,63,108,.03)" }, "& td": { py: 1.75, fontSize: "0.875rem" } }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem" }}>
                            {order.orderId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.userEmail}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={order.items?.length || 0} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            ${(order.total || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={order.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(order.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                            onClick={() => { setDialogOrder(order); setNewStatus(order.status || "confirmed"); }}
                            sx={{ fontSize: "0.75rem", py: 0.5, borderColor: "divider", color: "text.primary" }}
                          >
                            Status
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {sorted.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, textAlign: "right" }}>
              Showing {sorted.length} of {orders.length} orders
            </Typography>
          )}
        </Container>
      </Box>

      {/* Status update dialog */}
      <Dialog
        open={Boolean(dialogOrder)}
        onClose={() => !updating && setDialogOrder(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Update Order Status</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Order: <strong style={{ fontFamily: "monospace" }}>{dialogOrder?.orderId}</strong>
          </Typography>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Current Status</Typography>
            <StatusChip status={dialogOrder?.status} />
          </Box>
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="New Status">
              {ALL_STATUSES.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <StatusChip status={s} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {dialogOrder?.statusHistory?.length > 0 && (
            <Box sx={{ mt: 2, bgcolor: "background.default", borderRadius: 1.5, p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: "block" }}>
                Status History
              </Typography>
              {dialogOrder.statusHistory.slice(-3).reverse().map((h, i) => (
                <Typography key={i} variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                  {h.at ? new Date(h.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  {" · "}
                  <strong style={{ textTransform: "capitalize" }}>{h.status}</strong>
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOrder(null)} disabled={updating} variant="outlined" sx={{ borderColor: "divider", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={updating || newStatus === dialogOrder?.status}
            variant="contained"
            color="primary"
          >
            {updating ? <CircularProgress size={18} color="inherit" /> : "Update Status"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>{toast.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default Admin;
