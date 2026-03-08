import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import "./Cart.css";

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCart();
      setCartItems(data);
    } catch (err) {
      setError("Failed to load cart. Please try again later.");
      console.error("Error loading cart:", err);
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();

    // Custom event for same-window updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  const handleQuantityChange = async (productId, delta) => {
    const item = cartItems.find((item) => item.productId === productId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    
    try {
      await api.updateCartItem(productId, newQuantity);
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      alert("Failed to update cart. Please try again.");
      console.error("Error updating cart:", err);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      await api.removeFromCart(productId);
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      alert("Failed to remove item. Please try again.");
      console.error("Error removing item:", err);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      try {
        await api.clearCart();
        await loadCart();
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err) {
        alert("Failed to clear cart. Please try again.");
        console.error("Error clearing cart:", err);
      }
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    alert(
      `Order placed successfully!\nTotal: $${calculateTotal().toFixed(2)}\n\nThank you for your purchase!`
    );
    try {
      await api.clearCart();
      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Error clearing cart after checkout:", err);
    }
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="cart-container">
        <div className="loading">Loading cart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadCart} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button onClick={handleClearCart} className="btn-clear">
          Clear Cart
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cartItems.map((item) => {
            if (!item.product) return null;
            const product = item.product;
            return (
              <div key={item.productId} className="cart-item">
                <div className="item-image">{product.image}</div>
                <div className="item-details">
                  <h3>{product.name}</h3>
                  <p className="item-price">Price: ${product.price} &nbsp;<span style={{textDecoration:"line-through",color:"#aaa"}}>${Math.round(product.price*1.4)}</span></p>
                  <p className="item-seller">Seller: TechStore Official</p>
                </div>
                <div className="item-quantity">
                  <button
                    onClick={() => handleQuantityChange(item.productId, -1)}
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span className="quantity-value">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.productId, 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>
                <div className="item-total">
                  <p className="total-price">
                    ${(product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.productId)}
                  className="btn-remove"
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <div className="summary-title">Price Details ({cartItems.length} Item{cartItems.length !== 1 ? "s" : ""})</div>
          <div className="summary-body">
            <div className="summary-row">
              <span>Total MRP</span>
              <span>${Math.round(calculateSubtotal() * 1.4).toFixed(2)}</span>
            </div>
            <div className="summary-row discount-row">
              <span>Discount on MRP</span>
              <span>− ${(Math.round(calculateSubtotal() * 1.4) - calculateSubtotal()).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (8%)</span>
              <span>${calculateTax().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span style={{ color: "var(--success)", fontWeight: 600 }}>FREE</span>
            </div>
            <div className="summary-row total-row">
              <span>Total Amount</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="saving-note">
              🎉 You are saving ${(Math.round(calculateSubtotal() * 1.4) - calculateSubtotal()).toFixed(2)} on this order!
            </div>
            <button onClick={handleCheckout} className="btn-checkout">
              Proceed to Checkout
            </button>
            <button onClick={() => navigate("/")} className="btn-continue-shopping">
              Continue Shopping
            </button>
            <p className="safe-checkout">🔒 Safe & Secure Payments</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
