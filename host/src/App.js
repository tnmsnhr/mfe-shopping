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
import Card        from "@mui/material/Card";
import CardContent  from "@mui/material/CardContent";
import Chip         from "@mui/material/Chip";
import Skeleton     from "@mui/material/Skeleton";
import Button       from "@mui/material/Button";
import Alert        from "@mui/material/Alert";
import Divider      from "@mui/material/Divider";
import Paper        from "@mui/material/Paper";
import RefreshIcon      from "@mui/icons-material/Refresh";
import HomeIcon         from "@mui/icons-material/Home";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import theme from "./theme";
import "./App.css";

// ─── Error Boundary ─────────────────────────────────────────────
// React.Suspense only handles "loading" state.
// ErrorBoundary handles "failed to load" — network errors, port down, etc.
// Must be a class component — React does not support hook-based error boundaries.
class RemoteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    // Called synchronously when a child throws.
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console (swap for Sentry / Datadog in production)
    console.error(
      `[ShopZone] Remote MFE failed to load — ${this.props.name || "unknown"}`,
      "\nError:", error.message,
      "\nComponent stack:", info.componentStack,
    );
  }

  handleRetry = () => {
    // Increment retryKey → forces React to re-mount children from scratch
    this.setState((s) => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      // key={retryKey} ensures children re-mount completely on retry
      return (
        <React.Fragment key={this.state.retryKey}>
          {this.props.children}
        </React.Fragment>
      );
    }

    const { name = "Module", fallbackPath = "/", fallbackLabel = "Go Home" } = this.props;
    const isChunkError =
      this.state.error?.name === "ChunkLoadError" ||
      this.state.error?.message?.includes("Loading chunk") ||
      this.state.error?.message?.includes("Failed to fetch");

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          px: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: { xs: 3, sm: 5 },
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <WarningAmberIcon sx={{ fontSize: "3.5rem", color: "warning.main", mb: 2 }} />

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {name} couldn't load
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            {isChunkError
              ? `The ${name} service is temporarily unavailable. Please check that all MFE servers are running.`
              : `Something went wrong while loading ${name}.`}
          </Typography>

          {/* Show actual error message in development only */}
          {process.env.NODE_ENV !== "production" && (
            <Box
              sx={{
                bgcolor: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: 1,
                px: 2,
                py: 1,
                my: 2,
                textAlign: "left",
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontFamily: "monospace", color: "#5d4037", wordBreak: "break-word" }}
              >
                {this.state.error?.message || "Unknown error"}
              </Typography>
            </Box>
          )}

          {/* Hint for ChunkLoadErrors */}
          {isChunkError && (
            <Alert severity="info" sx={{ textAlign: "left", mb: 2, borderRadius: 1.5 }}>
              <Typography variant="caption">
                Make sure the MFE server is running:
                <Box component="pre" sx={{ m: 0, mt: 0.5, fontFamily: "monospace", fontSize: "0.75rem" }}>
                  npm run start:product   # port 3001
                </Box>
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", mt: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              size="small"
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              component={Link}
              to={fallbackPath}
              size="small"
            >
              {fallbackLabel}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}

// ─── Lazy-load remote modules ───────────────────────────────────
const Navigation     = React.lazy(() => import("navigation/Navigation"));
const ProductDetails = React.lazy(() => import("productDetails/ProductDetails"));
// ProductCard is also exposed from the product-details MFE so the host never
// needs to bundle it — the same remote entry is reused (no extra network request).
const ProductCard    = React.lazy(() => import("productDetails/ProductCard"));
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
                // ProductCard is lazy-loaded from the product-details MFE.
                // The Suspense boundary here shows skeleton cards while the remote
                // module is being fetched (typically only on the very first render).
                // Once loaded the module is cached — all subsequent renders are sync.
                : (
                  <React.Suspense
                    fallback={Array.from({ length: displayed.length || 10 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  >
                    {displayed.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isWishlisted={wishlist.has(product.id)}
                        onToggleWishlist={toggleWishlist}
                      />
                    ))}
                  </React.Suspense>
                )}
          </Box>
        )}
      </Container>
    </Box>
  );
};

// ─── Remote Wrapper (Suspense + ErrorBoundary combined) ─────────
// Every remote MFE is wrapped with BOTH:
//   1. ErrorBoundary  — catches load failures (port down, network error)
//   2. React.Suspense — shows skeleton while the JS bundle is fetching
const RemoteWrapper = ({ name, fallbackLabel, fallbackPath, loadingFallback, children }) => (
  <RemoteErrorBoundary name={name} fallbackLabel={fallbackLabel} fallbackPath={fallbackPath}>
    <React.Suspense
      fallback={
        loadingFallback || (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
            <Typography color="text.secondary">Loading {name}…</Typography>
          </Box>
        )
      }
    >
      {children}
    </React.Suspense>
  </RemoteErrorBoundary>
);

// Product details needs the URL param extracted by the host router
const ProductDetailsWrapper = () => {
  const { id } = useParams();
  return (
    <RemoteWrapper name="Product Details" fallbackLabel="Browse Products" fallbackPath="/">
      <ProductDetails productId={id} />
    </RemoteWrapper>
  );
};

// ─── App ───────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {/* Navigation MFE — isolated boundary so a nav failure doesn't kill the page */}
          <RemoteErrorBoundary name="Navigation" fallbackLabel="Home" fallbackPath="/">
            <React.Suspense fallback={<Box sx={{ height: 64, bgcolor: "secondary.main" }} />}>
              <Navigation />
            </React.Suspense>
          </RemoteErrorBoundary>

          {/* Main content */}
          <Box component="main" sx={{ flex: 1 }}>
            <Routes>
              <Route path="/"            element={<Home />} />
              <Route path="/product/:id" element={<ProductDetailsWrapper />} />
              <Route path="/cart"        element={
                <RemoteWrapper name="Cart" fallbackLabel="Continue Shopping" fallbackPath="/">
                  <Cart />
                </RemoteWrapper>
              } />
              <Route path="/orders"      element={
                <RemoteWrapper name="Orders" fallbackLabel="Go Home" fallbackPath="/">
                  <Orders />
                </RemoteWrapper>
              } />
              <Route path="/admin"       element={
                <RemoteWrapper name="Admin Portal" fallbackLabel="Go Home" fallbackPath="/">
                  <AdminPortal />
                </RemoteWrapper>
              } />
              <Route path="/login"       element={
                <RemoteWrapper name="Login" fallbackLabel="Go Home" fallbackPath="/">
                  <Login />
                </RemoteWrapper>
              } />
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
