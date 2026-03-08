import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./Navigation.css";

// Lazy-load nested remotes
const Search   = React.lazy(() => import("searchRemote/Search"));
const UserMenu = React.lazy(() => import("authRemote/UserMenu"));

const SearchFallback = () => (
  <div className="search-fallback">
    <span className="search-fallback-icon">🔍</span>
    <input type="text" placeholder="Search for products, brands and more" disabled />
  </div>
);

const Navigation = () => {
  const [cartCount, setCartCount] = useState(0);
  const [scrolled,  setScrolled]  = useState(false);

  // ── Real-time cart count from Firestore ─────────────────────
  useEffect(() => {
    let cartUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (cartUnsub) { cartUnsub(); cartUnsub = null; }

      if (!user) { setCartCount(0); return; }

      cartUnsub = onSnapshot(
        collection(db, "carts", user.uid, "items"),
        (snap) => {
          const total = snap.docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0);
          setCartCount(total);
        },
        (err) => {
          console.error("[ShopZone] Firestore cart count failed — check Firestore Rules:", err.message);
        }
      );
    });

    return () => { authUnsub(); if (cartUnsub) cartUnsub(); };
  }, []);

  // ── Scroll shadow ───────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🛍️</span>
          <span className="logo-text">ShopZone</span>
        </Link>

        {/* Search MFE */}
        <React.Suspense fallback={<SearchFallback />}>
          <Search />
        </React.Suspense>

        {/* Nav Actions */}
        <nav className="nav-actions">
          <Link to="/" className="nav-item">
            <span className="nav-item-icon">🏠</span>
            <span className="nav-item-label">Home</span>
          </Link>

          <Link to="/" className="nav-item">
            <span className="nav-item-icon">♡</span>
            <span className="nav-item-label">Wishlist</span>
          </Link>

          <Link to="/cart" className="nav-item cart-nav-item">
            <span className="nav-item-icon">
              🛒
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </span>
            <span className="nav-item-label">Bag</span>
          </Link>

          {/* UserMenu from Auth MFE — shows Login button or avatar dropdown */}
          <React.Suspense fallback={
            <div className="nav-item">
              <span className="nav-item-icon">👤</span>
              <span className="nav-item-label">Profile</span>
            </div>
          }>
            <UserMenu />
          </React.Suspense>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
