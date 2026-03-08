import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, setDoc, deleteDoc, getDoc, updateDoc,
  serverTimestamp, increment, collection,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";        // still fetches products from the backend
import "./ProductDetails.css";

const getMrp      = (price) => Math.round(price * 1.4);
const getDiscount = (price) => Math.round((1 - price / getMrp(price)) * 100);

const StarRating = ({ rating }) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="star-row">
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(empty)}
    </span>
  );
};

// ── helpers ────────────────────────────────────────────────────
const cartDoc      = (uid)       => doc(db, "carts",     uid);
const cartItemRef  = (uid, pid)  => doc(db, "carts",     uid, "items", pid.toString());
const wishDoc      = (uid)       => doc(db, "wishlists", uid);
const wishItemRef  = (uid, pid)  => doc(db, "wishlists", uid, "items", pid.toString());

/**
 * Ensure the parent /carts/{uid} document exists.
 * Without it Firestore subcollections work fine but the doc
 * won't be visible as a standalone document in the console.
 */
const ensureCartDoc = async (uid, email) => {
  const ref  = cartDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      userId:    uid,
      userEmail: email || null,
      cartId:    uid,           // cart ID = user ID (one cart per user)
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // Keep updatedAt fresh
    await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true });
  }
};

const ensureWishlistDoc = async (uid) => {
  const ref  = wishDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      userId:    uid,
      createdAt: serverTimestamp(),
    });
  }
};

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

  // ── Auth state ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setAuthUser(user));
    return unsub;
  }, []);

  // ── Fetch product from backend ─────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProduct(productId);
        setProduct(data);
        setActiveImage(0);
        window.scrollTo(0, 0);
      } catch (err) {
        setError("Failed to load product. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchProduct();
  }, [productId]);

  // ── Check wishlist status ──────────────────────────────────
  useEffect(() => {
    if (!product || !authUser) { setWishlisted(false); return; }
    getDoc(wishItemRef(authUser.uid, product.id))
      .then((snap) => setWishlisted(snap.exists()))
      .catch(() => {});
  }, [product, authUser]);

  // ── Add to cart ────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!authUser) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }
    try {
      setAddingToCart(true);

      // Ensure parent cart document exists (makes it visible in Firestore console)
      await ensureCartDoc(authUser.uid, authUser.email);

      const ref  = cartItemRef(authUser.uid, product.id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        await updateDoc(ref, { quantity: increment(quantity) });
      } else {
        await setDoc(ref, {
          productId: product.id,
          name:      product.name,
          brand:     product.brand,
          price:     product.price,
          mrp:       product.mrp || getMrp(product.price),
          discount:  product.discount || getDiscount(product.price),
          image:     product.image,
          category:  product.category,
          quantity,
          addedAt:   serverTimestamp(),
        });
      }
      navigate("/cart");
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Toggle wishlist ────────────────────────────────────────
  const toggleWishlist = async () => {
    if (!authUser) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }
    try {
      setWishWorking(true);

      // Ensure parent wishlist document exists
      await ensureWishlistDoc(authUser.uid);

      const ref = wishItemRef(authUser.uid, product.id);
      if (wishlisted) {
        await deleteDoc(ref);
        setWishlisted(false);
      } else {
        await setDoc(ref, {
          productId: product.id,
          name:      product.name,
          brand:     product.brand,
          image:     product.image,
          price:     product.price,
          mrp:       product.mrp || getMrp(product.price),
          category:  product.category,
          addedAt:   serverTimestamp(),
        });
        setWishlisted(true);
      }
    } catch (err) {
      console.error("Wishlist error:", err);
    } finally {
      setWishWorking(false);
    }
  };

  // ── Skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="product-details-container">
        <div className="pd-skeleton">
          <div className="pd-skeleton-images">
            <div className="skeleton pd-img-main" />
            <div className="skeleton pd-img-thumb" />
            <div className="skeleton pd-img-thumb" />
          </div>
          <div className="pd-skeleton-info">
            {[80,60,40,90,50,70].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: i===0 ? 20 : 14, width: `${w}%`, marginBottom: 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-container">
        <div className="pd-error">
          <span className="pd-error-icon">😕</span>
          <h2>{error || "Product not found"}</h2>
          <button onClick={() => navigate("/")} className="btn-primary">Back to Home</button>
        </div>
      </div>
    );
  }

  const mrp         = getMrp(product.price);
  const discount    = getDiscount(product.price);
  const thumbColors = ["#fef9ec", "#eef5ff", "#f5fef0", "#fff0f3"];

  return (
    <div className="product-details-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <span onClick={() => navigate("/")} className="bc-link">Home</span>
        <span className="bc-sep">›</span>
        <span
          onClick={() => navigate(`/?category=${encodeURIComponent(product.category)}`)}
          className="bc-link"
        >
          {product.category}
        </span>
        <span className="bc-sep">›</span>
        <span className="bc-current">{product.name}</span>
      </nav>

      <div className="product-details">
        {/* ── LEFT: Images ── */}
        <div className="product-image-section">
          <div className="img-main" style={{ background: thumbColors[activeImage] }}>
            <span className="img-emoji">{product.image}</span>
            <button
              className={`pd-wishlist ${wishlisted ? "active" : ""}`}
              onClick={toggleWishlist}
              disabled={wishWorking}
              title="Wishlist"
            >
              {wishlisted ? "♥" : "♡"}
            </button>
          </div>
          <div className="img-thumbs">
            {thumbColors.map((bg, i) => (
              <button
                key={i}
                className={`img-thumb ${activeImage === i ? "active" : ""}`}
                style={{ background: bg }}
                onClick={() => setActiveImage(i)}
              >
                {product.image}
              </button>
            ))}
          </div>
          <div className="pd-action-col">
            <button
              onClick={handleAddToCart}
              className="btn-add-to-bag"
              disabled={!product.inStock || addingToCart}
            >
              {addingToCart ? "Adding…" : "🛒 Add to Bag"}
            </button>
            <button
              className={`btn-wishlist-full ${wishlisted ? "active" : ""}`}
              onClick={toggleWishlist}
              disabled={wishWorking}
            >
              {wishlisted ? "♥ Wishlisted" : "♡ Wishlist"}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>

          <div className="product-rating">
            <span className="rating-pill">
              <StarRating rating={product.rating} /> {product.rating}
            </span>
            <span className="rating-sep">|</span>
            <span className="review-count">{product.reviews?.toLocaleString()} Ratings</span>
          </div>

          <hr className="divider" />

          <div className="price-block">
            <span className="pd-price">${product.price.toLocaleString()}</span>
            <span className="pd-mrp">${mrp.toLocaleString()}</span>
            <span className="pd-discount">{discount}% OFF</span>
          </div>
          <p className="free-delivery">✔ Free Delivery on this item</p>

          <hr className="divider" />

          <div className="stock-status">
            {product.inStock
              ? <span className="in-stock">✓ In Stock — Ready to Ship</span>
              : <span className="out-of-stock">✗ Out of Stock</span>}
          </div>

          <div className="quantity-selector">
            <span className="qty-label">Quantity</span>
            <div className="quantity-controls">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="quantity-btn">−</button>
              <span className="quantity-value">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="quantity-btn">+</button>
            </div>
          </div>

          <hr className="divider" />

          <div className="pd-section">
            <h3 className="pd-section-title">About this Product</h3>
            <p className="product-description">{product.description}</p>
          </div>

          <div className="pd-section product-features">
            <h3 className="pd-section-title">Key Features</h3>
            <ul>
              {product.features.map((feature, i) => <li key={i}>{feature}</li>)}
            </ul>
          </div>

          <div className="pd-section">
            <h3 className="pd-section-title">Available Offers</h3>
            <ul className="offers-list">
              <li>🏦 Bank Offer — 10% off on select cards</li>
              <li>🎁 Special Price — Extra {discount}% off</li>
              <li>🚚 Free Delivery on all prepaid orders</li>
            </ul>
          </div>

          {/* Login nudge if not signed in */}
          {authUser === null && (
            <div className="login-nudge">
              <span>🔐</span>
              <span>
                <strong>Sign in</strong> to save to wishlist and access your cart across devices.{" "}
                <button onClick={() => navigate("/login")} className="nudge-link">Sign in now</button>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
