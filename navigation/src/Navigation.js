import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "./api";
import "./Navigation.css";

// Lazy-load nested remotes
const Search   = React.lazy(() => import("searchRemote/Search"));
const UserMenu = React.lazy(() => import("authRemote/UserMenu"));

// Inline fallback search bar shown while Search MFE loads
const SearchFallback = () => (
  <div className="search-fallback">
    <span className="search-fallback-icon">🔍</span>
    <input
      type="text"
      placeholder="Search for products, brands and more"
      disabled
    />
  </div>
);

const Navigation = () => {
  const [cartCount, setCartCount] = useState(0);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const cart  = await api.getCart();
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    };

    loadCartCount();

    const onCartUpdate = () => loadCartCount();
    window.addEventListener("cartUpdated", onCartUpdate);

    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("cartUpdated", onCartUpdate);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🛍️</span>
          <span className="logo-text">ShopZone</span>
        </Link>

        {/* Search MFE — nested remote */}
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
