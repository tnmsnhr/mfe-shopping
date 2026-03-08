import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./Cart.css";

// ── helpers ────────────────────────────────────────────────────
const cartCol    = (uid)       => collection(db, "carts", uid, "items");
const cartDoc    = (uid, id)   => doc(db, "carts", uid, "items", id);
const cartParent = (uid)       => doc(db, "carts", uid);

/** Stamp the parent /carts/{uid} document so it is visible in Firestore console */
const touchCartParent = async (uid, email) => {
  await setDoc(
    cartParent(uid),
    { userId: uid, userEmail: email || null, cartId: uid, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

const Cart = () => {
  const navigate = useNavigate();

  const [authUser,     setAuthUser]     = useState(undefined); // undefined = resolving
  const [cartItems,    setCartItems]    = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [orderPlaced,  setOrderPlaced]  = useState(null);
  const [checkingOut,  setCheckingOut]  = useState(false);

  // ── Subscribe to auth then cart ────────────────────────────
  useEffect(() => {
    let cartUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);

      // Tear down previous cart listener
      if (cartUnsub) { cartUnsub(); cartUnsub = null; }

      if (!user) {
        setCartItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Stamp/create the parent cart document so it is visible in Firestore
      touchCartParent(user.uid, user.email).catch(() => {});

      cartUnsub = onSnapshot(
        cartCol(user.uid),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Sort newest first
          items.sort((a, b) =>
            (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0)
          );
          setCartItems(items);
          setIsLoading(false);
        },
        (err) => {
          console.error(
            "[ShopZone] Firestore cart read failed.\n" +
            "➜ Fix: Firebase Console → Firestore → Rules → set allow read, write: if true\n",
            err.message
          );
          setIsLoading(false);
        }
      );
    });

    return () => { authUnsub(); if (cartUnsub) cartUnsub(); };
  }, []);

  // ── Cart ops ───────────────────────────────────────────────
  const handleQuantityChange = async (itemId, delta) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { handleRemoveItem(itemId); return; }
    await updateDoc(cartDoc(authUser.uid, itemId), { quantity: newQty });
  };

  const handleRemoveItem = async (itemId) => {
    await deleteDoc(cartDoc(authUser.uid, itemId));
  };

  const handleClearCart = async () => {
    if (!window.confirm("Clear your entire cart?")) return;
    const batch = writeBatch(db);
    cartItems.forEach((item) => batch.delete(cartDoc(authUser.uid, item.id)));
    await batch.commit();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || checkingOut) return;
    setCheckingOut(true);

    try {
      const orderId = `SZ-${Date.now()}`;
      await setDoc(doc(db, "orders", orderId), {
        userId:    authUser.uid,
        userEmail: authUser.email,
        items:     cartItems.map(({ id: _id, addedAt: _at, ...rest }) => rest),
        subtotal:  parseFloat(subtotal.toFixed(2)),
        discount:  parseFloat((totalMrp - subtotal).toFixed(2)),
        tax:       parseFloat(tax.toFixed(2)),
        total:     parseFloat(grandTotal.toFixed(2)),
        status:    "confirmed",
        createdAt: serverTimestamp(),
        orderId,
      });

      // Clear cart atomically
      const batch = writeBatch(db);
      cartItems.forEach((item) => batch.delete(cartDoc(authUser.uid, item.id)));
      await batch.commit();

      setOrderPlaced(orderId);
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Pricing (computed from flat Firestore items) ───────────
  const subtotal  = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalMrp  = cartItems.reduce((s, i) => s + (i.mrp || Math.round(i.price * 1.4)) * i.quantity, 0);
  const tax       = subtotal * 0.08;
  const grandTotal = subtotal + tax;

  // ── Render states ──────────────────────────────────────────
  if (authUser === undefined) {
    return <div className="cart-container"><div className="loading">Loading…</div></div>;
  }

  if (!authUser) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🔐</div>
          <h2>Please sign in to view your cart</h2>
          <p>Your cart items are saved to your account.</p>
          <button onClick={() => navigate("/login", { state: { from: "/cart" } })} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="cart-container"><div className="loading">Loading cart…</div></div>;
  }

  if (orderPlaced) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🎉</div>
          <h2>Order Placed Successfully!</h2>
          <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", margin: "0.5rem 0" }}>
            {orderPlaced}
          </p>
          <p>Thank you for shopping with ShopZone!<br />Your order is confirmed and will be shipped soon.</p>
          <button onClick={() => { setOrderPlaced(null); navigate("/"); }} className="btn-primary">
            Continue Shopping
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
          <button onClick={() => navigate("/")} className="btn-primary">Continue Shopping</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button onClick={handleClearCart} className="btn-clear">Clear Cart</button>
      </div>

      <div className="cart-content">
        {/* ── Items ── */}
        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="item-image">{item.image}</div>
              <div className="item-details">
                <h3>{item.name}</h3>
                {item.brand && <p className="item-brand">{item.brand}</p>}
                <p className="item-price">
                  ${item.price}&nbsp;
                  <span style={{ textDecoration: "line-through", color: "#aaa" }}>
                    ${item.mrp || Math.round(item.price * 1.4)}
                  </span>
                </p>
                <p className="item-seller">Seller: TechStore Official</p>
              </div>
              <div className="item-quantity">
                <button onClick={() => handleQuantityChange(item.id, -1)} className="quantity-btn">−</button>
                <span className="quantity-value">{item.quantity}</span>
                <button onClick={() => handleQuantityChange(item.id,  1)} className="quantity-btn">+</button>
              </div>
              <div className="item-total">
                <p className="total-price">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button onClick={() => handleRemoveItem(item.id)} className="btn-remove" title="Remove">✕</button>
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="cart-summary">
          <div className="summary-title">
            Price Details ({cartItems.length} Item{cartItems.length !== 1 ? "s" : ""})
          </div>
          <div className="summary-body">
            <div className="summary-row">
              <span>Total MRP</span>
              <span>${totalMrp.toFixed(2)}</span>
            </div>
            <div className="summary-row discount-row">
              <span>Discount on MRP</span>
              <span>− ${(totalMrp - subtotal).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <span style={{ color: "var(--success)", fontWeight: 600 }}>FREE</span>
            </div>
            <div className="summary-row total-row">
              <span>Total Amount</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
            <div className="saving-note">
              🎉 You are saving ${(totalMrp - subtotal).toFixed(2)} on this order!
            </div>
            <button onClick={handleCheckout} className="btn-checkout" disabled={checkingOut}>
              {checkingOut ? "Placing Order…" : "Proceed to Checkout"}
            </button>
            <button onClick={() => navigate("/")} className="btn-continue-shopping">
              Continue Shopping
            </button>
            <p className="safe-checkout">🔒 Safe &amp; Secure Payments</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
