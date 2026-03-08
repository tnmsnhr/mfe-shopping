import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter, Routes, Route, Link,
  useParams, useSearchParams, useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";
import { seedIfEmpty } from "./seedFirestore";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Rating from "@mui/material/Rating";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import theme from "./theme";
import "./App.css";

// Lazy-load remote modules
const Navigation     = React.lazy(() => import("navigation/Navigation"));
const ProductDetails = React.lazy(() => import("productDetails/ProductDetails"));
const Cart           = React.lazy(() => import("cart/Cart"));
const Orders         = React.lazy(() => import("ordersRemote/Orders"));
const AdminPortal    = React.lazy(() => import("adminRemote/Admin"));
const Login          = React.lazy(() => import("authRemote/Login"));

const CATEGORY_ICONS = {
  All: "🏪", Electronics: "💻", Audio: "🎧",
  Wearables: "⌚", Cameras: "📷", Gaming: "🎮", Accessories: "🔌",
};

// ─── Skeleton Card ─────────────────────────────────────────────
const SkeletonCard = () => (
  <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
    <Skeleton variant="rectangular" height={220} animation="wave" />
    <CardContent sx={{ p: 2 }}>
      <Skeleton width="40%" height={14} sx={{ mb: 1 }} />
      <Skeleton width="80%" height={18} sx={{ mb: 1 }} />
      <Skeleton width="50%" height={14} sx={{ mb: 1.5 }} />
      <Skeleton width="65%" height={20} />
    </CardContent>
  </Card>
);

