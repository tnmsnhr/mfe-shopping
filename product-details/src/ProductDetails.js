import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import "./ProductDetails.css";

const getMrp = (price) => Math.round(price * 1.4);
const getDiscount = (price) => Math.round((1 - price / getMrp(price)) * 100);

const StarRating = ({ rating }) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="star-row">
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
};

const ProductDetails = ({ productId }) => {
  const navigate = useNavigate();
  const [quantity, setQuantity]   = useState(1);
  const [product, setProduct]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

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
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      await api.addToCart(product.id, quantity);
      window.dispatchEvent(new Event("cartUpdated"));
      navigate("/cart");
    } catch (err) {
      alert("Failed to add item to cart. Please try again.");
      console.error("Error adding to cart:", err);
    } finally {
      setAddingToCart(false);
    }
  };

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
            {[80,60,40,90,50,70].map((w,i) => (
              <div key={i} className="skeleton" style={{ height: i===0?20:14, width:`${w}%`, marginBottom:12 }} />
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

  const mrp      = getMrp(product.price);
  const discount = getDiscount(product.price);

  /* Fake multiple "views" using the same emoji at different scale + bg */
  const thumbColors = ["#fef9ec","#eef5ff","#f5fef0","#fff0f3"];

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
              onClick={() => setWishlisted(!wishlisted)}
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
          {/* Action buttons below image (like Myntra) */}
          <div className="pd-action-col">
            <button
              onClick={handleAddToCart}
              className="btn-add-to-bag"
              disabled={!product.inStock || addingToCart}
            >
              {addingToCart ? "Adding…" : "🛒 Add to Bag"}
            </button>
            <button
              className="btn-wishlist-full"
              onClick={() => setWishlisted(!wishlisted)}
            >
              {wishlisted ? "♥ Wishlisted" : "♡ Wishlist"}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>

          {/* Rating */}
          <div className="product-rating">
            <span className="rating-pill">
              <StarRating rating={product.rating} /> {product.rating}
            </span>
            <span className="rating-sep">|</span>
            <span className="review-count">{product.reviews?.toLocaleString()} Ratings</span>
          </div>

          <hr className="divider" />

          {/* Pricing */}
          <div className="price-block">
            <span className="pd-price">${product.price.toLocaleString()}</span>
            <span className="pd-mrp">${mrp.toLocaleString()}</span>
            <span className="pd-discount">{discount}% OFF</span>
          </div>
          <p className="free-delivery">✔ Free Delivery on this item</p>

          <hr className="divider" />

          {/* Stock */}
          <div className="stock-status">
            {product.inStock
              ? <span className="in-stock">✓ In Stock — Ready to Ship</span>
              : <span className="out-of-stock">✗ Out of Stock</span>}
          </div>

          {/* Quantity */}
          <div className="quantity-selector">
            <span className="qty-label">Quantity</span>
            <div className="quantity-controls">
              <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="quantity-btn">−</button>
              <span className="quantity-value">{quantity}</span>
              <button onClick={() => setQuantity(q => q+1)} className="quantity-btn">+</button>
            </div>
          </div>

          <hr className="divider" />

          {/* Description */}
          <div className="pd-section">
            <h3 className="pd-section-title">About this Product</h3>
            <p className="product-description">{product.description}</p>
          </div>

          {/* Features */}
          <div className="pd-section product-features">
            <h3 className="pd-section-title">Key Features</h3>
            <ul>
              {product.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>

          {/* Offers */}
          <div className="pd-section">
            <h3 className="pd-section-title">Available Offers</h3>
            <ul className="offers-list">
              <li>🏦 Bank Offer — 10% off on select cards</li>
              <li>🎁 Special Price — Extra {discount}% off</li>
              <li>🚚 Free Delivery on all prepaid orders</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
