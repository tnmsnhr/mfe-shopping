import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "./api";
import "./App.css";

// Lazy load remote modules
const Navigation   = React.lazy(() => import("navigation/Navigation"));
const ProductDetails = React.lazy(() => import("productDetails/ProductDetails"));
const Cart         = React.lazy(() => import("cart/Cart"));

// Helpers
const getMrp      = (price) => Math.round(price * 1.4);
const getDiscount = (price) => Math.round((1 - price / getMrp(price)) * 100);

// Category → emoji map
const CATEGORY_ICONS = {
  All:         "🏪",
  Electronics: "💻",
  Audio:       "🎧",
  Wearables:   "⌚",
  Cameras:     "📷",
  Gaming:      "🎮",
  Accessories: "🔌",
};

// ─── Skeleton card ────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="product-card skeleton-card">
    <div className="skeleton product-card-image-skeleton" />
    <div className="product-card-info">
      <div className="skeleton" style={{ height: 11, width: "55%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: "80%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 11, width: "38%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: "65%" }} />
    </div>
  </div>
);

// ─── Home ─────────────────────────────────────────────────────
const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read initial category from ?category= URL param
  const initialCategory = searchParams.get("category") || "All";

  const [allProducts,    setAllProducts]    = useState([]);
  const [categories,     setCategories]     = useState(["All"]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [loading,        setLoading]        = useState(true);
  const [filtering,      setFiltering]      = useState(false);
  const [error,          setError]          = useState(null);
  const [wishlist,       setWishlist]       = useState(new Set());

  // Fetch categories once
  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch(() => {/* fallback silently */});
  }, []);

  // Fetch ALL products on mount (we filter client-side for instant switching)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts();
        setAllProducts(data);
        setError(null);
      } catch (err) {
        setError("Failed to load products. Make sure the backend is running.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleCategoryClick = useCallback((cat) => {
    setFiltering(true);
    setActiveCategory(cat);
    // Sync URL so back-button and breadcrumb links work
    if (cat === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
    setTimeout(() => setFiltering(false), 150);
  }, [setSearchParams]);

  const toggleWishlist = (e, id) => {
    e.preventDefault();
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Client-side category filter
  const displayed = activeCategory === "All"
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory);

  // Count per category
  const countFor = (cat) =>
    cat === "All" ? allProducts.length : allProducts.filter((p) => p.category === cat).length;

  return (
    <div className="home">
      {/* ── Hero Banner ── */}
      <div className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag">🔥 Limited Time Offer</span>
          <h1>Summer Sale is Live</h1>
          <p>Up to 60% off on top brands</p>
          <Link to="/" className="hero-cta">Shop Now</Link>
        </div>
        <div className="hero-graphics">
          <div className="hero-emoji-grid">
            <span>💻</span><span>📱</span>
            <span>🎧</span><span>⌚</span>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="category-tabs-wrapper">
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => handleCategoryClick(cat)}
            >
              <span className="cat-name">{cat}</span>
              {!loading && (
                <span className={`cat-count ${activeCategory === cat ? "active" : ""}`}>
                  {countFor(cat)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="section-header">
        <h2>
          {CATEGORY_ICONS[activeCategory] || "📦"}&nbsp;
          {activeCategory === "All" ? "All Products" : activeCategory}
        </h2>
        {!loading && (
          <span className="section-subtitle">
            {displayed.length} product{displayed.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Products ── */}
      {error ? (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">Retry</button>
        </div>
      ) : (
        <div className={`products-grid ${filtering ? "filtering" : ""}`}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : displayed.length === 0
              ? (
                <div className="empty-category">
                  <span>{CATEGORY_ICONS[activeCategory] || "📦"}</span>
                  <p>No products in this category yet.</p>
                </div>
              )
              : displayed.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="product-card"
                  >
                    {/* Image */}
                    <div className="product-card-image">
                      <span className="product-emoji">{product.image}</span>
                      <button
                        className={`wishlist-btn ${wishlist.has(product.id) ? "active" : ""}`}
                        onClick={(e) => toggleWishlist(e, product.id)}
                        title="Wishlist"
                      >
                        {wishlist.has(product.id) ? "♥" : "♡"}
                      </button>
                      <span className="discount-badge">{getDiscount(product.price)}% OFF</span>
                      {!product.inStock && <span className="oos-overlay">Out of Stock</span>}
                    </div>

                    {/* Info */}
                    <div className="product-card-info">
                      <div className="product-brand">{product.brand}</div>
                      <div className="product-name">{product.name}</div>
                      <div className="product-card-rating">
                        <span className="rating-badge">★ {product.rating}</span>
                        <span className="review-count">({product.reviews?.toLocaleString()})</span>
                      </div>
                      <div className="product-card-pricing">
                        <span className="current-price">${product.price.toLocaleString()}</span>
                        <span className="original-price">${getMrp(product.price).toLocaleString()}</span>
                        <span className="discount-text">{getDiscount(product.price)}% off</span>
                      </div>
                      {product.inStock
                        ? <span className="stock-badge in-stock">✔ Free Delivery</span>
                        : <span className="stock-badge out-of-stock">Out of Stock</span>}
                    </div>
                  </Link>
                ))}
        </div>
      )}
    </div>
  );
};

// ─── Wrappers ─────────────────────────────────────────────────
const ProductDetailsWrapper = () => {
  const { id } = useParams();
  return (
    <React.Suspense fallback={<div className="page-loading"><div className="spinner" />Loading product...</div>}>
      <ProductDetails productId={id} />
    </React.Suspense>
  );
};

const CartWrapper = () => (
  <React.Suspense fallback={<div className="page-loading"><div className="spinner" />Loading cart...</div>}>
    <Cart />
  </React.Suspense>
);

// ─── App ──────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <React.Suspense
          fallback={<div className="nav-skeleton"><div className="skeleton" style={{ height: "100%", width: "100%" }} /></div>}
        >
          <Navigation />
        </React.Suspense>
        <main className="main-content">
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/product/:id" element={<ProductDetailsWrapper />} />
            <Route path="/cart"        element={<CartWrapper />} />
          </Routes>
        </main>
        <footer className="footer">
          <div className="footer-top">
            <div className="footer-col">
              <h4>ONLINE SHOPPING</h4>
              <ul>
                <li><a href="/">Electronics</a></li>
                <li><a href="/">Audio</a></li>
                <li><a href="/">Wearables</a></li>
                <li><a href="/">Cameras</a></li>
                <li><a href="/">Gaming</a></li>
                <li><a href="/">Accessories</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>TOP BRANDS</h4>
              <ul>
                <li><a href="/">Apple</a></li>
                <li><a href="/">Samsung</a></li>
                <li><a href="/">Sony</a></li>
                <li><a href="/">Logitech</a></li>
                <li><a href="/">Bose</a></li>
                <li><a href="/">DJI</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>CUSTOMER POLICIES</h4>
              <ul>
                <li><a href="/">Contact Us</a></li>
                <li><a href="/">FAQ</a></li>
                <li><a href="/">T&C</a></li>
                <li><a href="/">Privacy Policy</a></li>
                <li><a href="/">Returns</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>EXPERIENCE THE APP</h4>
              <div className="app-badges">
                <span className="app-badge">📱 Google Play</span>
                <span className="app-badge">🍎 App Store</span>
              </div>
              <h4 style={{ marginTop: "1.25rem" }}>KEEP IN TOUCH</h4>
              <div className="social-links">
                <a href="/" className="social-btn">𝕏 Twitter</a>
                <a href="/" className="social-btn">📘 Facebook</a>
                <a href="/" className="social-btn">📸 Instagram</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              &copy; {new Date().getFullYear()} <strong>ShopZone</strong>. All rights reserved.
              &nbsp;|&nbsp; A Microfrontend Demo
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