// ─── Product Card ───────────────────────────────────────────────
const ProductCard = ({ product, isWishlisted, onToggleWishlist }) => {
  const mrp      = product.mrp || Math.round(product.price * 1.4);
  const discount = product.discount || Math.round((1 - product.price / mrp) * 100);

  return (
    <Card
      sx={{
        borderRadius: 2,
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "pointer",
        "&:hover .product-img-emoji": { transform: "scale(1.1)" },
      }}
    >
      <CardActionArea
        component={Link}
        to={`/product/${product.id}`}
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        {/* Image area */}
        <Box
          sx={{
            position: "relative",
            height: 220,
            bgcolor: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Typography
            className="product-img-emoji"
            sx={{
              fontSize: "5rem",
              lineHeight: 1,
              transition: "transform .25s ease",
              display: "block",
              userSelect: "none",
            }}
          >
            {product.image}
          </Typography>

          {/* Discount badge */}
          {discount > 0 && (
            <Chip
              label={`${discount}% OFF`}
              size="small"
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                bgcolor: "#fce4ec",
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          )}

          {/* Out of stock overlay */}
          {!product.inStock && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(255,255,255,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Out of Stock
              </Typography>
            </Box>
          )}
        </Box>

        {/* Info */}
        <CardContent sx={{ p: 2, flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            {product.brand}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mt: 0.25,
              mb: 0.75,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </Typography>

          {/* Rating */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <Rating value={product.rating} precision={0.5} readOnly size="small" max={5} />
            <Typography variant="caption" color="text.secondary">
              ({product.reviews?.toLocaleString()})
            </Typography>
          </Box>

          {/* Pricing */}
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
              ${product.price.toLocaleString()}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", textDecoration: "line-through" }}
            >
              ${mrp.toLocaleString()}
            </Typography>
            {discount > 0 && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                {discount}% off
              </Typography>
            )}
          </Box>

          {product.inStock && (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, mt: 0.5, display: "block" }}>
              ✔ Free Delivery
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      {/* Wishlist button */}
      <Tooltip title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}>
        <IconButton
          size="small"
          onClick={(e) => { e.preventDefault(); onToggleWishlist(e, product.id); }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(255,255,255,0.9)",
            "&:hover": { bgcolor: "#fff", color: "primary.main" },
            width: 32,
            height: 32,
          }}
        >
          {isWishlisted
            ? <FavoriteIcon sx={{ fontSize: 18, color: "primary.main" }} />
            : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Tooltip>
    </Card>
  );
};

// ─── Home ───────────────────────────────────────────────────────
const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCategory = searchParams.get("category") || "All";

  const [allProducts,    setAllProducts]    = useState([]);
  const [categories,     setCategories]     = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [loading,        setLoading]        = useState(true);
  const [filtering,      setFiltering]      = useState(false);
  const [error,          setError]          = useState(null);
  const [authUser,       setAuthUser]       = useState(undefined);
  const [wishlist,       setWishlist]       = useState(new Set());

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        await seedIfEmpty();
        const data = await api.getProducts();
        setAllProducts(data);
        setError(null);
      } catch (err) {
        setError("Failed to load products. Check your Firestore connection.");
        console.error("[ShopZone] Product load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    let wishUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (wishUnsub) { wishUnsub(); wishUnsub = null; }
      if (!user) { setWishlist(new Set()); return; }
      wishUnsub = onSnapshot(
        collection(db, "wishlists", user.uid, "items"),
        (snap) => setWishlist(new Set(snap.docs.map((d) => parseInt(d.id, 10))))
      );
    });
    return () => { authUnsub(); if (wishUnsub) wishUnsub(); };
  }, []);

  const handleCategoryClick = useCallback((cat) => {
    setFiltering(true);
    setActiveCategory(cat);
    cat === "All" ? setSearchParams({}) : setSearchParams({ category: cat });
    setTimeout(() => setFiltering(false), 150);
  }, [setSearchParams]);

  const toggleWishlist = async (e, id) => {
    e.preventDefault();
    if (!authUser) { navigate("/login"); return; }
    const ref = doc(db, "wishlists", authUser.uid, "items", id.toString());
    if (wishlist.has(id)) {
      await deleteDoc(ref);
    } else {
      const product = allProducts.find((p) => p.id === id);
      await setDoc(ref, {
        productId: id, name: product?.name || "", image: product?.image || "",
        price: product?.price || 0, addedAt: serverTimestamp(),
      });
    }
  };

  const displayed = activeCategory === "All"
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory);

  const countFor = (cat) =>
    cat === "All" ? allProducts.length : allProducts.filter((p) => p.category === cat).length;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      {/* ── Hero Banner ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #282c3f 0%, #1a1d2e 60%, #ff3f6c22 100%)",
          py: { xs: 5, md: 8 },
          px: 3,
        }}
      >
        <Container maxWidth="lg">
          <Grid container alignItems="center" spacing={4}>
            <Grid item xs={12} md={7}>
              <Chip
                label="🔥 Limited Time Offer"
                sx={{
                  mb: 2,
                  bgcolor: "rgba(255,63,108,0.2)",
                  color: "primary.main",
                  fontWeight: 700,
                  border: "1px solid rgba(255,63,108,0.3)",
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  mb: 1,
                  fontSize: { xs: "2rem", md: "2.75rem" },
                  letterSpacing: "-0.5px",
                }}
              >
                Summer Sale is Live 🎉
              </Typography>
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 400, mb: 3 }}>
                Up to 60% off on top brands — Limited quantities!
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                component={Link}
                to="/"
                sx={{ px: 4, py: 1.5, fontSize: "1rem" }}
              >
                Shop Now
              </Button>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: "none", md: "block" } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  maxWidth: 260,
                  ml: "auto",
                }}
              >
                {["💻", "📱", "🎧", "⌚"].map((emoji) => (
                  <Box
                    key={emoji}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.08)",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 3,
                      fontSize: "2.5rem",
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Category Tabs ── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 64, zIndex: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", gap: 0.5, overflowX: "auto", py: 1, "&::-webkit-scrollbar": { display: "none" } }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Chip
                  key={cat}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <span>{cat}</span>
                      {!loading && (
                        <Box
                          component="span"
                          sx={{
                            bgcolor: isActive ? "primary.main" : "rgba(0,0,0,0.08)",
                            color: isActive ? "#fff" : "text.secondary",
                            px: 0.75,
                            py: 0.1,
                            borderRadius: 10,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                          }}
                        >
                          {countFor(cat)}
                        </Box>
                      )}
                    </Box>
                  }
                  onClick={() => handleCategoryClick(cat)}
                  variant={isActive ? "filled" : "outlined"}
                  color={isActive ? "primary" : "default"}
                  sx={{
                    flexShrink: 0,
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    borderRadius: "20px",
                    height: 36,
                    "& .MuiChip-label": { px: 1.5 },
                  }}
                />
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* ── Products ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Section header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {CATEGORY_ICONS[activeCategory] || "📦"}&nbsp;
            {activeCategory === "All" ? "All Products" : activeCategory}
          </Typography>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              {displayed.length} product{displayed.length !== 1 ? "s" : ""}
            </Typography>
          )}
        </Box>

        {error ? (
          <Alert severity="error" action={
            <Button size="small" onClick={() => window.location.reload()}>Retry</Button>
          }>
            {error}
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" },
              gap: 2,
              opacity: filtering ? 0.5 : 1,
              transition: "opacity .15s",
            }}
          >
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
              : displayed.length === 0
                ? (
                  <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 8 }}>
                    <Typography variant="h1" sx={{ fontSize: "4rem", mb: 2 }}>
                      {CATEGORY_ICONS[activeCategory] || "📦"}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      No products in this category yet.
                    </Typography>
                  </Box>
                )
                : displayed.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={wishlist.has(product.id)}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
          </Box>
        )}
      </Container>
    </Box>
  );
};

// ─── Wrappers ──────────────────────────────────────────────────
const SuspenseWrapper = ({ fallback, children }) => (
  <React.Suspense fallback={
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
      <Typography color="text.secondary">{fallback}</Typography>
    </Box>
  }>
    {children}
  </React.Suspense>
);

const ProductDetailsWrapper = () => {
  const { id } = useParams();
  return <SuspenseWrapper fallback="Loading product…"><ProductDetails productId={id} /></SuspenseWrapper>;
};

// ─── App ───────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {/* Navigation MFE */}
          <SuspenseWrapper fallback="">
            <Navigation />
          </SuspenseWrapper>

          {/* Main content */}
          <Box component="main" sx={{ flex: 1 }}>
            <Routes>
              <Route path="/"            element={<Home />} />
              <Route path="/product/:id" element={<ProductDetailsWrapper />} />
              <Route path="/cart"        element={<SuspenseWrapper fallback="Loading cart…"><Cart /></SuspenseWrapper>} />
              <Route path="/orders"      element={<SuspenseWrapper fallback="Loading orders…"><Orders /></SuspenseWrapper>} />
              <Route path="/admin"       element={<SuspenseWrapper fallback="Loading admin…"><AdminPortal /></SuspenseWrapper>} />
              <Route path="/login"       element={<SuspenseWrapper fallback="Loading…"><Login /></SuspenseWrapper>} />
            </Routes>
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              bgcolor: "secondary.main",
              color: "rgba(255,255,255,0.75)",
              pt: 5,
              pb: 3,
              mt: "auto",
            }}
          >
            <Container maxWidth="lg">
              <Grid container spacing={4} sx={{ mb: 4 }}>
                {/* Col 1 */}
                <Grid item xs={6} sm={3}>
                  <Typography variant="overline" sx={{ color: "#fff", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "1px" }}>
                    Online Shopping
                  </Typography>
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1.5 }}>
                    {["Electronics", "Audio", "Wearables", "Cameras", "Gaming", "Accessories"].map((cat) => (
                      <Box component="li" key={cat} sx={{ mb: 0.75 }}>
                        <Box component="a" href="/" sx={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.8125rem", "&:hover": { color: "#fff" } }}>
                          {cat}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                {/* Col 2 */}
                <Grid item xs={6} sm={3}>
                  <Typography variant="overline" sx={{ color: "#fff", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "1px" }}>
                    Top Brands
                  </Typography>
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1.5 }}>
                    {["Apple", "Samsung", "Sony", "Logitech", "Bose", "DJI"].map((brand) => (
                      <Box component="li" key={brand} sx={{ mb: 0.75 }}>
                        <Box component="a" href="/" sx={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.8125rem", "&:hover": { color: "#fff" } }}>
                          {brand}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                {/* Col 3 */}
                <Grid item xs={6} sm={3}>
                  <Typography variant="overline" sx={{ color: "#fff", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "1px" }}>
                    My Account
                  </Typography>
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1.5 }}>
                    {[
                      { label: "My Orders", to: "/orders" },
                      { label: "My Cart",   to: "/cart"   },
                      { label: "Sign In",   to: "/login"  },
                    ].map(({ label, to }) => (
                      <Box component="li" key={label} sx={{ mb: 0.75 }}>
                        <Box component={Link} to={to} sx={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.8125rem", "&:hover": { color: "#fff" } }}>
                          {label}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                {/* Col 4 */}
                <Grid item xs={6} sm={3}>
                  <Typography variant="overline" sx={{ color: "#fff", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "1px" }}>
                    Connect With Us
                  </Typography>
                  <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {["𝕏 Twitter", "📘 Facebook", "📸 Instagram"].map((s) => (
                      <Box component="a" href="/" key={s} sx={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.8125rem", "&:hover": { color: "#fff" } }}>
                        {s}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mb: 3 }} />
              <Typography variant="body2" align="center" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                © {new Date().getFullYear()} <strong style={{ color: "rgba(255,255,255,0.7)" }}>ShopZone</strong>. All rights reserved. &nbsp;|&nbsp; A Microfrontend Demo
              </Typography>
            </Container>
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
