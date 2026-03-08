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
  getProduct: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product");
    }
    const result = await response.json();
    return result.data;
  },

  addToCart: async (productId, quantity = 1) => {
    const sessionId = getSessionId();
    const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-ID": sessionId,
      },
      body: JSON.stringify({ productId, quantity }),
    });
    if (!response.ok) {
      throw new Error("Failed to add item to cart");
    }
    const result = await response.json();
    return result.data;
  },
};
