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
};
