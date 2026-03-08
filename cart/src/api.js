// Use window.API_URL if defined, otherwise default to localhost
const API_BASE_URL = (typeof window !== "undefined" && window.API_URL) || "http://localhost:3003";

// Get session ID from localStorage or generate one
const getSessionId = () => {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

// API utility functions
export const api = {
  getCart: async () => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        "X-Session-ID": sessionId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch cart");
    }
    const result = await response.json();
    return result.data;
  },

  updateCartItem: async (productId, quantity) => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId,
      },
      body: JSON.stringify({ productId, quantity }),
    });
    if (!response.ok) {
      throw new Error("Failed to update cart");
    }
    const result = await response.json();
    return result.data;
  },

  removeFromCart: async (productId) => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart/remove/${productId}`, {
      method: "DELETE",
      headers: {
        "X-Session-ID": sessionId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to remove item from cart");
    }
    const result = await response.json();
    return result.data;
  },

  clearCart: async () => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
      method: "DELETE",
      headers: {
        "X-Session-ID": sessionId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to clear cart");
    }
    const result = await response.json();
    return result.data;
  },

  getCartSummary: async () => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart/summary`, {
      headers: {
        "X-Session-ID": sessionId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch cart summary");
    }
    const result = await response.json();
    return result.data;
  },
};
