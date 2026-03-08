import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
const cartCol    = (uid)     => collection(db, "carts", uid, "items");
const cartDocRef = (uid, id) => doc(db, "carts", uid, "items", id);
const cartParent = (uid)     => doc(db, "carts", uid);

const touchCartParent = async (uid, email) => {
  await setDoc(cartParent(uid), { userId: uid, userEmail: email || null, cartId: uid, updatedAt: serverTimestamp() }, { merge: true });
};

const Cart = () => {
  const navigate = useNavigate();
  const [authUser,    setAuthUser]    = useState(undefined);
  const [cartItems,   setCartItems]   = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast,       setToast]       = useState({ open: false, msg: "", severity: "success" });

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  useEffect(() => {
    let cartUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (cartUnsub) { cartUnsub(); cartUnsub = null; }
      if (!user) { setCartItems([]); setIsLoading(false); return; }

      setIsLoading(true);
      touchCartParent(user.uid, user.email).catch(() => {});

      cartUnsub = onSnapshot(
        cartCol(user.uid),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0));
          setCartItems(items);
          setIsLoading(false);
        },
        (err) => { console.error("[ShopZone] Cart read failed:", err.message); setIsLoading(false); }
      );
    });
    return () => { authUnsub(); if (cartUnsub) cartUnsub(); };
  }, []);

  const handleQuantityChange = async (itemId, delta) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { handleRemoveItem(itemId); return; }
    await updateDoc(cartDocRef(authUser.uid, itemId), { quantity: newQty });
  };

  const handleRemoveItem = async (itemId) => {
    await deleteDoc(cartDocRef(authUser.uid, itemId));
    showToast("Item removed from bag");
  };

  const handleClearCart = async () => {
    if (!window.confirm("Clear your entire cart?")) return;
    const batch = writeBatch(db);
    cartItems.forEach((item) => batch.delete(cartDocRef(authUser.uid, item.id)));
    await batch.commit();
  };

  const subtotal   = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalMrp   = cartItems.reduce((s, i) => s + (i.mrp || Math.round(i.price * 1.4)) * i.quantity, 0);
  const tax        = subtotal * 0.08;
  const grandTotal = subtotal + tax;
  const savings    = totalMrp - subtotal;

  const handleCheckout = async () => {
    if (cartItems.length === 0 || checkingOut) return;
    setCheckingOut(true);
    try {
      const orderId = `SZ-${Date.now()}`;
      await setDoc(doc(db, "orders", orderId), {
        userId: authUser.uid, userEmail: authUser.email,
        items: cartItems.map(({ id: _id, addedAt: _at, ...rest }) => rest),
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(savings.toFixed(2)),
        tax:      parseFloat(tax.toFixed(2)),
        total:    parseFloat(grandTotal.toFixed(2)),
        status:   "confirmed",
        statusHistory: [{ status: "confirmed", at: new Date().toISOString() }],
        statusUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        orderId,
      });
      const batch = writeBatch(db);
      cartItems.forEach((item) => batch.delete(cartDocRef(authUser.uid, item.id)));
      await batch.commit();
      setOrderPlaced(orderId);
    } catch (err) {
      console.error("Checkout error:", err);
      showToast("Checkout failed. Please try again.", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Auth resolving ─────────────────────────────────────────
  if (authUser === undefined) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  // ── Not logged in ──────────────────────────────────────────
  if (!authUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography sx={{ fontSize: "4rem", mb: 2 }}>🔐</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Please sign in</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Your cart items are saved to your account.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/login", { state: { from: "/cart" } })}>
          Sign In
        </Button>
      </Container>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {[0, 1, 2].map((i) => (
              <Paper key={i} elevation={0} sx={{ p: 2, mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, display: "flex", gap: 2 }}>
                <Skeleton variant="rectangular" width={80} height={80} sx={{ borderRadius: 2, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="40%" height={14} sx={{ mt: 0.75 }} />
                  <Skeleton width="30%" height={20} sx={{ mt: 1 }} />
                </Box>
              </Paper>
            ))}
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // ── Order placed ───────────────────────────────────────────
  if (orderPlaced) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <CheckCircleOutlineIcon sx={{ fontSize: "5rem", color: "success.main", mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Order Placed! 🎉</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>Your order has been confirmed.</Typography>
        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, mb: 3, color: "text.primary" }}>
          {orderPlaced}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button variant="contained" onClick={() => navigate("/orders")}>View Orders</Button>
          <Button variant="outlined" onClick={() => { setOrderPlaced(null); navigate("/"); }}>Continue Shopping</Button>
        </Box>
      </Container>
    );
  }

  // ── Empty cart ─────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <ShoppingBagOutlinedIcon sx={{ fontSize: "5rem", color: "text.disabled", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Your bag is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Add some products to get started!</Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/")}>Continue Shopping</Button>
      </Container>
    );
  }

  return (
    <>
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              My Bag ({cartItems.length})
            </Typography>
            <Button
              variant="text"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleClearCart}
            >
              Clear Bag
            </Button>
          </Box>

          <Grid container spacing={3} alignItems="flex-start">
            {/* ── Cart Items ── */}
            <Grid item xs={12} md={8}>
              {cartItems.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    mb: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Image */}
                  <Box
                    component={Box}
                    sx={{
                      width: { xs: 72, sm: 96 },
                      height: { xs: 72, sm: 96 },
                      bgcolor: "#fafafa",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: { xs: "2rem", sm: "2.75rem" },
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {item.image}
                  </Box>

                  {/* Details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase" }}>
                      {item.brand}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3, mt: 0.25 }}>
                      {item.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.75 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ${item.price.toLocaleString()}
                      </Typography>
                      {item.mrp && (
                        <Typography variant="caption" sx={{ textDecoration: "line-through", color: "text.secondary" }}>
                          ${item.mrp.toLocaleString()}
                        </Typography>
                      )}
                      {item.discount && (
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                          {item.discount}% off
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
                      Seller: TechStore Official
                    </Typography>
                  </Box>

                  {/* Qty + Remove */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5, flexShrink: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.main" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Typography>
                    {/* Quantity controls */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <IconButton size="small" onClick={() => handleQuantityChange(item.id, -1)} sx={{ borderRadius: 0, px: 0.75 }}>
                        <RemoveIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography sx={{ px: 1.5, fontWeight: 700, minWidth: 28, textAlign: "center", fontSize: "0.875rem" }}>
                        {item.quantity}
                      </Typography>
                      <IconButton size="small" onClick={() => handleQuantityChange(item.id, 1)} sx={{ borderRadius: 0, px: 0.75 }}>
                        <AddIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)} title="Remove">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              ))}

              {/* Delivery promise */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, bgcolor: "#e8f5e9", borderRadius: 2 }}>
                <LocalShippingOutlinedIcon sx={{ color: "success.main", fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: "success.dark", fontWeight: 600 }}>
                  Free delivery on all items in your bag!
                </Typography>
              </Box>
            </Grid>

            {/* ── Summary ── */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", position: "sticky", top: 80 }}
              >
                <Box sx={{ p: 2.5, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.5px" }}>
                    Price Details ({cartItems.length} Item{cartItems.length !== 1 ? "s" : ""})
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  {[
                    { label: "Total MRP",       value: `$${totalMrp.toFixed(2)}`,                                                         color: "text.primary" },
                    { label: "Discount on MRP", value: `− $${savings.toFixed(2)}`,                                                         color: "success.main" },
                    { label: "Subtotal",         value: `$${subtotal.toFixed(2)}`,                                                          color: "text.primary" },
                    { label: "Tax (8%)",         value: `$${tax.toFixed(2)}`,                                                               color: "text.primary" },
                    { label: "Delivery",         value: "FREE",                                                                             color: "success.main" },
                  ].map(({ label, value, color }) => (
                    <Box key={label} sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color }}>{value}</Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total Amount</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>${grandTotal.toFixed(2)}</Typography>
                  </Box>

                  {savings > 0 && (
                    <Box sx={{ bgcolor: "#fce4ec", borderRadius: 1.5, p: 1.5, mb: 2 }}>
                      <Typography variant="body2" color="primary.dark" sx={{ fontWeight: 700, textAlign: "center" }}>
                        🎉 You save ${savings.toFixed(2)} on this order!
                      </Typography>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleCheckout}
                    disabled={checkingOut}
                    sx={{ py: 1.5, mb: 1.5, fontSize: "0.95rem" }}
                  >
                    {checkingOut ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Placing Order…</> : "Proceed to Checkout"}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate("/")}
                    sx={{ py: 1.25, mb: 2, borderColor: "divider" }}
                  >
                    Continue Shopping
                  </Button>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                    <LockOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.disabled">Safe &amp; Secure Payments</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>{toast.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default Cart;
