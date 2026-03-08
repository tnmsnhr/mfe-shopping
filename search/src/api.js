const API_BASE_URL =
  (typeof window !== "undefined" && window.API_URL) || "http://localhost:3003";

export const api = {
  getProducts: async () => {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (!response.ok) throw new Error("Failed to fetch products");
    const result = await response.json();
    return result.data;
  },
};
