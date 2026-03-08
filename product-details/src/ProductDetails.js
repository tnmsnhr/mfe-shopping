import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, setDoc, deleteDoc, getDoc,
  updateDoc, serverTimestamp, increment, collection,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Rating from "@mui/material/Rating";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import CachedOutlinedIcon from "@mui/icons-material/CachedOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import theme from "./theme";

const getMrp      = (price) => Math.round(price * 1.4);
const getDiscount = (price) => Math.round((1 - price / getMrp(price)) * 100);

const cartDoc      = (uid)       => doc(db, "carts",     uid);
const cartItemRef  = (uid, pid)  => doc(db, "carts",     uid, "items", pid.toString());
const wishDoc      = (uid)       => doc(db, "wishlists", uid);
const wishItemRef  = (uid, pid)  => doc(db, "wishlists", uid, "items", pid.toString());

const ensureCartDoc = async (uid, email) => {
  const ref  = cartDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { userId: uid, userEmail: email || null, cartId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true });
  }
};

const ensureWishlistDoc = async (uid) => {
  const ref  = wishDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { userId: uid, createdAt: serverTimestamp() });
};

const THUMB_COLORS = ["#fef9ec", "#eef5ff", "#f5fef0", "#fff0f3"];

const ProductDetails = ({ productId }) => {
  const navigate = useNavigate();

  const [authUser,     setAuthUser]     = useState(undefined);
  const [product,      setProduct]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [quantity,     setQuantity]     = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [wishlisted,   setWishlisted]   = useState(false);
  const [wishWorking,  setWishWorking]  = useState(false);
  const [activeImage,  setActiveImage]  = useState(0);
  const [toast,        setToast]        = useState({ open: false, msg: "", severity: "success" });

  const showToast = (msg, severity = "success") => setToast({ open: true, msg, severity });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setAuthUser(user));
    return unsub;
  }, []);

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProduct(productId);
        setProduct(data);
        setActiveImage(0);
        window.scrollTo(0, 0);
      } catch (err) {
        setError("Failed to load product. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (!product || !authUser) { setWishlisted(false); return; }
    getDoc(wishItemRef(authUser.uid, product.id))
      .then((snap) => setWishlisted(snap.exists()))
      .catch(() => {});
  }, [product, authUser]);

  const handleAddToCart = async () => {
    if (!authUser) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }
    try {
      setAddingToCart(true);
      await ensureCartDoc(authUser.uid, authUser.email);
      const ref  = cartItemRef(authUser.uid, product.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { quantity: increment(quantity) });
      } else {
        await setDoc(ref, {
          productId: product.id, name: product.name, brand: product.brand,
          price: product.price, mrp: product.mrp || getMrp(product.price),
          discount: product.discount || getDiscount(product.price),
          image: product.image, category: product.category, quantity,
          addedAt: serverTimestamp(),
        });
      }
      showToast("Added to bag! Redirecting…");
      setTimeout(() => navigate("/cart"), 800);
    } catch (err) {
      console.error("Add to cart error:", err);
      showToast("Failed to add to bag. Please try again.", "error");
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    if (!authUser) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }
    try {
      setWishWorking(true);
      await ensureWishlistDoc(authUser.uid);
      const ref = wishItemRef(authUser.uid, product.id);
      if (wishlisted) {
        await deleteDoc(ref);
        setWishlisted(false);
        showToast("Removed from wishlist");
      } else {
        await setDoc(ref, {
          productId: product.id, name: product.name, brand: product.brand,
          image: product.image, price: product.price,
          mrp: product.mrp || getMrp(product.price),
          category: product.category, addedAt: serverTimestamp(),
        });
        setWishlisted(true);
        showToast("Added to wishlist ❤️");
      }
    } catch (err) {
      console.error("Wishlist error:", err);
    } finally {
      setWishWorking(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" width={72} height={72} sx={{ borderRadius: 2 }} />)}
              </Box>
            </Grid>
            <Grid item xs={12} md={7}>
              {[80, 60, 40, 90, 50, 70, 55].map((w, i) => (
                <Skeleton key={i} width={`${w}%`} height={i === 0 ? 28 : 18} sx={{ mb: 1.5 }} />
              ))}
            </Grid>
          </Grid>
        </Container>
      </ThemeProvider>
    );
  }

  if (error || !product) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
          <Typography sx={{ fontSize: "4rem", mb: 2 }}>😕</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{error || "Product not found"}</Typography>
          <Button variant="contained" onClick={() => navigate("/")}>Back to Home</Button>
        </Container>
      </ThemeProvider>
    );
  }

  const mrp      = getMrp(product.price);
  const discount = getDiscount(product.price);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 3, "& .MuiBreadcrumbs-separator": { mx: 0.5 } }}
          >
            <Typography
              variant="body2"
              sx={{ cursor: "pointer", color: "text.secondary", "&:hover": { color: "primary.main" } }}
              onClick={() => navigate("/")}
            >
              Home
            </Typography>
            <Typography
              variant="body2"
              sx={{ cursor: "pointer", color: "text.secondary", "&:hover": { color: "primary.main" } }}
              onClick={() => navigate(`/?category=${encodeURIComponent(product.category)}`)}
            >
              {product.category}
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
              {product.name}
            </Typography>
          </Breadcrumbs>

          <Grid container spacing={{ xs: 2, md: 5 }}>
            {/* ── LEFT: Images ── */}
            <Grid item xs={12} md={5}>
              {/* Main image */}
              <Paper
                elevation={0}
                sx={{
                  bgcolor: THUMB_COLORS[activeImage],
                  borderRadius: 3,
                  height: { xs: 280, sm: 380 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontSize: { xs: "6rem", sm: "8rem" }, userSelect: "none", lineHeight: 1 }}>
                  {product.image}
                </Typography>
                {discount > 0 && (
                  <Chip
                    label={`${discount}% OFF`}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      bgcolor: "#fce4ec",
                      color: "primary.main",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  />
                )}
                {/* Wishlist toggle overlay */}
                <IconButton
                  onClick={toggleWishlist}
                  disabled={wishWorking}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    bgcolor: "#fff",
                    boxShadow: 1,
                    "&:hover": { bgcolor: "#fff", color: "primary.main" },
                  }}
                >
                  {wishlisted
                    ? <FavoriteIcon color="primary" />
                    : <FavoriteBorderIcon />}
                </IconButton>
              </Paper>

              {/* Thumbnails */}
              <Box sx={{ display: "flex", gap: 1 }}>
                {THUMB_COLORS.map((bg, i) => (
                  <Box
                    key={i}
                    onClick={() => setActiveImage(i)}
                    sx={{
                      width: 72, height: 72,
                      bgcolor: bg,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "1.75rem",
                      border: "2px solid",
                      borderColor: activeImage === i ? "primary.main" : "transparent",
                      transition: "border-color .15s",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {product.image}
                  </Box>
                ))}
              </Box>

              {/* CTA buttons (visible on mobile below thumbs, on desktop in info section) */}
              <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1, mt: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={addingToCart ? <CircularProgress size={18} color="inherit" /> : <ShoppingBagOutlinedIcon />}
                  onClick={handleAddToCart}
                  disabled={!product.inStock || addingToCart}
                >
                  {addingToCart ? "Adding…" : "Add to Bag"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color={wishlisted ? "primary" : "inherit"}
                  size="large"
                  startIcon={wishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  onClick={toggleWishlist}
                  disabled={wishWorking}
                >
                  {wishlisted ? "Wishlisted" : "Wishlist"}
                </Button>
              </Box>
            </Grid>

            {/* ── RIGHT: Info ── */}
            <Grid item xs={12} md={7}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {product.brand}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, mb: 1, lineHeight: 1.3 }}>
                {product.name}
              </Typography>

              {/* Rating */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Rating value={product.rating} precision={0.5} readOnly size="small" max={5} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{product.rating}</Typography>
                    </Box>
                  }
                  size="small"
                  sx={{ bgcolor: "success.light", height: 26 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {product.reviews?.toLocaleString()} Ratings
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Price block */}
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 0.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  ${product.price.toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ color: "text.secondary", textDecoration: "line-through", fontWeight: 400 }}>
                  ${mrp.toLocaleString()}
                </Typography>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                  {discount}% off
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Inclusive of all taxes
              </Typography>

              {/* Offers */}
              <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: "#f9fbe7", borderRadius: 2, border: "1px solid #e6ee9c" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Available Offers</Typography>
                {[
                  "🏦 Bank Offer — 10% off on select credit cards",
                  `🎁 Special Price — Extra ${discount}% off on MRP`,
                  "🚚 Free Delivery on all prepaid orders",
                ].map((offer) => (
                  <Typography key={offer} variant="body2" sx={{ mb: 0.5, color: "text.secondary" }}>
                    {offer}
                  </Typography>
                ))}
              </Box>

              {/* Stock status */}
              <Box sx={{ mb: 2 }}>
                {product.inStock ? (
                  <Chip label="✓ In Stock — Ready to Ship" color="success" size="small" variant="outlined" />
                ) : (
                  <Chip label="✗ Out of Stock" color="error" size="small" variant="outlined" />
                )}
              </Box>

              {/* Quantity selector */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Quantity</Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <IconButton size="small" onClick={() => setQuantity((q) => Math.max(1, q - 1))} sx={{ borderRadius: 0 }}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ px: 2, fontWeight: 700, minWidth: 32, textAlign: "center" }}>
                    {quantity}
                  </Typography>
                  <IconButton size="small" onClick={() => setQuantity((q) => q + 1)} sx={{ borderRadius: 0 }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Desktop CTA */}
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={addingToCart ? <CircularProgress size={18} color="inherit" /> : <ShoppingBagOutlinedIcon />}
                  onClick={handleAddToCart}
                  disabled={!product.inStock || addingToCart}
                  sx={{ flex: 1, py: 1.5 }}
                >
                  {addingToCart ? "Adding…" : "Add to Bag"}
                </Button>
                <Button
                  variant="outlined"
                  color={wishlisted ? "primary" : "inherit"}
                  size="large"
                  startIcon={wishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  onClick={toggleWishlist}
                  disabled={wishWorking}
                  sx={{ flex: 1, py: 1.5, borderColor: wishlisted ? "primary.main" : "divider" }}
                >
                  {wishlisted ? "Wishlisted" : "Wishlist"}
                </Button>
              </Box>

              {/* Delivery promises */}
              <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
                {[
                  { icon: <LocalShippingOutlinedIcon fontSize="small" />, text: "Free Delivery" },
                  { icon: <CachedOutlinedIcon fontSize="small" />,        text: "30-Day Returns" },
                  { icon: <VerifiedOutlinedIcon fontSize="small" />,       text: "Authentic Product" },
                ].map(({ icon, text }) => (
                  <Box key={text} sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                    {icon}
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Description */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>About this Product</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                {product.description}
              </Typography>

              {/* Features */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Key Features</Typography>
              <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                {product.features?.map((f, i) => (
                  <Box component="li" key={i} sx={{ mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">{f}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Login nudge */}
              {authUser === null && (
                <Alert
                  severity="info"
                  sx={{ mt: 2, borderRadius: 2 }}
                  action={
                    <Button size="small" color="primary" onClick={() => navigate("/login")}>
                      Sign In
                    </Button>
                  }
                >
                  Sign in to save to wishlist and sync your cart across devices.
                </Alert>
              )}
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
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default ProductDetails;
